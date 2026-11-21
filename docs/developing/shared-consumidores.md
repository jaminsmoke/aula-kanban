# Inventario de `shared` para ARC-08

> **Estado:** ARC-08, Fases 1–2 · **Fecha:** 2026-11-21
> **Alcance:** `shared/aula-documentos`, `shared/office`, `shared/mermaid` y la frontera que conserva `shared/whiteboard`.
> **Instantánea:** [`shared-baseline.json`](shared-baseline.json)

## 1. Método

- Se recorrieron los imports relativos estáticos y dinámicos de `app/` y `lib/`.
- Los tests junto a un módulo se consideran parte de su capacidad y se mueven con él.
- Los consumidores internos de la propia carpeta no justifican que el módulo sea compartido.
- Un consumidor de producto es una app o una feature fuera de `shared`.
- Las cifras de arquitectura y de bundle son la línea base anterior a cualquier movimiento.

## 2. Resumen

| Directorio | Archivos | Fuente | Tests | Consumidor de producto | Destino |
|---|---:|---:|---:|---|---|
| `shared/aula-documentos` | 39 | 26 | 13 | Aula Documentos | `apps/aula-documentos` por capacidad |
| `shared/office` | 21 | 14 | 5 | Aula Documentos | `apps/aula-documentos/formatos/office`; modelo puro a `lib/domain` |
| `shared/mermaid` | 2 | 2 | 0 | Bloque documental | `apps/aula-documentos/editor/diagramas` |
| `shared/whiteboard` | 14 | 8 | 6 | Excalidraw y pizarras de tareas | Se conserva compartido |

`shared/office` incluye dos fixtures `.docx` y `.pptx`; no son código de producto.

## 3. Mapa de consumidores y destinos

### 3.1 Aula Documentos

| Archivos | Consumidores principales | Tipo | Destino |
|---|---|---|---|
| `shortcuts.ts` | `aula-documentos-help`, hooks de persistencia, búsqueda, vista y comentarios; prueba de acciones | Estático | `apps/aula-documentos/atajos` |
| `document-extensions.ts`, `image-block.tsx`, `slide-break.tsx` | `use-aula-session`, `export-html` | Estático | `apps/aula-documentos/editor/extensiones` |
| `image-upload.ts` | `use-aula-copies`, `use-aula-images`, `use-aula-session`, `image-block` | Estático | `apps/aula-documentos/editor/imagenes` |
| `mermaid-block.tsx`, `mermaid-block-header.tsx`, `mermaid-block-preview.tsx`, `mermaid-block-storage.ts`, `mermaid-block-view.tsx`, `mermaid-error.ts`, `mermaid-renderer.ts`, `use-mermaid-preview.ts`, `use-mermaid-visibility.ts` | `use-aula-session`, `document-extensions`, `use-aula-exports`, `use-aula-presentation` | Estático y dinámico (`mermaid`) | `apps/aula-documentos/editor/diagramas` |
| `search.ts`, `search-highlight.ts`, `search-meta.ts` | `use-aula-search`, `document-extensions` | Estático | `apps/aula-documentos/busqueda` |
| `outline.ts`, `slide-structure.ts` | `use-aula-navigation`, `use-aula-slide-structure` | Estático | `apps/aula-documentos/navegacion` |
| `comment-anchor.ts` | Panel y hook de comentarios | Estático | `apps/aula-documentos/revision` |
| `export-html.ts`, `export-images.ts`, `print-html.ts` | `use-aula-exports`, `use-aula-presentation`, `use-aula-session`, `use-aula-toolbar-model`, `utils/document-assets`; Office export | Estático y dinámico (`export-images`) | `apps/aula-documentos/exportacion` |
| `presentation-view.tsx`, `presentation.css` | `document-overlay-dialogs`, prueba de presentación | Lazy | `apps/aula-documentos/presentacion` |
| `copy-client.ts` | `use-aula-copies` | Estático y dinámico | `apps/aula-documentos/formatos/copias` |

Los tests de `shared/aula-documentos` se mueven junto a su capacidad. Las pruebas de integración que viven en `apps/aula-documentos` no cambian de hogar.

### 3.2 Office

| Archivos | Consumidores principales | Tipo | Destino |
|---|---|---|---|
| `office-model.ts` | `use-aula-import`, `office-import`, visor y `use-office-viewer` | Estático | `lib/domain/aula-documentos/office-model.ts` |
| `office-import.ts` | `use-aula-import` | Estático; OOXML dinámico | `apps/aula-documentos/formatos/office/import` |
| `office-export-common.ts`, `office-export.ts`, `office-export-docx.ts`, `office-export-pptx.ts` | `use-aula-exports` | Estático; `docx` y `pptxgenjs` dinámicos | `apps/aula-documentos/formatos/office/export` |
| `office-viewer.tsx`, `office-viewer-empty.tsx`, `office-viewer-error.tsx`, `office-viewer-header.tsx`, `office-viewer-toolbar.tsx`, `office-viewer-types.ts`, `office-viewer.css`, `use-office-viewer.ts` | `document-copy-import-dialogs` | Lazy desde Aula; OOXML dinámico | `apps/aula-documentos/formatos/office/viewer` |
| `office-export.test.ts`, `office-fixtures.test.ts`, `office-import.test.ts`, `office-model.test.ts`, `office-viewer.test.tsx` y fixtures | Pruebas del módulo | Se mueven con su capacidad | `formatos/office` o `lib/domain` según el archivo |

`office-model.ts` es la única pieza claramente pura y sin React; la decisión final de moverla a `lib/domain` se valida en la Fase 4.

### 3.3 Mermaid

| Archivos | Consumidor | Tipo | Destino |
|---|---|---|---|
| `gantt-editor.tsx`, `gantt-editor.css` | `shared/aula-documentos/mermaid-block-view.tsx` | Estático desde el bloque; renderizador Mermaid dinámico | `apps/aula-documentos/editor/diagramas/gantt` |

El modelo y las plantillas de `lib/domain/mermaid` no se mueven a React. El nombre Mermaid se conserva para identificar el formato y el adaptador.

### 3.4 Whiteboard

| Archivos | Consumidores | Decisión |
|---|---|---|
| `index.ts`, `whiteboard.tsx`, `whiteboard-canvas.tsx`, `use-whiteboard.ts`, `whiteboard-model.ts`, `whiteboard-persistence.ts`, `whiteboard-presence.ts`, `whiteboard.css` | `apps/excalidraw`, `app/board/tasks/dialog/task-whiteboard.tsx` | Se conserva en `shared/whiteboard` |

## 4. Dinámicas que no se pueden romper

- `document-copy-import-dialogs` carga `office-viewer` con `lazy`.
- `document-overlay-dialogs` carga `presentation-view` con `lazy`.
- `use-aula-copies` importa `copy-client` bajo demanda.
- `utils/document-assets` importa `export-images` bajo demanda.
- `mermaid-renderer` importa `mermaid` bajo demanda.
- Office importa `@silurus/ooxml`; exportación importa `docx` y `pptxgenjs`; el visor importa DOCX, PPTX y XLSX bajo demanda.

El movimiento debe conservar estos límites. Mover archivos no cuenta como mejora si elimina una carga diferida completa.

## 5. Restos de apps absorbidas

| Referencia | Decisión inicial |
|---|---|
| `lib/native-apps.ts`: `DOCUMENT_SUITE_LEGACY_APP_IDS`, `LEGACY_DOCUMENT_APP_ALIASES` | Conservar: resuelve rutas antiguas. |
| `lib/domain/aula-documentos/importers.ts` y `migration.ts`: fuentes `documentos`, `mermaid`, `presentaciones` | Conservar: migración de datos. |
| `lib/server/aula-documentos/aula-documentos-migration.ts` y pruebas con `app_documents` | Conservar: tabla y nombres de datos históricos. |
| Descripción de Aula Documentos en `lib/native-apps.ts` que menciona `app_documents` | Revisar en Fase 5: puede describir mal el almacenamiento actual. |
| ID `mermaid` en listas heredadas, MCP, sembrado de demo o pruebas de compatibilidad | Revisar en Fase 5; no borrar si sostiene alias o migración. |
| Usos de `"mermaid"` como app genérica en pruebas de `useAppDocument` y del socket | No son referencias de producto; no se tocan. |

## 6. Baseline de dependencias

La instantánea completa está en [`shared-baseline.json`](shared-baseline.json):

- Arquitectura: **458 archivos / 1.147 imports**.
- Flujo Aula Documentos: **386.266 B gzip / 50 archivos**.
- Flujo exportación Office: **330.084 B gzip / 14 archivos**.
- Flujo Pizarra: **1.243.678 B gzip / 23 archivos**.
- Flujo Pizarra Mermaid: **1.446.506 B gzip / 51 archivos**.
- Suite: **265 archivos / 1.746 pruebas**.

## 7. Criterio de salida de la Fase 1

- Cada archivo de los tres directorios tiene consumidor y destino.
- Las cargas diferidas están inventariadas antes de mover código.
- Los restos de apps absorbidas están separados entre compatibilidad y producto.
- La instantánea permite comparar el bundle inicial y los flujos diferidos en las fases siguientes.
- No se ha movido código de producto en esta fase.

## 8. Aplicado en la Fase 2

- Atajos, edición, imágenes, búsqueda, navegación, comentarios, diagramas y Gantt viven ya en `apps/aula-documentos`.
- `shared` se mantiene como frontera solo donde hay consumidores reales; `shared/mermaid` se eliminó.
- `export-html` se movió con las extensiones que consume, antes de la fase de presentación.
- En `shared/aula-documentos` quedan `copy-client.ts`, `export-images.ts`, `presentation-view.tsx`, `presentation.css`, `print-html.ts` y sus pruebas para la Fase 3.
- El presupuesto CSS de Aula pasa a **15 / 3.350** al contabilizar `gantt-editor.css` dentro de la app.
