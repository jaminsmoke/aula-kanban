# Roadmap ADOC-04 · Mermaid utilizable en Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-04 del backlog (2026-11-18)
> **Backlog:** ADOC-05…ADOC-07 y DEV-01 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Convertir los diagramas Mermaid en una herramienta cómoda: errores completos y accionables, varias plantillas, render bajo demanda, zoom y un fallback claro en presentación y HTML.
- [ ] Criterio de éxito: un diagrama roto muestra línea y detalle, un documento con varios diagramas abre sin bloquearse, se puede insertar y editar una plantilla distinta de la de flujo y el SVG se puede ampliar y recorrer.

## 2. Alcance

**Dentro:**

- Mostrar el error completo de Mermaid en un área desplazable, con línea, mensaje y una indicación breve de qué revisar.
- Selector de plantillas Mermaid: flujo, secuencia, línea de tiempo y mapa mental.
- Renderizar solo los bloques visibles o cercanos al viewport, con carga diferida.
- Zoom y paneo del SVG, con controles de teclado y restauración.
- Restaurar la última versión válida de un bloque y copiar su código.
- Fallback explícito «No se pudo dibujar el diagrama» en presentación y HTML exportado.
- Pruebas de error, plantillas, render diferido, fallback y restauración.

**Fuera de alcance:**

- Edición colaborativa, comentarios o historial de versiones del diagrama.
- Aceptar HTML o scripts dentro del código Mermaid.
- Cambios de esquema, endpoint, `AULA_STORE_VERSION`, versión de la app o del Site.
- Publicación en Sites: el cierre termina con un push único al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mantener Mermaid 12.3.0 con `securityLevel: "strict"` | Actualizar o relajar la seguridad para aceptar HTML | La seguridad actual ya está probada y el objetivo es la experiencia de edición. |
| Reutilizar el renderizador con cola y añadir un observador de visibilidad | Renderizar todos los bloques al abrir | Evita trabajo innecesario y mantiene una sola instancia de Mermaid. |
| Las plantillas viven en `lib/domain/mermaid/templates.ts` | Guardar ejemplos en el NodeView | Reutiliza el catálogo de Diagramas y permite probarlas sin UI. |
| La última versión válida se guarda en memoria del bloque | Persistirla en el documento o en el servidor | No cambia el esquema y sirve para recuperar mientras se edita. |
| El fallback y el error se generan en la capa compartida de exportación/presentación | Duplicar HTML en cada vista | El resultado debe ser coherente en editor, presentación y HTML. |
| Zoom y paneo con transformaciones CSS y controles explícitos | Depender del zoom del navegador | Mantiene el documento y la presentación legibles sin alterar el SVG guardado. |

## 4. Fases

### Fase 1 — Errores y fallback

- [x] Extraer un mensaje de error de Mermaid con línea, detalle y resumen accionable.
- [x] Mostrar el mensaje completo en un bloque desplazable, sin truncarlo a la primera línea.
- [x] Añadir un fallback compartido para editor, presentación y HTML: «No se pudo dibujar el diagrama», con el código como respaldo.
- [x] Distinguir un diagrama vacío, uno roto y uno que aún se está dibujando.
- [x] Cubrir con pruebas errores con línea, errores sin línea, diagramas vacíos y fallback en presentación/exportación.
- **Criterios de aceptación:**
  - Un error de sintaxis muestra la línea y el detalle completo.
  - Un diagrama roto no ejecuta HTML ni rompe el resto del documento.
  - Presentación y HTML exportado explican el fallo en vez de mostrar solo código.

### Fase 2 — Plantillas y recuperación

- [x] Ampliar `lib/domain/mermaid/templates.ts` con flujo, secuencia, línea de tiempo y mapa mental.
- [x] Añadir un selector de plantilla al bloque Mermaid, sin reemplazar el código sin confirmación.
- [x] Guardar en memoria la última versión válida y ofrecer restaurarla.
- [x] Añadir un botón para copiar el código del bloque.
- [x] Cubrir con pruebas cada plantilla, inserción, restauración y copia.
- **Criterios de aceptación:**
  - Se puede insertar una plantilla distinta de la de flujo y editarla.
  - Restaurar recupera el último código que se dibujó correctamente.
  - Copiar no modifica el documento.

### Fase 3 — Render bajo demanda, zoom y paneo

- [x] Observar la visibilidad de los bloques y renderizar solo los cercanos al viewport, con un fallback para navegadores sin `IntersectionObserver`.
- [x] Añadir zoom, paneo y restauración con controles de teclado y botones accesibles.
- [x] Evitar que el zoom altere el tamaño guardado o la exportación.
- [x] Comprobar el render diferido con el hook de visibilidad y una prueba de que un bloque oculto no llama al renderizador.
- [x] Cubrir con pruebas el render diferido, los controles y la restauración del zoom.
- **Criterios de aceptación:**
  - Un documento con varios diagramas no bloquea la apertura.
  - El SVG se puede ampliar y recorrer sin perder el ajuste.
  - La exportación conserva el tamaño y la legibilidad originales.

### Fase 4 — Verificación y cierre

- [ ] Revisar el flujo a 1366, 1024 y 390 px, con teclado y con diagramas largos.
- [ ] Actualizar la ayuda si cambia el texto de Mermaid y registrar el resumen en el changelog.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-04.md`, reiniciar `developing/roadmap.md` y dejar el backlog con ADOC-05…ADOC-07 y DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Los flujos de error, plantilla, zoom y exportación se verificaron con datos reales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un error largo desborda la interfaz | La persona no puede leer ni corregir | Área desplazable, tipografía monoespaciada y límite visual sin truncar el contenido. |
| El render diferido deja un bloque vacío | Se interpreta como pérdida del diagrama | Placeholder explícito y render inmediato si el bloque ya está visible. |
| El zoom cambia el SVG exportado | El HTML o la presentación pierden proporción | Aplicar transformaciones solo en la vista y no en el string SVG guardado. |
| La última versión válida se pierde al cambiar de bloque | Recuperación inútil | Guardar por instancia mientras el bloque siga montado y reiniciar al cargar el documento. |
| Una plantilla Mermaid no es válida | Error al insertar | Validar o dibujar cada plantilla en pruebas antes de publicarla. |
| El fallback oculta el código útil | La persona no puede copiarlo | Mostrar el fallback y un bloque de código copiable como respaldo. |

## 6. Notas de sesión

- 2026-11-18: ADOC-04 sale del backlog y pasa a ser el roadmap activo. Prioridad P1; no se implementa nada en este paso.
- Puntos de partida: `app/board/shared/aula-documentos/mermaid-block.tsx`, `app/board/shared/aula-documentos/mermaid-renderer.ts`, `app/board/shared/aula-documentos/export-html.ts`, `lib/domain/mermaid/templates.ts` y sus pruebas.
- ADOC-01, ADOC-02 y ADOC-03 están cerrados. La app mantiene Mermaid bajo demanda y `securityLevel: "strict"`.
- 2026-11-18: Fase 1 completada. `mermaid-error.ts` extrae línea, resumen y detalle; el editor muestra el mensaje completo en un área desplazable y distingue vacío, roto y cargando. El fallback compartido explica el fallo y conserva el código en presentación y HTML exportado. 39 pruebas focalizadas y 1.371 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 2 completada. El catálogo suma mapa mental y el bloque Mermaid ofrece selector de plantilla con confirmación, copia del código y restauración de la última versión válida. La restauración se mantiene en memoria mientras el bloque está montado y «Descartar» recupera el código con el que empezó la edición aunque el autosave ya haya aplicado el borrador. Verificado en pruebas con secuencia, restauración, copia y descarte; 37 pruebas focalizadas y 1.375 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 3 completada. Los bloques se renderizan con `IntersectionObserver` y placeholder fuera del viewport, con fallback si el navegador no lo soporta. El bloque añade zoom 100–300 %, paneo por arrastre o flechas, controles accesibles y restablecimiento; el zoom es solo visual y no cambia el SVG guardado ni la exportación. 38 pruebas focalizadas y 1.379 en la suite completa; `tsc` y ESLint en verde.
