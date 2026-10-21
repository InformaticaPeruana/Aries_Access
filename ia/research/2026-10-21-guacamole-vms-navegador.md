# Research — Guacamole para acceder a las VMs de VMware desde el navegador

| | |
|---|---|
| **Fecha** | 2026-10-21 |
| **Proyecto** | Aries_Access |
| **Origen** | Conversación de investigación previa a la adopción del harness |
| **Estado** | Investigación. Nada implementado todavía. |

> Copia del original en [`conversaciones/2026-10-21-guacamole-vms-navegador.md`](../../conversaciones/2026-10-21-guacamole-vms-navegador.md).
> Lo que la conversación **cerró** quedó como decisión: [DEC-0024](../decisions/DEC-0024-adopcion-aries-access.md) y [DEC-0025](../decisions/DEC-0025-despliegue-nativo-sin-docker.md).
> Lo que **depende de datos que aún no tenemos** (edición de Windows, tipo de VMware, red, TLS) está en [`../CHECKLIST.md`](../CHECKLIST.md).

---

| | |
|---|---|
| **Fecha** | 2026-10-21 |
| **Proyecto** | Aries_Access |
| **Tema** | Apache Guacamole: implementación en Linux, VMs VMware/Windows, alternativas a RDP, personalización de la UI y portapapeles |
| **Objetivo del usuario** | Acceder a sus VMs desde un navegador, sin AnyDesk ni RustDesk (evitar consumo de memoria de sus clientes) |
| **Estado** | Conversación de investigación. No se implementó nada todavía. |

---

## Turno 1 — Configuración de Guacamole en Linux

### Usuario

> consulta, tu sabes como podemos configurar guacamole en linux? me gustaria poder usar mis vm desde un navegador asi no tengo que consumir anydesk ni memoria de rustdesk

### Asistente

Sí, Guacamole es exactamente la herramienta para eso: **cliente 100% HTML5**, no instalas nada en el equipo desde el que te conectas (solo navegador), y no hay daemon de escritorio remoto consumiendo RAM en tus VMs más allá del servidor RDP/VNC que ya tengas.

#### Cómo funciona (30 segundos)

```
Navegador ──HTTPS/WS──> guacamole (webapp Java) ──guacd──> VM (RDP/VNC/SSH)
```

- **guacd**: el proxy nativo que habla RDP/VNC/SSH/Telnet/Kubernetes y traduce a protocolo Guacamole.
- **guacamole (cliente)**: webapp Java (Tomcat) que renderiza en `<canvas>` vía WebSocket.
- **PostgreSQL/MySQL**: usuarios, conexiones, permisos, historial.

Ventaja frente a AnyDesk/RustDesk: un solo punto de entrada, sin instalar agentes, y control de acceso por usuario/conexión. Desventaja honesta: **no es para gaming ni video fluido** — la codificación es JPEG/PNG/WebP por regiones. Para administración, ofimática, terminales y servidores va perfecto; si necesitas 60 fps reales, RustDesk sigue siendo mejor.

#### Ruta recomendada: Docker Compose

Requisitos: cualquier Linux con Docker (Debian/Ubuntu LXC o VM pequeña basta: 2 vCPU, 2 GB RAM).

`docker-compose.yml`:

```yaml
services:
  guacd:
    image: guacamole/guacd:1.6.0
    container_name: guacd
    restart: unless-stopped
    volumes:
      - ./drive:/drive:rw        # zona de transferencia de archivos
      - ./record:/record:rw      # grabación de sesiones (opcional)
    networks: [guacnet]

  postgres:
    image: postgres:16-alpine
    container_name: guacdb
    restart: unless-stopped
    environment:
      POSTGRES_DB: guacamole_db
      POSTGRES_USER: guacamole_user
      POSTGRES_PASSWORD: CAMBIA_ESTO_DB
    volumes:
      - ./init:/docker-entrypoint-initdb.d:ro
      - pgdata:/var/lib/postgresql/data
    networks: [guacnet]

  guacamole:
    image: guacamole/guacamole:1.6.0
    container_name: guacamole
    restart: unless-stopped
    depends_on: [guacd, postgres]
    environment:
      GUACD_HOSTNAME: guacd
      POSTGRESQL_HOSTNAME: postgres
      POSTGRESQL_DATABASE: guacamole_db
      POSTGRESQL_USER: guacamole_user
      POSTGRESQL_PASSWORD: CAMBIA_ESTO_DB
      WEBAPP_CONTEXT: ROOT          # sirve en / en vez de /guacamole
    ports:
      - "127.0.0.1:8080:8080"       # solo local: el TLS lo pone el proxy
    networks: [guacnet]

networks:
  guacnet:

volumes:
  pgdata:
```

Genera el esquema de la base **antes** del primer arranque:

```bash
mkdir -p init drive record
docker run --rm guacamole/guacamole:1.6.0 \
  /opt/guacamole/bin/initdb.sh --postgresql > init/001-initdb.sql

docker compose up -d
docker compose logs -f guacamole     # espera "Server startup"
```

Entra en `http://IP:8080/` → usuario `guacadmin` / `guacadmin` → **cámbialo de inmediato**.

#### TLS con Caddy (lo más corto)

```caddyfile
guac.tudominio.com {
    reverse_proxy 127.0.0.1:8080
}
```

Caddy gestiona WebSockets y certificados solo. Con nginx sería:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_buffering off;        # crítico: si no, el canvas se congela
}
```

Alternativa sin dominio público: **Tailscale** en el host + `http://100.x.y.z:8080`, y no expones nada a Internet.

#### Conectar tus VMs

En *Settings → Connections → New connection*:

| VM | Protocolo | Notas |
|---|---|---|
| Windows | RDP | puerto 3389, activa NLA, usuario `DOMINIO\user` o `user` |
| Linux con GNOME 42+ | RDP | escritorio remoto nativo, sin xrdp |
| Linux genérico | VNC | TigerVNC/x11vnc; en Guacamole el campo *Password* es la del VNC |
| Servidores sin GUI | SSH | ideal para administrar sin escritorio |
| Consola de VM apagada | — | usa noVNC del hipervisor; Guacamole necesita la VM encendida y con red |

Ajustes que marcan la diferencia: **desactiva wallpaper, composición y efectos** en las *Display settings* de la conexión (baja el ancho de banda brutalmente), y usa `resize-method: display-update`.

#### Endurecer antes de exponerlo

1. Cambia `guacadmin` y crea un usuario por persona (no compartas cuentas).
2. Añade **TOTP** (`guacamole-auth-totp-1.6.0.jar` en `/etc/guacamole/extensions/` + reinicio).
3. Deja `guacd` sin `ports:` publicados — solo en la red interna, como arriba.
4. Límites por conexión: desactiva clipboard/file transfer si no los necesitas, y opcionalmente activa grabación de sesión.
5. Fail2ban o, mejor, no publiques el puerto: VPN/Tailscale/WireGuard.

#### Gotchas típicos

- **Versiones**: `guacamole` y `guacd` deben coincidir en versión (1.6.0 con 1.6.0). Si no, "Connection refused" o errores de protocolo raros.
- **`proxy_buffering off`**: sin esto el WebSocket se queda en negro o congelado.
- **RDP en Windows Home**: no acepta RDP entrante; necesitarías VNC.
- **VNC sin contraseña**: Guacamole falla al conectar si el server VNC no tiene password configurada.
- **RAM**: el contenedor Java pide ~700 MB–1 GB. Si vas justo, súbele el límite al LXC.
- **Instalación nativa** (sin Docker): `guacd` se compila, el `.war` va a Tomcat 10+, y `/etc/guacamole` como `GUACAMOLE_HOME`. Funciona, pero es más frágil que el compose y no te lo recomiendo salvo que no puedas usar Docker.

---

## Turno 2 — Contexto real: VMware + guests Windows

### Usuario

> es en vmware, son windows

### Asistente

Perfecto, pero hay un detalle conceptual importante que cambia el diseño:

#### Guacamole no habla con VMware

No existe protocolo "VMware console" en Guacamole (no soporta VMRC ni SPICE). Guacamole se conecta **al Windows de dentro de la VM por RDP**, igual que si fuera un PC físico. VMware solo importa para dos cosas:

1. **Red**: que el host Linux donde corre Guacamole llegue a la IP del guest.
2. **Encendido**: Guacamole no puede arrancar una VM apagada (no hay botón de power).

La buena noticia: RDP ya viene en Windows, así que **cero agentes y cero RAM extra** en el guest. Justo lo que buscabas.

#### 1. Habilitar RDP en los guests

En cada VM Windows, PowerShell como admin:

```powershell
Set-ItemProperty 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
Add-LocalGroupMember -Group "Remote Desktop Users" -Member "tuusuario"
```

> Si el SO está en español, el grupo es `Usuarios de escritorio remoto` y la regla `Escritorio remoto`.

Y dale **IP fija** (o reserva DHCP) — Guacamole apunta a IP, no a nombre de VM de VMware:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Select IPAddress, InterfaceAlias
```

##### Ojo con la edición de Windows

| Edición | RDP entrante | Alternativa |
|---|---|---|
| Pro / Enterprise / Server | ✅ nativo | nada más |
| **Home** | ❌ no soportado | VNC: TightVNC o UltraVNC como servicio |

Si tienes Home: instala TightVNC, ponle contraseña (máx. 8 caracteres, límite del protocolo VNC) y en Guacamole usa protocolo VNC. Evita RDP Wrapper: se rompe con los updates.

#### 2. Red de VMware (aquí se cae el 90% de los intentos)

| Modo de red del guest | ¿Guacamole lo alcanza? |
|---|---|
| **Bridged** | ✅ sí, desde cualquier equipo de la LAN — *recomendado* |
| **NAT (VMnet8)** | ⚠️ solo con port forwarding, y choca si tienes varias VMs (todas quieren 3389) |
| **Host-only (VMnet1)** | ❌ solo desde el host Windows |

Si tus VMs están en NAT y no quieres tocarlas, añade en `C:\ProgramData\VMware\vmnetnat.conf`:

```ini
[incomingtcp]
13389 = 192.168.x.101:3389    # VM Windows 1
23389 = 192.168.x.102:3389    # VM Windows 2
```

…y en Guacamole apuntas a la IP del host Windows con puerto 13389/23389. Funciona, pero es un lío a medida que creces: **pásalas a Bridged** si puedes.

#### 3. Dónde correr Guacamole

Lo más limpio en tu caso: **una VM Linux (Ubuntu Server) en el mismo VMware, en Bridged**, con 2 vCPU / 2 GB. Así Guacamole y los guests comparten la misma red virtual y no dependes de tu PC para nada más que tener VMware encendido.

El `docker-compose.yml` del turno anterior sirve tal cual (1.6.0), solo cambia la IP del binding si quieres publicarlo en la LAN.

#### 4. Campos exactos de la conexión RDP

*Settings → Connections → New connection*, pestaña **Parameters**:

| Campo | Valor |
|---|---|
| Protocol | `RDP` |
| Hostname | IP del guest (ej. `192.168.1.101`) |
| Port | `3389` |
| Username | `tuusuario` |
| Password | la del usuario |
| Domain | vacío (salvo dominio AD) |
| Security mode | `NLA` (si falla, prueba `Any`) |
| Ignore server certificate | ✅ (autofirmado) |

Pestaña **Display** — esto es lo que hace que vaya fluido:

| Campo | Valor |
|---|---|
| Color depth | `24-bit` |
| Resize method | `Display update (RDP)` |
| Enable wallpaper | ❌ |
| Enable desktop composition | ❌ |
| Enable font smoothing | ❌ |
| Enable full-window drag | ❌ |

Pestaña **Device redirection**:

| Campo | Valor |
|---|---|
| Enable drive | ✅ |
| Drive name | `Guacamole` |
| Create drive path | ✅ |
| Enable clipboard | ✅ (desactívalo si es entorno sensible) |
| Enable printing | ✅ si te hace falta imprimir |

Con "Enable drive" activo, en el Windows verás una unidad de red `\\tsclient\Guacamole` — así pasas archivos VM↔navegador sin nube ni USB.

#### 5. Encender las VMs (lo único que Guacamole no hace)

**VMware Workstation/Player**: al arrancar Windows, tarea programada con:

```powershell
& "C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe" -T ws start "C:\VMs\Win11\Win11.vmx" nogui
```

(`nogui` las arranca sin ventana). Luego Guacamole ya las ve por RDP.

**ESXi**: activa *Autostart* en cada VM (`Host → Manage → Autostart`) y listo. Pero si es ESXi, plantéate si no te conviene más su consola HTML5 para el power-on y Guacamole solo para el día a día.

#### 6. Detalles que te van a morder

- **Sesiones concurrentes**: Windows Pro/Home solo permite **una** sesión. Si alguien entra por RDP, expulsa al usuario local (y viceversa). Windows Server permite 2 administrativas sin CALs; más requiere licencias RDS. Con Guacamole esto es más visible porque da la sensación de "multiusuario".
- **`Ignore server certificate`**: sin esto, RDP con NLA y cert autofirmado da error de TLS.
- **Audio**: si lo activas, sube muchísimo el ancho de banda. Déjalo off salvo necesidad.
- **Teclado**: el layout español suele salir mal. Ajusta el layout en el cliente o instala el idioma correcto en el guest.
- **VMs clonadas**: cada clon hereda el mismo SID/nombre; si usas credenciales de dominio puede haber líos. Con cuentas locales no hay problema.

#### Plan mínimo para probar hoy

1. Una VM Windows → Bridged + RDP activo + IP fija.
2. Desde tu PC: `mstsc /v:192.168.1.101` para confirmar que RDP responde (si esto falla, Guacamole tampoco va).
3. Levanta el compose en una Ubuntu en Bridged.
4. Crea la conexión con la tabla de arriba.
5. Si va lento: baja a 16-bit, desactiva wallpaper/composición/audio.

---

## Turno 3 — ¿Se puede evitar RDP?

### Usuario

> dime tambien podria evitar usar rpd para poder tener acceso a mi escritorio? de que manera?

### Asistente

Sí, se puede — pero conviene separar dos preguntas que se mezclan: **cómo llego al escritorio sin RDP** y **por qué quieres evitarlo**. Porque RDP en Windows no consume RAM extra (el servicio `TermService` ya está corriendo, ~15 MB) y es más rápido y seguro que cualquier alternativa. Así que el motivo real manda:

| Si quieres evitar RDP porque… | Camino correcto |
|---|---|
| Tu Windows es **Home** (no acepta RDP) | VNC en el guest |
| Quieres **ver la misma sesión** que el monitor local, sin expulsar a nadie | VNC |
| Quieres **ver BIOS/arranque**, o la VM sin red | Consola del hipervisor |
| Te preocupa **exponer RDP** | No lo evites: RDP + NLA + red privada es más seguro que VNC |
| Quieres **no instalar nada** en el guest | Consola del hipervisor |

Hay tres caminos reales:

#### Camino A — VNC en el guest, y Guacamole habla VNC

Es el sustituto directo dentro de Guacamole. Se instala **TightVNC** (ligero, servicio de Windows) o UltraVNC en la VM:

```powershell
# tras instalar TightVNC como servicio, abre la GUI y pon contraseña (máx. 8 caracteres)
New-NetFirewallRule -DisplayName "VNC solo Guacamole" -Direction Inbound `
  -Protocol TCP -LocalPort 5900 -RemoteAddress 192.168.1.50 -Action Allow
```

Conexión en Guacamole:

| Campo | Valor |
|---|---|
| Protocol | `VNC` |
| Hostname | IP del guest |
| Port | `5900` |
| Password | la de 8 caracteres |
| Color depth | `16-bit` (24 si la red es buena) |
| Clipboard encoding | `CP1252` si el portapapeles sale con acentos raros |

**Lo bueno:** funciona en Windows Home, y muestra la **sesión de consola compartida** — si alguien está sentado en la VM, veis lo mismo; nadie es expulsado. Es el comportamiento tipo AnyDesk.

**Lo malo, y es bastante:**
- Sin audio, sin redirección de unidades, sin impresión. Adiós al `\\tsclient\Guacamole`.
- Portapapeles pobre o directamente roto según el servidor VNC.
- **Sin cifrar**: VNC manda la pantalla y la autenticación en claro. Solo aceptable en una VMnet privada y con la regla de firewall limitada a la IP de Guacamole.
- Peor compresión que RDP: más ancho de banda para la misma calidad, y el vídeo/scroll se nota tosco.
- Al hacer login en Windows verás la pantalla de bloqueo/secure desktop de forma irregular.

Úsalo si estás en Home o necesitas sesión espejo. Si no, RDP gana en todo.

#### Camino B — Consola del hipervisor (sin RDP y sin instalar nada)

Aquí Guacamole ni entra: usas el navegador contra VMware directamente.

- **ESXi / vCenter**: cada VM tiene su **Web Console (HTML5)**. Ya es el navegador, no instala nada, funciona con Windows Home, y **ves BIOS, arranque y pantalla azul** — cosas que ni RDP ni VNC te ofrecen si el OS no arranca. Contras: no hay multiusuario fino, el portapapeles es limitado, no hay transferencia de archivos, y necesitas credenciales de vSphere (poder total sobre el host, no solo sobre esa VM).
- **VMware Workstation**: no tiene consola HTML5. Existe un modo VNC **no documentado** del propio hipervisor, añadiendo al `.vmx` (con la VM apagada):

```ini
RemoteDisplay.vnc.enabled = "TRUE"
RemoteDisplay.vnc.port = "5901"
RemoteDisplay.vnc.password = "8chars"
```

  Con eso Guacamole se conecta por VNC al **puerto 5901** y obtiene la consola *de la VM*, no del Windows: funciona incluso antes de que arranque el sistema operativo. Aviso honesto: VMware no lo soporta oficialmente y según la versión puede no funcionar; pruébalo antes de confiar en él.

Si tu caso es Workstation y quieres algo estable, esto es un bonus, no la base.

#### Camino C — Agente ligero con cliente web propio (fuera de Guacamole)

Si lo que quieres es **no abrir RDP ni VNC en la red**, la alternativa es un agente que sale hacia fuera:

- **MeshCentral** (self-hosted): agente de ~20-40 MB, cliente 100% web con WebRTC, transferencia de archivos, terminal y escritorio. Muy por debajo de RustDesk y sin abrir puertos en los guests.
- **Chrome Remote Desktop**: cero infraestructura, pero depende de tu cuenta Google.
- **RustDesk con servidor propio y web client**: justo lo que querías evitar.

Esto sustituye a Guacamole, no se integra con él.

#### Lo que NO existe

- **SPICE o VMRC dentro de Guacamole**: no hay soporte, ni extensiones.
- **"RDP sin RDP"**: pasarelas tipo Myrtille son un gateway HTML5 *sobre* RDP; por debajo sigue siendo RDP.
- **Túnel SSH para VNC en Guacamole**: el cliente VNC de Guacamole no soporta jump host. Para eso necesitarías socat/autossh en la VM de Guacamole.

#### Recomendación para este escenario

1. **Si los Windows son Pro**: quédate en **RDP**. No ahorras memoria evitándolo y pierdes audio, unidades, portapapeles y velocidad. Ciérralo bien: NLA, firewall solo a la IP de Guacamole, y el host de Guacamole detrás de Tailscale.
2. **Si hay algún Home**: **VNC por guest** (Camino A), con firewall restringido.
3. **En ambos casos**: activa la **consola del hipervisor** como plan B para cuando el OS no arranca. Es el único que te salva de un BSOD.

Un combo que funciona muy bien: Guacamole con **RDP para el día a día** y **VNC del `.vmx` (Workstation) o Web Console (ESXi)** como segunda conexión "consola" para emergencias. Lo documentas como "conexión de rescate" y no dependes de RDP para el 100%.

---

## Turno 4 — Personalizar la interfaz de acceso

### Usuario

> ok otra pregunta, puedo modificar la interface de acceso de guacamole para que sea una version mas amigable para mi?

### Asistente

Sí. Guacamole está pensado para eso: la webapp es AngularJS + CSS plano, y **Apache soporta theming oficialmente mediante extensiones** — sin forkear el código ni tocar el `.war`. Hay tres niveles, y el recomendado es el primero combinado con el segundo.

#### Nivel 1 — Extensión de branding (oficial, sobrevive a updates)

Una extensión es un `.jar` con un `guac-manifest.json` en la raíz que puede declarar `css`, `html`, `js`, `translations` y `resources`. Se carga desde `GUACAMOLE_HOME/extensions/`.

Estructura:

```
mi-tema/
├── guac-manifest.json
├── css/tema.css
└── html/bienvenida.html
```

`guac-manifest.json`:

```json
{
    "guacamoleVersion" : "1.6.0",
    "name"             : "Tema personal",
    "namespace"        : "mi-tema",
    "css"  : [ "css/tema.css" ],
    "html" : [ "html/bienvenida.html" ]
}
```

`html/bienvenida.html` — los `<meta>` dicen *dónde* inyectar, con selector CSS:

```html
<meta name="after" content=".login-ui .login-dialog">

<div class="bienvenida">
    <p>Acceso a las VMs de producción. Uso interno.</p>
</div>
```

`css/tema.css` — selectores reales del ejemplo oficial de Apache:

```css
/* Logo propio en el login */
.login-ui .login-dialog .logo {
    width: 8em;
    height: 4em;
    background-size: 8em 4em;
    background-image: url('app/ext/mi-tema/logo.png');
}

/* Cabecera oscura */
.header {
    background: #0f172a;
    color: #e2e8f0;
    border-bottom: 1px solid #1e293b;
}

/* Botones más "modernos" */
input[type="submit"], button, a.button {
    border-radius: 8px;
    font-weight: 600;
}

/* Aviso del login */
.login-ui .login-dialog .bienvenida {
    font-size: 0.8em;
    opacity: 0.8;
}
```

Empaqueta y monta:

```bash
cd mi-tema && zip -r ../mi-tema.jar . && cd ..
```

En el `docker-compose.yml`:

```yaml
    volumes:
      - ./extensions:/etc/guacamole/extensions:ro
```

```bash
docker compose restart guacamole
docker compose logs guacamole | grep -i extension
```

Detalles que importan:
- El `guac-manifest.json` tiene que estar **en la raíz** del jar, no dentro de una carpeta (por eso `zip -r ... .` desde dentro).
- `guacamoleVersion` debe coincidir con tu versión. Para theming puro puedes poner `"*"` (los propios docs lo permiten, pero saltas el chequeo de compatibilidad).
- Los recursos quedan en `app/ext/mi-tema/...` — así referencias imágenes/fuentes desde el CSS.
- Si varios temas se pisan, `extension-priority` en `guacamole.properties` decide el orden.
- Tras cambios: `Ctrl+F5`, el CSS se cachea duro.

Con `translations/es.json` puedes incluso **renombrar la interfaz** ("Connections" → "Mis VMs") sobrescribiendo claves del idioma existente. Copia el `es.json` original del `.war` y cambia solo las cadenas que te interesen.

#### Nivel 2 — Tu propio panel como puerta de entrada (lo que de verdad se siente amigable)

El login + lista de conexiones de Guacamole es feo y técnico. La solución más limpia: **una landing propia con tarjetas grandes**, y Guacamole solo como motor detrás. El router de Guacamole acepta enlaces directos a una conexión:

```
https://guac.tudominio.com/guacamole/#/client/<TOKEN>
```

donde el token es base64 de `id + "\0c\0"` (la `c` es de connection; sin data source para JDBC). Saca los IDs de la BD:

```sql
SELECT connection_id, connection_name FROM guacamole_connection;
```

Y en JS:

```js
const token = btoa(`${id}\0c\0`);
location.href = `/guacamole/#/client/${token}`;
```

Panel mínimo:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Mis VMs</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0;
           display:flex; flex-wrap:wrap; gap:1rem; padding:3rem; }
    a.card { background:#1e293b; border-radius:12px; padding:1.5rem 2rem;
             color:inherit; text-decoration:none; min-width:180px;
             border:1px solid #334155; }
    a.card:hover { background:#334155; }
    h2 { margin:0 0 .25rem; font-size:1.1rem; }
    small { opacity:.6; }
  </style>
</head>
<body>
  <a class="card" href="#" data-id="1"><h2>Windows 11 · Desarrollo</h2><small>RDP</small></a>
  <a class="card" href="#" data-id="2"><h2>Windows Server · Build</h2><small>RDP</small></a>

  <script>
    document.querySelectorAll('a.card').forEach(a => {
      a.href = '/guacamole/#/client/' + btoa(`${a.dataset.id}\x00c\x00`);
    });
  </script>
</body>
</html>
```

Y en Caddy:

```caddyfile
guac.tudominio.com {
    root * /var/www/panel
    file_server
    handle /guacamole/* {
        reverse_proxy 127.0.0.1:8080
    }
}
```

Ojo: vuelve a dejar `WEBAPP_CONTEXT: guacamole` (sin `ROOT`) para que no choque con el panel.

Dos matices honestos:
- **Si el usuario no tiene sesión**, tras el login Guacamole puede dejarte en la pantalla principal y perder el destino. Con SSO (OIDC/SAML, extensión `guacamole-auth-sso`, o `guacamole-auth-header` con Authentik/Keycloak/Authelia) el enlace entra directo y el panel se siente como una app.
- El token depende de IDs internos de la BD. Si recreas conexiones, cambian: genera el panel desde un JSON o desde la propia BD, no a mano.

#### Nivel 3 — Lo que NO se recomienda

- **Forkear `guacamole-client` y recompilar el `.war`**: control total, pero cada actualización es un merge manual de AngularJS 1.x. Solo si necesitas cambiar comportamiento, no estética.
- **`sub_filter` de nginx** inyectando CSS: 5 minutos y funciona (con `proxy_set_header Accept-Encoding "";` o no toca el HTML comprimido), pero se rompe en silencio cuando cambia el markup. Emergencia, no arquitectura.

#### Extras de "amigabilidad" sin escribir código

| Necesidad | Cómo |
|---|---|
| Agrupar por proyecto | *Connection groups* (carpetas) en vez de lista plana |
| Que cada uno vea solo lo suyo | Permisos por usuario/conexión |
| No enseñar el panel de admin | Usuario normal sin `ADMINISTER`; `guacadmin` con password larga + TOTP |
| Compartir pantalla puntual | Menú *Share* → enlace temporal, sin configuración |
| Tema oscuro ya hecho | Repos comunitarios de temas y el script **AVAGATO** (TOTP + oscuro + redirección a `/guacamole`); verificar que soporten 1.6.0 |
| Sin pantalla de login | SSO (OIDC/SAML/header) |

---

## Turno 5 — Portapapeles entre el PC y la VM

### Usuario

> no por ahora, solo estoy investigando y preguntando, otra cosa mas, es posible compartir el clipboard de mi escritorio pc con la vm en guacamole? muchas veces debo usar mi gmail directamente en mi laptop para copiar y pegar o en caso use alguna interface de programacion me gustaria copiar y pegar instrucciones en ambos sentidos

### Asistente

Sí, y es de las cosas que mejor funcionan en Guacamole — pero con dos límites que conviene tener claros desde el principio: **solo texto** y **necesita HTTPS**.

#### Qué soporta cada protocolo

| Protocolo | Portapapeles |
|---|---|
| **RDP** (tu caso, Windows) | ✅ Bidireccional y fiable |
| SSH | ✅ Funciona en la terminal |
| VNC | ⚠️ Muy irregular, depende del servidor VNC |

Para tus VMs Windows, RDP es el camino bueno.

#### Cómo se activa

En *Settings → Connections → tu conexión*, hay dos casillas independientes por sentido:

| Casilla | Qué controla | Parámetro |
|---|---|---|
| Disable copying from remote desktop | VM → tu PC | `disable-copy` |
| Disable pasting to remote desktop | Tu PC → VM | `disable-paste` |

Ambas **desactivadas** por defecto. Si no ves las casillas, es que tu conexión es VNC.

#### Cómo se usa en el día a día

- **Dentro de la VM**: `Ctrl+C` normal. Lo copiado se sincroniza a tu portapapeles local automáticamente (si el navegador lo permite).
- **Desde tu laptop**: `Ctrl+C` en Gmail o en el IDE, luego `Ctrl+V` con el foco en la sesión de Guacamole. Se pega en el Windows remoto.
- **Plan B siempre disponible**: `Ctrl+Alt+Shift` abre el menú lateral → pestaña **Clipboard** → un textarea donde pegas o copias manualmente. Esto funciona aunque el navegador bloquee el acceso automático, y es la vía que nunca falla.
- **Solo una dirección**: puedes desactivar `disable-paste` para que tus usuarios puedan pegar hacia la VM pero no sacar nada de ella. Útil en entornos sensibles.

#### El gotcha que se come el 80% de los casos: HTTPS

Guacamole usa la API `navigator.clipboard`, que **solo existe en contexto seguro**. Si sirves Guacamole por `http://` (salvo `localhost`), el portapapeles automático simplemente no funciona, sin mensaje de error claro.

Es decir: el paso del reverse proxy con TLS no es solo por seguridad, es **requisito funcional** para este caso de uso.

Además, Chrome/Edge piden permiso la primera vez ("Permitir ver el portapapeles"). En Firefox el pegado automático es más restrictivo: casi siempre tendrás que usar el menú Clipboard.

#### Límites reales

- **Solo texto plano.** No imágenes, no archivos, no HTML con formato. Si copias una captura de pantalla en tu laptop, no llega.
- **Textos largos**: funcionan, pero Guacamole trocea el contenido; pegar 200 KB de código se siente lento. Para bloques grandes, mejor archivo.
- **Formato**: pegar código con tabulaciones o acentos suele ir bien; a veces el salto de línea Windows/Linux se nota en la terminal.

Para lo que no es texto, la vía es la **redirección de unidades**: activas *Enable drive* con nombre `Guacamole`, y en el Windows aparece `\\tsclient\Guacamole`. Arrastras la imagen o el `.zip` ahí desde el navegador y lo abres en la VM. Es el complemento natural al portapapeles.

#### Seguridad: no es un detalle menor

El portapapeles es una **vía de exfiltración de datos**. En un bastión serio:

- Guacamole **no puede filtrar** el contenido: no hay regex, ni límite de tamaño, ni bloqueo por tipo.
- Si la VM tiene acceso a datos sensibles, desactiva `disable-copy` (VM→PC) y deja solo el pegado de entrada.
- Un usuario malicioso o una VM comprometida puede volcar texto silenciosamente.

Para VMs personales, déjalo abierto sin problema.

#### Si algo no funciona

1. **¿Estás en HTTPS?** Si no, ahí está el problema.
2. **¿Revisaste `disable-paste` / `disable-copy`?** Son por conexión, no globales.
3. **¿Solo falla en un Windows concreto?** El clásico: el proceso `rdpclip.exe` del guest se cuelga. En la VM:
   ```powershell
   taskkill /f /im rdpclip.exe
   rdpclip.exe
   ```
   Y vuelve a probar. Esto pasa sobre todo tras reconexiones.
4. **¿Portapapeles vacío al pegar en la VM?** Prueba el textarea del menú (`Ctrl+Alt+Shift`): si ahí funciona, el problema es el permiso del navegador.
5. **Firefox**: usa el menú Clipboard; el automático es poco fiable.

#### Flujo recomendado para el caso de uso planteado

1. Guacamole por **HTTPS** (Caddy es 3 líneas).
2. Conexión **RDP** con clipboard habilitado en ambos sentidos.
3. Pegas código desde el IDE → `Ctrl+V` en la sesión → listo.
4. Copias algo en la VM → aparece en tu portapapeles → `Ctrl+V` en Gmail.
5. Lo que no sea texto → *Enable drive* y `\\tsclient\Guacamole`.
6. Si el navegador te bloquea, `Ctrl+Alt+Shift` → Clipboard.

Con eso tienes el mismo flujo que con AnyDesk/RustDesk, sin agente en la VM. La única diferencia real es que si copias una imagen tendrás que pasarla como archivo.

---

## Resumen de conclusiones

### Arquitectura decidida

```
Laptop (navegador) ──HTTPS──> Caddy ──> Guacamole 1.6.0 (Docker) ──guacd──RDP──> VMs Windows (VMware)
```

- Guacamole corre en una VM Ubuntu Server en el mismo VMware, en **red Bridged**, 2 vCPU / 2 GB.
- Stack: `guacamole/guacamole:1.6.0` + `guacamole/guacd:1.6.0` + `postgres:16-alpine`.
- TLS con Caddy (obligatorio, no opcional: sin HTTPS no hay portapapeles automático).
- `guacd` sin puertos publicados; Guacamole bindeado a `127.0.0.1:8080`.

### Decisiones clave

| Tema | Decisión |
|---|---|
| Protocolo | **RDP** (VNC solo si algún guest es Windows Home) |
| Red de las VMs | **Bridged** (NAT solo con port forwarding, host-only no sirve) |
| Boot de VMs | `vmrun start ... nogui` (Workstation) o Autostart (ESXi) — Guacamole no enciende VMs |
| Plan B / rescate | Consola HTML5 de ESXi o VNC del `.vmx` en Workstation |
| Personalización | Extensión de branding (`.jar` con `guac-manifest.json`) + panel propio con deep links |
| Portapapeles | RDP bidireccional, solo texto, requiere HTTPS |

### Pendientes / a confirmar

- ¿VMware **Workstation/Player** o **ESXi/vCenter**? Cambia el plan de red y el encendido de VMs.
- ¿Los Windows son **Pro** o hay algún **Home**?
- ¿Sesiones concurrentes necesarias? (Windows client solo permite una sesión).
- Definir si se expone por dominio público con TLS o solo por Tailscale/LAN.

### Referencias

- Manual Guacamole 1.6.0: <https://guacamole.apache.org/doc/gug/>
- Extensiones y theming: <https://guacamole.apache.org/doc/gug/guacamole-ext.html>
- Ejemplo oficial de branding: <https://github.com/apache/guacamole-client/tree/main/doc/guacamole-branding-example>
- Imágenes Docker: <https://hub.docker.com/u/guacamole>
