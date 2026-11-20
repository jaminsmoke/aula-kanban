# Roadmap ARC-05 — Pruebas, harness y presupuestos

> **Estado:** Activo · **Origen:** ARC-05 del backlog (2026-11-20)
> **Backlog:** ARC-06, ADOC-16 a ADOC-20, UI-11 y DEV-01 (8 entradas) · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Extraer un harness de pruebas explícito para Aula y los flujos que comparten mocks.
- [ ] Evitar que un cambio de mock obligue a editar cinco archivos sin ocultar el setup global.
- [ ] Detectar archivos y dependencias de producto sin consumidores.
- [ ] Definir presupuestos por app y por flujo, no solo por el total de Aula.
- [ ] Criterio de éxito: el setup compartido conserva aislamiento, los presupuestos cubren las apps principales y el código muerto falla de forma determinista.

## 2. Alcance

**Dentro:**

- Inventario de mocks, setup y datos de prueba repetidos.
- Harness para Aula Documentos y factorías comunes de Office, Tarjetas y Timeline.
- Detección de módulos, exports y dependencias sin consumidores.
- Presupuestos por app/flujo y su integración en CI.
- Documentación, changelog y baseline al cerrar cada bloque.

**Fuera:**

- Cambiar el comportamiento de producto, URLs, permisos o datos.
- Sustituir Vitest, Testing Library o el framework de build.
- Rehacer la arquitectura de apps, CSS o servidor de ARC-02/04/06.
- Añadir una dependencia de análisis sin evaluar antes una alternativa local.
- Cambiar la versión del Site, publicar o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Harness explícito por flujo | Mocks globales en `vitest.setup.ts` | Un mock global oculta el estado y rompe el aislamiento. |
| Factorías con parámetros | Fixtures monolíticos compartidos | Cada prueba debe declarar qué documento, tarea o respuesta usa. |
| Script propio para código muerto | Añadir `knip` sin evaluar | El repo ya tiene checker y no necesita otra dependencia por defecto. |
| Presupuestos por app y flujo | Un único límite global | Una app pesada puede quedar oculta por el total del tablero. |
| Cambios de infraestructura de pruebas en pasos pequeños | Refactor masivo de 234 archivos | Permite revisar aislamiento y presupuestos por bloque. |
| Mantener los shims de jsdom en el setup global | Moverlos al harness | `ResizeObserver`, `IntersectionObserver` y `crypto` son del entorno, no de un flujo. |

## 4. Punto de partida

Medición del 2026-11-20:

- **234 archivos / 1.597 pruebas** al iniciar ARC-05.
- Aula Documentos concentra cinco archivos grandes:
  - `aula-documentos-copies.test.tsx`: 582 líneas.
  - `aula-documentos-presentation.test.tsx`: 525.
  - `aula-documentos-autosave.test.tsx`: 491.
  - `aula-documentos-documents.test.tsx`: 464.
  - `aula-documentos-recovery.test.tsx`: 420.
- Se repiten aproximadamente 190 líneas de mocks y setup entre esos archivos.
- `vitest.setup.ts` ya contiene shims de entorno y helpers como `jsonResponse`; no se deben convertir en mocks de producto globales.
- Hay 12 flujos en `docs/perf-budget.json`; no existe una comprobación automática de código muerto ni presupuestos por app.
- No hay `knip` ni `ts-prune` instalados.

## 5. Fases

### Fase 1 — Inventario y contrato del harness

- [x] Inventariar mocks, factories, respuestas, datos y helpers de los cinco archivos de Aula.
- [x] Identificar qué partes son entorno global y qué partes pertenecen a un flujo.
- [x] Definir la API del harness: documento, sesión, fetch, descargas y estados de error.
- [x] Documentar qué no puede hacer el harness: ocultar mocks, compartir estado mutable ni saltarse `cleanup`.
- [x] Mapear qué otros flujos pueden consumir las mismas factorías.
- **Criterios:** inventario completo y límites explícitos; ninguna prueba migrada todavía.

### Fase 2 — Extraer el harness y migrar Aula

- [x] Crear el harness de Aula con factorías explícitas y estado por prueba.
- [x] Migrar los seis archivos de Aula (cinco grandes y `tables`) sin cambiar las aserciones de comportamiento.
- [x] Revisar las respuestas y utilidades comunes de Office, Tarjetas, Timeline y Hoja; no hay dos consumidores reales fuera de Aula.
- [x] Mantener `vitest.setup.ts` solo para shims de entorno y limpieza global.
- [x] Añadir una prueba de aislamiento que falle si dos pruebas comparten estado mutable.
- **Criterios:** los seis archivos usan el harness, las pruebas siguen pasando y no aparecen mocks globales nuevos.

### Fase 3 - Código muerto y dependencias

- [x] Evaluar `knip`, `ts-prune` y un script local con el checker actual como referencia.
- [x] Implementar la opción elegida sin añadir dependencia si el script local cubre el caso.
- [x] Detectar módulos, exports y dependencias de producto sin consumidores.
- [x] Excluir pruebas, scripts, entradas dinámicas y APIs públicas justificadas.
- [x] Integrar el check en `npm run check` y CI con un baseline explícito para deuda conocida.
- **Criterios:** un archivo o dependencia sin consumidores falla de forma determinista; no hay falsos positivos en entradas dinámicas; CI lo ejecuta.

### Fase 4 — Presupuestos por app y por flujo

- [ ] Revisar los 12 flujos actuales y asignar presupuesto a las apps principales.
- [ ] Definir límites de test, CSS, bundle, latencia e imágenes donde correspondan.
- [ ] Añadir una salida legible y una comprobación de crecimiento por app.
- [ ] Integrar los presupuestos en `npm run check` o en el job de CI adecuado.
- [ ] Documentar cómo actualizar un presupuesto con evidencia de rendimiento.
- **Criterios:** cada app principal tiene un presupuesto reconocible, los límites se comprueban automáticamente y una regresión falla.

### Fase 5 — Cierre

- [ ] Revisar que el harness no oculta mocks ni rompe aislamiento.
- [ ] Revisar que los checks de código muerto y presupuestos no dependen de rutas o MCP externos.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget` y `perf:office`.
- **Criterios:** harness, detección de muertos y presupuestos estables; suite y CI correctos; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Mocks globales ocultos | Pruebas que pasan por el mock equivocado | Harness explícito y prueba de aislamiento. |
| Falsos positivos de código muerto | Bloqueo de código dinámico legítimo | Exclusiones documentadas y baseline con caducidad. |
| Presupuestos ruidosos | Fallos por bytes o tiempos variables | Margen, medición repetida y límites por flujo. |
| Cambio masivo de tests | Pérdida de cobertura | Migrar por archivo y conservar aserciones. |
| Dependencia de análisis nueva | Mantenimiento extra | Preferir script local; justificar cualquier dependencia. |
| CI más lento | Menos iteraciones | Checks rápidos, caché y ejecución por jobs. |

## 7. Notas de sesión

- 2026-11-20: ARC-05 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **8 entradas**; siguiente candidato **ARC-06**.
- La suite al iniciar ARC-05 tenía **234 archivos / 1.597 pruebas**; las cifras del backlog estaban desactualizadas.
- `vitest.setup.ts` ya cubre shims de jsdom; el harness no sustituye ese setup global.
- 2026-11-20: **Fase 1 completada.** Inventario en [`test-harness-audit.md`](test-harness-audit.md): 234 archivos / 1.597 pruebas, cinco tests de Aula, ~190 líneas repetidas, capas de setup, contrato del harness y candidatos de Office/Tarjetas/Timeline/Hoja. Sin cambios de pruebas.
- 2026-11-20: **Fase 2 completada.** Harness en `test-utils/aula-documentos.tsx` (fuera del catálogo de producto); seis tests migrados, **1.297 líneas eliminadas**, `Range`/`Element`/`Node` movidos al setup global y prueba de aislamiento añadida. Suite: **235 archivos / 1.599 pruebas**. No hay dos consumidores reales para factorías fuera de Aula.
- 2026-11-20: **Fase 3 completada.** `dead-code-check` local en `scripts/dead-code-check.mjs`, baseline en [`dead-code-baseline.json`](dead-code-baseline.json) y decisiones en [`dead-code-check.md`](dead-code-check.md). Detecta 0 huérfanos, 0 dependencias sin uso y 0 CSS sin uso; 51 exports quedan como deuda conocida. `test-css.ts` pasó a `test-utils/aula-documentos-css.ts`. CI y `npm run check` ejecutan el checker.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
