# Roadmap ARC-11 — Eliminar la duplicación en el guardado con versión

> **Estado:** Activo (2026-11-22) · **Origen:** ARC-11 del backlog
> **Backlog:** 4 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Compartir la operación HTTP de guardado con versión entre `useAppDocument` y Aula Documentos.
- [ ] Reducir la duplicación de las transiciones de carga fallida, guardado y conflicto en Hoja de cálculo, Mapas, Líneas de tiempo y Tarjetas, solo si el saldo de líneas mejora.
- [ ] Mantener los contratos de lectura, los mensajes, la recuperación local y el guardado de Blockly.
- [ ] Criterio de éxito: una sola definición de la petición y del 409, menos duplicación verificada en los consumidores y las mismas garantías ante fallo, conflicto y cambio de documento.

## 2. Alcance

**Dentro:**

- Operación HTTP común para `POST` con `expectedUpdatedAt` y lectura del 409.
- Comparación de las transiciones repetidas en los cuatro editores migrados en ARC-09.
- Reutilización de tipos y helpers existentes antes de crear abstracciones nuevas.
- Pruebas de carga fallida, documento nuevo, guardado correcto, conflicto y cambio de proyecto o documento.
- Medición de líneas de producto, pruebas y bundle de apertura.

**Fuera:**

- Cambiar la API de `/api/app-documents` o de Aula por documento.
- Unificar la carga: cada cliente recibe una envoltura JSON distinta.
- Cambiar mensajes visibles, permisos, recuperación local o la UX de cada app.
- Migrar el guardado de Blockly.
- Publicar en Sites o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Compartir la petición HTTP versionada | Duplicar fetch y 409 en cada hook | Es la duplicación exacta que ARC-09 dejó pendiente y tiene dos consumidores reales. |
| Mantener la carga separada | Un único hook genérico de documento | `useAppDocument` y Aula usan respuestas JSON y estados de error diferentes. |
| Extraer transiciones solo con saldo positivo | Abstracción genérica anticipada | Si el helper no reduce líneas o esconde mensajes, no compensa. |
| Conservar mensajes y recuperación por app | Textos comunes | Cada editor explica su conflicto y su recarga de forma distinta. |
| No tocar Blockly | Incluirlo por simetría | Su recuperación local y su guardado sin versión tienen otro contrato. |

## 4. Punto de partida

- `useAppDocument` y `useAulaDocumentApi` repiten el `POST`, la lectura del 409 y la construcción de `VersionedSaveResult`.
- Aula Documentos carga con `{ document: { state, updatedAt } }`; las apps nativas usan `{ state, updatedAt }`.
- Hoja de cálculo, Mapas, Líneas de tiempo y Tarjetas comparten `loadFailed`, `versionRef` y el cambio de estado tras guardar.
- Baseline: arquitectura **461 archivos / 1.154 imports**; suite **268 archivos / 1.769 pruebas**; Aula **386.491 / 387.000 B**; Hoja **312.511 / 315.000 B**; Site `1.1.39`.

## 5. Fases

### Fase 1 — Operación HTTP compartida

- [x] Extraer el `POST` versionado y la lectura del 409 a `app/board/shared/versioned-document.ts`.
- [x] Reutilizarla en `useAppDocument` y `useAulaDocumentApi` sin cambiar sus errores ni sus estados.
- [x] Mantener `save` sin versión para los clientes anteriores y Blockly.
- [x] Cubrir guardado, conflicto, respuesta no válida y fallo de red.
- **Criterios:** una sola petición versionada, mismo JSON y mismos resultados; pruebas de ambos clientes siguen verdes.
- **Cierre (2026-11-22):** `saveVersionedDocument()` concentra el `POST` y la lectura del 409; `useAppDocument` y `useAulaDocumentApi` solo traducen el resultado a su estado y mensajes. Se mantienen `save`, la carga separada y Blockly. Suite **268 archivos / 1.773 pruebas**; arquitectura **461 / 1.154**.

### Fase 2 — Transiciones comunes de los editores

- [x] Comparar las cuatro implementaciones de carga fallida, versión y guardado.
- [x] Extraer solo las transiciones que reduzcan líneas y mantengan visibles los mensajes y la recarga de cada app.
- [x] Conservar el comportamiento de documento nuevo, conflicto y cambio de proyecto.
- [x] Probar Hoja, Mapas, Líneas de tiempo y Tarjetas, además de Aula Documentos.
- **Criterios:** menos duplicación medida; ninguna app pierde su mensaje, su bloqueo tras fallo de carga o su recuperación.
- **Cierre (2026-11-22):** `useAppDocument` concentra la versión cargada, `loadFailed`, `markLoadFailed` y `saveCurrentVersioned`; los cuatro editores usan esas salidas. El saldo de los cuatro editores es **37 líneas menos** y `use-app-document` suma 27: **10 líneas netas menos**, sin nuevo módulo. Suite **268 / 1.774**; Hoja **6 / 625 → 6 / 650**; arquitectura **461 / 1.154**.

### Fase 3 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build, `app:budget`, `perf:budget` y `perf:office`.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** contratos conservados, sin pérdida de datos ni publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un helper genérico esconde diferencias | Regresión de mensajes o estados | Mantener la carga separada y pasar solo la operación HTTP. |
| La extracción no reduce líneas | Deuda nueva sin beneficio | Medir antes y después; abandonar la parte de editores si no hay saldo. |
| Cambio de documento durante el guardado | Respuesta aplicada al documento equivocado | Conservar las comprobaciones de montaje y de identidad actuales. |
| Conflicto sin versión vigente | Borrador perdido | Mantener `updatedAt` y no recargar automáticamente. |
| Abstracción prematura | Más complejidad | Extraer solo tras dos consumidores reales y pruebas de contrato. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** ARC-11 es la primera candidata del backlog y la recomendada en [`arquitectura-global.md`](arquitectura-global.md). Se empieza por la operación HTTP compartida; quedan ARC-12, ARC-13, ARC-14 y DEV-01. Sin cambios de producto en esta apertura.
- 2026-11-22: **Fase 1 completada.** `saveVersionedDocument()` comparte la petición y el 409 entre `useAppDocument` y Aula Documentos; la carga sigue separada y los mensajes no cambian. Suite **268 archivos / 1.773 pruebas**; arquitectura **461 / 1.154**.
- 2026-11-22: **Fase 2 completada.** `useAppDocument` gestiona versión, carga fallida y `saveCurrentVersioned`; Hoja, Mapas, Líneas y Tarjetas eliminan sus copias. Saldo neto **-10 líneas**; suite **268 / 1.774**; Hoja **6 / 625 → 6 / 650**.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
