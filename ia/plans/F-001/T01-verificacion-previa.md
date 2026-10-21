---
Feature: F-001
Task: T01
Status: pending
Depends: -
---

# T01 — Verificación previa de `server01` (solo lectura)

## Objetivo

Dejar de faltar el **estado real** del host antes de tocar nada: puertos libres, disco y RAM medidos, cómo está el nginx, qué clústeres de PostgreSQL existen, cómo se llaman de verdad las unidades de Tomcat, y —lo que decide todo— **si `server01` alcanza las VMs Windows del ESXi por RDP**.

## Requerimientos

- R3
- **Aporta evidencia** a AC2 (dueño: T05). Además fija los **nombres reales de las unidades** y la **sintaxis de versión** que usan AC1 y AC9: ninguno se cierra aquí.

## Archivos previstos

- Ninguno del repo. Salidas y mediciones quedan como evidencia en `ia/.harness/F-001/T01/` (no se versiona).

## Validación

**Solo lectura.** Ningún comando instala, borra, reinicia ni recarga nada.

```bash
ssh humberto@192.168.18.70 'hostnamectl; df -h /; free -m; ss -ltnp; nginx -v; ls /etc/nginx/sites-enabled/'
# puertos candidatos
ssh humberto@192.168.18.70 'ss -ltn | grep -E ":(443|8081|5434|4822)\b" || echo "libres"'
# clusteres PostgreSQL ya existentes (el 5432 es de Supabase)
ssh humberto@192.168.18.70 'pg_lsclusters 2>/dev/null || echo "sin postgresql instalado"'
# nombres reales de las unidades de Tomcat (no se adivinan)
ssh humberto@192.168.18.70 'systemctl list-unit-files | grep -i tomcat || echo "tomcat no instalado"'
# tamano real del stack antes de instalarlo, y comandos que se dan por hechos
ssh humberto@192.168.18.70 'apt-get -s install tomcat9 postgresql-16 2>/dev/null | tail -5; command -v guacd'
# red: alcance a las VMs del ESXi (IP real de cada VM Windows)
ssh humberto@192.168.18.70 'for ip in <IP_VM1> <IP_VM2>; do timeout 5 bash -c "echo > /dev/tcp/$ip/3389" && echo "$ip 3389 OK" || echo "$ip 3389 SIN RESPUESTA"; done'
# copia del estado de nginx, para comparar despues (T07)
ssh humberto@192.168.18.70 'sudo nginx -T > /tmp/nginx-antes.txt && wc -l /tmp/nginx-antes.txt'
```

Cierra cuando el TRACKING tenga: la salida real de cada bloque, la **lista de VMs alcanzables**, el **tamaño medido** de lo que hay que instalar y los **nombres reales de las unidades** de Tomcat y PostgreSQL.

## Trazabilidad

```
// F-001 T01
```

## Notas

- Si el 443 no está libre, o el 3389 de las VMs no responde desde `server01`, **el plan cambia**: se para y se vuelve al usuario antes de seguir (no se improvisa una red).
- Se fija acá la **sintaxis exacta de la versión** de `guacd` (`-v` o `--version`): AC9 no se escribe sobre un comando supuesto.
- Se mide el disco que va a pedir el stack (paquetes + toolchain de compilación) y se corrige el techo de la spec si la medición no cuadra.
- Se comprueba que la VM tiene **IP fija o reserva**: si no, la conexión RDP se romperá sola.
- `pg_lsclusters` es el que decide si hay que crear un clúster nuevo en el 5434 (T04).

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Estados: [`../../protocol/05-tracking.md`](../../protocol/05-tracking.md)
