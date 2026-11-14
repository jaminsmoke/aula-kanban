# Changelog

> **Regla:** Las entradas nuevas van arriba. Lo más antiguo queda al final.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Backlog:** [`backlog.md`](backlog.md)
> Las versiones anteriores a `1.1.16` se conservan como hitos funcionales sin número de versión asociado.

---

## 2026-11-14 — Guardas HTTP comunes y respuestas de API

**Estado:** Completada · Pendiente de publicación

### Cambios

- Nuevo `lib/server/http.ts` con `json`, `isSameOrigin` e `isJsonRequest`.
- Las 12 rutas API usan el helper `json` común; eliminados los helpers locales y los `Response.json` directos.
- Las 10 rutas con mutaciones JSON exigen mismo origen y `application/json` antes de autenticar.
- `uploads` exige mismo origen pero mantiene `multipart/form-data`; `files/[id]` sigue siendo un GET binario.
- Normalizado el rechazo de formato a **415**; origen inválido responde **403**. Los mensajes y códigos de negocio no cambian.
- Añadidos tests de helpers y de guardas representativas (app-documents y uploads).

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (24 archivos / 111 tests) y `npm run build` correctos.
- Smoke en navegador: tablero cargado; `/api/tasks`, `/api/space-apps` y `/sesion` responden 200; una subida del mismo origen llega a validación (400 sin archivo); JSON inválido en uploads no rompe la ruta.
- Roadmap de guardas HTTP cerrado y reiniciado desde la plantilla.

## 2026-11-14 — Dominio y autenticación en `lib/`

**Estado:** Completada · Pendiente de publicación

### Cambios

- `app/task.ts`, `app/student.ts` y `app/assignments.ts` pasan a `lib/domain/`, con los mismos tipos, constantes, helpers y exports.
- `app/chatgpt-auth.ts` pasa a `lib/server/auth.ts`; páginas, rutas API, `lib/server/project.ts` y el mock del test actualizados.
- Eliminada la dependencia `lib → app`: la dirección queda `app → lib → db`.
- Añadida una regla ESLint `no-restricted-imports` para impedir que `lib/**` importe desde `app/**`.
- `README.md` y `docs/README.md` documentan la arquitectura, la ubicación del dominio y la autenticación.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (22 archivos / 102 tests) y `npm run build` correctos.
- Smoke de auth: sesión y tablero visibles, `/api/tasks` y `/api/space-apps` responden 200, `/sesion` responde 200 y el enlace de cierre de sesión existe.
- La regla de frontera rechazó un import temporal `lib → app` y se retiró la prueba.
- Roadmap de dominio/auth cerrado tras completar todas sus fases y reiniciado desde la plantilla.

## 2026-11-14 — CSS con tokens y estilos por feature

**Estado:** Completada · Pendiente de publicación

### Cambios

- Tokens semánticos en `app/globals.css` para superficies, texto, foco, estados, radios y tipografía.
- CSS específico junto a su feature: `tasks/kanban.css`, `tasks/task-dialog.css`, `people/people.css`, `layout/header.css`, `layout/settings-dialog.css`, `projects/member-dialog.css`, `projects/project-dialogs.css`, `space/space.css`, `space/store/store.css` y `shared/whiteboard.css`.
- `dialogs.css`, `access.css` y `buttons.css` quedan como estilos compartidos reales.
- El responsive se reparte entre las features; desaparece `responsive.css`.
- Eliminados selectores muertos, duplicados evitables, `!important` prescindibles y el `h1` global.
- La tienda carga su CSS solo al abrirse.
- Eliminada la auditoría temporal `docs/css-audit.md` al cerrar el roadmap; los tokens quedan documentados en `docs/README.md`.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (22 archivos / 102 tests) y `npm run build` correctos.
- Recorrido en escritorio y 390×844: kanban, tareas, pizarra, personas, cabecera, ajustes, administradores, miembros, compartir proyecto, `Mi espacio`, tienda y documentación.
- Formularios a 2 columnas en escritorio y 1 en móvil; sin desbordamiento horizontal.
- Roadmap CSS cerrado tras completar todas sus fases y reiniciado desde la plantilla.

## 2026-11-14 — Reorganización de `app/board` (fase 1)

**Estado:** Completada · Pendiente de publicación

### Cambios

- `app/board` queda sin archivos sueltos y organizado por dominio: `tasks/`, `people/` (incluido `teachers/`), `projects/`, `layout/`, `space/` (con `store/`), `shared/`, `styles/`, `docs/` y `apps/`.
- `api.ts`, `model.ts`, `use-board-data.ts` y `whiteboard.tsx` pasan a `shared/`; todos los consumidores actualizados.
- Los estilos compartidos pasan a `styles/`; `views.css` se separa en `people.css` y `space.css`, y `docs.css` se carga con la vista lazy de documentación.
- `README.md` actualizado con la nueva estructura de estilos y tests.
- Se añade `docs/README.md` como índice y guía del flujo de roadmap, backlog y changelog.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (22 archivos / 102 tests) y `npm run build` correctos.
- Comprobado en dev: tareas y pizarra compartida, personas, `Mi espacio`, tienda y documentación con estilos aplicados.
- Comprobado a 390×844 sin desbordamiento horizontal en tablero, alumnos, `Mi espacio` y tienda.
- Fase 1.6 (verificación y cierre) completada con lint, tipos, tests, build y recorrido visual.
- Roadmap de la fase 1 completado y reiniciado desde la plantilla.

## 2026-11-14 — 1.1.16 · Persistencia común y apps nativas por carpeta

**Estado:** Publicada

### Cambios

- Nueva tabla `app_documents` para guardar un estado JSON por proyecto y app. Sustituye la persistencia duplicada de Blockly y Mermaid.
- Nuevo endpoint `/api/app-documents` y hook `useAppDocument`: permisos comunes, límite de 200 KB y respaldo en `localStorage`.
- Blockly y Mermaid pasan al documento común. Se eliminan `/api/blockly-programs` y `/api/mermaid-diagrams`.
- `blockly_programs` y `mermaid_diagrams` quedan como tablas históricas; la API nueva las lee si aún no hay fila en `app_documents`.
- Migración `0026` solo de esquema y script idempotente `scripts/migrate-app-documents.sql` para copiar los datos históricos.
- Cada app de Aula Store vive en `app/board/apps/<id>/`, con un registro único en `registry.tsx` y el catálogo compartido `lib/native-apps.ts`.
- La API toma los ids de `NATIVE_APP_IDS`; la tienda y `Mi espacio` dejan de duplicar el catálogo y los tamaños de ventana.

### Verificación

- `npm run lint`, `npx tsc --noEmit` y `npm run build` correctos.
- 22 archivos de test y 102 tests pasando.
- Prueba real en dev: Blockly y Mermaid cargan y guardan con el documento común; Mermaid se devolvió a su estado desinstalado.
- Datos históricos copiados y comparados con las tablas originales sin diferencias.

## 2026-11-14 — Tienda de Aula Store y persistencia de instalación

**Estado:** Completada · Hito sin versión registrada

### Cambios

- Tienda rediseñada con cabecera integrada, categorías (Todo, Aula, Pizarras, Programación, Diagramas, Instaladas), búsqueda, rejilla responsive y fichas de detalle.
- Tarjetas uniformes con portadas 16:9 reales, estado y acciones de instalar, abrir y desinstalar.
- El estado instalada/desinstalada se guarda por instancia en `instance_apps`; por defecto las apps nuevas aparecen desinstaladas.
- Las apps instaladas aparecen en el escritorio de `Mi espacio` y sobreviven a la recarga completa de la página.

### Verificación

- Flujo completo desde la UI: instalar, aparecer en el escritorio, recargar y seguir instalada.
- Estado comprobado en la base de datos.

## 2026-11-13 — Diagramas Mermaid

**Estado:** Completada · Hito sin versión registrada

### Cambios

- App de diagramas de flujo, secuencia, Gantt, clases, estados y líneas de tiempo.
- Editor con vista previa, plantillas, guardado por proyecto y exportación SVG.
- Normalización del SVG exterior y espera de fuentes para evitar diagramas colapsados.

### Verificación

- Guardado y carga por proyecto; exportación SVG revisada en la app.

## 2026-11-13 — Programación por bloques

**Estado:** Completada · Hito sin versión registrada

### Cambios

- Editor Blockly con caja de herramientas en español, lógica, bucles, matemáticas, texto, variables y funciones.
- Panel de código JavaScript/Python, copia y ejecución de JavaScript con salida, errores y tiempo agotado.
- Guardado por proyecto y recursos de Blockly servidos desde el propio Site.

### Verificación

- Ejemplo inicial, guardado/carga y ejecución de código probados.
- Se eliminó la categoría de colores por no existir en el núcleo de Blockly 13.

## 2026-11-13 — Herramientas de aula

**Estado:** Completada · Hito sin versión registrada

### Cambios

- Calculadora básica y científica con memoria, historial y ecuaciones por líneas con variables compartidas.
- Tabla periódica en español con búsqueda, filtros, ficha, modelo atómico e historia.
- Regla, transportador y lectura en voz alta.

### Verificación

- Cálculos, ecuaciones y navegación por las cuatro herramientas probados.
