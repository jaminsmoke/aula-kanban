# Sistema visual

> **Estado:** Fases 1-2 completadas (2026-11-15) · Roadmap activo: [`roadmap.md`](roadmap.md)
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

Tras la fase 2, el piloto de Tareas y Calendario no conserva ningún hexadecimal propio:

| Ámbito actual | Archivos | Líneas | Usos de hex | Hex distintos |
|---|---:|---:|---:|---:|
| Toda la aplicación | 23 | 2.327 | 236 | 186 |
| `app/globals.css` | 1 | 233 | 49 | 49 |
| CSS de feature | 22 | 2.094 | 187 | 145 |

Los CSS de `kanban.css`, `task-dialog.css`, `calendar-view.css`, `class.css`, `buttons.css` y `dialogs.css` quedan a cero. Los 187 usos restantes están en las pantallas de la fase 3.

### Archivos con hexadecimales

| Archivo | Líneas | Usos | Distintos |
|---|---:|---:|---:|
| `app/board/tasks/kanban.css` | 158 | 46 | 42 |
| `app/board/space/space.css` | 59 | 35 | 30 |
| `app/board/docs/docs.css` | 225 | 30 | 29 |
| `app/board/space/store/store.css` | 109 | 30 | 24 |
| `app/board/apps/edu-tools/edu-tools.css` | 341 | 24 | 18 |
| `app/board/apps/edu-tools/periodic-table/periodic-table-es.css` | 136 | 23 | 22 |
| `app/board/people/people.css` | 75 | 16 | 15 |
| `app/board/tasks/dialog/task-dialog.css` | 74 | 16 | 16 |
| `app/board/styles/buttons.css` | 59 | 9 | 9 |
| `app/board/styles/access.css` | 37 | 8 | 7 |
| `app/board/settings/settings-view.css` | 62 | 7 | 7 |
| `app/board/styles/dialogs.css` | 34 | 7 | 7 |
| `app/board/apps/blockly/blockly.css` | 77 | 6 | 5 |
| `app/board/layout/header.css` | 98 | 5 | 4 |
| `app/board/apps/mermaid/mermaid.css` | 51 | 3 | 3 |
| `app/board/class/calendar/calendar-view.css` | 395 | 1 | 1 |

Los otros seis CSS —`class.css`, `workspace-layout.css`, `member-dialog.css`, `project-dialogs.css`, `whiteboard.css` y `authorize.css`— no contienen hexadecimales.

## 2. Capas de tokens

| Capa | Prefijo | Uso |
|---|---|---|
| Primitivas | `--primitive-*` | Valores crudos. Solo se declaran en `app/globals.css`; no se consumen en features. |
| Compatibilidad | nombres existentes (`--canvas`, `--ink`, `--line`…) | Mantienen los valores actuales mientras se migran los CSS. No se usan en código nuevo. |
| Semántica de UI | `--ui-*` | Capa estable para el CSS de feature y para los componentes nuevos. |

La fase 1 no cambia ningún selector ni valor visual: los 36 tokens existentes siguen resolviendo al mismo color, ahora a través de una primitiva. La fase 2 deja 45 primitivas y 51 tokens `--ui-*`; los 36 nombres de compatibilidad se conservan intactos.

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

### Composición

| Token de UI | Valor |
|---|---|
| `--ui-scrim` | `#20173575` |
| `--ui-shadow-card` | `0 2px 3px #29213a08` |
| `--ui-shadow-card-hover` | `0 3px 8px #29213a13` |
| `--ui-shadow-dialog` | `0 18px 70px #20154030` |
| `--ui-shadow-toast` | `0 5px 20px #30225530` |

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
| `docs.css` | `--docs-amber`, `--docs-amber-ink`, `--docs-lavender`, `--docs-surface`, `--docs-surface-soft`, radios y medidas | Mantener solo los tokens propios de la página; superficies y tinta pasan a `--ui-*`. |
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
| 3 | Ajustes, Documentación, Mi espacio y Aula Store | Pendiente. |
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

No hay fallos AA en texto normal o pequeño. La barra de progreso es un elemento gráfico y supera el mínimo de 3:1. La comprobación es numérica; no se hizo una inspección visual en navegador en esta fase.
