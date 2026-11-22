# Roadmap ARC-12 — Reducir las propiedades reenviadas por Aula Documentos

> **Estado:** Activo (2026-11-22) · **Origen:** ARC-12 del backlog
> **Backlog:** 3 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Reducir las propiedades que `useAulaDocumentosModel` reenvía al contexto sin romper sus consumidores.
- [ ] Retirar campos sin consumidores comprobados y reutilizar las salidas de los hooks existentes.
- [ ] Empezar por copias, importación y barra de herramientas, incluidos los consumidores cargados bajo demanda.
- [ ] Criterio de éxito: menos propiedades y líneas en el modelo y el contexto, con la misma coordinación entre capacidades y sin cambios de comportamiento visibles.

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

- [ ] Inventariar los campos devueltos, su hook de origen y sus consumidores reales.
- [ ] Separar campos de coordinación, estado compartido, acciones y valores puramente reenviados.
- [ ] Identificar campos sin consumidores y campos que pueden leerse directamente del hook.
- [ ] Revisar consumidores `lazy` y pruebas que dependan del contexto.
- [ ] Documentar el contrato en [`aula-documentos-modelo.md`](aula-documentos-modelo.md).
- **Criterios:** mapa completo, campos candidatos justificados y ningún cambio de producto.

### Fase 2 — Copias e importación

- [ ] Reducir los campos reenviados de copias portables e importación.
- [ ] Reutilizar las salidas de los hooks donde se elimine una lista o un alias.
- [ ] Retirar solo propiedades sin consumidores comprobados.
- [ ] Verificar diálogos, recuperación local y errores de importación.
- **Criterios:** menos propiedades y líneas, con los mismos flujos y mensajes.

### Fase 3 — Barra de herramientas y resto del modelo

- [ ] Reducir los campos de la barra de herramientas y de la sesión que no necesiten el contexto.
- [ ] Simplificar las listas de campos repetidas y conservar la coordinación entre capacidades.
- [ ] Comprobar editor, guardado, conflicto, solo lectura y presentación.
- [ ] Medir el saldo del modelo, el contexto, los consumidores y el bundle de apertura.
- **Criterios:** el modelo y el contexto tienen menos reenvíos, sin regresiones funcionales ni de bundle.

### Fase 4 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build, `app:budget`, `perf:budget` y `perf:office`.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** contratos conservados, sin pérdida de datos ni publicación desde el roadmap.

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
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
