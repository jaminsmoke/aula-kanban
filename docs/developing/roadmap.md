# Roadmap TASK-03 — Avisar antes de descartar cambios en una tarea

> **Estado:** Activo (2026-11-22) · **Origen:** TASK-03 del backlog
> **Backlog:** 10 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Detectar cambios pendientes en la ficha editable de una tarea.
- [ ] Pedir confirmación antes de cerrar con cambios sin guardar, por Esc, botón de cierre o Cancelar.
- [ ] Ofrecer **Seguir editando** conservando el borrador y **Descartar cambios** para cerrar.
- [ ] Cerrar directamente una ficha intacta, recién guardada o de solo lectura.
- [ ] Criterio de éxito: ningún cambio escrito por accidente se pierde sin una decisión explícita, y el flujo normal de crear o guardar no añade pasos.

## 2. Alcance

**Dentro:**

- Ficha de tarea nueva y existente en edición.
- Campos del resumen, responsables, fecha, prioridad, estado, imagen y documento.
- Esc, botón X de la ventana y botón Cancelar.
- Conservación del borrador mientras se muestra la confirmación.
- Foco y anuncio accesible de la confirmación.
- Cierre directo de una ficha intacta, guardada o en solo lectura.

**Fuera:**

- Cambios de modelo, API, permisos o datos.
- Autoguardado de tareas.
- Confirmar al cerrar la pestaña o el navegador (`beforeunload`).
- Cambiar el diálogo de eliminación ni la pizarra de la tarea.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Comparar el formulario actual con una instantánea tomada al abrir | Mantener un booleano `dirty` que se activa en cada cambio | La comparación vuelve a limpio si se deshace el cambio y no se desincroniza con el formulario. |
| Resolver la confirmación dentro de `TaskDialog` | Usar `window.confirm` | Permite conservar el borrador, controlar el foco y usar el mismo patrón accesible del resto del producto. |
| Interceptar Esc, X y Cancelar en un único cierre guardado | Parchear cada botón por separado | Los tres caminos deben compartir la misma decisión y el mismo texto. |
| Mantener el formulario montado mientras se confirma | Cerrar el modal y reabrirlo después | Evita perder el borrador y el foco de origen. |
| No mostrar confirmación si el formulario coincide con la instantánea | Mostrarla siempre por si acaso | Una ficha intacta o guardada debe cerrarse sin fricción. |
| No interceptar el cierre de solo lectura | Aplicar la guarda a cualquier detalle | En lectura no hay un borrador que perder. |

## 4. Punto de partida

- `TaskDialog` recibe `form` y `onClose`; el botón X de `Modal`, Esc (`onCancel`) y Cancelar llaman a `onClose` sin comprobar nada.
- `Board` cierra la ficha con `board.setEditor(null)` tras `onClose`.
- `useTasks` crea el formulario con `blank` o con la tarea abierta y lo actualiza con `onForm`.
- No existe una instantánea del formulario inicial ni una confirmación de descarte.
- El guardado y la eliminación cierran por su propio flujo; no deben pasar por la confirmación de descarte.
- Baseline: arquitectura **462 archivos / 1.160 imports**; suite **269 archivos / 1.802 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Instantánea y detección de cambios

- [ ] Fijar la instantánea del formulario al abrir una tarea nueva o existente.
- [ ] Comparar todos los campos editables y responsables con esa instantánea.
- [ ] Distinguir ficha intacta, cambio real y cambio deshecho.
- [ ] Mantener el borrador y el foco mientras la confirmación está abierta.
- **Criterios:** una ficha sin tocar cierra directamente; cualquier cambio real activa la guarda; volver al valor inicial la desactiva.

### Fase 2 — Confirmación y cierre protegido

- [ ] Añadir la confirmación con **Seguir editando** y **Descartar cambios**.
- [ ] Interceptar Esc, X y Cancelar con la misma guarda.
- [ ] **Seguir editando** conserva el borrador y devuelve el foco al formulario.
- [ ] **Descartar cambios** cierra y limpia el editor como hasta ahora.
- [ ] No mostrar la guarda en solo lectura, durante el guardado ni tras un guardado correcto.
- **Criterios:** los tres caminos de cierre piden decisión solo con cambios; cancelar la decisión no modifica datos ni borrador.

### Fase 3 — Pruebas de regresión y accesibilidad

- [ ] Cubrir tarea nueva, tarea existente, título, descripción, fecha, prioridad, estado, responsables, imagen y documento.
- [ ] Probar Esc, X, Cancelar, Seguir editando y Descartar cambios.
- [ ] Comprobar ficha intacta, cambio deshecho, guardado correcto y detalle de solo lectura.
- [ ] Verificar anuncio accesible, foco y ausencia de dobles confirmaciones.
- **Criterios:** cada cierre tiene un resultado observable y no quedan cambios perdidos en los casos cubiertos.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Falsos positivos por objetos o arrays nuevos | Aviso en fichas intactas | Comparación estable de campos y responsables. |
| Pérdida del borrador al mostrar la confirmación | El aviso empeora el problema | Mantener `TaskDialog` y `form` montados; no cerrar hasta descartar. |
| Doble cierre por Esc y botón | Dos confirmaciones o cierre inesperado | Un solo estado de confirmación y una única llamada a `onClose` al descartar. |
| Guardado o eliminación interceptados | El usuario no puede terminar la acción | Excluir los flujos de guardado, eliminación y solo lectura. |
| Foco atrapado en la confirmación | Mala experiencia de teclado | Devolver el foco al formulario al seguir editando y al control de origen al cerrar. |
| Confundir la pizarra con el formulario | Avisos que no corresponden | Mantener fuera del alcance la edición de la pizarra. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** TASK-03 entra desde el backlog por la pérdida de cambios al pulsar Esc en la prueba local de `1.1.41`.
- El backlog queda con **10 entradas**: TASK-04, PERM-04, UI-15, UI-16, TASK-05, PER-09, UI-13, UI-14, PERM-03 y DEV-01.
- Sin cambios de producto en esta apertura.
