# Sistema visual

> **Estado:** Fase 1 completada (2026-11-15) · Roadmap activo: [`roadmap.md`](roadmap.md)
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

La fase 1 no cambia ningún selector ni valor visual: los 36 tokens existentes siguen resolviendo al mismo color, ahora a través de una primitiva.

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

### Texto y bordes

| Token de UI | Compatibilidad | Valor |
|---|---|---|
| `--ui-text-primary` | `--ink` | `#211b36` |
| `--ui-text-secondary` | `--ink-soft` | `#4a4458` |
| `--ui-text-muted` | `--muted` | `#625c74` |
| `--ui-text-strong` | `--ink-deep` | `#302255` |
| `--ui-text-inverse` | `--white` | `#fff` |
| `--ui-border-subtle` | `--line-subtle` | `#00000014` |
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
| `kanban.css` | `--accent` y `--accent-bg` por carril | Sustituir por tokens de estado o por variables locales derivadas de `--ui-*`. |

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
| 1 | Inventario, primitivas y tokens `--ui-*` | Completada; 0 consumidores migrados. |
| 2 | Tareas y Calendario | Pendiente; incluye contraste AA, foco y responsive. |
| 3 | Ajustes, Documentación, Mi espacio y Aula Store | Pendiente. |
| 4 | Limpieza de hexadecimales y guarda | Pendiente. |

El contraste AA todavía no se ha medido: es un criterio de la fase 2, no de esta capa fundacional.
