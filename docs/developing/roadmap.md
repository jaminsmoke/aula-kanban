# Roadmap TASK-05 — Acceso directo a Mis tareas y aviso de vencimiento

> **Estado:** Activo (2026-11-22) · **Origen:** TASK-05 del backlog
> **Backlog:** 5 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Añadir **Mis tareas** como acceso directo cuando la cuenta tenga una ficha de alumno vinculada.
- [ ] Filtrar el tablero por la ficha propia sin pasar por Administración > Alumnos.
- [ ] Marcar con texto o icono las tareas pendientes vencidas.
- [ ] Permitir volver a todas las tareas con una acción clara.
- [ ] Criterio de éxito: una alumna vinculada ve sus tareas y sus vencidas en un paso, y puede volver a la vista completa sin recargar.

## 2. Alcance

**Dentro:**

- Acceso directo en Clase > Tareas para alumnado con `ownStudent`.
- Filtro por la ficha vinculada y tareas compartidas.
- Compatibilidad con tareas antiguas cuyo responsable es texto.
- Indicador de vencimiento para tareas no completadas con fecha pasada.
- Acción para quitar el filtro y volver a todas las tareas.
- Accesibilidad, contraste y responsive.
- Pruebas de ficha vinculada y no vinculada.

**Fuera:**

- Cambiar el modelo, la API, los permisos o los datos.
- Añadir una sección nueva de navegación.
- Notificaciones, correo o recordatorios.
- Cambiar el calendario o la ficha de alumno.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Reutilizar `studentFilter` con `ownStudent.section` | Crear un estado paralelo de «mis tareas» | El filtro por alumno ya resuelve tareas propias, compartidas y texto heredado. |
| Añadir el acceso en la barra de filtros de Clase > Tareas | Crear una sección nueva en el menú | Es un filtro directo y no amplía la navegación. |
| Mostrar el acceso solo con ficha vinculada | Enseñarlo siempre y deshabilitarlo | Evita una acción que el profesorado o una cuenta sin ficha no pueden usar. |
| Marcar vencidas con texto e icono | Solo cambiar el color de la fecha | El color por sí solo no es accesible ni suficiente. |
| Definir vencida como no `done` y fecha anterior a hoy | Incluir completadas o tareas sin fecha | Evita falsos avisos y mantiene el foco en lo pendiente. |
| Volver a todas las tareas con `clearStudentFilter`/`clearFilters` | Recargar la página | Conserva el resto del contexto del tablero. |

## 4. Punto de partida

- `useTasks` ya calcula `studentFilter` y usa `taskBelongsTo` para incluir tareas propias y compartidas.
- `ownStudent` identifica la ficha vinculada a la cuenta.
- La barra de filtros del tablero permite elegir «Todos los alumnos» y un alumno concreto.
- Las tarjetas muestran la fecha de entrega, pero no distinguen vencidas.
- La ficha de alumno abierta desde Administración ya lista tareas, pero el acceso no es directo desde Clase.
- Baseline: arquitectura **465 archivos / 1.170 imports**; suite **273 archivos / 1.839 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Contrato de acceso y vencimiento

- [ ] Definir cuándo aparece **Mis tareas** y qué ficha usa.
- [ ] Fijar la inclusión de tareas propias, compartidas y con responsable textual.
- [ ] Definir vencida: no `done`, con fecha local anterior a hoy.
- [ ] Fijar el retorno a todas las tareas y el texto accesible del indicador.
- **Criterios:** la acción solo existe con ficha vinculada y el filtro incluye exactamente las tareas de esa ficha.

### Fase 2 — Acceso directo e indicador visual

- [ ] Añadir **Mis tareas** a la barra de filtros de Clase > Tareas.
- [ ] Aplicar y quitar el filtro de la ficha propia en un paso.
- [ ] Marcar las tareas vencidas con texto e icono y contraste suficiente.
- [ ] Mantener el aviso accesible y el responsive.
- **Criterios:** un clic muestra las tareas propias; otro devuelve a todas; las vencidas se reconocen sin depender del color.

### Fase 3 — Pruebas de acceso, permisos y vencimiento

- [ ] Probar cuenta con ficha vinculada y sin ficha.
- [ ] Probar tareas propias, compartidas y con responsable textual.
- [ ] Comprobar completadas y sin fecha fuera del aviso.
- [ ] Verificar el retorno a todas las tareas, foco y accesibilidad.
- **Criterios:** el acceso no aparece para quien no tiene ficha y el aviso de vencimiento es correcto en todos los casos.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Usar un filtro distinto al de la ficha | Tareas propias ausentes | Resolver con `ownStudent.section` y `taskBelongsTo`. |
| Perder tareas compartidas | Falsa sensación de tareas incompletas | Mantener la lógica actual de responsables. |
| Marcar completadas como vencidas | Ruido y falsos avisos | Excluir `done` explícitamente. |
| Depender solo del color | Aviso inaccesible | Texto e icono con contraste. |
| No poder volver a todas | El filtro se queda pegado | Acción de limpieza y foco visible. |
| Mostrar el acceso sin ficha | Acción que falla | Condicionarla a `ownStudent`. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** TASK-05 entra desde el backlog por la ruta indirecta a las tareas propias y la falta de aviso de vencimiento.
- El backlog queda con **5 entradas**: PER-09, UI-13, UI-14, PERM-03 y DEV-01.
- Sin cambios de producto en esta apertura.
