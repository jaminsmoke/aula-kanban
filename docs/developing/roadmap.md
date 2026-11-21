# Roadmap ADOC-17 — Varios documentos y gestión de la suite

> **Estado:** Activo (2026-11-21) · **Origen:** ADOC-17 del backlog
> **Backlog:** 5 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Definir un modelo de varios documentos por proyecto y migrar el documento único actual sin pérdida.
- [ ] Añadir lista, crear, duplicar, renombrar, archivar/eliminar y restaurar con copia.
- [ ] Mantener URLs profundas, permisos, invitados y MCP sin ambigüedad sobre qué documento se abre.
- [ ] Mostrar fecha, extracto y estado de cada documento.
- [ ] Añadir pruebas de concurrencia, cuotas y recuperación.
- [ ] Criterio de éxito: se pueden tener varios documentos sin perder el actual, abrir uno concreto desde un enlace y revertir una eliminación; la migración conserva el documento existente.

## 2. Alcance

**Dentro:**

- Aula Documentos como primera app con suite documental.
- Identidad estable de documento, metadatos de lista y migración desde el estado único.
- Ciclo de vida: crear, duplicar, renombrar, archivar, eliminar con copia y restaurar.
- Último documento abierto por cuenta y proyecto.
- URLs profundas, permisos de proyecto, invitados y MCP.
- Copias portables, recuperación y cuotas asociadas a cada documento.
- Pruebas de migración, concurrencia, límites y recuperación.
- Documentación, ayuda y cierre.

**Fuera:**

- Migrar Hoja de cálculo u otras apps al mismo modelo en este roadmap.
- Edición colaborativa en tiempo real o cursores compartidos.
- Historial de versiones visible, ramas o fusión de documentos.
- Cambiar el esquema canónico de `AulaDocument`, las URLs públicas existentes o los permisos.
- Publicar, aplicar migraciones remotas o cambiar la versión del Site.
- Añadir una librería de gestión de estado o de edición nueva.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `projectId + documentId` como identidad | Usar el título o el índice de lista | El título cambia y el índice se reordena; el id debe ser estable. |
| Migrar el documento único a un documento inicial | Empezar con una lista vacía | La migración no puede perder el trabajo existente. |
| La suite vive primero en Aula Documentos | Cambiar `app_documents` para todas las apps | El contrato debe probarse en una app antes de generalizarlo. |
| Archivar antes de eliminar | Borrado directo sin estado intermedio | Permite restaurar y evita pérdidas por error. |
| Copia de recuperación por documento | Una copia global por proyecto | Restaurar un documento no debe depender del estado de otro. |
| URL con id estable | URL con el título | El título puede repetirse o cambiar; el id resuelve el documento exacto. |
| MCP recibe un id explícito o usa el último abierto de forma documentada | Adivinar por título | Evita operar sobre el documento equivocado. |
| Último abierto en almacenamiento local | Guardarlo en el documento compartido | Es una preferencia de cuenta, no un dato del documento. |
| Sin anidar documentos dentro del JSON | Guardar la lista dentro de `AulaDocument` | Una lista anidada complica migraciones, copias y concurrencia. |

## 4. Punto de partida

- `app_documents` tiene una clave primaria `projectId + appId` y un único `state` JSON por app.
- Aula Documentos usa `appId = "aula-documentos"`; el documento activo vive en ese estado.
- Las copias portables se guardan en `document_copies` por proyecto, sin `documentId`.
- Tamaño actual de Aula Documentos: **26 archivos / 5.353 líneas** en la app, **18 / 2.192** en `shared/aula-documentos`, **21 / 3.152** en `lib/domain/aula-documentos`, **2 / 344** en `lib/server/aula-documentos` y **3 / 229** en `app/api/aula-documentos`.
- El diálogo de importación y la recuperación ya están separados; ADOC-16 dejó la importación unificada.
- Suite registrada al abrir: **244 archivos / 1.655 pruebas**; presupuesto `aula-documentos` **370.000 B gzip**; Site `1.1.37`.

## 5. Fases

### Fase 1 — Contrato, modelo y mapa de migración

- [x] Inventariar el documento único, copias, recuperación, exportaciones, URLs y herramientas MCP que lo consumen.
- [x] Definir el contrato de la suite: id, título, extracto, fechas, estado, autor y último abierto.
- [x] Diseñar la migración idempotente y reversible desde `app_documents` al documento inicial.
- [x] Decidir el alcance de Hoja de cálculo y dejar escrito que no se migra en este roadmap.
- [x] Documentar el modelo y los límites en `docs/developing/aula-documentos-suite.md`.
- **Criterios:** el contrato cubre crear, listar, abrir, guardar, archivar, eliminar, restaurar y migrar; no se mueve código todavía.
- **Cierre (2026-11-21):** [`aula-documentos-suite.md`](aula-documentos-suite.md) fija identidad `projectId + documentId`, estados `active/archived/deleted`, metadatos de lista, migración `legacy` idempotente, asociación de copias/recuperación, URL con `doc`, MCP con `documentoId` y la exclusión explícita de Hoja de cálculo. Sin cambios de código.

### Fase 2 — Persistencia y migración

- [ ] Añadir la identidad de documento y la consulta de lista sin romper el documento único existente.
- [ ] Migrar el estado actual al primer documento con una operación idempotente y verificable.
- [ ] Asociar recuperación, copias y cuotas al documento correcto.
- [ ] Mantener compatibilidad de lectura para clientes y datos anteriores durante la transición.
- [ ] Probar migración, ejecución repetida, conflicto de versión y rollback local.
- **Criterios:** el documento existente aparece como primer documento, no se duplica al reintentar y ningún dato queda huérfano.

### Fase 3 — Lista y ciclo de vida

- [ ] Crear la lista de documentos con fecha, extracto y estado.
- [ ] Implementar crear, duplicar, renombrar, archivar, eliminar con copia y restaurar.
- [ ] Recordar el último documento abierto por cuenta y proyecto.
- [ ] Añadir estados vacíos, errores, foco, teclado y comportamiento móvil.
- [ ] Probar creación, duplicado, renombrado, restauración y cancelación.
- **Criterios:** se puede gestionar una suite sin perder el documento actual y sin depender de una acción oculta.

### Fase 4 — URL, permisos, MCP y concurrencia

- [ ] Añadir una URL profunda estable por documento y resolverla con permisos de proyecto e invitados.
- [ ] Adaptar las herramientas MCP para recibir o resolver el documento sin ambigüedad.
- [ ] Conservar la concurrencia optimista por documento y los límites de cuota.
- [ ] Revisar exportación, copia portable y recuperación con varios documentos.
- [ ] Añadir pruebas de enlace inválido, documento ajeno, invitado, conflicto y cuota.
- **Criterios:** cada enlace y herramienta identifica un único documento; un documento ajeno no se revela ni se modifica.

### Fase 5 — Cierre

- [ ] Revisar que la migración es reversible y que no hay documentos o copias huérfanas.
- [ ] Actualizar ayuda, documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- **Criterios:** la suite conserva datos y permisos, la migración es segura, CI y presupuestos pasan; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Migración destructiva | Pérdida del documento actual | Copia previa, migración idempotente y rollback local probado. |
| URL ambigua | Abrir o editar el documento equivocado | Id estable y validación de pertenencia antes de cargar. |
| MCP sin documento explícito | Operar sobre otro documento | Id obligatorio o resolución documentada con el último abierto. |
| Copias y recuperación globales | Restaurar el documento equivocado | Asociar cada copia y recuperación a su `documentId`. |
| Lista demasiado costosa | Apertura lenta | Metadatos separados del JSON y consulta indexada por proyecto/fecha. |
| Cuota por documento | Bloqueo o pérdida silenciosa | Límites y errores explícitos antes de guardar o importar. |
| Refactor de UI demasiado grande | Pérdida de cobertura | Extraer hooks y dominio por fase; conservar pruebas de flujo. |
| Migraciones remotas accidentales | Datos reales afectados | Solo migraciones locales; prohibido publicar o aplicar en remoto. |

## 7. Notas de sesión

- 2026-11-21: ADOC-17 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **5 entradas**; siguiente candidato **ADOC-18**.
- ADOC-16 queda cerrado y archivado en `docs/historial/roadmap-adoc-16.md`.
- 2026-11-21: **Fase 1 completada.** Contrato y mapa en [`aula-documentos-suite.md`](aula-documentos-suite.md): identidad estable, metadatos, estados, migración `legacy`, copias/recuperación por documento, URL profunda y MCP con id explícito. Hoja de cálculo queda fuera. Sin cambios de código.
- No se ha cambiado código de producto al abrir este roadmap; no hay publicación ni migraciones remotas.
- El Site sigue en `1.1.37`.
