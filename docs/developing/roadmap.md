# Roadmap ADOC-05 · Presentación y salida de Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-05 del backlog (2026-11-18)
> **Backlog:** ADOC-06, ADOC-07 y DEV-01 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Convertir la presentación y la salida de Aula Documentos en una experiencia cuidada: nombres legibles, PDF/impresión, temas, vista previa, notas del orador y contenido largo sin cortes.
- [ ] Criterio de éxito: el documento se descarga con un nombre comprensible, se imprime o exporta a PDF sin cortar diapositivas y la presentación conserva el tema elegido y las notas asociadas.

## 2. Alcance

**Dentro:**

- Nombre de archivo derivado del título con slug seguro y fallback.
- Impresión y PDF desde la app o el HTML exportado, con estilos de impresión revisados.
- Temas de presentación con preferencia persistida por documento.
- Vista previa con recuento de diapositivas y revisión de contenido largo.
- Notas del orador asociadas a cada diapositiva.
- Exportación estática de la presentación con el tema y las notas, sin recursos externos.
- Pruebas de nombres, impresión, temas, notas, contenido largo y exportación.

**Fuera de alcance:**

- Varios documentos por proyecto, biblioteca, carpetas o duplicado.
- Edición colaborativa, comentarios o historial de versiones.
- Publicación en Sites, cambio de `AULA_STORE_VERSION` o del Site.
- Exportación interactiva con `reveal.js` embebido: la salida estática y el PDF cubren esta entrega.
- Recursos externos, CDN, fuentes remotas o dependencias nuevas de servidor.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| El tema y las notas se guardan en un objeto `presentation` opcional del documento | `localStorage` o un endpoint aparte | La presentación debe viajar con el documento compartido. |
| Se sube el esquema a v2 y se migran v1 al cargar | Rechazar documentos existentes | Los documentos actuales deben seguir abriéndose sin intervención. |
| Las notas se asocian al índice de diapositiva | Un editor de diapositivas independiente | Evita duplicar el contenido; si el documento cambia, las notas se revisan en la vista previa. |
| El nombre de archivo se genera en un helper puro | Nombre basado en `projectId` | Es legible, estable y no expone el identificador interno. |
| La impresión usa una vista autónoma basada en el documento validado | Imprimir la UI del editor | Evita menús, barras y estados de edición en el PDF. |
| La exportación de presentación es HTML estático | Incluir `reveal.js` en cada archivo | Mantiene el archivo ligero, sin CDN ni recursos externos. |
| Los temas se implementan con tokens CSS compartidos | Iframes o CSS inline duplicado | Coherencia con la app y menor mantenimiento. |

## 4. Fases

### Fase 1 — Nombres, impresión y PDF

- [x] Crear un helper de slug de título con minúsculas, guiones y fallback.
- [x] Usar el slug en HTML, Markdown y JSON de recuperación; la presentación exportada lo reutilizará en la fase 3.
- [x] Construir una vista de impresión autónoma con el documento validado y los SVG disponibles.
- [x] Añadir la acción «Imprimir / PDF» y revisar saltos de página, márgenes y contenido largo.
- [x] Cubrir con pruebas nombres, caracteres especiales, títulos vacíos, impresión y ausencia de recursos externos.
- **Criterios de aceptación:**
  - Los archivos descargados usan un nombre legible y estable.
  - La impresión no incluye la UI del editor.
  - Un documento largo no corta bloques ni diagramas de forma accidental.

### Fase 2 — Temas y vista previa

- [x] Definir dos o tres temas de presentación con tokens de color, tipografía y fondo.
- [x] Añadir selector de tema, persistirlo en `presentation.theme` y migrar documentos v1.
- [x] Añadir una vista previa con recuento de diapositivas y navegación sin entrar en pantalla completa.
- [x] Revisar contenido largo, listas y diagramas dentro de una diapositiva.
- [x] Cubrir con pruebas de migración, cambio de tema, persistencia y vista previa.
- **Criterios de aceptación:**
  - El tema elegido sobrevive a guardar, recargar y reabrir.
  - La vista previa muestra el número de diapositivas y no altera el documento.
  - El contenido largo se puede revisar sin perder el hilo.

### Fase 3 — Notas y exportación estática

- [ ] Añadir notas por diapositiva en `presentation.notes`, con edición solo para roles con permiso.
- [ ] Mostrar las notas en la presentación sin exponerlas al público por defecto.
- [ ] Generar un HTML estático de diapositivas con el tema elegido y las notas como sección opcional.
- [ ] Mantener el HTML sin CDN, fuentes ni scripts externos y con el SVG ya renderizado.
- [ ] Cubrir con pruebas notas, exportación, tema, invitados y contenido sin notas.
- **Criterios de aceptación:**
  - Las notas se guardan con el documento y no se mezclan con el texto visible.
  - La exportación conserva tema, orden y contenido de las diapositivas.
  - Un invitado no puede editar notas.
  - El HTML se abre sin red y sin recursos externos.

### Fase 4 — Verificación y cierre

- [ ] Revisar presentación, impresión, PDF y exportación a 1366, 1024 y 390 px.
- [ ] Actualizar la ayuda y registrar el resumen en el changelog.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-05.md`, reiniciar `developing/roadmap.md` y dejar el backlog con ADOC-06, ADOC-07 y DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Los flujos de impresión, tema, notas y exportación se verificaron con datos reales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La migración v1→v2 rompe documentos existentes | Pérdida de acceso | Migrar al cargar, probar documentos reales y mantener el contenido intacto. |
| Las notas se desplazan al editar diapositivas | Notas asociadas a otra sección | Revisarlas en la vista previa y documentar el índice; no prometer anclaje perfecto. |
| La impresión corta diagramas o listas | PDF incompleto | Reglas `break-inside`, vista autónoma y pruebas con contenido largo. |
| El nombre del archivo choca o queda vacío | Archivos confusos | Slug estable, fallback y deduplicación si se descargan varios. |
| El tema se pierde al exportar | Presentación inconsistente | Incluir tokens del tema en el HTML estático y probarlo sin red. |
| Un invitado edita notas | Escritura no permitida | Ocultar o deshabilitar la edición y probar el rol. |
| El HTML exportado pesa demasiado | Archivo difícil de compartir | Reutilizar estilos mínimos y medir el tamaño con varios diagramas. |

## 6. Notas de sesión

- 2026-11-18: ADOC-05 sale del backlog y pasa a ser el roadmap activo. Prioridad P1; no se implementa nada en este paso.
- Puntos de partida: `lib/domain/aula-documentos/document.ts`, `lib/domain/aula-documentos/presentation.ts`, `app/board/shared/aula-documentos/presentation-view.tsx`, `app/board/shared/aula-documentos/export-html.ts` y sus pruebas.
- ADOC-01 a ADOC-04 están cerrados. La presentación actual usa `reveal.js` bajo demanda; este roadmap añade salida estática y no introduce recursos externos.
- 2026-11-18: Fase 1 completada. `filename.ts` genera slugs con acentos, signos y fallback; HTML, Markdown y JSON de recuperación usan el título. La acción «Imprimir o guardar PDF» genera el HTML autónomo con SVG y lo imprime en un iframe oculto, con reglas `break-inside` y sin recursos externos. 47 pruebas focalizadas y 1.385 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 2 completada. El documento sube a esquema v2 con `presentation.theme`; los documentos v1 se migran con el tema Aula. Hay tres temas (Aula, Claro y Oscuro) y una vista previa con recuento y navegación, sin cambiar el documento. 52 pruebas focalizadas y 1.388 en la suite completa; `tsc` y ESLint en verde.
