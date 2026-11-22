# Roadmap ARC-12 — Reducir las propiedades reenviadas por Aula Documentos

> **Estado:** Completado (2026-11-22) · **Origen:** ARC-12 del backlog
> **Backlog:** 3 entradas · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [x] Reducir las propiedades que `useAulaDocumentosModel` reenvía al contexto sin romper sus consumidores.
- [x] Retirar campos sin consumidores comprobados y reutilizar las salidas de los hooks existentes.
- [x] Empezar por copias, importación y barra de herramientas, incluidos los consumidores cargados bajo demanda.
- [x] Criterio de éxito: menos propiedades y líneas en el modelo y el contexto, con la misma coordinación entre capacidades y sin cambios de comportamiento visibles.

## 2. Alcance

**Dentro:**

- `useAulaDocumentosModel`, su tipo de retorno, el proveedor de contexto y los consumidores de la app.
- Mapa de campos reenviados, hooks de origen y consumidores reales, incluidos los diálogos `lazy`.
- Reducción de copias e importación y de la barra de herramientas.
- Retirada de propiedades sin consumidores y simplificación de listas de campos repetidas.
- Verificación de diálogos, editor, guardado, recuperación y solo lectura.
- Medición de líneas de producto, pruebas y bundle de apertura de Aula Documentos.

**Fuera:**

- Reescribir los hooks por capacidad o cambiar su lógica.
- Cambiar el comportamiento de la interfaz, los permisos, la persistencia o la recuperación.
- Introducir un gestor de estado externo o mover el contexto a `shared`.
- Alterar el esquema, las URLs, el MCP o la versión del Site.
- Publicar en Sites o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mantener el contexto de Aula | Repartir props por todo el árbol | El contexto ya es la frontera de la app; el problema es el reenvío redundante. |
| Mapear consumidores antes de borrar | Eliminar campos por intuición | Un campo puede usarse solo desde un diálogo `lazy` o una prueba de flujo. |
| Reutilizar las salidas de los hooks | Duplicar valores derivados en el modelo | El hook ya es el dueño del estado y la acción. |
| Conservar la coordinación en el modelo | Convertirlo en un mero agregador | Algunas acciones necesitan combinar guardado, documento y diálogos. |
| Empezar por copias, importación y toolbar | Refactor global de una vez | Son los reenvíos más repetidos y permiten medir el patrón. |
| Mantener la carga diferida | Un único contexto plano con todo | El bundle de apertura es parte del presupuesto de Aula. |

## 4. Punto de partida

- `useAulaDocumentosModel` tiene **593 líneas** y devuelve **190 propiedades**.
- El modelo compone sesión, imágenes, enlaces, presentación, suite, comentarios, versiones, búsqueda, navegación, estructura, recuperación, persistencia, migración, copias, nuevo documento, importación y toolbar.
- La app usa un proveedor de contexto; los diálogos se cargan con `lazy` cuando su estado está abierto.
- Varias listas de campos de la sesión, toolbar y diálogos se repiten entre el hook y el valor de contexto.
- Baseline de ARC-11: arquitectura **461 archivos / 1.154 imports**; suite **268 archivos / 1.774 pruebas**; Aula **386.778 / 387.000 B**; Hoja **312.861 / 315.000 B**; Site `1.1.39`.

## 5. Fases

### Fase 1 — Mapa de consumidores y contrato

- [x] Inventariar los campos devueltos, su hook de origen y sus consumidores reales.
- [x] Separar campos de coordinación, estado compartido, acciones y valores puramente reenviados.
- [x] Identificar campos sin consumidores y campos que pueden leerse directamente del hook.
- [x] Revisar consumidores `lazy` y pruebas que dependan del contexto.
- [x] Documentar el contrato en [`aula-documentos-modelo.md`](../developing/aula-documentos-modelo.md).
- **Criterios:** mapa completo, campos candidatos justificados y ningún cambio de producto.
- **Cierre (2026-11-22):** inventario en [`aula-documentos-modelo.md`](../developing/aula-documentos-modelo.md). **190 entradas superiores** (182 explícitas + 8 spreads), **285 campos únicos** al expandir, **11 consumidores de producto**, **234 campos con consumidor directo** y **51 candidatos sin consumidor directo**. Sin cambios de producto.

### Fase 2 — Copias e importación

- [x] Reducir los campos reenviados de copias portables e importación.
- [x] Reutilizar las salidas de los hooks donde se elimine una lista o un alias.
- [x] Retirar solo propiedades sin consumidores comprobados.
- [x] Verificar diálogos, recuperación local y errores de importación.
- **Criterios:** menos propiedades y líneas, con los mismos flujos y mensajes.
- **Cierre (2026-11-22):** se retiraron del contexto `openCopies`, `openCopyImportPicker`, `openImport`, `importMarkdown` e `importOffice`; las tres acciones de apertura siguen dentro del modelo para la toolbar. El contrato baja de **190 a 185 entradas** y de **285 a 280 campos**; **9 líneas netas menos**. Diálogos y suite de Aula verificados: **36 / 181**; suite completa **268 / 1.774**.

### Fase 3 — Barra de herramientas y resto del modelo

- [x] Reducir los campos de la barra de herramientas y de la sesión que no necesiten el contexto.
- [x] Simplificar las listas de campos repetidas y conservar la coordinación entre capacidades.
- [x] Comprobar editor, guardado, conflicto, solo lectura y presentación.
- [x] Medir el saldo del modelo, el contexto, los consumidores y el bundle de apertura.
- **Criterios:** el modelo y el contexto tienen menos reenvíos, sin regresiones funcionales ni de bundle.
- **Cierre (2026-11-22):** **46 campos fuera del contexto**: 27 del modelo, 14 de toolbar y 5 de spreads; los valores siguen dentro de sus hooks para construir las acciones. Contrato expandido **280 → 234**, candidatos **46 → 0**, **46 líneas netas menos**. Suite **268 / 1.774**; Aula **36 / 181**; build Aula **386.670 B**; Hoja **312.870 B**.

### Fase 4 — Cierre

- [x] Ejecutar `npm run check`, suite completa, build, `app:budget`, `perf:budget` y `perf:office`.
- [x] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** contratos conservados, sin pérdida de datos ni publicación desde el roadmap.
- **Cierre (2026-11-22):** el contexto deja de reenviar **46 campos**; el contrato expandido baja de **280 a 234** y los candidatos de **46 a 0**, con **46 líneas netas menos**. Suite **268 archivos / 1.774 pruebas**, build Aula **386.658 B**, Hoja **312.862 B**, presupuestos correctos. Site `1.1.39`, sin publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Retirar un campo usado por un diálogo `lazy` | Regresión silenciosa | Mapa de consumidores y pruebas de cada diálogo antes de borrar. |
| El contexto deja de ser coordinador | Acciones rotas | Mantener en el modelo solo la coordinación que cruza capacidades. |
| Más líneas por nuevos adaptadores | Deuda sin beneficio | Medir el saldo y abandonar la parte que no reduzca. |
| Cambiar el orden de carga | Regresión de bundle | Conservar `lazy` y medir el chunk de apertura. |
| Refactor demasiado amplio | Riesgo de regresión | Fases por copias/importación, toolbar y resto. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** ARC-12 es la siguiente candidata recomendada del backlog; quedan ARC-13, ARC-14 y DEV-01. Se empieza por el mapa de consumidores y el contrato del modelo. Sin cambios de producto en esta apertura.
- 2026-11-22: **Fase 1 completada.** Mapa en [`aula-documentos-modelo.md`](../developing/aula-documentos-modelo.md): 190 entradas superiores, 285 campos expandidos, 11 consumidores y 51 candidatos sin consumidor directo. Sin cambios de producto.
- 2026-11-22: **Fase 2 completada.** Cinco propiedades de copias/importación dejan de exponerse en el contexto; el contrato expandido queda en 280 campos. **9 líneas netas menos**; suite de Aula **36 / 181** y suite completa **268 / 1.774** sin regresiones.
- 2026-11-22: **Fase 3 completada.** El contexto deja de reenviar 46 campos; las acciones siguen dentro de sus hooks para menús y barras. Contrato expandido **280 → 234**, candidatos **46 → 0**, **46 líneas netas menos**. Build Aula **386.670 B**; Hoja **312.870 B**.
- 2026-11-22: **Fase 4 completada y roadmap cerrado.** Checks, suite, build, presupuestos, changelog, backlog y archivo del roadmap. `roadmap.md` se reinicia sin roadmap activo; push único a GitHub. Sin publicación en Sites ni migraciones.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
