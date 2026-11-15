# Roadmap — UI-04 · Vista de administración

> **Entrada:** UI-04 — Vista de administración para alumnado y profesorado (sale del backlog).
> **Backlog:** UI-05 (estados vacíos de fichas).
> **Estado:** Activo · Fases 1 a 4 pendientes.
> **Versión:** `1.1.30` sin cambios hasta el cierre.

---

## 1. Objetivo

- [ ] Reunir Alumnos y Profesores en una sola vista «Administración» con el sidebar de secciones, conservando las URLs antiguas y el acceso de cada rol.
- [ ] Criterio de éxito: desde la cabecera se llega a las dos secciones con un clic y sin recargar; `view=alumnos` y `view=profesores` siguen abriendo el contenido equivalente; el alumnado conserva su ficha editable; el sidebar es utilizable a 390 px; pruebas de URL, cabecera y ambas vistas en verde.

## 2. Alcance

**Dentro:**

- `lib/domain/board-url.ts` y `app/board/shared/use-board-url.ts`: vista `administracion`, sección `alumnos | profesores` y alias antiguos.
- `app/board/layout/header.tsx` y `header.css`: una entrada de navegación en lugar de dos.
- `app/board.tsx`: carga diferida de la vista, marco de viewport y paso de la sección.
- Nueva vista `app/board/people/administration/` sobre `WorkspaceLayout`, con las dos secciones.
- `app/board/people/students/students-view.tsx`, `teachers-view.tsx` y `people.css`: retirar la cabecera duplicada y colocar el alta junto a las herramientas de la sección.
- `obtener_enlace` del MCP (`contexto.ts`, `enlaces.ts`, snapshot) y la ayuda de `docs/content/people.ts`.
- Pruebas de URL, cabecera, alumnado/profesorado y enlaces MCP.

**Fuera de alcance:**

- Cambios de API, permisos, esquema de base de datos o versión.
- UI-05 (estados vacíos): el estado vacío actual se conserva tal cual.
- Mover miembros o invitaciones al sidebar.
- Rediseñar las fichas, su detalle o sus diálogos.
- Sustituir el sondeo de profesorado por otro mecanismo de carga.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Una vista `administracion` con secciones `alumnos` y `profesores` | Añadir el sidebar a cada una de las dos vistas actuales | Comparten marco, sidebar y URL; duplicar el marco obligaría a mantener dos navegaciones. |
| La entrada «Administración» la ve cualquier miembro del proyecto | Restringirla a propietario, administración y profesorado y añadir «Mi ficha» al alumnado | Restringirla quitaría al alumnado su acceso actual a las fichas; «Mi ficha» sería una entrada y una vista nuevas. |
| El alumnado entra en Alumnos con su propia ficha abierta | Dejarle buscar su tarjeta en la rejilla | Cumple el criterio de ficha propia sin una segunda entrada de navegación. |
| Las URLs `view=alumnos` y `view=profesores` se canonizan a `view=administracion[&section=profesores]` con `replaceState` | Mantenerlas como vistas propias o redirigir con una entrada nueva en el historial | Una sola forma canónica sin ensuciar atrás/adelante. |
| El título de sección pasa a `h2` y se retiran `eyebrow`, intro y `h1` de cada vista | Conservar la cabecera completa dentro del sidebar | Evita el título repetido y recupera altura; Ajustes ya usa `h2` por sección dentro de `WorkspaceLayout`. |

## 4. Fases

### Fase 1: Esquema de URL y alias

- [ ] Añadir `administracion` a `BOARD_VIEWS` y el tipo `AdministracionSection` (`alumnos | profesores`) con su lista canónica y su defecto `alumnos`; añadir `administracionSection` a `BoardUrlState`.
- [ ] En `parseBoardUrl`, leer `view=administracion&section=profesores` y mapear `view=alumnos`/`view=profesores` al estado nuevo; en `buildBoardUrl`, escribir la sección solo cuando sea `profesores`, omitirla en el resto de vistas y conservar `project` y parámetros desconocidos.
- [ ] En `use-board-url.ts`, añadir la sección y su setter; canonizar la URL de entrada con `replaceState` una sola vez y sin bucle.
- [ ] Actualizar `board-url.test.ts` y `use-board-url.test.tsx`: roundtrip, alias, atrás/adelante y URL sin sección.
- **Criterios de aceptación:** la URL canónica es única; los enlaces antiguos abren el mismo contenido; atrás/adelante no repite ni pierde entradas; pruebas de URL en verde.

### Fase 2: Cabecera y marco con sidebar

- [ ] Sustituir los botones «Alumnos» y «Profesores» por una sola entrada «Administración», activa con `aria-current` cuando `view === "administracion"`; conservar Mi espacio, Documentación y Ajustes.
- [ ] Crear `AdministrationView` sobre `WorkspaceLayout` (título «Administración», secciones Alumnos y Profesores con icono), cargarla de forma diferida en `board.tsx` y marcar también esta vista como `app-frame--viewport`.
- [ ] Pasar sección y setter desde `board.tsx`; con rol alumno, abrir Alumnos con `ownStudent` seleccionado; conservar detalle, edición, borrado y apertura de tareas.
- [ ] Retirar de `StudentsView` y `TeachersView` el `eyebrow`, la intro y el `h1`; dejar un `h2` de sección, el contador y la disposición, y el alta en la misma fila de herramientas (solo con permiso).
- [ ] Ajustar `people.css` y el relleno del contenido del workspace; comprobar que a ≤720 px el sidebar pasa a fila horizontal con desplazamiento y sin desbordar.
- **Criterios de aceptación:** una única entrada de navegación; sidebar con dos secciones; sin cabecera duplicada; el alta sigue disponible para quien puede gestionar; la ficha propia del alumnado se abre directamente.

### Fase 3: Enlaces MCP, documentación y pruebas

- [ ] Extender `obtener_enlace` y `enlaces.ts` para aceptar `administracion` y su sección; actualizar el snapshot del catálogo y las pruebas de enlaces.
- [ ] Actualizar `docs/content/people.ts` («Las dos vistas se abren desde la cabecera» deja de ser cierto) y el README donde describa la navegación.
- [ ] Actualizar `header.test.tsx`, `board-url.test.ts`, `students-view.test.tsx`, `teachers-view.test.tsx` y `board.test.tsx` si depende de la navegación; cubrir alias, ficha propia y permisos de alta.
- [ ] Ejecutar pruebas focalizadas, `npx tsc --noEmit`, `npm run lint`, `npm run build` y `git diff --check`.
- **Criterios de aceptación:** el enlace MCP devuelve la URL canónica; la ayuda no describe la navegación antigua; los checks están en verde.

### Fase 4: Verificación en navegador y cierre

- [ ] Servir la build en `8791` con las cabeceras de identidad locales y revisar 1366×768, 1024×768 y 390×844: una entrada, sidebar, alta, ficha y vuelta a la lista.
- [ ] Probar un enlace antiguo (`?view=alumnos` y `?view=profesores`), atrás/adelante y el cambio de proyecto con la sección abierta.
- [ ] Anotar medidas y resultado en `docs/changelog.md`, reiniciar `docs/roadmap.md` desde la plantilla y actualizar `docs/README.md`; la versión sigue en `1.1.30`.
- **Criterios de aceptación:** criterio de éxito verificado con la build real, checks en verde y documentación de cierre.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Canonizar la URL en el cliente rompe la hidratación o crea un bucle | Parpadeo o historial sucio | Canonizar con un único `replaceState` tras montar y comparar antes de escribir. |
| El alumnado ve la sección Profesores, como hoy | La vista «Administración» puede sorprender a un alumno | Se mantiene el acceso actual; la ficha propia se abre directamente y no se añaden restricciones nuevas. |
| Cambiar de sección desmonta `TeachersView` y relanza su sondeo | Recarga visible al volver a Profesores | Aceptable por el tamaño actual; conservar `key` por proyecto y no mover el sondeo en este roadmap. |
| Enlaces MCP y snapshot desalineados con la URL nueva | `obtener_enlace` devuelve una vista inexistente | Actualizar enum, `enlaces.ts`, snapshot y pruebas en la misma fase. |
| El sidebar móvil y el contenido con scroll propio se estorban | Contenido cortado a 390 px | Verificar el marco existente de 720 px y ajustar solo el relleno del contenido. |

## 6. Notas de sesión

- 2026-11-15: UI-04 sale del backlog y se abre este roadmap. La cabecera mantiene tres botones de texto (Clase, Alumnos, Profesores) y las dos vistas de personas repiten `eyebrow`, `h1`, intro y alta; Clase y Ajustes ya comparten `WorkspaceLayout` con sidebar de 224 px (208 px a ≤1050 y fila horizontal a ≤720). Sin cambios de código ni de versión; `1.1.30` se mantiene.
