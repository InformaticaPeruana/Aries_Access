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

## 3. Diseño objetivo (tres segmentos)

```
                    ┌──────────────────────────┐
   Internet ──443──►│ VLAN 10 · SERVIDORES     │
                    │  .70 server01            │
                    │  .203 nginx (NPM)        │
                    │  .68 .80 .204 (Linux)    │
                    └───────────┬──────────────┘
                                │ 3389 solo desde .70
                    ┌───────────▼──────────────┐
                    │ VLAN 20 · ESCRITORIOS    │
                    │  .8 .9 .13 .15 .17 .41   │
                    │  .53 .63 .64 .75         │
                    └───────────▲──────────────┘
                                │ denegado (salvo 443 al portal)
                    ┌───────────┴──────────────┐
                    │ VLAN 30 · USUARIOS/WIFI  │
                    │  puestos + invitados     │
                    └──────────────────────────┘
```

**Matriz de acceso (lo que se permite; todo lo demás se deniega):**

| Origen → Destino | VLAN 10 (servidores) | VLAN 20 (escritorios) | VLAN 30 (usuarios/invitados) |
|---|---|---|---|
| **VLAN 10** | según servicio | **3389 solo desde `.70`** | — |
| **VLAN 20** | — | — | — |
| **VLAN 30** | **443 solo a `.203`** | — | — |
| **Invitados** | **443 a `.203`** | — | — |

Consecuencia buscada: el **único** camino a un escritorio es `nginx → server01 → guacd → 3389`. Un invitado no puede ver un 3389 ni un 445 ni un 3306.

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

1. ¿La **WiFi de invitados** comparte la `192.168.18.0/24`? Si es así, hoy un visitante alcanza los 8 RDP: es el escenario que hay que cortar primero.
2. ¿El **switch/router admite VLAN** (802.1Q)? Sin eso, la segmentación se resuelve con un firewall entre subredes, no con VLANs.
3. ¿Quién administra el router (`192.168.18.1`)? Los cambios de segmentación son ahí.
4. ¿Los equipos `.8, .13, .15, .17, .53, .63, .64` son de producción? Definir si alguno debe seguir exponiendo RDP/MySQL a la LAN o también pasa por el portal.

## Relacionados

- Estado de seguridad y auditoría: [`2026-10-24-estado-seguridad-y-auditoria.md`](./2026-10-24-estado-seguridad-y-auditoria.md)
- Feature del portal: [`../specs/infra/F-001/F-001.spec.md`](../specs/infra/F-001/F-001.spec.md) · Arquitectura de despliegue: [`../decisions/DEC-0027-nginx-externo-y-apache-backend.md`](../decisions/DEC-0027-nginx-externo-y-apache-backend.md)
- Pendientes: [`../BACKLOG.md`](../BACKLOG.md)
