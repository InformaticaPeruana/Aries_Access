## DEC-0007 — Gates para operaciones de una sola dirección

Date: 2026-10-21
Status: active

Context:
El harness anterior tiene reglas para casi todo, pero **no menciona ni una vez** los comandos destructivos. Y su operación los tiene: migraciones sobre una base con datos, restauración de dumps, deploy a un servidor compartido, instalación en un dispositivo físico y, a futuro, emisión de documentos con efecto legal. Ninguna de esas se deshace.

Decision:
Se define un catálogo de **operaciones de una sola dirección** ([`../protocol/08-gates.md`](../protocol/08-gates.md)). Antes de ejecutar una:

1. Anunciar el comando exacto, el entorno y el destino.
2. Declarar qué se pierde si sale mal.
3. **Esperar confirmación explícita.** Una respuesta ambigua no cuenta.
4. Registrar en [`../GATES.md`](../GATES.md) con quién confirmó y el resultado.

En sesiones sin humano (CI, desatendidas) las operaciones del catálogo **no se ejecutan**: se dejan pendientes y se reportan.

**Antes de pedir el gate se busca la variante reversible** (backup, `--dry-run`, transacción con rollback, migración aditiva e idempotente, rama en vez de push directo, staging antes que producción). Si existe, esa es la respuesta correcta, no el gate.

Reason:
El gate no es burocracia: es la diferencia entre un error que se corrige y uno que se convierte en pérdida de datos o en un documento fiscal equivocado. Se descartó una lista de "comandos prohibidos": lo que importa es el efecto, no el nombre del comando.

Consequences:
- Los gates pendientes se cuentan en el reporte; un gate bloqueado mucho tiempo sube a `CURRENT.md` §Blockers.
- Buscar la variante reversible es obligatorio antes de registrar el gate.

## Relacionados

- Protocolo: [`../protocol/08-gates.md`](../protocol/08-gates.md) · Bitácora: [`../GATES.md`](../GATES.md)
- Índice: [`INDEX.md`](./INDEX.md) · Diseño (G4): [`../DESIGN.md`](../DESIGN.md)
