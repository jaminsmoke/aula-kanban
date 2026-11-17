# Candidatas · Diagramas, documentos y productividad

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **Integradas:** Mapas conceptuales como **STORE-10**, Presentaciones como
> **STORE-11** y Líneas de tiempo como **STORE-13**. El resto sigue como
> candidato hasta que se priorice.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Mapas mentales | `markmap-lib` 0.18.13 | MIT | Markdown a mapa mental | ~200 KB | Con `markmap-view` |
| Código | `codemirror` 6.0.2 | MIT | Editor con resaltado y autocompletado | ~300 KB | Alternativa ligera a Monaco |
| Código (completo) | `monaco-editor` 0.57.0 | MIT | Editor de VS Code | ~2 MB+ | Solo si hace falta IntelliSense real |
| Playground web | `@codesandbox/sandpack-react` 2.20.0 | Apache-2.0 | HTML/CSS/JS editable con vista previa | ~300 KB | Comprobar que no depende de su CDN en producción |
| Texto enriquecido | `@tiptap/core` 3.34.0 | MIT | Apuntes con formato | ~250 KB + extensiones | Extensiones pro son de pago: usar las MIT |
| Gráficas | `chart.js` 4.6.1 | MIT | Barras, líneas, sectores | ~200 KB | Pieza de apoyo |
| Gráficas | `@observablehq/plot` 0.6.19 | ISC | Gráficas declarativas | ~250 KB | Alternativa a Chart.js |
| Funciones | `function-plot` 1.26.0 | MIT | Representación de funciones | ~150 KB | Matemáticas |
| Lienzo 2D | `konva` 10.9.1 | MIT | Capas, formas y arrastre | ~250 KB | Base para editores propios |
| Documentos Office | `@silurus/ooxml` 0.89.10 | MIT | Ver docx/xlsx/pptx en el navegador | ~1 MB WASM | Útil para adjuntos de tareas |
| Visor PDF | `pdfjs-dist` 6.5.438 | Apache-2.0 | Leer PDF | ~1,5 MB | Worker servido desde el propio Site |
| Visor PDF (React) | `@embedpdf/react-pdf-viewer` 2.15.1 | MIT | Envoltorio listo sobre PDF | ~300 KB + motor | Alternativa a montar PDF.js a mano |

## Valoración

- **Mapas conceptuales**, **Presentaciones** y **Líneas de tiempo** ya están
  integradas y cubren edición de mapas, diapositivas y secuencias temporales.
- **Mapas mentales** es una variante más estrecha de los mapas conceptuales; puede
  esperar a que se priorice una necesidad concreta.
- **Texto enriquecido**, **documentos Office** y **visores PDF** amplían el trabajo
  documental, pero chocan con el visor de libros y con el modelo actual de tareas.
- **Código**, **playground** y **lienzo 2D** son piezas de apoyo o bases para
  editores propios; no se convierten en app por sí solas.
