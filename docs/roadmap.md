# Roadmap — ARCH-01 · Contratos de rutas y límites de capa

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** ARCH-01 — Contratos de rutas y límites de capa (sale del backlog).
> **Backlog:** PER-03, PER-01B, PER-02, UI-01, SYNC-01, MCP-05 y recortes de rendimiento (7 entradas). SYNC-01 se queda como norma operativa.
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** los commits se acumulan en local durante el roadmap; el push al repo personal `jaminsmoke/aula-kanban` se hace al cerrarlo y registrar su resumen en el changelog. Sites lo publica y verifica Codex de OpenAI. Un push no es una publicación.

---

## 1. Objetivo

- [ ] Extraer los helpers de ruta y separar el acceso de proyecto de sus respuestas HTTP sin cambiar el contrato observable.
- [ ] Criterio de éxito: los 24 handlers de `app/api` conservan códigos, mensajes, orden de guardas y permisos; los servicios dejan de importar mensajes de transporte; el arranque de proyectos sale de la ruta; tests, typecheck y build siguen en verde.

## 2. Alcance

**Dentro:**
- Extraer `withProjectRoute` y una mutación JSON reutilizable para las rutas que repiten resolución de proyecto, autenticación y guardas de origen/formato.
- Separar `project-access.ts` de `project-http.ts`: el acceso no debe construir respuestas ni importar `json`.
- Mover la migración de UUID, la sincronización de identidad y la limpieza de subidas huérfanas de `/api/projects` a un servicio idempotente.
- Cubrir el refactor con el contrato de sesión, permisos, errores y paridad HTTP ↔ MCP.

**Fuera de alcance:**
- Cambiar schemas, mensajes, códigos HTTP, permisos o el orden de las comprobaciones existentes.
- Mover carpetas fuera de `lib/server` ni cambiar rutas HTTP.
- Rediseñar la lógica de proyectos, tareas o personas.
- Convertir cada ruta en una abstracción genérica que oculte validaciones específicas.
- Tocar las herramientas MCP o el catálogo.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Extraer helpers solo para patrones repetidos y dejar las validaciones propias en cada ruta | Un middleware único para todas las rutas | Evita esconder guardas específicas y conservar el orden exacto del contrato. |
| Separar `project-http.ts` de `project-access.ts` | Mantener `json` y los mensajes dentro del acceso | Rompe la dependencia de los servicios hacia el transporte y permite testear el acceso sin HTTP. |
| Extraer el arranque de `/api/projects` a un servicio idempotente | Duplicarlo en `listVisibleProjects` o en MCP | Una sola operación para web y futuras rutas, sin repetir migración, identidad y limpieza. |
| Migrar por grupos de rutas con commits por fase | Refactor masivo en un solo cambio | Reduce el riesgo y permite comparar el contrato después de cada grupo. |

## 4. Fases

### Fase 1 — Helpers de ruta

- [x] Inventariar los 24 handlers y fijar el orden exacto de autenticación, origen, formato, resolución de proyecto y permisos.
- [x] Añadir `withJsonMutation` para las mutaciones que comparten origen y JSON.
- [x] Añadir `withProjectRoute` para las rutas que resuelven proyecto y acceso, sin absorber validaciones propias.
- [x] Migrar tareas, pizarras, documentos de apps, miembros, alumnado/profesorado (lectura), space-apps, proyectos (mutaciones), administradores e invitaciones.
- [x] Añadir pruebas del orden de guardas y de la traducción de fallos del proyecto.
- **Criterios de aceptación:** los códigos y mensajes 401/400/403/404/415 no cambian; las rutas que no usan proyecto no se fuerzan al helper; tests focalizados en verde.

### Fase 2 — Acceso separado de HTTP

- [ ] Crear `lib/server/project-http.ts` con `PROJECT_FAILURE_RESPONSES` y `projectFailureResponse`.
- [ ] Dejar `project-access.ts` sin imports de `json` ni construcción de respuestas.
- [ ] Retirar de `projects.ts` y de los servicios la dependencia de mensajes de transporte.
- [ ] Actualizar imports y pruebas de acceso sin cambiar los mensajes públicos.
- **Criterios de aceptación:** `project-access.ts` no importa `http.ts`; los servicios no conocen códigos HTTP; el contrato de errores sigue idéntico.

### Fase 3 — Arranque de proyectos

- [ ] Extraer de `/api/projects` la migración de UUID, la actualización de identidad y la limpieza de subidas huérfanas.
- [ ] Encapsularlas en un servicio idempotente que conserve el 503 de la migración y el carácter best-effort de la limpieza.
- [ ] Mantener el orden y el resultado del `GET`: proyectos visibles, rol, `isOwner`, `isAdmin` y `legacyProjectId`.
- [ ] Probar ejecución repetida, fallo de migración y fallo de limpieza.
- **Criterios de aceptación:** el `GET` queda como envoltura del servicio; no se duplica lógica en MCP; la respuesta pública no cambia.

### Fase 4 — Contrato y cierre

- [ ] Ejecutar el contrato de sesión, permisos, errores y paridad HTTP ↔ MCP.
- [ ] Ejecutar la suite completa, typecheck, lint y build.
- [ ] Registrar el cierre en el changelog y reiniciar el roadmap desde la plantilla.
- **Criterios de aceptación:** 401/403/404/400/415/409 conservan su contrato; no hay regresiones de permisos; el push de cierre se hace una sola vez.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambia el orden de las guardas | Respuestas distintas ante varias condiciones | Inventario previo y tests de contrato por ruta. |
| El helper oculta una validación específica | Pérdida de permisos o mensajes | Dejar las reglas propias en la ruta; el helper solo resuelve lo común. |
| El acceso sigue importando transporte | Dependencia circular o capa mezclada | `project-http.ts` separado y comprobación de imports. |
| El arranque se ejecuta dos veces | Migración o limpieza duplicadas | Servicio idempotente y prueba de ejecución repetida. |
| El refactor se mezcla con cambios funcionales | Regresión difícil de aislar | Fases por grupo y commits locales por fase. |

## 6. Notas de sesión

- ARCH-01 sale del backlog el 2026-11-15. El backlog decía `lib/server/project.ts`; el archivo actual es `project-access.ts`.
- Punto de partida: 15 `route.ts`, 24 handlers y helpers repetidos en `http.ts`, `project-access.ts` y `projects.ts`.
- `project-access.ts` importa `json` y contiene `PROJECT_FAILURE_RESPONSES`; `projects.ts` importa `PROJECT_FAILURE_RESPONSES`.
- `/api/projects` ejecuta en el `GET` la migración de UUID, la actualización de identidad y la limpieza de huérfanos.
- Fase 1 completada el 2026-11-15: `lib/server/route-helpers.ts` concentra `withJsonMutation` y `withProjectRoute`; la composición mantiene origen/JSON antes de resolver el proyecto.
- Quedan sin helper por su orden propio `uploads` (solo origen), `files` (lee R2 antes de resolver), `mcp/tokens` (autentica antes de origen) y las mutaciones de alumnado/profesorado, que viven en sus servicios; se decidirán en las fases siguientes.
- Cada fase se cierra con su propio commit local, incluidas las fases de solo documentación; no se hace push hasta cerrar el roadmap.
- No se cambia la versión ni se publica en Sites durante este roadmap.
