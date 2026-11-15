# Roadmap UI-01 · Sistema visual: superficies, contraste y gradientes

> **Estado:** Activo
> **Origen:** entrada UI-01 del backlog.
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Unificar la jerarquía visual con una escala semántica de superficies, tinta, bordes y gradientes, sin cambiar el comportamiento ni la estructura de las pantallas.
- **Criterio de éxito:** Clase, Calendario, Ajustes, Documentación, Mi espacio y Aula Store consumen los mismos tokens; el contraste AA se mantiene; los hexadecimales sueltos dejan de ser la norma y no hay regresiones funcionales.

## 2. Alcance

**Dentro:**

- Auditar los 23 archivos CSS, 2.230 líneas y 237 colores hexadecimales distintos en 302 usos.
- Definir una escala semántica de superficies (`canvas`, `raised`, `sunken`, `tint`), tinta principal/secundaria, bordes y estados.
- Suavizar el canvas y los blancos puros, manteniendo el contraste AA en texto normal, metadatos y textos pequeños.
- Añadir un gradiente global sutil al marco y al héroe; reservar los gradientes intensos para el progreso, Mi espacio y Aula Store.
- Revisar foco, hover, estados deshabilitados, escritorio, tablet, móvil y `prefers-reduced-motion`.
- Hacer un piloto en Clase > Tareas y Calendario antes de extender el sistema.

**Fuera de alcance:**

- Rediseño de layout, navegación o jerarquía de secciones.
- Modo oscuro, nuevas tipografías o cambios de marca.
- Nuevos componentes, dependencias o frameworks CSS.
- Cambios de lógica, permisos, datos, URLs o comportamiento de las apps.
- Estilos internos de Excalidraw, Blockly o el calendario de terceros; solo sus envoltorios.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `app/globals.css` como fuente única de tokens; los CSS de feature solo consumen variables | Paletas locales por pantalla | Evita la deriva que ya produjo 237 hexadecimales y permite cambiar el sistema sin tocar cada vista. |
| Tokens semánticos por función (`canvas`, `raised`, `sunken`, `tint`, tinta, borde) | Nombres por color (`blanco`, `gris-100`) | El nombre describe el uso y sobrevive a cambios de color o contraste. |
| Conservar la paleta de marca como primitivas y mapearla a tokens semánticos | Sustituir todos los colores de marca por grises | Mantiene la identidad de Mi espacio y Aula Store sin convertir la app en una plantilla uniforme. |
| Gradiente global sutil; intensidad reservada a progreso, Mi espacio y Aula Store | Gradientes en todas las tarjetas | La jerarquía se lee mejor si el énfasis es escaso y consistente. |
| Contraste AA y foco visible como criterios de aceptación | Revisión visual subjetiva | El sistema debe seguir siendo usable, no solo verse más cohesionado. |
| Sin modo oscuro en este roadmap | Incluirlo ahora | Duplicaría el alcance y multiplicaría la revisión de contraste antes de estabilizar los tokens claros. |

## 4. Fases

### Fase 1: Auditoría y escala de tokens

- [x] Inventariar los hexadecimales y agruparlos por superficie, tinta, borde, estado y gradiente.
- [x] Definir en `app/globals.css` las primitivas y los tokens semánticos, con aliases para no romper los usos actuales.
- [x] Documentar el mapa de tokens y los usos que quedan pendientes.
- **Criterios de aceptación:** existe una escala única y documentada; la aplicación no cambia visualmente en esta fase; lint, typecheck y build pasan.
- **Completada el 2026-11-15:** 36 primitivas, 36 aliases de compatibilidad y 37 tokens `--ui-*`; el inventario y el mapa quedan en [`estilos.md`](estilos.md).

### Fase 2: Piloto en Tareas y Calendario

- [ ] Aplicar los tokens a la lista, el header, los formularios y los estados de Tareas.
- [ ] Aplicar los mismos tokens al calendario y a sus eventos, sin tocar el comportamiento de `react-big-calendar`.
- [ ] Revisar contraste AA, foco, hover, textos pequeños, 360/768/1280 px y `prefers-reduced-motion`.
- **Criterios de aceptación:** Tareas y Calendario no introducen hexadecimales de superficie propios; no hay fallos de contraste en texto normal; las capturas antes/después no muestran cambios de layout ni pérdida de funciones.

### Fase 3: Extensión al resto de la aplicación

- [ ] Extender el sistema a Ajustes y Documentación.
- [ ] Alinear Mi espacio y Aula Store conservando su identidad, sin paletas duplicadas.
- [ ] Unificar header, sidebar, tarjetas, tablas, avisos y estados vacíos; retirar los gradientes que no aporten jerarquía.
- **Criterios de aceptación:** las seis superficies comparten tokens y estados; no hay una paleta por vista; las capturas de las pantallas clave son coherentes; build y pruebas siguen en verde.

### Fase 4: Limpieza, guarda y cierre

- [ ] Retirar los hexadecimales restantes de los CSS de feature, salvo los casos justificados de terceros.
- [ ] Añadir una comprobación que impida reintroducir colores sueltos fuera de `app/globals.css`.
- [ ] Documentar el sistema y cerrar el roadmap en el changelog, reiniciando `roadmap.md`.
- **Criterios de aceptación:** la guarda falla ante un nuevo hexadecimal de feature; la documentación explica cómo añadir un token; suite, typecheck, lint y build pasan; se sigue el flujo de commits por fase y push único al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El cambio toca 23 CSS y produce una difusión difícil de revisar | Alto | Fases pequeñas, commits por fase y capturas antes/después de las pantallas clave. |
| Suavizar la tinta o los metadatos baja el contraste | Alto | Medir AA en texto normal y pequeño; no usar el aspecto como única validación. |
| Los estilos de terceros no respetan los tokens | Medio | Intervenir solo en envoltorios y variables expuestas; no reescribir el vendor. |
| La extensión termina en un rediseño de layout | Alto | Mantener estructura, navegación y comportamiento; cualquier cambio funcional sale a otro roadmap. |
| Las pantallas de datos densos pierden legibilidad | Medio | Validar tablas, calendario y listas con contenido real, no solo estados vacíos. |

## 6. Notas de sesión

- La revisión de capturas muestra Tareas, Calendario y Ajustes dominados por superficies blancas sobre un canvas casi blanco; Mi espacio y Aula Store ya tienen una identidad más definida.
- UI-01 no es un rediseño funcional: la prioridad es reducir la deriva de tokens y mejorar la jerarquía sin cambiar lo que hace cada pantalla.
- Mantener `app/globals.css` como fuente de verdad y los CSS de feature como consumidores; no duplicar paletas por pantalla.
- Commits locales por fase; sin push hasta cerrar el roadmap, según SYNC-01.
- Fase 1 completada el 2026-11-15: los 36 tokens existentes conservan su valor; no se migró ningún consumidor y no hubo cambios visuales. La deuda queda en 266 usos de hex fuera de `globals.css`.
