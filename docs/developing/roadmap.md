# Roadmap TASK-02 — Abrir la entrega desde la ficha editable y volver a la tarea

> **Estado:** Activo (2026-11-22) · **Origen:** TASK-02 del backlog
> **Backlog:** 4 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Permitir un paso directo desde la ficha editable: «Abrir documento» cuando el vínculo está guardado y disponible.
- [ ] Reutilizar el selector de documento y la navegación `doc` existentes.
- [ ] Conservar la vista y los filtros de origen al volver desde Aula Documentos.
- [ ] Criterio de éxito: la persona que edita una tarea llega a la entrega en un paso y vuelve a su tarea después de cerrar Aula Documentos, por turnos, perfil especial o selección en Calendario.

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
- [ ] Abrir desde la ficha editable, reutilizando el mismo store/navigation.
- [ ] Cubrir página de tareas y Calendario, profesor y alumno.
- [ ] Conservar la vista y filtros al volver.
- [ ] Cubrir documento archivado/eliminado y estado claro.
- **Criterios:** recorrido propio, asignado/invitado, edición/lectura y volver sin pérdida.

### Fase 3 — E2e y permisos

- [ ] Validar con pruebas de rol: docente edita, propio y ajeno donde aplica.
- [ ] Revisar app close, back/re-open, segunda tarea seleccionada y doble activación.
- [ ] Comprobar protección: cambio al abrir; triple clic; cambio rápido sin duplicar.
- **Criterios:** flujo real debe ser probado; no un test de stores mocks.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar roadmap y reiniciar `roadmap.md`.
- [ ] push único.
- **Criterios:** flujo verificado, sin publicación Sites.

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
