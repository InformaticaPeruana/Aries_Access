## DEC-0022 — Nombres de archivo en inglés, y enlaces verificados

Date: 2026-10-21
Status: active

Context:
Dos cosas, y la segunda es la que importa.

**El nombre.** Los archivos del harness estaban en inglés (`CURRENT.md`, `GATES.md`, `specs/`, `agents/`…) salvo cinco en castellano: `ADOPTAR.md`, `ACTUALIZAR.md`, `DEUDA.md`, `instrucciones.md` y el directorio `protocolo/`. [DEC-0010](./DEC-0010-idioma-castellano.md) dice que los **identificadores técnicos van en inglés** y que el castellano es para la prosa. Un nombre de archivo es un identificador. La mezcla era una inconsistencia, no una decisión.

**El contrato sin mecanismo.** [DEC-0016](./DEC-0016-contexto-delegacion.md) declara los enlaces relativos como *contrato de navegación*: son el camino por el que un agente encuentra el contexto. Pero **nada verificaba que llegaran a algún sitio**: el chequeo `enlaces` solo contaba enlaces *salientes*, para detectar nodos aislados. Un enlace podía apuntar a un archivo inexistente durante meses sin que nadie se enterara.

Y las dos cosas juntas son una trampa: renombrar trece archivos rompe unos 150 enlaces relativos, en silencio, con el contrato declarado y sin nadie mirando.

Decision:
1. **Todos los nombres de archivo y carpeta del harness, en inglés.**
   `ADOPTAR→ADOPT`, `ACTUALIZAR→UPDATE`, `DEUDA→DEBT`, `instrucciones→INSTRUCTIONS`, `protocolo/→protocol/`, y ocho fases del protocolo al inglés.
2. **Chequeo `enlaces-rotos`:** todo enlace relativo de un documento del harness resuelve a un archivo o carpeta que existe. Se añade **antes** del renombrado, precisamente para que el renombrado esté verificado.
3. **Convención de plantillas:** un archivo cuyo nombre empieza por `_` o termina en `.template.md` se **copia a otra profundidad**, así que sus enlaces son relativos al *destino* y quedan exentos del chequeo. Sin esto se marcarían como roto por diseño.

Reason:
El renombrado sin red es exactamente el tipo de cambio que el harness no debe permitir: amplio, mecánico y sin verificación. Se descartó hacerlo antes del chequeo por eso.

Se descartó también dejar los nombres en castellano: son ASCII, así que no tienen el problema de codificación de [DEC-0021](./DEC-0021-ascii-en-nombres-y-codigo.md), pero rompen la consistencia con el resto y con DEC-0010.

## Consequences

- **El chequeo encontró doce enlaces roto *antes* del renombrado**, incluido uno real en la feature de ejemplo (`../README.md` desde una carpeta de tres niveles). Llevaban ahí desde que se escribieron, sin que nadie los viera.
- Y encontró **una referencia colgante en la carpeta `ia-harness/` en su primer minuto de vida**: se citaba una decisión que aún no existía.
- El chequeo cubre también `ia-harness/`, para que el seguimiento del mantenimiento no se puede pudra por dentro.
- La convención de las plantillas queda documentada aquí y en el código: es la razón por la que siete archivos aparecen como exentos.
- Un renombrado futuro ya tiene procedimiento y red: `git mv`, barrido de referencias en Node, y el chequeo como verificación.
- Adoptar esta versión obliga a borrar los nombres antiguos; la migración está en [`../UPDATE.md`](../UPDATE.md).

## Relacionados

- Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) · Navegación: [DEC-0016](./DEC-0016-contexto-delegacion.md) · Idioma: [DEC-0010](./DEC-0010-idioma-castellano.md)
- Migración: [`../UPDATE.md`](../UPDATE.md) · Probar al que prueba: [DEC-0019](./DEC-0019-probar-el-checker.md) · Índice: [`INDEX.md`](./INDEX.md)
