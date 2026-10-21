# GATES — bitácora de operaciones de una sola dirección

Registro de cada operación irreversible ejecutada. Ver [`protocol/08-gates.md`](./protocol/08-gates.md).

Una operación de una sola dirección **no se ejecuta** sin: anuncio concreto, declaración de lo que se pierde, **prueba de recuperabilidad** y confirmación explícita del usuario. Aquí queda el rastro.

## Campos obligatorios

| Campo | Contenido |
|---|---|
| Fecha | `YYYY-MM-DD HH:mm` |
| Operación | El comando exacto, con entorno y destino |
| Alcance | Qué toca (base, ruta, entorno) y cuánto (filas, archivos) |
| Irreversible porque | Por qué no hay vuelta atrás |
| **Recuperabilidad comprobada** | **El comando o hecho concreto que demuestra que se puede restaurar** (p. ej. `git merge-base --is-ancestor <commit> origin/main` → sí). O `no recuperable` + por qué se acepta aun así |
| Confirmado por | Quién lo autorizó explícitamente |
| Resultado | `OK` / `FAIL` + evidencia (salida, conteo, captura) |

> Entradas anteriores al 2026-10-14 pueden traer "Recuperabilidad comprobada: —" si se registraron antes de que el campo fuera obligatorio. **No se reescriben**: la bitácora es historia.

---

## <YYYY-MM-DD HH:mm> — <título de la operación>

- **Operación:** `<comando exacto>`
- **Alcance:** <entorno / base / ruta; cuánto>
- **Irreversible porque:** <...>
- **Recuperabilidad comprobada:** <comando o hecho que lo demuestra, y su resultado>
- **Confirmado por:** <usuario>
- **Resultado:** <OK|FAIL> — <evidencia>

---

## Catálogo de operaciones de una sola dirección de este proyecto

Las del catálogo por defecto de [`protocol/08-gates.md`](./protocol/08-gates.md) que **aplican aquí**, más las propias. Ninguna de estas se ejecuta sin anuncio, pérdida declarada, prueba de recuperabilidad y confirmación explícita.

| Operación | Por qué es irreversible |
|---|---|
| `DROP DATABASE guacamole_db` · borrar los datos de PostgreSQL | Se pierden usuarios, conexiones, permisos e historial. Las conexiones se pueden recrear; el historial no |
| Recrear o borrar una conexión en Guacamole | Cambia el `connection_id`: los deep links del panel (`#/client/<TOKEN>`) dejan de resolver, y el token no es estable |
| Reiniciar `guacd` o Tomcat con sesiones abiertas | Quien esté trabajando pierde la sesión en curso, sin aviso |
| `git push --force` sobre la rama compartida | Rompe el trabajo de otros |
| Restaurar un dump sobre la base de Guacamole (`psql < dump.sql`) | Pisa los datos existentes |

> No aplica todavía nada de esto: no hay stack desplegado (ver [`CHECKLIST.md`](./CHECKLIST.md)). El catálogo se deja escrito antes de la primera operación destructiva, no después.

---

## Notas

- Si el gate queda **pendiente** (sesión sin humano), se anota aquí como pendiente y **no se ejecuta**.
- Un gate pendiente bloqueado más de lo razonable es un bloqueo de proyecto: súbelo a [`CURRENT.md`](./CURRENT.md) §Blockers.

## Relacionados

- Protocolo: [`protocol/08-gates.md`](./protocol/08-gates.md) · Estado: [`CURRENT.md`](./CURRENT.md)
- Validación previa: [`protocol/06-validation.md`](./protocol/06-validation.md) · Deuda: [`DEBT.md`](./DEBT.md)
