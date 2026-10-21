# 13 — Cierre de tarea, registro y git

## Protocolo después de cada cambio significativo

1. **Valida** el cambio ([`06-validation.md`](./06-validation.md)).
2. **Actualiza la tarea** (`Status:` en el `T0n`).
3. **Actualiza el TRACKING** (estado + evidencia).
4. **Registra** en `CHANGELOG.md`.
5. **Actualiza `CURRENT.md`** (sigue siendo ≤ 60 líneas).
6. **Actualiza `MEMORY.md`** solo si apareció conocimiento persistente.
7. **Actualiza `ARCHITECTURE.md`** solo si cambió la arquitectura.
8. **Registra la decisión** en `decisions/` solo si hubo una decisión relevante.
9. **Actualiza `BACKLOG.md`** si descubriste trabajo futuro.
10. **Actualiza `DEBT.md`** si aceptaste un atajo.
11. **Al cerrar la feature** (o si cambiaron estado, stack o comandos): actualiza también `AGENTS.md` y `PROJECT.md`. Son la puerta de entrada y se congelan fácilmente con datos del bootstrap.

**No reescribas todos los documentos tras cada cambio.** Actualiza solo los afectados.

## Finalization check

Antes de decir que una tarea terminó:

```
[ ] SPEC cumplida
[ ] cambios mínimos (nada fuera de alcance)
[ ] validación realizada y registrada como evidencia
[ ] revisión adversarial hecha, si el riesgo la exigía
[ ] gates registrados, si hubo operaciones de una sola dirección
[ ] TRACKING actualizado · CURRENT actualizado · CHANGELOG actualizado
[ ] MEMORY / ARCHITECTURE / DECISIONS / BACKLOG / DEUDA actualizados si correspondía
[ ] check-harness en verde
```

Si falta alguno aplicable, **la tarea aún no terminó**.

## Git

Git conserva el **cómo exacto**; `/ia` explica **por qué**, **qué** y **en qué estado**. No dupliques git dentro de `/ia`.

- Formato: Conventional Commits referenciando la feature → `feat(F-001): <descripción>` · `fix(F-001): <descripción>` · `docs(F-001): ...`
- Un commit debe relacionarse conceptualmente con su SPEC.
- El gate de commit corre `check-harness` (ver [`../tools/git-hooks/pre-commit`](../tools/git-hooks/pre-commit)). Un fallo del harness bloquea el commit salvo `--no-verify` explícito, que se justifica en la respuesta.

## Comando de inicio (primera vez)

1. Verifica si existe `ia/`; si no, créalo.
2. Ejecuta BOOTSTRAP MODE ([`11-bootstrap.md`](./11-bootstrap.md)).
3. Analiza el proyecto existente y crea la documentación inicial.
4. **No modifiques comportamiento funcional.**
5. Presenta un resumen compacto y deja `CURRENT.md` listo para continuar.

A partir de ahí: **no existe cambio funcional sin SPEC → PLAN → IMPLEMENT → VALIDATE → REVIEW → RECORD.**

## Relacionados

- Estados: [`05-tracking.md`](./05-tracking.md) · Validación: [`06-validation.md`](./06-validation.md)
- Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) · Estado: [`../CURRENT.md`](../CURRENT.md)
