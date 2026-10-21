# PLAN-F-001

> **Un índice, no un documento.** Debe leerse completo en una pantalla. El detalle baja a las tareas ([DEC-0009](../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

Spec: `ia/specs/infra/F-001/F-001.spec.md`

## Reglas de secuencia (no negociables)

1. **Disco: sin gate.** T01 midió **46 GB libres**. T02 se cierra como *no aplica*. Si en cualquier momento `df -h /` baja de **10 GB**, se para y se avisa.
2. **Ningún 443 público antes de endurecer las cuentas:** T07 no arranca hasta que **T06** esté `done`.

## Tareas

| ID | Objetivo | Depende de | Requerimientos | Validación |
|----|----------|------------|----------------|------------|
| [T01](./T01-verificacion-previa.md) | Verificación previa de `server01`, solo lectura: puertos libres, disco y RAM reales, nginx, clústeres PostgreSQL, nombres de unidad reales de Tomcat, y **alcance RDP a las VMs del ESXi** | - | R3 | Informe en el TRACKING con las salidas reales |
| [T02](./T02-liberar-disco.md) | Liberar disco — **no aplica**: T01 midió 46 GB libres | T01 | R1 | `df -h /` de T01; sin borrado |
| [T03](./T03-guacd.md) | `guacd` 1.6.0 compilado y como servicio de systemd, con RDP habilitado | T02 | R1, R2, R3 | Resumen de `configure` con `RDP yes` + `systemctl is-active guacd` |
| [T04](./T04-postgresql.md) | PostgreSQL dedicado (clúster en 5434), base `guacamole_db` y esquema | T02 | R3, R5 | AC3: `\dt` lista las tablas `guacamole_*` |
| [T05](./T05-tomcat-webapp.md) | Tomcat 9 (tarball, unidad propia), la webapp y las extensiones JDBC, con heap acotado | T03, T04 | R1, R2, R3, R5 | AC1, AC2, AC4, AC9 |
| [T06](./T06-cuentas-totp.md) | Cuentas endurecidas, TOTP y límite de intentos | T05 | R6 | AC5 y AC13 |
| [T07](./T07-apache-tls.md) | vhost nuevo en el **Apache** del host + TLS de certificado válido | T06 | R4 | AC6, desde fuera de la red interna, y revalidación de AC13 por el 443 |
| [T08](./T08-conexion-rdp.md) | Conexión RDP a la VM Windows, con portapapeles y unidades | T07 | R7 | AC7 y AC8, en el navegador real |
| [T09](./T09-smoke-test.md) | Suite smoke, `tests.commands` y validación del reinicio | T07 | R1, R8, R9 | AC10, AC11, AC12 (gate) |

## Riesgos

- **El host va justo** (1 vCPU, 4.6 GiB disponibles, 21 contenedores). El stack pide del orden de 1 GB y concurrencia → el heap de la JVM se fija explícito (T05) y se mide `free -m` antes y después con una sesión abierta. Si no cabe sin degradar a los vecinos, **se para y se vuelve al usuario**.
- **Disco: sin riesgo inmediato** (46 GB libres, medidos en T01). Igual se vigila con `df -h /` antes y después de cada instalación; por debajo de 10 GB se para.
- **El clúster de PostgreSQL nace en el 5432**, ocupado por Supabase (un contenedor) → T04 crea el clúster **directamente en el 5434**, antes del primer arranque.
- **`tomcat9` no existe en noble**: se instala del **tarball oficial** en `/opt/tomcat9` con unidad propia (`guacamole-tomcat`). Eso hace que la unidad sea nuestra: hay que escribirla con `-Xmx512m` y arrancarla en el 8081 desde el primer arranque.
- **`sudo` pide contraseña**: sin una entrada NOPASSWD acotada, T03–T08 no pueden ejecutarse. Es un bloqueo de infraestructura, no del plan.
- **Reiniciar `server01` (AC12) tumba Supabase, n8n y Chatwoot**: gate con ventana acordada. Si no hay ventana, AC12 queda en `partial`.
- **Un vhost mal escrito en Apache tumba todos los sitios del host** → `apache2ctl configtest` obligatorio antes de recargar, y copia de `/etc/apache2` antes de tocar nada. Apache no tiene un `-T` como nginx: la comparación es contra la copia.
- **El certificado**: emitirlo con `certbot --apache` reescribiría vhosts ajenos → se emite con `certbot certonly --webroot` (el 80 de Apache sirve `/.well-known`) o `dns-01`. El dominio, su DNS y el reenvío del 443 son datos externos ([`../../CHECKLIST.md`](../../CHECKLIST.md)).
- **El guest ya está listo** (T01): Windows 10 Pro, RDP con NLA, IP manual `192.168.18.41` y 3389 alcanzable desde `server01`. Falta lo que no se puede verificar sin sesión: que la cuenta de Windows tenga contraseña y permita RDP.
- **La suite smoke puede envenenar el harness** si falla por falta de entorno → termina en SKIP con exit 0 (R9).
- **La extensión JDBC y su driver son fáciles de olvidar**: sin ellos la webapp arranca y el login no existe. AC4 lo detecta.
- **La suite smoke puede envenenar el harness** si falla por falta de entorno → termina en SKIP con exit 0 (R9).
- **La extensión JDBC y su driver son fáciles de olvidar**: sin ellos la webapp arranca y el login no existe. AC4 lo detecta.

## Atajos previstos

- **Ninguno declarado todavía.** Si al implementar se acepta la primera simplificación (por ejemplo, cerrar con una sola VM y sin la unidad compartida), se crea su entrada en [`../../DEBT.md`](../../DEBT.md) **con disparador** y se marca la línea con `// deuda(DEUDA-XXX)`.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Plantilla de tarea: [`../_task_template.md`](../_task_template.md)
