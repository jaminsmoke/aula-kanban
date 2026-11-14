# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** las entradas de esta primera revisión comparten fecha; se muestran en el orden en que se propusieron.

---

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
