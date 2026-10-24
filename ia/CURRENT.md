# Current State

> **≤ 60 líneas. Solo el ahora.** Si este archivo empieza a narrar features completadas, está mal: eso va a [`CHANGELOG.md`](./CHANGELOG.md) y a la spec. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md).

## Objective

Acceso a las VMs Windows de VMware desde el navegador con Apache Guacamole: un solo punto de entrada, sin agentes en los guests. Fase actual: F-001 en ejecución.

## Current Task

**F-003** · T03/T05 — página de grabaciones y acotamiento del RDP. Auditoría ISO 27001 el **lunes 2026-10-27**.

## Status

`in_progress` — **F-001**: T08 `partial` (falta probar el escritorio y el portapapeles) y T09 `partial` (falta AC12, el reinicio). **F-003**: T01–T04 `done`, T05 `partial` (falta ejecutar el firewall en cada equipo). **F-002** `completed`.

## Last Completed

**Grabación de sesiones** con retención de 7 días, **colector de eventos con alertas por correo** (fuerza bruta y acceso fuera de horario) y **página de grabaciones** con Basic Auth en `/grabaciones/`. Documentos de auditoría e inventario de red en `ia/research/`.

## Next

1. **F-003 T05:** ejecutar `ops/windows/rdp-firewall.ps1` en cada equipo Windows (cierra la brecha B3).
2. **F-001 T08:** probar el escritorio y el portapapeles de las dos conexiones (AC7/AC8).
3. **AC12:** reiniciar `server01` en una ventana acordada (gate) y comprobar que todo vuelve solo.
4. **Revisión post-implementación** de F-001 y cierre de F-003 (ronda 3 del review).

## Blockers

- **`server01` sin VLAN**: el acotamiento del RDP es por equipo; depende de ejecutar el script en cada máquina.
- **Ventana para reiniciar `server01`**: bloquea AC12.
- **Reserva de DHCP de `server01`** (ítem 7 del CHECKLIST): no bloquea, pero el vhost y el certificado interno se romperían con un cambio de IP.

## Active Spec

[`specs/seguridad/F-003/F-003.spec.md`](./specs/seguridad/F-003/F-003.spec.md) — F-003, riesgo alto, `in_progress`

## Active Plan

[`plans/F-003/PLAN.md`](./plans/F-003/PLAN.md) — T01–T04 cerradas, T05 parcial

## Entorno

- Host: `server01` (`192.168.18.70`), Ubuntu 24.04.4, 1 vCPU, 4.6 GiB disponibles. Convive con Supabase, n8n, Chatwoot y Evolution API (Docker).
- Harness: `node ia/tools/check-harness.mjs --report` · pruebas: `node ia/tools/run-tests.mjs` (sin comandos declarados: los añade T09).

## Al retomar

- **El proxy es Apache, no nginx** ([DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md) §Enmienda). nginx no está instalado.
- **Tomcat 9 va del tarball** en `/opt/tomcat9` con unidad `guacamole-tomcat` (no hay `tomcat9` en apt).
- **No se para, reinicia ni reconfigura ningún servicio existente del host.** Un vhost mal escrito en Apache tumba todos los sitios.
- **Un solo gate pendiente**: reiniciar `server01` (AC12). El de borrar respaldos se canceló.

## Relacionados

- Router: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) · Memoria: [`MEMORY.md`](./MEMORY.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
