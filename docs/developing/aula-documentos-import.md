# Importación en Aula Documentos

> **Estado:** ADOC-16, Fase 4 · **Fecha:** 2026-11-20
> **Alcance:** entrada de documentos externos en Aula Documentos. Las copias portables, el visor Office y la migración de apps antiguas se inventarían aquí, pero conservan su flujo propio.

## 1. Acciones actuales

| Acción | Qué hace | Archivos principales | Límites | Pruebas |
|---|---|---|---|---|
| **Importar documento** | Lee Markdown o DOCX/PPTX, muestra vista previa y sustituye el documento tras confirmar y guardar una copia local | `components/dialogs/document-copy-import-dialogs.tsx` (491 líneas), `hooks/use-aula-import.ts` (212), `lib/domain/aula-documentos/{markdown,importers,import-formats,office-import}.ts` | Markdown 200.000 caracteres; Office 30 MB y 200.000 caracteres extraídos | `aula-documentos-documents.test.tsx`, `importers.test.ts`, `office-import.test.ts` |
| **Importar copia** | Restaura una copia portable `.aula.zip` con manifiesto | `document-copy-import-dialogs.tsx`, `formatos/copias/copy-client.ts`, `lib/domain/aula-documentos/copy.ts` | ZIP 60 MB; cuota 200 MB y 20 copias por proyecto | `aula-documentos-copies.test.tsx`, `copy.test.ts` |
| **Abrir Office** | Abre DOCX/XLSX/PPTX en el visor, sin importarlos | `components/document-toolbar.tsx`, `formatos/office/viewer/office-viewer.tsx`, `formatos/office/viewer/use-office-viewer.ts` | 30 MB; formatos antiguos y cifrados rechazados | `presentation.test.tsx`, `office-viewer.test.tsx`, `office-model.test.ts` |
| **Migrar apps antiguas** | Compone un documento con datos de Notas y documentos, Diagramas y Presentaciones; no modifica el origen | `components/dialogs/document-overlay-dialogs.tsx`, `hooks/use-aula-migration.ts`, `lib/domain/aula-documentos/migration.ts` | Markdown legacy 200.000; Mermaid 20.000 por bloque | `aula-documentos-documents.test.tsx`, `importers.test.ts`, `migration.test.ts` |

El diálogo de documento usa una zona de arrastre con un selector único (`.md`, `.markdown`, `.txt`, `.json`, `.docx`, `.pptx`) y un área de pegado Markdown. Admite TXT literal y JSON canónico, muestra el origen y bloquea el reemplazo idéntico. La importación siempre reemplaza el documento abierto; antes exige confirmación y una copia local de recuperación, y si la copia falla no cambia nada.

## 2. Contrato objetivo

Las fases 2 y 3 implementan la entrada, los formatos y la vista previa; la Fase 4 añade origen, duplicados y documentación final.

```ts
type AulaImportOrigin = "picker" | "drop" | "paste";

type AulaImportPayload =
  | { origin: "picker" | "drop"; file: File }
  | { origin: "paste"; text: string; name?: string };

type AulaImportKind = "markdown" | "text" | "office" | "json";

type AulaImportPreview = {
  kind: AulaImportKind;
  origin: AulaImportOrigin;
  sourceName: string | null;
  document: AulaDocument;
  stats: AulaDocumentStats;
  warnings: string[];
  fingerprint: string;
};
```

Reglas del contrato:

- Toda lectura termina en `parseAulaDocument`; ningún formato escribe un documento sin validar.
- La vista previa es la misma para archivo, arrastre y pegado: origen, nombre, título, extracto, métricas, avisos y confirmación.
- La huella es el JSON canónico serializado del documento validado. Se usa para detectar duplicados, no como medida de seguridad.
- El origen y el nombre se muestran en la UI y en la copia local; no se añaden al esquema `AulaDocument`.
- El pegado se interpreta como Markdown. Un `.txt` se interpreta como texto literal.
- Cancelar, cerrar o fallar la copia de recuperación deja el documento intacto.

## 3. Matriz de formatos

| Formato | Extensiones / MIME | Hoy | ADOC-16 | Conversión y avisos |
|---|---|---|---|---|
| Markdown | `.md`, `.markdown`, `text/markdown` | Aceptado | Aceptado | `markdownToDocument`; solo el subconjunto admitido; lo no reconocido queda como texto o genera aviso |
| Texto plano | `.txt`, `text/plain` | Aceptado como texto literal | Aceptado como texto literal | Un párrafo por bloque de líneas; no interpreta `#`, `*`, enlaces ni tablas |
| DOCX | `.docx` | Aceptado | Aceptado | `@silurus/ooxml` → Markdown → documento; se pierden maquetación, columnas, comentarios y elementos avanzados; las imágenes se omiten con aviso |
| PPTX | `.pptx` | Aceptado | Aceptado | Como DOCX, con saltos de diapositiva; las notas del orador y las imágenes se omiten con aviso |
| XLSX | `.xlsx` | Solo visor | Rechazado en importación | El mensaje remite al visor Office; las hojas no se convierten en documento |
| JSON de Aula | `.json`, `application/json` | Aceptado | Aceptado | Documento canónico o JSON descargado de una copia de recuperación, validado con `parseAulaDocument` |
| HTML | `.html`, `text/html` | Rechazado | Rechazado | Sin parser/saneado fiable en el repo; añadir una dependencia queda fuera de ADOC-16 |
| ODT / RTF | `.odt`, `.rtf` | No admitido | Rechazado | Sin conversor ni librería aprobada |
| PDF | `.pdf` | No admitido | Rechazado | Sin conversor; no se promete fidelidad |
| Office antiguo | `.doc`, `.xls`, `.ppt` | Rechazado | Rechazado | Formato binario legado; se pide guardar como OOXML |
| Copia portable | `.aula.zip` | Acción propia | Acción propia | No pasa por este diálogo; manifiesto y cuota propios |

**Decisión sobre HTML:** no se implementa en ADOC-16. Convertirlo con seguridad exige un parser y saneado, una dependencia nueva y más superficie de seguridad; además, el modelo canónico no representa CSS ni maquetación. Se rechazará con un mensaje que explique el motivo.

**Formatos descartados:** ODT, RTF y PDF no tienen conversor en el proyecto y no se añadirá uno en este roadmap. XLSX sigue disponible en el visor, no como importación documental.

## 4. Límites

| Límite | Valor | Hogar | Se aplica a |
|---|---:|---|---|
| Markdown de entrada | 200.000 caracteres | `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` | `.md`, pegado y migración legacy |
| Documento JSON serializado | 190.000 caracteres | `AULA_DOCUMENT_JSON_MAX_LENGTH` | JSON de Aula y copias de recuperación |
| Nodos del documento | 4.000 | `AULA_DOCUMENT_MAX_NODES` | Todos los formatos |
| Profundidad | 24 | `AULA_DOCUMENT_MAX_DEPTH` | Todos los formatos |
| Texto total | 100.000 caracteres | `AULA_DOCUMENT_MAX_TEXT_LENGTH` | Todos los formatos |
| Bloques Mermaid | 12; 20.000 por bloque; 80.000 total | `AULA_DOCUMENT_MAX_MERMAID_*` | Markdown, migración y JSON |
| Imágenes | 30; 20.000 caracteres de texto alternativo/pie | `AULA_DOCUMENT_MAX_IMAGES`, `AULA_DOCUMENT_MAX_IMAGE_TEXT_TOTAL` | Documento validado |
| Tablas | 20; 50 filas; 20 columnas; 400 celdas por tabla; 1.000 en total | `AULA_DOCUMENT_MAX_TABLE_*` | Documento validado |
| Archivo Office | 30 MB | `MAX_OFFICE_FILE_BYTES` | DOCX/PPTX/XLSX antes de leer |
| Texto extraído de Office | 200.000 caracteres | `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` | DOCX/PPTX |
| ZIP de copia portable | 60 MB; 200 MB y 20 copias por proyecto | `AULA_COPY_*` | Acción Importar copia |
| TXT y pegado | 200.000 caracteres | Reutiliza el límite de Markdown | TXT y pegado |

Los límites se comprueban antes de construir la vista previa cuando el formato lo permite. Un documento que supera un límite estructural se rechaza con el mensaje de `parseAulaDocument`; no se recorta silenciosamente.

## 5. Pérdidas y avisos

- **Markdown:** conserva títulos, párrafos, listas, citas, código, tablas y enlaces admitidos; el resto queda como texto. Los enlaces externos se normalizan y se abren con `noopener noreferrer nofollow`.
- **DOCX/PPTX:** la conversión pasa por Markdown, no por el layout de Office. Se pierden columnas, saltos manuales, estilos avanzados, comentarios y control de cambios. Las imágenes y las notas del orador se omiten con aviso; los archivos con macros se rechazan antes de leer.
- **TXT:** no hay formato; solo párrafos y saltos. Es la opción predecible para pegar texto sin interpretación.
- **JSON:** se acepta solo un documento canónico válido. Un JSON de otra app, un volcado arbitrario o un esquema desconocido se rechazan con mensaje.
- **Office cifrado o dañado:** se rechaza con el mensaje del visor; no se intenta descifrar ni reparar.
- **Duplicados:** si la huella coincide con el documento abierto, se bloquea el reemplazo y se explica que el contenido ya está importado.

## 6. Pruebas existentes

- Dominio: `importers.test.ts`, `import-formats.test.ts`, `office-import.test.ts`, `markdown.test.ts`, `document.test.ts`, `migration.test.ts`, `copy.test.ts`.
- Office compartido: `office-import.test.ts` y `office-model.test.ts`.
- Flujos de la app: `aula-documentos-documents.test.tsx` (264 líneas), `aula-documentos-autosave.test.tsx`, `aula-documentos-copies.test.tsx`, `aula-documentos-recovery.test.tsx` y `aula-documentos-presentation.test.tsx`.

Las pruebas de archivo, arrastre, pegado, TXT y JSON cubren los tres orígenes y los formatos nuevos; también se prueban el origen visible, el duplicado, la cancelación y el rechazo de formatos sin conversor.

## 7. Límites de mantenimiento

- El diálogo no debe superar las 600 líneas; la lectura vive en hooks y dominio.
- No se añaden dependencias para formatos que no tengan conversor seguro.
- El presupuesto de `aula-documentos` es 370.000 B gzip; cada fase se mide.
- La importación no cambia URLs, permisos, MCP ni la versión del Site.
