## DEC-0010 — Idioma de trabajo: castellano neutro, lo técnico en inglés

Date: 2026-10-21
Status: active

Context:
Un proyecto con equipo hispanohablante pero código, esquemas de datos y herramientas en inglés genera dos problemas cuando no se fija: documentación mezclada sin criterio, y traducciones forzadas de nombres técnicos que rompen la búsqueda y la coherencia con el código.

Decision:
Toda comunicación e interacción va en **castellano neutro**: respuestas, preguntas, resúmenes, mensajes de estado, UI, specs, planes, tracking, documentación y mensajes de commit.

- **Sin voseo**: "Selecciona", "Refresca", "Prueba" — nunca "Seleccioná", "Refrescá", "Probá".
- **Lo técnico se mantiene en inglés**: identificadores de código (variables, funciones, clases), nombres de tablas y columnas, campos y endpoints de API, tipos y enums, comandos, flags y siglas estándar. No se traducen a la fuerza.

Reason:
Un idioma por capa evita dos fallos: que la documentación y la UI suenen a traducción automática, y que buscar en el código por un nombre traducido no encuentre nada. Se descartó traducir identificadores: rompe la convención del ecosistema y la búsqueda.

Consequences:

- Los mensajes de commit siguen Conventional Commits en inglés en el tipo y el prefijo de feature, con la descripción en castellano: `feat(F-001): agregar validación de RUC`.
- Las revisiones de estilo de UI incluyen el voseo como defecto.

## Relacionados

- Entrada de sesión: [`../AGENTS.template.md`](../AGENTS.template.md) · Router: [`../INSTRUCTIONS.md`](../INSTRUCTIONS.md)
- Índice: [`INDEX.md`](./INDEX.md) · Protocolo: [`../protocol/13-close-git.md`](../protocol/13-close-git.md)
