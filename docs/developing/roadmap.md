# Roadmap PROMO-04 · Privacidad, condiciones y archivos de rastreo

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PROMO-04 — la app no tiene páginas legales ni archivos de rastreo, y es una app con alumnado y un plugin publicado: `/privacy`, `robots.txt`, `sitemap.xml` y `manifest.json` dan 404.
> **Dependencias:** PROMO-03 completada (proyecto de demo y capturas). APP-03B cerrada (`app_preferences.folder`, migración `0040`).
> **Backlog:** PROMO-01 pausado y PROMO-05..06 pendientes de debate.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Publicar las páginas legales y los archivos de rastreo que faltan: `/privacidad`, `/condiciones`, `/robots.txt`, `/sitemap.xml` y `/manifest.webmanifest`.
- [ ] Criterio de éxito: las cinco rutas responden 200 sin sesión; el texto legal describe solo los datos que la app guarda de verdad; `robots.txt` deja fuera `/api/`, `/mcp` y `/.well-known/`; el sitemap solo lista rutas públicas; el manifest es válido y el navegador lo enlaza.

## 2. Alcance

**Dentro:**
- Páginas públicas sin sesión `app/privacidad/page.tsx` y `app/condiciones/page.tsx`, en castellano como `/documentacion`, con metadatos propios (título, descripción y canónica).
- Enlaces a ambas páginas desde el pie de la portada (`app/portada.tsx`) y desde la ayuda («Pedir ayuda» o el pie de la documentación).
- Archivos de rastreo con las rutas de metadatos de vinext: `app/robots.ts` → `/robots.txt`, `app/sitemap.ts` → `/sitemap.xml` y `app/manifest.ts` → `/manifest.webmanifest` (no `/manifest.json`).
- Texto legal basado en lo que la app guarda de verdad: `db/schema.ts`, archivos en R2 (`app/api/files/[id]/route.ts`) e identidad recibida de ChatGPT (`lib/server/auth.ts`).
- Pruebas de render y de contenido para las páginas, y pruebas de las tres rutas de metadatos.

**Fuera de alcance:**
- Revisión legal profesional: el texto lo redacta el equipo y lo revisa Jorge antes de publicar.
- Cambiar el esquema, los permisos o el modelo de datos; añadir cookies de analítica (hoy no hay) o consentimiento de cookies.
- Internacionalización: los textos van en castellano, como el resto de la app.
- Publicar en Sites, aplicar migraciones remotas o cambiar la versión `1.1.32`; eso lo hace Codex al publicar.
- El vídeo, el modo demo sin cuenta (PROMO-05) y el rendimiento de la calculadora (PROMO-06).

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Rutas en castellano (`/privacidad`, `/condiciones`)** | `/privacy` y `/terms` | Coherencia con `/documentacion` y con `lang="es"`; si hacen falta alias, se resuelven con `redirect()` a la ruta canónica, sin duplicar contenido. |
| **Rutas de metadatos de vinext (`robots.ts`, `sitemap.ts`, `manifest.ts`)** | Archivos estáticos en `public/` | El framework genera el contenido y el `Content-Type` correctos, y el sitemap puede reutilizar `siteUrl` en vez de repetir el dominio. |
| **`/manifest.webmanifest` como única ruta de manifest** | `/manifest.json` | Es la ruta que sirve vinext (`application/manifest+json`); `/manifest.json` seguiría dando 404 aunque exista el manifest. |
| **Sitemap con una lista constante de rutas públicas** | Recorrer `app/` para descubrir rutas | Solo hay que indexar `/`, `/documentacion`, `/privacidad` y `/condiciones`; una lista explícita evita publicar rutas privadas por accidente. |
| **`robots.txt` con lista de exclusión** | `Allow: /` sin exclusiones | Hay que dejar fuera `/api/`, `/mcp`, `/.well-known/`, `/oauth/` y `/sesion`; el resto de la app se sirve en `/` y no se puede desindexar por query. |
| **Texto legal derivado del esquema real** | Plantilla genérica de privacidad | El texto debe enumerar solo las tablas, archivos y cabeceras que la app usa; una plantilla prometería datos o finalidades que no existen. |
| **CSS propio con tokens para las legales** | Reutilizar `portada.css` | La guarda `app/styles.test.ts` prohíbe colores crudos y la portada no debe cargar estilos de páginas estáticas. |
| **Páginas sin cliente ni sesión** | Montar el tablero en modo lectura | Deben abrirse a cualquiera, incluidas las revisiones legales y los rastreadores, y no necesitan estado. |

## 4. Fases

### Fase 1: Páginas legales públicas — completada (2026-11-16)
- [x] Crear `app/privacidad/page.tsx` y `app/condiciones/page.tsx` como componentes de servidor públicos, sin `requireChatGPTUser`, con `metadata` propia y una cabecera mínima con el nombre de la app y el enlace de vuelta a `/`.
- [x] Redactar privacidad: identidad recibida de ChatGPT (id, correo y nombre), proyectos y miembros, tareas y asignaciones, alumnos y profesores, archivos en R2, pizarras, documentos de apps, preferencias, tokens MCP/OAuth y registro de auditoría; para qué se usan, dónde viven (D1 y R2 de Cloudflare), cuánto se conservan y cómo se eliminan.
- [x] Redactar condiciones: uso aceptable, cuentas y permisos, contenido del alumnado, propiedad del contenido, disponibilidad y límites, y contacto.
- [x] Enlazar ambas páginas desde el pie de `app/portada.tsx` y desde `app/board/docs/content/help.ts` (sección «Pedir ayuda» o el pie), con textos claros y sin duplicar la navegación.
- [x] Añadir estilos propios con tokens y revisar a 1366, 1024 y 390 px en claro y oscuro.
- **Criterios de aceptación:** `/privacidad` y `/condiciones` responden 200 sin sesión; no llaman a `requireChatGPTUser` ni muestran datos de una cuenta; los enlaces existen en la portada y en la ayuda; la guarda de estilos pasa y hay pruebas de render y de contenido.
- **Verificación:** ambas rutas responden `200` en el servidor de desarrollo sin sesión y sirven título, descripción y canónica absoluta (`https://aula-kanban.doubleoak32.chatgpt.site/privacidad` y `/condiciones`). Ninguna importa `lib/server/auth`. El componente compartido `app/legal/legal-page.tsx` y su `legal.css` usan solo tokens; se revisaron a 1366, 1024 y 390 px en claro y oscuro sin desbordes. Enlaces en el pie de la portada y en «Pedir ayuda» (nuevo bloque `links` de la ayuda). 11 pruebas nuevas y la guarda de estilos en verde; suite completa **147 archivos / 1.119 pruebas**, `tsc` y ESLint correctos. Contacto legal: `jorgemd@siberia.solutions`.

### Fase 2: Archivos de rastreo y manifest — completada (2026-11-16)
- [x] `app/robots.ts` → `/robots.txt` con `Allow: /`, `Disallow: /api/`, `/mcp`, `/.well-known/`, `/oauth/` y `/sesion`, y la línea `Sitemap` con la URL absoluta.
- [x] `app/sitemap.ts` → `/sitemap.xml` con `/`, `/documentacion`, `/privacidad` y `/condiciones`, construidas desde `siteUrl` de `lib/domain/site.ts`.
- [x] `app/manifest.ts` → `/manifest.webmanifest` con `name`, `short_name`, `description`, `start_url`, `display`, colores de tema y fondo, e iconos (PNG 192 y 512 generados del `favicon.svg` y el SVG con `sizes: "any"`).
- [x] Enlazar el manifest desde `app/layout.tsx` (`metadata.manifest`) para que el navegador lo descubra.
- **Criterios de aceptación:** las tres rutas responden 200 con `text/plain`, `application/xml` y `application/manifest+json`; `robots.txt` excluye `/api/`, `/mcp` y `/.well-known/`; el sitemap solo lista las cuatro rutas públicas; el manifest es JSON válido con nombre, `start_url`, `display` e iconos.
- **Verificación:** `/robots.txt` responde `200 text/plain` (181 B) con las cinco exclusiones y `Sitemap: https://aula-kanban.doubleoak32.chatgpt.site/sitemap.xml`; `/sitemap.xml` responde `200 application/xml` (653 B) con exactamente las cuatro rutas públicas; `/manifest.webmanifest` responde `200 application/manifest+json` (618 B), es JSON válido y el HTML de `/` incluye `<link rel="manifest" href="/manifest.webmanifest">`. Iconos `icon-192.png` (2.324 B) e `icon-512.png` (10.630 B) responden `200 image/png` y miden 192×192 y 512×512. 8 pruebas nuevas; suite completa **150 archivos / 1.127 pruebas**, `tsc` y ESLint correctos.

### Fase 3: Verificación y cierre
- [ ] Comprobar sin sesión `/privacidad`, `/condiciones`, `/robots.txt`, `/sitemap.xml` y `/manifest.webmanifest` en el servidor de desarrollo y en la build servida en local.
- [ ] Pasar suite completa, `tsc`, ESLint, build y `perf:budget`; revisar las dos páginas legales a 1366, 1024 y 390 px en claro y oscuro.
- [ ] Actualizar README (rutas públicas y cómo cambiar el texto), ayuda, changelog y archivar este roadmap.
- **Criterios de aceptación:** las cinco rutas responden 200 sin sesión y sin escrituras remotas; el texto está revisado y fechado; no hay regresiones ni cambio de versión; el roadmap se cierra con todas las fases verificadas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El texto legal promete o omite datos | Incumplimiento o información falsa | Partir de `db/schema.ts`, R2 y `lib/server/auth.ts`; revisión de Jorge antes de publicar y prueba que cite las tablas. |
| Se publican datos de una cuenta o proyecto | Fuga de datos personales | Páginas sin sesión, sin datos de ejemplo y revisión visual antes de guardar. |
| El sitemap indexa rutas privadas | Exposición de endpoints o del tablero | Lista constante de rutas públicas y prueba del XML generado. |
| Se usa `/manifest.json` y sigue dando 404 | El navegador no descubre el manifest | Usar `/manifest.webmanifest`, enlazarlo desde el layout y probar el `Content-Type`. |
| Los alias `/privacy` y `/terms` duplican contenido | Dos URLs para la misma página | Redirigir a la ruta canónica o no publicarlos en esta fase. |
| La guarda de estilos falla por colores crudos | Build o CI en rojo | Tokens del sistema visual y revisión de `app/styles.test.ts`. |
| Falta una dirección de contacto legal | La página queda incompleta | Definir el correo de contacto antes de publicar; no inventarlo. |
| El texto envejece con el producto | Privacidad desactualizada | Incluir «Última actualización» y revisar el texto cuando cambie el esquema. |

## 6. Notas de sesión

- 2026-11-16: PROMO-04 sale del grupo PROMO-04..06 del backlog y pasa a ser el roadmap activo; PROMO-05 y PROMO-06 permanecen pendientes de debate.
- 2026-11-16: el listado de tablas de la entrada del backlog era parcial; el texto legal debe partir del esquema completo, que incluye también `project_rekeys`, `instance_owner`, `administrators_unified`, `user_identities`, `task_assignees`, `deleted_students`, `deleted_teachers`, `instance_apps`, `app_preferences`, `project_books` y las cuatro tablas `oauth_*`.
- 2026-11-16: vinext sirve rutas de metadatos desde `app/robots.ts`, `app/sitemap.ts` y `app/manifest.ts`; el manifest se publica en `/manifest.webmanifest`, no en `/manifest.json`.
- 2026-11-16: SiberIA Solutions es autónomo, **no** una S.L.; la URL de privacidad es la que se usará al dar de alta el plugin.
- 2026-11-16: no se publica en Sites ni se cambia la versión `1.1.32` en este roadmap; el cierre es local y el push, único, como en los anteriores.
- 2026-11-16: contacto legal confirmado por el propietario: `jorgemd@siberia.solutions`; el texto lo usa en privacidad y condiciones.
- 2026-11-16: la ayuda estrena un bloque `links` (`DocBlock`) para enlazar las dos páginas legales con pastillas; `content-coverage.test.ts` extrae sus etiquetas como texto.
- 2026-11-16: la privacidad describe esta instancia y recuerda que cada copia o remix tiene su propio responsable; el texto parte del esquema completo y de D1/R2, no de una plantilla genérica.
- 2026-11-16: los iconos 192 y 512 del manifest se generaron desde `public/favicon.svg` con sharp y se guardan en `public/icons/`; `/icons/*` se sirve con caché de un día.
- 2026-11-16: vinext publica `/robots.txt`, `/sitemap.xml` y `/manifest.webmanifest` desde `app/robots.ts`, `app/sitemap.ts` y `app/manifest.ts`; `/manifest.json` no existe a propósito.
