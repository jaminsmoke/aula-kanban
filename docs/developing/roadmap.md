# Roadmap ARC-10 — Integrar Hoja de cálculo con Aula Documentos

> **Estado:** Activo (2026-11-21) · **Origen:** ARC-10 del backlog
> **Backlog:** 1 entrada · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Mantener Hoja de cálculo como aplicación independiente, sin sustituir su modelo, fórmulas, formato ni exportación CSV.
- [ ] Definir y validar un flujo concreto para trasladar una selección de la hoja a una tabla editable de Aula Documentos.
- [ ] Decidir qué se conserva —valores, cabeceras, fórmulas o formato— y documentar lo que se descarta.
- [ ] Comprobar permisos, límites, accesibilidad y rendimiento sin cambiar datos existentes ni añadir una API de sincronización.
- [ ] Criterio de éxito: una persona puede convertir una selección acotada en una tabla de Aula Documentos, con valores correctos y un resultado predecible; Hoja de cálculo sigue disponible y no se retira ninguna app.

## 2. Alcance

**Dentro:**

- Inventario de la selección, los datos visibles, las fórmulas y los estilos de Jspreadsheet.
- Inventario del esquema de tablas de Aula Documentos: filas, columnas, celdas, cabeceras y límites de validación.
- Un flujo unidireccional de copia y pegado como tabla, con un formato de portapapeles común.
- Pruebas de valores vacíos, números, texto, fórmulas mostradas, comillas, saltos de línea y selecciones fuera de límite.
- Verificación de los permisos de lectura y escritura de ambas apps.
- Documentación del flujo, de los descartes y de la decisión sobre compartir adaptadores.

**Fuera:**

- Convertir Hoja de cálculo en una tabla de Aula Documentos o retirar la app.
- Sincronización bidireccional, fórmulas compartidas o edición en tiempo real entre ambas apps.
- Cambiar el esquema de `app_documents`, las URLs, los permisos, el MCP o la versión del Site.
- Preservar colores, bordes, anchos, celdas combinadas o referencias A1 en la primera entrega.
- Publicar en Sites o aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mantener Hoja de cálculo como app | Sustituirla por tablas Tiptap | La hoja tiene referencias, evaluación de fórmulas y edición de rejilla que una tabla de texto no cubre. |
| Flujo unidireccional de copia y pegado | Sincronización entre apps | Evita estado compartido, versiones dobles y una API nueva. |
| Copiar valores mostrados en la primera entrega | Copiar fórmulas y referencias | Aula Documentos no evalúa fórmulas; prometerlas produciría tablas engañosas. |
| Respetar los límites de la tabla de Aula | Aceptar cualquier selección | Evita documentos inválidos y mantiene la validación existente. |
| Adaptador local en Hoja de cálculo | Extraer un contrato compartido antes de tener dos consumidores | El primer flujo solo necesita leer la selección; se compartirá si Aula también lo usa. |
| Verificar el pegado nativo antes de añadir UI | Construir un comando nuevo desde el inicio | Si Tiptap ya convierte una tabla HTML válida, no hace falta duplicar el editor. |

## 4. Punto de partida

- Hoja de cálculo usa `SpreadsheetDocument` con `data: SpreadsheetCell[][]` y `styles`; las fórmulas originales se conservan en el mapa de cálculo.
- Jspreadsheet ya expone selección y `selectionToRange`; la interfaz conoce la celda seleccionada, pero no todavía un rango completo para copiar.
- `toCsv` y la exportación CSV ya escapan fórmulas, comillas y saltos de línea; sirven de referencia para el escapado.
- Aula Documentos usa Tiptap con `Table`, `TableRow`, `TableHeader` y `TableCell`.
- La validación de Aula limita la tabla a **50 filas**, **20 columnas**, **400 celdas por tabla**, **1.000 celdas en total** y **20 tablas** por documento.
- Aula ya intercepta el pegado de imágenes; falta comprobar el pegado de una tabla HTML y su comportamiento con selecciones grandes.
- Hoja de cálculo y Aula Documentos conservan sus permisos: los invitados pueden consultar, pero no editar ni guardar.
- Baseline de cierre de ARC-09: arquitectura **460 archivos / 1.151 imports**; suite **266 archivos / 1.756 pruebas**; Aula **386.260 / 387.000 B**; Hoja **311.063 / 315.000 B**; Site `1.1.38`.

## 5. Fases

### Fase 1 — Inventario y contrato del flujo

- [x] Inventariar la selección real de Jspreadsheet, los valores mostrados, las fórmulas y los estilos disponibles.
- [x] Comparar la tabla de Aula con los datos de la hoja y fijar qué se conserva en la primera entrega.
- [x] Probar el pegado nativo de una tabla HTML/TSV en Aula Documentos y registrar sus límites.
- [x] Decidir si el flujo usa el portapapeles, una descarga temporal o una acción explícita de Aula.
- [x] Documentar el contrato y los descartes en [`integracion-hoja-aula.md`](integracion-hoja-aula.md).
- **Criterios:** flujo concreto, formato de intercambio, límites, permisos y casos de error definidos; sin cambios de producto.
- **Cierre (2026-11-21):** contrato en [`integracion-hoja-aula.md`](integracion-hoja-aula.md). Se usará HTML como formato principal y TSV como respaldo; se copiarán valores visibles, no fórmulas ni estilos. El pegado nativo de una tabla HTML crea una tabla Tiptap válida y una tabla de 51 filas es rechazada por `parseAulaDocument` con `table-too-large`. Sin cambios de producto; baseline **460 archivos / 1.151 imports**, **266 archivos / 1.756 pruebas**, Aula **386.260 B**, Hoja **311.063 B**.

### Fase 2 — Adaptador de selección

- [x] Convertir una selección de celdas en una tabla serializada con valores mostrados y escapado seguro.
- [x] Respetar los límites de Aula y devolver un error legible si la selección no cabe.
- [x] Cubrir celdas vacías, números, texto, comillas, saltos de línea, fórmulas y rangos fuera de límite.
- [x] Mantener el adaptador dentro de Hoja de cálculo; no extraerlo a `shared` sin un segundo consumidor.
- **Criterios:** el adaptador es puro, está probado y no modifica el documento ni guarda nada.
- **Cierre (2026-11-21):** `hoja-calculo-clipboard.ts` serializa una celda como texto y una selección como tabla HTML + TSV. Conserva la forma rectangular, escapa HTML, normaliza el TSV, protege fórmulas y valida 50 filas / 20 columnas / 400 celdas. `useHojaCalculoGrid` expone `selectedRange` y `selectionClipboard()` sin UI todavía. Suite **267 archivos / 1.763 pruebas**; arquitectura **461 archivos / 1.154 imports**; presupuesto de Hoja **6 / 534 → 6 / 550**.

### Fase 3 — Acción de copia en Hoja de cálculo

- [x] Exponer el rango seleccionado desde la rejilla sin alterar el guardado, la carga ni el cálculo.
- [x] Añadir una acción etiquetada para copiar la selección como tabla, disponible también en solo lectura.
- [x] Informar del resultado, del límite o del fallo del portapapeles con el estado existente.
- [x] Cubrir teclado, foco, textos de ayuda y ausencia de selección.
- **Criterios:** la acción no muta la hoja, funciona con los permisos actuales y no añade una ruta de servidor.
- **Cierre (2026-11-21):** botón **Copiar** con nombre accesible “Copiar tabla”, habilitado solo con selección y disponible en solo lectura. Escribe HTML + TSV con `ClipboardItem`; si no está disponible, copia TSV y lo avisa. Estados de tabla, celda, fallback y fallo. Suite **267 archivos / 1.766 pruebas**; arquitectura **461 / 1.154**; presupuesto de Hoja **6 / 607 → 6 / 650**.

### Fase 4 — Recepción y verificación en Aula Documentos

- [ ] Verificar que el pegado crea una tabla válida y editable en el documento.
- [ ] Si el pegado nativo no basta, añadir solo la mínima adaptación en Aula, sin tocar el guardado ni las imágenes.
- [ ] Comprobar los límites de filas, columnas y celdas, y el comportamiento en solo lectura.
- [ ] Revisar la tabla resultante en 390, 1024 y 1366 px, con teclado y sin desbordamiento.
- [ ] Documentar el flujo definitivo y sus descartes.
- **Criterios:** la tabla resultante conserva los valores acordados; los límites y permisos se respetan; no se rompe el pegado de imágenes ni el autosave.

### Fase 5 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** flujo verificado, sin pérdida de datos, sin retirar Hoja de cálculo y sin publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Prometer fórmulas que Aula no evalúa | Tabla con resultados engañosos | Copiar valores mostrados y documentar el descarte de fórmulas y referencias. |
| Selección mayor que la tabla de Aula | Documento inválido | Validar los límites antes de copiar y mostrar un aviso claro. |
| Pérdida de formato | Expectativa incumplida | Limitar la primera entrega a contenido y cabeceras; registrar colores, bordes y anchos como pendientes. |
| El pegado nativo no crea una tabla | Flujo incompleto | Probar en la Fase 1 y añadir una adaptación mínima solo si hace falta. |
| Duplicar lógica de tabla | Dos contratos divergentes | Mantener el adaptador local y compartirlo solo si Aula lo usa realmente. |
| Ampliar el alcance a sustituir la app | Pérdida de funciones de hoja | Mantener Hoja de cálculo y limitar el trabajo a un flujo de traslado. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** ARC-10 sale del backlog tras cerrar ARC-09; queda **1 entrada** (DEV-01). Se mantiene Hoja de cálculo como app y se empieza por un flujo de copia unidireccional. Sin cambios de código de producto.
- 2026-11-21: **Fase 1 completada.** Contrato en [`integracion-hoja-aula.md`](integracion-hoja-aula.md): copia HTML con TSV de respaldo, valores visibles, sin fórmulas ni estilos, límites de Aula y permisos definidos. El pegado nativo de tablas HTML y el rechazo de 51 filas quedan comprobados con Tiptap y `parseAulaDocument`.
- 2026-11-21: **Fase 2 completada.** Adaptador puro de selección con HTML/TSV, protección de fórmulas y límites de Aula. Suite **267 archivos / 1.763 pruebas** y presupuesto de Hoja ajustado a 6 / 534 → 6 / 550. Sin UI de copia todavía.
- 2026-11-21: **Fase 3 completada.** Botón **Copiar** con HTML + TSV, fallback de texto, estados de error y disponibilidad en solo lectura. Suite **267 archivos / 1.766 pruebas**; presupuesto de Hoja **6 / 607 → 6 / 650**. Sin cambios en el guardado.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
