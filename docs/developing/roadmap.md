# Roadmap ADOC-19 — Presentación y PDF de calidad

> **Estado:** Activo (2026-11-21) · **Origen:** ADOC-19 del backlog
> **Backlog:** 3 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Reordenar, duplicar y eliminar diapositivas desde una vista de estructura.
- [ ] Añadir una vista de presentador con notas y vista de la siguiente diapositiva.
- [ ] Incorporar ajustes de página/diapositiva y una salida PDF predecible.
- [ ] Conservar notas, imágenes, tablas y diagramas en la presentación y el PDF.
- [ ] Revisar impresión, teclado, accesibilidad y rendimiento.
- [ ] Criterio de éxito: una presentación se puede preparar y presentar sin editar saltos a mano, y el PDF reproduce el resultado visible sin recursos externos.

## 2. Alcance

**Dentro:**

- Vista de estructura de diapositivas con reordenar, duplicar y eliminar.
- Transformaciones de diapositivas sobre el documento Tiptap activo.
- Remapeo de notas del orador al reordenar, duplicar o eliminar.
- Vista de presentador con notas actuales y vista previa de la siguiente diapositiva.
- Ajustes opcionales de página/diapositiva con valores por defecto compatibles.
- Impresión y PDF con saltos, orientación, tamaño y recursos controlados.
- Conservación de notas, imágenes, tablas y diagramas en HTML, impresión, PDF y PPTX.
- Pruebas de estructura, notas, presentador, impresión, PDF y accesibilidad.
- Documentación, ayuda y cierre.

**Fuera:**

- Edición colaborativa en tiempo real, cursores o comentarios.
- Un editor de diapositivas independiente del documento.
- Guardar una lista de diapositivas paralela al documento.
- Depender de un servicio externo para generar PDF.
- Rehacer el editor, la persistencia o el modelo de la suite de ADOC-17.
- Publicar, aplicar migraciones remotas o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Las diapositivas siguen derivándose del documento | Guardar una lista independiente de diapositivas | Una segunda fuente se desincroniza del texto y de los saltos. |
| Reordenar, duplicar y eliminar son transacciones Tiptap | Manipular JSON o DOM a mano | Conserva marcas, tablas, imágenes, deshacer y autosave. |
| Las operaciones usan rangos de bloques, no títulos | Identificar diapositivas por título | Los títulos pueden repetirse, cambiarse o estar vacíos. |
| Materializar saltos explícitos al primer cambio estructural | Reordenar títulos H1/H2 implícitos | Sin saltos, mover un H2 puede cambiar la agrupación y producir diapositivas distintas. |
| Las notas se remapean en la misma operación | Dejar las notas indexadas sin tocarlas | Reordenar o eliminar debe mover las notas con su diapositiva. |
| Historial de estructura de sesión | Confiar solo en `Ctrl+Z` de Tiptap | Las notas viven fuera del editor; un snapshot restaura contenido, notas y selección juntos. |
| La presentación reutiliza el HTML de las diapositivas | Renderizar una segunda vez para el presentador | Evita diferencias entre presentación, vista previa y PDF. |
| El PDF sale del HTML imprimible y `@page` | Generar PDF con un servicio externo | No añade dependencias ni coste de red y respeta los recursos locales. |
| Los ajustes nuevos son opcionales y con defaults | Migración obligatoria | Los documentos existentes deben abrirse sin cambios. |
| Las operaciones destructivas piden confirmación | Eliminar una diapositiva sin aviso | Evita pérdidas accidentales de contenido. |
| La estructura es una vista de sesión | Persistir el estado del panel | El orden real vive en el documento y no necesita otra migración. |

## 4. Punto de partida

- `buildPresentationSlides` agrupa las diapositivas por `slideBreak` o por H1/H2; ADOC-18 añadió el navegador y el salto desde la estructura.
- La vista previa permite anterior/siguiente y las notas del orador se editan por índice.
- La presentación usa reveal.js en pantalla completa; el botón **Notas** muestra solo las notas de la diapositiva actual.
- **Imprimir o guardar PDF** abre el HTML imprimible del documento; no hay ajustes de página/diapositiva ni una salida PDF específica de presentación.
- PPTX ya exporta diapositivas, notas e imágenes, pero no existe una vista de estructura editable.
- No se pueden reordenar, duplicar ni eliminar diapositivas sin editar el documento o los saltos a mano.
- No hay contrato documentado para estructura de diapositivas, remapeo de notas o ajustes de página.
- Suite registrada al abrir: **256 archivos / 1.701 pruebas**; Aula Documentos **376.482 / 377.000 B gzip**; arquitectura **438 archivos / 1.074 imports**; Site `1.1.37`.

## 5. Fases

### Fase 1 — Inventario, contrato y modelo de presentación

- [x] Inventariar cómo se construyen diapositivas, notas, HTML, impresión, PDF y PPTX.
- [x] Definir el contrato de estructura: posición, rango, título, notas y operaciones permitidas.
- [x] Decidir el remapeo de notas al reordenar, duplicar y eliminar.
- [x] Definir los ajustes opcionales de página/diapositiva y sus valores por defecto.
- [x] Documentar el contrato en `docs/developing/aula-documentos-presentacion.md`.
- **Criterios:** estructura, presentador, PDF y PPTX tienen un contrato común; no se mueve código todavía.
- **Cierre (2026-11-21):** contrato en [`aula-documentos-presentacion.md`](aula-documentos-presentacion.md): una sola fuente de diapositivas, materialización de saltos al primer cambio estructural, notas remapeadas e historial de estructura de sesión, presentador reutilizando HTML y ajustes de página opcionales con defaults. Sin cambios de código.

### Fase 2 — Estructura editable de diapositivas

- [ ] Añadir una vista de estructura con reordenar, duplicar y eliminar.
- [ ] Materializar saltos explícitos al primer cambio estructural y aplicar las operaciones como transacciones Tiptap.
- [ ] Remapear las notas del orador y conservar el documento, la selección y el deshacer.
- [ ] Añadir un deshacer de estructura de sesión que restaure contenido y notas juntos.
- [ ] Confirmar las operaciones destructivas y respetar el modo lectura.
- [ ] Probar diapositivas vacías, repetidas, muchas diapositivas y notas asociadas.
- **Criterios:** la estructura cambia el documento real y las notas viajan con su diapositiva; no se pierde contenido por accidente.

### Fase 3 — Vista de presentador

- [ ] Mostrar notas actuales y una vista de la siguiente diapositiva.
- [ ] Mantener los controles de teclado, salida y foco del modo presentación.
- [ ] Adaptar el presentador a pantallas estrechas y a la ausencia de notas.
- [ ] Probar navegación, diapositiva final, notas vacías y salida con `Escape`.
- **Criterios:** quien presenta ve lo necesario sin ocultar la presentación ni depender de otra ventana.

### Fase 4 — Ajustes de página y PDF

- [ ] Añadir ajustes opcionales de tamaño, orientación, márgenes y numeración.
- [ ] Aplicar los ajustes a impresión y PDF con saltos de diapositiva y recursos locales.
- [ ] Conservar imágenes, tablas, diagramas y notas según el formato de salida.
- [ ] Informar de recursos no disponibles sin romper el documento.
- [ ] Probar impresión/PDF, tamaños, orientaciones y presupuestos.
- **Criterios:** el PDF reproduce la presentación visible sin servicios externos y los documentos antiguos conservan los defaults.

### Fase 5 — Cierre

- [ ] Revisar que estructura, presentador, PDF y PPTX comparten las mismas diapositivas.
- [ ] Actualizar ayuda, documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- **Criterios:** presentación estable y accesible, suite y presupuestos correctos; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Notas desincronizadas | La nota queda en otra diapositiva | Remapear en la misma transacción y probar reordenar/duplicar/eliminar. |
| Operar sobre JSON o DOM | Se pierden marcas o recursos | Usar transacciones Tiptap y rangos de bloques. |
| Duplicar solapando rangos | Contenido duplicado o corrupto | Calcular el rango completo y aplicar en orden descendente. |
| PDF distinto por navegador | Saltos o tamaños impredecibles | Centralizar el CSS de impresión y probar tamaños/orientaciones. |
| Ajustes incompatibles | Documentos antiguos dejan de abrir | Campos opcionales, defaults y validación tolerante. |
| Presentador costoso | Retraso al abrir la presentación | Reutilizar el HTML ya construido y cargar la vista de forma diferida. |
| Recursos externos | PDF incompleto o dependiente de red | Incrustar imágenes y SVG; avisar de fallos. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** ADOC-19 sale del backlog; quedan **3 entradas** y el siguiente candidato es **ADOC-20**. Sin cambios de código de producto.
- 2026-11-21: **Fase 1 completada.** Contrato de estructura, notas, presentador, ajustes de página y PDF en [`aula-documentos-presentacion.md`](aula-documentos-presentacion.md). Sin cambios de código.
- La presentación actual, la vista previa, el navegador de ADOC-18 y la exportación PPTX son la base; no se crea un almacén paralelo de diapositivas.
- No hay publicación ni migraciones remotas en este roadmap.
