# Roadmap ADOC-12 · Office en Aula Documentos: importar, exportar y previsualizar

> **Estado:** Activo · **Origen:** ADOC-12 del backlog (2026-11-19)
> **Backlog:** ADOC-13, STORE-18 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Llevar archivos DOCX y PPTX desde el visor Office hasta Aula Documentos, y generar copias de salida DOCX/PPTX desde el documento canónico, compartiendo el visor sin convertirlo en un editor de Office.
- [ ] Criterio de éxito: un archivo de Office se puede previsualizar e importar con avisos de fidelidad, y un documento de Aula puede exportarse y reabrirse en Office, sin macros, sin pérdida de la fuente canónica y sin cargar las librerías de exportación al abrir la app.

## 2. Alcance

**Dentro:**

- Extraer el visor Office y sus modelos de `apps/visor-office/` a `app/board/shared/office/`.
- Mantener `visor-office` como app independiente mientras exista, consumiendo el componente compartido.
- Importar DOCX y PPTX con vista previa, estadísticas, avisos y confirmación.
- Conservar texto, encabezados, párrafos, listas, tablas, enlaces e imágenes simples; en PPTX, separar diapositivas.
- Exportar DOCX y PPTX desde el modelo canónico de Aula Documentos con import dinámico.
- Definir la matriz de fidelidad y los errores de archivos cifrados, dañados, demasiado grandes o con contenido no representable.
- Añadir los nuevos flujos a pruebas, `perf:budget` y documentación de ayuda.
- Mantener la protección frente a macros, enlaces externos y contenido activo.

**Fuera de alcance:**

- Editar OOXML o hacer round-trip con pérdida cero; `@silurus/ooxml` es de solo lectura.
- Sustituir la app Visor Office o retirar apps; eso pertenece a ADOC-13.
- Rediseñar la tarjeta y la ficha de producto de la suite; eso pertenece a STORE-18.
- Exportar XLSX desde Aula Documentos; como mucho se decidirá si XLSX se importa como tablas y el resto queda en Hoja de cálculo.
- Macros, VBA, contenido activo, animaciones, SmartArt, ecuaciones complejas o fidelidad de columnas y posiciones.
- Persistir el archivo original si no se decide expresamente; la primera versión puede usar solo la vista previa.
- Cambiar la versión del Site, `AULA_STORE_VERSION` o publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Aula Documentos como fuente de verdad | Convertir OOXML en el formato editable principal | Evita prometer edición y round-trip que el visor no ofrece. |
| Office como importación y exportación de instantáneas | Editar el archivo original en la app | Mantiene el modelo Aula, más pequeño y controlable. |
| Visor compartido en `app/board/shared/office/` | Importar componentes desde `apps/visor-office/` | Cumple la frontera entre apps y permite reutilizarlo. |
| Extracción textual/estructural con avisos | Renderizar Office y tratarlo como documento nativo | La fidelidad visual no es editable y perdería el modelo Aula. |
| Librerías de exportación con import dinámico | Incluirlas en el bundle inicial | No deben encarecer la apertura normal de la app. |
| DOCX/PPTX primero; XLSX como decisión aparte | Incluir los tres formatos en la primera entrega | XLSX pertenece más a Hoja de cálculo y amplía demasiado el alcance. |
| Las raíces de apps no se mueven en este roadmap | Anidarlas dentro de `aula-documentos/` | Primero se comparte el código; la retirada se planifica en ADOC-13. |

## 4. Fases

### Fase 1 — Spike, visor compartido y matriz de fidelidad

- [x] Medir la extracción headless de `DocxDocument` y `PptxPresentation`: texto, encabezados, listas, tablas, enlaces, imágenes y saltos.
- [x] Extraer el visor y sus modelos a `app/board/shared/office/` y adaptar `visor-office` sin cambiar su comportamiento.
- [x] Elegir las librerías de generación DOCX/PPTX y medir su coste con import dinámico.
- [x] Fijar la matriz de qué se conserva, qué se advierte y qué se descarta en importación y exportación.
- [x] Decidir si XLSX se queda solo en el visor o se importa como tablas en Aula Documentos.
- [x] Añadir fixtures DOCX/PPTX y un primer presupuesto de rendimiento.
- **Criterios de aceptación:**
  - El visor actual sigue abriendo sus tres formatos sin regresiones.
  - La extracción y la exportación producen resultados reproducibles y medibles.
  - La matriz de fidelidad y la decisión sobre XLSX quedan documentadas antes de tocar la interfaz.

### Fase 2 — Importación DOCX/PPTX

- [ ] Añadir Office como origen de importación dentro de Aula Documentos, junto a Notas, Diagramas, Presentaciones y Markdown.
- [ ] Leer DOCX/PPTX con los límites actuales del visor y mostrar vista previa, nombre, formato, tamaño, estadísticas y avisos.
- [ ] Convertir a documento Aula: título, encabezados, párrafos, listas, tablas, enlaces e imágenes simples; saltos de diapositiva en PPTX.
- [ ] Rechazar archivos cifrados, dañados, con macros o con contenido no soportado con mensajes claros.
- [ ] Confirmar el reemplazo sin romper autosave, conflictos ni el botón de recuperación.
- [ ] Cubrir con pruebas fixtures válidos, vacíos, grandes, corruptos y con elementos no representables.
- **Criterios de aceptación:**
  - Un DOCX/PPTX válido genera un documento Aula válido y editable.
  - Los avisos explican qué se ha perdido antes de reemplazar.
  - Un archivo problemático no bloquea la app ni genera contenido activo.

### Fase 3 — Exportación DOCX/PPTX

- [ ] Generar DOCX desde el modelo canónico con estilos básicos, párrafos, listas, tablas, enlaces e imágenes simples.
- [ ] Generar PPTX reutilizando los saltos y la estructura de presentación de Aula Documentos.
- [ ] Cargar las librerías solo al exportar y mantener el bundle inicial dentro del presupuesto.
- [ ] Añadir nombre de archivo legible, aviso de instantánea y limpieza de enlaces externos o contenido no permitido.
- [ ] Validar los archivos generados reabriéndolos con el visor compartido y con una suite de Office real.
- [ ] Añadir pruebas de estructura OOXML, archivos vacíos, documentos grandes y exportaciones repetidas.
- **Criterios de aceptación:**
  - El DOCX/PPTX generado se abre en Office y conserva el contenido acordado.
  - La exportación no altera el documento Aula ni pierde la fuente canónica.
  - La app no descarga las librerías de exportación hasta que se solicitan.

### Fase 4 — Unificación, verificación y cierre

- [ ] Integrar la vista previa Office compartida en Aula Documentos, incluida la decisión sobre “ver original”.
- [ ] Actualizar ayuda, mensajes, ficha técnica de la integración y enlaces de importación/exportación.
- [ ] Revisar 390, 620, 900, 1024 y 1366 px en tema claro y oscuro.
- [ ] Comprobar que Visor Office y las demás apps siguen funcionando, y que Aula Documentos mantiene sus importaciones actuales.
- [ ] Ejecutar suite completa, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar changelog; archivar el roadmap, reiniciarlo desde la plantilla y dejar en el backlog ADOC-13, STORE-18 y DEV-01.
- [ ] Hacer commits locales por fase y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Los flujos DOCX/PPTX funcionan con archivos reales y con la app servida.
  - La app no cambia de versión de Site ni se publica desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La fidelidad de Office es menor de la esperada | Expectativas incumplidas | Spike y matriz de fidelidad antes de la interfaz; avisos explícitos. |
| El lector no expone suficiente estructura | Importación pobre | Extracción textual con tablas y listas; no prometer maquetación. |
| Las librerías de exportación pesan demasiado | Se supera el presupuesto | Import dinámico, medición por fase y selección de la librería más pequeña viable. |
| Archivos maliciosos o enormes | Bloqueo o riesgo de seguridad | Límites del visor, rechazo de macros/contenido activo y pruebas de abuso. |
| Se confunde con edición de Office | Soporte y frustración | Nombrar la acción como importar/exportar copia, nunca “guardar como Office”. |
| El archivo original se pierde | El usuario no puede volver atrás | Vista previa antes de confirmar; decidir si se conserva un adjunto y avisarlo. |
| XLSX amplía el alcance | Retraso del roadmap | Mantenerlo en el visor y decidirlo en la fase 1. |

## 6. Notas de sesión

- 2026-11-19: ADOC-12 sale del backlog y pasa a ser el roadmap activo.
- La convergencia completa de Notas, Diagramas, Presentaciones y Visor Office queda en ADOC-13; la ficha de suite queda en STORE-18.
- El visor Office actual usa `@silurus/ooxml` 0.90.1 en solo lectura y sirve como referencia de límites y errores.
- No se mueven raíces de apps en este roadmap. Lo compartido sube a `app/board/shared` o a `lib`.
- El Site sigue en `1.1.36`; no se publica nada desde este roadmap.
- 2026-11-19: Fase 1 completada. El visor y su modelo se movieron a `app/board/shared/office/`; `visor-office` conserva su entrada y comportamiento mediante una cáscara. Medidos fixtures DOCX (9.850 B) y PPTX (51.679 B) con el motor headless: encabezado `Heading1`, enlace, viñetas, tabla 2×2 y dos diapositivas. Elegidos `docx` 9.16.0 y `pptxgenjs` 4.0.1 (MIT); los chunks de exportación miden **196.481 B gzip** y quedan con objetivo provisional de 210.000 B. XLSX se queda en el visor por ahora. Matriz y mediciones en [`docs/Store/apps/office.md`](../../Store/apps/office.md). Suite completa: 216 archivos / 1.526 pruebas; `tsc`, ESLint, build y `perf:budget` correctos.
