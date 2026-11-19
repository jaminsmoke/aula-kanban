# Apps integradas

Última verificación: **2026-11-19**.

| App | Paquete | Licencia | Estado | Notas |
|---|---|---|---|---|
| Pizarra Excalidraw | `@excalidraw/excalidraw` 0.18.1 | MIT | ✅ Integrada | Pizarras de tareas, proyecto y Tienda, con sincronización en vivo y superficie MCP de lectura, escritura y adición de formas; instalable desde Aula Store |
| Programación por bloques | `blockly` 13.4.0 | Apache-2.0 | ✅ Integrada | Caja de herramientas en español, bloques de lógica, bucles, matemáticas, texto, variables y funciones; guardado por proyecto en D1 (`app_documents`), ejemplo inicial, descarga en JSON y **panel de código** JavaScript/Python con copia y **ejecución de JavaScript** (salida, errores y tiempo agotado). Los recursos (`media/`) se sirven desde `public/blockly-media` |
| Calculadora | Integración propia · `@cortex-js/compute-engine` 0.188.0 | MIT | ✅ Integrada | Calculadora en el centro con chips de modo (Básica / Científica con dos páginas de funciones / Ecuaciones), memoria M+/M−/MR, historial persistente y resultado decimal y exacto; al activar **Ecuaciones** aparece su panel al lado, con varias líneas, variables compartidas, teclado matemático y resultado por fila |
| Tabla periódica | Integración propia | — | ✅ Integrada | Tabla periódica propia en español con búsqueda, filtros por categoría y bloque, modelo atómico animado, descripción e historia. No usa paquete upstream |
| Ajedrez | `chess.js` 1.4.0 + `react-chessboard` 5.12.1 | BSD-2 / MIT | ✅ Integrada | Tablero local para dos jugadores o rival aleatorio; reglas completas, historial, coronación con elección y movimientos por clic, arrastre o teclado. Sin estado de servidor |
| Tarjetas de repaso | `ts-fsrs` 6.0.0 | MIT | ✅ Integrada | Mazos y tarjetas compartidos por proyecto; repaso FSRS con cuatro valoraciones, resumen de sesión y progreso local por navegador. Edición de mazos limitada a roles no invitados |
| Física 2D | `matter-js` 0.20.0 | MIT | ✅ Integrada | Laboratorio de gravedad, colisiones, muelles y péndulos; reproducir, pausar, reiniciar, ajustar gravedad y arrastrar cuerpos. Escena efímera sin servidor |
| Geometría interactiva | `jsxgraph` 1.14.3 | MIT | ✅ Integrada | Puntos, segmentos, rectas, circunferencias, etiquetas y medidas dinámicas; presets de triángulo, circunferencia y rectas; funciones de parábola, seno y recta con visibilidad. Escena efímera sin servidor |
| Mapas conceptuales | `@xyflow/react` 12.12.1 | MIT | ✅ Integrada | Nodos y conexiones editables con zoom y paneo; plantillas de mapa conceptual y mental; guardado por proyecto en `app_documents` y modo lectura para invitados |
| Moléculas 3D | `3dmol` 2.5.5 | BSD-3 | ✅ Integrada | Visor molecular con ocho estructuras SDF locales, rotación, zoom, etiquetas, ficha con fórmula y control por teclado; sin red ni estado de servidor |
| Líneas de tiempo | `vis-timeline` 8.5.6 | MIT | ✅ Integrada | Eventos, épocas y grupos sobre un lienzo temporal con zoom y plantillas; guardado por proyecto en `app_documents` y modo lectura para invitados |
| Hoja de cálculo | `jspreadsheet-ce` 5.0.4 | MIT | ✅ Integrada | Celdas editables, formato esencial, filas y columnas ampliables; exportación CSV protegida, guardado por proyecto y modo lectura. Las fórmulas se conservan como texto |
| Aula Documentos | `@tiptap/core` 3.34.0 + `mermaid` 12.3.0 + `reveal.js` 6.0.2 + `docx` 9.16.0 + `pptxgenjs` 4.0.1 | MIT | ✅ Integrada | Suite documental con texto enriquecido, tablas, bloques Mermaid, presentaciones y Office; migración de Notas, Diagramas y Presentaciones, importación de Markdown y DOCX/PPTX, y exportación HTML/Markdown/DOCX/PPTX. Guardado por proyecto en `app_documents` |

## Versiones por app

| App | Versión de la app | Upstream |
|---|---|---|
| Excalidraw | `1.0.0` | `@excalidraw/excalidraw 0.18.1` |
| Calculadora | `1.0.0` | `@cortex-js/compute-engine 0.188.0` |
| Tabla periódica | `1.0.0` | Integración propia |
| Programación por bloques | `1.0.0` | `blockly 13.4.0` |
| Ajedrez | `1.0.0` | `chess.js 1.4.0` + `react-chessboard 5.12.1` |
| Tarjetas de repaso | `1.0.0` | `ts-fsrs 6.0.0` |
| Física 2D | `1.0.0` | `matter-js 0.20.0` |
| Geometría interactiva | `1.0.0` | `jsxgraph 1.14.3` |
| Mapas conceptuales | `1.0.0` | `@xyflow/react 12.12.1` |
| Moléculas 3D | `1.0.0` | `3dmol 2.5.5` |
| Líneas de tiempo | `1.0.0` | `vis-timeline 8.5.6` |
| Hoja de cálculo | `1.0.0` | `jspreadsheet-ce 5.0.4` |
| Aula Documentos | `1.2.0` | `@tiptap/core 3.34.0` + Tiptap, `mermaid 12.3.0`, `reveal.js 6.0.2`, `docx 9.16.0` y `pptxgenjs 4.0.1` |

La tienda está en `1.14.0`: Aula Documentos subió a `1.2.0` al convertirse en la suite documental y retirar las cuatro apps que absorbe. El campo `instance_apps.version` existe en la base de datos, pero la ficha usa el catálogo; no se duplica la versión por cada instalación. No se crean paquetes independientes ni forks para separar versiones.

## Transición de `edu-tools`

La transición de datos del servicio separa una instalación antigua de `edu-tools` en las dos apps nuevas (Calculadora y Tabla periódica) y traslada favorito y posición por usuario y proyecto al consultar su espacio. Es atómica por lote e idempotente: respeta los valores nuevos y retira las filas antiguas una vez trasladadas. `0039_split_edu_tools` contiene solo esquema. Durante un ciclo, `?app=edu-tools` y `abrir_app` resuelven el alias como `calculadora`.

## Portadas

Las trece apps usan portadas SVG de 1200×675 en `public/store/`, con la misma composición visual. La integración y el cierre de esa unificación están documentados en [`../../historial/roadmap-store-05.md`](../../historial/roadmap-store-05.md); Ajedrez, Tarjetas, Física, Geometría, Mapas, Moléculas 3D, Líneas de tiempo, Hoja de cálculo y Aula Documentos añaden sus portadas en STORE-06, STORE-09, STORE-07, STORE-08, STORE-10, STORE-12, STORE-13, STORE-14 y STORE-17, ya completados.
