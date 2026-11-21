# Integración entre Hoja de cálculo y Aula Documentos

> **Estado:** ARC-10, Fase 1 completada · **Fecha:** 2026-11-21
> **Alcance:** traslado unidireccional de una selección de Hoja de cálculo a una tabla de Aula Documentos.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Objetivo del flujo

Hoja de cálculo y Aula Documentos siguen siendo aplicaciones independientes. El primer flujo permite **copiar una selección de celdas** en Hoja de cálculo y **pegarla como tabla editable** en Aula Documentos, sin sincronización, sin una API nueva y sin alterar los documentos existentes.

La operación es explícita y de ida única: el documento de Aula no queda vinculado a la hoja. Si la hoja cambia después, la tabla no se actualiza sola.

## 2. Inventario de Hoja de cálculo

### Selección y valores

- Jspreadsheet expone `worksheet.getSelection()` con cuatro coordenadas cero-based: columna izquierda, fila superior, columna derecha y fila inferior.
- `worksheet.getData(true, true)` devuelve solo las celdas resaltadas y sus valores procesados, que son los valores visibles después del cálculo.
- `worksheet.getData()` devuelve toda la hoja; no se usará para este flujo salvo como referencia.
- Las fórmulas originales viven en `formulasRef` y no forman parte del valor visible de la rejilla.
- La interfaz actual guarda `selectedCell`, pero no un rango completo. La Fase 2 debe añadir el rango al contrato del hook sin cambiar el guardado.
- `selectionToRange` ya convierte coordenadas en un rango A1 para las acciones de formato; se reutilizará como referencia, no como formato de intercambio.

### Formato y exportación

- `SpreadsheetDocument` guarda `data: SpreadsheetCell[][]` y `styles`; los estilos son un mapa de celdas o rangos.
- Jspreadsheet permite negrita, cursiva y alineación; los colores, bordes, anchos y celdas combinadas no forman parte del modelo de la primera entrega.
- `toCsv` ya escapa fórmulas, comillas y saltos de línea. La serialización de la Fase 2 debe aplicar el mismo cuidado al HTML y al texto plano.

### Límites de la hoja

- La hoja inicial tiene 20 filas y 6 columnas, pero se puede ampliar.
- El flujo no impone un límite propio mientras la selección quepa en la tabla de Aula; el límite efectivo es el de Aula Documentos.

## 3. Inventario de Aula Documentos

### Modelo de tabla

- El editor usa Tiptap con `Table`, `TableRow`, `TableHeader` y `TableCell`.
- El contenido de cada celda es un bloque Tiptap; una celda puede contener párrafos y marcas de texto.
- Aula no evalúa fórmulas ni conserva referencias A1. Una tabla es contenido del documento, no una hoja de cálculo embebida.
- Las tablas se guardan dentro del JSON del documento y participan en el autosave y en el conflicto de versión que ya existen.

### Límites de validación

| Límite | Valor |
|---|---:|
| Filas por tabla | 50 |
| Columnas por tabla | 20 |
| Celdas por tabla | 400 |
| Celdas de tabla en el documento | 1.000 |
| Tablas por documento | 20 |
| Span máximo de una celda | 20 |

La validación del documento rechaza una tabla que supere estos límites, aunque el editor llegue a aceptar el pegado. El flujo debe validar antes de copiar; no se debe confiar en que el aviso aparezca al guardar.

### Pegado nativo comprobado

Se probó con una instancia temporal de `Editor` y las extensiones reales de Aula Documentos:

1. Una tabla HTML 2×2 se pega como `table` → `tableRow` → `tableHeader`/`tableCell`, con los textos correctos.
2. Un TSV pegado como texto plano se convierte en párrafos, **no** en tabla.
3. Una tabla HTML de 51 filas se pega en el editor, pero `parseAulaDocument` la rechaza con `table-too-large`.
4. Un `<td>` con `<br>` conserva el salto como `hardBreak`; varios párrafos dentro de una celda también se conservan.

Conclusión: **el HTML es el formato principal**. El TSV solo sirve como respaldo para otras aplicaciones o como texto legible; no basta para crear la tabla en Aula.

### Permisos

- Hoja de cálculo permite consultar y exportar en modo invitado; las acciones de edición están deshabilitadas.
- Aula Documentos permite pegar y guardar solo con permiso de escritura.
- Copiar una selección no muta la hoja y puede permitirse en solo lectura. Pegar en Aula requiere escritura.
- No se añaden permisos nuevos ni se cambia el contrato de `/api/app-documents`.

## 4. Contrato decidido para la primera entrega

### Qué se conserva

- La forma rectangular de la selección: filas y columnas, incluidas las celdas vacías.
- Los valores visibles: texto, números, booleanos y resultados calculados de fórmulas.
- El orden de las filas y columnas.
- Los saltos de línea dentro de una celda, mediante el formato HTML.

### Qué se descarta

- Las fórmulas y las referencias A1; se copia su resultado visible.
- Los estilos de la hoja: colores, bordes, anchos, alineación, negrita y cursiva.
- Las celdas combinadas y los cambios de tamaño.
- La vinculación viva entre la hoja y el documento.
- La detección automática de una fila de cabecera: la primera fila se copia como una fila normal. El usuario puede convertirla en cabecera con las herramientas de tabla de Aula.

### Reglas de la selección

- Sin selección no se habilita la acción.
- Una sola celda se copia como texto plano, no como tabla de una celda.
- Dos o más celdas se copian como tabla HTML y, además, como TSV de respaldo.
- Se usa el rango principal de `getSelection()`. Las selecciones múltiples discontinuas quedan fuera de esta entrega.
- Si la selección supera **50 filas**, **20 columnas** o **400 celdas**, no se escribe en el portapapeles y se muestra un aviso con el límite.
- Las celdas vacías se conservan para no deformar la tabla.

### Formato de portapapeles

La acción escribe dos representaciones:

- `text/html`: una tabla con una fila por fila de la selección y una celda por columna. El texto se escapa; los saltos de línea internos se representan con `<br>` dentro de la celda.
- `text/plain`: TSV de respaldo, con una línea por fila y un tabulador entre columnas. Los tabuladores y saltos de línea internos se normalizan para que el respaldo no rompa la cuadrícula.

Aula Documentos recibirá el HTML y creará la tabla con su parser nativo. No se añade una ruta de servidor ni se guarda un archivo temporal.

## 5. Flujo de uso

1. En Hoja de cálculo, seleccionar un rango de celdas.
2. Pulsar **Copiar tabla** en la barra de herramientas.
3. Abrir o crear un documento en Aula Documentos con permiso de escritura.
4. Colocar el cursor en un párrafo vacío fuera de otra tabla.
5. Pegar con el menú del navegador o `Ctrl/Cmd+V`.
6. Aula crea una tabla editable con los valores copiados.
7. Guardar el documento con el flujo normal de Aula.

El pegado dentro de una tabla existente no forma parte del contrato inicial; la interfaz de ayuda debe pedir un párrafo vacío.

## 6. Errores y estados

| Caso | Resultado |
|---|---|
| Sin selección | Acción deshabilitada. |
| Una celda | Copia texto plano y muestra un estado breve. |
| Selección dentro de límites | Copia HTML y TSV; estado «Selección copiada». |
| Selección fuera de límites | No copia; aviso con filas, columnas o celdas máximas. |
| Portapapeles no disponible | Aviso de fallo; no se modifica la hoja ni el documento. |
| Pegado en Aula en solo lectura | El editor no permite pegar; no se añade un control nuevo. |
| Pegado en una tabla existente | Fuera del contrato inicial; la ayuda indica usar un párrafo vacío. |
| Tabla que supera la validación de Aula | El flujo no debe generarla; si ocurre, Aula mantiene su error de validación existente. |

## 7. Decisiones de implementación

- **No crear un adaptador compartido todavía.** El primer consumidor es Hoja de cálculo y Aula no necesita leer el formato de la hoja: recibe HTML estándar. Se compartirá un adaptador solo si aparece un segundo consumidor real.
- **No tocar el esquema de Aula.** La tabla ya existe y la validación ya impone los límites.
- **No tocar el guardado con versión.** Copiar y pegar no escribe en `app_documents` hasta que Aula guarda su documento con el flujo existente.
- **No añadir MCP.** El flujo es de interfaz y portapapeles.
- **No retirar Hoja de cálculo.** La integración no demuestra que Aula cubra la edición de hoja, las fórmulas ni la exportación CSV.

## 8. Criterios de salida de la Fase 1

- El flujo de copia y pegado está definido y tiene un formato principal HTML.
- Están decididos los valores conservados y los descartes.
- Los límites de Aula, los permisos y los casos de error están documentados.
- El pegado nativo se ha comprobado con las extensiones reales.
- No se ha cambiado código de producto.

## 9. Baseline

- Arquitectura: **460 archivos / 1.151 imports**.
- Suite: **266 archivos / 1.756 pruebas**.
- Aula Documentos: **386.260 / 387.000 B**.
- Hoja de cálculo: **311.063 / 315.000 B**.
- Site: `1.1.38`.
