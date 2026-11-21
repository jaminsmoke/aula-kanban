# Comentarios, revisión e historial de Aula Documentos

> **Estado:** Fases 1–2 cerradas · **Fecha:** 2026-11-21
> **Alcance:** comentarios anclados, hilos, historial de versiones, permisos, exportación y límites.
> **Roadmap:** [`roadmap.md`](roadmap.md) · **Suite:** [`aula-documentos-suite.md`](aula-documentos-suite.md)
> **Regla:** esta fase no mueve código de producto; fija el contrato y los límites.

---

## 1. Decisión

Comentarios e historial se guardan **fuera del JSON canónico de `AulaDocument`**.

- El documento Tiptap sigue siendo el contenido editable.
- Los comentarios son datos de revisión, no contenido.
- Las versiones son snapshots completos del `AulaDocument` validado.
- La API y las tablas nuevas respetan la identidad `projectId + documentId` de ADOC-17.
- El cliente muestra comentarios e historial sin modificar el árbol del documento.
- La autorización se aplica siempre en servidor; ocultar un botón no es una defensa.

## 2. Punto de partida

| Área | Estado actual |
|---|---|
| Documento | `aula_documents` guarda el JSON canónico y un `updatedAt` optimista. |
| Copias | `document_copies` y las recuperaciones locales permiten restaurar una copia completa, pero no un historial navegable. |
| Roles | `owner`, `admin`, `teacher`, `student` y `guest`; el invitado ya está en solo lectura. |
| Edición | El editor Tiptap y las exportaciones trabajan sobre el documento activo. |
| Revisión | No hay comentarios, anclas, hilos, resolución ni autoría de revisión. |
| Versiones | No hay lista de versiones con nombre, autor y fecha. |
| Concurrencia | El guardado del documento ya usa `expectedUpdatedAt`; comentarios y versiones no existen todavía. |

Suite: **258 archivos / 1.714 pruebas**. Aula: **378.750 / 379.000 B gzip**. arquitectura: **440 archivos / 1.078 imports**. Site: `1.1.37`.

## 3. Modelo de comentarios

### 3.1 Tabla

Tabla propuesta: `aula_document_comments`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | text | UUID. |
| `projectId` | text | Proyecto propietario. |
| `documentId` | text | Documento de la suite. |
| `parentId` | text \| null | Raíz del hilo o comentario raíz. |
| `authorUserId` | text \| null | Cuenta autora. |
| `authorName` | text | Nombre visible congelado al crear. |
| `body` | text | Texto del comentario. |
| `anchor` | text | JSON validado con la selección original. |
| `status` | text | `open`, `resolved` o `deleted`. |
| `createdAt` | integer | Fecha de creación. |
| `updatedAt` | integer | Versión de la fila para concurrencia. |
| `resolvedAt` | integer \| null | Fecha de resolución. |
| `resolvedBy` | text \| null | Cuenta que resolvió. |

Índices: `(projectId, documentId, status, createdAt)`, `(projectId, documentId, parentId)` y `(projectId, documentId, updatedAt)`.

### 3.2 Ancla

```ts
type AulaCommentAnchor = {
  from: number;
  to: number;
  quote: string;
  prefix: string;
  suffix: string;
  blockIndex: number;
};
```

- `from`/`to` son posiciones Tiptap del momento de creación.
- `quote` es el texto seleccionado, recortado a 500 caracteres.
- `prefix` y `suffix` son hasta 80 caracteres de contexto.
- `blockIndex` es el índice del bloque de nivel superior que contiene el ancla.
- Al abrir, se intenta resolver la cita en el documento actual; si no es única, se usa el contexto; si aun así no se puede, el comentario se muestra como **huérfano** con su cita.
- El comentario nunca se borra automáticamente porque su ancla desaparezca.

### 3.3 Hilos y estados

- Un comentario raíz puede tener respuestas; las respuestas no se anidan más.
- Solo el autor puede editar o borrar su comentario mientras siga abierto.
- Profesorado y administración pueden resolver, reabrir o borrar cualquier comentario del documento.
- Resolver el comentario raíz resuelve el hilo; reabrirlo reabre el hilo.
- Borrar es lógico (`deleted`) y conserva el hilo para auditoría hasta la purga.
- El estado vacío muestra el documento sin comentarios y una acción para comentar una selección.

## 4. Modelo de versiones

### 4.1 Tabla

Tabla propuesta: `aula_document_versions`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | text | UUID. |
| `projectId` | text | Proyecto. |
| `documentId` | text | Documento. |
| `name` | text | Nombre visible, máximo 120 caracteres. |
| `state` | text | `AulaDocument` serializado y validado. |
| `schemaVersion` | integer | Versión del documento. |
| `sizeBytes` | integer | Tamaño del snapshot. |
| `createdBy` | text \| null | Cuenta autora. |
| `createdByName` | text | Nombre visible congelado. |
| `createdAt` | integer | Fecha de creación. |
| `kind` | text | `manual` o `pre-restore`. |
| `baseUpdatedAt` | integer | Versión del documento al crear el snapshot. |

Índices: `(projectId, documentId, createdAt)`, `(projectId, documentId, kind)` y `(projectId, documentId, baseUpdatedAt)`.

### 4.2 Creación y restauración

- **Versión manual:** el usuario elige un nombre; si lo deja vacío se usa `Versión del {fecha}`.
- **Pre-restauración:** antes de restaurar se guarda el estado actual con `kind = "pre-restore"` y un nombre generado.
- El snapshot se valida con `parseAulaDocument` antes de guardarse.
- Al restaurar:
  1. Se comprueba que el documento siga en `expectedUpdatedAt`.
  2. Se guarda el snapshot anterior como `pre-restore`.
  3. Se sustituyen `title`, `content` y `presentation` del documento; la identidad, estado y autoría de la suite se conservan.
  4. Se actualiza `updatedAt` y se informa del resultado.
- Si la versión cambió desde que se abrió, se devuelve conflicto y no se escribe nada.
- La lista no carga el `state`; el contenido se lee al previsualizar o restaurar.

## 5. Permisos

| Acción | Guest | Student | Teacher | Admin / Owner |
|---|---|---|---|---|
| Leer comentarios | Sí | Sí | Sí | Sí |
| Crear comentario/respuesta | No | Sí | Sí | Sí |
| Editar/borrar su comentario | No | Sí | Sí | Sí |
| Resolver/reabrir hilo | No | No | Sí | Sí |
| Borrar comentario ajeno | No | No | Sí | Sí |
| Leer historial | No | No | Sí | Sí |
| Crear versión | No | No | Sí | Sí |
| Restaurar versión | No | No | Sí | Sí |

- El alumnado solo participa si es miembro activo del proyecto.
- El servidor comprueba pertenencia, documento y rol en cada operación.
- La UI oculta o desactiva acciones no permitidas, pero la API vuelve a comprobarlas.
- El modo lectura del documento no cambia: un guest sigue sin editar y sin comentar.

## 6. API y concurrencia

Rutas previstas:

- `GET /api/aula-documentos/[id]/comments` — hilos y anclas, paginados.
- `POST /api/aula-documentos/[id]/comments` — crear raíz o respuesta.
- `PATCH /api/aula-documentos/[id]/comments/[commentId]` — editar, resolver, reabrir o borrar.
- `GET /api/aula-documentos/[id]/versions` — metadatos paginados.
- `POST /api/aula-documentos/[id]/versions` — crear snapshot manual.
- `POST /api/aula-documentos/[id]/versions/[versionId]/restore` — restaurar con versión esperada.

Reglas:

- Todas las rutas usan `withProjectRoute`, origen y JSON acotado.
- Las mutaciones de comentarios usan `expectedUpdatedAt` de la fila del comentario.
- La restauración usa `expectedUpdatedAt` del documento.
- La API devuelve `capabilities` por comentario (`canEdit`, `canDelete`, `canResolve`) para que la UI refleje los permisos del usuario actual.
- Crear o resolver comentarios no cambia el `updatedAt` del documento ni bloquea el autosave.
- Los errores devuelven códigos estables: no autorizado, no encontrado, conflicto, límite y validación.

## 7. Exportación y retención

### Exportación

- La exportación e impresión de comentarios es **opcional** y está desactivada por defecto.
- Cuando se solicita, se añade una sección con cita, autor, fecha, estado y cuerpo; los huérfanos se agrupan al final.
- Las notas privadas no se mezclan con comentarios.
- PDF/HTML incluyen comentarios solo bajo la opción explícita. DOCX/PPTX no los incluyen en esta entrega.

### Límites iniciales

| Límite | Valor |
|---|---:|
| Comentarios por documento | 500 |
| Longitud del cuerpo | 2.000 caracteres |
| Longitud de la cita | 500 caracteres |
| Profundidad de respuestas | 1 |
| Versiones por documento | 50 |
| Tamaño de snapshot | 190.000 caracteres |
| Retención de versiones | 180 días |
| Página de historial/comentarios | 20 elementos |

La retención y las cuotas se aplican en servidor y se documentan en la ayuda. La purga de comentarios borrados y versiones antiguas se añade en la fase 4.

## 8. Teclado y accesibilidad

- `Ctrl/Cmd+Alt+M` abre el panel de comentarios con la selección actual, sin pisar atajos del editor.
- El panel se puede recorrer con Tab/Shift+Tab; `Escape` cierra el panel y devuelve el foco al editor.
- Los hilos usan botones y `aria-expanded`/`aria-current` cuando corresponda.
- Las anclas huérfanas se anuncian como tales y conservan su cita.
- Las acciones destructivas piden confirmación.
- La UI se revisa en cinco anchos y con lector de pantalla básico.

## 9. Límites y exclusiones

- No se modifican nodos, marcas ni el esquema de Tiptap por comentarios.
- No hay control de cambios ni diff de texto.
- No hay notificaciones, correo, websockets ni colaboración en tiempo real.
- No se buscan comentarios entre documentos.
- No se cambia `schemaVersion` de `AulaDocument`.
- No se publican ni aplican migraciones remotas desde este roadmap.

## 10. Matriz de pruebas

| Caso | Debe demostrar |
|---|---|
| Ancla única | Abre en la cita correcta y resalta sin modificar el documento. |
| Cita repetida | Usa contexto y no elige una coincidencia arbitraria. |
| Bloque eliminado | Comentario huérfano visible y recuperable. |
| Hilo | Responder, resolver, reabrir y borrar respetan permisos. |
| Roles | Guest, student, teacher y admin solo pueden lo permitido. |
| Límites | 500 comentarios, longitud, paginación y errores claros. |
| Versión manual | Guarda, lista, previsualiza y conserva autor/fecha. |
| Restauración | Restaura título/contenido/presentación con snapshot previo. |
| Conflicto | No pisa cambios concurrentes y avisa. |
| Retención | Purga versiones antiguas sin tocar el documento. |
| Exportación | Comentarios solo con opción explícita; sin notas privadas. |
| Teclado/móvil | Panel, foco, Escape y cinco anchos. |

## 11. Criterio de salida de la Fase 1

- Modelo de comentarios, anclas, hilos y versiones cerrado.
- Permisos, concurrencia, exportación y retención definidos.
- Tablas, rutas y límites documentados; sin migraciones remotas.
- Matriz de pruebas y exclusiones explícitas.
- Sin cambios de código, datos, URLs, permisos ni versión del Site.

## 12. Cierre de la Fase 2

Implementado el 2026-11-21:

- Migración `0043_lying_human_robot.sql` con `aula_document_comments` e índices por documento, estado e hilo.
- Repositorio y servicio de comentarios con creación, respuestas de un nivel, edición, borrado lógico, resolución y conflicto optimista.
- Permisos en servidor: guest solo lectura; estudiante crea y gestiona lo propio; profesorado/administración resuelve y borra.
- Anclas con cita, contexto, posición original y bloque; resolución por cita/contexto y fallback huérfano.
- Hook de cliente y panel lateral con crear, responder, editar, resolver, reabrir, borrar, filtrar y saltar al texto.
- El panel se abre desde la barra de estado o con `Ctrl/Cmd+Alt+M`; los invitados lo ven en lectura.
- Pruebas de anclas, permisos, hilos, creación, conflicto y flujo de interfaz.
- Suite: **261 archivos / 1.725 pruebas**; build **382.116 B**; presupuesto **384.000 B**.
