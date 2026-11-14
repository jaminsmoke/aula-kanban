# Roadmap — Repositorio público en GitHub, licencia MIT y CI

> **Estado:** Activo
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.

---

## 1. Objetivo

- [ ] Publicar Aula Kanban en un repositorio público de GitHub (`jaminsmoke/aula-kanban`) con licencia MIT, textos de licencia de Excalidraw y CI, para que un agente o persona pueda clonar la fuente en lugar de reconstruirla a partir del Site.
- [ ] Criterio de éxito: `git clone https://github.com/jaminsmoke/aula-kanban` (o `gh repo clone`) deja una fuente clonable con CI en verde, sin que el correo público sea el Gmail personal y sin interferir con la publicación en Sites.

## 2. Alcance

**Dentro:**
- Copia de seguridad deliberada antes de reescribir el historial (rama de respaldo y/o `git bundle`), en esta carpeta local.
- Reescritura de autor y committer de todo el historial: sustituir `jaminsmoke@gmail.com` por el `noreply` de GitHub (`<id>+jaminsmoke@users.noreply.github.com`, nombre `JaminSmoke`), con `git filter-repo` (o `git filter-branch` como alternativa si no se instala). Configurar `user.email` de este repo al `noreply` a partir de entonces.
- `.openai/hosting.json` con valor de ejemplo del `project_id` en la versión pública, tras comprobar cómo Sites lo lee y conservar el valor real para publicar el Site en local.
- `LICENSE` con MIT, © 2026 Jorge Martín Delgado (JaminSmoke).
- Textos oficiales de licencia de las ocho familias de fuentes latinas de Excalidraw en `public/excalidraw/fonts` (Assistant, Cascadia, Comic Shanns, Excalifont, Liberation, Lilita, Nunito y Virgil), descargados de las fuentes oficiales. Xiaolai sigue fuera a propósito.
- `.github/workflows/ci.yml` en push y pull request a `main`: `npm ci`, lint, `tsc --noEmit` y `vitest`. Sin secretos ni `.env`/`.dev.vars`.
- Crear el repositorio público `jaminsmoke/aula-kanban` en la cuenta personal de GitHub (no en el Git de OpenAI/Sites), añadirlo como remote adicional `github` y, si se quiere, tags `v1.1.24` alineados con `package.json`.
- Después del primer push: README con instrucciones de clonado para agentes, `docs/README.md` actualizado (ya no dice que el backlog está vacío) y, si procede, el mensaje de remix ofreciendo `git clone` además del flujo `@Sites`; segundo push con esos cambios.
- Comprobaciones finales antes de cada push: autores sin Gmail, sin secretos rastreados y `.env*`/`.dev.vars*` ignorados (ya están en `.gitignore`).

**Fuera de alcance:**
- Quitar remotes o cambiar el flujo de publicación de Sites/OpenAI: GitHub se añade como remote adicional, las publicaciones siguen igual.
- Publicar desde otro ordenador o gestionar el repo fuera de esta carpeta local: todo se trabaja directamente aquí, para no desactualizar el árbol con el que se publica el Site.
- Cambiar las dependencias o la política de licencias (las dependencias de aplicación son MIT y las fuentes de la interfaz ya llevan OFL; los avisos de Excalidraw se conservan y Xiaolai no entra).
- OAuth 2.1, GPT con Actions y recortes de chunks: quedan en el backlog.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Backup deliberado (rama `respaldo-pre-github` y/o `git bundle`) antes de reescribir | Reescribir directamente | La reescritura cambia los hashes de los 64 commits; el backup da marcha atrás sin esfuerzo y queda en esta carpeta. |
| Commit previo del trabajo acumulado sin publicar | Reescribir con el árbol sucio | La reescritura necesita el historial completo, incluido lo trabajado en los roadmaps recientes; se commitea primero y luego se reescribe. |
| `git filter-repo` con mailmap (con `git filter-branch` como alternativa interna) | Reescribir a mano commit a commit | Automatiza autor y committer en los 64 commits de una vez; si la instalación falla, `filter-branch` consigue lo mismo sin instalar nada. |
| `noreply` de la cuenta `jaminsmoke` como correo público | Dejar `jaminsmoke@gmail.com` | El correo quedaría público en el historial; el `noreply` mantiene el contacto sin exponer el correo personal. |
| `hosting.json` con valor de ejemplo solo tras resolver cómo lee Sites el `project_id` | Cambiar el fichero versionado sin más | El `project_id` real identifica la instancia de producción; hay que verificar antes cómo lee ese fichero Sites para no romper la publicación local. |
| GitHub como remote adicional `github`, no como sustituto de Sites | Migrar la publicación a GitHub | Sites sigue siendo el origen de publicación; GitHub es clonable público y no interfiere con ese flujo. |
| CI mínima (`npm ci`, lint, `tsc`, `vitest`) en push/PR a `main` | CI con despliegue o publicación | Solo se comprueba; no se publican secretos ni se despliega desde GitHub. |

## 4. Fases

### Fase 1: Respaldo y reescritura de autores

- [ ] Dejar la copia de seguridad deliberada antes de reescribir: rama `respaldo-pre-github` y/o `git bundle create respaldo-pre-github.bundle --all`, sin borrar remotes ni el flujo de publicación de Sites.
- [ ] Commitear el trabajo acumulado pendiente en esta carpeta (index + resto del árbol) antes de la reescritura; comprobar en `git status` que no queda nada sin commitear.
- [ ] Reescribir autor y committer de todo el historial sustituendo `jaminsmoke@gmail.com` por `<id>+jaminsmoke@users.noreply.github.com` (nombre `JaminSmoke`), con `git filter-repo --use-base --mailmap` o equivalente; comprobar con `git log --format='%ae %ce' | sort -u` que no queda Gmail.
- [ ] Configurar `user.email` del repo local al `noreply` a partir de la reescritura y comprobar que la publicación en Sites sigue funcionando tras el cambio (verificar el flujo de publicación con la revisión reescrita).
- **Criterios de aceptación:** copia de respaldo creada; `git log --format='%ae %ce' | sort -u` sin `jaminsmoke@gmail.com`; el `user.email` local es el `noreply`; la publicación en Sites sigue operativa.

### Fase 2: Licencia, textos de Excalidraw y CI

- [ ] Comprobar cómo Sites lee el `project_id` de `.openai/hosting.json` antes de tocarlo; poner un valor de ejemplo en la versión versionada y conservar el real para publicar el Site en local (override sin trackear o dejar el real solo en Sites), verificando que publicar sigue funcionando tras el cambio.
- [ ] Añadir `LICENSE` con MIT, © 2026 Jorge Martín Delgado (JaminSmoke).
- [ ] Copiar en `public/excalidraw/fonts` los textos oficiales de licencia de las ocho familias (Assistant, Cascadia, Comic Shanns, Excalifont, Liberation, Lilita, Nunito y Virgil) descargados de las fuentes oficiales, conservando los avisos (OFL o equivalentes permisivos compatibles con un repo MIT si no se venden las fuentes por separado; Xiaolai no entra).
- [ ] Añadir `.github/workflows/ci.yml` en push y pull request a `main`: `npm ci`, lint, `tsc --noEmit` y `vitest`; comprobar que pasa en local con los mismos comandos y que no publica secretos ni usa `.env` / `.dev.vars`.
- **Criterios de aceptación:** `LICENSE` presente; los ocho textos de licencia copiados y verificados frente al oficial; el CI pasa en local; `.openai/hosting.json` con valor de ejemplo sin romper la publicación local.

### Fase 3: Creación del repositorio y primer push

- [ ] Crear el repositorio público `jaminsmoke/aula-kanban` en la cuenta personal de GitHub, añadirlo como remote adicional `github` y, si se quiere, tags `v1.1.24` alineados con `package.json`.
- [ ] Antes del primer push: `git log --format='%ae %ce' | sort -u` sin Gmail; búsqueda de secretos en árbol e historial (hoy no hay `API keys`, tokens, `.env` ni `.dev.vars` rastreados; `.env*` y `.dev.vars*` ya están en `.gitignore`); `.gitignore` intacto respecto a esos patrones.
- [ ] Primer push a `github` y comprobar que la CI corre y pasa en verde en el repositorio.
- **Criterios de aceptación:** repositorio público clonable en `jaminsmoke/aula-kanban`; historial reescrito sin Gmail; CI en verde en el primer push; tags (si se crean) alineados con `package.json`.

### Fase 4: Después del push

- [ ] Actualizar `README.md` con instrucciones de clonado para agentes (clonar desde GitHub en lugar de reconstruir la fuente desde el Site) y `docs/README.md` (ya no dice que el backlog está vacío).
- [ ] Si procede, alinear el mensaje de remix para ofrecer `git clone` además del flujo `@Sites`.
- [ ] Segundo push con los cambios de documentación y, si hace falta, un tag posterior alineado con `package.json`.
- **Criterios de aceptación:** README con instrucciones de clonado; `docs/README.md` sin contradicción; mensaje de remix alineado si aplica; CI en verde tras el segundo push.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reescribir el historial cambia los hashes y el push es forzoso | Divergencia con lo publicado/actual | Backup deliberado antes; la reescritura es consciente y se comprueba la publicación en Sites tras ella. |
| Poner un valor de ejemplo en `.openai/hosting.json` rompe la publicación local | Sites deja de publicar el Site | Confirmar antes cómo Sites lee el `project_id`; conservar el real en un override sin trackear o solo en Sites. |
| La reescritura con `filter-repo` no instala (`git filter-repo` no está en el entorno) | No se puede ejecutar la reescritura | Instalarlo con `python -m pip install git-filter-repo`, con `git filter-branch` (interno) como alternativa sin instalar. |
| `gh` no puede crear el repo (`gh` no autenticado) | Bloquea la publicación | `gh` 2.97.0 está autenticado en la cuenta `jaminsmoke` con permiso `repo`; si faltara, pedir re-login antes de crear el repo. |
| Trabajo pendiente sin commitear se pierde o queda fuera de la reescritura | Árbol distinto de lo publicado | Commitear todo el trabajo acumulado antes del backup y verificar `git status` limpio. |
| Publicar secretos o `.env` del entorno local | Filtración a un repo público | `.gitignore` ya los cubre; comprobación de autores y secretos antes del primer push. |

## 6. Notas de sesión

- 2026-11-14, antes de ejecutar: la carpeta es un Git local en `main` con 64 commits, sin ningún remote (por eso no hay `git remote -v`); `user.name` es `JaminSmoke` y `user.email` sigue siendo `jaminsmoke@gmail.com`. Autores únicos: `jaminsmoke@gmail.com` (autor y committer). `.openai/hosting.json` lleva el `project_id` de producción versionado. `git filter-repo` no está instalado; hay `python 3.14` con pip (se puede instalar). `gh` 2.97.0 está autenticado como `jaminsmoke` (`repo`, `workflow`). Hay trabajo pendiente sin commitear (51 archivos según `git status --porcelain`), incluidos los roadmaps recientes (MCP, hidratación, calendario).
