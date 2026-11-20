# Roadmap ADOC-15 — Tablas completas en el editor

> **Estado:** Completada · **Origen:** ADOC-15 del backlog (2026-11-19)
> **Backlog:** ADOC-16 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Integrar las tablas Tiptap en la interfaz de Aula Documentos para crearlas, editarlas y exportarlas sin recurrir a Markdown ni atajos ocultos.
- [ ] Antes de continuar, reducir la complejidad estructural de Aula Documentos y extraer a `shared`/`lib` lo que ya se repite o no pertenece a la app.
- [ ] Criterio de éxito: una persona puede insertar una tabla, añadir o quitar filas y columnas, marcar cabeceras, combinar y dividir celdas, navegar con teclado y sobrevivir a guardado, recarga y exportación con una estructura predecible; además, el código queda dividido por responsabilidades y sin duplicación evidente.

## 2. Alcance

**Dentro:**

- Auditar y modularizar Aula Documentos antes de ampliar tablas.
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
| Shell de app como orquestador | Mantener un archivo de más de 3.000 líneas | Los cambios pequeños no deben obligar a navegar por toda la app ni a mezclar responsabilidades. |
| Carpetas por responsabilidad dentro de Aula Documentos | Un único archivo y un CSS monolítico | Facilita revisar, probar y sustituir partes sin tocar el flujo completo. |
| Extraer a `shared` solo con dos consumidores reales | Crear abstracciones preventivas | Evita una capa compartida artificial y mantiene el coste de mantenimiento bajo control. |
| Lógica pura en `lib/domain` y servidor en `lib/server` | Mezclar helpers de dominio en la app | Conserva la dirección de dependencias y permite probar sin React. |
| Refactor sin cambio funcional | Aprovechar para rediseñar la interfaz | Primero se estabiliza la base; las mejoras visuales van en sus fases. |
| Reutilizar `@tiptap/extension-table` | Añadir otra librería de tablas | El documento ya permite nodos `table`, `tableRow`, `tableHeader` y `tableCell`; no hace falta otro modelo. |
| Barra contextual dentro de la barra del documento | Barra flotante sobre la tabla | Evita tapar el contenido, duplicar controles y perder el foco; se oculta fuera de una tabla. |
| Selector de cuadrícula para insertar | Diálogo con campos numéricos | Es directo, accesible y habitual; se conserva una acción para tamaños mayores si hace falta. |
| Guardar `colspan` y `rowspan` en el documento | Aplanar celdas al guardar | Sin esos atributos, combinar celdas se perdería al recargar. Se validarán con límites estrictos. |
| Mantener `resizable: false` | Redimensionado libre de columnas | El objetivo es estructura editorial, no un editor de diseño; evita gestos frágiles en móvil. |
| Exportar tablas nativas en HTML/impresión | Convertirlas a texto | La tabla ya es semántica y debe conservarse. |
| DOCX/PPTX con spans cuando la librería lo permita | Prometer fidelidad total sin avisos | Las celdas combinadas y los estilos complejos pueden simplificarse; se avisará. |
| Markdown con aviso de pérdida para celdas combinadas | Bloquear Markdown | Markdown sigue siendo útil para tablas simples; el aviso evita una pérdida silenciosa. |

## 4. Fases

### Fase 1 — Auditoría, límites y mapa de extracción

- [x] Inventariar responsabilidades, tamaño y dependencias de `aula-documentos-app.tsx`, su CSS y sus pruebas.
- [x] Medir duplicación entre Aula Documentos, `app/board/shared` y el resto de apps; identificar utilidades candidatas a `shared` y lógica pura candidata a `lib`.
- [x] Acordar el árbol de carpetas y los límites: app shell, componentes, hooks, estilos, pruebas y módulos de servidor.
- [x] Documentar el mapa de dependencias y las reglas de importación (app → shared/lib, nunca al contrario).
- [x] Registrar una línea base de pruebas, chunks y presupuestos antes de mover código.
- [x] Revisar riesgos de regresión, conflicto de merges y cambios de exportación.
- **Criterios de aceptación:**
  - Existe un documento de arquitectura con responsabilidades, árbol objetivo y límites verificables.
  - Cada posible extracción a `shared`/`lib` tiene consumidor y motivo, sin abstracciones especulativas.
  - La línea base queda registrada antes de tocar la implementación.

### Fase 2 — Descomposición interna de Aula Documentos

- [x] Reducir `aula-documentos-app.tsx` a un shell de orquestación; extraer toolbar, menús, diálogos, panel lateral y estados de presentación.
- [x] Extraer hooks de autosave/conflicto, copias, importación, imágenes, presentación y migración.
- [x] Dividir `aula-documentos.css` por layout, barra, editor, bloques, diálogos y panel lateral.
- [x] Dividir las pruebas por componente, hook y flujo, conservando los casos actuales.
- [x] Mantener intactos autosave, permisos, URLs, atajos, textos visibles y orden de los diálogos.
- [x] Añadir comprobaciones de tamaño y de dependencias internas para evitar que el archivo vuelva a crecer.
- **Criterios de aceptación:**
  - El archivo principal queda por debajo de 450 líneas y ningún componente/hook nuevo supera 600 líneas.
  - Cada bloque de CSS vive en un archivo de responsabilidad acotada.
  - La suite completa pasa sin cambios funcionales y el bundle no empeora de forma injustificada.

### Fase 3 — Extracción a shared/lib y deduplicación

- [x] Extraer utilidades genéricas repetidas (`descarga`, fechas, selectores de archivo, primitivas de diálogo) a `app/board/shared`.
- [x] Mover lógica pura específica a `lib/domain/aula-documentos` y servicios de servidor a `lib/server/aula-documentos`.
- [x] Auditar otras apps (`hoja-calculo`, Mermaid, Office) para reutilizar lo extraído sin acoplar Aula Documentos.
- [x] Eliminar helpers, estilos y pruebas duplicadas; revisar imports muertos y dependencias circulares.
- [x] Mantener las cargas diferidas necesarias y medir el presupuesto de `aula-documentos` y `aula-documentos-export`.
- [x] Actualizar la documentación de arquitectura y los límites de mantenimiento.
- **Criterios de aceptación:**
  - Las utilidades compartidas tienen al menos dos consumidores reales o una justificación escrita.
  - No hay imports de `app` desde `shared`/`lib` ni lógica de dominio duplicada.
  - La suite, el build y los presupuestos pasan con margen suficiente para continuar las tablas.

### Fase 4 — Insertar y editar la estructura básica

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

### Fase 5 — Celdas, cabecera, teclado y límites

- [x] Implementar cabecera de fila y convertir celdas normales en celdas de cabecera.
- [x] Implementar combinar y dividir celdas, conservando `colspan` y `rowspan` al guardar y recargar.
- [x] Actualizar la normalización y validación del documento para aceptar spans seguros y rechazar estructuras imposibles.
- [x] Añadir límites de tablas, filas, columnas y celdas por documento, con mensajes claros.
- [x] Resolver Tab/Shift+Tab, selección, foco, Escape y acciones móviles de 44 px.
- [x] Evitar que la tabla desborde la hoja: scroll horizontal controlado en pantalla y ajuste en impresión.
- [x] Añadir pruebas de spans, límites, teclado, foco, móvil y recarga.
- **Criterios de aceptación:**
  - Combinar y dividir celdas no rompe el documento ni el autosave.
  - La navegación por teclado permite recorrer la tabla sin salir de la hoja.
  - Una tabla que supera los límites se rechaza con un mensaje comprensible.

### Fase 6 — Exportación, documentación y cierre

- [x] Conservar tablas, cabeceras y celdas combinadas en HTML, impresión/PDF y presentación.
- [x] Exportar tablas a DOCX/PPTX con cabeceras y spans cuando sea posible; añadir avisos de fidelidad cuando no.
- [x] Exportar tablas simples a Markdown y avisar si hay celdas combinadas o estructura no representable.
- [x] Revisar rendimiento, tamaño del bundle, cuotas y presupuesto de `aula-documentos`.
- [x] Actualizar ayuda, ficha, documentación de la suite, changelog y roadmap.
- [x] Ejecutar suite, `tsc`, ESLint, build y presupuestos; revisar cinco anchos y ambos temas.
- [x] Archivar el roadmap, reiniciar `roadmap.md` y hacer el push único al cerrar.
- **Criterios de aceptación:**
  - La tabla aparece en las salidas acordadas con estructura y cabeceras predecibles.
  - Una limitación de Markdown u Office se explica antes o después de exportar, nunca se silencia.
  - El Site sigue en `1.1.37`; no se publica desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Refactor con regresiones | Se rompe autosave, permisos o exportación | Fases sin cambio funcional, pruebas movidas con el código y comparación de comportamiento. |
| Mover código entre app/shared/lib | Imports circulares o capas invertidas | Mapa de dependencias y regla app → shared/lib; revisar con build y lint. |
| Archivos movidos y merges | Conflictos difíciles de revisar | Commits por fase y cambios mecánicos separados de las mejoras. |
| Duplicación aparente | Abstraer de más y acoplar apps | Extraer solo con dos consumidores reales o justificación escrita. |
| Presupuesto ajustado | El nuevo reparto aumenta el chunk | Mantener cargas diferidas y medir en cada fase. |
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
- 2026-11-20: Fase 4 completada. Añadido **Insertar > Tabla** con selector de cuadrícula, creación con fila de cabecera y barra contextual para añadir/eliminar filas y columnas, alternar cabecera y eliminar la tabla. El selector y la barra se cargan bajo demanda; el editor y el autosave existentes se conservan. Pruebas de inserción, estructura, autosave en curso y modo invitado. Suite completa: 217 archivos / 1.554 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos: 366.306 / 370.000 B gzip; aula-documentos-export: 329.689 / 340.000 B gzip) y `perf:office` correctos.
- 2026-11-20: Añadidas tres fases de emergencia antes de continuar tablas: auditoría y mapa de extracción, descomposición interna y extracción a shared/lib con deduplicación. Línea base: app/board/apps/aula-documentos/aula-documentos-app.tsx 3.338 líneas, CSS 1.742, prueba principal 1.342, mermaid-block 614, export-html 327, export-images 283. La Fase 1 de tablas ya estaba completada y pasa a ser Fase 4; celdas/teclado pasa a Fase 5 y exportación/cierre a Fase 6.
- 2026-11-20: Fase 1 de emergencia completada. Documentado el mapa de responsabilidades, árbol objetivo, reglas de dependencia, duplicación detectada y límites de mantenimiento en [`aula-documentos-arquitectura.md`](aula-documentos-arquitectura.md). Línea base registrada: `aula-documentos-app.tsx` 3.338 líneas, CSS 1.742, prueba principal 1.342, 217 archivos / 1.554 pruebas y presupuestos 366.306 / 329.689 / 196.481 B gzip. Sin cambios de comportamiento.
- 2026-11-20: Fase 2 en curso. CSS dividido en `styles/layout.css` (467 líneas), `editor.css` (257), `blocks.css` (484), `dialogs.css` (328) y `sidebar.css` (487), todos por debajo de 500; `aula-documentos.css` queda como agregador. Extraídos a `utils/document-view.ts` los helpers de palabras, fechas, descarga, texto y remapeo de imágenes, con el mismo comportamiento. La app principal sigue pendiente de descomposición; no se marca la fase como completada.
- 2026-11-20: Fase 2, bloque 2. Extraídos a `hooks/` los flujos de copias, recuperación, migración, presentación, exportación, importación, documento nuevo, imágenes y enlaces. `aula-documentos-app.tsx` baja de 3.253 a 2.382 líneas; cada hook queda por debajo de 600 líneas. Las pruebas de CSS leen ahora los estilos divididos. Suite completa: 217 archivos / 1.554 pruebas; `tsc`, ESLint y build correctos. Autosave/conflicto, JSX y pruebas siguen pendientes de extracción.
- 2026-11-20: Fase 2 completada. `aula-documentos-app.tsx` queda en 20 líneas como shell de orquestación; el modelo compartido vive en `hooks/use-aula-documentos-model.ts` (533 líneas) y la UI en `components/`. Cada hook/componente queda por debajo de 600 líneas, cada CSS por debajo de 500 y cada prueba por debajo de 600. Los diálogos se cargan bajo demanda para no romper el presupuesto. Pruebas divididas en cinco flujos más una comprobación de arquitectura y tamaños. Suite completa: 222 archivos / 1.559 pruebas; `tsc`, ESLint, build y `perf:budget` correctos (aula-documentos: 368.419 / 370.000 B gzip).
- 2026-11-20: Fase 3 completada. Descargas y formato de fecha compartidos en `app/board/shared/ui` con consumidores reales en Aula Documentos, Hoja de cálculo, Mermaid, borradores versionados y el diálogo de conflicto. `countWords`, `contentText` y el remapeo de imágenes pasan a `lib/domain/aula-documentos`; los servicios de copias y migración ya estaban en `lib/server`. Se mantienen locales los selectores de archivo y el patrón de diálogo por falta de un segundo consumidor. Añadidas pruebas de utilidades y una comprobación de dependencias shared/lib. Suite completa: 226 archivos / 1.566 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos 368.382 / 370.000 B gzip) y `perf:office` (196.481 / 210.000 B gzip) correctos.
- 2026-11-20: Fase 5 completada. La barra de tabla permite alternar cabecera de fila/columna/celda, combinar y dividir celdas. El validador conserva `colspan`/`rowspan`, rechaza spans imposibles y aplica límites de 20 tablas, 50 filas, 20 columnas, 400 celdas por tabla y 1.000 celdas por documento. Tiptap conserva Tab/Shift+Tab dentro de la tabla y Escape devuelve el foco al editor. La tabla se envuelve con scroll horizontal en pantalla y se ajusta al ancho de impresión; las acciones móviles y el selector alcanzan 44 px. Añadidas pruebas de spans, límites, recarga, foco y CSS móvil. Suite completa: 227 archivos / 1.572 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos 369.183 / 370.000 B gzip) y `perf:office` correctos.
- 2026-11-20: Fase 6 completada. HTML, presentación e impresión conservan tablas, cabeceras y spans. DOCX exporta `colspan`/`rowspan` y cabeceras; PPTX conserva cabeceras y celdas combinadas. Markdown avisa de celdas combinadas y cabeceras no representables. Actualizados ayuda, ficha de suite, documentación Office, changelog y roadmap. Suite completa: 227 archivos / 1.576 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos 369.596 / 370.000 B gzip; export 329.694 / 340.000 B gzip) y `perf:office` (196.481 / 210.000 B gzip) correctos. El Site sigue en `1.1.37`; no se publica desde este roadmap.
