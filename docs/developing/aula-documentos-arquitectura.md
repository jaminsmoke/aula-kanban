# Arquitectura de Aula Documentos

> **Estado:** Auditoría inicial de ADOC-15 · **Fecha:** 2026-11-20
> **Objetivo:** reducir la complejidad estructural sin cambiar el comportamiento antes de continuar con las tablas.
> **Alcance:** `app/board/apps/aula-documentos`, `app/board/shared/aula-documentos`, `app/board/shared/office` y `lib/domain/aula-documentos`.

## 1. Diagnóstico actual

El comportamiento funciona, pero la app principal concentra demasiadas responsabilidades en un solo archivo:

| Archivo | Líneas | Bytes | Problema |
|---|---:|---:|---|
| `aula-documentos-app.tsx` | 3.338 | 142.001 | Estado, autosave, diálogos, menús, importación, copias, presentación y JSX en un único archivo. |
| `aula-documentos.css` | 1.742 | 42.230 | Estilos de layout, toolbar, editor, bloques, diálogos y panel lateral juntos. |
| `aula-documentos-app.test.tsx` | 1.342 | 76.516 | Pruebas de todos los flujos en un único archivo. |
| `aula-documentos-table-tools.tsx` | 192 | 8.178 | Ya está separado y se carga bajo demanda; sirve de referencia para nuevas extracciones. |
| `aula-documentos-menu.tsx` | 129 | 4.337 | Menú accesible reutilizable dentro de la app. |
| `aula-documentos-help.tsx` | 32 | 1.870 | Ayuda y atajos ya extraídos y cargados bajo demanda. |

Línea base de verificación:

- Suite: **217 archivos / 1.554 pruebas**.
- `aula-documentos`: **366.306 / 370.000 B gzip**.
- `aula-documentos-export`: **329.689 / 340.000 B gzip**.
- `perf:office`: **196.481 / 210.000 B gzip**.
- La suite de la app contiene 60 pruebas en un solo archivo.

## 2. Responsabilidades que hoy viven en la app

| Grupo | Responsabilidades | Destino propuesto |
|---|---|---|
| Shell | Estado superior, carga del documento, autosave, conflicto, cierre y composición | `aula-documentos-app.tsx` |
| Toolbar | Acciones de formato, insertar, exportar, menús y acciones móviles | `components/toolbar/` |
| Diálogos | Importar, copiar, recuperar, migrar, presentación, conflicto, Office, documento nuevo | `components/dialogs/` |
| Panel lateral | Presentación, tema, notas, ayuda, atajos y copias locales | `components/sidebar/` |
| Flujos de datos | Copias R2, importación, imágenes, presentación, migración | `hooks/` |
| Utilidades de UI | Descarga, fechas, selección de archivo, texto de vista previa | `shared/ui` solo si hay más de un consumidor |
| Persistencia y dominio | Documento, imágenes, Markdown, plantillas, migración, copias, Office | `lib/domain` y `lib/server` |

## 3. Árbol objetivo

```text
app/board/apps/aula-documentos/
  aula-documentos-app.tsx          # shell y composición
  components/
    toolbar/
      document-toolbar.tsx
      document-menus.tsx
      mobile-actions.tsx
    dialogs/
      import-document-dialog.tsx
      copy-dialog.tsx
      copy-import-dialog.tsx
      recovery-dialog.tsx
      migration-dialog.tsx
      presentation-dialog.tsx
      conflict-dialog.tsx
      office-preview-dialog.tsx
      new-document-dialog.tsx
    sidebar/
      document-info.tsx
      presentation-panel.tsx
      local-copies-button.tsx
  hooks/
    use-aula-autosave.ts
    use-aula-recovery.ts
    use-aula-copies.ts
    use-aula-import.ts
    use-aula-presentation.ts
    use-aula-images.ts
    use-aula-migration.ts
  styles/
    layout.css
    toolbar.css
    editor.css
    blocks.css
    dialogs.css
    sidebar.css
  utils/
    document-view.ts            # texto, fechas y nombres, si no son compartidos
  table-tools.tsx               # ya existe; mantener carga diferida
  help.tsx                      # ya existe; mantener carga diferida
  __tests__/
    app-shell.test.tsx
    autosave.test.tsx
    toolbar.test.tsx
    import.test.tsx
    copies.test.tsx
    presentation.test.tsx
    migration.test.tsx
```

```text
app/board/shared/
  ui/
    download.ts                 # solo si comparten Aula, Hoja de cálculo y Mermaid
    date.ts                     # solo si aparece un segundo consumidor
    file-picker.ts              # si se repite el patrón en más apps
  aula-documentos/
    image-block.tsx
    mermaid-block.tsx
    export-html.ts
    export-images.ts
    copy-client.ts
    presentation-view.tsx
    print-html.ts
  office/                       # visor, importación y exportación compartidos
```

```text
lib/domain/aula-documentos/     # modelo puro, sin React
lib/server/aula-documentos/     # servicios de copias, migración y persistencia
```

## 4. Reglas de dependencia

1. `app/board/apps/aula-documentos` puede importar `app/board/shared`, `lib/domain` y utilidades públicas.
2. `app/board/shared` puede importar `lib/domain`; nunca `app/board/apps`.
3. `lib/domain` no puede importar React, Tiptap de UI, `app` ni `lib/server`.
4. `lib/server` no puede importar `app`; las rutas API lo consumen.
5. La app no debe contener reglas de validación, serialización ni cuotas: esas reglas viven en `lib`.
6. Una extracción a `shared` necesita al menos dos consumidores reales o una justificación escrita.
7. Las cargas diferidas se mantienen para los componentes que no son necesarios al abrir la app.
8. Los cambios de refactor no modifican textos visibles, atajos, permisos, URLs ni formato del documento.

## 5. Duplicación detectada

| Elemento | Consumidores actuales | Decisión |
|---|---|---|
| `downloadBlob` / `downloadTextFile` | Aula Documentos, Hoja de cálculo y bloque Mermaid | Extraer a `app/board/shared/ui/download.ts` en la Fase 3. |
| Formato de fechas de estado | Aula Documentos | Mantener en la app hasta que aparezca un segundo consumidor. |
| Patrón de modal/backdrop | Aula Documentos, varios diálogos | Extraer un `DialogShell` local o shared solo si simplifica de verdad; no crear una capa genérica antes de tiempo. |
| `AulaMenu` | Aula Documentos | Mantener local; no es una abstracción genérica hasta que otra app lo use. |
| Selectores de archivo ocultos | Aula Documentos | Agrupar en un componente/hook local. |
| Descarga de SVG Mermaid | Bloque Mermaid | Comparte únicamente la utilidad de descarga, no el renderizado. |

## 6. Límites de mantenimiento

- `aula-documentos-app.tsx`: **máximo 450 líneas**.
- Componentes y hooks nuevos: **máximo 600 líneas**.
- Archivos CSS: **máximo 500 líneas** cada uno.
- Archivos de prueba: **máximo 600 líneas**.
- No se permite un archivo nuevo de más de 800 líneas sin justificación en este documento.
- El número de líneas no sustituye la revisión de responsabilidades: un archivo pequeño puede seguir mezclando capas.

## 7. Plan de ejecución

1. **Fase 1:** este mapa, límites y línea base; sin cambios de comportamiento.
2. **Fase 2:** extraer toolbar, diálogos, sidebar, hooks, CSS y pruebas dentro de la app.
3. **Fase 3:** mover descargas y utilidades compartidas, servicios de servidor y eliminar duplicación; medir presupuesto.

## 8. Riesgos de la auditoría

- El archivo principal contiene estado compartido entre flujos; trocear sin aislar dependencias puede crear hooks acoplados.
- Los diálogos comparten el mismo `useDialogFocus`; la extracción debe conservar foco, Escape y retorno al control de origen.
- Las pruebas actuales tienen mocks globales de documentos, Mermaid y copias; deben dividirse sin perder cobertura.
- El presupuesto de `aula-documentos` sigue siendo estrecho: cada extracción debe medirse y las cargas diferidas deben conservarse.
