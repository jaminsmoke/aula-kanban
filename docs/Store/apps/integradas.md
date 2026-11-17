# Apps integradas

Última verificación: **2026-11-16**.

| App | Paquete | Licencia | Estado | Notas |
|---|---|---|---|---|
| Pizarra Excalidraw | `@excalidraw/excalidraw` 0.18.1 | MIT | ✅ Integrada | Pizarras de tareas, proyecto y Tienda, con sincronización en vivo y superficie MCP de lectura, escritura y adición de formas; instalable desde Aula Store |
| Programación por bloques | `blockly` 13.4.0 | Apache-2.0 | ✅ Integrada | Caja de herramientas en español, bloques de lógica, bucles, matemáticas, texto, variables y funciones; guardado por proyecto en D1 (`app_documents`), ejemplo inicial, descarga en JSON y **panel de código** JavaScript/Python con copia y **ejecución de JavaScript** (salida, errores y tiempo agotado). Los recursos (`media/`) se sirven desde `public/blockly-media` |
| Calculadora | Integración propia · `@cortex-js/compute-engine` 0.188.0 | MIT | ✅ Integrada | Calculadora en el centro con chips de modo (Básica / Científica con dos páginas de funciones / Ecuaciones), memoria M+/M−/MR, historial persistente y resultado decimal y exacto; al activar **Ecuaciones** aparece su panel al lado, con varias líneas, variables compartidas, teclado matemático y resultado por fila |
| Tabla periódica | Integración propia | — | ✅ Integrada | Tabla periódica propia en español con búsqueda, filtros por categoría y bloque, modelo atómico animado, descripción e historia. No usa paquete upstream |
| Diagramas | `mermaid` 12.3.0 | MIT | ✅ Integrada | Diagramas de flujo, secuencia, Gantt, clases, estados y líneas de tiempo; editor y vista previa, plantillas, guardado por proyecto en D1 (`app_documents`) y exportación SVG |
| Ajedrez | `chess.js` 1.4.0 + `react-chessboard` 5.12.1 | BSD-2 / MIT | ✅ Integrada | Tablero local para dos jugadores o rival aleatorio; reglas completas, historial, coronación con elección y movimientos por clic, arrastre o teclado. Sin estado de servidor |
| Tarjetas de repaso | `ts-fsrs` 6.0.0 | MIT | ✅ Integrada | Mazos y tarjetas compartidos por proyecto; repaso FSRS con cuatro valoraciones, resumen de sesión y progreso local por navegador. Edición de mazos limitada a roles no invitados |

## Versiones por app

| App | Versión de la app | Upstream |
|---|---|---|
| Excalidraw | `1.0.0` | `@excalidraw/excalidraw 0.18.1` |
| Calculadora | `1.0.0` | `@cortex-js/compute-engine 0.188.0` |
| Tabla periódica | `1.0.0` | Integración propia |
| Programación por bloques | `1.0.0` | `blockly 13.4.0` |
| Diagramas | `1.0.0` | `mermaid 12.3.0` |
| Ajedrez | `1.0.0` | `chess.js 1.4.0` + `react-chessboard 5.12.1` |
| Tarjetas de repaso | `1.0.0` | `ts-fsrs 6.0.0` |

La tienda está en `1.2.0`: las incorporaciones de Ajedrez y Tarjetas de repaso subieron la versión menor. El campo `instance_apps.version` existe en la base de datos, pero la ficha usa el catálogo; no se duplica la versión por cada instalación. No se crean paquetes independientes ni forks para separar versiones.

## Transición de `edu-tools`

La transición de datos del servicio separa una instalación antigua de `edu-tools` en las dos apps nuevas (Calculadora y Tabla periódica) y traslada favorito y posición por usuario y proyecto al consultar su espacio. Es atómica por lote e idempotente: respeta los valores nuevos y retira las filas antiguas una vez trasladadas. `0039_split_edu_tools` contiene solo esquema. Durante un ciclo, `?app=edu-tools` y `abrir_app` resuelven el alias como `calculadora`.

## Portadas

Las siete apps usan portadas SVG de 1200×675 en `public/store/`, con la misma composición visual. La integración y el cierre de esa unificación están documentados en [`../../historial/roadmap-store-05.md`](../../historial/roadmap-store-05.md); Ajedrez y Tarjetas añaden sus portadas en STORE-06 y STORE-09, ya completados.
