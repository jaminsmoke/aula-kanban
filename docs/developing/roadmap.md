# Roadmap UI-12 — Abrir tareas del calendario con el teclado

> **Estado:** Activo (2026-11-22) · **Origen:** UI-12 del backlog
> **Backlog:** 2 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Permitir recorrer las tareas del calendario con Tab en Mes, Semana y Agenda.
- [ ] Abrirlas con Enter o Espacio, con foco visible y un nombre accesible.
- [ ] Devolver el foco a la tarea al cerrar su ficha.
- [ ] Criterio de éxito: una tarea propia y otra asignada a otra persona se abren igual con ratón y teclado, sin cambiar el modo de edición o lectura.

## 2. Alcance

**Dentro:**

- `calendar-view.tsx`, sus componentes de evento y `calendar-view.css`.
- La integración con el diálogo de tarea existente y el retorno de foco al cerrar.
- Pruebas de teclado en Mes, Semana y Agenda, incluidas tareas de día completo.
- La etiqueta accesible con título y estado de la tarea.

**Fuera:**

- Cambiar la librería de calendario o rediseñar su rejilla.
- Implementar navegación por flechas entre días o arrastrar tareas.
- Cambiar el modelo de tareas, permisos, datos o navegación.
- Modificar el editor de tareas salvo lo necesario para devolver el foco.
- Publicar en Sites o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Convertir cada evento en un control enfocable | Dar `tabIndex` solo al contenedor del calendario | Cada tarea debe poder abrirse de forma independiente con teclado. |
| Abrir con Enter y Espacio | Solo Enter | Espacio es la activación esperada de un botón. |
| Usar el título y el estado en el nombre accesible | Dejar solo el texto visible | El texto corto puede truncarse; el estado y el título completo deben llegar al lector. |
| Reutilizar el retorno de foco del diálogo | Implementar un segundo gestor de foco | `useDialogFocus` ya devuelve el foco al control que abrió la ficha. |
| Mantener el clic y el toque actuales | Sustituir la interacción por un menú | La corrección es de teclado, no de rediseño. |

## 4. Punto de partida

- `CalendarView` usa `react-big-calendar` con vistas Mes, Semana y Agenda.
- Los eventos se renderizan con el componente por defecto; el clic abre la tarea mediante `onSelectEvent`.
- Las tareas de día completo no reciben foco de teclado en Mes y Semana.
- El diálogo de tarea usa `useDialogFocus`, que guarda el elemento activo y lo recupera al cerrar.
- La prueba actual cubre el clic, pero no Tab, Enter, Espacio ni el retorno de foco.
- Baseline: arquitectura **461 archivos / 1.155 imports**; suite **268 archivos / 1.784 pruebas**; Aula **386.827 / 387.000 B**; Hoja **313.044 / 315.000 B**; Site `1.1.40`.

## 5. Fases

### Fase 1 — Inventario y contrato de teclado

- [x] Revisar el DOM y el orden de Tab de los eventos en Mes, Semana y Agenda.
- [x] Confirmar cómo se abre la ficha y cómo vuelve el foco al cerrarla.
- [x] Fijar el nombre accesible, las teclas admitidas y el comportamiento en día completo.
- [x] Registrar la matriz de pruebas y el baseline sin cambiar producto.
- **Criterios:** comportamiento actual documentado, contrato claro y casos propios/asignados definidos.
- **Cierre (2026-11-22):** contrato en [`calendario-teclado.md`](calendario-teclado.md). En Mes/Semana el `EventCell` de día completo no tiene `role` ni `tabIndex`; Agenda usa un `td` con clic, y `useDialogFocus` no puede devolver el foco a un evento no enfocable. Sin cambios de producto.

### Fase 2 — Eventos enfocables y apertura por teclado

- [ ] Renderizar cada tarea como control accesible con foco visible.
- [ ] Abrir la ficha con Enter y Espacio, sin doble activación.
- [ ] Devolver el foco al evento que abrió la ficha.
- [ ] Cubrir Mes, Semana y Agenda, incluida una tarea de día completo.
- **Criterios:** teclado equivalente al ratón y sin regresiones en clic o toque.

### Fase 3 — Verificación y cierre

- [ ] Verificar una tarea propia y otra asignada a otra persona en edición y lectura.
- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** accesibilidad verificada, sin cambios funcionales ni publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Doble activación clic + teclado | La ficha se abre dos veces | Un solo manejador para activación y `preventDefault` en Espacio. |
| Foco atrapado o perdido al cerrar | La persona no sabe dónde está | Reutilizar `useDialogFocus` y probar el retorno al evento. |
| Eventos truncados sin nombre completo | Lector de pantalla incompleto | `aria-label` con título y estado; el texto visible sigue igual. |
| Cambiar la interacción de ratón | Regresión para quien usa puntero | Mantener `onSelectEvent` y el mismo diálogo. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** UI-12 entra desde el backlog por el fallo de foco de las tareas de día completo; quedan TASK-01 y DEV-01. Se empieza por el inventario de teclado y foco. Sin cambios de producto en esta apertura.
- 2026-11-22: **Fase 1 completada.** Inventario en [`calendario-teclado.md`](calendario-teclado.md): `EventCell` de Mes/Semana sin `role` ni `tabIndex`; Agenda con clic en `td`; el diálogo no puede devolver el foco a un evento no enfocable. Sin cambios de producto.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
