# Roadmap ADOC-15 — Tablas completas en el editor

> **Estado:** Activo · **Origen:** ADOC-15 del backlog (2026-11-19)
> **Backlog:** ADOC-16 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Integrar las tablas Tiptap en la interfaz de Aula Documentos para crearlas, editarlas y exportarlas sin recurrir a Markdown ni atajos ocultos.
- [ ] Criterio de éxito: una persona puede insertar una tabla, añadir o quitar filas y columnas, marcar cabeceras, combinar y dividir celdas, navegar con teclado y sobrevivir a guardado, recarga y exportación con una estructura predecible.

## 2. Alcance

**Dentro:**

- **Insertar tabla** desde el menú, con selector de filas y columnas.
- Barra contextual de tabla con acciones de filas, columnas, cabecera, celdas y borrado.
- Navegación por celdas con teclado, selección y foco predecible.
- Cabecera de tabla, combinación y división de celdas.
- Comportamiento móvil y modo lectura.
- Límites de tablas, filas, columnas y celdas.
- Fidelidad en HTML, impresión/PDF, presentación, DOCX, PPTX y Markdown con avisos cuando haya pérdida.
- Pruebas de editor, guardado, recarga, importación/exportación y accesibilidad.

**Fuera de alcance:**

- Edición de fórmulas, hojas de cálculo o celdas con lógica de Hoja de cálculo.
- Cambiar el tamaño de columnas con arrastre, redimensionado libre o diseño de página avanzado.
- Editar tablas dentro de DOCX/PPTX importados como si fueran OOXML nativo.
- Historial, comentarios o varios documentos; tienen entradas propias en el backlog.
- Publicar en Sites o cambiar la versión del Site (`1.1.37`).

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Reutilizar `@tiptap/extension-table` | Añadir otra librería de tablas | El documento ya permite nodos `table`, `tableRow`, `tableHeader` y `tableCell`; no hace falta otro modelo. |
| Barra contextual dentro de la barra del documento | Barra flotante sobre la tabla | Evita tapar el contenido, duplicar controles y perder el foco; se oculta fuera de una tabla. |
| Selector de cuadrícula para insertar | Diálogo con campos numéricos | Es directo, accesible y habitual; se conserva una acción para tamaños mayores si hace falta. |
| Guardar `colspan` y `rowspan` en el documento | Aplanar celdas al guardar | Sin esos atributos, combinar celdas se perdería al recargar. Se validarán con límites estrictos. |
| Mantener `resizable: false` | Redimensionado libre de columnas | El objetivo es estructura editorial, no un editor de diseño; evita gestos frágiles en móvil. |
| Exportar tablas nativas en HTML/impresión | Convertirlas a texto | La tabla ya es semántica y debe conservarse. |
| DOCX/PPTX con spans cuando la librería lo permita | Prometer fidelidad total sin avisos | Las celdas combinadas y los estilos complejos pueden simplificarse; se avisará. |
| Markdown con aviso de pérdida para celdas combinadas | Bloquear Markdown | Markdown sigue siendo útil para tablas simples; el aviso evita una pérdida silenciosa. |

## 4. Fases

### Fase 1 — Insertar y editar la estructura básica

- [x] Añadir **Insertar > Tabla** con selector de cuadrícula y creación de fila de cabecera.
- [x] Mostrar una barra contextual solo cuando la selección esté dentro de una tabla.
- [x] Implementar añadir fila antes/después, eliminar fila, añadir columna antes/después y eliminar columna.
- [x] Implementar eliminar tabla y confirmar la acción destructiva.
- [x] Resolver el estado deshabilitado en modo lectura y durante guardados conflictivos.
- [x] Añadir pruebas de inserción, estructura y autosave.
- **Criterios de aceptación:**
  - Se puede crear una tabla y añadir o quitar filas y columnas sin Markdown.
  - La tabla se guarda y recarga con la misma estructura.
  - Los invitados la ven, pero no pueden modificarla.

### Fase 2 — Celdas, cabecera, teclado y límites

- [ ] Implementar cabecera de fila y convertir celdas normales en celdas de cabecera.
- [ ] Implementar combinar y dividir celdas, conservando `colspan` y `rowspan` al guardar y recargar.
- [ ] Actualizar la normalización y validación del documento para aceptar spans seguros y rechazar estructuras imposibles.
- [ ] Añadir límites de tablas, filas, columnas y celdas por documento, con mensajes claros.
- [ ] Resolver Tab/Shift+Tab, selección, foco, Escape y acciones móviles de 44 px.
- [ ] Evitar que la tabla desborde la hoja: scroll horizontal controlado en pantalla y ajuste en impresión.
- [ ] Añadir pruebas de spans, límites, teclado, foco, móvil y recarga.
- **Criterios de aceptación:**
  - Combinar y dividir celdas no rompe el documento ni el autosave.
  - La navegación por teclado permite recorrer la tabla sin salir de la hoja.
  - Una tabla que supera los límites se rechaza con un mensaje comprensible.

### Fase 3 — Exportación, documentación y cierre

- [ ] Conservar tablas, cabeceras y celdas combinadas en HTML, impresión/PDF y presentación.
- [ ] Exportar tablas a DOCX/PPTX con cabeceras y spans cuando sea posible; añadir avisos de fidelidad cuando no.
- [ ] Exportar tablas simples a Markdown y avisar si hay celdas combinadas o estructura no representable.
- [ ] Revisar rendimiento, tamaño del bundle, cuotas y presupuesto de `aula-documentos`.
- [ ] Actualizar ayuda, ficha, documentación de la suite, changelog y roadmap.
- [ ] Ejecutar suite, `tsc`, ESLint, build y presupuestos; revisar cinco anchos y ambos temas.
- [ ] Archivar el roadmap, reiniciar `roadmap.md` y hacer el push único al cerrar.
- **Criterios de aceptación:**
  - La tabla aparece en las salidas acordadas con estructura y cabeceras predecibles.
  - Una limitación de Markdown u Office se explica antes o después de exportar, nunca se silencia.
  - El Site sigue en `1.1.37`; no se publica desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Spans descartados por el normalizador | Las celdas combinadas se pierden al recargar | Validar y conservar `colspan`/`rowspan` en la misma fase que la UI. |
| Tablas demasiado grandes | Documento lento o difícil de editar | Límites por tabla y por documento antes de guardar. |
| Desbordamiento en móvil | Contenido inaccesible | Scroll horizontal contenido y controles en la barra, no flotantes. |
| Diferencia entre DOCX/PPTX y HTML | Falsa sensación de fidelidad | Avisos concretos y pruebas de reapertura. |
| Pérdida al exportar Markdown | Celdas combinadas desaparecen | Aviso de pérdida y tabla simple como formato preferente. |
| Selección y foco imprecisos | Acciones aplicadas a otra celda | Pruebas de teclado y selección antes de cerrar la fase. |
| Presupuesto de `aula-documentos` ajustado | El nuevo UI puede superar 370.000 B | Carga diferida de componentes auxiliares y medición en cada fase. |

## 6. Notas de sesión

- 2026-11-20: ADOC-15 sale del backlog y pasa a ser el roadmap activo. ADOC-21 quedó cerrado y archivado en [`historial/roadmap-adoc-21.md`](../historial/roadmap-adoc-21.md).
- Auditoría inicial: `@tiptap/extension-table` ya está registrado con `resizable: false`; el editor no ofrece inserción ni controles, y el validador acepta los nodos de tabla pero descarta sus atributos de celda.
- La importación y exportación existentes conservan tablas simples; la exportación Office actual no representa todavía celdas combinadas.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
- 2026-11-20: Fase 1 completada. Añadido **Insertar > Tabla** con selector de cuadrícula, creación con fila de cabecera y barra contextual para añadir/eliminar filas y columnas, alternar cabecera y eliminar la tabla. El selector y la barra se cargan bajo demanda; el editor y el autosave existentes se conservan. Pruebas de inserción, estructura, autosave en curso y modo invitado. Suite completa: 217 archivos / 1.554 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos: 366.306 / 370.000 B gzip; aula-documentos-export: 329.689 / 340.000 B gzip) y `perf:office` correctos.
