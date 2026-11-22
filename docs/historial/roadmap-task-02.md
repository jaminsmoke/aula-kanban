# Roadmap TASK-02 — Abrir la entrega desde la ficha editable y volver a la tarea

> **Estado:** Completado (2026-11-22) · **Origen:** TASK-02 del backlog
> **Backlog:** 11 entradas · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [x] Permitir un paso directo desde la ficha editable: «Abrir documento» cuando el vínculo está guardado y disponible.
- [x] Reutilizar el selector de documento y la navegación `doc` existentes.
- [x] Conservar la vista y los filtros de origen al volver desde Aula Documentos.
- [x] Criterio de éxito: la persona que edita una tarea llega a la entrega en un paso y vuelve a su tarea después de cerrar Aula Documentos, por turnos, perfil especial o selección en Calendario.

## 2. Alcance

**Dentro:**

- Tarea propia y asignada en edición.
- Profesor de la tarea.
- Salida desde el detalle de solo lectura ya existente.
- Estados de documento archivado o eliminado.
- Recorrido desde Clase y Calendario.
- Selector existente en la ficha editable.
- Navegación y volver a la ficha sin pérdida de filtros.

**Fuera:**

- Abrir documentos múltiples o crear nuevas entregas desde la tarea.
- Rediseñar el formulario de tarea ni el modelo de entrega.
- Cambiar permisos en la base de datos.
- Cambiar valores, URLs públicas, permisos, datos, MCP ni versión del Site.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Conservar view y filtros actuales al abrir Aula Documentos | Inventar un estado de «en retorno» complejo | El URL ya soporta view, section y app; si falta, añadir `returnToTask` y `returnSource`. |
| Mostrar un botón «Abrir documento» junto al selector cuando hay vínculo | Reemplazar el selector por un botón alineado | El flujo debe usar el vínculo ya guardado y permitir cambiarlo. |
| Deshabilitar edición mientras Aula Documentos está abierto | Ignorar cambios o permitir edición segunda | Evita altas incoherentes; el retorno refleja el estado del Board. |
| Usar la misma navegación de apps existente | Abrir una nueva instancia o popup dedicada | No se introduce una surface nueva ni se rompen invariantes de apps. |

## 4. Punto de partida

- `TaskForm` tiene el selector en edición; `TaskDetail` tiene «Abrir documento» solo en lectura.
- `Board` sabe view, classSection y filtros actuales; `openTaskDocument` abre Aula Documentos con `app` y app lee `doc`.
- No existe visibly una acción para abrir desde la ficha editable ni un mensaje claro de retorno.
- Hay pruebas para selector, detalle y navegación base, pero no para retorno completo.
- Baseline: arquitectura **462 archivos / 1.159 imports**; suite **269 archivos / 1.794 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Contrato de retorno y navegación

- [x] Documentar estado completo de retorno: view, classSection, filtros, turno/perfil y tarea.
- [x] Confirmar el flujo real al cerrar Aula Documentos con test o búsqueda.
- [x] Fijar el estado de formulario: returnTarget, barra y llamada de retorno.
- [x] Fijar acciones: editar/archivar deshabilitado mientras app está abierta.
- **Criterios:** returnTarget al conocerlo; acciones coherentes durante Aula Documentos.
- **Cierre Fase 1 (2026-11-22):** `openTaskDocument` registra view/classSection/sección/tarea, `StoreDesktop` notifica App Close, `Board` devuelve a la ficha editable. Verificado: arquitectura **462 archivos / 1.160 imports**; suite afectada **26 tests**; `npm run check`, `arch:check`, `dead:check` y presupuestos correctos.

### Fase 2 — Implementación en la edición

- [x] Mostrar «Abrir documento» junto al selector si el vínculo existe y está activo.
- [x] Abrir desde la ficha editable, reutilizando el mismo `openTaskDocument`.
- [x] Conservar búsqueda, prioridad y alumno al abrir la ficha (`useTasks` no resetea filtros).
- [x] Cubrir estado archivado/eliminado y estado claro en edición y lectura.
- [x] Verificar recorrido propio/ajeno, Calendario y retorno real tras App Close.
- **Criterios:** recorrido propio, asignado/invitado, edición/lectura y volver sin pérdida.
- **Cierre Fase 2 (2026-11-22):** `TaskForm` muestra el botón por si hay vínculo activo y lo pulsa `openTaskDocument`; `TaskDialog` pasa `onOpenDocument`; tests cubren vínculo activo/archivado/eliminado, retorno de App Close, vista Calendario, filtros conservados y permisos docente/alumno. Board integration **2 tests**; suite afectada **10 tests**; `npm run check` correcto.

### Fase 3 — E2e y permisos

- [x] Validar con pruebas de rol: docente edita, propio y ajeno donde aplica.
- [x] Revisar app close, back/re-open, segunda tarea seleccionada y doble activación.
- [x] Comprobar protección: cambio al abrir; triple clic; cambio rápido sin duplicar.
- **Criterios:** flujo real debe ser probado; no un test de stores mocks.
- **Cierre Fase 3 (2026-11-22):** `Board` integration cubre Calendario, App Close, reapertura, segunda tarea, triple clic y cambio de revisión mientras Aula Documentos está abierto; al volver reabre la versión más reciente de la tarea. `useTasks` cubre docente, propia, ajena y libre. Suite `app/board`: **123 archivos / 654 pruebas**; checks y presupuestos correctos.

### Fase 4 — Verificación y cierre

- [x] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [x] Actualizar documentación, changelog y backlog; archivar roadmap y reiniciar `roadmap.md`.
- [x] push único.
- **Criterios:** flujo verificado, sin publicación Sites.
- **Cierre Fase 4 (2026-11-22):** `npm run check`, suite **269 / 1.802**, build y presupuestos correctos. Tablero **175.488 / 175.656 B**; Aula **386.830 / 387.000 B**; Hoja **313.046 / 315.000 B**. Documentación, changelog, backlog, README y arquitectura actualizados; roadmap archivado y `roadmap.md` reiniciado. Sin publicación en Sites ni migración remota.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| No hay un punto real de «volver» al cerrar app | El flujo falla en testing | Localizar App Close/History antes de implementar |
| Duplicar activación al volver | Al abrir selecciona otra tarea | Idempotente por task ID + no volver si open |
| Estado de filtros no conservado | El back pierde filtros | Testear URL/localStorage before opening doc |
| Cambio no bloqueo mientras app abierta | Race al editar la tarea | Deshabilitar formulario mientras app está abierta |
| Falta de integración de App Close | ReturnListener no se desencadena | Usar cambio de view o App Close API real |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** TASK-02 entra desde backlog por fallo “cierra documento y te pierdes”.
- El backlog queda con **4 entradas**: UI-13, UI-14, PERM-03, DEV-01.
- Sin cambios de producto en esta apertura.
