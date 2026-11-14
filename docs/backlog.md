# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 3 entradas

---

## 2026-11-14 — Separar la sesión de whiteboard y agrupar `shared/whiteboard`

- Contexto: `app/board/shared` mezcla datos del tablero (`api.ts`, `model.ts`, `use-board-data.ts`) con la pizarra (`whiteboard.tsx`, `whiteboard-canvas.tsx`, `whiteboard-model.ts`, `use-whiteboard.ts` y `whiteboard.css`). `use-whiteboard.ts` tiene 307 líneas y reúne carga, guardado, conflictos, socket, presencia, polling y handlers de Excalidraw. El chunk de la pizarra es grande pero ya es lazy.
- Qué falta antes de retomarlo:
  - [ ] Definir la fachada pública que seguirán usando tareas, proyectos, Mi espacio y la app Excalidraw.
  - [ ] Separar persistencia y presencia/socket sin cambiar el comportamiento en tiempo real.
  - [ ] Mantener las pruebas de guardado, conflicto, merge, reconexión y presencia.
- Notas técnicas: crear `app/board/shared/whiteboard/` y mover allí los archivos de la pizarra; conservar `whiteboard.tsx` como punto de entrada. No tocar API, base de datos ni UI. Mantener `SAVE_DEBOUNCE_MS`, merge por versión/nonce y el polling como fallback. Es la entrada de mayor valor y también la de más cuidado.

## 2026-11-14 — Normalizar la jerarquía de personas

- Contexto: `app/board/people/teachers/` tiene carpeta propia, pero los alumnos están sueltos en `people/`: `students-view`, `student-dialogs`, `use-students` y sus tests. La asimetría dificulta saber qué es compartido y qué pertenece a cada colectivo.
- Qué falta antes de retomarlo:
  - [ ] Mover los archivos exclusivos de alumnos a `people/students/`.
  - [ ] Actualizar imports y tests.
  - [ ] Mantener en `people/` los archivos compartidos (`profile-card`, `profile-detail`, `people.css`).
- Notas técnicas: cambio de bajo riesgo y sin cambios de comportamiento. Revisar imports desde `Board` y desde `people/teachers` para no crear dependencias cruzadas.

## 2026-11-14 — Extraer la herramienta Medir de EduTools

- Contexto: `edu-tools-app.tsx` tiene 274 líneas y mezcla el shell de pestañas, la carga de ciencias y lectura, y toda la lógica de regla y transportador: rotación, medición, punteros, tamaño y atajos. La app funciona, pero esa vista tiene responsabilidades propias.
- Qué falta antes de retomarlo:
  - [ ] Extraer `MeasureTools` y su hook de medición.
  - [ ] Dejar `edu-tools-app.tsx` como shell de pestañas y vistas lazy.
  - [ ] Cubrir regla, transportador y teclado con tests.
- Notas técnicas: no reorganizar todavía toda la carpeta `edu-tools` en subcarpetas; los prefijos actuales son consistentes. Mantener `PX_PER_CM`, `PX_PER_INCH`, la rotación con Shift y los atajos Alt+1…4. Sin cambios visuales ni de comportamiento.
