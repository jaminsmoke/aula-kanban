# Aplicaciones nativas de Aula Store

Lista viva de las aplicaciones nativas de Aula Kanban: qué está integrado, qué es
candidato y qué se ha descartado, con la licencia y la versión comprobadas en npm.

Última verificación: **2026-11-16**.

## Qué es una aplicación nativa

Una app nativa es una **librería que corre entera en el cliente**: se instala como
dependencia npm, se carga en un chunk aparte y se abre como ventana dentro de
*Tienda*. No tiene backend propio ni proceso en el servidor.

Requisitos para entrar en el catálogo:

- Licencia permisiva y compatible: **MIT, Apache-2.0, BSD, ISC**. Se descartan
  AGPL/GPL fuerte, SSPL, MPL cuando obliga a más de lo razonable, y licencias
  comerciales con clave o marca de agua.
- **Sin servidor propio**: todo el estado de trabajo vive en el navegador.
- **Carga diferida**: `lazy(() => import(...))` en un componente cliente; nunca en
  el bundle inicial del tablero.
- **Sin CDN de terceros** en producción: workers, fuentes, sonidos y assets se
  sirven desde el propio Site.
- Tamaño razonable para un chunk bajo demanda (orientativo: menos de ~1,5 MB gzip).
- Si necesita datos externos (teselas de mapa, catálogos), se documenta la
  dependencia de red y su atribución.

### Persistencia

La tabla `instance_apps` guarda solo el estado **instalada / no instalada de la
instancia**; lo gestionan el propietario y los administradores.

Para guardar trabajo hay una persistencia común, sin tabla ni endpoint por app:

1. **Sin persistencia** (abrir, trabajar, exportar y cerrar): la opción barata.
2. **`localStorage`**: progreso por navegador, no compartido entre el equipo.
3. **`app_documents`**: un estado JSON por proyecto y app, con permisos de
   edición y borrado. La interfaz usa `useAppDocument(projectId, appId)` y el
   servidor `/api/app-documents?project=…&app=…`. No hace falta migración nueva
   para una app que solo guarde un documento.

Los documentos de Blockly y Mermaid se guardan en `app_documents`, igual que
los de las futuras apps que usen este modelo.

## Cómo se integra una app

1. Carpeta propia en `app/board/apps/<id>/` con su componente y estilos.
2. Ficha en `NATIVE_APPS` de `lib/native-apps.ts` (data pura, también para el
   servidor): nombre, categorías (familias de uso) y subcategoría, portada,
   características y tamaño de ventana. La taxonomía cerrada está en
   `lib/native-apps.ts` (`STORE_TOP_CATEGORIES` y `STORE_SUBCATEGORIES`);
   una app puede pertenecer a varias categorías principales.
3. Registro en `app/board/apps/registry.tsx`: icono y componente lazy. El test
   `registry.test.ts` avisa si falta algo o si los ids no coinciden con la API.
4. Si guarda un documento, usa `useAppDocument` y añade su estado a esa tabla;
   no crees una tabla ni una ruta nuevas salvo que el dato no sea un documento
   JSON por proyecto.
5. Avisos de licencia en `THIRD-PARTY-NOTICES.md` (Apache-2.0 y BSD obligan a
   conservar el aviso de copyright).
6. Test de la tarjeta y de la ventana, y actualizar esta lista.

## Integradas

| App | Paquete | Licencia | Estado | Notas |
|---|---|---|---|---|
| Pizarra Excalidraw | `@excalidraw/excalidraw` 0.18.1 | MIT | ✅ Integrada | Pizarras de tareas, proyecto y Tienda, con sincronización en vivo y superficie MCP de lectura, escritura y adición de formas; instalable desde Aula Store |
| Programación por bloques | `blockly` 13.4.0 | Apache-2.0 | ✅ Integrada | Caja de herramientas en español, bloques de lógica, bucles, matemáticas, texto, variables y funciones; guardado por proyecto en D1 (`app_documents`), ejemplo inicial, descarga en JSON y **panel de código** JavaScript/Python con copia y **ejecución de JavaScript** (salida, errores y tiempo agotado). Los recursos (`media/`) se sirven desde `public/blockly-media` |
| Calculadora | Integración propia · `@cortex-js/compute-engine` 0.188.0 | MIT | ✅ Integrada | Calculadora en el centro con chips de modo (Básica / Científica con dos páginas de funciones / Ecuaciones), memoria M+/M−/MR, historial persistente y resultado decimal y exacto; al activar **Ecuaciones** aparece su panel al lado, con varias líneas, variables compartidas, teclado matemático y resultado por fila |
| Tabla periódica | Integración propia | — | ✅ Integrada | Tabla periódica propia en español con búsqueda, filtros por categoría y bloque, modelo atómico animado, descripción e historia. No usa paquete upstream |
| Diagramas | `mermaid` 12.3.0 | MIT | ✅ Integrada | Diagramas de flujo, secuencia, Gantt, clases, estados y líneas de tiempo; editor y vista previa, plantillas, guardado por proyecto en D1 (`app_documents`) y exportación SVG |

## Versiones

Cada aplicación y la propia tienda tienen versiones independientes:

| Nivel | Fuente | Dónde se ve |
|---|---|---|
| Site | `package.json` | Cabecera de Aula Kanban |
| Aula Store | `AULA_STORE_VERSION` en `lib/native-apps.ts` | Cabecera de Aula Store |
| App | `NativeAppMeta.appVersion` | Ficha de la app |
| Upstream | `NativeAppMeta.upstream` (opcional) y `extras` | Ficha de la app |

La versión de la app empieza en `1.0.0` y describe **nuestra integración**, no la librería original. La versión upstream se toma del paquete instalado; `lib/native-apps.test.ts` comprueba que coincide con `package-lock.json`.

Política de incremento:

- **Parche:** corrección, texto o estilo sin nueva capacidad.
- **Menor:** nueva capacidad o actualización upstream con cambio visible.
- **Mayor:** cambio incompatible de almacenamiento, API o contrato.

Aula Store usa la misma política para su propia versión. La versión del Site se gestiona aparte con el flujo de publicación y no se incrementa al cambiar una app.

| App | Versión de la app | Upstream |
|---|---|---|
| Excalidraw | `1.0.0` | `@excalidraw/excalidraw 0.18.1` |
| Calculadora | `1.0.0` | `@cortex-js/compute-engine 0.188.0` |
| Tabla periódica | `1.0.0` | Integración propia |
| Programación por bloques | `1.0.0` | `blockly 13.4.0` |
| Diagramas | `1.0.0` | `mermaid 12.3.0` |

La tienda empieza en `1.0.0`. El campo `instance_apps.version` existe en la base de datos, pero la ficha usa el catálogo; no se duplica la versión por cada instalación. No se crean paquetes independientes ni forks para separar versiones.

La migración local `0039_split_edu_tools` separa una instalación antigua de `edu-tools` en las dos apps nuevas, conserva favorito y posición de cada preferencia y retira la fila vieja. Es idempotente: repetirla no duplica instalaciones ni preferencias. Durante un ciclo, `?app=edu-tools` y `abrir_app` resuelven el alias como `calculadora`.

## Candidatas

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

### Aula y evaluación

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Tarjetas de repaso | `ts-fsrs` 6.0.0 | MIT | Repetición espaciada (FSRS) con UI propia | ~20 KB | Necesita persistencia para tener sentido (nivel 2 o 3) |
| Tarjetas (algoritmo SM-2) | `supermemo` 2.0.23 | MIT | Alternativa simple a FSRS | ~15 KB | Solo algoritmo |
| Conjuntos de preguntas | `@open-spaced-repetition/srs-kit` 1.0.0 | BSD-3 | Contratos y esquema de SRS | ~20 KB | Requiere implementar la UI |

### STEM y ciencias

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Laboratorio STEM | `@itkdm/open-lab-components` 0.1.1 | MIT | 210+ fragmentos interactivos de física, química, biología y matemáticas | ~3 MB sin empaquetar | Fragmentos HTML/CSS/JS, no componentes React: hay que aislarlos en `iframe` con `sandbox` o sanearlos. Versión 0.1.x muy joven (febrero 2026) |
| Física 2D | `matter-js` 0.20.0 | MIT | Gravedad, colisiones, muelles, péndulos | ~90 KB gzip | Sandbox manipulable; UI propia |
| Física 2D (WASM) | `@dimforge/rapier2d` 0.21.0 | Apache-2.0 | Motor de física más preciso | ~1 MB WASM | Alternativa a Matter.js si hace falta precisión |
| Geometría interactiva | `jsxgraph` 1.14.3 | MIT **o** LGPL-3.0 | Construcciones, funciones, lugares geométricos | ~400 KB | Elegir la opción MIT de la licencia dual |
| Editor de fórmulas | `mathlive` 0.111.4 | MIT | Teclado matemático, exportación a LaTeX | ~500 KB + fuentes | Candidata si hace falta un teclado matemático más rico |
| Render de fórmulas | `katex` 0.19.1 | MIT | Render de LaTeX en cualquier app | ~280 KB + fuentes | Pieza de apoyo, no app por sí sola |
| Calculadora científica | `mathjs` 15.2.0 | Apache-2.0 | Evaluación simbólica y unidades | ~350 KB | Detrás de una UI propia |
| Moléculas 3D | `3dmol` 2.5.5 | BSD-3 | Modelos moleculares giratorios | ~1 MB | Carga estructuras PDB/SDF |
| Dibujo de moléculas | `kekule` 1.0.4 | ⚠️ sin declarar | Editor de estructuras químicas | ~1 MB | Licencia sin metadatos en npm: comprobar antes de usar |
| Cielo nocturno | `d3-celestial` 0.7.35 | BSD-3 | Mapa estelar, constelaciones | ~500 KB + datos | Necesita descargar catálogos; valorar servirlos localmente |
| Música | `vexflow` 5.0.0 | MIT | Notación musical, escalas, ejercicios | ~500 KB | UI propia |
| Audio y síntesis | `tone` 15.1.22 | MIT | Sintetizador y experimentos de sonido | ~300 KB | Requiere gesto del usuario para el audio |
| Sonido de fondo | `howler` 2.2.4 | MIT | Reproducción de audio | ~40 KB | Apoyo |

### Diagramas, documentos y productividad

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Mapas conceptuales | `@xyflow/react` 12.12.1 | MIT | Nodos y conexiones arrastrables | ~150 KB | Vista propia de mapas |
| Mapas mentales | `markmap-lib` 0.18.13 | MIT | Markdown a mapa mental | ~200 KB | Con `markmap-view` |
| Código | `codemirror` 6.0.2 | MIT | Editor con resaltado y autocompletado | ~300 KB | Alternativa ligera a Monaco |
| Código (completo) | `monaco-editor` 0.57.0 | MIT | Editor de VS Code | ~2 MB+ | Solo si hace falta IntelliSense real |
| Playground web | `@codesandbox/sandpack-react` 2.20.0 | Apache-2.0 | HTML/CSS/JS editable con vista previa | ~300 KB | Comprobar que no depende de su CDN en producción |
| Texto enriquecido | `@tiptap/core` 3.34.0 | MIT | Apuntes con formato | ~250 KB + extensiones | Extensiones pro son de pago: usar las MIT |
| Presentaciones | `reveal.js` 6.0.2 | MIT | Diapositivas desde HTML/Markdown | ~200 KB | Ideal para el profesorado |
| Gráficas | `chart.js` 4.6.1 | MIT | Barras, líneas, sectores | ~200 KB | Pieza de apoyo |
| Gráficas | `@observablehq/plot` 0.6.19 | ISC | Gráficas declarativas | ~250 KB | Alternativa a Chart.js |
| Funciones | `function-plot` 1.26.0 | MIT | Representación de funciones | ~150 KB | Matemáticas |
| Lienzo 2D | `konva` 10.9.1 | MIT | Capas, formas y arrastre | ~250 KB | Base para editores propios |
| Líneas de tiempo | `vis-timeline` 8.5.6 | Apache-2.0 **o** MIT | Historia: eventos, épocas, zoom | ~200 KB | Elegir MIT |
| Documentos Office | `@silurus/ooxml` 0.89.10 | MIT | Ver docx/xlsx/pptx en el navegador | ~1 MB WASM | Útil para adjuntos de tareas |
| Visor PDF | `pdfjs-dist` 6.5.438 | Apache-2.0 | Leer PDF | ~1,5 MB | Worker servido desde el propio Site |
| Visor PDF (React) | `@embedpdf/react-pdf-viewer` 2.15.1 | MIT | Envoltorio listo sobre PDF | ~300 KB + motor | Alternativa a montar PDF.js a mano |

### Geografía y ajedrez

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Mapas | `leaflet` 1.9.4 | BSD-2 | Marcadores, capas, coordenadas | ~140 KB | Teselas OSM: dependencia de red y atribución |
| Ajedrez | `chess.js` 1.4.0 + `react-chessboard` 5.12.1 | BSD-2 / MIT | Reglas completas y tablero | ~70 KB | Dos jugadores o rival aleatorio |

### Aparcadas

| App | Paquete | Licencia | Motivo |
|---|---|---|---|
| Python en el navegador | `pyodide` 314.0.7 | MPL-2.0 | Permitida, pero 10-30 MB en la primera carga |
| Cuadernos marimo | `marimo` (Python) | Apache-2.0 | No es npm ni cliente puro: necesita kernel Python |
| Notas colaborativas | `@blocksuite/editor` 0.10.0 | MPL-2.0 | Pensada para colaboración con backend |

## Paquetes mencionados en la conversación

| Nombre | Qué se dijo | Qué hay realmente |
|---|---|---|
| `@itkdm/open-lab-components` | 210+ componentes interactivos STEM | Existe. MIT, 0.1.1 (febrero 2026), 3 MB, sin dependencias, repositorio público con 10 estrellas. Son **fragmentos HTML/CSS/JS**, no componentes React: necesitan `iframe` aislado. Candidata con reservas por madurez |
| `@smst/edu-tools` | Herramientas educativas en React | Existe. MIT, 2.2.1 (octubre 2025), 2,27 MB, con subrutas por herramienta. Se usó para regla y transportador y se retiró en APP-02: la calculadora y la tabla periódica son código propio. El repositorio declarado en `package.json` devuelve 404 |
| `marimo-learn` | Widgets de evaluación en Python o bundle npm | Existe **solo en PyPI** (0.14.0, MIT): widgets para cuadernos marimo, requiere `marimo` y `anywidget`. **No hay bundle npm** ni versión cliente pura, así que no encaja como app nativa. Su repositorio enlazado también devuelve 404. Se cubre con `ts-fsrs` + UI propia |
| `eXeLearning` | Editor de recursos open source | Existe, **AGPL-3.0** y aplicación de escritorio (repositorio activo, actualizado en noviembre de 2026). No se puede incrustar: solo se pueden **importar sus exportaciones** HTML/SCORM como contenido. El contenido exportado lleva la licencia que elija el autor (por defecto CC BY-SA) |

## Descartadas

| Paquete | Licencia | Motivo |
|---|---|---|
| `tldraw` 5.6.0 | Licencia tldraw | En producción exige clave o marca de agua; el SDK no es open source |
| `scratch-vm` / `scratch-gui` | AGPL-3.0 | Copyleft de red: obligaría a abrir todo el sitio |
| `@react-pdf-viewer/core` | Comercial | Licencia propia de pago |
| `@blocksuite/editor` | MPL-2.0 | Enfoque colaborativo con backend propio |
| GeoGebra | API de terceros | No hay paquete npm real; uso restringido |
| Desmos | Propietario | Sin licencia reutilizable |
| PhET | CC BY, sin npm | Solo iframe con su CDN |
| Handsontable | Comercial | Hoja de cálculo de pago |
| AG Grid (Enterprise) | Comercial | La versión MIT no cubre lo interesante |
| `x-spreadsheet` | Sin metadatos | Sin mantenimiento fiable |

## Orden recomendado

1. ~~`@smst/edu-tools`~~ — descartado en APP-02; calculadora y tabla periódica son integración propia.
2. ~~`blockly`~~ — ✅ integrada (programación por bloques).
3. ~~`mermaid`~~ — ✅ integrada (diagramas).
4. **`chess.js` + `react-chessboard`** — el añadido más barato.
5. **`matter-js`** y **`jsxgraph`** — física y geometría.
6. Resto según necesidad real de aula.

## Cómo reverificar una licencia

```sh
node -e "fetch('https://registry.npmjs.org/<paquete>/latest').then(r=>r.json()).then(m=>console.log(m.name,m.version,m.license))"
```

Para paquetes con scope, la URL lleva `@scope%2Fnombre`. Comprobar también el
repositorio de origen: la licencia del paquete publicado manda, pero un README
puede contradecirla.
