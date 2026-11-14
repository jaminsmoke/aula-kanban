# Changelog

> **Regla:** Las entradas nuevas van arriba. Lo más antiguo queda al final.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Backlog:** [`backlog.md`](backlog.md)
> Las versiones anteriores a `1.1.16` se conservan como hitos funcionales sin número de versión asociado.

---

## 2026-11-14 — Herramientas de aula carga por pestañas

**Estado:** Completada · Pendiente de publicación

### Cambios

- `periodic-data.ts` (3.241 líneas) se sustituye por `periodic-elements.json` y `periodic-types.ts`; se conservan los 118 elementos y sus fichas.
- La tabla periódica, el lector TTS, el editor de ecuaciones, la regla y el transportador pasan a imports dinámicos con `Suspense`.
- La calculadora sigue estática y disponible en el primer render; el estado de medición se conserva al cambiar de pestaña.
- Cada vista diferida muestra un aviso breve mientras se descarga.
- No cambian el diseño, los textos, las interacciones ni la persistencia.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (32 archivos / 138 tests) y `npm run build` correctos.
- Chunk de `edu-tools`: **78,8 KB → 17,4 KB** sin comprimir. Cierre estático con framework: **460,0 → 400,4 KB** sin comprimir (**133,2 → 119,6 KB gzip**).
- Chunks diferidos: tabla periódica 49,9 KB, ecuaciones 4,5 KB, lector 2,7 KB, regla 3,8 KB y transportador 3,6 KB.
- Smoke: la calculadora abre sin tabla; Ciencias muestra 118 elementos y busca sodio; Medir carga regla y transportador; Lectura carga TTS; Ecuaciones carga el editor. Sin cambios de estado en la base.
- La versión publicada sigue siendo **1.1.17**; este hito queda pendiente de publicación.
- Roadmap de carga por pestañas cerrado tras completar sus tres fases y reiniciado desde la plantilla.

## 2026-11-14 — Reintento de pizarra recupera la vista

**Estado:** Completada · Pendiente de publicación

### Cambios

- `useWhiteboard` limpia el error de carga cuando la petición de `/api/boards` termina correctamente.
- Tras un fallo de red, «Reintentar» vuelve a mostrar el lienzo; si el reintento falla, el mensaje sigue visible.
- Añadida la regresión en `use-whiteboard.test.tsx` y un nuevo `whiteboard.test.tsx` con el canvas simulado.
- No cambian el guardado, la fusión de escenas, el socket, la presencia ni los permisos.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (32 archivos / 137 tests) y `npm run build` correctos.
- Smoke real: primer GET de pizarra forzado a 500, aviso y «Reintentar» visibles; segundo GET correcto, lienzo recuperado y aviso eliminado. Sin cambios en la base.
- La versión publicada sigue siendo **1.1.17**; este hito queda pendiente de publicación.
- Roadmap del reintento cerrado tras completar su única fase y reiniciado desde la plantilla.

## 2026-11-14 — Componentes grandes divididos por responsabilidad

**Estado:** Completada · Pendiente de publicación

### Cambios

- Auditoría de Aula Store, calculadora, Mermaid, diálogo de tarea, Blockly y Whiteboard; sin cambios de diseño, contratos, permisos ni comportamiento.
- Aula Store: filtros, tarjeta, detalle, éxito y modelo extraídos.
- Calculadora: teclas, hook de estado, teclado e historial; `edu-evaluate` sigue siendo la única fuente de cálculo.
- Mermaid: plantillas, render y hook de vista previa.
- Diálogo de tarea: formulario, responsables, detalle y pizarra con carga lazy.
- Blockly: toolbox, starter, worker aislado, panel de código y hook del workspace.
- Whiteboard: modelo, hook de sincronización/presencia y lienzo de Excalidraw.
- Tests de caracterización añadidos para Mermaid, Blockly y Whiteboard.
- La versión publicada sigue siendo **1.1.17**; este hito queda pendiente de publicación.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (31 archivos / 136 tests) y `npm run build` correctos.
- Smoke visual: Aula Store (búsqueda, filtro y ficha), calculadora (7+5=12 e historial), Diagramas/Mermaid (editor y SVG), Kanban y tarea (resumen, asignaciones, pizarra y ampliación), Blockly (ejemplo, código y salida) y pizarra de `Mi espacio`.
- Mermaid se abrió con una respuesta de instalación simulada solo en el navegador; la API confirmó después que sigue desinstalada y no se alteró la base.
- Bundle inicial: 381,2 KB sin comprimir (113,3 KB gzip) y solo framework/runtime. Aula Store y las cuatro apps siguen en chunks lazy; ninguna está en el cierre estático de la entrada.
- Roadmap de componentes cerrado tras completar todas sus fases y reiniciado desde la plantilla.

## 2026-11-14 — Tareas separadas en consultas, permisos y mutaciones

**Estado:** Completada · Pendiente de publicación

### Cambios

- `app/api/tasks/route.ts` queda como orquestador HTTP.
- Nuevo `lib/server/tasks/types.ts` con tipos de fila, referencia, datos de proyecto y escritura.
- Nuevo `queries.ts` con `projectData` y `decorate`, incluida la resolución de fichas eliminadas y creadores.
- Nuevo `permissions.ts` con validación de referencias, reglas de alumno y guardas SQL por rol.
- Nuevo `mutations.ts` con crear, editar y borrar; conserva SQL, `mutation_token`, revisión optimista y borrado de la pizarra.
- Añadidos tests de permisos y de ruta para guest, alumno, admin, cuerpo inválido y conflicto 409.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (26 archivos / 121 tests) y `npm run build` correctos.
- Smoke real: crear 201, cambio de estado 200, edición completa 200 y borrado 200; sin tareas temporales.
- Roadmap de tareas cerrado tras completar todas sus fases y reiniciado desde la plantilla.

## 2026-11-14 — Guardas HTTP comunes y respuestas de API

**Estado:** Publicada

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

**Estado:** Publicada

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

**Estado:** Publicada

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

**Estado:** Publicada

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
