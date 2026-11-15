# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas aparcadas
> **Nota:** PER-06, PER-07 y PER-08 se cerraron con pruebas controladas y sus limitaciones se documentaron en el changelog. UI-04 y UI-05 recogen la revisión de navegación, fichas y hero del 15/11/2026.

---

## 2026-11-15 — UI-04 · Vista de administración para alumnado y profesorado

- Contexto: `BoardView` es plano (`clase · alumnos · profesores · espacio · ajustes · documentacion`) y la cabecera muestra tres botones de texto. Alumnos y Profesores son dos vistas de página completa que repiten cabecera propia (`eyebrow`, `h1`, intro y botón de alta) y no comparten el sidebar que ya usan Clase (Tareas/Calendario) y Ajustes. `WorkspaceLayout` existe y sirve tal cual para una vista `administracion` con secciones `alumnos` y `profesores`.
- Oportunidad: una sola entrada «Administración» en la cabecera, con el sidebar de secciones, deja sitio para futuras secciones y quita dos botones de la navegación principal. Las vistas pueden conservar su contenido y su carga de datos; lo que cambia es el marco y la URL.
- Decisión pendiente: quién puede abrir Administración. Hoy Alumnos es también la vía del alumnado para ver y editar su propia ficha (`ownStudent`). Si la vista se restringe a propietario, administración y profesorado, hace falta un acceso equivalente para el alumnado (por ejemplo «Mi ficha») para no perder esa capacidad.
- Estados vacíos: con 0 alumnos la vista solo muestra el contador «0 alumnos» y una rejilla vacía, sin explicación ni acción; con 0 profesores queda una frase suelta dentro de la rejilla y el selector de disposición sigue visible. Conviene un estado vacío compartido por ambas fichas, con icono, explicación y alta para quien pueda gestionar, y un texto distinto para quien no.
- Qué falta:
  - [ ] Extender el esquema de URL con `administracion` y sus secciones; conservar `view=alumnos` y `view=profesores` como alias redirigidos a la URL canónica.
  - [ ] Decidir el acceso al alumnado a su propia ficha y reflejarlo en la cabecera y en `obtener_enlace` del MCP.
  - [ ] Mover las dos vistas al sidebar y retirar la cabecera duplicada de cada una.
  - [ ] Diseñar el estado vacío compartido y cubrirlo con pruebas de ambas vistas y de la cabecera.
- **Criterios de aceptación:** una única entrada de navegación para alumnado y profesorado, URLs antiguas que siguen funcionando, ficha propia accesible para el alumnado y estados vacíos que explican qué hacer; pruebas de cabecera, URL, alumnos y profesores en verde.

## 2026-11-15 — UI-05 · Hero del tablero compacto

- Contexto: el hero de Tareas mide 230 px mínimos, 30/34 px de relleno y 32 px de margen arriba y abajo, con un titular a tamaño `--text-display` y un panel de progreso oscuro de 265 px o más. Sumado a la cabecera de 76 px, el kanban empieza hacia los 370 px de alto y en una pantalla de 1366×768 se ve poco más que la primera fila de tarjetas. El contexto («Grupo de clase», «Tablero de tareas») ya lo dan el proyecto activo y la barra «Kanban».
- Oportunidad: dejar una franja compacta con el progreso en línea («3 de 8 · 38 %») y la acción «Nueva tarea», sin repetir el intro ni el panel de 8xl. El progreso sigue siendo el dato útil y el kanban gana la mayor parte del primer pantallazo.
- Qué falta:
  - [ ] Reducir el hero a una franja de una o dos líneas, con objetivo de 120 px de alto y sin panel oscuro independiente.
  - [ ] Mantener `h1`, `progress` accesible y el botón de alta; conservar el estado de invitado y el responsive de 620 y 430 px.
  - [ ] Revisar el hueco con la barra de herramientas para que no queden dos bloques de título seguidos.
- **Criterios de aceptación:** en 1366×768 con la cabecera y el sidebar, la primera tarjeta de la columna izquierda se ve sin desplazar; el progreso sigue anunciándose como «Progreso del grupo»; las pruebas de `kanban-view` siguen pasando.
