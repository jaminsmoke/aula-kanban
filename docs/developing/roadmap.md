# Roadmap ADOC-02 · Documento nuevo y plantillas de Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-02 del backlog (2026-11-18)
> **Backlog:** ADOC-03…ADOC-07 y DEV-01 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Permitir empezar un documento desde cero o desde una plantilla sin borrar el contenido a mano ni sobrescribir trabajo pendiente.
- [ ] Criterio de éxito: desde cualquier estado se puede crear un documento vacío o elegir una plantilla válida, con confirmación si hay cambios sin guardar; cancelar deja el documento actual intacto.

## 2. Alcance

**Dentro:**

- Acción «Nuevo documento» con confirmación cuando haya cambios sin guardar.
- Documento vacío, documento de ejemplo y plantillas básicas: apuntes, proyecto de clase, presentación y guía.
- Título inicial, contenido válido y foco del editor definidos por cada plantilla.
- Reemplazo con la misma ruta de validación y autosave que el resto de documentos.
- Pruebas del modelo de plantillas, la confirmación, el reemplazo y la conservación del documento actual.

**Fuera de alcance:**

- Varios documentos por proyecto, biblioteca, carpetas, duplicar o «guardar como».
- Convertir una importación en un documento nuevo sin reemplazar el actual.
- Edición colaborativa, historial de versiones o concurrencia; siguen en ADOC-07.
- Cambios de esquema, endpoint, `AULA_STORE_VERSION` o versión del Site.
- Publicación en Sites: el cierre termina con un push único al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Las plantillas son funciones puras que devuelven `AulaDocument` | Guardar HTML o JSON suelto en la interfaz | Reutiliza la validación, los límites y el autosave existentes. |
| `createEmptyAulaDocument` para el documento vacío | Vaciar el editor desde la UI | Evita estados intermedios y produce un documento válido desde el primer momento. |
| El reemplazo usa `applyDocument` y `markChanged` | Escribir directamente en `editor.commands` | Mantiene el mismo camino de guardado, historial y estado de cambios. |
| La confirmación comprueba `dirty` antes de abrir el selector | Preguntar siempre | Evita fricción cuando el documento actual está guardado. |
| Un solo documento por proyecto | Selector de documentos o carpetas | La app mantiene una única fuente de verdad por proyecto en esta versión. |
| El título y el foco se definen en la plantilla | Reutilizar el título anterior | Evita documentos nuevos con el nombre del documento reemplazado. |

## 4. Fases

### Fase 1 — Modelo de plantillas

- [ ] Crear `lib/domain/aula-documentos/templates.ts` con las plantillas vacía, apuntes, proyecto de clase, presentación y guía.
- [ ] Reutilizar `createEmptyAulaDocument` y `createStarterAulaDocument` cuando corresponda, sin duplicar contenido.
- [ ] Validar cada plantilla con `parseAulaDocument` y añadir pruebas de títulos, contenido, diagramas y saltos de diapositiva.
- [ ] Exportar una lista tipada de plantillas con id, nombre, descripción y creador.
- **Criterios de aceptación:**
  - Cada plantilla devuelve un documento válido y guardable.
  - Las plantillas no incluyen HTML ni nodos fuera del esquema.
  - La plantilla vacía no arrastra contenido del ejemplo.

### Fase 2 — Selector y reemplazo seguro

- [ ] Añadir la acción «Nuevo documento» a la barra de archivo y abrir un selector con las plantillas.
- [ ] Si hay cambios sin guardar, pedir confirmación antes de mostrar o aplicar el reemplazo.
- [ ] Aplicar la plantilla con `applyDocument`, marcar el documento como modificado y dejar el autosave listo.
- [ ] Colocar el foco en el título o en el editor según la plantilla y desplazar la vista al inicio.
- [ ] Mantener el documento actual recuperable hasta la confirmación final.
- [ ] Cubrir con pruebas: documento limpio, documento sucio, cancelar, cada plantilla y contenido válido al guardar.
- **Criterios de aceptación:**
  - Se puede empezar un documento vacío desde cualquier estado.
  - Elegir una plantilla deja un título comprensible y contenido válido.
  - Cancelar la confirmación no cambia el documento abierto.
  - El reemplazo se guarda con el autosave o con `Ctrl/Cmd+S`.

### Fase 3 — Integración y cierre

- [ ] Revisar el flujo a 1366, 1024 y 390 px, con teclado y en modo invitado.
- [ ] Actualizar la ayuda si cambia el texto de creación de documentos y registrar el resumen en el changelog.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-02.md`, reiniciar `developing/roadmap.md` y dejar el backlog con ADOC-03…ADOC-07 y DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - El flujo de creación y cancelación se verificó con datos reales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reemplazar un documento con cambios sin confirmar | Pérdida de trabajo | Confirmación basada en `dirty` y cancelación sin tocar el editor. |
| Una plantilla genera contenido inválido | El autosave falla o guarda un documento incompleto | Validar cada plantilla en el dominio y en pruebas. |
| El título anterior se conserva | Documentos nuevos con nombre confuso | El creador de cada plantilla define su título inicial. |
| El reemplazo se dispara durante una carga o guardado | Estado inconsistente | Deshabilitar la acción mientras `loading` o `saving`, y cancelar el debounce al aplicar. |
| Invitados pueden reemplazar el documento | Escritura no permitida | La acción se oculta o deshabilita en modo lectura. |
| El selector se confunde con una biblioteca | Expectativa de varios documentos | Mantener una sola acción de reemplazo y copy explícito de «sustituir el documento actual». |

## 6. Notas de sesión

- 2026-11-18: ADOC-02 sale del backlog y pasa a ser el roadmap activo. Prioridad P1; no se implementa nada en este paso.
- Puntos de partida: `lib/domain/aula-documentos/starter.ts`, `lib/domain/aula-documentos/document.ts`, `app/board/apps/aula-documentos/aula-documentos-app.tsx` y sus pruebas.
- ADOC-01 ya dejó el autosave, el cierre protegido y la recuperación; este roadmap reutiliza esa ruta. La app sigue con un único documento por proyecto.
