# Sistema visual

> **Estado:** Fases 1-7 completadas; fase 7.1 pendiente (2026-11-15) · Roadmap activo: [`roadmap.md`](roadmap.md)
> **Fuente de verdad:** [`../app/globals.css`](../app/globals.css)

---

## 1. Inventario

La auditoría de la fase 1 midió todo el CSS propio del repositorio, sin contar dependencias ni artefactos de build:

| Ámbito | Archivos | Líneas | Usos de hex | Hex distintos |
|---|---:|---:|---:|---:|
| Toda la aplicación | 23 | 2.230 | 302 | 237 |
| `app/globals.css` | 1 | 135 | 36 | 36 |
| CSS de feature | 22 | 2.095 | 266 | 208 |

Los 36 hexadecimales de `globals.css` ya son la base central. La deuda está en los **266 usos y 208 colores distintos** repartidos por los CSS de feature.

Tras la fase 7, las pantallas de Ajustes, Documentación, Mi espacio y Aula Store, y los shells compartidos, no conservan ningún hexadecimal propio:

| Ámbito actual | Archivos | Líneas | Usos de hex | Hex distintos |
|---|---:|---:|---:|---:|
| Toda la aplicación | 23 | 2.514 | 189 | 161 |
| `app/globals.css` | 1 | 438 | 189 | 161 |
| CSS de feature | 22 | 2.076 | 0 | 0 |

Los 22 CSS de feature quedan a cero hexadecimales. Los 189 usos restantes viven en `app/globals.css`, la única fuente de color crudo; los valores del tema oscuro se añaden al mismo archivo.

### Hexadecimales fuera de globals.css

No queda ninguno en los CSS de feature. Las únicas excepciones son colores de configuración que no pasan por CSS: categorías de Blockly (`blockly-toolbox.ts`), tema de Mermaid (`mermaid-render.ts`), paleta de presencia de Excalidraw (`whiteboard-model.ts`), rejilla de Blockly (`use-blockly.ts`) y el HTML aislado del recurso MCP (`lib/server/mcp/ui-apertura.ts`). Se revisarán si esas librerías permiten consumir tokens.

## 2. Capas de tokens

| Capa | Prefijo | Uso |
|---|---|---|
| Primitivas | `--primitive-*` | Valores crudos. Solo se declaran en `app/globals.css`; no se consumen en features. |
| Compatibilidad | nombres existentes (`--canvas`, `--ink`, `--line`…) | Mantienen los valores actuales mientras se migran los CSS. No se usan en código nuevo. |
| Semántica de UI | `--ui-*` | Capa estable para el CSS de feature y para los componentes nuevos. |

La fase 1 no cambia ningún selector ni valor visual: los 36 tokens existentes siguen resolviendo al mismo color, ahora a través de una primitiva. La fase 7 deja 70 primitivas, 93 tokens `--ui-*` y 36 nombres de compatibilidad. 92 tokens se redefinen en `[data-theme="dark"]`; `--ui-opacity-disabled` es el único que se comparte. `--ui-surface-frame` separa el chrome del contenido y se invierte en el tema oscuro sin tocar los componentes.

## 3. Mapa semántico

### Superficies

| Token de UI | Compatibilidad | Valor |
|---|---|---|
| `--ui-surface-page` | `--canvas` | `#f7f8fc` |
| `--ui-surface-raised` | `--white` | `#fff` |
| `--ui-surface-recessed` | `--surface-sunken` | `#eceaf2` |
| `--ui-surface-muted` | `--surface-muted` | `#eeecf5` |
| `--ui-surface-hover` | `--surface-hover` | `#f5f2fb` |
| `--ui-surface-tint` | `--surface-tint` | `#ece8f6` |
| `--ui-surface-faint` | `--surface-faint` | `#f7f5fd` |
| `--ui-surface-pale` | `--surface-pale` | `#fbfaff` |
| `--ui-surface-inverse` | `--ink-deep` | `#302255` |
| `--ui-surface-frame` | primitiva propia | `#f2eef9` |
| `--ui-surface-on-dark-subtle` | primitiva propia | `#ffffff1f` |
| `--ui-surface-on-dark-hover` | primitiva propia | `#ffffff33` |

### Texto y bordes

| Token de UI | Compatibilidad | Valor |
|---|---|---|
| `--ui-text-primary` | `--ink` | `#211b36` |
| `--ui-text-secondary` | `--ink-soft` | `#4a4458` |
| `--ui-text-muted` | `--muted` | `#625c74` |
| `--ui-text-strong` | `--ink-deep` | `#302255` |
| `--ui-text-inverse` | `--white` | `#fff` |
| `--ui-text-on-dark-muted` | primitiva propia | `#e9defd` |
| `--ui-text-on-dark-strong` | primitiva propia | `#cfbcff` |
| `--ui-icon-on-dark` | primitiva propia | `#c4aaff` |
| `--ui-border-subtle` | `--line-subtle` | `#00000014` |
| `--ui-border-on-dark` | primitiva propia | `#ffffff12` |
| `--ui-border-warning` | primitiva propia | `#f0d9a8` |
| `--ui-border-danger` | primitiva propia | `#f2cdd9` |
| `--ui-border-success` | primitiva propia | `#b9dfcf` |
| `--ui-border-default` | `--line` | `#e7e4ef` |
| `--ui-border-strong` | `--line-strong` | `#e0daef` |
| `--ui-border-control` | `--line-control` | `#ded9ea` |
| `--ui-border-soft` | `--line-soft` | `#e4e0ed` |
| `--ui-border-accent` | `--line-violet` | `#ddd6ee` |
| `--ui-border-accent-strong` | primitiva propia | `#bca7e9` |
| `--ui-border-predicted` | primitiva propia | `#8f7bbd` |

### Acción y foco

| Token de UI | Compatibilidad | Valor |
|---|---|---|
| `--ui-action-primary` | `--violet` | `#5839be` |
| `--ui-action-primary-hover` | `--violet-dark` | `#42299c` |
| `--ui-action-pressed` | primitiva propia | `#352080` |
| `--ui-action-text` | `--violet` | `#5839be` |
| `--ui-action-text-hover` | `--violet-dark` | `#42299c` |
| `--ui-action-soft` | `--violet-pale` | `#eeebfb` |
| `--ui-action-bright` | `--violet-bright` | `#7859d8` |
| `--ui-focus-ring` | `--focus` | `#7656dd` |
| `--ui-focus-on-dark` | `--focus-on-dark` | `#cdb4ff` |
| `--ui-action-on-dark-hover` | primitiva propia | `#493668` |
| `--ui-progress-track` | primitiva propia | `#584777` |
| `--ui-accent-amber` | primitiva propia | `#febc2e` |
| `--ui-accent-amber-ink` | primitiva propia | `#8a6100` |
| `--ui-accent-lavender` | primitiva propia | `#b7a8ee` |
| `--ui-glow-primary` | primitiva propia | `#5839be66` |
| `--ui-glow-primary-soft` | primitiva propia | `#5839be55` |
| `--ui-glow-primary-faint` | primitiva propia | `#5839be26` |
| `--ui-text-shadow-dark` | primitiva propia | `0 1px 4px #0007` |

### Composición

| Token de UI | Valor |
|---|---|
| `--ui-scrim` | `#20173575` |
| `--ui-shadow-card` | `0 2px 3px #29213a08` |
| `--ui-shadow-card-hover` | `0 3px 8px #29213a13` |
| `--ui-shadow-float` | `0 16px 48px #3022550d` |
| `--ui-shadow-control` | `0 1px 3px #30225520` |
| `--ui-shadow-inset` | `inset 0 1px 3px #30225514` |
| `--ui-shadow-dialog` | `0 18px 70px #20154030` |
| `--ui-shadow-toast` | `0 5px 20px #30225530` |
| `--ui-shadow-popover` | `0 12px 35px #30225526` |
| `--ui-shadow-hero` | `0 10px 28px #30225533` |
| `--ui-shadow-window` | `0 24px 60px #00000055, 0 0 0 1px #00000022` |
| `--ui-shadow-tool` | `0 6px 16px #00000038, inset 0 1px #ffffff59` |
| `--ui-shadow-dock` | `0 14px 32px -12px #3a1d86a6, 0 2px 8px #00000024, inset 0 1px 0 #ffffff4d` |
| `--ui-shadow-dock-hover` | `0 22px 44px -14px #5b34c9b8, 0 3px 10px #00000026, inset 0 1px 0 #ffffff73` |
| `--ui-shadow-detail` | `0 30px 80px #00000066` |
| `--ui-shadow-mark` | `0 6px 14px #5839be33` |

### Estados

| Token de UI | Compatibilidad | Valor |
|---|---|---|
| `--ui-danger` | `--danger` | `#a52545` |
| `--ui-danger-text` | `--danger` | `#a52545` |
| `--ui-danger-solid` | `--danger` | `#a52545` |
| `--ui-danger-solid-hover` | `--danger-deep` | `#842746` |
| `--ui-danger-ink` | `--danger-ink` | `#8f1d2c` |
| `--ui-danger-soft` | `--danger-soft` | `#fff1f6` |
| `--ui-danger-deep` | `--danger-deep` | `#842746` |
| `--ui-success` | `--success` | `#176a50` |
| `--ui-success-soft` | `--success-soft` | `#daf1e8` |
| `--ui-warning-ink` | `--warning-ink` | `#936013` |
| `--ui-warning-soft` | `--warning-soft` | `#fff1d9` |
| `--ui-warning-pale` | `--warning-pale` | `#fff8e6` |
| `--ui-warning-deep` | `--warning-deep` | `#7a5b00` |
| `--ui-info-ink` | `--info-ink` | `#315a9f` |
| `--ui-info-soft` | `--info-soft` | `#e6eefc` |
| `--ui-opacity-disabled` | — | `.55` |

### Acentos por función

| Función | Tokens |
|---|---|
| Acción | `--ui-action-primary`, `--ui-action-primary-hover`, `--ui-action-pressed`, `--ui-action-text`, `--ui-action-text-hover`, `--ui-action-soft` |
| Información | `--ui-info-ink`, `--ui-info-soft` |
| Éxito | `--ui-success`, `--ui-success-soft` |
| Aviso | `--ui-warning-ink`, `--ui-warning-soft`, `--ui-warning-pale`, `--ui-warning-deep` |
| Peligro | `--ui-danger`, `--ui-danger-text`, `--ui-danger-solid`, `--ui-danger-solid-hover`, `--ui-danger-ink`, `--ui-danger-soft`, `--ui-danger-deep` |

Los estados usan `--ui-surface-hover` y `--ui-action-primary-hover` para hover; `--ui-action-pressed` y `--ui-surface-recessed` para active; `--ui-focus-ring` para foco; y `--ui-opacity-disabled` para deshabilitado. `--ui-action-primary` pinta fondos sólidos y `--ui-action-text` pinta texto, enlaces e iconos; `--ui-danger-solid` pinta fondos de peligro y `--ui-danger-text` pinta su texto. La tabla periódica tiene 11 tintes categóricos, de `--ui-category-alkali` a `--ui-category-unknown`; el texto principal mantiene al menos 11,04:1 sobre ellos en claro y 9,41:1 en oscuro.

### Tema oscuro

El tema se resuelve en `app/theme.ts` y se aplica con `data-theme` y `color-scheme` en el elemento `<html>`. La preferencia `system | light | dark` se guarda en `localStorage` con la clave `aula-kanban-theme`; `useTheme` escucha los cambios de `prefers-color-scheme`, y el selector vive en el menú de cuenta. El script inicial se inyecta en `<head>` desde `app/layout.tsx` para que no haya destello claro antes de hidratar.

| Rol | Claro | Oscuro |
|---|---:|---:|
| Página | `#f7f8fc` | `#14111f` |
| Elevada | `#fff` | `#211c2e` |
| Marco | `#f2eef9` | `#1a1524` |
| Atenuada | `#eeecf5` | `#2a2438` |
| Texto principal | `#211b36` | `#f4f1fb` |
| Texto atenuado | `#625c74` | `#b4abc5` |
| Borde de control | `#ded9ea` | `#806b96` |
| Acción sólida | `#5839be` | `#6f4bd8` |
| Texto de acción | `#5839be` | `#c4aaff` |
| Peligro sólido | `#a52545` | `#b83255` |
| Texto de peligro | `#a52545` | `#ffadc0` |
| Foco | `#7656dd` | `#c4aaff` |

El bloque `[data-theme="dark"]` va después de `:root` y solo redefine tokens y `color-scheme`: no duplica selectores de componentes. Las apps internas conservan su escala compacta, pero consumen los mismos tokens de color.

### Tipografía

| Grupo | Tokens | Uso |
|---|---|---|
| Familias | `--font-display`, `--font-body`, `--font-mono` | Títulos, interfaz y código/datos. |
| Escala | `--text-2xs` a `--text-8xl` y cuatro `--text-display-*` | De 10 a 48 px; las variantes display usan `clamp()`. |
| Interlineado | `--leading-none` a `--leading-relaxed` | De 1 a 1,65 según la densidad del texto. |
| Tracking | `--tracking-tighter` a `--tracking-caps` | Títulos, cuerpo, metadatos y etiquetas en mayúsculas. |
| Pesos | `--weight-regular` a `--weight-extrabold` | 400, 500, 600, 700 y 800. |

La fase 4 mantiene dos familias —Bricolage Grotesque para display e Instrument Sans para UI— y añade una pila mono para código y datos. El CSS propio usa solo estos tokens; las apps internas (`edu-tools`, `periodic-table`, `blockly` y `mermaid`) conservan su escala compacta como excepción documentada.

### Iconografía

| Rol | Tamaño | Uso |
|---|---:|---|
| Metadato | 12 px | Prioridad, fechas y controles dentro de chips o filtros compactos. |
| Control | 16 px | Botones, formularios, buscadores, menús y acciones de tabla. |
| Navegación | 18 px | Header, sidebar, títulos de sección y acciones principales. |
| Sección | 20 px | Cabeceras de bloque, cierre de diálogo y estados vacíos. |
| Superficie | 24 px | Marca, accesos de Aula Store y ventanas destacadas. |
| Escritorio | 28 px | Iconos de apps en Mi espacio. |

Los iconos de lucide usan `strokeWidth={2}`; la marca conserva `2.4` para no perder presencia a 24 px. Las ilustraciones SVG de Documentación no son iconos de interfaz y conservan sus trazos artísticos. Las apps internas mantienen su escala compacta como excepción.

## 4. Tokens locales pendientes

| Archivo | Tokens locales | Tratamiento |
|---|---|---|
| `edu-tools.css` | `--background`, `--card`, `--surface`, `--border`, `--rule`, `--calc-*` y equivalentes de la librería | Mapear a `--ui-*` al migrar la app; conservar los nombres que exija `@smst/edu-tools`. |
| `docs.css` | `--docs-radius-lg`, `--docs-radius`, `--docs-radius-sm`, `--docs-gap`, `--docs-index-width`, `--docs-art-width` y `--docs-sticky-top` | Solo medidas y radios; los colores ya pasan a `--ui-*`. |
| `kanban.css` | `--accent` y `--accent-bg` por carril | Se conservan como variables locales, pero ya derivan de `--ui-*`; no queda ningún hexadecimal. |
| Apps internas | Escala compacta de `edu-tools`, `periodic-table`, `blockly` y `mermaid` | Excepción de fase 4: sus controles densos conservan medidas propias; desde la fase 6 todos sus colores usan tokens. |

## 5. Reglas de uso

- El CSS de feature consume `--ui-*`; no introduce hexadecimales ni usa `--primitive-*`.
- El chrome (header/sidebar) usa `--ui-surface-frame`; no reutiliza `--ui-surface-inverse`, reservada a superficies de contenido oscuras.
- El tema oscuro cambia valores de tokens, no selectores ni variantes de componente; `data-theme` y `color-scheme` son la única puerta de entrada.
- Usa `--ui-action-text` para texto, enlaces e iconos; `--ui-action-primary` se reserva para fondos sólidos. Para peligro, usa `--ui-danger-solid` en fondos y `--ui-danger-text` en texto.
- La tipografía usa `--text-*`, `--leading-*`, `--tracking-*`, `--weight-*` y las familias de `globals.css`; no se añaden tamaños ni pesos sueltos.
- La iconografía usa 12, 16, 18, 20, 24 y 28 px con trazo 2; la marca usa 2,4. No se añaden tamaños ni trazos sueltos; las ilustraciones SVG y las apps internas son la excepción.
- Un icono solo dentro de un botón exige `aria-label` y un área mínima de 36 × 36 px. Un icono junto a texto se oculta con `aria-hidden`; el texto sigue siendo la etiqueta. Un icono decorativo se oculta y no recibe foco.
- Los acentos por función usan la familia `--ui-action-*`, los estados semánticos y `--ui-category-*` solo para las categorías de la tabla periódica. No se crean acentos por pantalla.
- Todo control interactivo comparte hover, active, focus y disabled; los colores de estado no se escriben en el CSS de feature.
- Las primitivas solo se declaran en `app/globals.css`.
- Los nombres de compatibilidad se mantienen hasta completar la migración; no se añaden usos nuevos.
- Los estados usan los tokens `--ui-danger-*`, `--ui-success-*`, `--ui-warning-*` e `--ui-info-*`.
- Los estilos de terceros se adaptan desde el envoltorio; no se reescriben sus CSS internos.
- Cualquier color nuevo debe entrar primero como primitiva y después como token semántico si tiene un uso de UI.

## 6. Estado de migración

| Fase | Ámbito | Estado |
|---|---|---|
| 1 | Inventario, primitivas y tokens `--ui-*` | Completada. |
| 2 | Tareas y Calendario | Completada; sin hexadecimales propios y con contraste AA verificado. |
| 3 | Ajustes, Documentación, Mi espacio y Aula Store | Completada; sin hexadecimales propios, gradientes solo en Mi espacio y Aula Store y contraste AA verificado numéricamente. |
| 3.1 | Marco claro y superficies de chrome | Completada; `--ui-surface-frame` `#f2eef9`, activos violeta y contraste AA. |
| 4 | Tipografía y jerarquía | Completada; 18 tokens de tamaño, 5 de interlineado, 6 de tracking y 5 pesos; sin medidas sueltas en el CSS propio. |
| 5 | Iconografía y densidad | Completada; seis tamaños, trazo 2 (marca 2,4) y áreas táctiles de 36 px. |
| 6 | Color, estados y acentos | Completada; cero hexadecimales en CSS de feature, 11 categorías y estados compartidos. |
| 7 | Temas claro y oscuro | Completada; preferencia del sistema, cambio manual, persistencia y 92 tokens invertidos en un único bloque. |
| 7.1 | Bordes, radios y separadores | Pendiente; revisará grosores, radios y los separadores del marco y el héroe. |
| 8 | Limpieza, guarda y cierre | Pendiente. |

### Contraste de la fase 2

| Pareja | Ratio |
|---|---:|
| Texto principal / superficie elevada | 16,47:1 |
| Texto secundario / superficie elevada | 9,30:1 |
| Texto atenuado / superficie atenuada | 5,44:1 |
| Texto atenuado / tinte | 5,28:1 |
| Acción / fondo de acción | 6,53:1 |
| Peligro / fondo de peligro | 6,50:1 |
| Éxito / fondo de éxito | 5,52:1 |
| Aviso / fondo de aviso | 4,80:1 |
| Información / fondo de información | 5,82:1 |
| Texto atenuado / superficie inversa | 10,99:1 |
| Progreso / pista oscura (gráfico) | 4,48:1 (>3:1) |

### Contraste de la fase 3

| Pareja | Ratio |
|---|---:|
| Texto atenuado / superficie elevada | 6,36:1 |
| Texto atenuado / página | 5,99:1 |
| Texto fuerte / acción suave | 12,06:1 |
| Acción hover / acción suave | 8,83:1 |
| Ámbar / superficie inversa | 8,38:1 |
| Ámbar tinta / aviso pálido | 5,23:1 |
| Peligro profundo / peligro suave | 8,12:1 |
| Blanco / acción brillante | 4,98:1 |
| Texto atenuado / superficie faint | 5,88:1 |

### Contraste del marco claro

| Pareja | Ratio |
|---|---:|
| Texto principal / marco | 14,41:1 |
| Texto atenuado / marco | 5,56:1 |
| Blanco / acción primaria | 7,65:1 |

### Contraste de la fase 6

| Pareja | Ratio |
|---|---:|
| Texto principal / categoría de lantánidos | 11,04:1 |
| Blanco / acción pulsada | 12,58:1 |

### Contraste de la fase 7 (tema oscuro)

| Pareja | Ratio |
|---|---:|
| Texto principal / página | 16,66:1 |
| Texto principal / elevada | 14,82:1 |
| Texto atenuado / elevada | 7,54:1 |
| Texto atenuado / superficie atenuada | 6,80:1 |
| Acción texto / acción suave | 7,37:1 |
| Blanco / acción sólida | 5,72:1 |
| Blanco / peligro sólido | 5,79:1 |
| Peligro texto / peligro suave | 8,57:1 |
| Borde de control / superficie atenuada | 3,17:1 |
| Foco / superficie atenuada | 7,49:1 |
| Blanco / acción brillante (icono) | 3,79:1 |
| Texto principal / categoría más oscura | 9,41:1 |

No hay fallos AA en texto normal o pequeño. El mínimo de la fase 3 es 4,98:1 para texto blanco sobre la acción brillante; en el marco, el mínimo es 5,56:1 para texto atenuado. La barra de progreso es un elemento gráfico y supera el mínimo de 3:1. En el tema oscuro, el mínimo de texto es 5,72:1, el borde de control 3,17:1 y el foco 7,49:1. La comprobación es numérica; no se hizo una inspección visual en navegador en las fases 2-7.
