---
Feature: F-001
Task: T04
Status: pending
Depends: T02
---

# T04 — PostgreSQL dedicado, base y esquema

## Objetivo

Dejar de faltar el **almacén de Guacamole**: un clúster de PostgreSQL en el 5434 (no en el 5432, que es de Supabase), con la base, el usuario y el esquema de la versión que se instala.

## Requerimientos

- R5 · **AC3** (cierra aquí)
- R3 · **aporta evidencia** a AC2 (dueño: T05)

## Archivos previstos

- `ops/20-postgresql.sh` — aprovisionamiento idempotente.

## Validación

```bash
ssh humberto@192.168.18.70 'pg_lsclusters; systemctl is-active postgresql; ss -ltnp | grep 5434'
ssh humberto@192.168.18.70 'ss -ltn | grep 5432'   # de Supabase: no debe haber cambiado
ssh humberto@192.168.18.70 'PGPASSWORD=... psql -h 127.0.0.1 -p 5434 -U guacamole_user -d guacamole_db -c "\dt"'
```

Cierra cuando `\dt` lista las tablas `guacamole_*`, el clúster del 5434 está en línea y nada del 5432 cambió.

## Trazabilidad

```
# F-001 T04
```

## Notas

- **El clúster se crea directamente en el 5434, antes del primer arranque**: `pg_createcluster 16 guacamole --port 5434` (o se fija el puerto antes de dejar que `16/main` arranque). Si se deja que el paquete lo cree en el 5432, el primer arranque falla porque Supabase ya tiene ese puerto.
- **No se usa el MySQL del host** (3306) ni las bases de Supabase: se acoplaría Guacamole a los sistemas ARIES ([DEC-0026](../../decisions/DEC-0026-arquitectura-despliegue-server01.md)).
- El **esquema** viaja dentro de `guacamole-auth-jdbc-1.6.0.tar.gz`, en `postgresql/schema/`, junto con la extensión `guacamole-auth-jdbc-postgresql-1.6.0.jar`. Se ejecuta en orden (`schema/*.sql`) y se anota el archivo exacto.
- **El driver JDBC (`postgresql-42.x.jar`) NO viene en ese tarball.** Lo baja T05 de `jdbc.postgresql.org` o del paquete `libpostgresql-jdbc-java`. Sin él, el arranque es limpio y no hay login.
- La contraseña se genera en el host y **no se versiona**: se guarda fuera del repo (dueño y permisos `600`).
- Se fija `listen_addresses = '127.0.0.1'` y `port = 5434` en el clúster nuevo.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Arquitectura: [`../../decisions/DEC-0026-arquitectura-despliegue-server01.md`](../../decisions/DEC-0026-arquitectura-despliegue-server01.md) · Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md)
