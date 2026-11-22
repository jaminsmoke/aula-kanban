# Teclado y foco en el calendario

> **Estado:** UI-12 completado (Fases 1-3) · **Fecha:** 2026-11-22
> **Alcance:** eventos del calendario de Clase, apertura de la ficha y retorno del foco.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Comportamiento actual

### Mes y Semana

Los eventos de día completo usan el `EventCell` de `react-big-calendar`. El resultado es un `div.rbc-event` con:

- `onClick` que dispara `onSelectEvent`;
- `onKeyDown` solo si se pasa `onKeyPress`, que `CalendarView` no configura;
- **sin** `role`, `tabIndex` ni nombre accesible propio.

`eventPropGetter` solo aplica clase y estilo al contenedor; no lo convierte en un control enfocable. La prueba temporal de la Fase 1 confirmó que el evento de Mes no tiene `role` ni `tabindex`.

Los eventos con hora en Semana sí usan `TimeGridEvent`, que ya renderiza un `div` con `role="button"` y `tabIndex={0}`. Las tareas del proyecto son de día completo (`allDay: true`), así que no pasan por ese componente.

### Agenda

Agenda renderiza una tabla y coloca el `onClick` en el `td.rbc-agenda-event-cell`. El contenido del evento es texto sin control enfocable ni `tabIndex`. No hay ruta de teclado equivalente al clic.

### Foco y diálogo

`CalendarView` llama a `onOpenTask`, que abre el editor existente. El diálogo usa `useDialogFocus`, que guarda `document.activeElement` y lo recupera al cerrar. Si el evento no es enfocable, el origen no es un control de la tarea y el retorno de foco no puede ser fiable.

### Estilos

`calendar-view.css` ya tiene un contorno `:focus-visible` para los eventos y para los controles del calendario, pero no hay ningún evento de día completo que pueda recibir ese foco.

## 2. Contrato de interacción

- Cada tarea del calendario se renderiza como un control enfocable.
- El orden de Tab sigue el orden de los eventos en el DOM de cada vista.
- Enter y Espacio abren la misma ficha que el clic.
- El clic y el toque conservan el comportamiento actual.
- El control tiene un nombre accesible que incluye el título completo y el estado; el texto visible puede seguir truncado.
- Al cerrar la ficha, el foco vuelve al evento que la abrió.
- La ficha conserva el modo de edición o lectura según la asignación y los permisos.
- No se añade navegación por flechas, arrastre ni un menú nuevo.

## 3. Matriz de pruebas

| Caso | Vista | Acción | Resultado esperado |
|---|---|---|---|
| Tarea propia | Mes | Tab; Enter | Abre la ficha en el modo permitido |
| Tarea asignada | Mes | Tab; Espacio | Abre la ficha en lectura o edición según permisos |
| Día completo | Semana | Tab; Enter | Abre la ficha; el evento recibe foco visible |
| Evento de agenda | Agenda | Tab; Espacio | Abre la ficha sin depender del clic |
| Clic actual | Mes | Clic | Abre una sola vez |
| Retorno de foco | Mes | Abrir y cerrar | El foco vuelve al evento de origen |
| Sin doble activación | Mes | Enter o Espacio | No se abre dos veces |
| Nombre accesible | Mes/Agenda | Inspección | Incluye título y estado de la tarea |
| Foco visible | Mes/Semana/Agenda | Tab | Contorno visible del control |

## 4. Implementación prevista

- Añadir un componente de evento propio en `CalendarView` que renderice un control accesible dentro del evento.
- Mantener `onSelectEvent` para el clic del contenedor y evitar que el control interno propague una segunda activación.
- Añadir estilos de foco y de botón que no cambien el aspecto de la rejilla.
- Confirmar que `useDialogFocus` devuelve el foco al control interno al cerrar.
- Probar Mes, Semana y Agenda con una tarea propia y otra asignada.

## 5. Baseline

- Arquitectura: **461 archivos / 1.155 imports / 0 problemas**.
- Suite: **268 archivos / 1.784 pruebas**.
- Aula Documentos: **386.827 / 387.000 B**.
- Hoja de cálculo: **313.044 / 315.000 B**.
- Site: `1.1.40`.
- Sin cambios de producto en esta fase.

## 6. Aplicado en la Fase 2

- `CalendarView` renderiza un botón propio dentro de cada evento, con `aria-label` de título y estado.
- Enter y Espacio abren la ficha; el clic y el toque se mantienen, sin doble activación.
- `Modal` guarda el control que abrió el diálogo y le devuelve el foco al desmontarse.
- Se probaron Mes, Semana, Agenda, el nombre accesible, Enter, Espacio y el retorno de foco.
- Suite completa **268 archivos / 1.788 pruebas**; `npm run check` y `app:budget` correctos.
- Sin cambios de modelo, permisos, datos ni versión del Site.

## 7. Aplicado en la Fase 3

- Verificados el foco visible, Enter/Espacio, el clic sin doble activación y el retorno de foco en Mes, Semana y Agenda.
- El editor conserva el modo de lectura para las tareas que no se pueden editar.
- `npm run check` correcto; arquitectura **461 / 1.155**; suite **268 / 1.788**.
- Build de Aula **386.830 / 387.000 B**; Hoja **313.047 / 315.000 B**; `app:budget`, `perf:budget` y `perf:office` correctos.
- Site `1.1.40`, sin publicación.
