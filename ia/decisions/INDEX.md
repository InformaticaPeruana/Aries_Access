# DECISIONS INDEX

Índice de decisiones vigentes. Cada decisión vive en su propio archivo. Plantilla: [`_template.md`](./_template.md). Mapa del harness: [`../README.md`](../README.md) · Diseño: [`../DESIGN.md`](../DESIGN.md).

| ID | Título | Status |
|----|--------|--------|
| [DEC-0001](./DEC-0001-metodologia-3-documentos.md) | Metodología: 1 feature = 1 SPEC + 1 PLAN + 1 TRACKING | ACTIVE |
| [DEC-0002](./DEC-0002-enforcement-mecanismo.md) | Los invariantes del harness se comprueban con mecanismo ejecutable | ACTIVE |
| [DEC-0003](./DEC-0003-estados-cierre.md) | Vocabulario único de estados y regla de cierre (incl. `partial`) | ACTIVE |
| [DEC-0004](./DEC-0004-memoria-diferencial.md) | Memoria diferencial y presupuesto por archivo | ACTIVE |
| [DEC-0005](./DEC-0005-enlaces-navegacion.md) | Enlaces relativos como contrato de navegación | ACTIVE |
| [DEC-0006](./DEC-0006-revision-adversarial.md) | Revisión adversarial obligatoria por riesgo | ACTIVE |
| [DEC-0007](./DEC-0007-gates-una-direccion.md) | Gates para operaciones de una sola dirección | ACTIVE |
| [DEC-0008](./DEC-0008-presupuestos-ratchet.md) | Presupuestos y ratchets sobre lo que se lee cada sesión | ACTIVE |
| [DEC-0009](./DEC-0009-tareas-ordenes-trabajo.md) | Tareas como órdenes de trabajo en carpetas por feature | ACTIVE |
| [DEC-0010](./DEC-0010-idioma-castellano.md) | Idioma de trabajo: castellano neutro, lo técnico en inglés | ACTIVE |
| [DEC-0011](./DEC-0011-deuda-atajos.md) | Deuda por atajos aceptados, con disparador de cierre | ACTIVE |
| [DEC-0012](./DEC-0012-fallos-conocidos.md) | Fallos conocidos con dueño y condición de cierre | ACTIVE |
| [DEC-0013](./DEC-0013-sin-binarios.md) | Sin binarios versionados dentro de `/ia` | ACTIVE |
| [DEC-0014](./DEC-0014-evidencia-camino-usuario.md) | La evidencia debe recorrer el camino del usuario | ACTIVE |
| [DEC-0015](./DEC-0015-motores-qa.md) | Motores de QA: nada vendorizado, el motor se resuelve en runtime | ACTIVE |
| [DEC-0016](./DEC-0016-contexto-delegacion.md) | Contexto: disparadores de delegación y punto de retomada verificado | ACTIVE |
| [DEC-0017](./DEC-0017-perfil-real-navegador.md) | Perfil real del navegador para probar con sesión autenticada | ACTIVE |
| [DEC-0018](./DEC-0018-version-actualizacion.md) | Versión del harness y camino de actualización | ACTIVE |
| [DEC-0019](./DEC-0019-probar-el-checker.md) | El checker también se prueba: un caso por chequeo | ACTIVE |
| [DEC-0020](./DEC-0020-comprobacion-del-gate.md) | La comprobación que respalda el gate también se verifica | ACTIVE |
| [DEC-0021](./DEC-0021-ascii-en-nombres-y-codigo.md) | Nombres y código en ASCII; la prosa conserva el castellano | ACTIVE |
| [DEC-0022](./DEC-0022-nombres-en-ingles-y-enlaces.md) | Nombres de archivo en inglés, y enlaces verificados | ACTIVE |
| [DEC-0023](./DEC-0023-campo-nuevo-desde-su-fecha.md) | Un campo nuevo obligatorio aplica desde su fecha, no hacia atrás | ACTIVE |
| [DEC-0024](./DEC-0024-adopcion-aries-access.md) | Adopción del harness `/ia` en Aries_Access (camino A) | ACTIVE, `codeRoots` ampliado por DEC-0026 |
| [DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md) | Despliegue nativo del stack Guacamole, sin Docker | ACTIVE, enmendada por DEC-0026 |
| [DEC-0026](./DEC-0026-arquitectura-despliegue-server01.md) | Arquitectura de despliegue en `server01`: nginx, puertos y RDP | ACTIVE |

## Relacionados

- Mapa del harness: [`../README.md`](../README.md) · Diseño y gaps: [`../DESIGN.md`](../DESIGN.md)
- Protocolo: [`../protocol/13-close-git.md`](../protocol/13-close-git.md) · Estado: [`../CURRENT.md`](../CURRENT.md)
