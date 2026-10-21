# 02 — Ciclo obligatorio y clasificación

## Ciclo

```
REQUEST → CONTEXT → SPEC → PLAN → IMPLEMENT → VALIDATE → REVIEW → RECORD → MEMORY UPDATE → NEXT
```

Nunca omitas el registro final. La fase `REVIEW` es obligatoria **según el riesgo** de la feature (ver [`07-review.md`](./07-review.md)).

## Clasificación de la solicitud

Clasifica internamente cada solicitud antes de tocar nada:

| Tipo | ¿Ciclo completo? |
|------|------------------|
| `QUESTION` | No. Responde y ya. |
| `INVESTIGATION` | No necesariamente. Si el hallazgo tiene valor futuro → `research/`. |
| `BUG` | Sí, salvo corrección trivial evidente. |
| `FEATURE` | Sí. |
| `REFACTOR` | Sí. |
| `INFRASTRUCTURE` | Sí. |
| `DOCUMENTATION` | No. |
| `SPEC` | Solo spec + plan, sin implementar. |

## Spec-first

Si la solicitud cambia comportamiento funcional: **no programes primero**.

1. Interpreta el requerimiento.
2. Revisa specs y decisiones existentes que puedan verse afectadas.
3. Crea o actualiza la SPEC ([`03-spec.md`](./03-spec.md)).
4. Deriva el PLAN ([`04-plan.md`](./04-plan.md)).
5. Implementa por tareas atómicas.

**Excepción declarada:** correcciones triviales evidentes (typo, texto de UI, un literal) pueden resolverse con una **micro-spec** dentro de `CHANGELOG.md`, sin documentos nuevos. Debe quedar dicho en la respuesta.

## Control de scope

Antes de modificar un archivo, pregunta: **"¿este archivo necesita cambiar para cumplir la SPEC?"**. Si la respuesta es no, no lo modifiques.

Si la respuesta es "sí, pero para algo que la SPEC no pide": detente, regístralo en [`../BACKLOG.md`](../BACKLOG.md) y sigue con el alcance acordado.

## Antes de tocar código

1. `CURRENT.md` · 2. `MEMORY.md` · 3. SPEC activa · 4. PLAN activo · 5. solo los archivos de código necesarios · 6. confirmar el alcance · 7. modificar únicamente lo requerido.

No explores todo el repositorio sin necesidad.

## Relacionados

- SPEC: [`03-spec.md`](./03-spec.md) · PLAN: [`04-plan.md`](./04-plan.md)
- Scope y gates: [`08-gates.md`](./08-gates.md)
