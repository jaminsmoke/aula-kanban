# Roadmap UI-15 — Buscar sin depender de las tildes y limpiar filtros

> **Estado:** Activo (2026-11-22) · **Origen:** UI-15 del backlog
> **Backlog:** 7 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Buscar con y sin tildes en el tablero y en Aula Store con los mismos resultados.
- [ ] Mostrar **Limpiar filtros** cuando la combinación actual no encuentre tareas.
- [ ] Devolver el tablero a su vista normal al limpiar búsqueda, prioridad y alumno.
- [ ] Criterio de éxito: `geometria` encuentra Geometría y `investigacion` encuentra Investigación; el aviso de vacío permite recuperar todas las tareas sin recargar.

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

- [ ] Definir una función compartida para minúsculas, espacios exteriores y diacríticos.
- [ ] Fijar los campos buscables de tarea y aplicación.
- [ ] Definir cuándo aparece **Limpiar filtros** y qué restablece.
- [ ] Fijar el texto accesible y el estado sin resultados.
- **Criterios:** la misma consulta produce el mismo conjunto con y sin tilde; la limpieza devuelve exactamente la vista sin filtros.

### Fase 2 — Implementación en tablero y Aula Store

- [ ] Aplicar la normalización a la consulta y al texto de tareas.
- [ ] Aplicar la misma normalización a Aula Store.
- [ ] Añadir **Limpiar filtros** al tablero cuando no haya coincidencias.
- [ ] Restablecer búsqueda, prioridad y alumno desde esa acción.
- **Criterios:** `geometria` e `investigacion` encuentran sus resultados; el control limpia el tablero sin recargar.

### Fase 3 — Pruebas de búsqueda y estado vacío

- [ ] Probar cada término con tilde y sin tilde en tablero y Aula Store.
- [ ] Comprobar mayúsculas y espacios exteriores.
- [ ] Probar combinaciones de búsqueda, prioridad y alumno sin coincidencias.
- [ ] Verificar **Limpiar filtros**, foco y accesibilidad.
- **Criterios:** resultados equivalentes con y sin tilde y recuperación completa del tablero desde el aviso.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.

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
