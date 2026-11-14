# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** las entradas de esta primera revisión comparten fecha; se muestran en el orden en que se propusieron.

---

## 2026-11-14 — Detalles de rendimiento y acabado

- Contexto: quedan mejoras pequeñas que no justifican una fase propia.
- Qué falta antes de retomarlo:
  - [ ] Sustituir `lottie-react` y `check-lottie.json` por un check SVG/CSS; el chunk actual pesa unos 323 KB.
  - [ ] Cargar `docs.css` y los estilos de `Mi espacio`/tienda desde sus vistas lazy, no desde `layout.tsx`.
  - [ ] Revisar si las fuentes de Google se pueden servir desde el propio Site.
  - [ ] Revisar el CSS global que quede sin uso después de la reorganización.
- Notas técnicas: son cambios independientes; no mezclar con la reorganización ni con cambios funcionales.
