# Roadmap TASK-04 — Asignarse una tarea en un paso

> **Estado:** Activo (2026-11-22) · **Origen:** TASK-04 del backlog
> **Backlog:** 9 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Mostrar **Asignarme** en el resumen de una tarea libre, usando la ficha de alumno vinculada a la cuenta.
- [ ] Asignar y guardar en una sola acción, sin obligar a abrir la pestaña Asignaciones.
- [ ] Respetar permisos y avisar si la tarea cambió o ya fue asignada antes de guardar.
- [ ] Criterio de éxito: una alumna vinculada abre una tarea sin asignar, pulsa **Asignarme** una vez y la tarea queda suya sin pasos ocultos.

## 2. Alcance

**Dentro:**

- Ficha editable de una tarea libre y sin asignar.
- Alumnado con ficha vinculada al proyecto.
- Acción compacta visible en Resumen, junto al resumen de responsables.
- Asignación de la ficha propia y guardado con la revisión actual.
- Conflicto de revisión y tarea ya asignada.
- Mensajes accesibles y estado de guardado.

**Fuera:**

- Cambiar el modelo, la API o los permisos.
- Asignar tareas a otras personas desde esta acción.
- Autoguardado o edición de otros campos.
- Cambiar el flujo de responsables del profesorado.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Resolver la ficha propia con `ownStudent` antes de habilitar la acción | Pedir al usuario que elija su nombre en Asignaciones | Es el único perfil que la cuenta puede reclamar y evita el error actual. |
| Guardar con `PATCH` usando la revisión de `editor.task` | Reutilizar el `submit` del formulario vacío | Evita enviar campos deshabilitados y mantiene el control de concurrencia existente. |
| Acción compacta en el resumen | Mantener «Asignarme y guardar» al final del formulario | La acción debe estar donde se ve el estado de responsables. |
| Cerrar la ficha tras guardar y anunciar el resultado | Mantener la ficha abierta con estado intermedio | La tarea ya queda asignada; el tablero muestra el nuevo estado. |
| No mostrar la acción sin ficha vinculada | Permitir escribir un nombre libre | La asignación debe usar una ficha real del proyecto. |
| Tratar 409 como aviso | Reintentar automáticamente | Otra sesión pudo asignar la tarea; el usuario debe ver la versión actual. |

## 4. Punto de partida

- `useTasks` calcula `claiming` cuando la tarea no tiene responsables y el usuario no puede gestionar el proyecto.
- `TaskDialog` muestra un aviso de reclamación, pero el botón sigue siendo **Asignarme y guardar** al final del formulario.
- `TaskForm` deshabilita los campos durante `claiming`; guardar sin responsables provoca el error de permisos.
- `ownStudent` ya identifica la ficha vinculada a la cuenta.
- `mutate` envía `PATCH` con revisión y ya traduce conflictos 409.
- Baseline: arquitectura **462 archivos / 1.162 imports**; suite **270 archivos / 1.811 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Contrato de autoasignación

- [x] Fijar la condición exacta de tarea libre: sin responsables, asignación textual vacía o «Por definir».
- [x] Construir el responsable propio a partir de `ownStudent` y el formato existente.
- [x] Definir el guardado con la revisión actual y el mensaje de éxito.
- [x] Fijar los estados sin ficha vinculada, tarea ya asignada y conflicto 409.
- **Criterios:** la acción solo aparece cuando puede funcionar y el contrato no requiere elegir una persona ni editar otros campos.
- **Cierre Fase 1 (2026-11-22):** `claim.ts` define tarea libre, ficha propia, PATCH con revisión y mensaje. `useTasks.claimTask` usa el mismo contrato; tests **13**; `npm run check` correcto; arquitectura **463 / 1.166**; límite de tests del Tablero **2.800**.

### Fase 2 — Acción compacta y guardado

- [x] Añadir **Asignarme** al resumen, junto al aviso de reclamación.
- [x] Resolver la ficha propia y guardar en una sola acción.
- [x] Deshabilitar o sustituir la acción durante el guardado.
- [x] Cerrar la ficha y anunciar el resultado al completar.
- [x] Mantener accesibles los mensajes de sin ficha, tarea ya asignada y error de revisión.
- **Criterios:** un clic asigna la tarea; no se envía un formulario vacío ni se piden pasos adicionales.
- **Cierre Fase 2 (2026-11-22):** `TaskDialog` muestra **Asignarme** en el aviso y sustituye el envío vacío por `onClaim`; `Board` conecta `useTasks.claimTask`. Tests de `TaskDialog`, `useTasks` y contrato **44**; `npm run check` correcto; arquitectura **463 / 1.166**.

### Fase 3 — Permisos, conflicto y regresión

- [x] Probar tarea libre, tarea ya asignada, tarea ajena y cuenta sin ficha vinculada.
- [x] Probar conflicto 409 y conservar la ficha con el aviso.
- [x] Comprobar que invitados y docentes conservan su flujo actual.
- [x] Verificar nombre accesible, estado de guardado y foco tras el cierre.
- **Criterios:** la acción respeta las mismas reglas que editar la tarea y no permite reasignar una tarea ajena.
- **Cierre Fase 3 (2026-11-22):** tests de `TaskDialog`, `useTasks` y contrato cubren tarea libre/asignada/ajena, cuenta sin ficha, docente, invitado, conflicto 409, envío por teclado, nombre accesible y botón deshabilitado al guardar. **48 tests**; `npm run check` correcto; arquitectura **463 / 1.166**; Tablero **32 / 2.625 ≤ 32 / 2.800** y CSS **12 / 1.554 ≤ 13 / 1.650**.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reutilizar el submit vacío | Vuelve el error de responsables | Guardar un PATCH dedicado con la ficha propia. |
| Asignar una tarea ya ocupada | Se pisa otro responsable | Comprobar responsables y revisión antes de guardar; mostrar 409. |
| Acción visible sin ficha vinculada | Error inevitable | Ocultar o deshabilitar con explicación. |
| Docente o invitado usa la acción | Cambia el flujo de permisos | Mantener la condición `claiming` y excluir invitados. |
| Cerrar antes de confirmar el guardado | Estado incierto | Mantener la ficha hasta la respuesta y anunciar el resultado. |
| Nombre vacío o perfil eliminado | Asignación inválida | Resolver `ownStudent` y validar que siga activo. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** TASK-04 entra desde el backlog por el error de «Asignarme y guardar» y la acción fuera del resumen.
- El backlog queda con **9 entradas**: PERM-04, UI-15, UI-16, TASK-05, PER-09, UI-13, UI-14, PERM-03 y DEV-01.
- Sin cambios de producto en esta apertura.
