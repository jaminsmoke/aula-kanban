# Roadmap — UI-05 · Estados vacíos de las fichas

> **Entrada:** UI-05 — Estados vacíos de las fichas de alumnado y profesorado (sale del backlog).
> **Backlog:** sin entradas.
> **Estado:** En curso · fase 1 completada, fase 2 pendiente.
> **Versión:** `1.1.30` sin cambios hasta el cierre.

---

## 1. Objetivo

- [ ] Cuando no hay fichas, explicar qué falta y ofrecer el alta a quien puede gestionar, tanto en Alumnos como en Profesores.
- [ ] Criterio de éxito: con 0 fichas se entiende la situación y la acción disponible; el alta abre el mismo diálogo que el botón `+`; no aparece el selector de disposición sin fichas; pruebas de alumnado y profesorado en verde.

## 2. Alcance

**Dentro:**

- Nuevo componente compartido `app/board/people/empty-state.tsx` y sus estilos en `people.css`.
- `app/board/people/students/students-view.tsx` y `teachers-view.tsx`: sustituir la rejilla o frase vacía por el estado compartido.
- Ocultar `LayoutToggle` cuando la lista está cargada y vacía.
- Conectar la acción de alta con los diálogos que ya abren los botones `+`.
- Pruebas del componente y de las dos vistas, con y sin permiso.

**Fuera de alcance:**

- Cambios de API, permisos, datos o esquema.
- El sidebar, la cabecera y las URLs de Administración (UI-04, cerrado).
- Rediseñar las tarjetas, el detalle de ficha o los diálogos de alta.
- Cambiar los textos de la ayuda más allá de lo que el estado vacío haga evidente.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Un componente compartido con icono, título, descripción y acción opcional | Dos bloques escritos en cada vista | Evita que los dos estados vacíos se separen con el tiempo. |
| El selector de disposición se oculta con 0 fichas | Deshabilitarlo | Sin fichas no hay nada que alternar; deshabilitado añade ruido. |
| El alta del estado vacío llama a `onCreate` o abre `blankTeacher()` | Un enlace a otra vista | Reutiliza el diálogo y los permisos que ya existen. |
| Sin permiso, solo se muestra el texto informativo | Botón deshabilitado | Un botón que no hace nada confunde. |
| El estado vacío solo aparece con la lista cargada y sin error | Mostrarlo también durante la carga | Taparía el aviso de error o el texto «Cargando fichas…». |

## 4. Fases

### Fase 1: Componente compartido e integración

- [x] Crear `PeopleEmptyState` con icono, título, descripción y acción opcional (etiqueta y `onClick`), con estilos por tokens en `people.css`.
- [x] En Alumnos, con la lista cargada y 0 fichas, mostrar «Aún no hay alumnos» y la explicación; si `canManage`, «Añadir alumno» llama a `onCreate`.
- [x] En Profesores, sustituir la frase suelta por «Aún no hay profesores»; si `isAdmin`, «Añadir profesor» abre `blankTeacher()`.
- [x] Ocultar `LayoutToggle` cuando la lista está cargada y vacía; conservarlo con fichas y mientras se carga.
- **Criterios de aceptación:** con 0 fichas las dos secciones explican qué falta y ofrecen el alta solo con permiso; sin permiso no hay acción; el selector no aparece sin fichas; carga y error conservan su comportamiento.

### Fase 2: Pruebas, verificación y cierre

- [ ] Añadir pruebas del componente con y sin acción, y de `students-view`/`teachers-view` con 0 fichas, con y sin permiso y con el alta conectada.
- [ ] Ejecutar pruebas focalizadas, `npx tsc --noEmit`, `npm run lint`, `npm run build` y `git diff --check`.
- [ ] Revisar los dos estados vacíos en la build a 1366 y 390 con un proyecto sin fichas; si no hay forma local de vaciarlo, cubrirlo con pruebas y anotar la limitación.
- [ ] Anotar el resultado en `docs/changelog.md`, reiniciar `docs/roadmap.md` desde la plantilla y actualizar `docs/README.md`; la versión sigue en `1.1.30`.
- **Criterios de aceptación:** pruebas de las dos vistas y del componente en verde; checks correctos; documentación de cierre completa.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El estado vacío aparece durante la carga | Parpadeo y mensaje falso | Condicionarlo a `students !== null` y a que no haya error. |
| El error de carga queda tapado por el estado vacío | Se pierde el reintento | Mantener la alerta y no mostrar el vacío cuando hay error. |
| Profesores carga con sondeo y puede pasar por 0 antes de tiempo | Vacío prematuro | Usar el mismo criterio de lista cargada y esperar a la primera respuesta. |
| El botón del vacío y el `+` se comportan distinto | Dos flujos de alta | Ambos llaman a la misma acción de la vista. |
| No hay un proyecto local sin fichas | No se puede revisar el vacío en navegador | Probar con datos vacíos en las pruebas y anotar la limitación si no se crea uno. |

## 6. Notas de sesión

- 2026-11-15: fase 1 completada. `PeopleEmptyState` se usa en Alumnos y Profesores, el selector se oculta con 0 fichas y el alta reutiliza `onCreate` y `blankTeacher()`. Tipos, 7 pruebas focalizadas, lint y `git diff --check` en verde; sin pruebas nuevas del vacío hasta la fase 2. `1.1.30` sin cambios.
- 2026-11-15: UI-05 sale del backlog y se abre este roadmap. Se divide en dos fases porque el componente y su integración se revisan como un solo bloque, y las pruebas y el cierre como otro; el alcance no justifica más. Sin cambios de código ni de versión; `1.1.30` se mantiene.
