# Documento de entrega vinculado a una tarea

> **Estado:** TASK-01 cerrado (Fases 1-3) · **Fecha:** 2026-11-22
> **Alcance:** modelo, migración local, API de tareas, permisos y navegación a Aula Documentos.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Punto de partida

- `lib/domain/task.ts` no tiene ninguna referencia a documentos.
- `tasks` no tiene columna de documento; el esquema está en `db/schema.ts`.
- La API valida la tarea en `app/api/tasks/route.ts` y persiste con `lib/server/tasks`.
- `aula_documents` se identifica por `project_id + id`; puede haber un id histórico `legacy`.
- La suite distingue documentos `active`, `archived` y `deleted`.
- La URL de Aula Documentos ya usa `doc=<id>` para seleccionar un documento.
- El editor de tareas no conoce la suite ni puede abrir otra app desde una tarea.

## 2. Decisión de modelo

Se añade una referencia opcional y única:

```sql
ALTER TABLE tasks ADD COLUMN document_id TEXT;
```

- `NULL` significa tarea sin documento.
- No se crea una tabla intermedia: la tarea tiene como máximo un documento de entrega.
- No se guarda una URL ni una copia del título; el identificador se resuelve contra la suite del mismo proyecto.
- Se admite el id histórico `legacy`, por lo que la validación no puede exigir UUID.
- La migración se genera y revisa en local; no se aplica en remoto desde el roadmap.

## 3. Contrato de datos y API

| Campo | Tipo | Regla |
|---|---|---|
| `documentId` | `string \| null` | Opcional; ausente en clientes antiguos |
| Crear tarea | `documentId?` | Si llega, debe ser un documento activo del mismo proyecto |
| Editar tarea | `documentId?` | `null` desvincula; omitido conserva el vínculo; string valida |
| Leer tarea | `documentId: string \| null` | Siempre presente en la respuesta nueva |
| Cliente antiguo | sin campo | No rompe; al editar otros campos conserva el vínculo existente |

La API de tareas solo devuelve el identificador. No incluye contenido, título ni estado del documento; la ficha resuelve esos datos desde la suite.

## 4. Estados del vínculo

| Estado de la suite | Ficha de tarea | Acción |
|---|---|---|
| Activo | Título y acción «Abrir documento» | Abre Aula Documentos con `doc` |
| Archivado | «Documento archivado» | No abre o abre en modo consulta si la suite lo permite |
| Eliminado | «Documento en la papelera» | No abre |
| Inexistente | «Documento no disponible» | Permite desvincular |
| Sin vínculo | «Sin documento» | Permite elegir uno activo |

Al archivar o eliminar un documento no se borra el vínculo de la tarea: la entrega debe conservar la referencia y explicar el estado.

## 5. Permisos

- Leer el vínculo requiere poder ver la tarea en el proyecto.
- Elegir o quitar el documento usa los mismos permisos que editar los campos de la tarea: docentes/administración, alumnado sobre su tarea o tarea sin asignar según las reglas existentes, nunca invitados.
- La validación del documento se hace por `project_id`; un id de otro proyecto no puede vincularse.
- La cuenta ajena al proyecto no recibe la tarea ni puede resolver el documento; la ruta de la suite mantiene su control de proyecto.
- El vínculo no concede permisos adicionales sobre el documento.

## 6. Navegación

La ficha reutilizará la navegación de apps y el parámetro `doc` existente. La acción debe:

1. resolver que el documento siga disponible;
2. abrir Aula Documentos en el proyecto activo;
3. seleccionar el documento con `doc=<id>`;
4. mantener una vuelta clara a la tarea o al tablero.

La implementación concreta se valida en la Fase 3; no se crea una ruta paralela si la navegación actual puede reutilizarse.

## 7. Matriz de pruebas

| Caso | Resultado esperado |
|---|---|
| Crear tarea sin documento | `documentId: null`, sin cambios de comportamiento |
| Vincular documento activo del proyecto | Se guarda y aparece en la ficha |
| Vincular documento de otro proyecto | Rechazo 400/403 sin filtrar datos |
| Editar una tarea antigua sin `documentId` | Conserva el vínculo actual |
| Enviar `documentId: null` | Desvincula |
| Documento archivado | La ficha muestra el estado y no abre una entrega inválida |
| Documento eliminado | La ficha muestra papelera y permite desvincular |
| Documento inexistente | Estado «no disponible» |
| Cuenta ajena al proyecto | No puede leer la tarea ni abrir el documento |
| Abrir desde tarea propia/asignada | Aula Documentos abre con el `doc` correcto |
| Volver desde la app | Se conserva el contexto esperado de tarea/tablero |

## 8. Migración y despliegue

- La columna es nullable: no requiere rellenar tareas existentes.
- La migración local se generará con el flujo Drizzle del repositorio y se revisará en la Fase 2.
- No se aplica ninguna migración remota desde este roadmap.
- Codex/Sites confirma la migración y la publicación cuando corresponda.

## 9. Baseline

- Arquitectura: **461 archivos / 1.155 imports / 0 problemas**.
- Suite: **268 archivos / 1.788 pruebas**.
- Aula Documentos: **386.830 / 387.000 B**.
- Hoja de cálculo: **313.047 / 315.000 B**.
- Site: `1.1.40`.
- Sin cambios de producto en esta fase.

## 10. Aplicado en la Fase 2

- `db/schema.ts` añade `tasks.document_id` nullable.
- `drizzle/0045_thin_joseph.sql` contiene `ALTER TABLE tasks ADD document_id text`; el journal queda con **46 entradas**.
- `TaskFields` y `Task` aceptan `documentId` opcional; la API lo valida como string o `null`.
- La creación comprueba que el documento sea activo y del mismo proyecto.
- La edición conserva el vínculo si el campo se omite, permite desvincular con `null` y valida un vínculo nuevo.
- La decoración de tareas devuelve siempre `documentId` (o `null`).
- Suite completa **268 archivos / 1.789 pruebas**; `npm run check` correcto.
- La migración no se ha aplicado en remoto; queda para la verificación de Codex/Sites.

## 11. Aplicado en la Fase 3

- `useTaskDocuments` carga una sola vez los documentos activos, archivados y eliminados del proyecto al abrir la ficha.
- El formulario ofrece los documentos activos y conserva visible un vínculo archivado, eliminado o ausente.
- El detalle muestra «Abrir …» para un documento activo y el estado claro para los demás casos.
- El tablero escribe `doc` antes de abrir Aula Documentos en Tienda; `buildBoardUrl` conserva ese parámetro desconocido.
- La apertura respeta el proyecto y la sesión; no se añade una ruta de documento paralela.
- Suite completa **269 archivos / 1.794 pruebas**; arquitectura **462 / 1.159**; build Aula **386.826 B** y Hoja **313.046 B**; `npm run check`, `app:budget`, `perf:budget` y `perf:office` correctos.
