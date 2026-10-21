# 08 — Gates: operaciones de una sola dirección

Una **operación de una sola dirección** es una que no se deshace: borra, sobrescribe, publica o emite algo que ya no se puede retirar. Se tratan distinto de todo lo demás.

## Catálogo por defecto

Adáptalo a tu stack. Ejemplos típicos:

| Operación | Por qué es irreversible |
|---|---|
| Migraciones sobre una BD con datos | Añadir es reversible; `DROP`, `ALTER` o un `UPDATE` masivo no |
| Restaurar un dump (`mysql < dump.sql`, `pg_restore`) | Pisa datos existentes |
| Borrado de archivos/tablas/carpetas (`rm -rf`, `DROP TABLE`, `TRUNCATE`) | No vuelve |
| `git push --force`, reescritura de historia | Rompe el trabajo de otros |
| Deploy a un entorno compartido o producción | Afecta a usuarios reales |
| Publicar/emitir un documento con efecto externo (factura, comprobante fiscal, email masivo, webhook) | Efecto legal o contractual |
| Usar el **perfil real del navegador** para una prueba | Es la sesión de la persona: sus logins, su historial. Además exige cerrar el navegador (DEC-0017) |
| Instalar dependencias nuevas | Cambia la superficie de ataque y el lockfile |
| Cambiar variables de entorno o secretos | Puede tumbar un servicio |

## Regla

Antes de ejecutar una operación del catálogo:

1. **Anuncia** exactamente qué se va a ejecutar y sobre qué (entorno, base, ruta).
2. **Di qué se pierde** si sale mal.
3. **Espera confirmación explícita** del usuario. Una respuesta ambigua ("ok", "sí", "dale") no cuenta: pide la confirmación concreta.
4. **Registra** la operación en [`../GATES.md`](../GATES.md) con `Confirmado: <quién>` y el resultado.

Si el entorno es automatizado y no hay humano (CI, sesión desatendida): **no ejecutes operaciones de una sola dirección**. Detente, deja el gate pendiente y repórtalo.

## La comprobación que respalda el gate

El gate se apoya en una afirmación: *"no se pierde nada"*. Esa afirmación **también se verifica**, y es de lo que más fácil se olvida uno.

Tres reglas. Las tres nacen de un error real, no de la teoría.

1. **Separación.** La comprobación de seguridad y la acción destructiva **no se ejecutan en el mismo paso**. Si van juntas, la comprobación no se puede repetir, ni leer despacio, ni cuestionar. Primero se corre la comprobación y se lee; después, en un paso aparte, se ejecuta la operación.
2. **Recuperabilidad antes que unicidad.** Es preferible probar *"puedo restaurarlo"* a probar *"no hay nada único"*. La recuperabilidad tiene un test simple y binario: el commit está en el remoto (`git merge-base --is-ancestor`), el respaldo existe y lo abrí, la transacción tiene rollback. La unicidad depende de una comparación que se puede escribir mal — y se escribe mal.
3. **Un número no es evidencia hasta que sabes por qué ese número.** Antes de aceptar el resultado de una comprobación, pregúntate si el resultado es **posible**. Un `diferencias: 138` entre dos listas de 89 elementos es imposible: eso ya te dice que el instrumento está roto, no la cosa medida.

> **Caso, 2026-10-14.** Al borrar un respaldo se presentó como prueba una comparación de listas de archivos con un bug de separadores (`\` contra `/`). Devolvió `138` entre listas de 89: aritméticamente imposible, y con la firma del bug a la vista (`2 × 69`, exactamente los archivos en subcarpetas). El borrado se ejecutó **en el mismo paso**, así que la comprobación dejó de ser repetible. No se perdió nada —git tenía el commit— pero el procedimiento falló con el ritual completo cumplido. Ver [DEC-0020](../decisions/DEC-0020-comprobacion-del-gate.md).

## Antes de crear el gate: busca la versión reversible

El gate no es excusa para no pensar. Antes de pedir permiso para algo destructivo, comprueba si existe la variante segura: backup antes de migrar, `--dry-run`, transacción con rollback, migración idempotente y aditiva, rama en vez de push directo, entorno de staging antes que producción. Si existe una forma reversible, **esa es la respuesta correcta**, no el gate.

## Congelar ediciones

Cuando la tarea exige no tocar nada fuera de un directorio, el alcance se declara en la propia feature y se respeta como bloqueo duro, no como sugerencia. La regla de scope de [`04-plan.md`](./04-plan.md) manda: si un archivo no necesita cambiar, no se toca.

## Relacionados

- Bitácora de gates: [`../GATES.md`](../GATES.md)
- Verificación previa (backup/dry-run): [`06-validation.md`](./06-validation.md)
- Scope: [`02-cycle.md`](./02-cycle.md)
