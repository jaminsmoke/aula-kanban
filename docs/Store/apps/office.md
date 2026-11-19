# Office en Aula Documentos: matriz de fidelidad

> **Estado:** Spike de ADOC-12 · **Última medición:** 2026-11-19
> **Fuente:** `@silurus/ooxml` 0.90.1 (solo lectura) y fixtures propios generados con `docx` 9.16.0 y `pptxgenjs` 4.0.1.

## 1. Decisión

- **Aula Documentos es la fuente de verdad.** Office es un formato de intercambio: se importa para convertirlo en documento Aula y se exporta como copia de salida.
- No habrá edición de OOXML ni round-trip con pérdida cero. El visor actual no expone mutaciones y no se va a convertir en un editor de Word, Excel o PowerPoint.
- El visor se comparte desde `app/board/shared/office/`; `visor-office` queda como cáscara de la app independiente mientras exista.
- **XLSX no se importa como documento Aula en ADOC-12.** Se mantiene en el visor; si se convierte en tablas, se decide junto a Hoja de cálculo en otro bloque.
- La primera versión **no conserva el archivo original** salvo que se decida añadir un adjunto persistido. La vista previa sirve para confirmar antes de reemplazar.

## 2. Medición del spike

Fixtures propios:

| Fixture | Tamaño | Lo que valida |
|---|---:|---|
| `import-basico.docx` | 9.850 B | Encabezado, párrafo, enlace, lista de viñetas y tabla 2×2 |
| `import-basico.pptx` | 51.679 B | Dos diapositivas con título y texto |

Extracción con el motor headless de `@silurus/ooxml`:

- DOCX: 5 elementos de cuerpo; `styleId: "Heading1"` en el título; `isLink` y `hyperlink` en el enlace; `numbering.format: "bullet"` en las listas; tabla con 2 filas.
- PPTX: 2 diapositivas; texto de títulos y párrafos recuperable por diapositiva.
- La prueba Node usa los modelos materializados. La proyección `toMarkdown()` del navegador se validará con la app real porque necesita `Worker` y los recursos WASM del visor.
- Los fixtures viven en `app/board/shared/office/__fixtures__/` y tienen una prueba en `office-fixtures.test.ts`.

Coste de exportación medido con esbuild, minificado y comprimido con gzip:

| Módulo | Bruto | Gzip |
|---|---:|---:|
| `docx` (Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType) | 234.239 B | 70.057 B |
| `pptxgenjs` | 373.792 B | 126.424 B |
| **Total de los dos chunks** | **608.031 B** | **196.481 B** |

Objetivo provisional: **≤ 210.000 B gzip** para los dos imports dinámicos de exportación. La medición es reproducible con `npm run perf:office`; el presupuesto se incorporará a `perf:budget` cuando exista el flujo real de exportación en la app, no antes.

## 3. Matriz de fidelidad

### DOCX

| Elemento | Importación | Exportación | Nota |
|---|---|---|---|
| Texto y párrafos | Sí | Sí | Se conserva el texto y los saltos básicos. |
| Encabezados | Sí, por `styleId` | Sí | `Heading1`…`Heading9` se mapean a títulos Aula. |
| Negrita, cursiva y subrayado | Sí, básico | Sí, básico | Los estilos compuestos pueden simplificarse. |
| Listas | Sí, viñetas y numeración | Sí, básico | Niveles anidados limitados. |
| Tablas | Sí, celdas y filas | Sí, tablas simples | Sin fórmulas ni estilos complejos. |
| Enlaces | Sí | Sí | Se eliminan o aíslan enlaces externos peligrosos. |
| Imágenes simples | A validar en Fase 2 | Sí, si están en el modelo | Sin efectos, posiciones flotantes ni recursos externos. |
| Cabeceras, pies, notas y comentarios | No garantizado | No | Se avisa si el documento los contiene. |
| Columnas, cuadros de texto, formas y SmartArt | No | No | Se pierde la maquetación visual. |
| Ecuaciones complejas y contenido activo | No | No | Nunca se ejecutan macros. |

### PPTX

| Elemento | Importación | Exportación | Nota |
|---|---|---|---|
| Número y orden de diapositivas | Sí | Sí | Una diapositiva Aula por diapositiva de salida. |
| Títulos y texto | Sí | Sí | Se conserva el texto y los párrafos. |
| Viñetas y niveles | Sí, si el modelo las expone | Sí, básico | Puede simplificarse. |
| Imágenes simples | A validar en Fase 2 | Sí, si están en el modelo | Sin animaciones ni transiciones. |
| Tablas y gráficos | Limitado / a validar | Tablas simples | Los gráficos no se reconstruyen como objetos editables. |
| Posiciones, temas y patrones | No | No | Se genera un diseño Aula estándar. |
| Animaciones, transiciones y multimedia | No | No | Fuera de alcance. |
| Notas del orador | A validar | Solo si el modelo las conserva | No bloquear la primera entrega. |

## 4. Límites y errores

- Tamaño máximo inicial: **30 MB**, el mismo que el visor actual.
- Rechazo de archivos cifrados, dañados, con formato distinto o con contenido no soportado.
- Sin macros, sin ejecución de JavaScript incrustado y sin carga automática de recursos externos.
- Los avisos se muestran antes de confirmar la importación.
- La exportación no incluye macros ni enlaces externos no revisados.

## 5. Decisiones pendientes para Fase 2/3

- Validar si `toMarkdown()` conserva encabezados, tablas e imágenes en el navegador real.
- Decidir si las imágenes simples se importan como recursos del documento o se describen como omitidas.
- Decidir si el archivo original se guarda como adjunto y con qué límite.
- Validar la exportación con Office real y con archivos de varias versiones.
- Fijar el presupuesto definitivo de los chunks de exportación en `perf:budget`.
