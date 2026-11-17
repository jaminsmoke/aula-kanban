# Changelog

> **Regla:** Las entradas nuevas van arriba. Lo más antiguo queda al final.
> **Roadmap:** STORE-15 activo · **Backlog:** [`backlog.md`](backlog.md)
> Las versiones anteriores a `1.1.16` se conservan como hitos funcionales sin número de versión asociado.

---

## 2026-11-17 — Roadmap STORE-14 · Hoja de cálculo en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Hoja de cálculo se incorpora con `jspreadsheet-ce` 5.0.4 (MIT): celdas editables, fórmulas, formato esencial, filas y columnas ampliables y presupuesto de ejemplo.
- Datos, fórmulas y estilos se guardan por proyecto en `app_documents`; la carga valida el documento, descarta estados incompletos y los invitados quedan en solo lectura.
- Exportación CSV local con protección de celdas que empiezan por `=`, `+`, `-` o `@`; navegación por teclado, foco visible y adaptación a móvil.
- Portada `public/store/hoja-calculo.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.9.0`; el Site sigue en `1.1.35`.
- Declaración MCP sin herramientas propias; ayuda, matriz de herramientas, catálogo y documentación actualizados. Aviso MIT de `jspreadsheet-ce` añadido. La demo no cambia.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px con la portada, versión `1.0.0` y upstream `jspreadsheet-ce 5.0.4`; la app se instaló, abrió, guardó y recuperó con datos y formato en un proyecto local.
- La app se revisó a pantalla completa a 1366, 1024 y 390 px: fórmulas, formato, CSV, reinicio desde la copia canónica y modo invitado cubiertos por pruebas.
- Chunk diferido: `hoja-calculo-app` 487.452 B / 128.764 B gzip, CSS 21.140 B / 5.405 B gzip y portada 4.292 B; todo se sirve desde `dist/client`.
- Suite completa: **177 archivos / 1.276 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `d4ca41e` (Fase 1), `74c5ccb` (Fase 2) y el commit de cierre. Push único a `github main`; sin publicación en Sites ni cambio de versión del Site: sigue en **1.1.35**.

### Seguimiento

- El backlog queda con STORE-15 (Notas y documentos) y STORE-16 (Visor Office); después se añade DEV-01 para evaluar pnpm sin cambiar el flujo actual. El plan completo está en [`historial/roadmap-store-14.md`](../historial/roadmap-store-14.md).

---

## 2026-11-17 — Publicación 1.1.35

**Estado:** Publicada en Sites.

- Publicadas las mejoras de cabecera y las ocho apps nuevas de Aula Store: Ajedrez, Tarjetas de repaso, Física 2D, Geometría interactiva, Mapas conceptuales, Presentaciones, Moléculas 3D y Líneas de tiempo.
- Verificados el tablero de Curso IA Gestorex y el catálogo publicado: 13 apps disponibles, con las dos instalaciones existentes conservadas.
- Comprobaciones: 1.261 pruebas, TypeScript, ESLint, compilación y presupuesto de rendimiento. El medidor admite rutas de dependencias resueltas mediante una unión de Windows.
- No hay migraciones de base de datos en esta publicación. PROMO-01 queda cerrado: la validación externa de la tarjeta social se da por completada.

---

## 2026-11-17 — Roadmap STORE-13 · Líneas de tiempo en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Líneas de tiempo se incorpora con `vis-timeline` 8.5.6 en su opción MIT: eventos, épocas, grupos, zoom, paneo y plantillas histórica y de proyecto.
- Documento por proyecto en `app_documents` con eventos, épocas y rango visible; validación defensiva y modo lectura para invitados.
- Control por teclado, foco visible, reducción de movimiento y estados de carga, error y visor no disponible.
- Portada `public/store/timeline.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.8.0`.
- Declaración MCP sin herramientas propias porque la edición vive en el navegador; ayuda, matriz de herramientas, catálogo y documentación actualizados. Aviso MIT de `vis-timeline` añadido. Sin cambios en la demo.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px, con la portada, versión `1.0.0` y upstream `vis-timeline 8.5.6`. La demo es de solo lectura y no permite instalar; la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo.
- La app se revisó a pantalla completa a 1366, 1024 y 390 px: plantillas, eventos, épocas, guardado, modo invitado y teclado.
- Chunk diferido: `vis-timeline` 541,6 KB / 154,8 KB gzip, app 17,9 KB / 5,6 KB gzip, CSS 26,6 KB / 4,8 KB gzip y portada 4,47 KB; todo se sirve desde `dist/client`.
- Suite completa: **175 archivos / 1.261 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `7264567` (roadmap), `e17847b` (Fase 1), `fc7b12a` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda sin entradas pendientes. El plan completo está en [`historial/roadmap-store-13.md`](../historial/roadmap-store-13.md).

## 2026-11-17 — Roadmap STORE-12 · Moléculas 3D en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Moléculas 3D se incorpora con `3Dmol` 2.5.5 (BSD-3): visor local con rotación, zoom, etiquetas y ficha con fórmula.
- Biblioteca curada de ocho estructuras SDF (agua, metano, amoniaco, etanol, benceno, cafeína, aspirina y glucosa), servida desde el bundle y con atribución de PubChem.
- Control por teclado con flechas, `+`/`−` y `0`; foco visible, reducción de movimiento y estados de carga, error y WebGL no disponible.
- Portada `public/store/moleculas.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.7.0`.
- Declaración MCP sin herramientas propias porque la vista vive en el navegador; ayuda, matriz de herramientas, catálogo y documentación actualizados. Aviso BSD-3 de `3Dmol` añadido. Sin cambios en la demo.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px, con la portada, versión `1.0.0` y upstream `3Dmol 2.5.5`. La demo es de solo lectura y no permite instalar; la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo.
- La app se revisó a pantalla completa a 1366, 1024 y 390 px: ocho moléculas, rotación, zoom, etiquetas, teclado y glucosa en móvil.
- Chunk diferido: `3Dmol` 561,2 KB / 158,1 KB gzip, app 18,5 KB / 5,4 KB gzip, CSS 5,6 KB / 1,5 KB gzip y portada 5,28 KB; todo se sirve desde `dist/client`.
- Suite completa: **174 archivos / 1.246 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `89a5301` (roadmap), `a958462` (Fase 1), `b796a06` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-13. El plan completo está en [`historial/roadmap-store-12.md`](../historial/roadmap-store-12.md).

## 2026-11-17 — Roadmap STORE-11 · Presentaciones en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Presentaciones se incorpora con `reveal.js` 6.0.2 (MIT): editor Markdown, vista previa y modo presentación con navegación por teclado.
- Parser Markdown limitado y seguro, sin HTML crudo; plantillas Clase, Proyecto y En blanco.
- Guardado y carga por proyecto en `app_documents`, aviso de cambios sin guardar, modo lectura para invitados y exportación HTML autónoma.
- Portada `public/store/presentaciones.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.6.0`.
- Declaración MCP sin herramientas propias porque la edición vive en el navegador; ayuda, matriz de herramientas, catálogo y documentación actualizados. Sin cambios en la demo.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px, con la portada, versión `1.0.0` y upstream `reveal.js 6.0.2`. La demo es de solo lectura y no permite instalar; la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo.
- La app se revisó a pantalla completa a 1366, 1024 y 390 px: edición, plantillas, guardado/carga, modo invitado, modo presentación y exportación HTML.
- Chunk `presentaciones-app`: 128,2 KB sin comprimir / 34,5 KB gzip. CSS 61,2 KB / 12,6 KB gzip y portada 3,77 KB; todo se sirve desde `dist/client`.
- Suite completa: **172 archivos / 1.236 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `041afd4` (Fase 1), `22a8d7a` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-12 y STORE-13. El plan completo está en [`historial/roadmap-store-11.md`](../historial/roadmap-store-11.md).

## 2026-11-17 — Roadmap STORE-10 · Mapas conceptuales en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Mapas conceptuales se incorpora con `@xyflow/react` 12.12.1 (MIT): nodos y conexiones editables, zoom, paneo y controles de React Flow.
- Plantillas de mapa conceptual y mapa mental; guardado y carga por proyecto en `app_documents`, aviso de cambios sin guardar y modo lectura para invitados.
- Portada `public/store/mapas.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.5.0`.
- Declaración MCP sin herramientas propias porque la edición vive en el navegador; ayuda, matriz de herramientas, catálogo y documentación actualizados. Sin cambios en la demo.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px, con la portada, versión `1.0.0` y upstream `@xyflow/react 12.12.1`. La demo es de solo lectura y no permite instalar; la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo.
- La app se revisó a pantalla completa a 1366, 1024 y 390 px: nodos, conexiones, edición de etiquetas, plantillas, guardado/carga y modo invitado.
- Chunk `mapas-app`: 161,0 KB sin comprimir / 50,5 KB gzip. El CSS de React Flow y de la app suma 21,1 KB y la portada 4,05 KB; todo se sirve desde `dist/client`.
- Suite completa: **170 archivos / 1.222 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `7cbbc65` (Fase 1), `c91d1b0` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-11 a STORE-13. El plan completo está en [`historial/roadmap-store-10.md`](../historial/roadmap-store-10.md).

## 2026-11-17 — Roadmap STORE-08 · Geometría interactiva en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Geometría interactiva se incorpora con `jsxgraph` 1.14.3 en su opción MIT: puntos, segmentos, rectas, circunferencias, etiquetas y medidas dinámicas.
- Presets Libre, Triángulo, Circunferencia y Rectas; funciones Parábola, Seno y Recta con visibilidad independiente; arrastre de puntos y reinicio del lienzo.
- Portada `public/store/geometria.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.4.0`.
- Declaración MCP sin herramientas propias porque la escena es efímera; ayuda, matriz de herramientas, catálogo y documentación actualizados. Sin cambios en la demo.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px, con la portada, versión `1.0.0` y upstream `jsxgraph 1.14.3`. La demo es de solo lectura y no permite instalar; la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo.
- La app se revisó a pantalla completa a 1366, 1024 y 390 px: presets, funciones, medidas, ocultación y reinicio.
- Chunk `geometria-app`: 1.028,6 KB sin comprimir / 255,7 KB gzip. `jsxgraph.css` (4,71 KB) y la portada (4,11 KB) se sirven desde `dist/client`.
- Suite completa: **168 archivos / 1.208 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `1986ff1` (Fase 1), `935995b` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-10 a STORE-13. El plan completo está en [`historial/roadmap-store-08.md`](../historial/roadmap-store-08.md).

## 2026-11-17 — Roadmap STORE-07 · Física 2D en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Física 2D se incorpora con `matter-js` 0.20.0: gravedad, colisiones, muelle y péndulo en un lienzo manipulable.
- Reproducir/pausar, reiniciar, ajustar la gravedad, añadir pelotas y arrastrar cuerpos; la escena es efímera y no necesita servidor.
- Portada `public/store/fisica.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.3.0`.
- Declaración MCP sin herramientas propias; ayuda, matriz de herramientas y documentación del catálogo actualizadas. Sin cambios en la demo.

### Verificación

- Tienda, ficha y app revisadas a 1366, 1024 y 390 px; la app se instaló y abrió desde Aula Store.
- Suite completa: **166 archivos / 1.200 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `0fcabbc` (Fase 1), `03cc744` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-08 y STORE-10 a STORE-13. El plan completo está en [`historial/roadmap-store-07.md`](../historial/roadmap-store-07.md).

## 2026-11-17 — Roadmap STORE-09 · Tarjetas de repaso en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Tarjetas de repaso se incorpora con `ts-fsrs` 6.0.0: mazos y tarjetas compartidos por proyecto, repaso FSRS-7 y cuatro valoraciones.
- Los mazos y tarjetas se guardan en `app_documents`; el progreso de repaso vive en `localStorage` por proyecto y navegador, con la limitación visible en la app.
- Formulario de repaso con teclado (`Espacio` para mostrar, `1–4` para valorar), resumen de sesión y estados vacíos.
- Portada `public/store/tarjetas.svg`, ficha, registro lazy y entrada en «Mejores aplicaciones». `AULA_STORE_VERSION` sube a `1.2.0`.
- Declaración MCP sin herramientas propias; ayuda, matriz de herramientas y documentación del catálogo actualizadas. Sin cambios en la demo.

### Verificación

- Tienda, ficha y app revisadas a 1366, 1024 y 390 px; la app se instaló y abrió desde Aula Store.
- Suite completa: **165 archivos / 1.193 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `0ce21bc` (Fase 1), `6a9923b` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-07, STORE-08 y STORE-10 a STORE-13. El plan completo está en [`historial/roadmap-store-09.md`](../historial/roadmap-store-09.md).

## 2026-11-16 — Roadmap STORE-06 · Ajedrez en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Ajedrez se incorpora a Aula Store con `chess.js` 1.4.0 y `react-chessboard` 5.12.1: tablero, reglas completas, jaque, mate, tablas, historial, reinicio y coronación con elección de pieza.
- Dos modos: dos jugadores locales o rival aleatorio que solo elige movimientos legales, con estado «El rival está pensando…».
- Formulario **Mover con teclado** y foco visible como alternativa al clic y al arrastre.
- Portada `public/store/ajedrez.svg` en formato 1200×675, con paleta ámbar y área segura para el icono de la tarjeta.
- Registro en `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y «Mejores aplicaciones»; declaración MCP sin herramientas propias porque la partida vive en el navegador. `AULA_STORE_VERSION` sube a `1.1.0`.
- Ayuda, matriz de herramientas, documentación del catálogo y pruebas actualizadas. Sin cambios en la demo.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px; la app se instaló y abrió desde Aula Store, con la portada y el tablero completos.
- Suite completa: **162 archivos / 1.183 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `731a1c8` (Fase 1), `68fc249` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión del Site: sigue en **1.1.34**.

### Seguimiento

- El backlog queda con STORE-07 (Física 2D) y STORE-08 (Geometría interactiva). El plan completo está en [`historial/roadmap-store-06.md`](../historial/roadmap-store-06.md).

## 2026-11-16 — Roadmap STORE-05 · Portadas compuestas de Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Las cinco apps de Aula Store usan portadas SVG de 1200×675 con la misma jerarquía visual: degradado, título, subtítulo, píldora y una pieza de interfaz estilizada.
- Excalidraw, Programación por bloques y Diagramas dejan las capturas PNG con marco de macOS y estrenan SVG propios en azul, verde y coral; los tres PNG antiguos se retiraron.
- `cover` en `lib/native-apps.ts` apunta a los nuevos SVG. No cambian nombres, versiones, datos ni lógica de la Tienda.
- El bloque de texto de las cinco portadas se desplazó 50 px para que el icono de la tarjeta no tapara el nombre; también se corrigieron el texto desbordado de un bloque y las flechas del diagrama.

### Verificación

- Tienda y ficha revisadas a 1366, 1024 y 390 px: las cinco portadas cargan, el recorte 16:7 conserva título y arte, y no quedan referencias a los PNG.
- Suite completa: **160 archivos / 1.173 pruebas**; `tsc`, ESLint, build y `perf:budget` correctos.
- Commits: `7066de6` (Fase 1) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión: la instancia sigue en **1.1.34**.

### Seguimiento

- El backlog queda sin entradas aparcadas. El plan completo está en [`historial/roadmap-store-05.md`](../historial/roadmap-store-05.md).

## 2026-11-16 — Roadmap UI-02 · Reorganización de la cabecera y el remix en Ajustes

**Estado:** Completada · Sin publicación

### Cambios

- La cabecera se divide en tres zonas: marca anclada a la izquierda, navegación centrada con el botón de Clase en el centro geométrico y controles de proyecto/cuenta a la derecha. En 1024 y 390 la navegación pasa a una fila propia centrada.
- El remix deja el menú de proyecto y pasa a **Ajustes > Tu Site**, con una sección nueva de `SettingsSection`, URL canónica, tarjeta contextual y el mismo `RemixDialog` abierto desde `Board`.
- Se retiran `onRemix` y `.remix-action` del header y del desplegable de proyecto; la ayuda y el README remiten a Ajustes > Tu Site.
- El snapshot del catálogo MCP se actualiza porque el enum de secciones de Ajustes incluye `sitio`.

### Verificación

- Cabecera y Ajustes revisados a 1366, 1024 y 390 px; sin desbordes y con Clase centrada.
- Suite completa: **160 archivos / 1.173 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde (`tablero` 170.875 B, `basica` 132.657 B, `cientifica` 1.960.403 B gzip).
- Commits: `f78ef0f` (Fase 1), `1ff8771` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites y sin cambio de versión: la instancia sigue en **1.1.34**.

### Seguimiento

- Corrección posterior: PROMO-01 sigue pendiente de validación externa y está de nuevo en el backlog; su plan está en [`historial/roadmap-promo-01.md`](../historial/roadmap-promo-01.md).

## 2026-11-16 — Publicación 1.1.33

**Estado:** Publicada; demo no sembrada y oculta.

- Publicadas las mejoras de portada, páginas legales, carpetas personales y calculadora. La migración 0040 añade una columna nullable; Sites confirmó el despliegue.
- Lint, tipos, 1.159 pruebas y build correctos. El proyecto de clase sigue presente. El proyecto demo no se ha insertado: el conector disponible no permite escribir la D1. La portada oculta su enlace mientras falten datos.
- La petición HTTP directa sin sesión devolvió 403 de Sites; el acceso anónimo no se ha confirmado. PROMO-07B conserva la siembra y verificación pendientes, incluida la revisión de colisiones de ids en el SQL.

## 2026-11-16 — Roadmap PROMO-07 · Preparar la demo para producción

**Estado:** Completada · Pendiente de publicación

### Cambios

- `lib/domain/demo-data.ts` centraliza los datos ficticios con ids fijos; `scripts/seed-demo.mjs` los comparte y `npm run seed:demo` sigue igual.
- `lib/domain/demo-sql.ts` y `npm run seed:demo:sql` generan un SQL idempotente, limitado al proyecto demo, sin `instance_apps` y sin tocar otros proyectos. README documenta la copia, la revisión, la ejecución por Codex y la verificación.
- La portada oculta «Probar la demo» cuando el proyecto no existe (`lib/server/demo-availability.ts`), y `/demo` distingue la siembra local de la preparación autorizada de una instancia publicada.
- El SQL se probó dos veces en una D1 limpia con un proyecto ajeno; la demo abrió sin sesión, las escrituras respondieron 403 y el proyecto real y `instance_apps` no cambiaron.

### Verificación

- Suite completa: **159 archivos / 1.159 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde (`tablero` 170.714 B, `basica` 132.608 B, `cientifica` 1.960.353 B gzip).
- Portada y demo revisadas a 1366, 1024 y 390 px; sin demo la portada no muestra un enlace roto y `/demo` explica cómo prepararla.
- Commits: `d306551` (roadmap), `ce10d7c` (Fase 1), `bd59390` (Fase 2) y el commit de cierre. Push de cierre a `github main`; **publicación pendiente de Codex**: el Site sigue en **1.1.32**.

### Seguimiento

- El backlog queda solo con PROMO-01 pausado; no hay roadmap activo. Codex debe aplicar el SQL en la D1 publicada, verificar la demo sin sesión y publicar la versión.

## 2026-11-16 — Roadmap PROMO-06 · Primer resultado de la calculadora científica

**Estado:** Completada · Sin publicación

### Cambios

- `engine-status.ts` publica `idle | loading | ready | error` y `use-calculator` lo expone; el motor avisa al empezar, al terminar y al fallar, y la precarga ya no deja rechazos sin manejar.
- La calculadora muestra «Preparando el motor…» mientras descarga (con un retardo visual para no parpadear) y mantiene «Calculando…» al evaluar.
- La precarga se adelanta a la intención: 120 ms al enfocar o pasar por Científica/Ecuaciones, con cancelación al salir, y al abrir la calculadora si el último modo fue Científica. La Básica sigue sin precargar por defecto.
- Se evaluó el subpath `core` de `compute-engine`: importa los mismos chunks y falla 6 pruebas por no incluir el diccionario LaTeX, así que se revirtió. Se mantiene el motor completo; `mathjs` ya estaba descartado y un worker no reduce la descarga.
- `docs/rendimiento.md` recoge la nueva línea base y la decisión; README y ayuda explican el aviso y la precarga.

### Verificación

- Línea base con 5 muestras: Básica **3.442,6 / 147,8 / 3.594,9 ms**; Científica **3.416,9 / 9.685,4 / 13.124,3 ms**. `perf-latency` limpia `localStorage` y no simula hover, así que no mide la precarga por intención ni el modo recordado; el aviso sí se comprobó en navegador con Fast 3G.
- Suite completa: **156 archivos / 1.149 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde (`tablero` 170.713 B, `basica` 132.617 B, `cientifica` 1.960.363 B gzip).
- Commits: `4e81069` (roadmap), `6737579` (Fase 1), `9c0b120` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites: el Site sigue en **1.1.32**.

### Seguimiento

- El backlog queda solo con PROMO-01 pausado; no hay roadmap activo. PROMO-01 espera publicar y validar la tarjeta social.

## 2026-11-16 — Roadmap PROMO-05 · Modo demo sin cuenta, de solo lectura

**Estado:** Completada · Sin publicación

### Cambios

- Identidad fija de demo resuelta en el servidor (`lib/domain/demo.ts` y `lib/server/demo.ts`), nunca desde cabeceras del cliente. La cookie `__demo` la activa; la sesión real de ChatGPT tiene prioridad y la demo solo existe en el proyecto ficticio `22222222-…` con rol `guest`.
- Entrada `/demo` que fija la cookie y abre el tablero, salida `/demo/salir`, aviso con `npm run seed:demo` si falta el proyecto y banner «Estás viendo una demo» con enlace a la cuenta real.
- Solo lectura: todas las escrituras de la API responden 403 para la demo (tareas, pizarras, documentos, subidas, tokens MCP, preferencias, invitaciones, apps, libros, administradores, almacenamiento, MCP y proyectos); la interfaz oculta acciones, Tokens MCP y ajustes sensibles, no muestra correos y no abre sockets de presencia.
- «Probar la demo» en la portada, enlace en la ayuda, mención en privacidad y condiciones, y sección «Modo demo» en README.

### Verificación

- D1 limpia temporal: `/demo` respondió `404` con la orden de siembra; tras sembrar, `303` con cookie y tablero `200` con el banner. Recorridas tareas, calendario y administración a 1366, 1024 y 390 px en claro y en oscuro, sin desbordes ni acciones de escritura.
- `POST /api/tasks`, `PUT /api/personal-apps`, `POST /api/mcp/tokens` y `POST /api/projects` respondieron 403; las lecturas, 200. Suite completa: **155 archivos / 1.143 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde. Flujo `tablero` **170.706 B gzip** (límite 175.656 B).
- Commits: `f32c060` (roadmap), `b212e98` (Fase 1), `825d149` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites: el Site sigue en **1.1.32**.

### Seguimiento

- PROMO-06 (primer resultado de la calculadora) sigue en el backlog; PROMO-01 permanece pausado hasta publicar y validar la tarjeta social.

## 2026-11-16 — Roadmap PROMO-04 · Privacidad, condiciones y archivos de rastreo

**Estado:** Completada · Sin publicación

### Cambios

- Páginas públicas `/privacidad` y `/condiciones` sin sesión, con metadatos propios, canónica y un componente compartido `app/legal/legal-page.tsx` y `app/legal/legal.css` con tokens. El texto describe los datos reales del esquema (identidad de ChatGPT, proyectos y miembros, tareas y asignaciones, fichas, archivos en R2, pizarras, documentos de apps, preferencias, tokens MCP/OAuth y auditoría) y las condiciones de uso, con contacto `jorgemd@siberia.solutions`.
- Enlaces a las dos páginas desde el pie de la portada y desde la ayuda («Pedir ayuda»), con un bloque `links` nuevo en la documentación.
- `app/robots.ts` sirve `/robots.txt` con `Allow: /` y exclusiones de `/api/`, `/mcp`, `/.well-known/`, `/oauth/` y `/sesion`; `app/sitemap.ts` sirve `/sitemap.xml` con solo `/`, `/documentacion`, `/privacidad` y `/condiciones`; `app/manifest.ts` sirve `/manifest.webmanifest` con iconos PNG 192 y 512 en `public/icons/`, generados desde el favicon. El layout enlaza el manifest.
- README documenta las rutas públicas, dónde vive el texto legal y cómo añadir una ruta al sitemap y al manifest.

### Verificación

- Build servida en `127.0.0.1:8791` con una D1 limpia temporal: `/privacidad` (31.408 B) y `/condiciones` (26.714 B) responden `200 text/html` con canónica absoluta y `<link rel="manifest">`; `/robots.txt` (181 B), `/sitemap.xml` (653 B) y `/manifest.webmanifest` (618 B) responden `200` con su `Content-Type`, y los iconos pesan 2.324 y 10.630 B.
- Suite completa: **150 archivos / 1.127 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde. Flujo `tablero` **170.233 B gzip** (límite 175.656 B).
- Páginas legales revisadas a 1366, 1024 y 390 px en claro y oscuro, sin desbordes.
- Commits: `1b0cdeb` (roadmap), `feecb0f` (Fase 1), `371b17b` (Fase 2) y el commit de cierre. Push de cierre a `github main`; sin publicación en Sites: el Site sigue en **1.1.32**.

### Seguimiento

- PROMO-05 (modo demo sin cuenta) y PROMO-06 (primer resultado de la calculadora) siguen en el backlog; PROMO-01 permanece pausado hasta publicar y validar la tarjeta social.

## 2026-11-16 — Roadmap PROMO-03 · Proyecto de demo versionado y capturas nuevas

**Estado:** Completada · Sin publicación

### Cambios

- `scripts/seed-demo.mjs` y `npm run seed:demo` crean o actualizan el proyecto fijo `22222222-2222-4222-8222-222222222222` («Proyecto de demostración») con 6 alumnos, 2 profesores, 8 tareas repartidas en las cuatro columnas (25 % completadas), las cinco apps instaladas, una pizarra, un diagrama y un programa de bloques. La segunda ejecución no duplica nada y no toca otros proyectos.
- La semilla admite `--dry-run`, limita `--base-url` a `localhost`/`127.0.0.1` y rechaza cualquier origen remoto antes de conectar. Usa la sesión local de desarrollo (cookie `__sites_local_auth` y cabeceras `local_seedy`), sin cuentas reales ni tokens.
- `public/capturas/{tareas,calendario,espacio,ajustes}.webp` se rehicieron desde ese proyecto con la interfaz actual: 1200 px, entre 20 y 45 KB, Ajustes recortado a Cuenta. La ayuda actualiza `alt` y pies en `tasks.ts` y `workspace.ts`; la imagen de Tienda pasa tras los pasos de Aula Store y el calendario ya no fija un mes.
- README documenta el comando de siembra, la guarda local y la advertencia de no ejecutarlo contra producción.

### Verificación

- Suite completa: **144 archivos / 1.113 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde. Flujo `tablero` **170.156 B gzip** (límite 175.656 B).
- D1 limpia temporal migrada hasta `0040_personal_folders.sql` y build servida en `127.0.0.1:8792`: el dry-run mostró el plan, la siembra dejó 6 alumnos, 2 profesores, 8 tareas (2 por estado) y 5 apps, y la segunda ejecución respondió «sin cambios». El tablero servido a 1366 px muestra el proyecto de demostración, el 25 % y dos tareas por columna.
- Las cuatro rutas de `public/capturas/` responden `200 image/webp`; la ayuda se revisó a 1366, 1024 y 390 px sin desbordes.
- Commits: `21a6a2c` (Fase 1), `fc548cb` (cookie local), `7a3add8` (Fase 2) y el commit de cierre. Sin push ni publicación: el Site sigue en **1.1.32**.

### Seguimiento

- PROMO-04..06 permanecen en el backlog; PROMO-05 reutilizará este proyecto de demostración. PROMO-01 sigue pausado hasta publicar y validar la tarjeta social.

## 2026-11-16 — Roadmap PROMO-02 · Portada pública nueva

**Estado:** Completada · Sin publicación

### Cambios

- `app/portada.tsx` pasa de tarjeta de acceso a una portada de producto: héroe, tres bloques (tareas y calendario, personas y materiales, pizarras y apps), panel del plugin y pie con documentación. No muestra datos de cuentas ni proyectos.
- `app/portada.css` compone la portada con tokens, una previsualización estática del tablero y un panel de conversación; se importa solo desde `portada.tsx` y no añade cliente, `HeroArt` ni `motion`.
- El acceso conserva `chatGPTSignInPath(returnTo)` y `<a target="_top">`; el enlace a `/documentacion` y el mensaje se mantienen alineados con `SITE_DESCRIPTION`.
- README documenta la portada y la comprobación pública; se actualiza el inventario de CSS. Sin migraciones ni cambio de versión.

### Verificación

- Suite completa: **144 archivos / 1.113 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde.
- `perf:budget`: flujo `tablero` **170.136 B gzip** (límite 175.656 B), 18 B menos que la línea base de 170.154 B; el resto de flujos conserva sus límites.
- Build servida: `/`, el enlace profundo con `returnTo`, `/documentacion` y `/og/aula-kanban.png` responden `200`; la imagen mide 1200×630 y pesa 123.510 bytes; Open Graph y Twitter Card siguen completos.
- Navegador local a **1366×900**, **1024×900** y **390×900**, en claro y oscuro: `scrollWidth === clientWidth`, sin desbordes; el CTA queda a 543, 535 y 386 px.
- Commits: `aa7242b` (Fase 1), `12a0ad8` (Fase 2) y el commit de cierre documental. Sin publicación en Sites; el Site sigue en **1.1.32**.

### Seguimiento

- PROMO-01 sigue pausado hasta publicar y validar la tarjeta social; PROMO-03..06 permanecen en el backlog.

## 2026-11-16 — Roadmap APP-03B · Carpetas personales en mochila y maletín

**Estado:** Completada · Sin publicación

### Cambios

- `app_preferences` gana `folder` (migración local `0040_personal_folders.sql`): una app pertenece como máximo a una carpeta por usuario y proyecto. La API normaliza el texto, admite hasta 40 caracteres, convierte vacío o ausente en `null` y devuelve la carpeta en `GET`/`PUT /api/personal-apps`.
- El escritorio personal agrupa por carpeta respetando el orden personal, muestra un icono de carpeta propio y abre cada carpeta como ventana con sus apps; las apps siguen abriendo sus ventanas y la carpeta «Libros» queda independiente. Las carpetas vacías desaparecen y sus ventanas se filtran.
- El organizador permite escribir una carpeta por app y guardar sin salir del escritorio; mantiene un borrador local para no perder cambios con el refresco de 10 s. La mochila conserva `Backpack` y el maletín `Briefcase`.
- Las ventanas personalizadas usan su tamaño declarado (`tool.window`), lo que ajusta las ventanas de carpeta y organizador; la ayuda, la matriz de herramientas y la documentación se actualizan.

### Verificación

- Suite completa: **142 archivos / 1.106 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde.
- Migración `0040` aplicada en local y comprobada con guardado, relectura y agrupación reales. No se aplicó en remoto ni se publicó en Sites; el Site sigue en **1.1.32**.
- Navegador a **1366×900** y **390×844**, en claro y oscuro: escritorio con carpeta, ventana con sus dos apps, organizador y ausencia de desbordamiento horizontal; consola sin excepciones.

## 2026-11-16 — Publicación 1.1.32

- La migración 0039, aún no aplicada en la instancia publicada ni en la base local principal, se ajusta a solo esquema. El traslado de `edu-tools` se ejecuta fuera de la migración: la instalación mediante lote atómico y las preferencias por usuario y proyecto, sin sobrescribir valores nuevos y de forma repetible.
- Se probaron instalación previa, desinstalación, preferencias existentes y repetición; las migraciones de esquema se aplicaron en local y producción. Sites confirmó la publicación; navegación, 17 alumnos y catálogo de cinco apps comprobados. Lint, tipos, build y 1.104 pruebas correctos.

## 2026-11-16 — Roadmap APP-02 · Calculadora y Tabla periódica independientes

**Estado:** Completada · Sin publicación

### Cambios

- Aula Store pasa a **cinco apps**: Excalidraw, Calculadora, Tabla periódica, Programación por bloques y Diagramas. Cada una tiene ficha, portada, icono, ventana y carga diferida propios; `upstream` es opcional y la tabla es integración propia. La calculadora conserva `@cortex-js/compute-engine`.
- Se retiran **Medir y Lectura** —vistas, medidor, lector de voz, estilos, pruebas y referencias— y se elimina `@smst/edu-tools` del proyecto (180 paquetes menos en el lock). El código se reparte en `apps/calculadora/` y `apps/tabla-periodica/`, con una base CSS compartida.
- `consultar_elemento` pasa a exigir `tabla-periodica`; la calculadora declara su superficie MCP como pendiente. El catálogo sube a **`0.28.0`** con snapshot, matriz, paridad y guía actualizados.
- **Transición de datos:** si `edu-tools` estaba instalada, crea las dos apps instaladas conservando versión; copia favorito y posición por usuario y proyecto y retira las filas antiguas. Es idempotente y no pisa filas nuevas. La migración `0039` queda limitada al esquema. Alias `edu-tools` → `calculadora` en URL, `buildBoardUrl`, `abrir_app`, enlaces y canal en vivo.
- Ayuda, README, `aplicaciones-nativas.md`, `matriz-herramientas.md`, `mcp-apps.md`, estilos y rendimiento actualizados. La Tienda lista las cinco apps y la ficha de la tabla no atribuye un paquete que no usa.

### Verificación

- Suite completa: **142 archivos / 1.104 pruebas**; `tsc`, ESLint, build y `perf:budget` en verde. El presupuesto mantiene todos los flujos por debajo de su límite; Calculadora Básica queda en **131.984 B gzip** y Científica/Ecuaciones en **1.959.729 B**.
- Navegador local a **1366×900** y **390×844**, en claro y oscuro: cinco apps en Tienda, instalación y desinstalación independientes, Calculadora y Tabla periódica abiertas, alias `?app=edu-tools` resuelto a `calculadora`, sin desbordamiento de página a 390 px. La revisión encontró un aviso de claves duplicadas en las galerías de categoría y se corrigió; la consola queda limpia.
- Latencia real sobre la build servida (Fast 3G, 5 muestras): Básica **3.535,7 ms** totales; Científica **13.051,2 ms**, con la descarga de `compute-engine` en el primer resultado.
- Commits: `8ca4c18` (Fase 1), `5e95754` (Fase 2), `fab2c53` (Fase 3) y el commit de cierre de esta fase. Sin publicación en Sites ni cambio de versión del Site (`1.1.31`).

### Seguimiento

- **APP-03** (carpetas e iconos de mochila/maletín) sigue pendiente de priorizar y ya usa los ids `calculadora` y `tabla-periodica`; la transición conserva sus preferencias. No hay más entradas.

## 2026-11-16 — Roadmap PERM-02 · Secciones de permisos en Ajustes y Administración

**Estado:** Completada · Sin publicación

### Cambios

- La matriz PERM-01 deja de ser solo documentación y se ve en la aplicación desde una **fuente única**, `lib/domain/permisos.ts` (ocho capacidades con ámbito, título, descripción y roles), que evalúa el servidor en `lib/server/capabilities.ts` y consumen ambas superficies.
- Ajustes gana la sección **«Permisos»** (entre Administradores y Almacenamiento, solo dueño/administración): matriz de instancia de solo lectura con quién posee cada capacidad y notas de no delegación. `permisos` se añade a `SettingsSection`/`SETTINGS_SECTIONS` y `obtener_enlace` la acepta; una cuenta sin rol global no la ve y su URL vuelve a Cuenta con `replaceState`.
- Profesores y Alumnos ganan la pestaña **«Permisos»** junto a Miembros y Herramientas, con su misma visibilidad y estado local, y un panel compartido (`permissions/project-permissions-panel.tsx`): matriz de proyecto (Administración, Profesorado, Alumnado e Invitado) y rol efectivo de las fichas con cuántas de las cuatro capacidades tiene cada una. Sin controles editables: no hay concesiones que persistir.
- Ayuda, `docs/Store/matriz-permisos.md` y snapshot del catálogo MCP actualizados. Sin migraciones, sin cambio de versión (`1.1.31`) y sin publicación en Sites.

### Verificación

- Suite completa: 140 archivos / 1.101 pruebas; `tsc`, ESLint completo y build en verde.
- Navegador local con identidad de desarrollo a 1366×900 y 390×844, en claro y oscuro: pestaña «Permisos» con `aria-current` y las tres pestañas visibles; matriz completa a 1366 (860 px) y sin desbordamiento de página a 390 (`scrollWidth` = 390), con la tabla desplazándose dentro de su contenedor. La revisión encontró que la tercera pestaña se cortaba a 390 px y se corrigió con `flex-wrap` en `.people-tabs`. Sin errores de consola.
- Commits: `093c130` (apertura), `33589b8` (Fase 1), `088e0f5` (Fase 2) y `ef71b73` (Fase 3); el cierre queda en el commit de documentación.

### Seguimiento

- **APP-03** (carpetas e iconos de mochila/maletín) sigue pendiente de priorizar; **APP-02** sigue aparcada. No hay más entradas.

## 2026-11-16 — Roadmap PERM-01 · Matriz y delegación de permisos

**Estado:** Completada · Sin publicación

### Cambios

- Matriz aprobada en [`matriz-permisos.md`](../Store/matriz-permisos.md): capacidades con ámbito (instancia/proyecto/app/sujeto), roles predeterminados y concesiones revocables, con denegación por defecto, control del servidor y revocación inmediata. La instalación global sigue reservada al dueño y a administradores de instancia; el profesor por sí solo nunca la concede.
- Control autoritativo centralizado en `lib/server/capabilities.ts` (`evaluarCapacidad` pura + `tieneCapacidad` por petición, sin caché) y conectado a `POST /api/space-apps`, MCP `instalar_app`/`desinstalar_app` y `PUT /api/project-books`; `SpaceRoom` revalida la pertenencia por mensaje (como `BoardRoom`), así que una baja revoca en la siguiente llamada. Sin esquema nuevo y sin permisos nuevos que conceder.
- Ubicación validada sin UI nueva: proyectos en Administración (miembros existentes) e instancia en Ajustes > Administradores (existente); se descarta la sección «Ajustes > Permisos» por falta de almacenamiento de concesiones. Revisión de la matriz en `fef94dc`.
- Sin cambios de versión (`1.1.31`); la publicación en Sites la realiza Codex. APP-03 (seguimiento) queda pendiente en el backlog; APP-02 sigue aparcada.

### Verificación

- Suite completa: 138 archivos / 1.085 pruebas (nueva `capabilities.test.ts` con la matriz, profesor denegado/profesor-administrador permitido y sin privilegios cruzados); `tsc`, ESLint completo y build en verde.
- Dev local en `http://127.0.0.1:5173` responde 200; controles existentes sin cambios de UI (nada que comprobar a 390 px en código nuevo).
- Commits: `7e3a8e5` (Fase 1), `2a09836` (Fase 2), `fef94dc` (revisión); el cierre queda en el commit de documentación.

## 2026-11-16 — Roadmap STORE-03B · Barra inferior y galerías horizontales en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Aula Store se navega con una **barra inferior fija** (Todo + Educación/Oficina/Productividad, en `.store-shell` con el catálogo en scroll propio): la categoría activa se marca con `aria-current`, la barra no se pierde al hacer scroll y los chips de categoría superiores se retiran; arriba quedan solo búsqueda e Instaladas, combinable con cualquier categoría.
- Cada categoría presenta sus apps en **galerías horizontales por subcategoría** (`StoreGallery`: scroll nativo con snap, fade lateral con máscara CSS solo si desborda y sin scrollbar visible). Educación: Pizarras/Diagramas/Herramientas; Productividad: Diagramas/Programación (Diagramas en ambas, vocabulario compartido); Oficina, vacía, muestra «Más adelante» sin galería. «Mejores aplicaciones» es la galería de cabecera de Todo; la búsqueda en Todo sigue en rejilla.
- Sin cambios de taxonomía, apps, libros ni versión (`1.1.31`); la publicación en Sites la realiza Codex.

### Verificación

- Suite completa: 137 archivos / 1.079 pruebas; `tsc`, ESLint completo y build en verde.
- Dev local en `http://127.0.0.1:5173` responde 200; a 390 px la barra cabe (4 tabs flex) y las tarjetas de galería (272 px, `max-width: 78vw`) se desplazan sin desbordar; el cambio de categoría y las galerías quedan cubiertos por tests (suite de catálogo 7/7).
- Commits: `7805049` (Fase 1), `959ac48` (Fase 2); el cierre queda en el commit de documentación.

## 2026-11-16 — Roadmap STORE-03A · Taxonomía de la Tienda por familias de uso (multi-categoría)

**Estado:** Completada · Sin publicación

### Cambios

- Las categorías de Aula Store pasan a ser familias de uso — **Educación, Oficina, Productividad** (Oficina nace vacía) — con multi-categoría por app (`categories: string[]`) y **subcategorías de vocabulario compartido** (Pizarras, Diagramas, Programación, Herramientas).
- Asignaciones iniciales: Excalidraw → Educación/Pizarras; Herramientas de aula → Educación/Herramientas; Programación por bloques → Productividad/Programación; **Diagramas → Educación y Productividad** (primera app en dos categorías). «Aula» desaparece como categoría.
- Tienda según la nueva taxonomía: filtros con conteos coherentes (Oficina siempre visible con 0), secciones por categoría con aviso «Más adelante» en vacías, tarjeta con subcategoría y ficha con las categorías principales.
- Contrato MCP: `listar_apps`/`obtener_app` devuelven `categorias` + `subcategoria`; sin referencias viejas en `mcp-apps.md` ni en la ayuda; documentado en `docs/Store/aplicaciones-nativas.md`.

### Verificación

- Suite completa: 137 archivos / 1.078 pruebas; `tsc`, ESLint y build en verde.
- Navegador local: «Mejores aplicaciones» (4), Educación (3) y Productividad (2, con Diagramas en ambas), Oficina (0 con «Más adelante») y filtros correctos; sin regresión en búsqueda e instaladas; a 390 px, una columna.
- Commits: `2fc91fe` (Fase 1), `dfa742f` (Fase 2); el cierre queda en el commit de documentación.

## 2026-11-16 — Roadmap STORE-04 · Herramientas asignables por proyecto

**Estado:** Completada · Sin publicación

### Cambios

- Libros dejan de ser una sección de la Tienda y pasan a ser una herramienta asignable por proyecto: la pestaña «Libros» y la vista se retiran de Aula Store; queda como única puerta la carpeta «Libros» en la mochila del alumnado y el maletín docente.
- Modelo `project_books` (proyecto × libro) con migración local 0038 y `PUT /api/project-books` (owner/admin/profesor del proyecto; alumnos e invitados 403): cada proyecto decide su subconjunto de libros.
- Administración → Profesores y Alumnos gana pestañas «Miembros»/«Herramientas» con el panel «Libros» (toggle maestro y selección por nivel), visible solo para quien gestiona el proyecto.
- Carpeta «Libros» en el escritorio personal con visor embebido de **solo lectura** (sin descarga): iconos y ventanas desaparecen al deshabilitarse. El catálogo, R2 y rutas de STORE-02 se conservan; la ingesta remota la hace Codex al publicar.

### Verificación

- Suite completa: 137 archivos / 1.077 pruebas; `tsc`, ESLint y build en verde (con `GET|PUT /api/project-books`).
- Navegador local: pestaña «Herramientas» en Alumnos con guardado, icono Libros en la mochila con 10 filas y visor del PDF a pantalla completa; Tienda solo con Aplicaciones (filtros y secciones intactos).
- Commits: `464056f` (Fase 1), `38d6019` (Fase 2), `f9d6001` (Fase 3); el cierre queda en el commit de documentación.

## 2026-11-16 — Roadmap STORE-02 · Vista Libros con persistencia propia en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Catálogo curado `lib/books.ts`: 10 títulos de Matemáticas de Textos Marea Verde (CC BY-NC-SA), ESO 1º–4º y Bachillerato, con procedencia (fuente, URL, licencia y atribución), clave versionada en R2 y portada/contraportada. Ningún libro comercial con copyright.
- Persistencia propia en R2 (`site-creator-r2`): claves `books/<id>/<fecha>.pdf` y `-cover.jpg`/`-back.jpg` inmutables; scripts `scripts/ingest-books.mjs` y `scripts/extract-book-covers.mjs` (+ `scripts/rasterize-pages.py` con PyMuPDF) para ingerir y extraer, y rutas `GET /api/books`, `GET /api/books/<id>/file` y `GET /api/books/<id>/image` con la membresía activa exigida. La ingesta remota la hace Codex al publicar.
- Vista «Libros» en Aula Store: pestaña habilitada, secciones por nivel, tarjetas con portada, ficha con portada, contraportada, licencia y atribución, visor PDF en ventana propia y descarga; «Aplicaciones» intacta. Documentación en `docs/Store/libros.md`.

### Verificación

- Suite completa: 134 archivos / 1.066 pruebas; `tsc`, ESLint y build en verde (con las 3 rutas nuevas).
- Navegador local: catálogo con procedencia, 10/10 tarjetas con portada, ficha con portada y contraportada, ventana del visor con el PDF y atribución; rejilla auto-plegable a 390 px (una columna).
- Commits: `7caaf8d` (Fase 1), `5e3d4fa` (Fase 2), `743b7ce` (Fase 3), `4af0ba4` (portadas); el cierre queda en el commit de documentación.

## 2026-11-16 — Roadmap STORE-01 · Vistas y secciones físicas en Aula Store

**Estado:** Completada · Sin publicación

### Cambios

- Aula Store tiene vistas: «Aplicaciones» activa y «Libros» deshabilitada con «Próximamente» (STORE-02, sin contenido fingido).
- En Aplicaciones, el inicio muestra «Mejores aplicaciones» (lista curada `FEATURED_APP_IDS` en `store-model.ts`) y una sección física por categoría (Aula, Pizarras, Programación, Diagramas) con la tarjeta existente; al buscar o filtrar vuelve la rejilla única de resultados.
- Ficha de detalle, acciones y roles sin cambios; ayuda de workspace actualizada. La taxonomía nueva (Educación, Oficina, Productividad…) queda en el backlog como STORE-03.

### Verificación

- Suite completa: 128 archivos / 1.045 pruebas; `tsc`, ESLint y build en verde.
- Navegador local: pestañas, «Mejores aplicaciones» (4) y secciones por categoría (1 app cada una).
- Commits: `78e98ac` (apertura), `c6f97c4` (Fases 1-2); el cierre queda en el commit de documentación.

## 2026-11-15 — Roadmap APP-03 · Mochila del alumnado y maletín docente

**Estado:** Completada · Sin publicación

### Cambios

- Fase 1: definición de espacios y datos — la mochila y el maletín son una única capa de organización personal (favoritos y orden) sobre las apps instaladas, con alcance por usuario y proyecto activo; la presentación la decide el rol en el proyecto activo, sin prometer aislamiento de los documentos compartidos.
- Fase 2: diseño del acceso y el catálogo personal — entrada desde la cabecera junto a Clase como sección nueva de Clase; tres capas (instalación de instancia, herramientas disponibles según APP-01, selección personal) con ruta propia separada de `/api/space-apps`.
- Fase 3: implementación — migración 0037 crea `app_preferences` (proyecto, usuario, app, favorito, posición); ruta `/api/personal-apps` (GET/PUT) con membresía activa exigida y rechazo de apps no instaladas, para que una selección personal nunca reinstale; sección `view=clase&section=mochila` con favorito y orden accesibles y aviso de que los documentos se comparten con el proyecto.
- La instalación global sigue siendo exclusiva de owner y administradores; Aula Store, `SpaceRoom`/`space-control`, `/api/space-socket`, la URL canónica de Tienda y su alias no cambian. No hay herramientas MCP nuevas y el catálogo queda en 0.27.0 (59 herramientas).

### Verificación

- Suite completa: 128 archivos / 1.042 pruebas; `tsc --noEmit`, ESLint, build y `perf:budget` en verde.
- Commits: `bd3038f` (apertura), `4f058fa` (Fase 1), `bff24ba` (Fase 2), `b08bda7` (Fase 3); el cierre queda en el commit de documentación.

### Seguimiento

- **PERM-01** sigue en el backlog: prerrequisito para cualquier capacidad nueva de autorización.
- **APP-02** sigue aparcada.
- La migración 0037 en remoto y la publicación en Sites las realiza Codex.

## 2026-11-15 — Publicación 1.1.31

**Estado:** Publicada en Sites.

- Publicadas las mejoras locales de navegación, Administración, Tienda, Documentación, estados vacíos y tablero. No hay migraciones nuevas.
- Verificación: lint, tipos, 1.026 pruebas y compilación correctos; la revisión visual y de enlaces previos está detallada en los roadmaps UI-07 y UI-08.

## 2026-11-15 — Roadmap APP-01 · Matriz de herramientas, roles y alcance

**Estado:** Completada · Sin publicación

### Cambios

- Inventario completo de las cuatro vistas de EduTools, Excalidraw, Blockly y Diagramas, con datos, estado local, permisos actuales y cobertura MCP.
- Matriz aprobable en [`matriz-herramientas.md`](../Store/matriz-herramientas.md): por defecto se deniega, la visibilidad no otorga permisos y las reglas se evalúan por proyecto.
- Regla de instalación global: solo owner y admin de instancia pueden instalar o desinstalar apps; el rol de profesor por sí solo no concede gestión global.
- No se crean herramientas exclusivas de profesor ni se separan las herramientas de EduTools. La mochila/maletín sigue en el backlog hasta tener permisos definidos.
- UI-09 se retira del backlog: las tarjetas y la ficha ya aplican la regla de instalación del servidor.
- Sin migraciones, sin cambio de versión y sin cambios de código de permisos en APP-01.

### Verificación

- Revisión de código y documentación; inventario y matriz coherentes con `visibleTools`, `app_documents`, `instance_apps`, la autorización de pizarras y la cobertura MCP.
- `git diff --check` en verde. Sin suite de código porque APP-01 no introduce cambios de comportamiento.
- Commits: `ff5f591` (apertura), `10b14a8` (inventario), `e2ee722` (matriz); el cierre queda en el commit de documentación.

### Seguimiento

- **PERM-01** pasa a roadmap activo.
- **APP-02** sigue aparcada.
- **APP-03** queda en backlog hasta que PERM-01 defina los permisos.

## 2026-11-15 — Roadmap UI-08 · Tienda en Administración y Clase en la cabecera

**Estado:** Completada · Sin publicación

### Cambios

- Tienda pasa a Administración como tercera sección, con URL canónica `view=administracion&section=tienda`, alias `view=espacio` y `app=<appId>`. La cabecera conserva Administración y recupera Clase como botón de icono; se retiran Mi espacio, la salida lateral y el botón duplicado del dock.
- El escritorio de apps se integra en el contenido del workspace: mide su caja con `ResizeObserver`, las ventanas abren, arrastran, redimensionan y maximizan dentro del área, y el dock solo conserva Aula Store y las ventanas minimizadas. El enlace profundo y el alias canonizan sin perder `app`.
- La vista se renombra a `app/board/store/`: `StoreDesktop`, `store-window`, `store-desktop.css`, catálogo en `store/catalog/` y tipos `StoreRole`/`StoreTool`/`StoreCategory`. Se conserva el protocolo `SpaceRoom`, `space-control` y `/api/space-socket`.
- MCP sube a `0.27.0` con 59 herramientas y enlaces canónicos de Tienda; `abrir_app`, `listar_ventanas`, `leer_pizarra` y los prompts hablan de Tienda. Snapshot, matriz y paridad actualizados.
- Ayuda, README, `docs/mcp-apps.md`, referencias de producto y documentación de la vista se actualizan. La etiqueta y la raíz de rendimiento pasan a «Tienda · abrir»/`store-desktop.tsx`, y la línea base se regenera (162,5 KiB gzip).
- Sin migraciones ni cambio de versión: `1.1.30`.

### Verificación

- Build servida en `8791` con identidad local: 1366×900, 1024×768, 900×700, 620×800 y 390×844 sin desborde horizontal; Tienda ocupa 1127/801/677/605/390 px de ancho y el dock queda dentro del escritorio. A 390 la ventana abierta cabe (366×560) y el maximizado de 1366 ocupa exactamente el contenido (1127×822), sin tapar cabecera ni sidebar.
- Alias `view=espacio&app=excalidraw` canoniza a `view=administracion&section=tienda&app=excalidraw` y abre Excalidraw; el catálogo de Aula Store abre y vuelve al escritorio; Clase vuelve a Tareas desde su botón de icono, también desde Alumnos. Cero excepciones de consola.
- La revisión encontró y corrigió una regresión del renombrado: el fetch de apps apuntaba a `/api/store-apps`; vuelve a `/api/space-apps` y la prueba de la vista lo cubre.
- La revisión posterior detectó que el escritorio y Aula Store compartían `.store-view`; al cargar el catálogo, su CSS fijaba el escritorio al viewport. El catálogo pasa a `.store-catalog` y su prueba comprueba que no reutiliza la clase del escritorio.
- Suite completa: 125 archivos / 1.026 pruebas; `tsc`, lint, build, `git diff --check` y `perf:budget` en verde.
- Capturas y métricas en `outputs/ui08-*.png` y `outputs/ui08-metrics.json` (ignorados por git).
- Commits: `0082fcf` (roadmap), `5740160` (fase 1), `b08cd46` (corrección de cabecera/dock), `6ac70c6` (fase 2); el cierre queda en el commit de documentación. Sin `release:prepare`, push ni publicación.

### Seguimiento

Sin entradas de seguimiento; el roadmap se reinicia desde la plantilla.

## 2026-11-15 — Roadmap UI-07 · Documentación en Ajustes y selector de proyecto

**Estado:** Completada · Sin publicación

### Cambios

- Documentación pasa al sidebar de Ajustes como sexta sección, con carga diferida: Cuenta, Apariencia, Documentación, Tokens MCP, Administradores y Almacenamiento. Dentro de Ajustes no muestra «Volver a Clase»; la página pública de `/documentacion` conserva su acción.
- URL canónica `view=ajustes&section=documentacion`. `view=documentacion` se lee como alias, se reescribe con `replaceState` y no rompe favoritos; el alias anónimo sigue redirigiendo a `/documentacion`. `obtener_enlace` admite la nueva sección y el snapshot del catálogo MCP se actualizó.
- La cabecera retira el botón de Documentación. `details.project-menu` ocupa su zona derecha con `margin-left:auto`, antes de Ajustes y cuenta, tanto en escritorio como en móvil.
- La ayuda explica la nueva navegación y la documentación embebida ajusta su rejilla: índice de 204 px y oculto en Ajustes por debajo de 1180 px, sin botón de vuelta. Se añadió `min-width:0` a la cadena de documentación y al workspace móvil para que los bloques de código no ensanchen la página.
- Sin migraciones ni cambio de versión: `1.1.30`.

### Verificación

- Build servida en `8791` con identidad local: 1366×900 con héroe de 1016 px e índice visible; 1024×768 con héroe de 738 px e índice oculto; 390×844 con héroe de 358 px, sidebar de 390 px y sin desborde horizontal. El proyecto mide 236 px a 390 y el botón de Documentación ya no existe en el header.
- `?view=documentacion` canoniza a `?view=ajustes&section=documentacion`; `/documentacion` sigue visible con su botón de vuelta, sin header del tablero y sin desbordes. Sin excepciones de consola.
- Suite completa: 124 archivos / 1.023 pruebas; `tsc`, lint, build y `git diff --check` en verde.
- Capturas y métricas en `outputs/ui07-*.png` y `outputs/ui07-metrics.json` (ignorados por git).
- Commits: `68aaf02` (roadmap) y `c127064` (integración); el cierre queda en el commit de documentación. Sin `release:prepare`, push ni publicación.

### Seguimiento en backlog

UI-08 conserva Tienda dentro de Administración, la retirada de Mi espacio y Clase como botón de icono en la cabecera.

## 2026-11-15 — Roadmap UI-05 · Estados vacíos de las fichas

**Estado:** Completada · Sin publicación

### Cambios

- `PeopleEmptyState` reúne icono, título, explicación y una acción opcional; se usa en Alumnos y Profesores con estilos por tokens en `people.css`.
- Con 0 alumnos aparece «Aún no hay alumnos» y, si hay permiso, «Añadir alumno» abre el diálogo existente; sin permiso solo queda la explicación. Lo mismo en Profesores con «Aún no hay profesores» y `blankTeacher()`.
- El selector de disposición se oculta cuando la lista está cargada y vacía. Con error de carga se mantiene la alerta con «Reintentar» y no se muestra el vacío; durante la carga sigue el texto correspondiente.
- Sin migraciones ni cambio de versión: `1.1.30`.

### Verificación

- Build servida en `8791` con un proyecto temporal sin fichas: 1366×900 en Alumnos y Profesores y 390×844 en Alumnos. El bloque mide 248 px a 1366 y 249 px a 390, sin desbordes; no aparece el selector.
- «Añadir alumno» y «Añadir profesor» abren los diálogos existentes. El proyecto temporal se eliminó después (`deleted: true`), sin dejar datos de prueba.
- Suite completa: 124 archivos / 1.021 pruebas; `tsc`, lint, build y `git diff --check` en verde. Sin excepciones de consola.
- Commits: `577faa3` (fase 1) y el cierre queda en el commit de documentación. Sin `release:prepare` ni publicación.

### Seguimiento en backlog

Sin entradas.

## 2026-11-15 — Roadmap UI-04 · Vista de administración

**Estado:** Completada · Sin publicación

### Cambios

- Alumnos y Profesores pasan a una sola vista `administracion` con el sidebar de `WorkspaceLayout`; la cabecera cambia los tres botones por una entrada «Administración» y cada sección conserva su contador, su disposición y su alta.
- `view=administracion` es la URL canónica: Alumnos omite la sección y Profesores usa `section=profesores`. `view=alumnos` y `view=profesores` siguen funcionando como alias y se reescriben con `replaceState`, sin añadir una entrada al historial.
- El alumnado mantiene el acceso: al entrar en Alumnos se abre su propia ficha una vez por proyecto. Los permisos de alta y edición no cambian.
- Se retiran de las dos vistas el `eyebrow`, la intro y el `h1` duplicados; el título de sección es un `h2` y el sidebar reutiliza el marco existente.
- `obtener_enlace` acepta `administracion` y su sección; ayuda, README y snapshot del catálogo actualizados. Sin migraciones ni cambio de versión: `1.1.30`.

### Verificación

- Build servida en `8791` con identidad local: 1366×900 con seis alumnos, detalle de ficha y vuelta; 1024×768 con dos profesores; 390×844 con el sidebar en fila y las dos secciones.
- Sin `eyebrow`, intro ni desbordes horizontales; a 390 el contenido tiene scroll propio (913 px frente a 677 visibles) y el sidebar mide 60 px de alto, frente a 224 px a 1366 y 208 px a 1024.
- Alias: `?view=alumnos` → `?view=administracion`; `?view=profesores` → `?view=administracion&section=profesores`. Atrás vuelve a Alumnos y adelante a Profesores.
- Suite completa: 123 archivos / 1.014 pruebas; `tsc`, lint, build y `git diff --check` en verde. Sin excepciones de consola.
- Commits: `2a6bbd5` (roadmap) y `da02b7e` (vista, URL y MCP); el cierre queda en el commit de documentación. Sin `release:prepare` ni publicación.

### Seguimiento en backlog

UI-05 (estados vacíos de fichas) sigue en [`backlog.md`](backlog.md).

## 2026-11-15 — Roadmap UI-06 · Hero compacto del tablero

**Estado:** Completada · Sin publicación

### Cambios

- El hero de Tareas pasa de una caja de 230 px mínimos, panel oscuro y márgenes de 32 px a una franja de 71 px en escritorio con `h1`, «N de M tareas hechas», porcentaje y barra fina; se retiraron el `eyebrow`, el intro y el `h2` «Kanban» de la barra de herramientas.
- El progreso conserva el nombre accesible «Progreso del grupo» y la frase «N de M tareas hechas»; el alta y el estado de invitado no cambian.
- A ≤820 el progreso y los filtros se anclan a la izquierda para evitar el filtro huérfano y un resumen estirado; a ≤620 la franja se apila en título, progreso y acción.
- Sin migraciones ni cambio de versión: `1.1.30` se mantiene.

### Verificación

- Revisión con la build servida en `8791` (la dev de `5173` no acepta las cabeceras de identidad locales): 1366×768 en claro y oscuro, 1024×768, 820×900 y 390×844.
- Hero de 71 px en 1366 y 1024, 123 px a 820 y 157 px a 390; primera tarjeta a 311 px en 1366; sin desbordes horizontales.
- 6 pruebas de `kanban-view`, `tsc`, lint y `git diff --check` correctos; build correcta.
- Commits: `58fbf2c` (franja) y `0e85b43` (ajuste a 820). Sin `release:prepare` ni publicación.
- La cabecera a 1024 y 390 se revisó aparte y se corrigió como parte de UI-04.

### Seguimiento en backlog

UI-04 (vista de administración) y UI-05 (estados vacíos de fichas) siguen en [`backlog.md`](backlog.md).

## 2026-11-15 — PER-06, PER-07 y PER-08 · Prueba de extremo a extremo

**Estado:** Cerrado con pruebas controladas; publicado en 1.1.30.

- Se creó un proyecto temporal en producción, con tarea y pizarra; al dibujar y eliminar un rectángulo, el panel midió 560 caracteres, 1 elemento y 1 borrado. La prueba unitaria con un cliente desfasado confirma que una tumba preserva el borrado y que su ausencia puede resucitarlo. Decisión: no podar tumbas por ahora.
- La cuenta de prueba subió por MCP un PNG de 68 bytes; el panel lo clasificó como `mcp/task-image`. Es una prueba funcional, no una muestra representativa del volumen o de imágenes grandes. Se mantiene el original en MCP y se aplaza incorporar WASM hasta tener necesidad contrastada; el límite y la recomendación de reducir en cliente siguen documentados.
- Comparación sintética de tres muestras para una captura de 2560×1440: PNG original 120 KB; WebP 0,8 a 2048/2560 px 20/28 KB; WebP 0,9 24/35 KB. Los PSNR a 0,8 fueron 46,3/46,7 dB. Se mantiene 2048 px y 0,8 de momento: no se midió legibilidad en capturas reales de clase y estas cifras no prueban que una opción conserve texto mejor.
- Se eliminó el proyecto temporal, su tarea, ficha, invitación, pizarra y archivo. El diagnóstico volvió a 0 pizarras y 1 archivo preexistente; el inventario confirmó 1 objeto con fila y 0 huérfanos.
- Verificaciones anteriores de la publicación 1.1.30: lint, tipos, build y 1.011 pruebas. No se añadió poda ni transformación en servidor.

## 2026-11-15 — Publicación 1.1.30 · Pruebas de pizarra y MCP

- Publicada en Sites con 1.011 pruebas, lint, tipos y build correctos. La prueba de fusión muestra que una tumba reciente evita la resurrección de un elemento de un cliente desfasado; sin la tumba, la resurrección es posible. La prueba MCP comprueba que se registra el origen `mcp`.
- PER-06, PER-07 y PER-08 permanecen activos en el roadmap: las pruebas controladas no sustituyen datos de uso real ni capturas de clase y no se ha implementado poda ni redimensionado en servidor.

## 2026-11-15 — Seguimiento de pizarras y miniaturas

- Comparadas tres muestras sintéticas de captura a 2048 y 2560 px: 20 y 28 KB en WebP 0,8, frente a 120 KB del PNG original. La legibilidad en capturas reales y la calidad 0,9 siguen pendientes en PER-07; no se cambia la configuración.
- Verificación focalizada: 4 archivos de pruebas y 14 pruebas correctas para estadísticas de pizarras y subidas y generación de miniaturas.
- Se mantiene el seguimiento de PER-06 y PER-08 hasta disponer de pizarras y subidas MCP reales. El roadmap permanece libre y no hay cambios de código ni nueva publicación.

## 2026-11-15 — PER-06 y PER-08 · Mediciones de producción, versión 1.1.29

**Estado:** Instrumentación publicada y medida; seguimiento en backlog por falta de muestra.

- Pizarras de producción: 0. No se puede medir su tamaño ni el porcentaje de tumbas en uso real; se mantiene la decisión de no podar y se conserva el seguimiento PER-06.
- Archivos de producción: 1 imagen de tarea de 209,2 KB, origen desconocido por ser anterior a la migración; 0 archivos de 1 MiB o más y ninguna subida MCP clasificada. No hay muestra para justificar el redimensionador WASM; PER-08 conserva el seguimiento.
- La migración añade `uploads.origin` como columna nullable, sin atribuir orígenes anteriores. El panel de Ajustes muestra ambas mediciones para propietario o administración.
- Verificación: lint, tipos, 1.010 pruebas, build y despliegue en Sites satisfactorios. No se podaron pizarras ni se borraron archivos. PER-07 permanece en el backlog para evaluar nitidez con capturas de clase.

## 2026-11-15 — Roadmap PER-05 · Caché inmutable para `/api/files/[id]`

**Estado:** Completada · Sin publicación

### Cambios

- `/api/files/[id]` responde `Cache-Control: private, max-age=31536000, immutable`, y los objetos nuevos de R2 se guardan con el mismo valor.
- Se descartó el `ETag` con 304: `storeUpload` crea un UUID y una clave por subida, el objeto no se reemplaza y el traslado del proyecto heredado solo cambia `project_id`, así que el contenido de un id nunca cambia.
- `private` mantiene la caché en el navegador: el archivo sigue exigiendo sesión y acceso al proyecto.
- Prueba de contrato ampliada con la cabecera; `miniaturas.md` y `docs/README.md` actualizados. Sin migraciones y sin cambio de versión (`1.1.28`).

### Verificación

- 3 pruebas de `app/api/files/[id]/route.test.ts` en verde.
- `npx tsc --noEmit` y `npm run lint`, correctos.
- `git diff --check` limpio.
- Commit `1410628`; el cierre queda en el commit de documentación.
- Sin publicación en Sites ni `release:prepare`; no se probó en un navegador real con la caché llena.

### Seguimiento en backlog

PER-06, PER-07 y PER-08 quedan en [`backlog.md`](backlog.md); PER-05 sale del backlog.

## 2026-11-15 — Roadmap PER-04 · Derivado de 2048 px para las imágenes de pizarra

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Medición:** `npm run perf:images` acepta `--widths` y mide 1600 y 2048 px sobre fotos sintéticas. En 12 MP, 2048 px deja 348 KB y 12,0 MB decodificados frente a 3,9 MB y 46,5 MB del original, con 36,3 dB y 210 ms de codificación; en 2 MP no hay reducción real porque la imagen ya mide 1920 px.
- **Fase 2 — Decisión:** tope único de 2048 px y solo si la imagen lo supera, para conservar más ampliación que 1600 px y no reescribir lo que ya cabe.
- **Fase 3 — Integración:** `uploadBlob` reduce antes de subir con `crearMiniaturaDeArchivo(..., { maxWidth: 2048, onlyWhenResized: true })` y cae al original si no hay derivado o pesa más. Se descartó el binding `IMAGES` porque el Site solo declara `BUCKET` y `DB`.
- **Fase 4 — PNG y capturas:** `--kind png` mide PNG con alfa y capturas con texto. WebP 0,8 conserva el canal alfa exacto y baja 341 KB a 72 KB en un logo transparente y 120 KB a 20 KB en una captura, con 41,0–46,3 dB. Aprobada la inclusión de PNG con el mismo tope; los GIF siguen intactos.
- Revisión visual con una captura real de `/documentacion` a 2560×1440: el derivado de 2048 px pesa 97 KB frente a 246 KB, el texto se lee igual a 1:1 y se ve algo más blando a 2x sin suavizado, sin artefactos. El límite queda en el backlog como PER-07.
- Sin migraciones ni cambios en `/api/uploads`, la purga o el inventario; la versión sigue en `1.1.28`. Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla.

### Verificación

- `npx tsc --noEmit`, `npm run lint`, suite completa (121 archivos, 1004 pruebas) y `npm run build`, correctos.
- 13 pruebas focalizadas de `whiteboard-model` e `image-thumbnail` tras incluir PNG.
- `git diff --check` limpio.
- Commits: `c7ea03f` (medición), `6586545` (integración JPEG/WebP), `667f608` (medición PNG), `1b15eaa` (PNG en el derivado) y `dd15fe1` (límite en backlog); el cierre queda en el commit de documentación.
- Sin publicación en Sites ni `release:prepare`; no había datos de producción ni sesión para revisar imágenes reales de pizarra.

### Seguimiento en backlog

PER-05 (caché y ETag), PER-06 (snapshots de pizarra) y PER-07 (nitidez del texto a 2x) quedan en [`backlog.md`](backlog.md).

## 2026-11-15 — Roadmap SYNC-01 · Norma de sincronización del repositorio

**Estado:** Completada · Sin publicación

### Cambios

- SYNC-01 sale del backlog: la norma de commits por bloque, push único al cierre, CI y revisión de secretos vive solo en `AGENTS.md`, sin una copia que pueda contradecirla.
- Verificación con el cierre de PER-02: push `174436a..06eeb67` único, `github/main` en `06eeb67`, checks y build sobre el estado final y ningún secreto ni archivo `.env*` en el commit.
- Sin cambios de código, dependencias ni versión; `package.json` sigue en `1.1.28`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla. El backlog conserva PER-04, PER-05 y PER-06.

### Verificación

- `git diff --check` limpio.
- Sin cambios de código: no se repitieron lint, tipos, suite ni build, que ya estaban en verde sobre este mismo árbol en el cierre de PER-02.
- Sin publicación en Sites ni `release:prepare`.

### Seguimiento en backlog

PER-04, PER-05 y PER-06 quedan en [`backlog.md`](backlog.md); no se añaden entradas nuevas.

## 2026-11-15 — Roadmap PER-02 · Miniaturas derivadas de las imágenes de tareas

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Línea base:** `scripts/image-baseline.mjs` y `npm run perf:images` miden con Chrome headless el peso, la transferencia estimada, la decodificación, la memoria, la codificación y el PSNR de fotos sintéticas; el método y los límites quedan en [`miniaturas.md`](../miniaturas.md).
- **Fase 2 — Prototipo y comparación:** `calcularDimensionesMiniatura` (7 pruebas) y `crearMiniaturaDeArchivo` generan un WebP de 800 px con orientación EXIF y sin metadatos. Una foto de 12 MP baja de 3,9 MB a 61 KB y de 46,5 MB decodificados a 1,8 MB, con 35,7 dB de PSNR. El Site solo declara `BUCKET` y `DB`, así que se descarta el binding `IMAGES`.
- **Fase 3 — Integración:** la subida de tareas envía el derivado como `task-image` solo si pesa menos que el original; si el generador devuelve `null`, se sube el archivo tal cual. GIF y tipos no admitidos no se transforman. Seis pruebas nuevas (tres del generador y tres del diálogo).
- Sin migraciones y sin cambios en `/api/uploads`, en la purga ni en el inventario; la versión sigue en `1.1.28`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla. El backlog conserva SYNC-01 como norma operativa.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- Suite completa de Vitest en verde; `npm run build` correcto.
- `git diff --check` limpio.
- Commits: `2392083` (línea base), `d229469` (prototipo y comparación) y `69811c3` (integración); el cierre queda en el commit de documentación.
- Sin publicación en Sites ni `release:prepare`. La revisión visual en un navegador real y las fotos de producción siguen pendientes.

### Seguimiento en backlog

SYNC-01 se queda en [`backlog.md`](backlog.md) como norma operativa; no se añaden entradas nuevas.

## 2026-11-15 — Roadmap PER-01B · Inventario de R2 y publicación 1.1.28

**Estado:** Completado · Publicado en Sites

- Inventario paginado y protegido para propietario o administración en Ajustes > Almacenamiento; cotejo exacto con D1 en modo de solo lectura.
- Se corrigió el cotejo de filas anteriores al primer objeto y entre páginas; la continuación conserva el límite anterior. Las pruebas incluyen esos casos.
- Revisión real de producción, 15/11/2026: una página, 1 objeto (209,2 KB) con su fila, 0 objetos sin fila, 0 filas sin objeto y 0 claves que requieran revisión. No se borraron ni modificaron objetos o filas. No se localizaron copias antiguas en el bucket; la inspección no determina si existen copias externas.
- Verificación: lint, tipos, 987 pruebas y build correctos. La plataforma confirmó el despliegue de la versión 1.1.28; no se añadieron migraciones.

## 2026-11-15 — Roadmap PER-03 · Purga segura de archivos sin uso cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Inventario de referencias:** `lib/domain/uploads/references.ts` extrae los ids de las URLs `/api/files/{id}`, ignora URLs externas, deduplica y falla cerrado con un JSON ilegible; `lib/server/uploads/usage.ts` reúne las referencias de `tasks.image_url`, `boards.snapshot` y `app_documents.state` y devuelve candidatos con 7 días de gracia y tope por lote, sin borrar nada.
- **Fase 2 — Purga y endpoint:** `lib/server/uploads/purge.ts` relee las referencias antes de cada borrado, elimina primero el objeto de R2 y después la fila, conserva la fila si R2 falla para reintentar y simula por defecto; `purgeAllUnusedUploads` recorre todos los proyectos. `POST /api/storage/purge` exige propietario o administración, mismo origen y JSON, con `simulacion: true` por defecto y `limite` de 1 a 100.
- **Fase 3 — Control y cierre:** Ajustes > Almacenamiento ofrece simulación, confirmación explícita y recuentos de borrados, omitidos, fallos, bytes y proyectos ilegibles; el README documenta la gracia de 7 días, el tope por ejecución, la relectura y la ausencia de limpieza programada.
- Sin migraciones ni cambio de versión; `package.json` sigue en `1.1.27`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla. El backlog conserva 3 entradas.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm test`: **115 archivos / 964 tests**.
- `npm run build` correcto, sin errores.
- `git diff --check` limpio.
- Commits de fase: `0f3222b` (inventario) y `96969fb` (purga); el cierre queda en el commit de documentación.
- La purga se prueba con SQLite en memoria y dobles de R2; no se ejecutó contra un bucket real ni con inspección visual en navegador.
- Sin push a GitHub ni publicación en Sites; la versión visible no cambia.

### Seguimiento en backlog

PER-01B, PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md); no se añaden entradas nuevas.

## 2026-11-15 — Roadmap MCP-05E · Diagramas Mermaid por MCP cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Documento y plantillas compartidos:** `MERMAID_TEMPLATES` y su tipo pasan a `lib/domain/mermaid/templates.ts`, la única lista que usan la app y MCP; `lib/domain/mermaid/document.ts` valida `{ code: string }` y conserva el resto de claves.
- **Fase 2 — Herramientas MCP:** `leer_diagrama` devuelve `{ codigo, actualizado }` o `null` sin crear documento; `guardar_diagrama` valida `{ code }`, aplica el límite de 200.000 caracteres y guarda el objeto completo; `listar_plantillas_diagrama` devuelve `{ id, nombre, codigo }` sin exigir proyecto. La app desinstalada responde `not_found` y los invitados `forbidden`.
- **Fase 3 — Cobertura y cierre:** `docs/mcp-apps.md` deja Diagramas sin huecos MCP; catálogo, matriz, snapshot, ayuda, README y `content-coverage` incluyen las tres herramientas. Catálogo `0.26.0` con 59 herramientas (26 de lectura, 33 de escritura y 8 destructivas).
- Sin migraciones ni cambio de versión; `package.json` sigue en `1.1.27`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla. El backlog conserva 4 entradas.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm test`: **111 archivos / 934 tests**.
- `npm run build` correcto, sin errores.
- `git diff --check` limpio.
- Commits de fase: `c5d304e` (documento y plantillas) y `92b4985` (herramientas); el cierre queda en el commit de documentación.
- Sin inspección visual en navegador; la verificación es de código y documentación.
- Sin push a GitHub ni publicación en Sites; la versión visible no cambia.

### Seguimiento en backlog

PER-03, PER-01B, PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md); no se añaden entradas nuevas.

## 2026-11-15 — Roadmap MCP-05D · Programación por bloques por MCP cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Servicio y validación compartidos:** `MAX_APP_DOCUMENT_CHARS` pasa a `lib/server/app-documents.ts` y `/api/app-documents` lo usa; `lib/domain/blockly/serialization.ts` valida `blocks.blocks[]` y conserva los campos internos.
- **Fase 2 — Herramientas MCP:** `leer_programa_bloques` devuelve `{ estado, actualizado }` o `null` sin crear documento; `guardar_programa_bloques` valida la forma mínima, aplica el límite de 200.000 caracteres y guarda el objeto completo. La app desinstalada responde `not_found` y los invitados `forbidden`.
- **Fase 3 — Cobertura y cierre:** `docs/mcp-apps.md` deja Blockly sin huecos MCP; catálogo, matriz, snapshot, ayuda, README y `content-coverage` incluyen las dos herramientas. Catálogo `0.25.0` con 56 herramientas (24 de lectura, 32 de escritura y 8 destructivas).
- Sin migraciones ni cambio de versión; `package.json` sigue en `1.1.27`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla. El backlog conserva 5 entradas.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm test`: **108 archivos / 899 tests**.
- `npm run build` correcto, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Commits de fase: `53f178a` (servicio y validación) y `1437bb6` (herramientas); el cierre queda en el commit de documentación.
- Sin inspección visual en navegador; la verificación es de código y documentación.
- Sin push a GitHub ni publicación en Sites; la versión visible no cambia.

### Seguimiento en backlog

MCP-05E, PER-03, PER-01B, PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md); no se añaden entradas nuevas.

## 2026-11-15 — Roadmap MCP-05B · Excalidraw por MCP cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Servicio compartido:** `lib/server/boards.ts` centraliza dueño, permisos, límites y revisión optimista; `/api/boards` queda como envoltorio HTTP.
- **Fase 2 — Lectura y guardado:** `leer_pizarra` y `guardar_pizarra` exponen el snapshot y guardan con `revision`; la app desinstalada responde `not_found` y el conflicto devuelve `revisionActual`.
- **Fase 3 — Adición y sala en vivo:** `anadir_a_pizarra` construye texto, rectángulos, elipses y flechas, conserva `appState`, `files` y los campos desconocidos, y publica en `BoardRoom` solo después de guardar. Sin pestañas o por encima de 1 MB devuelve `sincronizada: false`; la web usa el sondeo.
- **Fase 4 — Cobertura y cierre:** `docs/mcp-apps.md` deja Excalidraw sin huecos MCP; catálogo, matriz, snapshot, ayuda, README y `content-coverage` incluyen las tres herramientas. Catálogo `0.24.0` con 54 herramientas (23 de lectura, 31 de escritura y 8 destructivas).
- Sin migraciones ni cambio de versión; `package.json` sigue en `1.1.27`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado desde la plantilla. El backlog conserva 6 entradas.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm test`: **106 archivos / 874 tests**.
- `npm run build` correcto, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Commits de fase: `dd1f045` (servicio), `8d302d1` (lectura y guardado) y `c796f52` (adición y sala en vivo); el cierre queda en el commit de documentación.
- Sin inspección visual en navegador; la verificación es de código y documentación.
- Sin push a GitHub ni publicación en Sites; la versión visible no cambia.

### Seguimiento en backlog

MCP-05D, MCP-05E, PER-03, PER-01B, PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md); no se añaden entradas nuevas.

## 2026-11-15 — Roadmap MCP-05A + MCP-05C · Contrato MCP de apps y piloto cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Contrato común:** `resolverAppInstalada` y `resolverAppEnProyecto` resuelven instalación, proyecto, acceso y escritura con el contrato de errores existente. `APP_MCP_DECLARACIONES` exige una entrada por app y un test impide dejar una app sin superficie MCP.
- **Fase 2 — Piloto de Herramientas de aula:** `consultar_elemento` busca por símbolo o número atómico, exige la app instalada y no necesita proyecto. Los 118 elementos y su tipo pasan a `lib/domain/edu-tools/` para que la interfaz y MCP lean la misma copia.
- **Fase 3 — Cobertura y cierre:** `docs/mcp-apps.md` reúne apertura, ventana, lectura, escritura, exportación, permisos y límites de las cuatro apps. La revisión confirma que los únicos huecos son MCP-05B, MCP-05D y MCP-05E; las exportaciones renderizadas se quedan en la ventana.
- Catálogo `0.22.0` con 51 herramientas (22 de lectura, 29 de escritura y 8 destructivas). Sin migraciones ni cambio de versión; `package.json` sigue en `1.1.27`.
- Roadmap cerrado y `docs/roadmap.md` reiniciado. El backlog conserva 7 entradas.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm test`: **100 archivos / 816 tests**.
- `npm run build` correcto, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Commits de fase: `4381d10` (contrato), `7aa4e50` (piloto) y `fcda106` (cobertura).
- Sin inspección visual en navegador; la verificación es de código y documentación.

### Seguimiento en backlog

MCP-05B, MCP-05D y MCP-05E siguen en [`backlog.md`](backlog.md); no se añaden entradas nuevas. PER-03, PER-01B, PER-02, SYNC-01 y esas tres apps suman 7 entradas.

## 2026-11-15 — Roadmap UI-03 · Secciones de Ajustes cerrado

**Estado:** Completada · Sin publicación

### Cambios

- Ajustes queda dividido en cinco secciones: Cuenta, Apariencia, Tokens MCP, Administradores y Almacenamiento. Los tokens dejan de estar dentro de Cuenta y el diagnóstico de almacenamiento deja de estar dentro de Administradores.
- `section` admite `cuenta | apariencia | tokens | administradores | almacenamiento`. Las URLs antiguas conservan su significado y `tokens` y `almacenamiento` son enlaces directos nuevos.
- Administradores y Almacenamiento solo aparecen para propietario o administración. Si una cuenta sin permiso abre una de esas secciones, la vista vuelve a Cuenta y la URL se corrige con `replaceState` para no romper atrás/adelante.
- El sidebar móvil permite desplazar las cinco secciones sin desbordar; el título no encoge y la navegación conserva su ancho.
- `obtener_enlace` del MCP deriva las secciones de la lista canónica; catálogo `0.21.0` y snapshot actualizado.
- Ayuda, README y textos de documentación actualizados. Sin migraciones ni cambios de API.
- Versión local `1.1.27` sin cambios.

### Verificación

- Suite completa: **96 archivos / 791 tests**.
- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm run build` correcto; solo el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Commit: `a39f0e6`.
- Sin inspección visual en navegador; el comportamiento móvil se revisó por CSS y pruebas de estructura, no con captura.

### Seguimiento en backlog

Backlog: 5 entradas (PER-03, PER-01B, PER-02, SYNC-01 y MCP-05). MCP-05 se mantiene a la espera de definir su alcance. SYNC-01 sigue como norma operativa.

## 2026-11-15 — Publicación 1.1.27

**Estado:** Publicada en Sites.

- Se publican los cambios locales de arquitectura, rendimiento, miniaturas y sistema visual, con temas claro y oscuro. Sin migraciones nuevas de base de datos.
- Validación: lint, tipos, 790 pruebas, build y presupuesto de rendimiento correctos. Se amplió la espera de la prueba de carga diferida de ecuaciones para evitar fallos por tiempo en la suite.
- Permanece el aviso de chunks grandes y queda pendiente la revisión visual de los cambios de interfaz.

## 2026-11-15 — Roadmap UI-01 · Sistema visual cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fases 1-3.1 — Base y superficies:** 70 primitivas y 93 tokens `--ui-*`; Tareas, Calendario, Ajustes, Documentación, Mi espacio, Aula Store, header y sidebar comparten superficies, texto, bordes y estados. El marco usa `--ui-surface-frame` y los 22 CSS de feature quedan a cero hexadecimales.
- **Fases 4-5 — Tipografía e iconografía:** 18 tamaños, 5 interlineados, 6 trackings y 5 pesos; iconos de 12, 16, 18, 20, 24 y 28 px con trazo 2 y áreas táctiles mínimas de 36 px.
- **Fases 6-7 — Color y temas:** 11 tintes categóricos, estados compartidos y tema claro/oscuro con `system | light | dark`, persistencia en `aula-kanban-theme`, 92 tokens invertidos y selector en Ajustes > Apariencia.
- **Fase 7.1 — Bordes y radios:** escala de 1/2/3 px y 5/6/8/12/14/18/22 px más píldora; 127 bordes, 28 contornos y 107 radios migrados, incluidas las apps internas.
- **Fase 8 — Limpieza y guarda:** retirados los 36 alias de compatibilidad; los 93 tokens consumen primitivas directamente. `app/styles.test.ts` bloquea hexadecimales, funciones de color y alias retirados en CSS de feature; la última sombra cruda de OAuth pasa a `--ui-shadow-float`. El header y el sidebar usan 2 px de `--ui-border-accent-strong`; las tarjetas y carriles siguen a 1 px.
- Revisadas las excepciones de color de Blockly, Mermaid, Excalidraw y del HTML aislado del MCP; quedan documentadas y fuera de la guarda CSS. El snapshot del catálogo MCP se alinea con la sección Apariencia que ya expone la fase 7.
- Sin cambios de versión; `package.json` sigue en `1.1.26`.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- Suite completa: **96 archivos / 790 tests**.
- `npm run build` en verde, con el aviso existente de chunks superiores a 500 kB.
- Guarda de estilos: **2 pruebas**; detecta un hexadecimal y una función de color en una hoja de feature.
- `git diff --check` limpio.
- Commits de fase: `b9481ee`, `306bac2`, `6743b76` y `d5f17cd`.
- Sin inspección visual en navegador; la revisión visual del nuevo grosor de 2 px del chrome queda pendiente.

### Seguimiento en backlog

Roadmap vacío. Backlog: 6 entradas (UI-03, PER-03, PER-01B, PER-02, SYNC-01 y MCP-05). SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap PERF-01 · Coste de las apps pesadas cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Línea base:** `scripts/perf-report.mjs`, `npm run perf:report`, `docs/perf-baseline.json` y `docs/rendimiento.md` miden el cierre de cada flujo en bruto y gzip.
- **Fase 2 — Básica sin motor:** un evaluador racional pequeño sustituye a `compute-engine` en la Básica; Científica y Ecuaciones conservan el motor. El primer `=` baja de **1.922,3 a 140,3 KiB gzip**.
- **Fase 3 — Mermaid y KaTeX:** la conversión Mermaid incluye ahora su flowchart real; Mermaid 11/12 y las dos copias de KaTeX no coinciden en ningún flujo. Se añadió una prueba funcional de conversión y guardas de carga.
- **Fase 4 — Latencia y CI:** `perf:latency` mide sobre la build servida con Chrome, caché fría y Fast 3G; `perf:budget` lee `docs/perf-budget.json` y CI lo ejecuta después del build. Mi espacio queda en **162,6 KiB gzip** sin apps pesadas.
- Sin cambios de versión; `package.json` sigue en `1.1.26`.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- Suite completa: **94 archivos / 783 tests**.
- `npm run build` en verde, con el aviso existente de chunks superiores a 500 kB.
- `npm run perf:budget` correcto para los once flujos; `git diff --check` limpio.
- Latencia real, 5 muestras por modo: Básica **3.149,6 ms** y Científica **12.753,1 ms** hasta el primer resultado; `compute-engine` solo aparece en Científica.
- Commits de fase: `725408e`, `09d0eaa`, `f517b56` y `fd6e860`. Push único de cierre a `github/main`.

### Seguimiento en backlog

Roadmap vacío. Backlog: 6 entradas (PER-03, PER-01B, PER-02, UI-01, SYNC-01 y MCP-05). SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap ARCH-01 · Contratos de rutas y límites de capa cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Helpers de ruta:** `lib/server/route-helpers.ts` concentra `withJsonMutation` y `withProjectRoute`; tareas, pizarras, documentos de apps, miembros, lectura de alumnado/profesorado, space-apps, mutaciones de proyectos, administradores e invitaciones conservan el orden de guardas y el contrato HTTP.
- **Fase 2 — Acceso y HTTP:** `project-http.ts` construye las respuestas y `project-contract.ts` conserva los mensajes públicos; `project-access.ts` deja de importar `json`. `projects.ts` y `mcp/contexto.ts` usan los mensajes de contrato, no el transporte. Una prueba de frontera impide la regresión.
- **Fase 3 — Arranque de proyectos:** `project-overview.ts` concentra migración de UUID, identidad, limpieza best-effort y listado; `GET /api/projects` queda como envoltura y conserva el 503 de la migración y la respuesta pública.
- **Fase 4 — Contrato y cierre:** contrato de sesión, permisos, errores y paridad HTTP ↔ MCP verificado; suite completa, typecheck, lint y build en verde.
- Sin cambios funcionales ni de versión; `package.json` sigue en `1.1.26`.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- Contrato: **7 archivos / 402 tests** (sesión, permisos, personas, proyectos, administración, matriz y paridad).
- Suite completa: **92 archivos / 761 tests**.
- `npm run build` en verde, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Commits de fase: `56f56c4` (helpers), `2b148d7` (acceso/HTTP) y `e2f00ef` (arranque de proyectos).

### Seguimiento en backlog

Roadmap vacío. Quedan PER-03, PER-01B, PER-02, UI-01, SYNC-01, MCP-05 y recortes de rendimiento (7 entradas). SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap ARCH-02 · Dividir los módulos grandes restantes cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Tareas MCP:** `lib/server/mcp/dominios/tareas.ts` (700 líneas) queda en `tareas/{comun,filtros,lectura,escritura,index}.ts`; `herramientasTareas` conserva nombres, orden y contrato.
- **Fase 2 — Personas MCP:** `personas.ts` (523 líneas) queda en `personas/{comun,alumnado,profesorado,invitaciones,index}.ts`; `herramientasPersonas` conserva nombres, orden y contrato.
- **Fase 3 — OAuth:** `lib/server/oauth/service.ts` (499 líneas) se divide en `types.ts` (53), `cripto.ts` (143), `clientes.ts` (70), `codigos.ts` (72), `tokens.ts` (169) y un `service.ts` (48) reexportador. Se conservan firmas, SQL, transacciones, TTL, PKCE, errores y la actualización de `last_used_at`; la superficie pública mantiene los mismos tipos, constantes y funciones.
- **Fase 4 — Ilustraciones:** revisado `app/board/docs/illustrations/section-art.tsx` (415 líneas); se decide no dividirlo. Cada ilustración es independiente, los helpers de animación compartidos ya están aislados y no hay duplicación; separarlo añadiría archivos e indirección sin ganancia de cohesión.
- Sin cambios funcionales ni de versión; `package.json` sigue en `1.1.26`.

### Verificación

- `npm run lint` limpio.
- `npx tsc --noEmit` limpio.
- `npm test`: **90 archivos / 751 tests**.
- `npm run build` en verde, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Fase 3 en el commit local `c47e371`.
- La política de commits locales se publicó aparte en `fad0986`; Actions registró 0 ejecuciones para ese commit solo documental. El push de cierre acumula los commits de este roadmap.

### Seguimiento en backlog

Roadmap vacío. Quedan PER-03, PER-01B, PER-02, UI-01, ARCH-01, SYNC-01, MCP-05 y recortes de rendimiento (8 entradas). SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap CI-02 · Optimización de workflows cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Filtros y concurrencia:** `.github/workflows/ci.yml` ignora `docs/**`, `AGENTS.md`, `**/*.md` y `.freebuff/**`; añade `concurrency` por workflow/ref con cancelación y `timeout-minutes: 10` al job `checks`.
- **Fase 2 — Estructura:** se probó en la rama temporal `ci-02-measure` un workflow con dos jobs paralelos, `checks` y `verification`. La prueba terminó en 140 s y el job de verificación consumió 136 s por el segundo `npm ci`; el job único de referencia tardó 130 s. Se descartó la variante y se mantiene el job único.
- Sin cambios de versión; `package.json` sigue en `1.1.26`.

### Verificación

- Commit `f058e96`: run `43694872488` en verde, 130 s; `main` no tiene branch protection ni rulesets.
- Commit solo documental `2c2c7b1`: 0 ejecuciones de Actions, confirmado con la API.
- Prueba paralela `c3fc6ce`: run `43695277830` en verde, 140 s; `checks` 54 s y `verification` 136 s; `npm ci` duplicado (23 s + 24 s). Sin mejora, se conserva el job único.
- Rama temporal `ci-02-measure` eliminada.
- `git diff --check` limpio.

### Seguimiento en backlog

Roadmap vacío. Quedan PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, SYNC-01, MCP-05 y recortes de rendimiento (9 entradas). SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap UI-02 · Encuadre de miniaturas en las tarjetas cerrado

**Estado:** Completada · Sin publicación

### Cambios

- `.card-image` en `app/board/tasks/kanban.css` usa ahora un marco estable de 130 px, `object-fit: contain`, `object-position: center` y fondo `var(--surface-muted)`.
- La tarjeta conserva ancho completo, radios, fallback de imagen rota y el contrato de almacenamiento; no se tocaron subida, URLs ni miniaturas derivadas.
- Sin cambios de versión; `package.json` sigue en `1.1.26`.

### Verificación

- `npx tsc --noEmit` limpio.
- `npx vitest run app/board/tasks/task-card.test.tsx`: **5 tests** en verde.
- `npm run build` en verde, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- GitHub Actions del commit `b238a0d` en verde.
- La comprobación visual en navegador se hará con la próxima publicación en Sites; el arreglo se acepta por ahora y la verificación queda registrada como diferida.

### Seguimiento en backlog

Quedan CI-02, PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, SYNC-01, MCP-05 y recortes de rendimiento (10 entradas). Roadmap vacío. SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap CI-01 · Build en GitHub Actions cerrado

**Estado:** Completada · Sin publicación

### Cambios

- Se añadió `npm run build` después de `npm test` en el job `checks` de `.github/workflows/ci.yml`.
- El workflow sigue usando solo `actions/checkout`, `actions/setup-node`, `npm ci`, lint, `tsc`, tests y build; no declara secretos, bindings de D1/R2 ni acceso a Sites.
- Sin cambios de código, dependencias ni versión; `package.json` sigue en `1.1.26`.

### Verificación

- GitHub Actions run `43691891217` (commit `990d68b`): **success**.
- Pasos: lint 9 s, `npx tsc --noEmit` 6 s, tests 36 s y `npm run build` 30 s; job 106 s y workflow 109 s.
- El build añade 30 s al job. El run anterior sin build midió 111 s de job, con variación de caché en `npm ci`/tests; no se atribuye una reducción al cambio.
- `git diff --check` limpio.

### Seguimiento en backlog

Quedan UI-02, PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, SYNC-01, MCP-05 y recortes de rendimiento (10 entradas). Roadmap vacío. SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Roadmap HIER-01 · Reorganización mínima de la jerarquía cerrado

**Estado:** Completada · Sin publicación

### Cambios

- **Fase 1 — Documentación:** `content.ts` (541 líneas) se dividió en `app/board/docs/content/` (`types`, `intro`, `people`, `tasks`, `workspace`, `help` e `index`), conservando las 14 secciones y los exports públicos.
- **Fase 2 — Herramientas de aula:** `edu-tools` quedó en `calculator/`, `periodic-table/` y `tools/`; se actualizaron el contenedor y los imports y se conservaron las cargas diferidas.
- **Fase 3 — Diálogo y acceso:** el diálogo de tareas se agrupó en `app/board/tasks/dialog/`; `app/modal.tsx` pasó a `app/board/shared/modal.tsx`; `lib/server/project.ts` pasó a `project-access.ts` con todos sus imports.
- Sin cambios funcionales, de contrato ni de versión; `package.json` sigue en `1.1.26`.

### Verificación

- `npx tsc --noEmit` limpio.
- `npm test`: **90 archivos / 751 tests**.
- `npm run build` en verde, con el aviso existente de chunks superiores a 500 kB.
- `git diff --check` limpio.
- Publicación en Sites pendiente de Codex; no se ha desplegado.

### Seguimiento en backlog

Quedan UI-02, PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, CI-01, SYNC-01, MCP-05 y recortes de rendimiento (11 entradas). SYNC-01 se conserva como norma operativa.

## 2026-11-15 — Verificación de persistencia y archivo de PER-01

**Estado:** subida verificada · inventario y purga pendientes en backlog

- En producción se subió una imagen a un proyecto temporal, se guardó en una tarea y se comprobó su visualización después de recargar. El proyecto de prueba se eliminó y el contador de filas de archivos volvió a cero.
- La verificación local anterior comprobó subida y lectura con contenido idéntico. Mantendremos originales; la evaluación de miniaturas derivadas queda en PER-02.
- Se reinicia el roadmap a petición del usuario, sin dar por completada la auditoría de R2: PER-01B conserva el inventario y la búsqueda de copias antiguas; PER-03 registra la purga automática todavía no implementada. El roadmap íntegro queda en `docs/historial/roadmap-per-01.md`. UI-02 recoge el encuadre de las imágenes.
- Sin cambios de código ni nuevo despliegue: la versión publicada sigue siendo 1.1.26.

## 2026-11-15 — UUID del proyecto y publicación 1.1.26

**Estado:** Completada · Publicada

- El proyecto heredado se trasladó a un UUID generado para esta instancia mediante un batch atómico; los enlaces anteriores se redirigen al identificador nuevo tras comprobar el acceso.
- Se conserva la correspondencia en `project_rekeys`; las reglas de inmutabilidad solo permiten el traslado mientras la operación está en curso. Las claves de objetos R2 se conservan para no perder archivos.
- Comparación de producción antes y después: 13 tareas, 17 alumnos, un profesor y dos membresías conservados; sin diferencias en las 11 tablas respaldadas salvo el identificador del proyecto.
- Se comprobó el acceso de la cuenta de alumno a proyectos y tareas desde el plugin, y la redirección del enlace anterior en el navegador.
- El diagnóstico de producción informa de D1 y R2 accesibles, con cero archivos registrados; la prueba de subida y la revisión de miniaturas se trasladaron entonces a PER-01.
- Validación: 751 pruebas, tipos, lint y build correctos. Respaldo privado de las filas de producción y copia de la base local verificados antes del traslado.
- Migraciones: `0034` tenía la instantánea mal formada y la marca temporal duplicada; se corrigió antes de aplicarla en producción. En local se reconcilió su historial tras verificar la estructura existente. `0035` añade el registro de equivalencias y adapta los disparadores para el traslado atómico.

## 2026-11-15 — Roadmap MCP-10 · Archivos del proyecto por MCP cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Subida:** `subir_archivo` recibe `proyectoId`, `finalidad`, `nombre`, `tipoMime` y `contenidoBase64`; decodifica base64, aplica los mismos tipos y límites que `/api/uploads` (5 MB para imágenes y 10 MB para documentos) y reutiliza `storeUpload`. Las cuentas invitadas reciben 403 y R2 ausente responde `unavailable`.
- **Fase 2 — Consulta:** `obtener_archivo` lee solo los metadatos con `findUpload`, comprueba que el archivo pertenece al proyecto y devuelve tipo MIME, tamaño, finalidad, fecha y enlace absoluto. No descarga ni expone el binario.
- **Fase 3 — Contrato y pruebas:** catálogo `0.20.0` con 50 herramientas (21 de lectura, 29 de escritura y 8 destructivas), ejemplos y roles, snapshot y README sincronizados. La matriz de roles se amplió a 336 casos y las pruebas del dominio cubren subida válida, invitado, base64/MIME inválidos, tamaño excesivo, R2 ausente, archivo ajeno y permisos.
- **Nota de tamaño:** `/mcp` y `/api/mcp` no fijan un límite de cuerpo propio; el base64 añade ~33 % y el límite práctico depende de la plataforma y del cliente. El nombre se usa para construir el `File` y no se persiste, así que `obtener_archivo` no lo recupera.

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **86 archivos / 736 tests** y `npm run build` en verde.
- Sin cambios en `package.json`: sigue en `1.1.25`, sin publicar.

### Seguimiento en backlog

Roadmap vacío a la espera de la siguiente entrada. Quedan MCP-05 y los recortes de chunks (2 entradas).

## 2026-11-15 — Roadmap MCP-09 · Administración de la instancia, tokens y auditoría cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Administradores:** la lógica de `/api/administrators` se extrajo a `lib/server/administradores.ts` y la ruta quedó como envoltura; `listar_administradores`, `crear_administrador` y `actualizar_administrador` trabajan con nombre, correo, revisión y estado de cuenta, con permiso solo para propietario o administración. Catálogo `0.17.0`, 44 herramientas.
- **Fase 2 — Baja y tokens:** `eliminar_administrador` avisa antes de borrar, exige `confirmar: true` y el nombre o correo exacto, y responde 409 si la revisión está desactualizada. `listar_tokens_mcp` y `revocar_token_mcp` solo operan sobre los tokens de la propia cuenta y nunca devuelven secreto, hash ni sal. Catálogo `0.18.0`, 47 herramientas.
- **Fase 3 — Auditoría:** `listar_actividad_mcp` consulta `mcp_audit_log` con filtros de vía, herramienta, resultado, proyecto y fechas, y paginación de 1 a 100. Aplica retención de 90 días; la cuenta ve solo sus filas y el propietario o la administración ven toda la instancia. Devuelve únicamente metadatos, sin argumentos ni contenidos. Catálogo `0.19.0`, 48 herramientas (20 de lectura, 28 de escritura, 8 destructivas).
- **Contrato y pruebas:** snapshot de `tools/list`, matriz de roles, guía y README sincronizados; paridad HTTP ↔ MCP de administradores y tokens, y pruebas SQLite reales para la retención, los filtros, la paginación, la visibilidad y la baja compartida con revisión.

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **85 archivos / 714 tests** y `npm run build` en verde.
- Sin cambios en `package.json`: sigue en `1.1.25`, sin publicar.

### Seguimiento en backlog

Roadmap vacío a la espera de la siguiente entrada. Quedan MCP-05, MCP-10 y los recortes de chunks (3 entradas).

## 2026-11-15 — Roadmap DOC-07 + MCP-11 · Guía del plugin, instrucciones y prompts cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Catálogo e instrucciones:** `lib/domain/mcp-catalogo.ts` reúne nombre, título, descripción, dominio, alcance y anotaciones de las 41 herramientas; el registro construye `MCP_TOOLS` desde ahí y un test impide que las definiciones de los dominios se desfases. `lib/server/mcp/instrucciones.ts` es el texto único que anuncian `/mcp` (`server/discover`/`initialize`) y `/api/mcp` (SDK), con la capacidad de prompts; el manifiesto no declara nombre, descripción ni icono porque no hay constancia de que Sites los admita.
- **Fase 2 — Prompts y descripciones:** `lib/domain/mcp-prompts.ts` publica `resumen_de_clase`, `planificar_semana`, `alta_de_alumnado` e `instalar_apps_del_aula`, con las mismas definiciones en las dos puertas y validación de argumentos obligatorios. `lib/domain/mcp-descripciones.ts` añade a las 41 descripciones un ejemplo JSON y su regla de rol; el registro compone la descripción publicada.
- **Fase 3 — Guía y cierre (DOC-07):** la sección «Servidor MCP» abre por el plugin para ChatGPT y Codex, deja el token personal como vía avanzada y genera la lista por dominio desde `mcpGuiaHerramientas()`; el README estrena «Plugin y herramientas» con un bloque entre marcadores generado por `mcpListaMarkdown()`. `mcp-guia.test.ts` comprueba el agrupado y la sincronización del README, y `content-coverage.test.ts` sigue cubriendo las 41 herramientas sin listas manuales.

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **79 archivos / 640 tests** y `npm run build` en verde.
- Sin cambios en las herramientas ni en la versión del catálogo (`0.16.0`); el snapshot de `tools/list` se mantiene porque solo cambian descripciones, prompts, instrucciones y documentación.
- No se ha publicado ni se ha incrementado la versión local (sigue en `1.1.25`).

### Seguimiento en backlog

Roadmap vacío a la espera de la siguiente entrada. Quedan MCP-05, MCP-09, MCP-10 y los recortes de chunks (4 entradas).

## 2026-11-15 — Roadmap MCP-08 · Proyectos: crear y eliminar cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Extracción y creación:** `createProject` en `lib/server/projects.ts` con la ruta `POST /api/projects` como envoltura; `crear_proyecto` recibe el nombre (1–80), genera el id en el servidor y devuelve proyecto, rol y enlace; 403 fuera de propietario y administración. Catálogo `0.14.0`, 40 herramientas.
- **Fase 2 — Aviso y recuento:** `deleteProject` y `projectDeletionInfo` con la ruta `DELETE` recableada; `eliminar_proyecto` devuelve el nombre y el resumen de lo que se borrará (tareas, fichas, miembros, pizarras, documentos y archivos), exige `confirmarNombre` exacto (400) y responde 404 si el proyecto no existe. Catálogo `0.15.0`, 41 herramientas.
- **Fase 3 — Borrado y cierre:** con el nombre exacto y `confirmar: true`, `eliminar_proyecto` ejecuta el borrado en cascada y la limpieza de archivos; si quedan archivos sin limpiar, `unavailable` 503 con el mensaje de la web. Catálogo `0.16.0`.
- **Contrato (MCP-12):** snapshot regenerado, matriz de roles con las tres herramientas de proyectos y paridad HTTP ↔ MCP en `app/api/proyectos-paridad.test.ts` (alta por propietario y administración, 403 de profesorado, aviso con recuento, nombre incorrecto, 404, borrado y 503).
- **Ayuda y README:** sección MCP con 41 herramientas; README con 41 / `0.16.0` y la lista real de proyectos (`listar_proyectos`, `crear_proyecto`, `eliminar_proyecto`).

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **76 archivos / 631 tests** y `npm run build` en verde.

### Seguimiento en backlog

Roadmap vacío a la espera de la siguiente entrada. Quedan DOC-07 (con MCP-11), MCP-05, MCP-09 a MCP-11 y recortes de chunks (6 entradas).

## 2026-11-15 — Roadmap MCP-07 · Miembros e invitaciones del proyecto cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Extracción y lectura:** `lib/server/members.ts` con `listMembers`, `inviteMember`, `removeMember` y `findMember`, y `/api/members` como envoltura. `listar_miembros` devuelve el miembro sin `userId`, con 403 para alumnado e invitados y filtrado del profesorado a alumnado y su propia ficha. Catálogo `0.11.0`, 37 herramientas.
- **Fase 2 — Invitación:** `invitar_miembro` con correo, rol y ficha según el rol; 400 «Selecciona una ficha válida para el rol.» y 409 «Esa cuenta ya tiene otro rol en el proyecto.». La invitación queda pendiente y no envía correo. Catálogo `0.12.0`, 38 herramientas.
- **Fase 3 — Retirada y cierre:** `retirar_miembro` destructiva con aviso previo (correo y rol) y `confirmar: true`; `findMember` comparte búsqueda y permisos con `removeMember`, así que el profesorado solo retira alumnado y cada cual puede retirarse a sí mismo. Catálogo `0.13.0`, 39 herramientas.
- **Contrato (MCP-12):** snapshot regenerado, matriz de roles con las tres herramientas de miembros y paridad HTTP ↔ MCP en `app/api/personas-paridad.test.ts` (lista sin `userId`, filtrado del profesorado, 403 de alumnado, invitación idempotente, 400/409 y aviso/retirada).
- **Ayuda y README:** sección MCP con 39 herramientas; README con 39 herramientas y catálogo `0.13.0`.

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **75 archivos / 609 tests** y `npm run build` en verde.

### Seguimiento en backlog

Roadmap vacío a la espera de la siguiente entrada. Quedan DOC-07 (con MCP-11), MCP-05, MCP-08 a MCP-11 y recortes de chunks (7 entradas).

## 2026-11-15 — Roadmap MCP-06 · Personas: fichas de alumnado y profesorado cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Extracción y lectura:** la lógica de `mutate` de `/api/students` y `/api/teachers` pasa a `lib/server/people/{campos,students,teachers}.ts` con las rutas como envoltura; `listar_alumnos` y `listar_profesores` añaden rol, actividad, `ayudaIA`, `revision` y estado de cuenta; `obtener_alumno`/`obtener_profesor` responden 404 «No se encuentra la ficha en este proyecto.»; el correo solo aparece bajo `maySeeEmail`. Catálogo `0.8.0`, 30 herramientas.
- **Fase 2 — Alta y edición:** `crear_alumno`/`crear_profesor` (sección o id generados por el servidor, invitación pendiente si se pasa correo y 403 por rol) y `actualizar_alumno`/`actualizar_profesor` con `revision`, conservando los campos omitidos y devolviendo el 409 de la web. Catálogo `0.9.0`, 34 herramientas.
- **Fase 3 — Baja y cierre:** `deleteStudent`/`deleteTeacher` compartidos con las rutas `DELETE`; `eliminar_alumno`/`eliminar_profesor` destructivas con `revision`, aviso previo, `confirmar: true` y nombre exacto; la ficha pasa al histórico de 30 días y se retira su cuenta del proyecto. Catálogo `0.10.0`, 36 herramientas.
- **Contrato (MCP-12):** snapshot regenerado, matriz de roles con las ocho herramientas de personas y paridad HTTP ↔ MCP de fichas en `app/api/personas-paridad.test.ts` (lectura, correo oculto, 404/403, alta, edición, 409 de revisión y bajas).
- **Ayuda y README:** sección MCP con 36 herramientas, nota de los campos de ficha y aviso de bajas; README con 36 herramientas y catálogo `0.10.0`.

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **75 archivos / 580 tests** y `npm run build` en verde.
- La paridad llama a los `GET`/`POST`/`PATCH`/`DELETE` reales de las rutas con `resolveProject` mockeado; las bajas usan el `env.DB` simulado.

### Seguimiento en backlog

MCP-07 entra al roadmap; DOC-07 (con MCP-11), MCP-05, MCP-08 a MCP-11 y recortes de chunks siguen aparcados (7 entradas).

## 2026-11-15 — Roadmap documental de cara al usuario cerrado (DOC-01..DOC-12)

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Ayuda completa en `app/board/docs/content.ts`:** corrección de lo obsoleto (DOC-01), Aula Store y las cuatro apps con sus versiones (DOC-05), tareas y calendario (DOC-02), personas, miembros e invitaciones (DOC-03), proyectos y ajustes (DOC-04), guías por rol y tabla de permisos (DOC-06), FAQ con los mensajes reales (DOC-10), enlaces por vista, portada y remix (DOC-08) y Novedades solo con versiones publicadas (DOC-09). Seis secciones nuevas (`calendario`, `personas`, `proyectos`, `problemas`, `enlaces`, `novedades`), cada una con icono e ilustración propios en `section-art.tsx` y `section-visuals.ts`.
- **Bloque `image` en la ayuda:** `DocBlock` gana `{ type: "image", src, alt, caption }`, renderizado como `<figure>` con `<figcaption>` y estilos en `docs.css`; las ilustraciones siguen siendo las únicas con nombre accesible por `aria-labelledby`.
- **Capturas reales sobre un proyecto de demostración (DOC-11):** proyecto «Proyecto de demostración» con seis alumnos y dos profesores ficticios, ocho tareas repartidas por estado y las cuatro apps instaladas, sembrado por la API en la base D1 local (no versionada). Capturas de 1200 px en `public/capturas/{tareas,calendario,espacio,ajustes}.webp` (16–46 KB), tomadas con Chrome headless a 1440×950 y cabeceras de sesión locales; Ajustes se recorta a la ficha de Cuenta para no mostrar tokens de pruebas. Textos alternativos y pies en la ayuda.
- **Test de cobertura (DOC-12):** `content-coverage.test.ts` aplana el contenido y rompe si falta una vista de `BOARD_VIEWS`, una app de `NATIVE_APPS` (nombre y `appVersion`) o una herramienta de `MCP_TOOLS` (con límites de palabra); para cumplirlo, la sección MCP lista las 28 herramientas por dominio.
- **Portada y hero:** `app/portada.tsx` y `docsHero.intro` resumen tareas y calendario, fichas, Mi espacio y plugin, sin datos de la instancia.

### Verificación

- `npm run lint` 0 errores (3 avisos históricos de `ui://`), `npx tsc --noEmit` limpio, `npm test` **74 archivos / 511 tests** y `npm run build` en verde.
- El test de cobertura se comprobó en rojo quitando `cerrar_app` de la ayuda y volvió a verde al restaurar.
- Las cuatro capturas se revisaron una a una (acentos correctos, sin datos reales de alumnos ni de producción).

### Seguimiento en backlog

DOC-07 (con MCP-11), MCP-05..MCP-11 y recortes de chunks (9 entradas).

## 2026-11-14 — Roadmap MCP-04 · Mi espacio: enlace, ventanas en vivo y `ui://` cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Enlace profundo:** `app=<appId>` en el esquema de URL de `view=espacio` (`lib/domain/board-url.ts` con `app` en `parseBoardUrl`/`buildBoardUrl` y tests); `SpaceView` abre la ventana indicada al cargar si la app está instalada. Herramienta `abrir_app` (lectura) con el enlace absoluto y 404 «La aplicación no está instalada». Catálogo en 23 herramientas (`0.6.0`).
- **Fase 2 — Control en vivo:** canal `space` con el DO `SpaceRoom` nuevo (un DO por proyecto, solo en memoria) y ruta `/api/space-socket` en `worker/index.ts`; `SpaceView` publica el estado de sus ventanas y aplica comandos con el hook `use-space-socket`. Herramientas `listar_ventanas`, `cerrar_app`, `minimizar_app`, `restaurar_app`, `ampliar_app` y `abrir_app` en vivo (`ventana_conectada`/`ventana_entregada`); sin pestañas conectadas devuelven enlace sin error. Persistencia decidida como efímera por pestaña, sin tabla. Catálogo en 28 herramientas (`0.7.0`).
- **Fase 3 — `ui://` (SEP-1865):** Sites/ChatGPT lo admite; implementado con el SDK 1.x instalado, sin `@modelcontextprotocol/ext-apps` (exige SDK v2): recurso `ui://aula-espacio/apertura` (`text/html;profile=mcp-app`) en ambas puertas y `_meta.ui.resourceUri` en `abrir_app`. Mini-app autocontenida con puente `ui/*` (initialize, tool-result con enlace, `tools/call` a `listar_apps`).
- **Fase 4 — MCP-12 aplicado:** snapshot a 28 herramientas con igualdad de puertas, matriz de roles extendida (191 casos) y paridad MCP ↔ HTTP (18 casos), más 3 tests del hook cliente.
- **Verificación:** `lint` 0, `tsc` limpio, **73 archivos / 508 tests**, `build` en verde; smoke con el plugin real por fase (catálogo, enlace, 404, `ventana_conectada: false` sin pestañas en dev, `resources/list`/`read`, `_meta` en `tools/list`). El socket en vivo no se puede probar con petición real en dev (vinext no enruta `/api/space-socket` por `worker/index.ts`, igual que `/api/board-socket`); su contrato queda verificado por código, tests del hook y documentación.

### Seguimiento en backlog

MCP-05 (acciones de cada app) y MCP-06..MCP-11, bloque documental DOC-01..DOC-12 (orden sugerido DOC-01 → DOC-05 → DOC-02 → DOC-03 → DOC-07 → DOC-04 → DOC-06 → DOC-10 → DOC-12 → DOC-08 → DOC-09 → DOC-11) y recortes de chunks. La guarda de `/oauth/revoke` en producción sigue pendiente de la próxima publicación.

## 2026-11-14 — Roadmap MCP-03 · Aula Store: catálogo, instalar y desinstalar apps cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Extracción y catálogo:** `lib/server/apps.ts` (`listInstalledApps`, `setAppInstalled`) con la ruta `/api/space-apps` re-cableada y `appVersion` guardado al instalar. Herramientas `listar_apps` (con `proyectoId` opcional que exige acceso) y `obtener_app` (ficha completa de la tienda).
- **Fase 2 — Instalación y desinstalación:** `instalar_app` idempotente y `desinstalar_app` con aviso previo (desaparece de Mi espacio para todos; los documentos se conservan) y `confirmar: true`; solo propietario/administrador con el 403 compartido con la ruta. Catálogo en 22 herramientas, versión `0.5.0`.
- **Fase 3 — MCP-12 aplicado:** snapshot a 22 herramientas con igualdad de puertas, matriz de roles extendida (148 casos por tabla en `matriz.test.ts`) y paridad MCP ↔ HTTP (16 casos en `paridad.test.ts`).
- **Verificación:** `lint` 0, `tsc` limpio, **72 archivos / 457 tests**, `build` en verde; smoke con el plugin real por fase (catálogo, ficha, idempotencia, aviso/desinstalación con restauración del estado local y ruta GET con la versión de app).

### Seguimiento en backlog

MCP-04 (ventanas de Mi espacio, paso A a continuación) y MCP-05..MCP-11, bloque documental DOC-01..DOC-12 (orden sugerido DOC-01 → DOC-05 → DOC-02 → DOC-03 → DOC-07 → DOC-04 → DOC-06 → DOC-10 → DOC-12 → DOC-08 → DOC-09 → DOC-11) y recortes de chunks. La guarda de `/oauth/revoke` en producción sigue pendiente de la próxima publicación.

## 2026-11-14 — Roadmap MCP-01 + MCP-02 · Contexto, enlaces, tareas completas y calendario cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — MCP-01 (contexto y enlaces):** esquema de URL movido a `lib/domain/board-url.ts` con reexportes en la app sin cambiar sus imports; `lib/server/mcp/links.ts` retirado; enlaces absolutos con el origen de la petición (`lib/server/mcp/enlaces.ts`, `extra.origen` en ambas puertas). Nuevas herramientas: `quien_soy` (identidad, propietario/administrador, proyectos con rol y ficha), `obtener_enlace` (URL canónica absoluta 403/404), `obtener_resumen_proyecto` (tareas por estado, vencidas, semana, personas, apps y enlaces) e invitaciones (`listar_invitaciones_pendientes`, `aceptar_invitacion`; lógica extraída a `lib/server/invitaciones.ts` y ruta re-cableada; 404 ajena/409 compartida).
- **Fase 2 — MCP-02 (tareas completas y calendario):** `mover_tarea`, `asignar_tarea`, `desasignar_tarea`, `reprogramar_tarea` (mismo `updateTask` y permisos que la web; 409 con `revisionActual`); `listar_tareas` con `profesor`, rango de vencimiento, `sinFecha`, `vencidas` y `orden`; `listar_calendario` agrupado por día con tope de 92 días. `adjuntar_imagen_tarea` queda aparcada hasta MCP-10 (archivos). Catálogo en 18 herramientas, versión `0.4.0`.
- **Fase 3 — MCP-12 aplicado:** snapshot a 18 herramientas con igualdad de puertas, matriz de roles 18 × 7 (122 casos por tabla en `matriz.test.ts`) y paridad MCP ↔ HTTP extendida (403/404 de contrato, invitaciones, refs 400, mover/reprogramar 409 y calendario 400 en `paridad.test.ts`).
- **Verificación:** `lint` 0, `tsc` limpio, **72 archivos / 428 tests**, `build` en verde; smoke con el plugin real en cada fase (enlaces absolutos, calendario agrupado, mover/reprogramar con revisión, 404 estructurados). Base local limpia.

### Seguimiento en backlog

MCP-03 (Aula Store) es el siguiente en dependencia; MCP-04..MCP-11 y los recortes de chunks siguen aparcados. La guarda de `/oauth/revoke` en producción sigue pendiente de la próxima publicación.

## 2026-11-14 — Roadmap MCP-00 + MCP-12 · Fundamentos del catálogo y su contrato cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — MCP-00 (fundamentos del catálogo):** registro central `lib/server/mcp/registro.ts` con un módulo por dominio (`dominios/proyectos.ts`, `tareas.ts`, `personas.ts`); `READ_TOOL_NAMES`/`WRITE_TOOL_NAMES` y `scopeForTool` derivan de cada definición, así que una herramienta nueva sin alcance rompe un test. Errores con contrato HTTP (`isError` + `structuredContent.error = { codigo, estado, mensaje }`: 401/400/404/403 desde `PROJECT_FAILURE_RESPONSES`, más 409/413/503/429) y `outputSchema` + `structuredContent` conservando el texto JSON. Anotaciones (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint: false`) en las 8 herramientas; `eliminar_tarea` (única destructiva) avisa antes y solo borra con `confirmar: true`. Revisión con `conflict` 409 y `revisionActual` en el error. Paginación uniforme (`pagina`/`porPagina`/`total`) en todas las listas. Tabla `mcp_audit_log` (migración `0034`; fecha, cuenta, vía, `clientId`, herramienta, proyecto, resultado, duración; sin argumentos) con retención de 90 días y purga al registrar; best-effort, nunca rompe la llamada. Límite del plugin por `userId` 120/min y 30/min en escrituras. Un solo catálogo, dos puertas: la versión sube a `0.2.0`. `imagenUrl` valida igual que `/api/tasks`; `listVisibleProjects` (`lib/server/projects.ts`) resuelve el rol global una sola vez por petición.
- **Fase 2 — MCP-12 (contrato y pruebas):** snapshot de `tools/list` con esquemas, anotaciones y alcance; igualdad entre las puertas `/mcp` y `/api/mcp`; invariantes de alcance y anotaciones; matriz de roles 8 herramientas × 7 casos (propietario, administrador, profesor, alumno, invitado, sin acceso, inexistente) en `matriz.test.ts`; paridad MCP ↔ HTTP por operación en `paridad.test.ts` (resolución, invitado, alumno y fallos de mutación tal cual).
- **Verificación:** `lint` 0, `tsc` limpio, **72 archivos / 354 tests**, `build` en verde; smoke con el plugin real (aviso sin borrar → borrado con `confirmar`, 409 con revisión, filas de auditoría). Base local limpia.
- **Alcance aplazado (decisión registrada):** la extracción de las rutas HTTP a `lib/server` solo se hizo para proyectos (tareas ya vivía allí); apps, documentos, pizarras, miembros, invitaciones, fichas, administradores y subidas se extraerán con sus dominios (MCP-03..MCP-10).

### Seguimiento en backlog

MCP-01 (contexto y enlaces) y MCP-02 (tareas completas y calendario) como candidatos; MCP-03..MCP-11 y recortes de chunks siguen aparcados. La guarda de `/oauth/revoke` en producción sigue pendiente de la próxima publicación (ver entrada del plugin).

## 2026-11-14 — Roadmap de Plugin de Aula Kanban para Sites cerrado

**Estado:** Completada · Publicada (plugin verificado en GPT) · La guarda de `/oauth/revoke` en producción queda para la próxima publicación

### Cambios

- **Fase 1 — Protocolo e identidad:** endpoint `/mcp` con el catálogo MCP existente (`app/mcp/route.ts`: `server/discover` con versión `2026-07-28`, `tools/list` con las 8 herramientas y su `inputSchema`, `tools/call` con validación zod de argumentos) y capacidad `mcp` declarada en `.openai/hosting.json`. La identidad sale de `getChatGPTUser()` (cabeceras `oai-authenticated-user-*` de Sites); los `userId`/`email` enviados en argumentos se ignoran.
- **Verificación de la Fase 1 (2026-11-14, dev 5173):** ciclo completo como propietario (crear → obtener → actualizar → eliminar); roles con cambio temporal y restauración de `instance_owner`/`project_members` en la D1 local: alumno (`rol: student`) crea sin responsable y asignada a sí mismo y recibe «Solo puedes asignarte la tarea a ti o dejarla sin asignar» con responsable ajeno; invitado (`rol: guest`) lee y recibe «Las cuentas invitadas solo pueden consultar el proyecto» al escribir; sin membresía, 0 proyectos; sin sesión, 401 `-32001`.
- **Fase 2 — Seguridad y publicación:** el servidor OAuth experimental responde **503 en producción** en todos sus endpoints (`/oauth/register`, `/authorize` + consentimiento, `/oauth/token`, descubrimiento `/.well-known/*`); en la revisión de cierre se añadió la guarda que faltaba en `/oauth/revoke` (inerte en producción —sin tokens creables—, pero ya consistente; saldrá en la próxima publicación). El MCP de tokens personales (`/api/mcp`) queda como vía separada del plugin nativo.
- **Manifiesto:** el `hosting.json` versionado conserva el ejemplo (`appgprj_0000…`); el `project_id` real sigue en `.openai/hosting.local.json` (gitignored) y el plugin vendored lo copia a `dist/.openai/hosting.json` al compilar, sin tocar la historia.
- **Migraciones:** las 0031–0033 se aplican en Sites antes de actualizar el Worker en cada publicación; el plugin no depende de las tablas OAuth/MCP en producción.
- **Verificación:** **69 archivos / 286 tests**, `lint`, `tsc` y `build` en verde sobre el árbol publicado. El propietario confirmó el plugin funcionando en GPT y en el Site.

### Seguimiento en backlog

Recortes de rendimiento de los chunks pesados. La entrada «GPT con Actions» queda cerrada: el plugin de Sites la sustituye.

## 2026-11-14 — Roadmap de OAuth 2.1 para MCP y GPT cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Fase 1 — Servidor de autorización en el Site:** migración `0033_adorable_trish_tilby` (`oauth_clients`, `oauth_authorization_codes`, `oauth_access_tokens`, `oauth_refresh_tokens`), servicio `lib/server/oauth/` con secretos hasheados con sal y rutas `/oauth/register` (RFC 7591), `/oauth/authorize` + consentimiento con sesión SIWC y guarda de mismo origen, `/oauth/token` (authorization code con PKCE S256 obligatorio y refresh con rotación), `/oauth/revoke` (RFC 7009) y descubrimiento (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/mcp`).
- **Fase 2 — MCP como resource server OAuth:** verificador unificado `lib/server/mcp/auth.ts` (token personal `ak_mcp_…` con cuenta completa, o token OAuth con sus alcances `mcp:read`/`mcp:write` y recurso `origen/api/mcp`); pre-check de alcance en `tools/call` con `403 insufficient_scope` y desafío con `resource_metadata` en el `401`; `verifyAccessToken` devuelve `tokenId` y actualiza `last_used_at`.
- **Fase 3 — Cierre con el GPT:** datos de conexión de ChatGPT Actions listos (authorization/token/revocation URL, recurso, scopes, registro previo del cliente) y documentación de instalación OAuth en `README.md` y en la nueva sección «Autorización OAuth» de `/documentacion` (descubrimiento, alcances, vigencias, revocación, nota de que los tokens personales siguen funcionando).
- **Verificación:** **68 archivos / 279 tests**, `lint`, `tsc` y `build` en verde; smoke en dev (curl, sin Inspector en el entorno) del flujo completo: lectura 200, escritura sin `mcp:write` 403, revocado 401, token personal 200.

### Seguimiento en backlog

GPT con Actions y recortes de chunks.

## 2026-11-14 — Roadmap de Repositorio público en GitHub, licencia MIT y CI cerrado

**Estado:** Completada · Pendiente de publicación

### Cambios

- **Historial saneado:** los 65 commits de `main` quedaron con autor/committer `JaminSmoke <80690017+jaminsmoke@users.noreply.github.com>` (sin Gmail) tras `git filter-repo` con mailmap; copia de seguridad deliberada en la rama `respaldo-pre-github` y en `respaldo-pre-github.bundle` (ambas locales, sin publicar), `user.email` local al `noreply` y flujo de publicación de Sites intacto.
- **`hosting.json` protegido:** el fichero versionado de `.openai/hosting.json` lleva un ejemplo (`appgprj_0000…`); el valor real vive en `.openai/hosting.local.json`, **gitignored**, y la build lo usa al publicar (pequeña desviación documentada en el plugin vendored). Los clonadores publican un `project_id` propio sin tocar el valor versionado.
- **Licencia MIT** en la raíz («Copyright (c) 2026 Jorge Martín Delgado (JaminSmoke)») y **textos oficiales de licencia** de las ocho fuentes latinas de Excalidraw en `public/excalidraw/fonts/<Familia>/` (Assistant, Lilita y Nunito de `google/fonts`, Virgil de `excalidraw/virgil`, Cascadia de `microsoft/cascadia-code`, Liberation de `liberationfonts`, ComicShanns de `shannpersand/comic-shanns`, Excalifont con su encabezado oficial + OFL 1.1).
- **CI** en `.github/workflows/ci.yml` (push/PR a `main`: `npm ci`, `lint`, `tsc --noEmit`, `vitest`, sin secretos), en verde en el repositorio público en ambos pushes.
- **Repositorio público** [`jaminsmoke/aula-kanban`](https://github.com/jaminsmoke/aula-kanban) con tag `v1.1.24`, creado desde esta carpeta como remote adicional `github` (Sites sigue siendo el origen de publicación, sin migrar nada).
- **Documentación y remix:** README con sección «Clonar desde GitHub» e instrucciones para un agente; el diálogo «Haz tu Site de Aula Kanban» ofrece ahora dos mensajes copiables (`@Sites` y «Copiar mensaje (git)» sobre clonar y publicar).
- **Verificación:** suite completa **65/259 tests**, `lint`, `tsc` y `build` locales en verde; CI en verde en GitHub tras el primer y el segundo push.

### Seguimiento en backlog

OAuth 2.1, GPT con Actions y recortes de chunks.

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
