# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 1 entrada aparcada
> **Nota:** PER-06, PER-07 y PER-08 se cerraron con pruebas controladas y sus limitaciones se documentaron en el changelog. UI-04, UI-05, UI-06 y UI-07 se completaron desde el roadmap. El resto del replanteo de navegación queda como UI-08.

---

## 2026-11-15 — UI-08 · Tienda en Administración y Clase en el dock

- Contexto: segunda parte del replanteo de navegación del 2026-11-15. La primera parte (Documentación en Ajustes y selector de proyecto en el header) ya está en el roadmap UI-07; esta entrada conserva Tienda, la retirada de Mi espacio y el dock.
- Alcance:
  1. **Tienda en Administración:** añadir una sección `tienda` al sidebar de Administración para el escritorio de apps. Deja de ser una vista con header propio: el escritorio pierde `.space-topbar` y se muestra con `WorkspaceLayout`, como Alumnos y Profesores. Decidir si Aula Store sigue siendo el catálogo del dock o pasa a sección propia.
  2. **Retirar «Mi espacio» del header:** eliminar `button.space-action`; el acceso pasa por Administración > Tienda. Renombrar en código `SpaceView`/`space` a `StoreView`/`store` en la medida de lo posible, conservando el enlace profundo de MCP.
  3. **Clase al dock:** quitar «Clase» de `nav.main-nav` y convertirla en el elemento principal de `.space-dock`, con icono contextual y estado activo; el dock queda como salida a Clase desde Tienda.
- Qué falta antes de retomarlo:
  - [ ] Cerrar la información: ¿Tienda es el escritorio completo (apps y Aula Store en el dock) o solo el catálogo? ¿«Clase» en el dock vuelve a `view=clase` o conserva `section=calendario`?
  - [ ] Resolver cómo se vuelve a Clase desde Alumnos y Profesores si el dock solo existe dentro de Tienda; valorar marca clicable, dock persistente o una salida en el sidebar.
  - [ ] Fijar URLs canónicas y alias: previsible `view=administracion&section=tienda`; conservar `view=espacio` y `app=<appId>` como alias para no romper enlaces MCP (`abrir_app`, `ui://`), favoritos ni pruebas de rendimiento.
  - [ ] Resolver el choque de nombres: ya existe `AppsStore` (Aula Store) en `app/board/space/store/`; elegir nombres distintos para la vista y el catálogo antes de renombrar.
  - [ ] Definir permisos y visibilidad de Tienda por rol (hoy Mi espacio lo ven todos; la gestión de apps es de propietario y administración).
  - [ ] Revisar el responsive de Tienda en 1366, 1024, 900, 620 y 390.
- Notas técnicas: `people/administration/administration-view.tsx`, `space/space-view.tsx` (`.space-topbar`, `.space-dock`), `space.css`, `app/board.tsx` (lazy de `SpaceView` y `view === "espacio"`), `lib/domain/board-url.ts` (`app` y alias), `lib/server/mcp/enlaces.ts` y `lib/server/mcp/dominios/contexto.ts`. Actualizar pruebas de administración, URL, MCP y ayuda; `scripts/perf-latency.mjs` y la etiqueta «Mi espacio · abrir» de rendimiento. Sin migraciones ni cambio de versión por el renombrado.
