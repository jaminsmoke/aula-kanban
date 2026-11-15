# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 1 entrada aparcada
> **Nota:** PER-06, PER-07 y PER-08 se cerraron con pruebas controladas y sus limitaciones se documentaron en el changelog. UI-04, UI-05 y UI-06 se completaron desde el roadmap. Después se aparcó UI-07 con la revisión de navegación del 2026-11-15.

---

## 2026-11-15 — UI-07 · Replanteo de navegación: Documentación, selector, Tienda y dock

- Contexto: revisión de diseño sobre el tablero actual. Se aparca entera, sin tocar la UI, porque los cinco cambios forman una sola navegación y no se entienden por separado.
- Alcance:
  1. **Documentación dentro de Ajustes:** retirar `button.header-docs` del header y añadir Documentación como una sección más del sidebar de Ajustes, con su URL y su vuelta atrás.
  2. **Selector de proyecto en el hueco de Documentación:** al retirar el botón, `details.project-menu` pasa a la zona derecha del header que hoy ocupa Documentación (`.header-docs` con `margin-left:auto`), antes de Ajustes y cuenta.
  3. **Tienda en Administración:** añadir una sección `tienda` al sidebar de Administración para el escritorio de apps. Deja de ser una vista con header propio: el escritorio pierde `.space-topbar` y se muestra con `WorkspaceLayout`, como Alumnos y Profesores. Decidir si Aula Store sigue siendo el catálogo del dock o pasa a sección propia.
  4. **Retirar «Mi espacio» del header:** eliminar `button.space-action`; el acceso pasa por Administración > Tienda. Renombrar en código `SpaceView`/`space` a `StoreView`/`store` en la medida de lo posible, conservando el enlace profundo de MCP.
  5. **Clase al dock:** quitar «Clase» de `nav.main-nav` y convertirla en el elemento principal de `.space-dock`, con icono contextual y estado activo; el dock queda como salida a Clase desde Tienda.
- Qué falta antes de retomarlo:
  - [ ] Cerrar la información: ¿Tienda es el escritorio completo (apps y Aula Store en el dock) o solo el catálogo? ¿«Clase» en el dock vuelve a `view=clase` o conserva `section=calendario`?
  - [ ] Resolver cómo se vuelve a Clase desde Alumnos y Profesores si el dock solo existe dentro de Tienda; valorar marca clicable, dock persistente o una salida en el sidebar.
  - [ ] Fijar URLs canónicas y alias: previsible `view=administracion&section=tienda`; conservar `view=espacio` y `app=<appId>` como alias para no romper enlaces MCP (`abrir_app`, `ui://`), favoritos ni pruebas de rendimiento.
  - [ ] Resolver el choque de nombres: ya existe `AppsStore` (Aula Store) en `app/board/space/store/`; elegir nombres distintos para la vista y el catálogo antes de renombrar.
  - [ ] Definir permisos y visibilidad de Tienda por rol (hoy Mi espacio lo ven todos; la gestión de apps es de propietario y administración).
  - [ ] Revisar cabecera y responsive sin Documentación en 1366, 1024, 900, 620 y 390, con el selector a la derecha.
- Notas técnicas: `header.tsx` (`.header-docs`, `.space-action`, `.project-menu`), `settings-view.tsx` (`SettingsSection` y `WorkspaceLayout`), `lib/domain/board-url.ts` (tipos, `SETTINGS_SECTIONS`, `parseBoardUrl`/`buildBoardUrl` y `app`), `people/administration/administration-view.tsx`, `space/space-view.tsx` (`.space-topbar`, `.space-dock`), `space.css`, `app/board.tsx` (lazy de `SpaceView` y `view === "espacio"`), `lib/server/mcp/enlaces.ts` y `lib/server/mcp/dominios/contexto.ts`. Actualizar pruebas de header, ajustes, URL, MCP y ayuda; `scripts/perf-latency.mjs` y la etiqueta «Mi espacio · abrir» de rendimiento. Sin migraciones ni cambio de versión por el renombrado.
