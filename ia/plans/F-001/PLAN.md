# PLAN-F-001

> **Un índice, no un documento.** Debe leerse completo en una pantalla. El detalle baja a las tareas ([DEC-0009](../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

Spec: `ia/specs/infra/F-001/F-001.spec.md`

## Reglas de secuencia (no negociables)

1. **Ninguna instalación antes de liberar disco:** T03–T09 no arrancan hasta que **T02** esté `done`.
2. **Ningún 443 público antes de endurecer las cuentas:** T07 no arranca hasta que **T06** esté `done`.

## Tareas

| ID | Objetivo | Depende de | Requerimientos | Validación |
|----|----------|------------|----------------|------------|
| [T01](./T01-verificacion-previa.md) | Verificación previa de `server01`, solo lectura: puertos libres, disco y RAM reales, nginx, clústeres PostgreSQL, nombres de unidad reales de Tomcat, y **alcance RDP a las VMs del ESXi** | - | R3 | Informe en el TRACKING con las salidas reales |
| [T02](./T02-liberar-disco.md) | Liberar disco conservando las copias más recientes (**gate**) | T01 | R1 | `df -h /` con holgura, recuperabilidad probada, y registrado en GATES |
| [T03](./T03-guacd.md) | `guacd` 1.6.0 compilado y como servicio de systemd, con RDP habilitado | T02 | R1, R2, R3 | Resumen de `configure` con `RDP yes` + `systemctl is-active guacd` |
| [T04](./T04-postgresql.md) | PostgreSQL dedicado (clúster en 5434), base `guacamole_db` y esquema | T02 | R3, R5 | AC3: `\dt` lista las tablas `guacamole_*` |
| [T05](./T05-tomcat-webapp.md) | Tomcat 9, la webapp y las extensiones JDBC, con heap acotado | T03, T04 | R1, R2, R3, R5 | AC1, AC2, AC4, AC9 |
| [T06](./T06-cuentas-totp.md) | Cuentas endurecidas, TOTP y límite de intentos | T05 | R6 | AC5 y AC13 |
| [T07](./T07-nginx-tls.md) | vhost nuevo en el nginx del host + TLS de certificado válido | T06 | R4 | AC6, desde fuera de la red interna, y revalidación de AC13 por el 443 |
| [T08](./T08-conexion-rdp.md) | Conexión RDP a la VM Windows, con portapapeles y unidades | T07 | R7 | AC7 y AC8, en el navegador real |
| [T09](./T09-smoke-test.md) | Suite smoke, `tests.commands` y validación del reinicio | T07 | R1, R8, R9 | AC10, AC11, AC12 (gate) |

## Riesgos

- **El host va justo** (1 vCPU, ~3.9 GiB libres, 21 contenedores). El stack pide del orden de 1 GB y concurrencia → el heap de la JVM se fija explícito (T05) y se mide `free -m` antes y después con una sesión abierta. Si no cabe sin degradar a los vecinos, **se para y se vuelve al usuario**.
- **Disco al 99%**: cualquier instalación puede llenarlo y romper Supabase o n8n. Por eso T02 es previa y bloqueante, y el footprint se **mide** en T01 (no se estima).
- **El clúster de PostgreSQL nace en el 5432**, que está ocupado por Supabase → T01 comprueba con `pg_lsclusters` y T04 crea el clúster **directamente en el 5434**, antes del primer arranque.
- **Tomcat 10+ no sirve el `.war`** (Guacamole 1.6.0 es `javax.servlet`) → se instala **Tomcat 9**; el nombre real de la unidad lo fija T01.
- **Reiniciar `server01` (AC12) tumba Supabase, n8n y Chatwoot**: gate con ventana acordada. Si no hay ventana, AC12 queda en `partial`.
- **Un vhost mal escrito en nginx tumba todos los sitios del host** → `nginx -t` obligatorio antes de recargar, copia del estado previo y comparación de `nginx -T` antes y después.
- **El certificado**: emitirlo con `certbot --nginx` reescribiría vhosts ajenos → se emite con `webroot` o `dns-01`. El dominio, su DNS y el reenvío del 443 son datos externos ([`../../CHECKLIST.md`](../../CHECKLIST.md)).
- **El guest no está listo** (RDP apagado, firewall abierto a toda la LAN, IP por DHCP) → es trabajo del usuario y está en [`../../CHECKLIST.md`](../../CHECKLIST.md); T08 depende de ello.
- **La suite smoke puede envenenar el harness** si falla por falta de entorno → termina en SKIP con exit 0 (R9).
- **La extensión JDBC y su driver son fáciles de olvidar**: sin ellos la webapp arranca y el login no existe. AC4 lo detecta.

## Atajos previstos

- **Ninguno declarado todavía.** Si al implementar se acepta la primera simplificación (por ejemplo, cerrar con una sola VM y sin la unidad compartida), se crea su entrada en [`../../DEBT.md`](../../DEBT.md) **con disparador** y se marca la línea con `// deuda(DEUDA-XXX)`.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Plantilla de tarea: [`../_task_template.md`](../_task_template.md)
