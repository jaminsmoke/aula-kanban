# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas aparcadas, cada una extraíble como roadmap independiente
> **Nota:** PER-06, PER-07 y PER-08 se cerraron con pruebas controladas y sus limitaciones se documentaron en el changelog. UI-06 salió al roadmap activo; UI-04 y UI-05 siguen aquí.

---

## 2026-11-15 — UI-04 · Vista de administración para alumnado y profesorado

**Extraíble como roadmap propio:** sí. No depende de UI-05 ni de UI-06; puede absorber el estado vacío de UI-05 si se quiere resolver todo de una vez, pero no es necesario.

- Contexto: `BoardView` es plano (`clase · alumnos · profesores · espacio · ajustes · documentacion`) y la cabecera muestra tres botones de texto. Alumnos y Profesores son dos vistas de página completa que repiten cabecera propia (`eyebrow`, `h1`, intro y botón de alta) y no comparten el sidebar que ya usan Clase (Tareas/Calendario) y Ajustes. `WorkspaceLayout` existe y sirve tal cual para una vista `administracion` con secciones `alumnos` y `profesores`.
- Oportunidad: una sola entrada «Administración» en la cabecera, con el sidebar de secciones, deja sitio para futuras secciones y quita dos botones de la navegación principal. Las vistas pueden conservar su contenido y su carga de datos; lo que cambia es el marco y la URL.
- Decisión pendiente: quién puede abrir Administración. Hoy Alumnos es también la vía del alumnado para ver y editar su propia ficha (`ownStudent`). Si la vista se restringe a propietario, administración y profesorado, hace falta un acceso equivalente para el alumnado (por ejemplo «Mi ficha») para no perder esa capacidad. Esta decisión debe cerrarse antes de la primera fase.
- Qué falta:
  - [ ] Extender el esquema de URL con `administracion` y sus secciones `alumnos` y `profesores`; canonizar la URL nueva y conservar `view=alumnos` y `view=profesores` como alias redirigidos.
  - [ ] Decidir el acceso al alumnado a su propia ficha y reflejarlo en la cabecera, en el sidebar y en `obtener_enlace` del MCP.
  - [ ] Mover las dos vistas al sidebar y retirar la cabecera duplicada de cada una.
  - [ ] Actualizar pruebas de cabecera, URL, alumnos y profesores; comprobar atrás/adelante y enlaces antiguos.
- **Criterios de aceptación:** una única entrada de navegación para alumnado y profesorado, URLs antiguas que siguen funcionando, ficha propia accesible para el alumnado y sidebar utilizable en móvil; pruebas de cabecera, URL y ambas vistas en verde.

## 2026-11-15 — UI-05 · Estados vacíos de las fichas de alumnado y profesorado

**Extraíble como roadmap propio:** sí, y es el más pequeño de los tres. Puede hacerse antes que UI-04 y sobrevivir a él, porque el componente se reutiliza dentro del sidebar.

- Contexto: con 0 alumnos, `StudentsView` solo muestra el contador «0 alumnos» y una rejilla vacía, sin explicación ni acción, mientras el alta vive en un icono `+` de la cabecera. Con 0 profesores queda una frase suelta dentro de la rejilla y el selector de disposición sigue visible aunque no haya nada que alternar. En ambos casos la pantalla parece un boceto.
- Oportunidad: un estado vacío compartido por las dos vistas, con icono, explicación breve y acción de alta solo para quien puede gestionar; para quien no puede, un texto que explique que aún no hay fichas. Evita dos implementaciones distintas y sirve igual dentro del sidebar de UI-04.
- Decisiones abiertas: si el selector de disposición se oculta con 0 fichas (hoy se muestra) y si el alta desde el estado vacío abre el mismo diálogo que el botón `+`.
- Qué falta:
  - [ ] Crear un componente de estado vacío reutilizable para alumnado y profesorado, con variante con y sin permiso de gestión.
  - [ ] Ocultar o deshabilitar el selector de disposición cuando no hay fichas.
  - [ ] Conectar la acción de alta con los diálogos existentes de cada vista.
  - [ ] Cubrir con pruebas los dos estados vacíos y las dos variantes de permiso.
- **Criterios de aceptación:** con 0 fichas se entiende qué falta y qué hacer; el alta funciona desde el propio estado vacío; no aparece el selector de disposición sin fichas; pruebas de alumnos y profesores en verde.
