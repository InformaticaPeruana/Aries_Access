# Inventario y diseño de red — LAN 192.168.18.0/24

**Fecha:** 2026-10-24 · **Método:** barrido ICMP (254 direcciones, paralelo) + barrido TCP a `22, 80, 443, 445, 3389` desde `server01`, más `ip neigh` para la tabla ARP. **Solo lectura**: no se explotó ningún servicio ni se envió credencial alguna. Equipos que bloquean ICMP se detectan igual por el barrido TCP.

> **Limitación del método:** un puerto cerrado no prueba que el servicio no exista (puede estar filtrado). Un puerto abierto sí prueba que está expuesto. No se hizo fingerprinting de versiones.

## 1. Hosts encontrados (18)

| IP | Puertos abiertos | Interpretación |
|---|---|---|
| `192.168.18.1` | 80 | Router / gateway |
| `192.168.18.8` | 80, 139, 445, **3389**, **3306** | Windows: web + SMB + **RDP** + **MySQL** |
| `192.168.18.9` | 80, 139, 445 | Windows: web + SMB |
| `192.168.18.13` | 80, **3389** | Windows: web + **RDP** |
| `192.168.18.15` | 80, 139, 445, **3389**, **3306** | Windows: web + SMB + **RDP** + **MySQL** |
| `192.168.18.17` | 139, 445, **3389**, **3306** | Windows: SMB + **RDP** + **MySQL** |
| `192.168.18.41` | 80, 443, **3389** | PC de trabajo (Windows) + **RDP** |
| `192.168.18.53` | 139, 445, **3306** | Windows: SMB + **MySQL** |
| `192.168.18.58` | 80, 443, 8000 | Servicio web (8000 tipo Kong/panel) |
| `192.168.18.63` | 139, 445, **3389**, **3306** | Windows: SMB + **RDP** + **MySQL** |
| `192.168.18.64` | 139, 445, **3389**, **3306** | Windows: SMB + **RDP** + **MySQL** |
| `192.168.18.68` | 22 | Linux |
| `192.168.18.70` | 22, 80, 443, 3000, 3306, 5432, 5678, 8000, 8080, 8443 | **`server01`** (Supabase, n8n, Chatwoot, Evolution API, Apache, SSH) |
| `192.168.18.75` | 80, 443, 139, 445, **3389**, **3306** | VM Windows del portal: web + SMB + **RDP** + **MySQL** |
| `192.168.18.80` | 22, 80 | Linux con web |
| `192.168.18.100` | 80, 443, 8000 | Servicio web |
| `192.168.18.203` | 22, 80, 443 | **nginx / Nginx Proxy Manager** |
| `192.168.18.204` | 22 | Linux |

## 2. Hallazgos de riesgo

| # | Hallazgo | Magnitud | Por qué importa |
|---|---|---|---|
| R1 | **RDP (3389) expuesto a toda la LAN** | **8 equipos**: `.8, .13, .15, .17, .41, .63, .64, .75` | Cualquier dispositivo de la red —incluido un visitante con WiFi— puede intentar fuerza bruta contra el escritorio. Es el vector de ransomware más común en redes planas |
| R2 | **MySQL (3306) expuesto** | **8 equipos** (incluido `server01`) | Bases de datos accesibles desde cualquier equipo; el portal no lo necesita |
| R3 | **SMB (139/445) expuesto** | 7 equipos Windows | Vector clásico (EternalBlue y familia); solo debería verlo el equipo de administración |
| R4 | **`server01` publica 10 puertos en `0.0.0.0`** | 1 host | Supabase, n8n, Chatwoot y Evolution API no están pensados para la LAN abierta; UFW está **inactivo** |
| R5 | **`server01:3306` (MySQL del host)** | 1 host | No lo usa el portal; podría escuchar solo en loopback |
| R6 | **Red plana sin segmentación** | Toda la /24 | No hay separación entre servidores, escritorios, usuarios e invitados: un compromiso en cualquier equipo da acceso al resto |

## 3. Diseño objetivo: **sin VLAN posible** → control compensatorio

**Restricción confirmada por el responsable (2026-10-24):** el switch/router **no soporta VLAN (802.1Q)** y **no hay WiFi de invitados**; todas las máquinas de la tabla son de **personal**.

Por lo tanto no hay segmentación por red disponible. En una red plana, el control equivalente es **firewall por equipo**, con el portal como único camino de administración:

```
Internet ──443──► nginx (.203) ──443──► server01 (.70) ──► guacd ──3389──► VMs
                                              ▲
             cada Windows: 3389 SOLO desde .70 ─┘
             (reglas de "Escritorio remoto" acotadas)
```

**Modelo de confianza:** no hay invitados; el riesgo residual es un **equipo de personal comprometido** (ransomware, phishing) que intente moverse lateralmente. Contra eso:

| Control | Alcance | Estado |
|---|---|---|
| RDP acotado a `.70` en cada Windows | Todos los equipos con RDP | **Pendiente de ejecutar** (`ops/windows/rdp-firewall.ps1`) |
| SMB acotado (opcional) | Equipos que no comparten carpetas | Opcional, con `-AlsoRestrictSmb` |
| MySQL en `127.0.0.1` | Instancias que no sirven a la LAN | Recomendado, por equipo |
| `server01`: servicios de Docker a loopback | R4/R5 del inventario | Fuera del alcance del portal; decisión del responsable |

**Riesgo residual aceptado:** sin VLAN, un equipo comprometido sigue pudiendo alcanzar servicios que otros equipos expongan a propósito (por ejemplo, un MySQL que necesite la LAN). Se mitiga con el firewall de cada host, no con la red. Queda registrado como tal para la auditoría.


## 4. Mitigación inmediata (sin tocar la red)

Se puede hacer hoy y elimina el 90% del riesgo de R1:

1. **Firewall de cada VM Windows**: permitir `3389` **solo desde `192.168.18.70`**; denegar el resto.
   ```powershell
   New-NetFirewallRule -DisplayName "RDP solo server01" -Direction Inbound -Protocol TCP `
     -LocalPort 3389 -RemoteAddress 192.168.18.70 -Action Allow
   Set-NetFirewallRule -DisplayName "Escritorio remoto*" -Enabled False   # desactiva las reglas amplias
   ```
2. **MySQL**: `bind-address = 127.0.0.1` en cada instancia que no necesite LAN, o firewall a la subred de aplicación.
3. **SMB**: bloquear `445/139` desde VLAN 30 cuando exista; mientras tanto, desde las IPs que no administran.
4. **`server01`**: `3306` del host y los servicios de Docker a loopback — **fuera del alcance de F-001** pero es R4/R5 y afecta a la auditoría.

## 5. Preguntas abiertas para cerrar el diseño

1. ~~¿WiFi de invitados en la misma /24?~~ **No hay WiFi de invitados** (2026-10-24). El vector "visitante" queda descartado; el riesgo es un equipo de personal comprometido.
2. ~~¿El switch soporta VLAN?~~ **No soporta 802.1Q** (2026-10-24). No hay segmentación por red; el control es el firewall de cada equipo.
3. ~~¿Quién administra el router?~~ Sin cambios de segmentación posibles, el router no es el punto de control.
4. **¿Los equipos `.8, .13, .15, .17, .53, .63, .64` necesitan exponer RDP/MySQL a la LAN?** Son de personal: si nadie más que `server01` debe abrirles RDP, se acotan con `ops/windows/rdp-firewall.ps1`.
5. **¿Alguna de esas máquinas comparte carpetas por SMB?** Si no, conviene `-AlsoRestrictSmb`.

## Relacionados

- Estado de seguridad y auditoría: [`2026-10-24-estado-seguridad-y-auditoria.md`](./2026-10-24-estado-seguridad-y-auditoria.md)
- Feature del portal: [`../specs/infra/F-001/F-001.spec.md`](../specs/infra/F-001/F-001.spec.md) · Arquitectura de despliegue: [`../decisions/DEC-0027-nginx-externo-y-apache-backend.md`](../decisions/DEC-0027-nginx-externo-y-apache-backend.md)
- Pendientes: [`../BACKLOG.md`](../BACKLOG.md)
