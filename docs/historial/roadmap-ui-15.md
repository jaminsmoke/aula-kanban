# Roadmap UI-15 — Buscar sin depender de las tildes y limpiar filtros

> **Estado:** Completado (2026-11-22) · **Origen:** UI-15 del backlog
> **Backlog:** 7 entradas · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [x] Buscar con y sin tildes en el tablero y en Aula Store con los mismos resultados.
- [x] Mostrar **Limpiar filtros** cuando la combinación actual no encuentre tareas.
- [x] Devolver el tablero a su vista normal al limpiar búsqueda, prioridad y alumno.
- [x] Criterio de éxito: `geometria` encuentra Geometría y `investigacion` encuentra Investigación; el aviso de vacío permite recuperar todas las tareas sin recargar.

## 2. Alcance

**Dentro:**

- Búsqueda de tareas por título, descripción y responsable.
- Búsqueda de aplicaciones en Aula Store.
- Términos con tildes, sin tildes, mayúsculas y espacios exteriores.
- Acción **Limpiar filtros** en el tablero cuando no hay coincidencias.
- Restablecer búsqueda, prioridad y alumno.
- Estado vacío y accesibilidad del control.

**Fuera:**

- Cambiar el modelo, la API o los permisos.
- Añadir ordenación, resaltado de coincidencias o búsqueda difusa.
- Cambiar los filtros por categoría o instaladas de Aula Store.
- Persistir filtros en la URL.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Normalizar con una función compartida | Duplicar `toLocaleLowerCase` en cada búsqueda | El mismo término debe encontrar lo mismo en tablero y Aula Store. |
| Quitar diacríticos con `normalize("NFD")` | Mantener una lista manual de vocales acentuadas | Cubre tildes, diéresis y variantes sin mantener casos especiales. |
| Buscar sobre el texto normalizado y comparar con la consulta normalizada | Normalizar solo la consulta | Evita que un título con tilde quede fuera. |
| Ofrecer **Limpiar filtros** solo cuando `filtered && visible.length === 0` | Mostrarlo siempre | No añade ruido cuando hay resultados. |
| Limpiar los tres filtros en una acción | Limpiar solo la búsqueda | La combinación de prioridad y alumno también puede dejar el tablero vacío. |
| Mantener el estado en el hook de tareas | Guardar los filtros en la URL | El alcance actual es la sesión y no hace falta cambiar el contrato de URL. |

## 4. Punto de partida

- `useTasks` construye `query` y `haystack` con `toLocaleLowerCase("es")`; las tildes siguen siendo significativas.
- `Aula Store` compara el texto con `toLowerCase()`; tampoco elimina diacríticos.
- `KanbanView` muestra «Sin coincidencias» en cada columna vacía, pero no ofrece una acción de limpieza.
- `useTasks` ya expone `setSearch`, `setFilter` y `setStudentFilter`, y calcula `filtered`.
- La suite actual cubre filtros y estados vacíos, pero no términos sin tilde.
- Baseline: arquitectura **463 archivos / 1.166 imports**; suite **271 archivos / 1.828 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Contrato de normalización y limpieza

- [x] Definir una función compartida para minúsculas, espacios exteriores y diacríticos.
- [x] Fijar los campos buscables de tarea y aplicación.
- [x] Definir cuándo aparece **Limpiar filtros** y qué restablece.
- [x] Fijar el texto accesible y el estado sin resultados.
- **Criterios:** la misma consulta produce el mismo conjunto con y sin tilde; la limpieza devuelve exactamente la vista sin filtros.
- **Cierre Fase 1 (2026-11-22):** `lib/domain/search.ts` define `normalizeSearch` y `matchesSearch`; `useTasks` busca por título, descripción y responsable sin tildes y expone `clearFilters` para búsqueda, prioridad y alumno. Tests **16**; `npm run check` correcto; arquitectura **464 / 1.167**; Tablero **32 / 2.733** y CSS **12 / 1.555**.

### Fase 2 — Implementación en tablero y Aula Store

- [x] Aplicar la normalización a la consulta y al texto de tareas.
- [x] Aplicar la misma normalización a Aula Store.
- [x] Añadir **Limpiar filtros** al tablero cuando no haya coincidencias.
- [x] Restablecer búsqueda, prioridad y alumno desde esa acción.
- **Criterios:** `geometria` e `investigacion` encuentran sus resultados; el control limpia el tablero sin recargar.
- **Cierre Fase 2 (2026-11-22):** el tablero y Aula Store comparten `matchesSearch`; `KanbanView` muestra **Limpiar filtros** solo sin coincidencias y `Board` vacía los tres filtros y devuelve el foco al buscador. Tests afectados **56**; `npm run check` correcto; arquitectura **464 / 1.168**; Tablero **32 / 2.741 ≤ 32 / 2.800** y CSS **12 / 1.556 ≤ 13 / 1.650**.

### Fase 3 — Pruebas de búsqueda y estado vacío

- [x] Probar cada término con tilde y sin tilde en tablero y Aula Store.
- [x] Comprobar mayúsculas y espacios exteriores.
- [x] Probar combinaciones de búsqueda, prioridad y alumno sin coincidencias.
- [x] Verificar **Limpiar filtros**, foco y accesibilidad.
- **Criterios:** resultados equivalentes con y sin tilde y recuperación completa del tablero desde el aviso.
- **Cierre Fase 3 (2026-11-22):** tests de normalización, tablero y Aula Store **32**; `Geometría`/`geometria`, mayúsculas, espacios exteriores, combinaciones vacías, **Limpiar filtros** y retorno de foco al buscador. `npm run check` correcto; arquitectura **464 / 1.168**; Tablero **32 / 2.743 ≤ 32 / 2.800** y CSS **12 / 1.556 ≤ 13 / 1.650**.

### Fase 4 — Verificación y cierre

- [x] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [x] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [x] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.
- **Cierre Fase 4 (2026-11-22):** `npm run check`, suite **272 / 1.833**, build y presupuestos correctos. Tablero **176.481 / 176.500 B**; Aula **386.818 / 387.000 B**; Hoja **313.037 / 315.000 B**. Documentación, changelog, backlog, README y arquitectura actualizados; roadmap archivado y `roadmap.md` reiniciado. Sin publicación en Sites ni migración remota.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Normalizar solo la consulta | Los títulos acentuados siguen sin aparecer | Normalizar consulta y texto de destino. |
| Cambiar el orden de los resultados | Sensación de tablero inestable | Filtrar sin reordenar. |
| Limpiar solo un filtro | El tablero sigue vacío | Restablecer búsqueda, prioridad y alumno juntos. |
| Mostrar la limpieza con resultados válidos | Acción innecesaria | Condicionarla a `filtered && visible.length === 0`. |
| Dependencias de mayúsculas locales | Resultados distintos por entorno | Usar la misma función compartida en ambas superficies. |
| Perder el foco al limpiar | Mala experiencia de teclado | Devolver el foco al buscador tras vaciar los filtros. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** UI-15 entra desde el backlog por `geometria` sin Geometría y `investigacion` sin Investigación.
- El backlog queda con **7 entradas**: UI-16, TASK-05, PER-09, UI-13, UI-14, PERM-03 y DEV-01.
- Sin cambios de producto en esta apertura.
