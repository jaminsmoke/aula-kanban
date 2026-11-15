# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** vacío · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** PER-02 se completó sin publicación con su línea base en [`miniaturas.md`](miniaturas.md). La cobertura MCP está en [`mcp-apps.md`](mcp-apps.md). PER-01B se completó y publicó en `1.1.28`; PER-03, MCP-05E, UI-03, UI-01, HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron; SYNC-01 se queda aquí como norma operativa.

---

## 2026-11-15 — SYNC-01 · Sincronizar el repositorio al cerrar cada roadmap

- Contexto: hay dos destinos distintos. El deploy en Sites lo hace Codex; el repositorio personal `jaminsmoke/aula-kanban` (usuario JaminSmoke) se actualiza con commits locales y un push al cerrar el roadmap. El push a GitHub no despliega en Sites.
- Decisión (2026-11-15): no pasa al roadmap; se ejecuta al cerrar cada roadmap y se conserva aquí como norma operativa. Los pushes intermedios consumen CI y cuota, así que no se usan para probar.
- Qué falta antes de retomarlo:
  - [ ] Tras cada bloque verificado: `git status`, checks y commit local; no hacer push.
  - [ ] Al cerrar el roadmap: actualizar `docs/changelog.md`, reiniciar `docs/roadmap.md` y hacer un único `git push github main`.
  - [ ] No cambiar la versión ni ejecutar `release:prepare` solo para sincronizar GitHub; la versión la fija la publicación.
  - [ ] Comprobar que no se cuelan secretos, `.env*`, `.dev.vars*` ni datos de producción.
- Notas técnicas: publicación y sincronización son operaciones distintas; el commit no sustituye al flujo de Sites.
