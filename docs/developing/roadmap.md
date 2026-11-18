# Roadmap ADOC-03 · Importación legacy limpia de Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-03 del backlog (2026-11-18)
> **Backlog:** ADOC-04…ADOC-07 y DEV-01 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Importar documentos de Notas y documentos, Diagramas y Presentaciones sin duplicar el título, mostrando el origen y las normalizaciones antes de reemplazar.
- [ ] Criterio de éxito: un documento con título y primer H1 iguales se importa una sola vez; el resto de H1 se conserva, la vista previa explica los cambios y los datos de origen quedan intactos.

## 2. Alcance

**Dentro:**

- Detectar un primer H1 equivalente al título de Notas y documentos y retirarlo del contenido importado.
- Aplicar la misma normalización al Markdown cuando use `stripTitleHeading`, sin duplicar lógica.
- Mostrar en la vista previa la app de origen, el título final y la fecha de actualización del documento de origen cuando esté disponible.
- Mantener la vista previa, la confirmación y la garantía de no escribir en las apps originales.
- Añadir pruebas con y sin H1 duplicado, títulos vacíos, diferencias de espacios y documentos que no se pueden convertir.

**Fuera de alcance:**

- Migración automática, escritura de vuelta a las apps antiguas o borrado de sus datos.
- Varios documentos por proyecto, historial de importaciones o «deshacer importación».
- Cambios de esquema, endpoints, `AULA_STORE_VERSION`, versión de la app o del Site.
- Publicación en Sites: el cierre termina con un push único al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| La normalización vive en `lib/domain/aula-documentos/importers.ts` | Quitarla en la vista previa | El importador debe devolver un documento válido y probado, no depender de la UI. |
| Solo se quita el primer H1 cuando su texto normalizado coincide con el título | Quitar cualquier H1 repetido | Un H1 distinto puede ser contenido legítimo del documento. |
| Se comparan título y texto con espacios normalizados y sin distinguir mayúsculas | Comparación exacta | Evita duplicados por espacios o mayúsculas sin tocar encabezados con contenido distinto. |
| La fecha de origen se toma del `updatedAt` de `load()` en la app | Añadirla al documento guardado | Es metadato de la importación, no contenido del documento nuevo. |
| Las advertencias se acumulan en el preview existente | Mensajes nuevos en `status` | La persona debe ver qué cambió antes de confirmar el reemplazo. |
| Los datos de origen solo se leen | Guardar una copia o reescribirlos | La importación sigue siendo explícita y no destructiva. |

## 4. Fases

### Fase 1 — Normalización del título

- [x] Extraer un helper de dominio que compare el primer H1 con el título y devuelva contenido y advertencia sin mutar el original.
- [x] Aplicarlo en la importación de Notas y en el Markdown con `stripTitleHeading`, reutilizando una sola comparación normalizada.
- [x] Conservar el H1 cuando no coincida, esté vacío o aparezca después de otro bloque.
- [x] Añadir pruebas de título igual, distinto, con espacios, mayúsculas, acentos, H1 vacío y contenido sin encabezado.
- **Criterios de aceptación:**
  - El primer H1 equivalente al título se retira solo en la importación.
  - Un H1 legítimo distinto permanece intacto.
  - El importador no modifica el estado de origen.

### Fase 2 — Vista previa y metadatos

- [x] Mostrar app de origen y fecha de actualización cuando `load()` la devuelva.
- [x] Mostrar el título final y una advertencia cuando se haya quitado un H1 duplicado.
- [x] Mantener la vista previa, la confirmación y el aviso de reemplazo del documento actual.
- [x] Evitar que una importación con metadatos ausentes o un estado no convertibles rompa el diálogo.
- [x] Añadir pruebas de importación desde las tres apps, con y sin fecha, y de los avisos mostrados.
- **Criterios de aceptación:**
  - La vista previa explica el origen y las normalizaciones antes de confirmar.
  - Las importaciones válidas siguen funcionando con los datos actuales.
  - Un estado inválido muestra un error legible y no reemplaza nada.

### Fase 3 — Verificación y cierre

- [ ] Revisar la importación a 1366, 1024 y 390 px, con teclado y en modo invitado.
- [ ] Actualizar la ayuda si cambia el texto de importación y registrar el resumen en el changelog.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-03.md`, reiniciar `developing/roadmap.md` y dejar el backlog con ADOC-04…ADOC-07 y DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - La importación de las tres apps se verificó con datos reales y sin tocar los originales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Se elimina un H1 que era contenido real | Pérdida de información | Comparar solo el primer H1 con el título normalizado y avisar del cambio. |
| Títulos con espacios o mayúsculas no coinciden | Sigue el duplicado | Normalizar espacios, mayúsculas y acentos para la comparación. |
| Un origen no devuelve `updatedAt` | Falta la fecha en la vista previa | Mostrar «fecha no disponible» sin romper la importación. |
| La importación modifica el origen | Datos antiguos alterados | Leer con `load()` y no llamar a `save()` sobre el origen. |
| El preview queda obsoleto al cambiar de origen | Se muestra el título o la fecha equivocados | Reiniciar el preview al elegir otra fuente y ligarlo a la carga actual. |
| Invitados pueden importar y reemplazar | Escritura no permitida | Mantener la acción deshabilitada en modo lectura. |

## 6. Notas de sesión

- 2026-11-18: ADOC-03 sale del backlog y pasa a ser el roadmap activo. Prioridad P1; no se implementa nada en este paso.
- Puntos de partida: `lib/domain/aula-documentos/importers.ts`, `lib/domain/aula-documentos/markdown.ts`, `app/board/apps/aula-documentos/aula-documentos-app.tsx` y sus pruebas.
- ADOC-01 y ADOC-02 ya están cerrados. La app conserva un único documento por proyecto y no escribe en `documentos`, `mermaid` ni `presentaciones`.
- 2026-11-18: Fase 1 completada. `title-heading.ts` normaliza mayúsculas, acentos y espacios, retira solo el primer H1 equivalente y devuelve un aviso sin mutar el original. Se aplica a Notas y al Markdown con `stripTitleHeading`; los H1 distintos, vacíos o posteriores se conservan. 5 pruebas nuevas en el helper y casos añadidos a importadores y Markdown; 1.363 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 2 completada. La vista previa muestra app de origen, fecha de actualización o «Fecha de origen no disponible», título final y las advertencias del importador, incluida la retirada del H1 duplicado. Se conserva la confirmación de reemplazo y un estado no convertible muestra error sin ofrecer la importación. Verificado con Notas, Diagramas y Presentaciones; 30 pruebas focalizadas y 1.366 en la suite completa; `tsc` y ESLint en verde.
