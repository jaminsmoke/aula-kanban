# Roadmap ARC-06 — Mapa de servidor, API y deuda residual

> **Estado:** Activo · **Origen:** ARC-06 del backlog (2026-11-20)
> **Backlog:** ADOC-16 a ADOC-20, UI-11 y DEV-01 (7 entradas) · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Clasificar `lib/server` en dominio, repositorios D1/R2, servicios y helpers HTTP.
- [ ] Revisar `app/api` para que las rutas solo analicen, autoricen, deleguen y respondan.
- [ ] Auditar cuotas, purgas, almacenamiento y migraciones para que cada regla tenga un único hogar.
- [ ] Eliminar helpers y rutas sin consumidores, actualizando el baseline de código muerto.
- [ ] Documentar dónde vive cada regla y cómo se prueba.
- [ ] Criterio de éxito: una regla de servidor tiene un único hogar, las rutas no duplican reglas y `lib/server` no importa `app`.

## 2. Alcance

**Dentro:**

- Inventario de `lib/server` y `app/api` por responsabilidad, consumidor y prueba.
- Mapa de accesos D1/R2, límites de cuota, purgas, inventario y migraciones.
- Separación de reglas puras, servicios, repositorios y helpers HTTP.
- Rutas API finas con contratos de entrada, salida y error estables.
- Retirada de helpers, exports y rutas sin consumidores, con baseline explícito.
- Pruebas de dominio, contratos de ruta y límites de almacenamiento.
- Documentación, changelog y cierre.

**Fuera:**

- Cambiar URLs, códigos de estado, permisos, datos o textos de producto.
- Cambiar la versión del Site, publicar o aplicar migraciones remotas.
- Rehacer la UI, el CSS o las apps de ARC-02/ARC-04.
- Sustituir D1, R2, Drizzle o el framework de rutas.
- Fusionar servicios solo por tamaño o por proximidad de nombre.
- Añadir dependencias de análisis si los checks locales cubren el caso.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mapa antes de mover código | Reorganizar por intuición | Sin consumidores y contratos claros, el movimiento crea ciclos y duplicación. |
| Reglas puras en `lib/domain` | Meter todo en `lib/server` | El dominio debe probarse sin D1, R2, HTTP ni React. |
| Repositorios D1/R2 separados de servicios | Acceso a datos dentro de rutas | Una regla de persistencia debe tener un solo lugar. |
| Rutas API como adaptadores | Validar y decidir en cada `route.ts` | Las rutas solo orquestan; los contratos se prueban aparte. |
| Compatibilidad MCP explícita | Borrar fachadas por no tener consumidor estático | `reads.ts`, `writes.ts` y conectores pueden ser API pública; se revisan con baseline. |
| Cambios por dominio y consumidor | Refactor masivo de 139 archivos | Permite verificar una regla cada vez y conservar el comportamiento. |
| Baseline de código muerto con dueño | Ignorar exports sin consumidores | La deuda debe ser visible, finita y reducible. |
| Sin migraciones remotas | Probar migraciones contra producción | Este roadmap no publica ni toca datos reales. |

## 4. Punto de partida

Medición del 2026-11-20 al abrir ARC-06:

- `lib/server`: **139 archivos / 14.227 líneas**.
- `app/api`: **52 archivos / 4.188 líneas**.
- Estructura visible: `lib/server/{mcp,oauth,people,tasks,uploads}` más módulos sueltos de autenticación, almacenamiento, proyectos y documentos.
- `app/api` agrupa 19 dominios de ruta, incluidos `aula-documentos`, `books`, `storage`, `uploads`, `mcp` y `oauth`.
- Arquitectura: **396 archivos de producto / 988 imports / 0 violaciones / 0 ciclos**.
- Suite: **237 archivos / 1.607 pruebas**.
- Código muerto: **0 huérfanos / 0 dependencias sin uso** en el checker; **51 exports** en el baseline.
- Presupuestos: **7 apps / 12 flujos**; el Site sigue en `1.1.37`.
- `lib/server` ya tiene prohibido importar `app`; el reto es ordenar responsabilidades, no corregir esa dirección.

## 5. Fases

### Fase 1 — Inventario y contrato del servidor

- [x] Inventariar `lib/server` y `app/api` por dominio, responsabilidad, consumidor y prueba.
- [x] Identificar reglas duplicadas entre rutas, servicios, MCP y almacenamiento.
- [x] Mapear accesos D1/R2, cuotas, purgas, inventario y migraciones.
- [x] Definir qué es dominio, repositorio, servicio y helper HTTP.
- [x] Documentar el mapa y los límites en `docs/developing/server-map.md`.
- **Criterios:** cada archivo tiene una clasificación provisional y un consumidor conocido; no se mueve código todavía.
- **Cierre (2026-11-20):** 89 módulos de producto y 26 rutas clasificados; 0 archivos sin consumidor de producto salvo las fachadas MCP `reads.ts` y `writes.ts`; sin cambios de código.

### Fase 2 — Adaptadores API finos

- [ ] Revisar cada ruta para que solo analice, autorice, delegue y responda.
- [ ] Extraer validaciones, respuestas y reglas repetidas a servicios o helpers con dos consumidores reales.
- [ ] Unificar contratos de error y códigos de estado sin cambiar el comportamiento observable.
- [ ] Añadir pruebas de contrato para rutas con lógica propia.
- **Criterios:** ninguna ruta decide una regla de negocio; no hay validación duplicada ni cambios de URLs, permisos o respuestas.
- **Avance (2026-11-20):** el adaptador HTTP de alumnado y profesorado se movió de `lib/server/people/*` a `app/api/students` y `app/api/teachers`; los servicios ya no reciben `Request` ni devuelven `Response`. La paridad MCP ↔ HTTP sigue en verde (19 pruebas).
- **Avance (2026-11-20):** `api/members` y `api/space-apps` reciben pruebas de contrato (auth, permisos, validación, códigos y cuerpos). La cobertura propia de rutas sube de 21 a 23 de 26; solo `api/projects` queda sin prueba dedicada.
- **Avance (2026-11-20):** `storageUnavailable()` en `lib/server/http.ts` devuelve el único 503 de almacenamiento con un solo mensaje; `books/[id]/*`, `files/[id]`, copias, subidas, inventario y purga dejan de fabricar su propia respuesta.
- **Avance (2026-11-20):** `tasks/service.ts` reúne listado, alta, edición y baja de tareas con revisión, permisos y decoración; `api/tasks` baja de 76 a 46 líneas y ya no consulta D1. `taskAtRevision` y `taskWriteDenial` quedan en `tasks/queries.ts` y `tasks/permissions.ts`.
- **Avance (2026-11-20):** ninguna ruta de `app/api` importa `resolveProject`. Las siete rutas manuales usan `withProjectRoute`; `files/[id]` y `aula-documentos/copies/[id]` usan `withResourceProject`, que resuelve el ámbito desde el objeto guardado. `route-helpers.ts` admite rutas con `params` sin cambiar a los consumidores existentes.

### Fase 3 — Repositorios, servicios y dominio

- [ ] Separar repositorios D1/R2, servicios de aplicación y reglas puras por dominio.
- [ ] Reducir los módulos sueltos de `lib/server` a responsabilidades reconocibles.
- [ ] Mantener o documentar las fachadas públicas de MCP y conectores.
- [ ] Actualizar el baseline de código muerto al retirar helpers sin consumidores.
- [ ] Añadir pruebas en las nuevas fronteras y conservar la cobertura existente.
- **Criterios:** cada regla tiene un hogar; sin ciclos nuevos; `lib/server` no importa `app`; los tests de dominio no necesitan D1/R2.

### Fase 4 — Cuotas, purgas, almacenamiento y migraciones

- [ ] Auditar límites de almacenamiento, cuotas, inventario, purgas y recursos huérfanos.
- [ ] Unificar la fuente de cada límite y su validación en API y MCP.
- [ ] Revisar migraciones locales, rollback y datos anteriores sin tocar producción.
- [ ] Probar idempotencia de purgas y recuperación ante fallos parciales.
- **Criterios:** cada límite y purga tiene un único hogar, pruebas de borde y ninguna migración remota.

### Fase 5 — Cierre

- [ ] Verificar que el mapa, las rutas y los helpers no dejan deuda sin dueño.
- [ ] Revisar que los checks locales no dependen de MCP ni rutas externas.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- **Criterios:** una regla tiene un hogar, la suite y CI pasan, no hay cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Mover código sin mapa | Ciclos y reglas duplicadas | Fase 1 cerrada antes de refactorizar. |
| Cambiar una respuesta HTTP | Romper clientes o tests | Contratos de ruta y comportamiento observable congelado. |
| Duplicar límites de cuota | Purga o cuota incoherente | Una fuente por límite y pruebas en API/MCP. |
| Borrar una API pública | Romper consumidores externos | Baseline y revisión de conectores/MCP antes de retirar. |
| Refactor demasiado grande | Pérdida de cobertura | Cortes por dominio y pruebas por frontera. |
| Dependencia nueva de análisis | Mantenimiento extra | Reutilizar `architecture-check`, `dead-code-check` y TypeScript. |
| Migraciones accidentales | Datos reales afectados | Solo migraciones locales; prohibido publicar o aplicar en remoto. |

## 7. Notas de sesión

- 2026-11-20: ARC-06 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **7 entradas**; siguiente candidato **ADOC-16**.
- `lib/server` tiene 139 archivos / 14.227 líneas y `app/api` 52 / 4.188; la dirección de dependencias ya es correcta.
- El baseline de código muerto de ARC-05 deja 51 exports y dos fachadas MCP como deuda conocida para revisar aquí.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
- 2026-11-20 — Fase 2, quinto bloque: pruebas de contrato para `api/members` (11 casos) y `api/space-apps` (8 casos), con guardas de origen/JSON, 401/403/404, validación, estados de servicio y cuerpos exactos. No se cambió código de producto.
- 2026-11-20 — Fase 2, cuarto bloque: `storageUnavailable()` y `STORAGE_UNAVAILABLE_MESSAGE` viven en `lib/server/http.ts`; ocho rutas de archivos, copias, subidas, inventario y purga comparten el 503. Se conservan los códigos y se unifica el texto; la prueba de `files/[id]` se ajusta al mensaje único. MCP mantiene su propio mensaje de herramienta.
- 2026-11-20 — Fase 2, tercer bloque: `lib/server/tasks/service.ts` (144 líneas) absorbe listado, revisión, permisos, responsables y decoración; `api/tasks` pasa de 76 a 46 líneas y deja de importar D1 y Drizzle. `taskAtRevision` se añade a `tasks/queries.ts` y `taskWriteDenial` a `tasks/permissions.ts`. Sin cambios de URLs, estados ni mensajes; 11 pruebas de tareas en verde.
- 2026-11-20 — Fase 2, segundo bloque: `withProjectRoute` absorbe las siete rutas manuales (`copies`, `copies/[id]`, `books/[id]/file`, `books/[id]/image`, `files/[id]`, `uploads` y `space-apps`) y `withResourceProject` encapsula la autorización por recurso en archivos y copias. `route-helpers.ts` pasa a 53 líneas y acepta `params`. Sin cambios de URLs, estados, mensajes ni datos; 40 pruebas de las rutas afectadas en verde.
- 2026-11-20 — Fase 2 iniciada: `app/api/students` (59 líneas) y `app/api/teachers` (66) absorben same-origin, formato, validación Zod, permisos y respuesta; `people/students.ts` y `people/teachers.ts` quedan en 140 y 133 líneas como servicio y repositorio. Sin cambios de URLs, estados, mensajes, datos ni versión del Site.
- 2026-11-20 — Fase 1 cerrada: [`server-map.md`](server-map.md) clasifica 89 módulos de producto (`lib/server`) y 26 rutas (`app/api`), con mapa D1/R2, cuotas, purgas, retenciones y migraciones. Medición separada: **89 / 9.906** líneas de producto y **50 / 9.792** de prueba en `lib/server`; **26 / 1.357** rutas y **26 / 3.371** pruebas en `app/api`. No se movió código. Deuda priorizada para Fase 2: adaptador HTTP dentro de `people/students.ts` y `people/teachers.ts`, `api/tasks` con reglas y D1, y resolución manual de proyecto en 7 rutas.
