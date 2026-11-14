# Changelog

> **Regla:** Las entradas nuevas van arriba. Lo más antiguo queda al final.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Backlog:** [`backlog.md`](backlog.md)
> Las versiones anteriores a `1.1.16` se conservan como hitos funcionales sin número de versión asociado.

---

## 2026-11-14 — Roadmap de Hidratación en `view=ajustes` cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- La página (`app/page.tsx`) pasa el estado de vista/sección ya parseado de la URL a `<Board>` y el hook `useBoardUrlState` lo usa como estado inicial, en vez de leer `window.location.search` en el primer render del cliente, que era la causa del aviso «Hydration failed» (`app-frame--viewport` y `aria-current` distintos entre servidor y cliente). La primera pintura ya coincide con la vista pedida (`ajustes`, `calendario` o clase), sin regenerar el árbol.
- Sin cambios de comportamiento: `popstate`, `pushState` y `parseBoardUrl` siguen siendo la única fuente de verdad de vista/sección en la URL. Las demás lecturas de `window.location.search` (efectos o manejadores) no se tocan.
- **Verificación:** navegador con Chrome headless sobre el dev no registra el aviso en ninguna visita; **65 archivos / 258 tests**, `lint`, `tsc` y `build` en verde (un test nuevo de paridad primer render).

### Seguimiento en backlog

OAuth 2.1, GPT con Actions, repositorio público en GitHub y recortes de chunks.

## 2026-11-14 — Roadmap de Servidor MCP de Aula Kanban cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Servidor MCP remoto alojado en el propio Site** en `/api/mcp` (transporte HTTP Streamable web-standard, sin sesiones, respuestas JSON, SDK `@modelcontextprotocol/sdk` 1.32.2 MIT con aviso en `THIRD-PARTY-NOTICES.md`). La producción es remota: no hay proceso local entregado; lo local es solo para probar.
- **Contrato de 8 herramientas** (`lib/server/mcp/tools.ts`): `listar_proyectos`, `listar_tareas` (filtros por estado, prioridad, alumno y texto, con paginación), `obtener_tarea`, `listar_alumnos`, `listar_profesores`, `crear_tarea`, `actualizar_tarea` y `eliminar_tarea`. Los manejadores reutilizan `lib/server` (`projectData`, `decorate`, `projectAccessForUser`, `createTask`, `updateTask`, `deleteTask`, `taskAuthGuard`, `createTaskPermissions`): un alumno ve y edita lo mismo que en el tablero y una cuenta invitada solo consulta, por MCP y por web.
- **Tokens personales** (`mcp_tokens`, migraciones `0031` y `0032` con la columna `email`): formato `ak_mcp_…`, SHA-256 con sal por token, verificación en tiempo constante, y creación/listado/revocación desde **Ajustes > Cuenta** (el token se muestra una sola vez). Sin token, inválido o revocado, el endpoint responde `401`; cada token tiene un límite básico de 120 peticiones por minuto (`429` con `retry-after`).
- **Enlaces en las respuestas** con el esquema `?project=…&view=…&section=…` ya publicado (`lib/server/mcp/links.ts`).
- **Documentación de instalación** en `README.md` (sección «Servidor MCP»: bloque JSON con URL + cabecera `Authorization: Bearer`, clientes HTTP remotos y puente stdio para clientes clásicos, revocación) y en `/documentacion` (sección nueva «Servidor MCP»: pasos, bloque `code` JSON, ilustración `McpArt`).
- **Verificación:** 65 archivos / 257 tests, `lint`, `tsc` y `build` en verde; smoke real en dev con cliente SDK (lecturas, ciclo crear → mover → renombrar → eliminar con control optimista de revisión, `429` tras ~120 peticiones, revocación con `204`).

### Seguimiento en backlog

Hidratación distinta entre servidor y cliente en `view=ajustes` (overlay de desarrollo; sin tocar layouts en este roadmap), OAuth 2.1, GPT con Actions, repositorio público en GitHub y recortes de chunks.

## 2026-11-14 — Roadmap de Calendario en Clase cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Nueva sección **Calendario** en Clase (`ClassSection = "tareas" | "calendario"`), con su entrada en el sidebar de secciones y la vista en carga diferida (`lazy`) desde `app/board/class/calendar/calendar-view.tsx`.
- Librería `react-big-calendar` 1.20.0 (MIT) con localizer de `date-fns` 4.4.0, mensajes en español y vistas Mes, Semana y Agenda. Sin edición, arrastre ni creación desde el calendario.
- Las tareas visibles del proyecto se colocan en su `dueDate` como evento de día completo en medianoche local (sin desplazamiento UTC); las tareas sin vencimiento no reciben una fecha inventada. El estado colorea el evento con el mismo código que las columnas del tablero y aparece en el tooltip.
- Pulsar un evento abre el diálogo de tarea existente (`kanban.onOpenEditor(task.status, task)`), así que se mantienen `canEditTask`, el invitado en solo lectura y el `mutation_token`. No hay consulta ni API nuevas.
- Estados propios de la sección: carga, error con «Reintentar» y aviso de estado vacío cuando ninguna tarea tiene fecha.
- URL: `section=calendario` validado en `board-url.ts` (`CLASS_SECTIONS`), escrito solo en Clase y persistido/restaurado con atrás/adelante por `useBoardUrlState`.
- Estilos de la librería adaptados a los tokens en `calendar-view.css` (superficies, líneas, marca, foco, eventos por estado, agenda y semana), con ajuste a 860 px y `prefers-reduced-motion`.
- `THIRD-PARTY-NOTICES.md` nuevo con los avisos MIT de `react-big-calendar` (Jason Quense) y `date-fns` (Sasha y Lesha Koss).
- `package.json`: dependencias `react-big-calendar` y `date-fns`, tipos en dev y `allowScripts` para `esbuild`, `workerd` y `unrs-resolver` sin fijar versión (npm 12 bloquea los scripts de instalación).
- Tests nuevos: `calendar-view.test.tsx` (fecha, sin fecha, estado vacío, región y estado del evento, apertura, carga y error), `class-view.calendar.test.tsx` (integración real con carga diferida y editor) y casos de `section=calendario` en `board-url` y `use-board-url`.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (58 archivos / 222 tests) y `npm run build` correctos.
- Chunk diferido `calendar-view`: 220.700 B brutos / **62.122 B gzip**, más CSS 17.490 B / 3.552 B gzip; `board` 112.954 B / 33.274 B gzip (+236 B brutos frente a la línea base 112.718 / 33.196). El calendario sigue fuera de la carga inicial.
- Smoke en Chrome headless con sesión: escritorio 1440×950 y móvil real a 390×844 (medido en un iframe de 390 px, porque el modo headless impone 500 px de ventana). Sin desbordamiento horizontal: siete columnas completas, toolbar apilada y `docScrollWidth = 390`.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus tres fases; se reinicia sin roadmap activo. La confirmación de que el Site está compartido como público sigue en el backlog.

## 2026-11-14 — Roadmap de portada pública y mensaje de remix cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Portada pública en `/`: `app/page.tsx` usa solo `getChatGPTUser()`. Sin sesión se muestra `app/portada.tsx` (qué es Aula Kanban, «Iniciar sesión con ChatGPT» con `returnTo` completo y «Ver documentación» a `/documentacion`); con sesión se mantiene el tablero actual. `?view=documentacion` sin sesión sigue redirigiendo a `/documentacion`.
- El tablero, las API y el socket siguen exigiendo sesión: sin cookie, las 9 rutas API GET responden 401 y `boardSocket` conserva su contrato 401/400/404/503. No se tocaron esos contratos.
- Nuevo mensaje de remix en `RemixDialog`: pide una copia vacía con base propia, deja como propietario a **quien da la orden** (la cuenta de ChatGPT desde la que publica el agente) y pide `OWNER_EMAIL` con el correo de esa misma cuenta. Los párrafos aclaran que el agente publica la copia, que nadie tiene que reclamar la instancia y que el botón solo copia el mensaje.
- README: nueva sección «Visibilidad del Site en Sites» con cómo comprobar si el Site es público (ventana privada y `curl`), y checklist de remix reescrito en ese orden.
- Tests nuevos/actualizados: `portada.test.tsx`, `page.test.tsx` (portada sin sesión, `returnTo` profundo, tablero con sesión, Documentación sin sesión) y `project-dialogs.test.tsx` (mensaje de remix).

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (56 archivos / 213 tests) y `npm run build` correctos.
- Smoke en dev: `/` sin cookie 200 con portada (antes 307 al OAuth), `/documentacion` 200, tablero con sesión 200, `/api/tasks` sin sesión 401; portada correcta en Chrome headless a 390×844.
- El socket no se pudo probar con petición real en dev (vinext no enruta `/api/board-socket` por `worker/index.ts`); su contrato se mantiene por código y documentación.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus tres fases; se reinicia desde la plantilla. La confirmación de que el Site está compartido como público queda en el backlog como tarea de plataforma.

## 2026-11-14 — Roadmap de URLs por vista y sección cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Esquema query canónico en `app/board/shared/board-url.ts` (`parseBoardUrl`/`buildBoardUrl`): `project` se conserva, `view` admite `clase | alumnos | profesores | espacio | ajustes | documentacion` y `section` solo en `clase` (`tareas`) y `ajustes` (`cuenta | administradores`); defectos omitidos e inválidos resueltos al defecto.
- Nuevo hook `use-board-url.ts` usado por `Board`: lee la URL al entrar, escucha `popstate` (atrás/adelante) y escribe cada cambio con `pushState` sin recargar; la sección de Ajustes queda controlada desde el tablero y `use-projects` conserva vista/sección al redirigir al primer proyecto.
- `BoardHeader` conserva `aria-current` y sus enlaces de proyecto ahora escriben la URL completa con la vista/sección activas (`projectHref`), incluido el proyecto `default`.
- `app/page.tsx` pasa como `returnTo` de `requireChatGPTUser` la URL completa canonizada (proyecto, vista y sección), p. ej. `/?project=p1&view=ajustes&section=administradores`; tras el login se vuelve al enlace profundo.
- Documentación sin sesión: nueva ruta pública `/documentacion` reutilizando `DocumentationView`, con enlace para iniciar sesión; la raíz redirige a ella al visitante anónimo que pide `?view=documentacion`. El resto de vistas del tablero sigue protegido. La portada pública completa queda en el backlog.
- Tests nuevos/actualizados: `board-url` (7), `use-board-url` (enlace inicial, cambio de vista/sección y `popstate`), `page` (`returnTo` completo, canonización y Documentación sin sesión), `documentacion` (ruta pública), `header` (enlace conserva vista/sección) y `use-projects` (redirección conserva vista).

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (54 archivos / 210 tests) y `npm run build` correctos; el build lista la ruta `/documentacion`.
- Smoke en dev (Chrome headless, escritorio y 390×844): sin sesión, el enlace profundo redirige a `/signin-with-chatgpt?return_to=` con la URL completa codificada y el login vuelve a ese enlace; con sesión, `?view=ajustes&section=administradores` abre Administradores con `aria-current` y el enlace de proyecto conserva vista/sección; `/documentacion` responde 200 sin sesión y `/?view=documentacion` sin sesión redirige a ella, mientras `/?view=alumnos` sigue protegido.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus tres fases; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de extracción de Medir cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- `edu-tools-app.tsx` pasa de 274 a 90 líneas y queda como shell de pestañas y vistas lazy.
- Nuevo `use-measure-tools.ts` con estado, medición, rotación, punteros, tamaño y atajos.
- Nuevo `measure-tools.tsx` con el marcado de regla y transportador y sus imports diferidos.
- El hook se mantiene en el shell para conservar ángulo y medición al cambiar de pestaña.
- Se mantienen `PX_PER_CM`, `PX_PER_INCH`, Shift ±1°, flechas ±5°, Home y Alt+1…4.
- Añadidos tests de persistencia de la medición y atajos de vista.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (50 archivos / 193 tests) y `npm run build` correctos.
- Smoke real en EduTools: 22 comprobaciones correctas, sin excepciones ni errores de consola.
- Chunk de EduTools: 17,6 → 18,2 KB brutos; 5,5 → 5,8 KB gzip. Aumento mínimo por la separación de módulos; la app sigue cargándose bajo demanda.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus dos fases; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de sesión de whiteboard cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- La pizarra se agrupa en `app/board/shared/whiteboard/`, con `index.ts` como fachada compatible.
- `use-whiteboard.ts` baja de 307 a 233 líneas.
- Nueva `whiteboard-persistence.ts` para carga, guardado, adjuntos y merge de conflicto.
- Nueva `whiteboard-presence.ts` para socket, reconexión y mensajes de presencia.
- La combinación de escenas en directo conserva la prioridad de los archivos recibidos; en los conflictos de guardado se mantienen los archivos locales pendientes. Añadida prueba de regresión.
- Se mantienen API, permisos, UI, debounces y polling.
- Añadidos tests de persistencia, conflicto y presencia.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (50 archivos / 191 tests) y `npm run build` correctos.
- Dos sesiones conectadas a la vez, reconexión tras pérdida de red y guardado real con PUT correctos.
- Chunk de pizarra: 1.108,6 → 1.108,9 KB brutos; 350,7 → 351 KB gzip. Sin cambio significativo.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus tres fases; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de medición de chunks cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Inventariados los chunks iniciales, las vistas lazy y las dependencias pesadas.
- Confirmado que `compute-engine`, Blockly y Mermaid solo se cargan al usar sus funciones; no se dividieron.
- Detectados duplicados de `katex`, Mermaid y cuatro pares de archivos; se dejan como están por riesgo y bajo impacto real.
- Copiadas 8 familias latinas de Excalidraw a `public/excalidraw/fonts`.
- Configurado `window.EXCALIDRAW_ASSET_PATH = "/excalidraw/"` para evitar el fallback de fuentes a `esm.sh`.
- Xiaolai (12,3 MB) queda fuera del flujo normal.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (48 archivos / 186 tests) y `npm run build` correctos.
- La entrada al tablero sigue en 149,7 KB gzip.
- Smoke de pizarra: Excalifont se carga desde `/excalidraw/fonts` y no hay peticiones a `esm.sh`.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus tres fases; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de jerarquía de personas cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Los archivos exclusivos de alumnos se movieron a `people/students/`.
- `profile-card`, `profile-detail` y `people.css` permanecen como compartidos en `people/`.
- Imports y mocks actualizados en `Board`, tests y vistas relacionadas.
- `people/teachers/` no cambia.
- Sin cambios de comportamiento, datos, permisos ni API.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (48 archivos / 186 tests) y `npm run build` correctos.
- Smoke de Alumnos, Profesores y vuelta a Alumnos correcto.
- La versión publicada sigue siendo **1.1.23**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus dos fases; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de ajustes generales cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Ajustes sale del menú de cuenta y pasa a una vista propia con engranaje en la cabecera.
- El sidebar de Ajustes comparte el layout de pantalla partida con Clase.
- Secciones reales: Cuenta y Administradores, sin placeholders.
- Cuenta conserva información de la cuenta, permisos, proyecto, rol, aviso de propiedad y cierre de sesión.
- Administradores conserva alta, edición, borrado, confirmación, errores y refresco de proyectos.
- El modal antiguo de ajustes se elimina.
- Documentación y README actualizados con la nueva navegación.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (47 archivos / 185 tests) y `npm run build` correctos.
- Smoke responsive de Ajustes con 15 comprobaciones y smoke final de 8 comprobaciones.
- Cobertura de Cuenta y Administradores: carga, estados, alta, edición, borrado y error.
- La versión publicada sigue siendo **1.1.22**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus fases 1, 2, 3 y 4; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de navegación de Clase cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- “Kanban” pasa a ser **Clase**, con un sidebar de secciones que empieza bajo el header y llega al final del viewport.
- El sidebar es una zona de navegación a pantalla partida, sin tarjeta ni radio; el contenido tiene scroll independiente.
- Tareas es la única sección real por ahora, sin placeholders.
- El header mantiene el bloque de trabajo —Clase, Alumnos, Profesores y Mi espacio— con el selector de proyecto a continuación; Documentación y cuenta quedan en el extremo derecho.
- Mi espacio pasa a una acción de icono con etiqueta accesible. Documentación se muestra como texto en escritorio y como icono accesible en pantallas estrechas.
- Mi espacio y Documentación vuelven a Clase; la documentación visible explica la nueva navegación.
- Responsive: header envuelto a partir de 1000 px, tablero de 4 columnas en escritorio, 2 en tablet y 1 en móvil.
- Foco visible y orden de teclado revisados para los controles principales.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (44 archivos / 175 tests) y `npm run build` correctos.
- Smoke responsive con 22 comprobaciones; smoke de navegación con 12 comprobaciones; recorrido de teclado por los 8 controles principales correcto.
- La versión publicada sigue siendo **1.1.22**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus fases 1, 1B, 2, 3 y 4; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de versiones de Aula Store cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Cada app declara `appVersion` como versión propia de integración, empezando en `1.0.0`, separada de su paquete `upstream`.
- Aula Store tiene su propia versión (`AULA_STORE_VERSION = "1.0.0"`), visible como chip en la cabecera de la tienda.
- La ficha muestra «Versión de {app}», «Upstream» y, cuando corresponde, «Ampliaciones». EduTools incluye `@smst/edu-tools 2.2.1` y `@cortex-js/compute-engine 0.188.0`.
- `NativeAppMeta.version` se sustituyó por `appVersion`; `versionLabel` permite una etiqueta distinta del nombre.
- Un test mantiene las versiones upstream sincronizadas con `package-lock.json`.
- La política de incremento y la tabla de versiones quedaron documentadas en `docs/aplicaciones-nativas.md` y en la guía de apps.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (42 archivos / 171 tests) y `npm run build` correctos.
- Smoke final de Aula Store con 17 comprobaciones: cabecera `v1.0.0` y fichas de las cuatro apps con versión propia, upstream y ampliaciones.
- La versión publicada sigue siendo **1.1.22**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus fases 1, 2, 2B y 3; se reinicia desde la plantilla.

## 2026-11-14 — Roadmap de rendimiento y acabado cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- Fase 1: auditoría de `globals.css`; `--font-mono` retirado, 11 colores repetidos promocionados y 47 tokens finales.
- Fase 2: el check de Aula Store usa SVG/CSS; `lottie-react`, `check-lottie.json` y su chunk eliminados.
- Fase 3: Bricolage Grotesque e Instrument Sans se sirven desde `public/fonts`; retirados los preconnect y la hoja de Google Fonts. Se conservan los subsets latin y latin-ext, `font-display: swap` y las licencias OFL.
- `public/_headers` fija caché inmutable de un año para `/fonts/*` y mantiene la de `/_next/static/*`.
- La medición de partida era de 3 peticiones, ~2,4 KB de CSS y ~108 KB de fuentes latinas. Sin cambios de diseño ni de comportamiento.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (40 archivos / 166 tests) y `npm run build` correctos.
- Build sin referencias a `fonts.googleapis.com` ni `fonts.gstatic.com`; las fuentes locales se copian a `dist/client/fonts`.
- Smoke de tablero, Aula Store y documentación correcto; las dos familias cargan desde el Site.
- La versión publicada sigue siendo **1.1.22**; este hito queda pendiente de publicación.
- Roadmap cerrado tras completar sus tres fases y reiniciado desde la plantilla.

## 2026-11-14 — Fondo de Mi espacio y carga de vistas

**Versión:** 1.1.22

- Corregido el color del degradado de Mi espacio y añadido un fondo opaco de respaldo para evitar que se transparente la cabecera.
- Las vistas de alumnos y profesores se cargan al abrirlas; Mi espacio y Documentación ya usaban carga diferida.
- El escritorio vacío indica cómo instalar aplicaciones desde Aula Store y distingue la ausencia de apps de un error al consultar su estado.

## 2026-11-14 — Limpieza de tablas históricas de administración y aplicaciones

**Versión:** 1.1.21

- La migración `0030` retira las tablas anteriores `administrators`, `administrator_profiles`, `space_apps` y `transition_state`; la aplicación usa `administrators_unified`, `instance_owner` e `instance_apps`.
- Se eliminaron del esquema los exports correspondientes y un trigger histórico con referencias cruzadas. Se conservan las tablas activas, los historiales de fichas y sus purgas.
- En producción las tres tablas de datos antiguas estaban vacías y el único estado de transición indicaba que la migración de administradores había terminado.
- Se verificó una copia íntegra de la base local en `work/private-backups/aula-antes-0030-20261114-130605.sqlite`. Sus dos filas históricas de aplicaciones representaban estados anteriores; la configuración vigente estaba en `instance_apps`. Tras la migración, se compararon las 15 tablas activas con la copia sin encontrar cambios.
- Esta publicación incluye también los cambios locales de acabado de la tienda y CSS. El roadmap de rendimiento mantiene pendiente su fase de fuentes y cierre.

## 2026-11-14 — Retirada de tablas históricas de documentos

**Versión:** 1.1.20

- La migración `0029` elimina `blockly_programs` y `mermaid_diagrams`; Blockly y Mermaid usan exclusivamente `app_documents`.
- Se retiraron los exports, el fallback de lectura y las referencias al eliminar proyectos, así como los scripts de transición que dependían de esas tablas.
- Antes de la migración, ambas tablas de producción estaban vacías. En local había una fila histórica de cada tipo y ambas tenían su documento activo en la tabla común.
- Se guardó una copia íntegra de la base local en `work/private-backups/aula-antes-0029-20261114-121912.sqlite`. Tras aplicar la migración local, los dos documentos activos coincidían con el respaldo.
- La migración se probó en una base aislada y con documentos representativos. Pasaron 162 pruebas, tipos y lint.

## 2026-11-14 — Calculadora con carga diferida y estado de cálculo

**Estado:** Completada · Pendiente de publicación

### Cambios

- La calculadora básica sigue abriendo sin descargar `compute-engine`.
- El motor se precarga solo al entrar en **Científica** o al abrir **Ecuaciones**.
- La pantalla muestra **«Calculando…»** y `aria-busy` durante el primer cálculo.
- El editor de ecuaciones también expone `aria-busy` mientras calcula.
- Decisión documentada: mantener `compute-engine`; `mathjs` ahorra peso pero no cubre LaTeX nativo ni la exactitud simbólica actual.
- `mathlive` 0.29.1 no se fuerza ni se deduplica porque no entra en el bundle cliente.
- Test añadido para comprobar que la calculadora básica no precarga y que Científica/Ecuaciones sí.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (37 archivos / 160 tests) y `npm run build` correctos.
- Smoke de producción: el motor no aparece al abrir la calculadora básica; Científica y Ecuaciones lo cargan.
- Smoke de red lenta: «Calculando…» y `aria-busy=true` visibles, resultado `5` y pantalla liberada después.
- La versión publicada sigue siendo **1.1.18**; este hito queda pendiente de publicación.
- Roadmap de `compute-engine` cerrado tras completar sus tres fases y reiniciado desde la plantilla.

## 2026-11-14 — Propiedad de instancia por identidad de ChatGPT

**Estado:** Completada · Pendiente de publicación

### Cambios

- Nueva tabla `instance_owner` y migración `0028`; guarda el `user_id` estable, el correo de contacto y la fecha de reclamación.
- El primer acceso con el correo de `OWNER_EMAIL` reclama la propiedad; no hay reclamación automática de un visitante cualquiera.
- `lib/server/owner.ts` centraliza lectura, reclamación y comprobación por identidad.
- `project.ts`, `board-room.ts` y `worker/index.ts` usan el mismo helper.
- Después de la reclamación, cambiar el correo no retira la propiedad ni permite transferirla con el correo anterior.
- README y diálogo de compartir actualizados con el checklist de remix.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (36 archivos / 158 tests) y `npm run build` correctos.
- Tests de instancia sin `OWNER_EMAIL`, primer arranque, cambio de correo y no transferencia a otra cuenta.
- Migración `0028` aplicada en local; `instance_owner` contiene `local_seedy` / `seedy@sites.test`.
- Smoke autenticado: rol `owner`, `/api/administrators` y `/api/members` 200, tablero y pizarra en vivo sin error.
- Incluye la migración `0028`; debe aplicarse al publicar este hito.
- La versión publicada sigue siendo **1.1.18**; este hito queda pendiente de publicación.
- Roadmap de propiedad cerrado tras completar sus tres fases y reiniciado desde la plantilla.

## 2026-11-14 — Respuestas sin sesión uniformes en la API

**Estado:** Completada · Pendiente de publicación

### Cambios

- Nuevo `ProjectResolution`, `projectFailureResponse` y `resolveProject` con estados tipados.
- Las 12 rutas API usan el contrato común: **401** sin sesión, **403** sin acceso, **404** para proyecto/recurso inexistente y **400** para proyecto inválido.
- El mensaje sin sesión es común: «Inicia sesión para continuar.».
- `validProject` se retiró; `profile-update` usa `ProjectWithAccess`.
- Se mantienen el orden de origen, formato, autenticación y permisos en las mutaciones.
- `files/[id]` devuelve 403 cuando falta acceso al proyecto y mantiene 404 para archivos inexistentes.
- Documentado el contrato del socket de pizarra: 401 sin sesión, 400 parámetros inválidos, 404 proyecto/dueño/sin acceso, 503 sin bindings; 426 si no es WebSocket y cierre 1008 si se retira el acceso.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (34 archivos / 151 tests) y `npm run build` correctos.
- Peticiones sin cookie: 401 uniforme en las 11 rutas GET y en `uploads` POST con origen válido.
- Smoke autenticado: `/api/projects`, `/api/tasks`, `/api/space-apps` y `/api/boards` responden 200; tablero y pizarra en vivo cargan sin error.
- La versión publicada sigue siendo **1.1.18**; este hito queda pendiente de publicación.
- Roadmap de respuestas sin sesión cerrado tras completar sus tres fases y reiniciado desde la plantilla.

## 2026-11-14 — Herramientas de aula carga por pestañas

**Estado:** Publicada en 1.1.18

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
- Publicada en la versión **1.1.18**.
- Roadmap de carga por pestañas cerrado tras completar sus tres fases y reiniciado desde la plantilla.

## 2026-11-14 — Reintento de pizarra recupera la vista

**Estado:** Publicada en 1.1.18

### Cambios

- `useWhiteboard` limpia el error de carga cuando la petición de `/api/boards` termina correctamente.
- Tras un fallo de red, «Reintentar» vuelve a mostrar el lienzo; si el reintento falla, el mensaje sigue visible.
- Añadida la regresión en `use-whiteboard.test.tsx` y un nuevo `whiteboard.test.tsx` con el canvas simulado.
- No cambian el guardado, la fusión de escenas, el socket, la presencia ni los permisos.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (32 archivos / 137 tests) y `npm run build` correctos.
- Smoke real: primer GET de pizarra forzado a 500, aviso y «Reintentar» visibles; segundo GET correcto, lienzo recuperado y aviso eliminado. Sin cambios en la base.
- Publicada en la versión **1.1.18**.
- Roadmap del reintento cerrado tras completar su única fase y reiniciado desde la plantilla.

## 2026-11-14 — Componentes grandes divididos por responsabilidad

**Estado:** Publicada en 1.1.18

### Cambios

- Auditoría de Aula Store, calculadora, Mermaid, diálogo de tarea, Blockly y Whiteboard; sin cambios de diseño, contratos, permisos ni comportamiento.
- Aula Store: filtros, tarjeta, detalle, éxito y modelo extraídos.
- Calculadora: teclas, hook de estado, teclado e historial; `edu-evaluate` sigue siendo la única fuente de cálculo.
- Mermaid: plantillas, render y hook de vista previa.
- Diálogo de tarea: formulario, responsables, detalle y pizarra con carga lazy.
- Blockly: toolbox, starter, worker aislado, panel de código y hook del workspace.
- Whiteboard: modelo, hook de sincronización/presencia y lienzo de Excalidraw.
- Tests de caracterización añadidos para Mermaid, Blockly y Whiteboard.
- Publicada en la versión **1.1.18**.

### Verificación

- `npm run lint`, `npx tsc --noEmit`, `npm test` (31 archivos / 136 tests) y `npm run build` correctos.
- Smoke visual: Aula Store (búsqueda, filtro y ficha), calculadora (7+5=12 e historial), Diagramas/Mermaid (editor y SVG), Kanban y tarea (resumen, asignaciones, pizarra y ampliación), Blockly (ejemplo, código y salida) y pizarra de `Mi espacio`.
- Mermaid se abrió con una respuesta de instalación simulada solo en el navegador; la API confirmó después que sigue desinstalada y no se alteró la base.
- Bundle inicial: 381,2 KB sin comprimir (113,3 KB gzip) y solo framework/runtime. Aula Store y las cuatro apps siguen en chunks lazy; ninguna está en el cierre estático de la entrada.
- Roadmap de componentes cerrado tras completar todas sus fases y reiniciado desde la plantilla.

## 2026-11-14 — Tareas separadas en consultas, permisos y mutaciones

**Estado:** Publicada en 1.1.18

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
