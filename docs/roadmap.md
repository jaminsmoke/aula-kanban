# Roadmap — HIER-01 · Reorganización mínima de la jerarquía

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** HIER-01 — Reorganización mínima de la jerarquía (sale del backlog).
> **Backlog:** UI-02, PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, CI-01, SYNC-01, MCP-05 y recortes de rendimiento (11 entradas). SYNC-01 se queda como norma operativa, no como fase.
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** los commits y el push van al repo personal `jaminsmoke/aula-kanban`; Sites lo publica y verifica Codex de OpenAI. Un push no es una publicación.

---

## 1. Objetivo

- [ ] Reducir la sobrecarga de los focos detectados sin cambiar rutas, contratos, textos ni comportamiento.
- [ ] Criterio de éxito: los cinco movimientos acordados están hechos —o descartados con motivo en `tasks/dialog`—, los imports y exports siguen siendo válidos y pasan tests, lint, `tsc` y build.

## 2. Alcance

**Dentro:**
- `app/board/docs/content.ts` → `app/board/docs/content/`.
- `app/board/apps/edu-tools/` → subcarpetas por herramienta.
- `app/board/tasks/dialog/`, si la cohesión lo justifica.
- `app/modal.tsx` → `app/board/shared/modal.tsx`.
- `lib/server/project.ts` → `lib/server/project-access.ts`.

**Fuera de alcance:**
- Reorganización global de `app/` o `lib/`.
- `app/api`, `app/oauth`, `app/.well-known`, `db/`, `worker/`, `scripts/` y `examples/`.
- Cambios de comportamiento, contrato HTTP, esquema, almacenamiento o textos.
- Publicación o cambio de versión.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mantener la estructura feature-first | Mudanza global por tipos | La dirección `app → lib → db` ya es correcta y los focos son locales. |
| `app/board/shared/modal.tsx` | Nuevo `components/` genérico | Solo lo usan diálogos del tablero; un nivel nuevo no aporta. |
| `lib/server/project-access.ts` | Mantener `project.ts` | Evita confundirlo con `projects.ts`, que gestiona el ciclo de vida. |
| `tasks/dialog/` solo si agrupa diálogo, formulario, detalle y pizarra | Mover todo `tasks/` | El tablero y las tarjetas deben seguir en la raíz de la feature. |
| Movimientos por bloques verificables | Una mudanza única | Permite revisar imports y tests antes de seguir. |

## 4. Fases

### Fase 1 — Contenido de documentación

- [ ] Crear `app/board/docs/content/`.
- [ ] Agrupar `content.ts` por bloques cohesivos (inicio/roles, personas/proyectos, tareas/calendario, espacio/MCP, enlaces/ayuda), no un archivo por sección.
- [ ] Mantener en `content/index.ts` los exports `docSections`, `docSectionIds`, `docsHero`, `docAnchor` y los tipos usados por la vista.
- [ ] Conservar el orden de `docSectionIds` y el contenido exacto de cada bloque.
- **Criterios de aceptación:** `docs-view`, `content-coverage` y el build pasan; la ayuda muestra las mismas secciones, anclas e ilustraciones.

### Fase 2 — Herramientas de aula

- [ ] Crear `calculator/` y mover calculadora, historial, teclado, panel, ecuaciones y evaluación.
- [ ] Crear `periodic-table/` y mover tabla, datos, estilos, tipos y modelo de Bohr.
- [ ] Crear `tools/` y mover lectura en voz alta y medición con su hook.
- [ ] Actualizar imports, `lazy()` y el test de la app; no convertir cargas diferidas en eager.
- **Criterios de aceptación:** las cuatro pestañas funcionan, los tests pasan y el build no incorpora las librerías pesadas al chunk de entrada.

### Fase 3 — Diálogo, modal y acceso a proyecto

- [ ] Evaluar `app/board/tasks/dialog/`; si se crea, mover diálogo, formulario, detalle, pizarra, campos de responsables, utilidades, CSS y test, dejando tablero y tarjetas fuera.
- [ ] Mover `app/modal.tsx` a `app/board/shared/modal.tsx` y actualizar sus cinco imports y su test.
- [ ] Renombrar `lib/server/project.ts` a `lib/server/project-access.ts` y actualizar todos sus imports.
- **Criterios de aceptación:** no quedan imports rotos; pasan los tests de tareas, modal, proyectos y MCP; lint, `tsc` y build en verde.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Imports relativos rotos al mover archivos | Tests o build fallan | Mover por bloques y ejecutar `tsc` y los tests afectados antes del siguiente. |
| `content.ts` se divide en demasiados archivos | Peor navegación que ahora | Agrupar por temas, no por sección; mantener un `index.ts` como API. |
| Cargas diferidas de `edu-tools` pasan a eager | Aumenta el chunk de entrada | Revisar `lazy()` y el build tras la mudanza. |
| `tasks/dialog/` no aporta cohesión | Un nivel nuevo sin beneficio | Decidir con los imports reales; si no, documentar el descarte. |
| El renombrado de `project.ts` toca MCP y permisos | Regresión transversal | Cambio mecánico, revisar todos los imports y ejecutar la suite. |

## 6. Notas de sesión

- HIER-01 sale del backlog el 2026-11-15. SYNC-01 no entra al roadmap: se ejecuta tras cada bloque y se conserva como norma operativa.
- Línea base: 335 archivos de código; `app` 219/17.761 líneas y `lib` 87/10.745.
- No se ha movido ningún archivo todavía. Cada fase se cierra con commit y push al repo personal; la publicación en Sites la hará Codex cuando corresponda.
