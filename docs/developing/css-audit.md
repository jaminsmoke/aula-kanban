# Auditoría de CSS y sistema visual

> **Estado:** Fase 1 de ARC-04 · **Fecha:** 2026-11-20
> **Alcance:** 46 archivos CSS de `app/`, tokens, primitivas, layout, apps, presupuestos y deuda `features → layout`.
> **Regla:** esta fase no cambia estilos; solo inventaría, clasifica y fija el contrato de capas.

## 1. Resumen

- **46 archivos CSS**, **8.900 líneas con contenido**.
- `globals.css` ya contiene una capa de primitivas (`--primitive-*`) y tokens semánticos (`--ui-*`).
- `app/board/styles/` ya tiene primitivas compartidas para botones, diálogos y acceso.
- `app/board/layout/` contiene layout del shell; cinco vistas de `features` todavía importan esas primitivas directamente.
- Las dos excepciones de `largeCss` son `portada.css` (628) y `tarjetas.css` (547).
- La deuda no es “no hay sistema”, sino que las capas no están declaradas y las apps duplican patrones.

## 2. Contrato de capas

| Capa | Ubicación | Responsabilidad | Puede importar |
|---|---|---|---|
| Tokens | `app/globals.css` | Variables crudas y semánticas, fuentes, colores, foco | Nada de apps |
| Base | `app/globals.css` | Reset, `body`, tipografía, selección, scrollbars | Tokens |
| Primitivas | `app/board/styles/` | Botones, diálogos, avisos, iconos, estados compartidos | Tokens/base |
| Layout | `app/board/layout/` y futuro `app/board/shared/ui/` | Ventanas, barras, estructura y controles de layout | Tokens/primitivas |
| Apps | `app/board/apps/`, `features`, `shared` | Estilos propios de cada flujo | Tokens/primitivas/layout compartido |
| Shell/páginas | `app/portada.css`, `app/legal/`, `app/oauth/`, `app/board/**` | Estilos de página o feature | Tokens/primitivas/layout |

Reglas:

1. Un feature no importa CSS de `app/board/layout`; usa la primitiva compartida.
2. `globals.css` no recibe clases de una app concreta.
3. Una primitiva nueva necesita dos consumidores reales o una justificación escrita.
4. Cada app conserva su CSS y su carga diferida; no se mueve a `globals.css` por comodidad.
5. Los límites del checker se miden en líneas con contenido: CSS <500, código <600, pruebas <600 y shell <450.

## 3. Inventario por capa

### Tokens y base

| Archivo | Líneas |
|---|---:|
| `app/globals.css` | 439 |

### Primitivas compartidas

| Archivo | Líneas |
|---|---:|
| `app/board/styles/buttons.css` | 57 |
| `app/board/styles/dialogs.css` | 30 |
| `app/board/styles/access.css` | 33 |

### Layout

| Archivo | Líneas |
|---|---:|
| `app/board/layout/header.css` | 94 |
| `app/board/layout/workspace-layout.css` | 36 |

### Shared

| Archivo | Líneas |
|---|---:|
| `app/board/shared/office/office-viewer.css` | 444 |
| `app/board/shared/aula-documentos/presentation.css` | 265 |
| `app/board/shared/mermaid/gantt-editor.css` | 131 |
| `app/board/shared/whiteboard/whiteboard.css` | 9 |

### Apps y páginas

| Archivo | Líneas |
|---|---:|
| `app/portada.css` | 628 |
| `app/board/apps/tarjetas/tarjetas.css` | 547 |
| `app/board/apps/timeline/timeline.css` | 437 |
| `app/board/apps/aula-documentos/styles/blocks.css` | 419 |
| `app/board/apps/aula-documentos/styles/sidebar.css` | 415 |
| `app/board/apps/aula-documentos/styles/layout.css` | 407 |
| `app/board/apps/ajedrez/ajedrez.css` | 384 |
| `app/board/apps/hoja-calculo/hoja-calculo.css` | 352 |
| `app/board/people/people.css` | 345 |
| `app/board/class/calendar/calendar-view.css` | 331 |
| `app/board/apps/moleculas/moleculas.css` | 309 |
| `app/board/apps/mapas/mapas.css` | 287 |
| `app/board/apps/aula-documentos/styles/dialogs.css` | 285 |
| `app/board/apps/geometria/geometria.css` | 235 |
| `app/board/docs/docs.css` | 219 |
| `app/board/apps/aula-documentos/styles/editor.css` | 216 |
| `app/board/apps/fisica/fisica.css` | 206 |
| `app/board/store/catalog/store.css` | 197 |
| `app/legal/legal.css` | 197 |
| `app/board/tasks/kanban.css` | 142 |
| `app/board/apps/calculadora/calculadora.css` | 124 |
| `app/board/settings/settings-view.css` | 115 |
| `app/board/class/personal-space.css` | 101 |
| `app/board/apps/tabla-periodica/periodic-table/periodic-table-es.css` | 80 |
| `app/board/tasks/dialog/task-dialog.css` | 72 |
| `app/board/class/books-folder.css` | 65 |
| `app/board/apps/edu-base.css` | 51 |
| `app/board/store/store-desktop.css` | 48 |
| `app/board/apps/blockly/blockly.css` | 39 |
| `app/board/apps/aula-documentos/styles/table.css` | 36 |
| `app/board/class/class.css` | 25 |
| `app/board/projects/member-dialog.css` | 14 |
| `app/oauth/authorize/authorize.css` | 14 |
| `app/board/apps/tabla-periodica/tabla-periodica.css` | 8 |
| `app/board/apps/aula-documentos/aula-documentos.css` | 6 |
| `app/board/projects/project-dialogs.css` | 6 |

## 4. Duplicación observada

| Señal | Medición inicial | Lectura |
|---|---:|---|
| Líneas con `button` | 191 | Hay muchos botones propios además de `.primary`/`.secondary` |
| Líneas con `toolbar` | 44 | Barras de app con estructura repetida |
| Líneas con `empty` | 33 | Estados vacíos con composición parecida |
| Líneas con `dialog` | 8 | La base de diálogo ya está centralizada, pero hay variantes por app |
| `!important` | 38 | Deuda de especificidad a revisar por consumidor |
| Colores literales repetidos | `#c4aaff` (5), `#00000066` (4), `#00000080` (4), `#fff` (3) | Candidatos a token semántico si no están ya cubiertos |

La medición es orientativa: algunas coincidencias están en tokens o son intencionales. La Fase 2 decide qué literales se sustituyen.

## 5. Excepciones `features → layout`

`arch-baseline.json` registra estas cinco dependencias:

| Vista | Importa |
|---|---|
| `app/board/class/class-view.tsx` | `app/board/layout/workspace-layout.tsx` |
| `app/board/people/administration/administration-view.tsx` | `app/board/layout/workspace-layout.tsx` |
| `app/board/people/students/students-view.tsx` | `app/board/layout/layout-toggle.tsx` |
| `app/board/people/teachers/teachers-view.tsx` | `app/board/layout/layout-toggle.tsx` |
| `app/board/settings/settings-view.tsx` | `app/board/layout/workspace-layout.tsx` |

La Fase 3 debe mover las primitivas necesarias a `app/board/shared/ui/` y retirar estas excepciones, no solo silenciarlas.

## 6. Presupuestos y puntos de control

| Regla | Límite | Estado actual |
|---|---:|---|
| CSS de producto | 500 líneas con contenido | `portada.css` 628 y `tarjetas.css` 547 son excepciones |
| Código de componente/hook | 600 | Sin excepciones de tamaño |
| Shell `app/board.tsx` | 450 | Correcto |
| Flujo `aula-documentos` | 370.000 B gzip | 369.344 B |
| Flujo export | 340.000 B gzip | 329.691 B |
| Flujo Office | 210.000 B gzip | 196.481 B |
| Hoja de cálculo | 315.000 B gzip | 310.209 B |

La Fase 4 solo debe dividir los dos CSS que superan el límite; Office (444), Timeline (437) y Aula (máximo 419) ya están por debajo y se revisan por duplicados, no por tamaño.

## 7. Decisiones para las siguientes fases

- Consolidar los tokens existentes; no crear un sistema paralelo.
- Usar `app/board/styles/` para primitivas ya compartidas y `app/board/shared/ui/` para layout compartido.
- Mantener los estilos de app en su carpeta y su carga diferida.
- No cambiar el comportamiento visual durante la auditoría.
- Retirar una excepción solo cuando la primitiva tenga consumidores y el checker lo confirme.

## 8. Verificación de la Fase 1

- Inventario completo de los 46 CSS y sus capas.
- Duplicados y deuda `features → layout` identificados.
- Sin cambios de estilos, producto, versión ni Site.
- `npm run arch:check`: **397 archivos de producto / 988 imports / 0 problemas**.
