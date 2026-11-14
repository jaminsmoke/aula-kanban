# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** las entradas de esta primera revisión comparten fecha; se muestran en el orden en que se propusieron.

---

## 2026-11-14 — Separar `api/tasks` en servicio, permisos y ruta

- Contexto: `app/api/tasks/route.ts` mezcla autenticación, validación, permisos, SQL manual, concurrencia, decoración y respuestas HTTP. Es la ruta más compleja y no tiene test propio.
- Qué falta antes de retomarlo:
  - [ ] Tener las guardas HTTP comunes.
  - [ ] Extraer consultas y decoración a `lib/server/tasks/queries.ts`.
  - [ ] Extraer reglas de alumno/profesor/admin a `lib/server/tasks/permissions.ts`.
  - [ ] Extraer crear/editar/borrar a `lib/server/tasks/mutations.ts`.
  - [ ] Añadir tests de permisos y de conflicto de revisión.
- Notas técnicas: conservar el SQL de guarda y el `mutation_token`; el objetivo es moverlo, no reescribir la concurrencia.

## 2026-11-14 — Partir los componentes grandes

- Contexto: `blockly-app` (406 líneas), `whiteboard` (393), `task-dialog` (308), `calculator-panel` (300), `mermaid-app` (281) y `apps-store` (259) concentran demasiadas responsabilidades.
- Qué falta antes de retomarlo:
  - [ ] Terminar la reorganización de `app/board`.
  - [ ] Partir Blockly en `toolbox.ts`, `starter.ts`, `run-worker.ts`, `code-panel.tsx` y `use-blockly.ts`.
  - [ ] Partir Mermaid en `templates.ts`, `render.ts` y `use-mermaid-preview.ts`.
  - [ ] Partir la calculadora en motor, historial y teclado.
  - [ ] Partir `task-dialog` en formulario, responsables y pizarra.
  - [ ] Partir `apps-store` en filtros, tarjeta, detalle y éxito.
  - [ ] Extraer `use-whiteboard` de `whiteboard.tsx`.
- Notas técnicas: hacerlo de uno en uno, con tests después de cada división. No mezclar con cambios de diseño.

## 2026-11-14 — `edu-tools`: carga por pestañas y datos periódicos fuera del código

- Contexto: al abrir `edu-tools` se importan estáticamente la calculadora, la tabla periódica, TTS, regla y transportador. `periodic-data.ts` tiene 3.241 líneas y unos 62 KB.
- Qué falta antes de retomarlo:
  - [ ] Convertir `periodic-data.ts` en un JSON con tipos aparte.
  - [ ] Cargar la tabla periódica solo al abrir `Ciencias`.
  - [ ] Cargar TTS y medición solo al abrir sus pestañas.
  - [ ] Cargar el panel de ecuaciones solo al activar ese modo.
  - [ ] Medir el tamaño del chunk inicial de `edu-tools` antes y después.
- Notas técnicas: la app ya es lazy; esto reduce el coste de abrirla, no el del tablero. Mantener la calculadora como vista inicial sin lazy para que el primer uso sea inmediato.

## 2026-11-14 — Evaluar el peso de `compute-engine`

- Contexto: `@cortex-js/compute-engine` genera un chunk de 6,3 MB sin comprimir. Se carga al primer cálculo, no al abrir la app, pero puede ser muy lento en conexiones lentas.
- Qué falta antes de retomarlo:
  - [ ] Medir el tamaño gzip real y el tiempo de primera evaluación.
  - [ ] Confirmar qué operaciones necesita el aula: aritmética, fracciones, variables o simbólico.
  - [ ] Comparar con `mathjs` o un evaluador propio para el caso básico.
  - [ ] Si se mantiene, añadir estado de carga y precargar solo al entrar en Científica o Ecuaciones.
  - [ ] Revisar la versión duplicada que arrastra `mathlive` (`0.29.1` frente a `0.188.0`).
- Notas técnicas: no cambiar el motor sin probar los resultados exactos actuales. Es la optimización de mayor impacto, pero también la de mayor riesgo matemático.

## 2026-11-14 — Limpieza de tablas históricas tras verificar producción

- Contexto: `blockly_programs` y `mermaid_diagrams` siguen como respaldo de `app_documents`. La migración de esquema ya está publicada, pero la copia de datos es una operación aparte.
- Qué falta antes de retomarlo:
  - [ ] Comprobar en producción que los documentos de Blockly y Mermaid están en `app_documents`.
  - [ ] Ejecutar la copia idempotente si falta algún proyecto.
  - [ ] Mantener la lectura histórica durante al menos una versión publicada.
  - [ ] Eliminar las tablas, sus exports de esquema y el fallback en una migración posterior.
- Notas técnicas: no borrar las tablas hasta confirmar datos reales. El fallback actual evita pérdidas, pero no debe quedarse indefinidamente.

## 2026-11-14 — Detalles de rendimiento y acabado

- Contexto: quedan mejoras pequeñas que no justifican una fase propia.
- Qué falta antes de retomarlo:
  - [ ] Sustituir `lottie-react` y `check-lottie.json` por un check SVG/CSS; el chunk actual pesa unos 323 KB.
  - [ ] Cargar `docs.css` y los estilos de `Mi espacio`/tienda desde sus vistas lazy, no desde `layout.tsx`.
  - [ ] Revisar si las fuentes de Google se pueden servir desde el propio Site.
  - [ ] Revisar el CSS global que quede sin uso después de la reorganización.
- Notas técnicas: son cambios independientes; no mezclar con la reorganización ni con cambios funcionales.
