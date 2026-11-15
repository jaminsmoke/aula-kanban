# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** MCP-05A + MCP-05C activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** MCP-05A y MCP-05C están en el roadmap activo; MCP-05B, MCP-05D y MCP-05E siguen aquí. UI-03 se completó; UI-01, HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron; PER-01 sigue archivado con su trabajo pendiente abajo; SYNC-01 se queda aquí como norma operativa.

---

## 2026-11-15 — MCP-05B · Excalidraw por MCP

- Contexto: la app Excalidraw escribe en `boards` con `ownerType` `task`, `project` o `space`; `ownerId` identifica la tarea o el proyecto. El snapshot es JSON de hasta 2 MB, la escritura usa revisión optimista y `BoardRoom` sincroniza la escena en vivo. Las cuentas invitadas solo leen y el alumnado solo puede editar pizarras de sus tareas.
- Qué falta:
  - [ ] Extraer `ownerExists` y `canWrite` de `app/api/boards/route.ts` a `lib/server/boards.ts` para que la API y MCP compartan permisos y validación.
  - [ ] `leer_pizarra` (`proyectoId`, `tipo` `task | project | space`, `duenoId`) devuelve `{ snapshot, revision, updatedAt }`; la pizarra de Mi espacio usa `tipo: "space"` y `duenoId` igual al proyecto.
  - [ ] `guardar_pizarra` (mismos argumentos, `snapshot` de hasta 2 MB y `revision`) exige permiso de escritura y devuelve `conflict` 409 con la revisión actual si otra sesión guardó antes.
  - [ ] `anadir_a_pizarra` acepta una lista acotada de elementos `texto | rectangulo | elipse | flecha` con posición y texto; el servidor construye los elementos de Excalidraw, los fusiona con la escena existente y no obliga al agente a escribir JSON interno.
  - [ ] Tras guardar por MCP, enviar la escena al `BoardRoom` de `${proyectoId}:${tipo}:${duenoId}` para que una pestaña abierta no se quede con la escena vieja.
  - [ ] Aplicar `not_found` si la app está desinstalada y rechazar escrituras de invitados o de alumnado fuera de sus tareas.
- Criterios mínimos: no se pisa una revisión ajena; no se puede escribir una pizarra de otra persona; la pizarra de Mi espacio y las de tarea/proyecto usan el mismo contrato; los límites de 2 MB se respetan; la sala en vivo recibe el cambio.
- Notas técnicas: `app/api/boards/route.ts` ya valida tamaño, dueño, permisos y revisión; no reimplementarlo. `BoardRoom` necesitará un método o mensaje interno para publicar una escena guardada por el servidor. Sin migraciones ni subida de imágenes por MCP en esta fase.

## 2026-11-15 — MCP-05D · Programación por bloques por MCP

- Contexto: la app Blockly guarda la serialización de `Blockly.serialization.workspaces` en `app_documents` (máximo 200 KB, invitados 403). El estado es un JSON por proyecto y app, sin revisión optimista. La app genera y ejecuta código en el navegador; esa capacidad no se traslada al servidor.
- Qué falta:
  - [ ] `leer_programa_bloques` (`proyectoId`) devuelve `{ estado, actualizado }` o `null` si no hay programa guardado.
  - [ ] `guardar_programa_bloques` (`proyectoId`, `estado` JSON) valida la forma mínima `blocks.blocks[]`, serializa y guarda con el mismo formato que `useBlockly`.
  - [ ] Rechazar JSON inválido, estados de más de 200 KB y escrituras de invitados; aplicar `not_found` si la app está desinstalada y resolver el acceso al proyecto antes de leer o escribir.
  - [ ] Actualizar el contrato de herramientas, snapshot y matriz; documentar que no se genera, ejecuta ni valida código en el servidor.
- Criterios mínimos: un estado guardado por la web se puede leer por MCP y viceversa; la forma mínima se valida antes de guardar; no se pierden campos desconocidos de la serialización; los invitados siguen en solo lectura.
- Notas técnicas: compartir el límite de `app_documents` en una constante y reutilizar `readAppDocument`/`saveAppDocument`; no crear tabla ni endpoint nuevos.

## 2026-11-15 — MCP-05E · Diagramas por MCP

- Contexto: la app Diagramas guarda `{ code }` en `app_documents` (máximo 200 KB, invitados 403) y ofrece plantillas definidas en `mermaid-templates.ts`. La vista previa y la validación de sintaxis se quedan en el navegador; el servidor no renderiza Mermaid.
- Qué falta:
  - [ ] `leer_diagrama` (`proyectoId`) devuelve `{ codigo, actualizado }` o `null` si no hay diagrama guardado.
  - [ ] `guardar_diagrama` (`proyectoId`, `codigo` de hasta 200 KB) guarda `{ code }`, rechaza invitados y aplica `not_found` si la app está desinstalada.
  - [ ] `listar_plantillas_diagrama` devuelve las plantillas actuales (flujo, secuencia, Gantt, clases, estados y línea de tiempo) desde una ubicación compartida, no desde un módulo cliente.
  - [ ] Documentar que no se valida sintaxis, no se renderiza SVG y no se exporta desde MCP en esta fase.
- Criterios mínimos: el código guardado por la web se lee por MCP y viceversa; las plantillas coinciden con las de la app; el límite de 200 KB se respeta; no hay migración ni render en el Worker.
- Notas técnicas: mover `MERMAID_TEMPLATES` a `lib/` o a una carpeta compartida de la app y hacer que la UI y MCP importen la misma lista. Reutilizar el contrato común de MCP-05A y el mismo helper de `app_documents` que Blockly.

## 2026-11-15 — PER-03 · Purga segura de archivos sin uso

- Contexto: se ha verificado la subida de archivos, pero actualmente solo se limpian los objetos al eliminar su proyecto. Cambiar una miniatura o cancelar una subida no elimina necesariamente sus objetos. **La purga automática aún no está implementada.**
- Qué falta: inventariar cómo se referencian archivos desde tareas, pizarras, documentos y MCP; definir propiedad y referencias compartidas, subidas sin guardar y un periodo de gracia. Diseñar una limpieza reintentable que evite carreras entre creación, guardado y borrado; elegir un mecanismo de ejecución compatible con Sites. Implementar y probar antes de activar.
- Criterios mínimos: no borrar archivos compartidos, aún editándose o usados por otras aplicaciones; conservar metadatos hasta confirmar la eliminación, tolerar fallos y evitar que una nueva referencia apunte a un objeto en proceso de borrado. Probar concurrencia y recuperación además de los casos de sustitución, cancelación y eliminación.
- Notas técnicas: `uploads` guarda `purpose` y URL, pero no una relación completa de referencias. Hay URLs libres y estados JSON; deducir ausencia de uso solo de `tasks.image_url` o borrar inmediatamente sería inseguro. La automatización de tareas periódicas requiere soporte explícito; no prometer una purga temporal hasta verificarlo.

## 2026-11-15 — PER-01B · Inventario de R2 y copias antiguas

- Contexto: el 2026-11-15 la subida web y la lectura después de recargar funcionaron en producción; la prueba temporal se retiró y el panel mostraba 0 filas en `uploads`. El diagnóstico solo confirma que R2 responde, no que el bucket esté vacío.
- Qué falta: enumerar los objetos de R2 de forma paginada y protegida para administración, cotejarlos con D1, comprobar si existe alguna copia de archivos antiguos y documentar el destino de cada posible huérfano. No borrar objetos desconocidos sin identificarlos.
- El roadmap anterior se conserva íntegro en [`historial/roadmap-per-01.md`](historial/roadmap-per-01.md), incluidos el alcance y los criterios aún pendientes.

## 2026-11-15 — PER-02 · Evaluar miniaturas derivadas

- Contexto: PER-01 ha verificado la subida y lectura de imágenes originales en producción. Por ahora se conservan los originales para mantener simple la persistencia; no se ha incorporado un generador de miniaturas.
- Qué falta antes de retomarlo: medir el impacto real de imágenes grandes en el tablero, comparar procesamiento en cliente con un binding de imágenes disponible y decidir si merece la complejidad.
- Notas técnicas: respetar permisos, conservar el original y diseñar la limpieza de derivados sin afectar archivos existentes.

## 2026-11-15 — SYNC-01 · Sincronizar el repositorio al cerrar cada roadmap

- Contexto: hay dos destinos distintos. El deploy en Sites lo hace Codex; el repositorio personal `jaminsmoke/aula-kanban` (usuario JaminSmoke) se actualiza con commits locales y un push al cerrar el roadmap. El push a GitHub no despliega en Sites.
- Decisión (2026-11-15): no pasa al roadmap; se ejecuta al cerrar cada roadmap y se conserva aquí como norma operativa. Los pushes intermedios consumen CI y cuota, así que no se usan para probar.
- Qué falta antes de retomarlo:
  - [ ] Tras cada bloque verificado: `git status`, checks y commit local; no hacer push.
  - [ ] Al cerrar el roadmap: actualizar `docs/changelog.md`, reiniciar `docs/roadmap.md` y hacer un único `git push github main`.
  - [ ] No cambiar la versión ni ejecutar `release:prepare` solo para sincronizar GitHub; la versión la fija la publicación.
  - [ ] Comprobar que no se cuelan secretos, `.env*`, `.dev.vars*` ni datos de producción.
- Notas técnicas: publicación y sincronización son operaciones distintas; el commit no sustituye al flujo de Sites.
