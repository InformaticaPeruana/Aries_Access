# 05 — TRACKING, estados y cierre de tareas

## Ubicación

La bitácora vive junto a la spec:

```
ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-TRACKING.md
```

Plantilla: [`_tracking_template.md`](../specs/_tracking_template.md). El estado de cada tarea se actualiza **solo** aquí y en el `Status:` de su archivo `T0n`.

## Vocabulario único de estados

- **Feature:** `pending | in_progress | completed | blocked`
- **Tarea:** `pending | in_progress | done | partial | blocked`

Lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs). Un estado fuera de esta lista es un fallo del harness, no una licencia.

## Regla de cierre

- **`done` exige evidencia de todos sus AC** en la columna `Evidencia` (test, build, grep, consulta SQL, inspección, prueba manual o de camino de usuario). **No hay `done` con "se verifica en otra capa" sin registrar dueño.**
- Si algún AC queda sin verificar → `partial`, con nota de **qué falta, quién lo cierra y bajo qué condición**. `partial` es un estado legítimo (diferimiento declarado), no un fracaso.
- **`blocked`** se reserva para dependencias externas: registra la causa y la condición de desbloqueo.
- Los AC **no se marcan con checkboxes**: aparentan pendiente sin serlo. La evidencia vive en la columna `Evidencia`.

## Evidencia por el camino del usuario

Un AC funcional observable **no se cierra con una prueba del almacén**. La evidencia debe recorrer el mismo camino que el usuario: petición HTTP real, pantalla real, CLI real, webhook real. Ver [`09-qa.md`](./09-qa.md).

## Mecanismo que comprueba

Todo invariante declarado aquí (sincronía TRACKING↔tareas, vocabulario de estados, trazabilidad de código) tiene un mecanismo que lo verifica: [`../tools/check-harness.mjs`](../tools/check-harness.mjs), enganchado al gate de commit.

El check en verde **no reemplaza la evidencia**. La evidencia es la columna `Evidencia` y las pruebas. El check solo impide la degradación silenciosa del harness.

## Relacionados

- Plan y tareas: [`04-plan.md`](./04-plan.md)
- Validación: [`06-validation.md`](./06-validation.md)
- Fallos conocidos: [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md)
