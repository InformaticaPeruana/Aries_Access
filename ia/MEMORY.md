# MEMORY — memoria diferencial

Conocimiento **reutilizable**: lo que un agente nuevo necesita saber para no volver a descubrirlo. No es historial y no es un resumen de sesiones. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md) y [`protocol/10-memory-tokens.md`](./protocol/10-memory-tokens.md).

**Prueba de admisión:** si un dato caduca en dos semanas, no va aquí. Si es estable y costoso de redescubrir, sí.

## Qué se construye

Aries_Access da acceso a las **VMs Windows de VMware desde el navegador** con Apache Guacamole: un solo punto de entrada, sin instalar agentes (AnyDesk/RustDesk) en los guests. Uso personal/interno de AriesDev.

## Cómo funciona (lo esencial)

Nada está implementado todavía (adopción 2026-10-21). El flujo **previsto** es:

```
navegador ──HTTPS──> Apache del host (server01) ──> Tomcat (webapp Guacamole) ──guacd──> RDP del guest
```

Y el despliegue **no vive solo**: `server01` ya sirve Supabase, n8n y Chatwoot.

Cuatro cosas que hay que entender y que no se deducen del código:

1. **Guacamole no habla con VMware.** Se conecta al Windows de dentro de la VM por RDP (o VNC), como si fuera un PC físico. No existe soporte de VMRC ni SPICE, ni botón de encendido: la VM tiene que estar encendida y con red.
2. **`guacd` es el proxy de protocolos** (RDP/VNC/SSH) y la webapp es solo el cliente HTML5 que dibuja en `<canvas>` y transporta por WebSocket. Son dos procesos con versiones que deben coincidir.
3. **El despliegue es nativo, sin Docker** ([DEC-0025](./decisions/DEC-0025-despliegue-nativo-sin-docker.md)): `guacd` + **Tomcat 9** + PostgreSQL, con `GUACAMOLE_HOME=/etc/guacamole` y las extensiones en `extensions/`. **No** Tomcat 10+: Guacamole 1.6.0 es `javax.servlet` y Tomcat 10+ es `jakarta.servlet`.
4. **El portapapeles automático necesita contexto seguro.** Sin HTTPS (`localhost` aparte) `navigator.clipboard` no existe y el copiar/pegar falla **sin mensaje de error**. El TLS no es solo seguridad: es requisito funcional.

## Convenciones

Por definir con el primer código. Cuando exista F-001 se escriben aquí las de verdad y no antes ([DEC-0001](./decisions/DEC-0001-metodologia-3-documentos.md)).

## Glosario (términos que no se traducen)

Técnicos, en inglés; la frase que los contiene, en castellano ([DEC-0010](./decisions/DEC-0010-idioma-castellano.md)).

| Término | Cómo se usa |
|---|---|
| **navegador headless** | `headless` junto y en minúscula. El opuesto es **modo visible** (headed). No se traduce "sin cabeza" |
| **CDP** | Chrome DevTools Protocol. Sigla, no se traduce |
| **motor de QA** | `playwright` \| `cdp` \| `gstack`. Resuelve [`../qa/driver.mjs`](./qa/README.md) (ver [DEC-0015](./decisions/DEC-0015-motores-qa.md)) |
| **artifact / artefacto** | el archivo que produce una prueba (captura, respuesta HTTP, log) |
| **guacd** | el proxy nativo de Guacamole. Minúsculas, una palabra; no se traduce ni se escribe `guacD` |
| **guac-manifest.json** | manifiesto en la raíz del `.jar` de una extensión de Guacamole (branding, TOTP, SSO) |
| **NLA** | Network Level Authentication de RDP. Sigla |
| **Bridged / NAT / Host-only** | los tres modos de red de VMware. Aquí se nombran en inglés; Host-only no sirve porque solo alcanza al host |
| commit · endpoint · deploy · driver · ledger | se quedan en inglés |

## Restricciones

- **Sin Docker** ([DEC-0025](./decisions/DEC-0025-despliegue-nativo-sin-docker.md)): nada de `docker-compose.yml` como producto.
- **Nada sin spec aprobada.** Regla suprema del harness.
- **Sin secretos en el repo:** contraseñas de PostgreSQL, de `guacadmin` y de los guests no se versionan.
- **`guacd` no se publica**: escucha solo en la red interna o en localhost, nunca expuesto.
- **`expose` de Apache/Tomcat:** Guacamole detrás de un reverse proxy exige **reenviar el WebSocket** (en Apache: `mod_proxy_wstunnel` más una `RewriteRule` con `%{HTTP:Upgrade} =websocket`) y `ProxyPreserveHost On`. Sin eso el canvas se congela. `proxy_buffering off` es de nginx y aquí **no aplica**.

## Trampas conocidas

Cosas que parecen correctas y no lo son. Este es el bloque de mayor valor: cada entrada ahorra una sesión entera.

- **Buscar texto con acentos o eñes desde Windows.** `Select-String` y `Get-Content` leen con la codificación de la consola: buscar un nombre con eñe devolvió **0 coincidencias cuando había 26**. No es que no exista: es que la herramienta lee mal. Para buscar o editar en este repositorio, usa Node (`fs.readFileSync(ruta, "utf8")`) o `-Encoding UTF8` explícito. Y **nunca** hagas un round-trip con `Set-Content` sin `-Encoding UTF8`: escribe ANSI y corrompe el archivo entero.
- **Nombres de archivo y código: ASCII.** La prosa lleva sus acentos, los identificadores no ([DEC-0021](./decisions/DEC-0021-ascii-en-nombres-y-codigo.md)). Un nombre con diacríticos puede verse como un archivo distinto en otra plataforma.
- **Comparar contra un carácter literal.** Si un chequeo compara el contenido de un documento contra `'—'` o cualquier símbolo concreto, se rompe el día que alguien escriba `-` o `–`. Normaliza en vez de comparar: ver `estaVacio()` en [`tools/check-harness.mjs`](./tools/check-harness.mjs).
- **`\b` después de un símbolo no coincide nunca.** Entre `✗` y un espacio no hay frontera de palabra. Si un patrón busca símbolos, usa un lookahead de separador.
- **`guacd` y la webapp con versiones distintas.** Si no coinciden, la conexión falla con errores de protocolo o "Connection refused". Se despliegan y se actualizan **juntos**.
- **VNC sin contraseña configurada.** Guacamole falla al conectar. El tope de 8 caracteres es del protocolo, no de Guacamole.
- **Windows Home no acepta RDP entrante** y **Windows cliente admite una sola sesión**: si alguien entra por RDP, expulsa al usuario local. Un INI con `RemoteDisplay.vnc.enabled` en el `.vmx` de VMware Workstation es una consola de emergencia **no documentada** por el fabricante: no se usa como base.
- **Ver el portapapeles "vacío" al pegar en la VM.** Suele ser el permiso del navegador o `rdpclip.exe` colgado en el guest, no Guacamole (`taskkill /f /im rdpclip.exe` y relanzarlo).
- **`install-hooks.mjs` dice "No encontre sh ni bash".** No es que falte Git: es que `sh` de Git for Windows vive en `C:\Program Files\Git\bin` y **no está en el PATH que ve Node**. Añádelo a la sesión (`$env:PATH = "C:\Program Files\Git\bin;$env:PATH"`) y vuelve a correrlo; git sí encuentra su `sh` solo, así que el commit sigue gateado aunque el instalador no pueda probar el mordisco.

## Comandos que importan

Los de este repositorio. Los del stack (`ops/10-guacd.sh` … `ops/60-conexion-rdp.sh`) los define F-001 y todavía no se ejecutaron.

| Qué | Comando |
|---|---|
| Comprobar el harness | `node ia/tools/check-harness.mjs --report` |
| Autoprueba del motor de navegador | `node ia/qa/selftest-cdp.mjs` |
| Activar el gate en un clon nuevo | `node ia/tools/install-hooks.mjs` |

## Integraciones y dependencias externas

- **Apache Guacamole 1.6.0** (`guacd` + webapp) · **Tomcat 9** (tarball) · **PostgreSQL 16** · el **Apache 2.4 del host** para TLS. Todavía ninguna instalada.
- **VMware** con las VMs Windows: el host de Guacamole solo necesita alcanzar la IP del guest; el hipervisor no se integra.
- **Hipervisor:** **ESXi/vCenter**. Las VMs son Pro/Enterprise/Server (RDP nativo) y la consola de rescate es la Web Console HTML5 del ESXi ([DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md)).
- **Host:** `server01` (`192.168.18.70`), Ubuntu 24.04.4 LTS — compartido con Supabase, n8n, Chatwoot y Evolution API.

## Relacionados

- Estado actual: [`CURRENT.md`](./CURRENT.md) · Estable: [`PROJECT.md`](./PROJECT.md)
- Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md) · Trampas por fallo: [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md)
