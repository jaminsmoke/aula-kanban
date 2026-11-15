# Roadmap — ARCH-02 · Dividir los módulos grandes restantes

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** ARCH-02 — Dividir los módulos grandes restantes (sale del backlog).
> **Backlog:** PER-03, PER-01B, PER-02, UI-01, ARCH-01, SYNC-01, MCP-05 y recortes de rendimiento (8 entradas). SYNC-01 se queda como norma operativa.
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** los commits y el push van al repo personal `jaminsmoke/aula-kanban`; Sites lo publica y verifica Codex de OpenAI. Un push no es una publicación.

---

## 1. Objetivo

- [ ] Dividir los tres módulos grandes restantes sin cambiar comportamiento, contratos, catálogo ni orden de herramientas.
- [ ] Criterio de éxito: `tareas.ts`, `personas.ts` y `oauth/service.ts` quedan en unidades cohesivas con barrels que conservan sus exports públicos; tipos, tests, snapshots, paridad HTTP ↔ MCP y build siguen en verde.

## 2. Alcance

**Dentro:**
- Dividir `lib/server/mcp/dominios/tareas.ts` en lectura, escritura, filtros y piezas compartidas, conservando `herramientasTareas`.
- Dividir `lib/server/mcp/dominios/personas.ts` en alumnado, profesorado, invitaciones y piezas compartidas, conservando `herramientasPersonas`.
- Dividir `lib/server/oauth/service.ts` en clientes, códigos, tokens, utilidades criptográficas y tipos, conservando la interfaz `Db` y los exports públicos.
- Mantener los imports existentes mediante barrels (`index.ts` o un `service.ts` reexportador).
- Verificar cada fase con sus tests focalizados y la suite completa al cerrar.

**Fuera de alcance:**
- Cambiar schemas, mensajes, códigos HTTP, permisos, orden de herramientas o comportamiento.
- Tocar `mcp-catalogo.ts` y `mcp-descripciones.ts`, que son fuentes de verdad/generadas.
- Mover carpetas fuera de `lib/server` ni cambiar rutas HTTP.
- Rediseñar la lógica de MCP u OAuth; esto es una división mecánica.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Crear una carpeta por dominio y un `index.ts` que reexporte | Cambiar todos los imports a archivos internos | Conserva los puntos de entrada y reduce el riesgo del refactor. |
| Mantener los arrays de herramientas en el barrel, en el mismo orden | Repartir el array entre archivos | Evita cambios en `tools/list`, snapshots y paridad. |
| Extraer solo helpers realmente compartidos | Duplicar schemas y utilidades para no tocar imports | Evita dos fuentes de verdad y mantiene la cohesión. |
| Dejar `section-art.tsx` como fase opcional | Incluirlo obligatoriamente por tamaño | Tiene 415 líneas y puede ser más cohesivo de lo que sugiere el número; se decide con el código delante. |

## 4. Fases

### Fase 1 — Tareas MCP

- [x] Crear `lib/server/mcp/dominios/tareas/` con `comun.ts`, `filtros.ts`, `lectura.ts`, `escritura.ts` e `index.ts`.
- [x] Mover schemas, decoración, filtros y helpers sin cambiar su comportamiento.
- [x] Mantener `herramientasTareas` en `index.ts` con el mismo orden y los mismos nombres.
- [x] Ejecutar los tests focalizados de tareas, catálogo, paridad y snapshots.
- **Criterios de aceptación:** ningún import externo cambia; el catálogo y el orden de herramientas son idénticos; los tests de MCP pasan.

### Fase 2 — Personas MCP

- [x] Crear `lib/server/mcp/dominios/personas/` con `comun.ts`, `alumnado.ts`, `profesorado.ts`, `invitaciones.ts` e `index.ts`.
- [x] Separar las fichas de alumnado, profesorado y la gestión de miembros/invitaciones.
- [x] Mantener `herramientasPersonas` en `index.ts` con el mismo orden y exports.
- [x] Ejecutar los tests de personas, miembros, catálogo, paridad y snapshots.
- **Criterios de aceptación:** los contratos de alumnado, profesorado e invitaciones no cambian; no quedan helpers duplicados; los tests pasan.

### Fase 3 — OAuth

- [ ] Crear `lib/server/oauth/` con `types.ts`, `cripto.ts`, `clientes.ts`, `codigos.ts`, `tokens.ts` y un `service.ts` reexportador.
- [ ] Mantener `Db`, constantes, tipos y funciones públicas con la misma firma.
- [ ] Conservar las transacciones, TTL, validaciones PKCE y errores actuales.
- [ ] Ejecutar `lib/server/oauth/service.test.ts`, los tests de auth/MCP y el typecheck.
- **Criterios de aceptación:** las rutas OAuth no cambian; los tokens, códigos y revocaciones se comportan igual; los tests pasan.

### Fase 4 — Ilustraciones de documentación (opcional)

- [ ] Revisar `app/board/docs/illustrations/section-art.tsx` y decidir si agruparlo por familias mejora la cohesión.
- [ ] Si no hay una ganancia clara, documentar la decisión y no dividirlo.
- **Criterios de aceptación:** la decisión queda registrada y no se parte un archivo solo por número de líneas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambia el orden de `tools/list` | Snapshots y paridad fallan | Mantener los arrays en el barrel y comparar el catálogo antes/después. |
| Aparecen imports circulares | El build o los tests fallan | Extraer dependencias compartidas a `comun.ts`/`types.ts` y validar con typecheck. |
| Se duplican schemas o mensajes | Deriva de contrato | Una sola fuente por helper; no copiar validaciones entre archivos. |
| El refactor mezcla comportamiento | Regresión funcional | Fases por dominio y tests focalizados antes de pasar a la siguiente. |

## 6. Notas de sesión

- ARCH-02 sale del backlog el 2026-11-15. La parte de `content.ts` ya se completó en HIER-01 y se retiró del alcance.
- Tamaños de partida: `tareas.ts` 700 líneas, `personas.ts` 523 y `oauth/service.ts` 499.
- Fase 1 completada el 2026-11-15: el dominio queda en `comun.ts` (102), `filtros.ts` (89), `lectura.ts` (89), `escritura.ts` (276) e `index.ts` (181); `herramientasTareas` conserva nombres y orden.
- Fase 2 completada el 2026-11-15: personas queda en `comun.ts` (102), `alumnado.ts` (121), `profesorado.ts` (120), `invitaciones.ts` (68) e `index.ts` (205); `herramientasPersonas` conserva nombres y orden.
- Verificación local: `npm run lint`, `npx tsc --noEmit`, `npm test` (90 archivos / 751 tests) y `npm run build` en verde.
- Existen pruebas de MCP (`catalogo`, `matriz`, `paridad`, `reads`, `writes`) y de OAuth (`service.test.ts`) que sirven de red de seguridad.
- No se cambia la versión ni se publica en Sites durante este roadmap.
