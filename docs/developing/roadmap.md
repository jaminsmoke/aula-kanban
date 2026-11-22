# Roadmap ARC-14 — Reutilizar los límites de importación y revisión documental

> **Estado:** Activo (2026-11-22) · **Origen:** ARC-14 del backlog
> **Backlog:** 1 entrada · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Unificar en una sola definición cada límite compartido de Markdown y de documento serializado.
- [ ] Retirar las constantes duplicadas de importación antigua y de historial sin cambiar sus límites efectivos.
- [ ] Conservar diferenciados el tamaño de la petición, la longitud del Markdown y el tamaño del documento serializado.
- [ ] Criterio de éxito: menos constantes duplicadas y los mismos límites, mensajes y estados en importación, guardado y restauración.

## 2. Alcance

**Dentro:**

- Inventario de `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH`, `LEGACY_MARKDOWN_MAX_LENGTH`, `AULA_DOCUMENT_JSON_MAX_LENGTH`, `AULA_VERSION_STATE_MAX_LENGTH` y `MAX_APP_DOCUMENT_CHARS`, con sus consumidores y flujos.
- Reutilización de la longitud de Markdown en `importers.ts`, `import-formats.ts`, `office-import.ts` y el hook de importación.
- Reutilización del límite de documento serializado en la validación, las copias locales y la creación/restauración de versiones.
- Pruebas de borde justo en el límite, por encima y en los flujos antiguos.
- Verificación de que los mensajes de error, los estados HTTP y los estados de versión no cambian.

**Fuera:**

- Cambiar los valores efectivos de los límites.
- Unificar el límite de petición con el de Markdown o con el del documento serializado.
- Cambiar el esquema, los datos, las URLs, los permisos, el MCP o la versión del Site.
- Rediseñar la importación, el historial o sus interfaces.
- Publicar en Sites o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Una sola definición para la entrada Markdown | Mantener una copia por importador | `LEGACY_MARKDOWN_MAX_LENGTH` repite el mismo límite y puede divergir. |
| Una sola definición para el documento serializado | Mantener otra copia en historial | El estado de una versión es el mismo documento validado, no un formato distinto. |
| Conservar `MAX_APP_DOCUMENT_CHARS` como límite de petición/almacenamiento | Reutilizarlo como límite de Markdown o de documento | Describe otra frontera: el cuerpo HTTP y el estado serializado de cualquier app nativa. |
| Reutilizar constantes existentes | Crear un módulo genérico de límites | El alcance es pequeño y las constantes ya tienen un dominio claro. |
| Conservar mensajes y estados públicos | Unificar también los textos de error | La interfaz y los clientes dependen de ellos. |

## 4. Punto de partida

- `lib/domain/aula-documentos/importers.ts` define `LEGACY_MARKDOWN_MAX_LENGTH = 200_000` para Presentaciones.
- `lib/domain/aula-documentos/markdown.ts` ya exporta `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH = 200_000`.
- `lib/domain/aula-documentos/document-types.ts` define `AULA_DOCUMENT_JSON_MAX_LENGTH = 190_000` para el documento serializado.
- `lib/domain/aula-documentos/revision.ts` define `AULA_VERSION_STATE_MAX_LENGTH = 190_000` y `lib/server/aula-documentos/versions.ts` lo usa al crear versiones.
- `lib/server/apps/app-documents.ts` define `MAX_APP_DOCUMENT_CHARS = 200_000` para el cuerpo y el estado serializado de las apps nativas; es una frontera distinta.
- `import-formats.ts`, `office-import.ts`, `use-aula-import.ts`, `document-validation.ts` y `recovery-store.ts` ya consumen las constantes de dominio correctas.
- Baseline: arquitectura **461 archivos / 1.154 imports**; suite **268 archivos / 1.774 pruebas**; Aula **386.673 / 387.000 B**; Hoja **313.034 / 315.000 B**; Site `1.1.39`.

## 5. Fases

### Fase 1 — Inventario y contrato de límites

- [x] Mapear cada constante, valor efectivo, consumidor, mensaje y estado público.
- [x] Clasificar las fronteras de petición, Markdown y documento serializado.
- [x] Confirmar qué límites comparten dominio y cuáles deben seguir separados.
- [x] Registrar la decisión y el baseline sin cambiar producto.
- **Criterios:** mapa completo y decisión justificada; sin cambios de producto.
- **Cierre (2026-11-22):** contrato en [`limites-documentales.md`](limites-documentales.md). Cinco constantes agrupadas en tres fronteras; `LEGACY_MARKDOWN_MAX_LENGTH` y `AULA_VERSION_STATE_MAX_LENGTH` son los dos duplicados. `MAX_APP_DOCUMENT_CHARS` se conserva separado. Sin cambios de producto.

### Fase 2 — Una sola longitud de Markdown

- [x] Hacer que la importación antigua use `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH`.
- [x] Retirar `LEGACY_MARKDOWN_MAX_LENGTH` y comprobar los demás consumidores.
- [x] Cubrir Markdown actual, Presentaciones antigua, TXT y Office en el límite y por encima.
- [x] Conservar los mensajes y la aceptación actuales.
- **Criterios:** una sola definición para la entrada Markdown y pruebas de borde correctas.
- **Cierre (2026-11-22):** `isAulaMarkdownTooLong()` centraliza la comprobación; la importación antigua, TXT, Office y el diálogo de Markdown la reutilizan. Retirada `LEGACY_MARKDOWN_MAX_LENGTH`. Pruebas de límite exacto y siguiente carácter; mensajes sin cambios. Suite **268 archivos / 1.776 pruebas**.

### Fase 3 — Un solo tamaño de documento serializado

- [ ] Hacer que el historial use `AULA_DOCUMENT_JSON_MAX_LENGTH` y retirar la segunda constante de 190.000.
- [ ] Mantener `MAX_APP_DOCUMENT_CHARS` separado para la petición y el almacenamiento de apps.
- [ ] Cubrir documento actual, guardado, creación de versión y restauración de una versión existente.
- [ ] Conservar los estados `too-large`, `invalid`, los mensajes y los límites efectivos.
- **Criterios:** una sola definición para el documento serializado; historial y restauración equivalentes.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** límites unificados y verificados, sin cambios funcionales ni publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Unificar límites que describen fronteras distintas | Cambio de comportamiento en peticiones o almacenamiento | Mantener `MAX_APP_DOCUMENT_CHARS` separado y documentar cada concepto. |
| Cambiar un mensaje o estado por accidente | Regresión visible o contrato roto | Comparar mensajes y estados antes/después en las pruebas de borde. |
| Romper la restauración de versiones existentes | Pérdida de acceso al historial | Probar una versión guardada con el límite actual y restaurarla. |
| Crear un módulo de límites sobredimensionado | Más indirección que valor | Reutilizar las constantes de dominio existentes. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** ARC-14 es la siguiente candidata recomendada del backlog; queda DEV-01. Se empieza por el inventario de límites y consumidores. Sin cambios de producto en esta apertura.
- 2026-11-22: **Fase 1 completada.** Inventario en [`limites-documentales.md`](limites-documentales.md): cinco constantes y tres fronteras; dos duplicados (`LEGACY_MARKDOWN_MAX_LENGTH` y `AULA_VERSION_STATE_MAX_LENGTH`). Se conserva separado `MAX_APP_DOCUMENT_CHARS`. Sin cambios de producto.
- 2026-11-22: **Fase 2 completada.** `isAulaMarkdownTooLong()` centraliza la comprobación; retirada `LEGACY_MARKDOWN_MAX_LENGTH`. Pruebas de borde en Markdown, Presentaciones, TXT y Office; mensajes sin cambios. Suite **268 / 1.776**.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
