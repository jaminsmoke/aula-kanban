# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** PROMO-07B y PROMO-01 activos · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 1 entrada: UI-02 pendiente

---

## 2026-11-16 — UI-02 · Reorganización de la cabecera y el remix en Ajustes

- Contexto: revisión visual de la 1.1.34. La cabecera reparte sus bloques con `justify-content: space-between` y `.main-nav` lleva `margin-left:24px`; el remix vive en el desplegable de proyecto.
- Alcance:
  1. **Marca:** `span.wordmark` (icono, «Aula Kanban» y `v1.1.34 - JaminSmoke`) siempre pegado al borde izquierdo del header, sin que el menú de proyecto ni la navegación lo desplacen; conservar la versión y el autor bajo el nombre.
  2. **Navegación:** `nav.main-nav` centrada en el header y el botón de Clase en el centro geométrico; Administración y el resto de vistas se organizan alrededor sin descentrarlo. Revisar 1366, 1024 y 390 px y el caso sin proyecto.
  3. **Remix:** mover «Haz tu Site de Aula Kanban» (`button.remix-action`) del menú de proyecto a una sección del sidebar de Ajustes (por ejemplo «Tu Site»), con el mismo diálogo; retirarlo del menú de proyectos.
- Archivos: `app/board/layout/header.tsx`, `app/board/layout/header.css`, `app/board.tsx`, `app/board/settings/settings-view.tsx`, `app/board/settings/settings-view.css`, `lib/domain/board-url.ts` y sus pruebas, `app/board/projects/project-dialogs.tsx`.
- Criterios: la marca no se mueve del borde izquierdo; el icono de Clase queda centrado y la navegación no desborda en móvil; el remix solo se ofrece desde Ajustes y la nueva sección tiene URL canónica y pruebas de navegación.
- Notas: no tocar la demo ni los datos; la versión publicada es 1.1.34. Decidir si «Tu Site» es una sección nueva de `SettingsSection` o una entrada dentro de Cuenta; si es sección, actualizar el esquema de URL y sus pruebas.
