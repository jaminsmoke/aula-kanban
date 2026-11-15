# Aula Kanban

Cada instancia mantiene sus propios proyectos y datos en D1. La propiedad de alojamiento del Site se gestiona en Sites, no desde la aplicación. Las invitaciones de proyecto se aceptan dentro de la aplicación y vinculan al identificador de ChatGPT de la cuenta invitada.

## Clonar desde GitHub

El código fuente está en un repositorio público con licencia MIT: [jaminsmoke/aula-kanban](https://github.com/jaminsmoke/aula-kanban). Si trabajas con Aula Kanban desde un agente o desde otra máquina, clona desde GitHub en lugar de reconstruir la fuente a partir del Site (la reconstrucción desde una instancia publicada sale desactualizada):

```sh
git clone https://github.com/jaminsmoke/aula-kanban.git aula-kanban
cd aula-kanban
npm ci
```

Eso basta para desarrollar en local (`npm run dev`) y para comprobar en CI (lint, `tsc --noEmit`, tests y build, en push y pull request a `main`). En este repositorio, los commits se acumulan en local durante el roadmap y el push se hace al cerrarlo, al repositorio personal `jaminsmoke/aula-kanban` (`git push github main`). La publicación y la verificación en Sites corresponden siempre a Codex de OpenAI; un push a GitHub no despliega el Site.

Para publicar tu propia copia como Site, decide el `project_id` de `.openai/hosting.json` con el flujo aprendido (el fichero versionado lleva un valor de ejemplo; el real para una publicación se edita en tu copia) y sigue la publicación con Sites y `npm run release:prepare -- --published-version X.Y.Z`.

## Propiedad y checklist de remix

En un remix, el propietario es quien da la orden: el agente de ChatGPT publica la copia en la cuenta de la persona que le pide el cambio, y esa cuenta queda ligada a la instancia. La propiedad se inicializa con `OWNER_EMAIL`, que debe coincidir con el correo de la cuenta de ChatGPT del propietario. En el primer acceso de esa cuenta se guarda su identificador estable en `instance_owner`; a partir de ahí la propiedad se comprueba por identidad y el correo solo se actualiza como dato de contacto. Si la instancia aún no tiene propietario persistido, `OWNER_EMAIL` sigue actuando como bootstrap.

**Checklist para un remix:**

1. Pide la copia con el botón «Haz tu Site de Aula Kanban» y entrega el mensaje a tu agente de ChatGPT. El propietario es **quien da la orden**: el agente publica la copia en tu cuenta de ChatGPT. Alternativa sin Sites: clona directamente el repo público de GitHub (`git clone https://github.com/jaminsmoke/aula-kanban.git`) y publica esa revisión con el flujo que prefieras; el resto de la lista es igual.
2. La copia no hereda base de datos, proyectos, fichas, administradores ni variables de entorno. No importes datos de otra instancia: una copia nueva debe empezar vacía.
3. Antes de compartirla, comprueba que `OWNER_EMAIL` es el correo de esa misma cuenta de ChatGPT y vuelve a publicar.
4. Entra con esa cuenta: el primer acceso guarda la identidad estable del propietario. Comprueba que aparecen las acciones de propietario.
5. Crea el primer proyecto y añade administradores si hacen falta.
6. Si la copia no tiene propietario, corrige `OWNER_EMAIL` y vuelve a publicar antes de compartirla. No se espera que un tercero reclame la instancia.
7. Si quieres que la portada y la documentación se vean sin sesión, comparte el Site como público y sigue «Visibilidad del Site en Sites».

El propietario y los administradores pueden crear o eliminar proyectos y administrar la lista de administradores.

## Visibilidad del Site en Sites

La visibilidad del Site (privado o «cualquiera con el enlace») es un ajuste de la plataforma, no del repositorio: `.openai/hosting.json` solo declara los bindings (`d1`, `r2`) y el `project_id`. En un Site **privado**, Sites exige sesión a todo el mundo antes de llegar a la aplicación, aunque la ruta no llame a `requireChatGPTUser`. En un Site **público**, los visitantes anónimos llegan a las rutas que no importan ese helper: en esta instancia, la portada (`/`) y la documentación (`/documentacion`). El tablero, las API y el socket siguen exigiendo sesión en ambos casos.

**Cómo comprobar que el Site es público:**

1. Abre la URL del Site en una ventana privada, sin sesión de ChatGPT iniciada.
2. Si aparece la portada de Aula Kanban en `/` y la documentación en `/documentacion`, el Site es público y la parte anónima funciona.
3. Si antes de la aplicación aparece la pantalla de acceso de la plataforma, el Site sigue privado: cambia la compartición en Sites antes de esperar la portada en producción.

Sin navegador, esta petición solo confirma que la aplicación sirve la portada; no sustituye a revisar el ajuste de la plataforma:

```sh
curl -s https://<tu-site>/ | grep -o "Tablero colaborativo para el grupo de clase"
```

Si devuelve el texto, la aplicación responde con la portada a un visitante sin cabeceras de identidad. Si la plataforma exige login, la respuesta será su pantalla de acceso aunque el código sea correcto.

En desarrollo, `npm run dev` simula la sesión al visitar `/signin-with-chatgpt`, así que la portada anónima hay que probarla sin esa cookie (por ejemplo, en una ventana privada).

## Mi espacio y Aula Store

La cabecera organiza el trabajo en **Clase**, **Alumnos**, **Profesores** y **Documentación**; **Mi espacio** se abre desde el icono de aplicaciones y el engranaje abre los **ajustes generales**, con Cuenta, Apariencia, Tokens MCP, Administradores y Almacenamiento. Incluye Excalidraw, una pizarra colaborativa independiente de las pizarras de las tareas, Herramientas de aula, Programación por bloques y Diagramas. Las aplicaciones se instalan **por instancia**: el propietario y los administradores deciden desde Aula Store qué está disponible para todos los proyectos, y el estado se guarda en la tabla `instance_apps`. Desinstalarlas de Mi espacio no elimina las pizarras de las tareas ni sus datos.
Dentro de **Clase**, **Tareas** y **Calendario** comparten el mismo tablero: el calendario coloca cada tarea en su fecha de vencimiento, abre la tarea al pulsar su evento y solo se descarga al entrar en la sección.

La lista de aplicaciones integradas, candidatas y descartadas, con licencias y versiones comprobadas, está en [`docs/aplicaciones-nativas.md`](docs/aplicaciones-nativas.md). El índice de documentación y el flujo de roadmap, backlog y changelog están en [`docs/README.md`](docs/README.md).

## Plugin y herramientas

El **plugin de Aula Kanban para Sites** es la vía recomendada para ChatGPT y Codex: usa el endpoint `/mcp` y la identidad de tu sesión de Sites, así que no hay que copiar ningún token. Sites aplica los permisos de tu cuenta en cada proyecto y cada llamada queda auditada.

1. En ChatGPT o Codex, busca y conecta el plugin «Aula Kanban» creado por Sites.
2. Abre una conversación y pide un resumen de clase, o usa los prompts `resumen_de_clase`, `planificar_semana`, `alta_de_alumnado` e `instalar_apps_del_aula`.
3. Prueba `listar_proyectos` y `listar_tareas`: si responden, el plugin está conectado.

La lista siguiente se genera desde `lib/domain/mcp-catalogo.ts`; las dos puertas publican las mismas herramientas y cada descripción incluye un ejemplo de argumentos y su regla de rol.

<!-- inicio catálogo MCP: generado desde lib/domain/mcp-catalogo.ts -->
**50 herramientas · catálogo `0.21.0`:** 21 de lectura y 29 de escritura; 8 destructivas.

**Proyectos**

- **`listar_proyectos`** — Listar proyectos. La cuenta ve solo los proyectos en los que participa o administra.
- **`crear_proyecto`** — Crear proyecto. Solo el propietario o un administrador del sitio.
- **`eliminar_proyecto`** — Eliminar proyecto. Solo el propietario o un administrador del sitio; exige confirmación y el nombre exacto.

**Archivos**

- **`subir_archivo`** — Subir archivo. Cualquier miembro con acceso puede subir; las cuentas invitadas no escriben. Respeta los tipos y límites de la web (5 MB para imágenes y 10 MB para documentos).
- **`obtener_archivo`** — Obtener archivo. Cualquier miembro con acceso; devuelve solo metadatos y enlace, nunca el binario.

**Tareas**

- **`listar_tareas`** — Listar tareas. Cualquier miembro con acceso al proyecto; sin proyectoId, solo los proyectos visibles.
- **`obtener_tarea`** — Obtener tarea. Cualquier miembro con acceso al proyecto.
- **`crear_tarea`** — Crear tarea. Profesorado, administración y propietario; el alumnado solo puede asignársela a sí mismo o dejarla sin asignar; las cuentas invitadas no escriben.
- **`actualizar_tarea`** — Actualizar tarea. Quien puede editar tareas: profesorado, administración y propietario; el alumnado solo las suyas; las cuentas invitadas no escriben.
- **`mover_tarea`** — Mover tarea. Quien puede editar tareas: profesorado, administración y propietario; el alumnado solo las suyas; las cuentas invitadas no escriben.
- **`asignar_tarea`** — Asignar tarea. Profesorado, administración y propietario; el alumnado solo puede asignarse a sí mismo; las cuentas invitadas no escriben.
- **`desasignar_tarea`** — Desasignar tarea. Quien puede editar la tarea; el alumnado solo puede quitarse a sí mismo; las cuentas invitadas no escriben.
- **`reprogramar_tarea`** — Reprogramar tarea. Quien puede editar tareas: profesorado, administración y propietario; el alumnado solo las suyas; las cuentas invitadas no escriben.
- **`listar_calendario`** — Calendario del proyecto. Cualquier miembro con acceso al proyecto.
- **`eliminar_tarea`** — Eliminar tarea. Quien puede editar la tarea; el alumnado solo las suyas; las cuentas invitadas no escriben. Exige confirmación.

**Personas**

- **`listar_alumnos`** — Listar alumnado. Cualquier miembro con acceso al proyecto; el correo de la cuenta solo aparece si la web también lo mostraría.
- **`listar_profesores`** — Listar profesorado. Cualquier miembro con acceso al proyecto; el correo de la cuenta solo aparece si la web también lo mostraría.
- **`obtener_alumno`** — Obtener alumnado. Cualquier miembro con acceso al proyecto; el correo de la cuenta solo aparece si la web también lo mostraría.
- **`obtener_profesor`** — Obtener profesorado. Cualquier miembro con acceso al proyecto; el correo de la cuenta solo aparece si la web también lo mostraría.
- **`listar_miembros`** — Listar miembros. Profesorado, administración y propietario; el alumnado y las cuentas invitadas reciben 403. El profesorado solo ve alumnado y su propia ficha.
- **`invitar_miembro`** — Invitar miembro. El propietario y la administración invitan cualquier rol; el profesorado solo alumnado; cada persona puede invitarse a sí misma. No envía correo.
- **`retirar_miembro`** — Retirar miembro. El propietario y la administración retiran cualquier rol; el profesorado solo alumnado; cada persona puede retirarse a sí misma. Exige confirmación.
- **`crear_alumno`** — Crear alumnado. Profesorado, administración y propietario; el alumnado y las cuentas invitadas no crean fichas.
- **`crear_profesor`** — Crear profesorado. Solo administración y propietario.
- **`actualizar_alumno`** — Actualizar alumnado. Profesorado, administración y propietario editan cualquier ficha; el alumnado solo la suya; las cuentas invitadas no editan.
- **`actualizar_profesor`** — Actualizar profesorado. Administración y propietario editan cualquier ficha; el profesorado solo la suya; el alumnado y las cuentas invitadas no editan.
- **`eliminar_alumno`** — Eliminar alumnado. Profesorado, administración y propietario; el alumnado solo la suya; las cuentas invitadas no. Exige confirmación y el nombre exacto.
- **`eliminar_profesor`** — Eliminar profesorado. Administración y propietario cualquier ficha; el profesorado solo la suya; el alumnado y las cuentas invitadas no. Exige confirmación y el nombre exacto.

**Contexto**

- **`quien_soy`** — Quién soy. Cualquier cuenta autenticada.
- **`obtener_enlace`** — Obtener enlace. Cualquier miembro con acceso al proyecto.
- **`abrir_app`** — Abrir app. Cualquier miembro con acceso al proyecto; la app debe estar instalada.
- **`obtener_resumen_proyecto`** — Resumen del proyecto. Cualquier miembro con acceso al proyecto.

**Invitaciones**

- **`listar_invitaciones_pendientes`** — Invitaciones pendientes. La propia cuenta autenticada.
- **`aceptar_invitacion`** — Aceptar invitación. La propia cuenta autenticada; la invitación debe seguir pendiente y ser para ella.

**Aula Store**

- **`listar_apps`** — Listar apps. Cualquier cuenta autenticada; con proyectoId, además debe tener acceso al proyecto.
- **`obtener_app`** — Obtener app. Cualquier cuenta autenticada.
- **`instalar_app`** — Instalar app. Solo el propietario o un administrador del sitio.
- **`desinstalar_app`** — Desinstalar app. Solo el propietario o un administrador del sitio. Exige confirmación; los documentos guardados se conservan.

**Ventanas**

- **`listar_ventanas`** — Listar ventanas. La propia cuenta y sus pestañas conectadas; requiere acceso al proyecto.
- **`cerrar_app`** — Cerrar app. La propia cuenta y sus pestañas conectadas; requiere acceso al proyecto y la app instalada.
- **`minimizar_app`** — Minimizar app. La propia cuenta y sus pestañas conectadas; requiere acceso al proyecto y la app instalada.
- **`restaurar_app`** — Restaurar app. La propia cuenta y sus pestañas conectadas; requiere acceso al proyecto y la app instalada.
- **`ampliar_app`** — Ampliar app. La propia cuenta y sus pestañas conectadas; requiere acceso al proyecto y la app instalada.

**Administración**

- **`listar_administradores`** — Listar administradores. Solo el propietario o un administrador de la instancia.
- **`crear_administrador`** — Crear administrador. Solo el propietario o un administrador de la instancia.
- **`actualizar_administrador`** — Actualizar administrador. Solo el propietario o un administrador de la instancia; cambiar el correo retira el acceso hasta que se acepte.
- **`eliminar_administrador`** — Eliminar administrador. Solo el propietario o un administrador de la instancia; exige confirmación y el nombre o correo exacto.
- **`listar_tokens_mcp`** — Listar tokens MCP. La propia cuenta autenticada; nunca expone el secreto, el hash ni la sal.
- **`revocar_token_mcp`** — Revocar token MCP. La propia cuenta autenticada; exige confirmación y el token debe estar vigente. Si se revoca el token en uso, la siguiente llamada falla.
- **`listar_actividad_mcp`** — Listar actividad MCP. La cuenta ve solo sus filas; el propietario o un administrador ven toda la instancia. Solo metadatos, sin argumentos ni contenidos.

<!-- fin catálogo MCP -->

Las bajas destructivas piden confirmación; las fichas y los proyectos, además, el nombre exacto. Cada llamada queda en `mcp_audit_log`; el plugin limita a 120 peticiones por minuto y 30 de escritura por cuenta, y el token personal a 120 por minuto.

### Token personal (vía avanzada)

El servidor **MCP remoto y alojado en el propio Site** sigue disponible en `/api/mcp` (transporte HTTP Streamable web-standard, sin sesiones) para los clientes que no usan el plugin. La producción es remota: no se entrega ningún proceso local como producto; lo local es solo para probar.

- **Autenticación:** cada cuenta crea su propio token personal (`ak_mcp_…`) en **Ajustes > Tokens MCP**. El secreto se muestra una sola vez al crearlo y solo se guarda su hash (SHA-256 con sal) en la tabla `mcp_tokens`. Sin token o con un token revocado, el endpoint responde `401`. Cada token tiene un límite de 120 peticiones por minuto.
- **Permisos:** el token actúa con los permisos de tu rol en el proyecto: las cuentas invitadas solo pueden consultar, y un alumno solo puede crear o editar sus propias tareas (o reclamar una sin responsable), igual que en la web.
- **Herramientas:** la lista y sus permisos son la sección generada de arriba, idéntica en `/mcp` y `/api/mcp`; el contrato está en `lib/domain/mcp-catalogo.ts` y los manejadores en `lib/server/mcp/dominios/`. Las respuestas incluyen enlaces al tablero y a la sección de Calendario.

Instalación en un cliente MCP (sustituye la URL por la de tu Site y tu token):

```json
{
  "mcpServers": {
    "aula-kanban": {
      "url": "https://TU-SITE/api/mcp",
      "headers": { "Authorization": "Bearer TU-TOKEN" }
    }
  }
}
```

Los clientes modernos con soporte HTTP remoto (Cursor, VS Code con extensión MCP, Claude en web u otros) se conectan directamente a esa URL. Los clientes clásicos que solo hablan stdio (p. ej. Claude Desktop) necesitan un puente local que reenvíe la URL remota junto con la cabecera `Authorization`: hay puentes de terceros como `mcp-remote`, pero no se publica ninguno con este proyecto.

La documentación de instalación también está en la vista de usuario en `/documentacion` (sección «Servidor MCP») y en Ajustes > Tokens MCP. Revoca el token en el mismo panel en cuanto dejes de usarlo.

## Autorización OAuth experimental (clientes MCP externos)

Esta vía es independiente del plugin nativo y sigue en revisión de seguridad; no debe considerarse lista para producción.

Además de los tokens personales, el Site es el **servidor de autorización OAuth 2.1** para los clientes que no aceptan pegar un token a mano (clientes MCP remotos como Cursor, Claude o ChatGPT, y en su momento los GPT con Actions). Vive en el propio Site, con su base de datos D1: ni proveedores externos ni JWT. Las cuentas son las de siempre (la sesión SIWC del navegador); únicamente la página de consentimiento la usa, y mantiene la guarda de mismo origen.

- **Descubrimiento:** `/.well-known/oauth-authorization-server` (el MCP indica el suyo con `/.well-known/oauth-protected-resource/mcp` en el `401`, vía `resource_metadata`). El token está ligado a su recurso (`https://TU-SITE/api/mcp`), que se comprueba en cada llamada.
- **Registro dinámico de clientes (RFC 7591):** `POST /oauth/register` con `redirect_uris`, `scope` y `client_name`. Devuelve `client_id` y `client_secret` una sola vez; el secreto solo se guarda hasheado. La página de consentimiento se abre en `GET /oauth/authorize` (con `response_type=code`, `code_challenge` S256 obligatorio y `resource`); `POST /oauth/authorize/consent` aprueba o deniega.
- **Token y revocación:** `POST /oauth/token` (`authorization_code` con PKCE S256 de un solo uso, y `refresh_token` con rotación) y `POST /oauth/revoke` (RFC 7009). Los tokens de acceso duran 1 hora; el de refresco, 30 días, y rota en cada uso. Como el endpoint es `Authorization`-only (sin cookie), queda fuera de la guarda de mismo origen, igual que `/api/mcp`.
- **Alcances:** `mcp:read` permite las herramientas de lectura y `mcp:write` las de escritura, con las reglas del rol en el proyecto; para ambas se solicitan los dos. Una herramienta llamada sin su alcance devuelve `403` con `error="insufficient_scope"` y el alcance exigido. Los tokens personales (`ak_mcp_…`) siguen funcionando con la cuenta completa: **la OAuth es opcional por cliente**.

Valores de conexión (sustituye `TU-SITE` por el origen publicado de tu instancia):

```json
{
  "authorization_url": "https://TU-SITE/oauth/authorize",
  "token_url": "https://TU-SITE/oauth/token",
  "revocation_url": "https://TU-SITE/oauth/revoke",
  "resource": "https://TU-SITE/api/mcp",
  "scopes": "mcp:read mcp:write",
  "discovery": "https://TU-SITE/.well-known/oauth-authorization-server"
}
```

Para **ChatGPT Actions**, la entrada «GPT con Actions» del backlog queda **cerrada**: para ChatGPT y Codex, la vía es el plugin de Sites publicado (ver más arriba), que no necesita contrato OpenAPI ni compatibilidad con el editor de Actions.

## Desarrollo

### Versión para publicar

La versión visible procede de `package.json`. Antes de preparar una publicación con Sites, consulta la versión que está realmente publicada y ejecuta `npm run release:prepare -- --published-version X.Y.Z` con ese valor. Si la versión local coincide, aumenta solo la última cifra; si ya se había preparado una versión posterior, la conserva para que un reintento no incremente dos veces. Las cifras mayor y menor se cambian manualmente, manteniendo sincronizadas las versiones raíz de `package.json` y `package-lock.json`. Después ejecuta pruebas y build y publica esa misma revisión. La publicación en Sites la ejecuta Codex de OpenAI; el repo personal solo recibe commits y push. Esta automatización forma parte del flujo de publicación del repositorio; un despliegue hecho por otra vía que no ejecute el comando no incrementa la versión por sí solo.

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git and `tar` (including Windows `tar.exe`) are required for publishing; portable publication does not require Bash

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

Publish archives outside the source checkout or under its ignored `outputs/` directory. Local `.env*`, `.dev.vars*`, TypeScript build state, and tool runtime directories are ignored; keep the hosting manifest, migrations, and authored scripts in source control.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For managed Linux browser QA, follow the Sites skill's managed preview reference. The daemon runs the project's Vite dev script with `--host 0.0.0.0 --port 4173 --strictPort`; use the CLI's returned URL. The ignored local profile survives the daemon's cleared environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state-v20` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- dependency direction is `app → lib → db`: `lib/domain/` holds pure types and helpers, `lib/server/` holds auth and server-side access, and ESLint blocks any `lib → app` import
- stylesheets sit next to the code they style: `app/globals.css` (tokens and base elements), shared board styles in `app/board/styles/` (`buttons.css`, `access.css`, `dialogs.css`) and feature CSS next to its component (`tasks/kanban.css`, `people/people.css`, `layout/header.css`, `space/space.css`, `space/store/store.css`, docs and each app). Responsive rules live in the CSS of their feature. Plain CSS, no Tailwind or shadcn scaffolding
- `npm test` runs Vitest; tests sit next to their source as `*.test.tsx`, for example `app/board/tasks/use-tasks.test.tsx`
- `lib/server/auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `worker/index.ts` is the production Worker entrypoint and preserves request-scoped connector bindings
- `scripts/vite/` contains the maintained Vite integrations and the vendored Sites plugin license
- `scripts/connector-preview/` contains the local connector preview Worker and session helpers
- the remaining `scripts/` files select execution profiles and run installation, development, and builds; the plugin's helpers orchestrate the Sites lifecycle
- `dist/` contains generated deployment output; `.vinext/`, `.wrangler/`, and `.sites-runtime/` contain ignored local tool state
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` describes the D1 tables used by Aula Kanban
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `lib/server/auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Base de datos local y migraciones

La base de desarrollo es **independiente de producción**. Tanto `npm run dev` como `npm start` usan `.wrangler/state-v20`; los datos de prueba no se publican ni se sincronizan con el Site. La antigua `.wrangler/state` pertenece a una línea de migraciones anterior: consérvala si tiene datos que necesites y no la uses con el código actual.

`wrangler.local.jsonc` sirve exclusivamente para migraciones locales: identifica la carpeta `drizzle` y una base de prueba. El despliegue sigue usando la configuración de Sites y `.openai/hosting.json`.

Para crear la base local o aplicar únicamente las migraciones pendientes, desde esta carpeta:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.local.jsonc --persist-to .wrangler/state-v20
```

Wrangler registra las migraciones aplicadas en esa base; es seguro repetir el comando y no debe aplicarse cada archivo con `d1 execute --file` en esta misma base, porque ese comando no actualiza el registro. No sustituyas `--local` por `--remote`. No compartas una misma carpeta de estado entre varias instancias activas; detén el servidor antes de migrar.

Para un cambio nuevo:

1. Parte de la última versión publicada y comprueba `git status`. No sobrescribas cambios ajenos.
2. Actualiza `db/schema.ts` y ejecuta `npm run db:generate`. Revisa el SQL y los metadatos generados en `drizzle/`.
3. Mantén las migraciones **solo de esquema** y pequeñas. No incluyas datos, semillas ni traslados masivos; planifica esas operaciones por separado y de forma transaccional y repetible. No modifiques ni elimines migraciones o metadatos ya aplicados: añade otra migración. Presta especial atención a las reconstrucciones de tablas generadas automáticamente.
4. Para experimentar con migraciones todavía no definitivas, usa una carpeta `--persist-to` diferente y desechable. Si una migración ya se aplicó en tu base de trabajo, no la reescribas: crea una nueva base de prueba para revisar la alternativa. Conserva las copias anteriores y nunca borres una base con datos sin revisarla.
5. Con el servidor detenido, aplica las migraciones pendientes con el comando anterior. Ejecuta `npm test -- --run`, `npx tsc --noEmit`, `npm run lint` y `npm run build`, y prueba los flujos afectados. La base vacía local no representa automáticamente los datos o permisos reales: prueba también copias autorizadas o datos de prueba representativos cuando sea necesario.
6. Para publicar, deja que el agente de Sites revise la diferencia respecto a producción, las migraciones y la preservación de datos, haga una copia antes de cambios sensibles y complete el flujo de compilación y publicación. Sites aplica las migraciones de esquema antes de subir la nueva versión. Una compilación correcta no garantiza que una migración sea segura.

La aplicación usa `administrators_unified` para los administradores y `instance_owner` para la identidad del propietario. `deleted_students` y `deleted_teachers` almacenan el historial de fichas eliminadas y su purga está en `lib/server/deleted-profiles.ts`.

La migración `0023` añade `instance_apps`, que guarda qué aplicaciones nativas están instaladas en la instancia (no por proyecto). Las aplicaciones comienzan desinstaladas y solo el propietario o un administrador las gestionan desde Aula Store. La `0026` añade `app_documents`, con un estado JSON por proyecto y app, y la `0027` protege sus relaciones con los proyectos. La `0029` retira las tablas históricas de documentos y la `0030` las antiguas tablas de administradores, aplicaciones por proyecto y estado de transición.

## Almacenamiento de archivos (R2)

La aplicación no usa un VPS ni un volumen: D1 guarda los metadatos de `uploads` y R2 guarda los bytes con el binding `BUCKET`. `.openai/hosting.json` declara `"r2": "BUCKET"`; Sites inyecta ese binding en el Worker y `vite.config.ts` lo simula en local. El código nunca escribe archivos en el filesystem del servidor.

El propietario o un administrador puede comprobar el estado en **Ajustes > Administradores > Almacenamiento de archivos** o con `GET /api/storage/status`. El diagnóstico devuelve si D1 existe, si el binding `BUCKET` está presente, si el bucket responde a una lectura mínima y cuántas filas hay en `uploads`; no lista objetos ni expone secretos.

Si falta R2, `/api/uploads` responde 503 y `/api/files/[id]` responde 503 cuando el archivo tiene metadatos. Un identificador inexistente sigue siendo 404. Para publicar una instancia con archivos:

1. Confirma que el Site tiene R2 habilitado y que el binding se llama `BUCKET`.
2. Sube una imagen desde una tarea y recarga el tablero; la tarjeta debe mantener la imagen.
3. Revisa el diagnóstico de Ajustes si aparece «Imagen no disponible».
4. Si vienes de un volumen antiguo, conserva la copia hasta migrar los objetos a R2 con la misma `storage_key`; sin copia, esos bytes no se pueden recuperar y hay que volver a subirlos.

Las imágenes de tarea se muestran completas: todavía no se genera una miniatura derivada. La persistencia base debe funcionar antes de añadir optimización de miniaturas.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
