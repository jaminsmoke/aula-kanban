# Límites de importación y revisión documental

> **Estado:** ARC-14 Fase 1 · **Fecha:** 2026-11-22
> **Alcance:** límites de Markdown, documento serializado, historial de versiones y peticiones de Aula Documentos.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Resultado del inventario

- Hay **cinco constantes** relacionadas, pero describen **tres fronteras distintas**: petición/almacenamiento, Markdown y documento serializado.
- `LEGACY_MARKDOWN_MAX_LENGTH` repite el valor de `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH`: **200.000**.
- `AULA_VERSION_STATE_MAX_LENGTH` repite el valor de `AULA_DOCUMENT_JSON_MAX_LENGTH`: **190.000**.
- `MAX_APP_DOCUMENT_CHARS` también vale **200.000**, pero no es el mismo concepto: limita el cuerpo HTTP y el estado serializado de cualquier app nativa.
- La validación del documento ya aplica el límite de 190.000 antes de crear una versión; el chequeo del historial es una segunda comprobación del mismo estado.
- No se cambia producto en esta fase. La decisión es reutilizar las constantes de dominio existentes y mantener separada la frontera de petición/almacenamiento.

## 2. Método

- Se buscaron las cinco constantes y sus valores literales en `app/` y `lib/`.
- Se recorrieron los consumidores productivos y las pruebas que ya cubren cada flujo.
- Se separó el límite de bytes del cuerpo HTTP del límite de caracteres del Markdown y del JSON serializado.
- Se revisaron los mensajes, códigos y estados que cada flujo devuelve al superar el límite.
- Se comprobó que no se modifica ningún valor, contrato ni comportamiento.

## 3. Mapa de constantes

| Constante | Definición | Valor | Unidad | Frontera | Consumidores productivos |
|---|---|---:|---|---|---|
| `MAX_APP_DOCUMENT_CHARS` | `lib/server/apps/app-documents.ts` | 200.000 | bytes en la petición; caracteres en el estado serializado | Petición y almacenamiento de apps nativas | `app/api/app-documents/route.ts`, rutas de Aula Documentos, `lib/server/aula-documentos/documents.ts`, MCP de Blockly y Mermaid |
| `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` | `lib/domain/aula-documentos/markdown.ts` | 200.000 | caracteres | Entrada Markdown | `import-formats.ts`, `office-import.ts`, `use-aula-import.ts` |
| `LEGACY_MARKDOWN_MAX_LENGTH` | `lib/domain/aula-documentos/importers.ts` | 200.000 | caracteres | Entrada Markdown de Presentaciones antiguas | Solo `importPresentationDocument` |
| `AULA_DOCUMENT_JSON_MAX_LENGTH` | `lib/domain/aula-documentos/document-types.ts` | 190.000 | caracteres | Documento serializado | `document-validation.ts`, `import-formats.ts`, `recovery-store.ts`; reexportada por `document.ts` |
| `AULA_VERSION_STATE_MAX_LENGTH` | `lib/domain/aula-documentos/revision.ts` | 190.000 | caracteres | Estado serializado de una versión | Solo `lib/server/aula-documentos/versions.ts` |

## 4. Fronteras

### 4.1 Petición y almacenamiento: 200.000

`MAX_APP_DOCUMENT_CHARS` se usa de dos formas:

- Como máximo de bytes leídos por `boundedJson()` en las rutas de apps y de Aula Documentos.
- Como longitud del estado serializado que se guarda en `app_documents` y en las operaciones de Aula Documentos.

Esta frontera protege el transporte y la tabla común de cualquier app nativa. No debe sustituirse por el límite de Markdown ni por el límite del documento de Aula.

### 4.2 Entrada Markdown: 200.000

`AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` se comprueba antes de convertir Markdown:

- Markdown pegado o importado desde el diálogo.
- TXT convertido a párrafos.
- Markdown extraído de un archivo Office.
- Markdown de Presentaciones antiguas, hoy con la copia `LEGACY_MARKDOWN_MAX_LENGTH`.

Es un límite de **entrada**. Después de convertir el Markdown, el documento resultante debe pasar el límite de 190.000. Por eso, una entrada de exactamente 200.000 caracteres puede superar la comprobación de Markdown y fallar después en la validación del documento; son dos errores distintos y deben conservarse.

### 4.3 Documento serializado: 190.000

`AULA_DOCUMENT_JSON_MAX_LENGTH` limita `JSON.stringify()` del documento:

- En `parseAulaDocument()` se aplica antes de validar el árbol.
- En `importJsonDocument()` se aplica a la entrada JSON antes de analizarla.
- En `recovery-store.ts` se aplica a la copia local antes de guardarla.
- En la validación de documentos ya guardados, fija el máximo efectivo del estado de Aula.

El límite es de **caracteres**, no de bytes. Un texto con caracteres multibyte puede ocupar más bytes en la petición sin superar este límite.

### 4.4 Historial: 190.000

`AULA_VERSION_STATE_MAX_LENGTH` se comprueba al crear una versión después de `parseAulaDocument()`. El documento ya ha sido validado con el límite de 190.000, por lo que la segunda comprobación no aporta un límite distinto; solo añade una constante paralela.

La restauración vuelve a validar el estado de la versión con `parseAulaDocument()`. El límite efectivo de una versión restaurada es, por tanto, el mismo límite del documento serializado.

## 5. Contrato de errores y estados

| Flujo | Supera | Resultado actual |
|---|---|---|
| Presentaciones antiguas | `LEGACY_MARKDOWN_MAX_LENGTH` | `{ ok: false, message: "La presentación supera el tamaño permitido." }` |
| Texto plano | `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` | `{ ok: false, message: "El texto supera el tamaño permitido." }` |
| Office | `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` | `{ ok: false, message: "El texto del archivo de Office supera el tamaño permitido." }` |
| Markdown del diálogo | `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` | `{ ok: false, message: "El Markdown supera el tamaño permitido." }` |
| JSON importado | `AULA_DOCUMENT_JSON_MAX_LENGTH` | `{ ok: false, message: "El JSON supera el tamaño permitido." }` |
| Documento validado | `AULA_DOCUMENT_JSON_MAX_LENGTH` | `{ ok: false, code: "too-large", message: "El documento supera el tamaño permitido." }` |
| Copia local | `AULA_DOCUMENT_JSON_MAX_LENGTH` | `{ ok: false, reason: "too-large" }` |
| Versión manual | `AULA_VERSION_STATE_MAX_LENGTH` | `{ status: "invalid" }` sin mensaje de límite |
| Guardado o creación de Aula | `MAX_APP_DOCUMENT_CHARS` | `{ status: "too-large" }`; la API responde 413 con `"El documento es demasiado grande."` |
| Cuerpo de la petición | `MAX_APP_DOCUMENT_CHARS` | 413 con `"Documento no válido o demasiado grande."` en las rutas que lo usan |
| Acción de Aula Documentos | `MAX_APP_DOCUMENT_CHARS` | 400 con `"Acción no válida."` |

Los flujos de Markdown usan `>`: el valor exacto del límite se acepta en esa comprobación y el valor siguiente se rechaza.

## 6. Duplicados y decisión

| Duplicado | Decisión |
|---|---|
| `LEGACY_MARKDOWN_MAX_LENGTH` | Importar `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH` desde `markdown.ts` y retirar la constante local. |
| `AULA_VERSION_STATE_MAX_LENGTH` | Usar `AULA_DOCUMENT_JSON_MAX_LENGTH` en el historial y retirar la segunda definición de 190.000. |
| `MAX_APP_DOCUMENT_CHARS` | Conservarla separada: describe bytes de petición y almacenamiento de apps, no el documento de Aula. |

No se creará un módulo genérico de límites: las constantes existentes ya tienen un dominio claro y el cambio se limita a dos duplicados. Tampoco se unificarán los mensajes: la interfaz y las pruebas dependen de los textos actuales.

## 7. Cobertura de pruebas actual

| Flujo | Cobertura existente | Hueco para las fases 2 y 3 |
|---|---|---|
| Presentaciones antiguas | Rechaza 200.001 con un literal | No usa la constante ni comprueba el valor exacto de 200.000 |
| Texto plano | Rechaza `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH + 1` | Falta el valor exacto y la interacción con el límite del documento |
| Office | Rechaza `AULA_DOCUMENT_MARKDOWN_MAX_LENGTH + 1` | Falta el valor exacto |
| JSON importado | Rechaza `AULA_DOCUMENT_JSON_MAX_LENGTH + 1` | Falta el valor exacto y un JSON válido en el límite |
| Documento validado | Rechaza un documento mayor que 190.000 | Falta el valor exacto y el borde por encima |
| Copia local | Rechaza una copia demasiado grande | Falta el valor exacto |
| Versión manual | No hay prueba de tamaño | Falta 190.000 y 190.001, y la restauración de una versión existente |
| Petición de apps | Rechaza 200.001 bytes de estado | Falta el límite exacto y la separación de bytes/caracteres |
| Rutas de Aula Documentos | No hay prueba específica del tamaño del cuerpo | Falta comprobar el 413 sin cambiar el contrato |

## 8. Contrato para las fases siguientes

- **Fase 2:** una sola constante para Markdown; los cuatro flujos conservan sus mensajes y su comportamiento. Las pruebas deben distinguir el rechazo de la entrada Markdown del rechazo posterior del documento.
- **Fase 3:** una sola constante para el documento serializado; el historial conserva el estado `invalid` y la restauración sigue aceptando versiones válidas. `MAX_APP_DOCUMENT_CHARS` sigue separada y sin cambios.
- **Invariantes:** valores efectivos 200.000/190.000, comparaciones con `>`, mensajes y estados públicos, y ninguna migración ni cambio de datos.
- **Sin cambios de producto en la Fase 1:** este documento es el contrato de las fases 2 y 3.

## 9. Baseline

- Arquitectura: **461 archivos / 1.154 imports / 0 problemas**.
- Suite: **268 archivos / 1.774 pruebas**.
- Aula Documentos: **386.673 / 387.000 B**.
- Hoja de cálculo: **313.034 / 315.000 B**.
- Site: `1.1.39`.
- Commit de apertura del roadmap: `fdc7b55`.
