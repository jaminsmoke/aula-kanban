# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** UI-04 · Vista de administración · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 1 entrada aparcada, extraíble como roadmap independiente
> **Nota:** PER-06, PER-07 y PER-08 se cerraron con pruebas controladas y sus limitaciones se documentaron en el changelog. UI-04 y UI-06 salieron al roadmap activo; UI-05 sigue aquí.

---

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
