# Aula Kanban

Cada instancia mantiene sus propios proyectos y datos en D1. Para configurar una copia, añade `OWNER_EMAIL` en la configuración de variables de entorno de Sites con el correo de ChatGPT del propietario y vuelve a publicar para aplicar el cambio. La base de datos y las variables de entorno no se copian durante un remix. Una copia nueva comienza sin proyectos ni alumnos. El propietario y los administradores pueden crear o eliminar proyectos y administrar la lista de administradores. La propiedad de alojamiento del Site se gestiona en Sites, no desde la aplicación. Las invitaciones de proyecto se aceptan dentro de la aplicación y vinculan al identificador de ChatGPT de la cuenta invitada.

## Desarrollo

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
- stylesheets sit next to the code they style: `app/globals.css` (tokens and base elements) plus `app/board/chrome.css` (top bar, menus, shared button primitives), `access.css`, `kanban.css`, `dialogs.css`, and `views.css`; `app/board/responsive.css` is imported last so its overrides win. Plain CSS, no Tailwind or shadcn scaffolding
- `npm test` runs Vitest; tests sit next to their source as `*.test.tsx`, for example `app/board/use-tasks.test.tsx`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
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

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

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

La transición de la versión 20 conserva `administrators` y `administrator_profiles` como tablas históricas; la aplicación usa `administrators_unified`. No elimines ni vuelvas a migrar esas tablas por tu cuenta sin revisar el estado de cada instancia. `deleted_students` y `deleted_teachers` almacenan el historial de fichas eliminadas y su purga está en `lib/server/deleted-profiles.ts`.

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
