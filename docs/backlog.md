# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** MCP-05E activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** MCP-05E está en el roadmap activo. La cobertura está en [`mcp-apps.md`](mcp-apps.md). UI-03 se completó; UI-01, HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron; PER-01 sigue archivado con su trabajo pendiente abajo; SYNC-01 se queda aquí como norma operativa.

---

## 2026-11-15 — PER-03 · Purga segura de archivos sin uso

- Contexto: se ha verificado la subida de archivos, pero actualmente solo se limpian los objetos al eliminar su proyecto. Cambiar una miniatura o cancelar una subida no elimina necesariamente sus objetos. **La purga automática aún no está implementada.**
- Qué falta: inventariar cómo se referencian archivos desde tareas, pizarras, documentos y MCP; definir propiedad y referencias compartidas, subidas sin guardar y un periodo de gracia. Diseñar una limpieza reintentable que evite carreras entre creación, guardado y borrado; elegir un mecanismo de ejecución compatible con Sites. Implementar y probar antes de activar.
- Criterios mínimos: no borrar archivos compartidos, aún editándose o usados por otras aplicaciones; conservar metadatos hasta confirmar la eliminación, tolerar fallos y evitar que una nueva referencia apunte a un objeto en proceso de borrado. Probar concurrencia y recuperación además de los casos de sustitución, cancelación y eliminación.
- Notas técnicas: `uploads` guarda `purpose` y URL, pero no una relación completa de referencias. Hay URLs libres y estados JSON; deducir ausencia de uso solo de `tasks.image_url` o borrar inmediatamente sería inseguro. La automatización de tareas periódicas requiere soporte explícito; no prometer una purga temporal hasta verificarlo.

## 2026-11-15 — PER-01B · Inventario de R2 y copias antiguas

- Contexto: el 2026-11-15 la subida web y la lectura después de recargar funcionaron en producción; la prueba temporal se retiró y el panel mostraba 0 filas en `uploads`. El diagnóstico solo confirma que R2 responde, no que el bucket esté vacío.
- Qué falta: enumerar los objetos de R2 de forma paginada y protegida para administración, cotejarlos con D1, comprobar si existe alguna copia de archivos antiguos y documentar el destino de cada posible huérfano. No borrar objetos desconocidos sin identificarlos.
- El roadmap anterior se conserva íntegro en [`historial/roadmap-per-01.md`](historial/roadmap-per-01.md), incluidos el alcance y los criterios aún pendientes.

## 2026-11-15 — PER-02 · Evaluar miniaturas derivadas

- Contexto: PER-01 ha verificado la subida y lectura de imágenes originales en producción. Por ahora se conservan los originales para mantener simple la persistencia; no se ha incorporado un generador de miniaturas.
- Qué falta antes de retomarlo: medir el impacto real de imágenes grandes en el tablero, comparar procesamiento en cliente con un binding de imágenes disponible y decidir si merece la complejidad.
- Notas técnicas: respetar permisos, conservar el original y diseñar la limpieza de derivados sin afectar archivos existentes.

## 2026-11-15 — SYNC-01 · Sincronizar el repositorio al cerrar cada roadmap

- Contexto: hay dos destinos distintos. El deploy en Sites lo hace Codex; el repositorio personal `jaminsmoke/aula-kanban` (usuario JaminSmoke) se actualiza con commits locales y un push al cerrar el roadmap. El push a GitHub no despliega en Sites.
- Decisión (2026-11-15): no pasa al roadmap; se ejecuta al cerrar cada roadmap y se conserva aquí como norma operativa. Los pushes intermedios consumen CI y cuota, así que no se usan para probar.
- Qué falta antes de retomarlo:
  - [ ] Tras cada bloque verificado: `git status`, checks y commit local; no hacer push.
  - [ ] Al cerrar el roadmap: actualizar `docs/changelog.md`, reiniciar `docs/roadmap.md` y hacer un único `git push github main`.
  - [ ] No cambiar la versión ni ejecutar `release:prepare` solo para sincronizar GitHub; la versión la fija la publicación.
  - [ ] Comprobar que no se cuelan secretos, `.env*`, `.dev.vars*` ni datos de producción.
- Notas técnicas: publicación y sincronización son operaciones distintas; el commit no sustituye al flujo de Sites.
