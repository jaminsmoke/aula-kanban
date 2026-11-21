# Suite documental de Aula Documentos

> **Estado:** Fases 1 a 3 de ADOC-17 · **Fecha:** 2026-11-21
> **Alcance:** contrato, modelo de datos, migración, persistencia backend y gestión visual.
> **Roadmap:** [`roadmap.md`](roadmap.md) · **Arquitectura:** [`arquitectura-global.md`](arquitectura-global.md)

---

## 1. Decisión

Aula Documentos pasa de un único estado por proyecto a una **suite de documentos con identidad propia**.

La suite se implementa primero en Aula Documentos. Hoja de cálculo, Diagramas, Blockly y el resto de apps que usan `app_documents` conservan el modelo de un estado por proyecto hasta que el contrato de Aula esté probado.

**No se anidan documentos dentro de `AulaDocument`.** La lista, el estado y los metadatos viven fuera del JSON canónico.

## 2. Punto de partida

### Modelo actual

- `app_documents` tiene clave primaria `(project_id, app_id)` y un único `state` JSON.
- Aula Documentos usa `appId = "aula-documentos"` y guarda el documento completo en esa fila.
- El límite de estado es **200.000 caracteres** y el guardado optimista comparte `updatedAt`.
- `document_copies` guarda copias portables por proyecto; no tiene `document_id`.
- La recuperación local usa una clave de `localStorage` por proyecto:
  `aula-kanban:aula-documentos:recuperacion:<projectId>`.
- La URL del tablero selecciona la app (`app=aula-documentos`), pero no un documento.
- Las exportaciones HTML/Office y la impresión usan el documento abierto, sin identificador.
- MCP `leer_diagrama`/`guardar_diagrama` leen el primer bloque Mermaid del documento de Aula o, si no existe, la fila histórica de Diagramas; no reciben un id de documento.

### Tamaño de partida

| Zona | Archivos de producto | Líneas |
|---|---:|---:|
| `app/board/apps/aula-documentos` | 26 | 5.353 |
| `app/board/shared/aula-documentos` | 18 | 2.192 |
| `lib/domain/aula-documentos` | 21 | 3.152 |
| `lib/server/aula-documentos` | 2 | 344 |
| `app/api/aula-documentos` | 3 | 229 |

Suite: **244 archivos / 1.655 pruebas**. Presupuesto `aula-documentos`: **370.000 B gzip**. Site: `1.1.37`.

## 3. Contrato de la suite

### 3.1 Identidad y ámbito

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | Único dentro del proyecto. El documento migrado usa `legacy`. Los nuevos usan UUID. |
| `projectId` | string | Ámbito de permisos, cuota y listado. |
| `title` | string | Título visible; puede repetirse. No es identidad. |
| `excerpt` | string | Texto plano recortado a 160 caracteres para la lista. |
| `status` | `active` \| `archived` \| `deleted` | `active` aparece en la lista; `archived` se puede restaurar; `deleted` queda en papelera hasta purga explícita. |
| `createdAt` | number | Fecha de creación en milisegundos. |
| `updatedAt` | number | Versión para concurrencia optimista. |
| `archivedAt` | number \| null | Fecha de archivo o eliminación lógica. |
| `createdBy` | string \| null | Cuenta que creó el documento. |
| `updatedBy` | string \| null | Cuenta del último guardado. |
| `lastOpenedAt` | number \| null | Preferencia del cliente; no se guarda en el estado canónico. |

`id = "legacy"` identifica el documento procedente de la fila única. Es estable, legible y no colisiona con UUID.

### 3.2 Operaciones

| Operación | Contrato |
|---|---|
| `list` | Devuelve metadatos de documentos `active` y, aparte, `archived`/`deleted`. Nunca devuelve el `state` completo. |
| `create` | Crea un documento vacío con título por defecto, autor y `updatedAt` inicial. |
| `open` | Carga `state` y metadatos de un `id`; valida proyecto y permisos. |
| `save` | Guarda el estado completo solo si `expectedUpdatedAt` coincide; devuelve `409` en conflicto. |
| `rename` | Cambia solo el título y actualiza la versión con la misma comprobación optimista. |
| `duplicate` | Crea un documento nuevo con el estado y título copiados, sin reutilizar el id. |
| `archive` | Marca `archived`; no borra contenido. |
| `delete` | Marca `deleted`, guarda una copia de recuperación y conserva el contenido hasta la purga. |
| `restore` | Devuelve `archived`/`deleted` a `active`; puede crear una copia de seguridad antes. |

### 3.3 Invariantes

- Un `id` pertenece a un solo proyecto.
- No se puede abrir, renombrar, guardar, archivar ni restaurar un documento de otro proyecto.
- `updatedAt` es la versión de concurrencia; el servidor no acepta un guardado con una versión anterior.
- La lista no parsea el `state` completo de todos los documentos.
- El título no identifica un documento; la URL y MCP usan `id`.
- `AulaDocument` no cambia de esquema en ADOC-17.

## 4. Modelo de datos implementado

Se creó una tabla específica para la suite; no se cambió la clave de `app_documents` para todas las apps.

```text
aula_documents
  project_id       text  not null
  id               text  not null
  title            text  not null
  excerpt          text  not null
  state            text  not null       -- AulaDocument serializado
  status           text  not null       -- active | archived | deleted
  created_at       integer not null
  updated_at       integer not null
  archived_at      integer null
  created_by       text null
  updated_by       text null
  primary key (project_id, id)
  index (project_id, status, updated_at)
```

- `document_copies` recibe `document_id` nullable. Las copias antiguas quedan sin origen y se listan como copias del proyecto; las nuevas registran el documento de origen.
- La recuperación local pasa de una clave por proyecto a una clave por documento:
  `aula-kanban:aula-documentos:recuperacion:<projectId>:<documentId>`.
- El último abierto se guarda en el cliente, no en `aula_documents`:
  `aula-kanban:aula-documentos:last-opened:<projectId>` (y se amplía con la cuenta cuando esté disponible).
- La cuota de estado sigue siendo **200.000 caracteres por documento**; la cuota de copias sigue siendo por proyecto.

## 5. Migración implementada

### 5.1 Origen y destino

1. Leer `app_documents` con `projectId` y `appId = "aula-documentos"`.
2. Si no hay fila, el proyecto empieza con una lista vacía.
3. Si hay fila, insertar en `aula_documents` un documento `id = "legacy"` con el `state` actual, título extraído del estado, extracto, autor y fechas.
4. La inserción usa `insert ... on conflict do nothing` sobre `(project_id, id)`: repetirla no duplica ni pisa el documento.
5. La fila de `app_documents` **no se modifica ni se borra**. Sigue siendo la red de seguridad y la compatibilidad de lectura.

### 5.2 Reversión

- Antes del primer guardado nuevo, quitar la lectura de `aula_documents` deja el documento único intacto.
- Después de crear documentos nuevos, el rollback no puede recuperarlos desde `app_documents`; hay que exportarlos o conservar la tabla.
- La migración no borra datos, no cambia URLs y no aplica operaciones remotas.

### 5.3 Recuperación y copias antiguas

- Si existe la clave antigua de recuperación por proyecto y no existe la nueva, se copia al documento `legacy`.
- La clave antigua se conserva hasta que el usuario confirme la migración.
- Las copias portables antiguas sin `document_id` se muestran como copias del proyecto; al importarlas se pregunta si reemplazan el documento abierto o crean uno nuevo (decisión de Fase 3/4).

## 6. URLs, API y MCP

### URL

- La ruta del tablero conserva `app=aula-documentos` y añade `doc=<id>` cuando hay un documento seleccionado.
- Sin `doc`, se abre el último documento local o, si no hay preferencia, el primero activo o `legacy`.
- Un `doc` inválido, ajeno o eliminado no revela contenido: se muestra un error y se ofrece volver a la lista.

### API

- `GET /api/aula-documentos?project=...` lista metadatos.
- `POST /api/aula-documentos?project=...` crea.
- `GET /api/aula-documentos/:id?project=...` abre.
- `POST /api/aula-documentos/:id?project=...` guarda con versión.
- Las acciones de renombrar, duplicar, archivar, eliminar y restaurar se definen en Fase 2/3; no cambian los códigos existentes de `app-documents`.
- `app-documents` sigue sirviendo a las demás apps y al cliente antiguo de Aula.

### MCP

- `leer_diagrama` y `guardar_diagrama` aceptan `documentoId` opcional.
- Sin `documentoId`, usan `legacy` o el primer documento activo con un diagrama, en ese orden; la resolución se documenta en la descripción de la herramienta.
- Un `documentoId` ajeno se rechaza sin revelar si existe.
- No se crea un documento nuevo desde MCP sin una acción explícita.

## 7. Permisos, invitados y cuotas

- `owner`, administrador y miembro con acceso al proyecto pueden listar y abrir documentos activos.
- Los invitados siguen en solo lectura: pueden abrir, exportar e imprimir, pero no crear, guardar, renombrar, archivar, eliminar ni restaurar.
- Archivar y eliminar requieren permiso de escritura y una copia de recuperación cuando la operación pueda destruir contenido.
- Cada documento cuenta para el límite de 200.000 caracteres; la cuota de copias y R2 sigue siendo por proyecto.
- La lista se pagina u ordena por `updatedAt`; no se carga el estado completo para pintarla.

## 8. Hoja de cálculo y otras apps

**Hoja de cálculo no se migra en ADOC-17.** Sigue usando `app_documents` con un estado por proyecto.

La suite se diseña como contrato de Aula Documentos, no como un cambio global de `app_documents`. Si el contrato funciona, una entrada posterior podrá evaluar si Hoja, Diagramas o Blockly necesitan varias unidades por proyecto.

## 9. Matriz de pruebas de la fase

| Caso | Fase | Qué debe demostrar |
|---|---|---|
| Proyecto sin fila antigua | 2 | La lista queda vacía y crear funciona. |
| Proyecto con fila antigua | 2 | Aparece un único `legacy` con el estado y título originales. |
| Migración repetida | 2 | No duplica ni pisa `legacy`. |
| Guardado con versión antigua | 2 | Responde conflicto y no pisa el documento. |
| Copia y recuperación | 2/3 | Quedan asociadas al documento correcto. |
| Crear, duplicar, renombrar | 3 | La lista y los metadatos reflejan el cambio. |
| Archivar, eliminar, restaurar | 3 | El contenido se conserva y se puede recuperar. |
| Enlace profundo | 4 | Abre exactamente el documento y respeta permisos. |
| Invitado | 4 | Puede abrir/exportar, no modificar. |
| MCP sin id | 4 | La resolución es determinista y documentada. |
| MCP con id ajeno | 4 | Se rechaza sin filtrar contenido. |

## 10. Criterio de salida de la Fase 1

- Contrato de identidad, metadatos, estados y operaciones cerrado.
- Modelo de datos y migración idempotente/reversible documentados.
- Hoja de cálculo explícitamente fuera de alcance.
- Mapa de consumidores actualizado: `app_documents`, copias, recuperación, URLs, exportaciones y MCP.
- Sin cambios de código, URLs, permisos, datos ni versión del Site.

## 11. Cierre de la Fase 2

Implementado el 2026-11-21:

- Migración `drizzle/0042_tranquil_mercury.sql`: tabla `aula_documents`, índice por proyecto/estado y `document_id` nullable en `document_copies`.
- `lib/server/aula-documentos/documents-repository.ts` y `documents.ts`: lista, lectura, migración `legacy`, guardado con versión y límite de 200.000 caracteres.
- API `GET /api/aula-documentos`, `GET /api/aula-documentos/:id` y `POST /api/aula-documentos/:id` con 401/403/404/409/413 coherentes.
- `document_copies` acepta `doc` en la API y conserva la compatibilidad cuando no se indica.
- Recuperación local con clave por documento y migración desde la clave antigua; la clave antigua no se borra.
- `app_documents` sigue intacta: el cliente anterior y las demás apps pueden seguir leyendo el estado único.
- Pruebas de migración SQL, migración repetida, conflicto optimista, límites, API, copias y recuperación local.

El rollback local consiste en dejar de leer `aula_documents` y conservar `app_documents`; después del primer guardado nuevo, los documentos adicionales deben exportarse antes de revertir. No hay migraciones remotas ni cambios de UI en esta fase.

## 12. Cierre de la Fase 3

Implementado el 2026-11-21:

- El panel lateral **Documentos** muestra título, extracto, fecha, documento activo, archivados y papelera.
- Acciones: nuevo, abrir, duplicar, renombrar, archivar, eliminar lógico y restaurar.
- El último documento abierto se guarda en `localStorage` por proyecto; un documento activo inválido cae al primero disponible.
- `useAulaPersistence` usa la API de la suite y conserva conflicto optimista, autosave, recuperación y cierre seguro.
- Crear y duplicar generan un id nuevo; archivar/eliminar no borran el contenido y se pueden restaurar.
- Al cambiar de documento se intenta guardar el actual; si no se puede, no se pierde el documento abierto.
- La eliminación lógica conserva el contenido en la papelera; el usuario recibe confirmación y puede restaurarlo.
- Pruebas de endpoints de creación/acciones, hook de suite, panel visual, renombrado, cancelación y restauración.

Limitación de esta fase: MCP y las URLs profundas con `doc` se conectan en la Fase 4; hasta entonces el panel usa el último abierto local y MCP sigue leyendo la fila `legacy`.
