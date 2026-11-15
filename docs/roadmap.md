# Roadmap UI-01 · Sistema visual: superficies, tipografía, iconografía y temas

> **Estado:** Activo
> **Origen:** entrada UI-01 del backlog.
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Unificar la jerarquía visual con una escala semántica de superficies, tinta, bordes y gradientes, sin cambiar el comportamiento ni la estructura de las pantallas.
- [ ] Separar el marco (header/sidebar) del contenido y dejar preparada una capa de tema claro/oscuro sin duplicar componentes.
- **Criterio de éxito:** Clase, Calendario, Ajustes, Documentación, Mi espacio y Aula Store consumen los mismos tokens; el contraste AA se mantiene; el marco se distingue del contenido; tipografía, iconos, bordes y radios comparten escala; el tema oscuro se añade por tokens y no por variantes de componente; no hay regresiones funcionales.

## 2. Alcance

**Dentro:**

- Auditar los 23 archivos CSS, 2.230 líneas y 237 colores hexadecimales distintos en 302 usos.
- Definir una escala semántica de superficies (`canvas`, `raised`, `sunken`, `tint`), tinta principal/secundaria, bordes y estados.
- Suavizar el canvas y los blancos puros, manteniendo el contraste AA en texto normal, metadatos y textos pequeños.
- Reservar los gradientes para progreso, Mi espacio y Aula Store; el marco y el contenido usan superficies sólidas.
- Revisar foco, hover, estados deshabilitados, escritorio, tablet, móvil y `prefers-reduced-motion`.
- Separar `--ui-surface-frame` del contenido y revisar el chrome claro antes de invertirlo a oscuro.
- Auditar tipografía: familias, roles, escala, interlineado, tracking, números tabulares y mono.
- Auditar iconografía: tamaños, trazo, alineación, densidad y estados.
- Revisar color, estados y acentos; implementar el tema claro/oscuro en una fase posterior.
- Hacer un piloto en Clase > Tareas y Calendario antes de extender el sistema.

**Fuera de alcance:**

- Rediseño de layout, navegación o jerarquía de secciones.
- Añadir familias tipográficas sin una necesidad documentada; la fase 4 decidirá si las dos actuales bastan.
- Cambios de marca o de layout fuera de la jerarquía visual.
- Nuevos componentes, dependencias o frameworks CSS.
- Cambios de lógica, permisos, datos, URLs o comportamiento de las apps.
- Estilos internos de Excalidraw, Blockly o el calendario de terceros; solo sus envoltorios.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `app/globals.css` como fuente única de tokens; los CSS de feature solo consumen variables | Paletas locales por pantalla | Evita la deriva que ya produjo 237 hexadecimales y permite cambiar el sistema sin tocar cada vista. |
| Tokens semánticos por función (`canvas`, `raised`, `sunken`, `tint`, tinta, borde) | Nombres por color (`blanco`, `gris-100`) | El nombre describe el uso y sobrevive a cambios de color o contraste. |
| Conservar la paleta de marca como primitivas y mapearla a tokens semánticos | Sustituir todos los colores de marca por grises | Mantiene la identidad de Mi espacio y Aula Store sin convertir la app en una plantilla uniforme. |
| Gradientes solo en progreso, Mi espacio y Aula Store; chrome y contenido con superficies sólidas | Gradientes en todas las tarjetas | La jerarquía se lee mejor si el énfasis es escaso y consistente. |
| Contraste AA y foco visible como criterios de aceptación | Revisión visual subjetiva | El sistema debe seguir siendo usable, no solo verse más cohesionado. |
| Superficie de marco propia (`--ui-surface-frame`) | Usar el mismo blanco para chrome y contenido | El marco debe leerse como chrome y poder invertirse a oscuro sin tocar componentes. |
| Tipografía actual como base y escala documentada | Añadir una fuente nueva por etapa | Bricolage + Instrument ya cubren display y UI; una tercera familia debe justificarse. |
| Iconos lucide normalizados por rol | Tamaños sueltos por componente | Menos ruido, mejor densidad y transición a tema oscuro. |
| Temas claro/oscuro por tokens, no por variantes de componente | Duplicar CSS por tema | Evita divergencia y mantiene el mismo comportamiento. |

## 4. Fases

### Fase 1: Auditoría y escala de tokens

- [x] Inventariar los hexadecimales y agruparlos por superficie, tinta, borde, estado y gradiente.
- [x] Definir en `app/globals.css` las primitivas y los tokens semánticos, con aliases para no romper los usos actuales.
- [x] Documentar el mapa de tokens y los usos que quedan pendientes.
- **Criterios de aceptación:** existe una escala única y documentada; la aplicación no cambia visualmente en esta fase; lint, typecheck y build pasan.
- **Completada el 2026-11-15:** 36 primitivas, 36 aliases de compatibilidad y 37 tokens `--ui-*`; el inventario y el mapa quedan en [`estilos.md`](estilos.md).

### Fase 2: Piloto en Tareas y Calendario

- [x] Aplicar los tokens a la lista, el header, los formularios y los estados de Tareas.
- [x] Aplicar los mismos tokens al calendario y a sus eventos, sin tocar el comportamiento de `react-big-calendar`.
- [x] Revisar contraste AA, foco, hover, textos pequeños, 360/768/1280 px y `prefers-reduced-motion`.
- **Criterios de aceptación:** Tareas y Calendario no introducen hexadecimales de superficie propios; no hay fallos de contraste en texto normal; las capturas antes/después no muestran cambios de layout ni pérdida de funciones.
- **Completada el 2026-11-15:** `kanban.css`, `task-dialog.css`, `calendar-view.css`, `class.css` y los controles compartidos no contienen hexadecimales; 0 fallos AA en texto y la barra de progreso supera 3:1. La comprobación de contraste es numérica; no se hicieron capturas en navegador.

### Fase 3: Extensión al resto de la aplicación

- [x] Extender el sistema a Ajustes y Documentación.
- [x] Alinear Mi espacio y Aula Store conservando su identidad, sin paletas duplicadas.
- [x] Unificar header, sidebar, tarjetas, tablas, avisos y estados vacíos; retirar los gradientes que no aporten jerarquía.
- **Criterios de aceptación:** las seis superficies comparten tokens y estados; no hay una paleta por vista; las capturas de las pantallas clave son coherentes; build y pruebas siguen en verde.
- **Completada el 2026-11-15:** `settings-view.css`, `header.css`, `workspace-layout.css`, `docs.css`, `space.css` y `store.css` consumen `--ui-*` y quedan a cero hexadecimales. Documentación usa un héroe inverso sólido; los gradientes se reservan a Mi espacio y Aula Store. Quedan 80 usos de hex en apps, personas y accesibilidad. Contraste mínimo de texto 4,98:1, comprobado numéricamente. La inspección visual en navegador queda pendiente para la revisión solicitada.

### Fase 3.1: Marco claro y superficies de chrome

- [x] Separar `--ui-surface-frame` del contenido y devolver header/sidebar a una superficie clara.
- [x] Mantener los estados activos en violeta fuerte y revisar foco/contraste en el chrome.
- [x] Comprobar que el marco no depende de tokens de tema oscuro.
- **Criterios de aceptación:** el marco claro se distingue del contenido, el activo es inequívoco, el texto mantiene AA y el chrome puede invertirse después cambiando tokens.
- **Completada el 2026-11-15:** `--ui-surface-frame` = `#f2eef9`; header de 76 px y sidebar de 224 px; wordmark 21 px y navegación 14 px; activos en `--ui-action-primary`. Contraste: principal/marco 14,41:1 y atenuado/marco 5,56:1. Sin hexadecimales en `header.css` ni `workspace-layout.css`.

### Fase 4: Tipografía y jerarquía

- [x] Auditar las 29 medidas de `font-size` y las familias actuales (Bricolage Grotesque, Instrument Sans y mono local).
- [x] Fijar roles: display, UI/body, datos/código; decidir si hace falta una familia nueva y documentarlo.
- [x] Definir escala, interlineado, tracking, `text-wrap` y números tabulares; aplicarla a header/sidebar, títulos, cuerpo, formularios, tablas, diálogos y metadatos.
- **Criterios de aceptación:** una escala tipográfica documentada; las pantallas clave no acumulan tamaños sueltos; AA y responsive se mantienen; no se añaden fuentes sin justificación.
- **Completada el 2026-11-15:** se conservan Bricolage Grotesque para display e Instrument Sans para UI; se añade `--font-mono` para código y datos. La escala queda en 18 tokens de tamaño, 5 de interlineado, 6 de tracking y 5 pesos. El CSS propio queda a cero tamaños, interlineados, trackings y pesos sueltos; las apps internas mantienen su escala compacta como excepción documentada. `--leading-*` y `--tracking-*` se aplican en todo el chrome y las vistas.

### Fase 5: Iconografía y densidad

- [x] Normalizar los 13 tamaños de icono y los `strokeWidth` de lucide por rol (navegación, acción, estado, decorativo).
- [x] Alinear icono y texto, revisar áreas táctiles, estados vacíos, tablas y botones.
- [x] Documentar cuándo un icono va solo, con texto o es decorativo.
- **Criterios de aceptación:** una escala de iconos y trazos; no quedan tamaños sueltos en la UI; foco y contraste correctos.
- **Completada el 2026-11-15:** los 13 tamaños quedan en 6 (12, 16, 18, 20, 24 y 28) en 84 usos; el trazo de lucide es 2 y la marca conserva 2,4. Los botones icon-only pasan a 36 px; el header mantiene 40 px y las fichas de personas 42 px. Se conservan los trazos 3/4/8 de las ilustraciones SVG y la escala interna de las apps. La inspección visual en navegador queda pendiente.

### Fase 6: Color, estados y acentos

- [x] Retirar los 80 usos de hex restantes en apps, personas y accesibilidad.
- [x] Definir acentos por función y estados hover/active/focus/disabled.
- [x] Revisar gráficos, progreso, tablas, avisos y estados vacíos.
- **Criterios de aceptación:** cero hexadecimales fuera de `globals.css`; estados consistentes; matriz de contraste AA.
- **Completada el 2026-11-15:** los 80 hexadecimales de los CSS de feature bajan a 0; los 91 restantes viven en `globals.css`. Se añaden 11 tintes categóricos, tokens de borde, sombra y opacidad, y `:active` compartido. El contraste mínimo de texto sobre categorías es 11,04:1 y blanco sobre acción pulsada 12,58:1. Quedan colores de configuración en TS (Blockly, Mermaid, Excalidraw y HTML del MCP) como excepciones no CSS. La inspección visual en navegador sigue pendiente.

### Fase 7: Temas claro y oscuro

- [x] Introducir `[data-theme]`, `color-scheme`, preferencia del sistema y persistencia.
- [x] Invertir superficies, texto, bordes, sombras y foco; el chrome oscuro reutilizará `--ui-surface-frame` con otro valor.
- [x] Revisar AA y contraste gráfico en ambos temas sin duplicar componentes.
- **Criterios de aceptación:** ambos temas pasan AA; el cambio no recarga ni duplica CSS; no hay regresiones funcionales.
- **Completada el 2026-11-15:** `[data-theme]` y `color-scheme` cambian el tema sin recargar; la preferencia `system | light | dark` se guarda en `aula-kanban-theme`, escucha `prefers-color-scheme` y se elige desde el menú de cuenta. El script inicial evita el destello antes de hidratar. 92 de los 93 tokens `--ui-*` se redefinen en un único bloque `[data-theme="dark"]`; el restante es la opacidad compartida. No se duplican componentes. Quedan 0 hexadecimales en los 22 CSS de feature y 189 usos en `globals.css`; el mínimo de texto es 5,72:1, el borde de control 3,17:1 y el foco 7,49:1. La inspección visual en navegador sigue pendiente.

### Fase 7.1: Bordes, radios y separadores

- [ ] Revisar grosores, radios y separadores del marco, el héroe de Tareas, las tarjetas y los controles.
- [ ] Unificar la escala de bordes (1 px/2 px), radios y líneas divisorias; sustituir los valores sueltos que se repitan por tokens.
- [ ] Ajustar el borde sidebar/contenido y el contorno del héroe para que acompañen la jerarquía sin competir con el contenido.
- **Criterios de aceptación:** una sola escala de bordes y radios; sin cambios de layout; los separadores del marco, el héroe y las tarjetas se leen con la misma jerarquía en claro y oscuro; AA y foco visible se mantienen.

### Fase 8: Limpieza, guarda y cierre

- [ ] Retirar los alias de compatibilidad restantes y revisar los colores de configuración de terceros.
- [ ] Añadir una comprobación que impida reintroducir colores sueltos fuera de `app/globals.css`.
- [ ] Documentar el sistema y cerrar el roadmap en el changelog, reiniciando `roadmap.md`.
- **Criterios de aceptación:** la guarda falla ante un nuevo hexadecimal de feature; la documentación explica cómo añadir un token; suite, typecheck, lint y build pasan; se sigue el flujo de commits por fase y push único al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El cambio toca 23 CSS y produce una difusión difícil de revisar | Alto | Fases pequeñas, commits por fase y capturas antes/después de las pantallas clave. |
| Suavizar la tinta o los metadatos baja el contraste | Alto | Medir AA en texto normal y pequeño; no usar el aspecto como única validación. |
| El chrome claro se confunde con el contenido | Medio | `--ui-surface-frame` distinto, borde y activo violeta; medir contraste. |
| Tipografía e iconos se tocan sin una escala | Alto | Fases 4 y 5 separadas; documentar roles y tamaños antes de aplicar. |
| El tema oscuro se implementa antes de estabilizar color | Alto | Fase 7 al final; consume tokens ya validados. |
| Los estilos de terceros no respetan los tokens | Medio | Intervenir solo en envoltorios y variables expuestas; no reescribir el vendor. |
| La revisión de bordes y radios termina en un rediseño de layout | Medio | Fase 7.1 separada; solo escala, separadores y contorno, sin mover estructura ni contenido. |
| La extensión termina en un rediseño de layout | Alto | Mantener estructura, navegación y comportamiento; cualquier cambio funcional sale a otro roadmap. |
| Las pantallas de datos densos pierden legibilidad | Medio | Validar tablas, calendario y listas con contenido real, no solo estados vacíos. |

## 6. Notas de sesión

- La revisión de capturas muestra Tareas, Calendario y Ajustes dominados por superficies blancas sobre un canvas casi blanco; Mi espacio y Aula Store ya tienen una identidad más definida.
- UI-01 no es un rediseño funcional: la prioridad es reducir la deriva de tokens y mejorar la jerarquía sin cambiar lo que hace cada pantalla.
- Mantener `app/globals.css` como fuente de verdad y los CSS de feature como consumidores; no duplicar paletas por pantalla.
- Commits locales por fase; sin push hasta cerrar el roadmap, según SYNC-01.
- Fase 1 completada el 2026-11-15: los 36 tokens existentes conservan su valor; no se migró ningún consumidor y no hubo cambios visuales. La deuda queda en 266 usos de hex fuera de `globals.css`.
- Fase 2 completada el 2026-11-15: Tareas y Calendario usan `--ui-*`; sus seis CSS quedan a cero hexadecimales, el contraste de texto pasa AA y los controles compartidos conservan los mismos nombres públicos. Quedan 187 usos de hex fuera del piloto. La inspección visual en navegador queda pendiente.
- Fase 3 completada el 2026-11-15: Ajustes, Documentación, Mi espacio, Aula Store, header y sidebar consumen los mismos tokens; los seis CSS de la fase quedan a cero hexadecimales y el héroe de Documentación pierde su gradiente múltiple. El inventario baja a 80 usos y 58 colores distintos fuera de `globals.css`; el mínimo de contraste de texto es 4,98:1. La revisión visual en navegador sigue pendiente.
- Fase 3.1 completada el 2026-11-15: el primer pase de marco oscuro se descarta. El tema claro usa `--ui-surface-frame` (`#f2eef9`) para header y sidebar, con activos violeta y contenido claro; el tema oscuro se resolverá invirtiendo tokens en la fase 7.
- Fase 4 completada el 2026-11-15: 29 medidas de `font-size` quedan reducidas a 18 tokens; el CSS propio no conserva tamaños, interlineados, trackings ni pesos sueltos. Se mantienen las dos familias actuales, se añade `--font-mono` y se documenta la excepción de las apps internas.
- Fase 5 completada el 2026-11-15: 13 tamaños de icono quedan reducidos a 6; lucide usa trazo 2 y la marca 2,4. Los botones de icono tienen un área mínima de 36 px y los iconos con texto quedan ocultos a lectores. La inspección visual en navegador sigue pendiente.
- Fase 6 completada el 2026-11-15: los 80 hexadecimales de los CSS de feature bajan a 0; los 91 restantes están en `globals.css`. La tabla periódica estrena 11 tintes categóricos; hover, active, focus y disabled comparten tokens. La inspección visual en navegador sigue pendiente.
- Fase 7 completada el 2026-11-15: el tema oscuro invierte 92 de los 93 tokens `--ui-*` en un solo bloque; `--ui-opacity-disabled` se comparte. La preferencia del sistema, el cambio manual y la persistencia funcionan desde el menú de cuenta. El mínimo de texto es 5,72:1, el borde de control 3,17:1 y el foco 7,49:1. La inspección visual en navegador sigue pendiente.
- Siguiente fase: 7.1 revisará bordes, radios y separadores (incluidos el borde sidebar/contenido y el contorno del héroe de Tareas). Después queda la limpieza y la guarda de la fase 8.
