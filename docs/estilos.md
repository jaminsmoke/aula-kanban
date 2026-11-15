# Sistema visual

> **Estado:** Fases 1-3 completadas (2026-11-15) · Roadmap activo: [`roadmap.md`](roadmap.md)
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

Tras la fase 3, las pantallas de Ajustes, Documentación, Mi espacio y Aula Store, y los shells compartidos, no conservan ningún hexadecimal propio:

| Ámbito actual | Archivos | Líneas | Usos de hex | Hex distintos |
|---|---:|---:|---:|---:|
| Toda la aplicación | 23 | 2.345 | 152 | 130 |
| `app/globals.css` | 1 | 259 | 72 | 72 |
| CSS de feature | 22 | 2.086 | 80 | 58 |

Los CSS de `kanban.css`, `task-dialog.css`, `calendar-view.css`, `class.css`, `buttons.css`, `dialogs.css`, `settings-view.css`, `header.css`, `workspace-layout.css`, `docs.css`, `space.css` y `store.css` quedan a cero. Los 80 usos restantes están en apps, personas y accesibilidad, fuera del alcance de esta fase.

### Archivos con hexadecimales

| Archivo | Líneas | Usos | Distintos |
|---|---:|---:|---:|
| `app/board/apps/edu-tools/edu-tools.css` | 341 | 24 | 18 |
| `app/board/apps/edu-tools/periodic-table/periodic-table-es.css` | 136 | 23 | 22 |
| `app/board/people/people.css` | 75 | 16 | 15 |
| `app/board/styles/access.css` | 37 | 8 | 7 |
| `app/board/apps/blockly/blockly.css` | 77 | 6 | 5 |
| `app/board/apps/mermaid/mermaid.css` | 51 | 3 | 3 |

Los otros 16 CSS de feature —incluidos los seis migrados en fase 2 y los seis de fase 3— no contienen hexadecimales.

## 2. Capas de tokens

| Capa | Prefijo | Uso |
|---|---|---|
| Primitivas | `--primitive-*` | Valores crudos. Solo se declaran en `app/globals.css`; no se consumen en features. |
| Compatibilidad | nombres existentes (`--canvas`, `--ink`, `--line`…) | Mantienen los valores actuales mientras se migran los CSS. No se usan en código nuevo. |
| Semántica de UI | `--ui-*` | Capa estable para el CSS de feature y para los componentes nuevos. |

La fase 1 no cambia ningún selector ni valor visual: los 36 tokens existentes siguen resolviendo al mismo color, ahora a través de una primitiva. La fase 3 deja 54 primitivas y 68 tokens `--ui-*`; los 36 nombres de compatibilidad se conservan intactos.

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

### Acción y foco

| Token de UI | Compatibilidad | Valor |
|---|---|---|
| `--ui-action-primary` | `--violet` | `#5839be` |
| `--ui-action-primary-hover` | `--violet-dark` | `#42299c` |
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
| `--ui-text-shadow-dark` | primitiva propia | `0 1px 4px #0007` |

### Composición

| Token de UI | Valor |
|---|---|
| `--ui-scrim` | `#20173575` |
| `--ui-shadow-card` | `0 2px 3px #29213a08` |
| `--ui-shadow-card-hover` | `0 3px 8px #29213a13` |
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

## 4. Tokens locales pendientes

| Archivo | Tokens locales | Tratamiento |
|---|---|---|
| `edu-tools.css` | `--background`, `--card`, `--surface`, `--border`, `--rule`, `--calc-*` y equivalentes de la librería | Mapear a `--ui-*` al migrar la app; conservar los nombres que exija `@smst/edu-tools`. |
| `docs.css` | `--docs-radius-lg`, `--docs-radius`, `--docs-radius-sm`, `--docs-gap`, `--docs-index-width`, `--docs-art-width` y `--docs-sticky-top` | Solo medidas y radios; los colores ya pasan a `--ui-*`. |
| `kanban.css` | `--accent` y `--accent-bg` por carril | Se conservan como variables locales, pero ya derivan de `--ui-*`; no queda ningún hexadecimal. |

## 5. Reglas de uso

- El CSS de feature consume `--ui-*`; no introduce hexadecimales ni usa `--primitive-*`.
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
| 4 | Limpieza de hexadecimales y guarda | Pendiente. |

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

No hay fallos AA en texto normal o pequeño. El mínimo de la fase 3 es 4,98:1 para texto blanco sobre la acción brillante; la barra de progreso es un elemento gráfico y supera el mínimo de 3:1. La comprobación es numérica; no se hizo una inspección visual en navegador en las fases 2 y 3.
