# Roadmap TASK-01 — Abrir un documento de entrega desde su tarea

> **Estado:** Activo (2026-11-22) · **Origen:** TASK-01 del backlog
> **Backlog:** 1 entrada · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Permitir vincular un documento activo del proyecto desde la ficha de una tarea.
- [ ] Abrir ese documento en Aula Documentos con un solo paso, reutilizando `doc` y la navegación existentes.
- [ ] Mostrar un estado claro si el documento está archivado, eliminado o ya no existe.
- [ ] Criterio de éxito: una cuenta ajena al proyecto no puede abrir el documento, y la persona asignada o docente llega desde la tarea sin copiar URLs.

## 2. Alcance

**Dentro:**

- Modelo de tarea y esquema para una referencia opcional a un documento de `aula_documents`.
- Migración local del esquema, sin aplicarla en remoto desde este roadmap.
- Validación y persistencia en la API de tareas, preservando revisiones y permisos.
- Selector de documento activo en la ficha de tarea y estado del vínculo en el detalle.
- Apertura de Aula Documentos con el documento seleccionado y retorno coherente a la tarea.
- Permisos por proyecto, documento archivado/eliminado y referencia inexistente.

**Fuera:**

- Adjuntar archivos binarios a la tarea.
- Permitir varios documentos por tarea.
- Cambiar el modelo canónico de Aula Documentos o su historial.
- Compartir documentos entre proyectos.
- Aplicar migraciones remotas o publicar en Sites.
- Rediseñar el editor o el tablero.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `tasks.document_id` opcional | Tabla intermedia de varios documentos | La tarea necesita un único documento de entrega. |
| Referenciar `aula_documents` por `project_id + id` | Guardar una URL copiada | El identificador permite resolver estado, permisos y navegación. |
| Resolver el documento contra la API de la suite | Guardar solo un título | El título queda obsoleto y no detecta archivado, eliminación o falta de acceso. |
| Mantener la referencia si el documento se archiva o elimina | Borrar el vínculo automáticamente | La tarea debe explicar qué ocurrió, no perder la entrega silenciosamente. |
| Reutilizar `doc` y la navegación de apps | Crear una ruta paralela | Ya existe un contrato de selección de documento. |
| Migración local en este roadmap | Aplicar la migración en remoto | Codex/Sites confirma la migración y la publicación. |

## 4. Punto de partida

- `lib/domain/task.ts` no tiene ninguna referencia a documentos.
- `tasks` no tiene columna de documento; el esquema parte de `db/schema.ts`.
- La API de tareas valida campos con Zod en `app/api/tasks/route.ts` y persiste por `lib/server/tasks`.
- La suite de Aula Documentos expone documentos activos, archivados y eliminados por proyecto.
- La URL `doc=<id>` ya selecciona un documento al abrir Aula Documentos.
- Baseline: arquitectura **461 archivos / 1.155 imports**; suite **268 archivos / 1.788 pruebas**; Aula **386.830 / 387.000 B**; Hoja **313.047 / 315.000 B**; Site `1.1.40`.

## 5. Fases

### Fase 1 — Contrato, modelo y migración

- [ ] Definir el campo opcional, su validación y el contrato de respuesta de tareas.
- [ ] Decidir el comportamiento para documento archivado, eliminado o inexistente.
- [ ] Preparar la migración local y confirmar que no se aplica en remoto.
- [ ] Registrar los permisos y la matriz de pruebas sin cambiar producto.
- **Criterios:** modelo y contrato cerrados; migración local revisada; sin cambios funcionales.

### Fase 2 — Persistencia y API de tareas

- [ ] Añadir la referencia al tipo de tarea, la escritura, la lectura y la decoración.
- [ ] Validar que el documento pertenece al mismo proyecto y que el rol puede consultarlo.
- [ ] Conservar revisiones, conflictos y compatibilidad con clientes que no envían el campo.
- [ ] Cubrir creación, edición, lectura, proyecto ajeno y documento ausente.
- **Criterios:** persistencia atómica, sin fugas entre proyectos y tareas antiguas compatibles.

### Fase 3 — Ficha, selector y apertura

- [ ] Añadir el selector de documentos activos a la ficha de tarea.
- [ ] Mostrar el documento vinculado y su estado en el detalle.
- [ ] Abrir Aula Documentos con `doc` en un solo paso y volver a la tarea.
- [ ] Cubrir tarea propia, asignada, docente, lectura y documento archivado/eliminado.
- **Criterios:** flujo completo desde la tarea sin copiar URLs y estados claros.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Verificar permisos, documento archivado/eliminado y compatibilidad de tareas antiguas.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** flujo verificado, migración local preparada y ninguna publicación ni migración remota desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Fuga de un documento entre proyectos | Acceso indebido | Resolver siempre por `project_id` y documento del proyecto. |
| Borrar el vínculo al archivar | Pérdida de la entrega | Conservar la referencia y mostrar el estado. |
| Romper tareas antiguas | Fallo al editar | Campo opcional y compatibilidad con clientes sin `documentId`. |
| Migración remota accidental | Cambio de datos no verificado | Preparar la migración local y dejar la remota a Codex/Sites. |
| Dependencia de una URL copiada | Enlaces frágiles | Usar el identificador y la navegación `doc`. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** TASK-01 entra desde el backlog; queda DEV-01. Se empieza por el contrato del vínculo, la migración local y la matriz de permisos. Sin cambios de producto en esta apertura.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
