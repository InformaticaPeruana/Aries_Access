# PLAN-F-003

Spec: `ia/specs/seguridad/F-003/F-003.spec.md`

## Reglas de secuencia

1. **Nada de esto puede debilitar el portal:** MFA y límite de intentos siguen vigentes; el `.war` no se toca.
2. **La grabación contiene todo lo visible:** acceso restringido por credenciales propias y retención de 7 días.

## Tareas

| ID | Objetivo | Depende de | Requerimientos | Validación |
|----|----------|------------|----------------|------------|
| [T01](./T01-grabacion.md) | Grabación de sesiones con retención de 7 días | - | R1 | AC1 |
| [T02](./T02-eventos-alertas.md) | Colector de eventos y alertas por correo | - | R2, R3 | AC2, AC3 |
| [T03](./T03-grabaciones-web.md) | Página de grabaciones y enlace en el menú de Guacamole | T01 | R4 | AC4 |
| [T04](./T04-archivos-fuerza-bruta.md) | Sin transferencia de archivos y análisis de fuerza bruta | - | R5, R6 | AC5, AC6 |
| [T05](./T05-red-rdp.md) | Inventario de red y acotamiento del RDP | - | R7 | AC7 (parcial) |

## Riesgos

- **Las grabaciones son sensibles**: contienen la pantalla completa y lo que se tipea. Mitigación: Basic Auth + restricción por IP + retención de 7 días.
- **El colector depende del formato del access log**: si cambia el patrón de Tomcat, deja de encontrar fallos. Mitigación: el patrón está fijado en `server.xml` y el colector busca `xff=`.
- **Sin VLAN**, el acotamiento del RDP es por equipo: depende de ejecutar el script en cada máquina.

## Relacionados

- Spec: `ia/specs/seguridad/F-003/F-003.spec.md` · TRACKING: `ia/specs/seguridad/F-003/F-003-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md)
