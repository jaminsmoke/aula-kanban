# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** UI-01 pasó al roadmap activo; PER-01 se archivó con su trabajo pendiente conservado abajo; HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron; SYNC-01 se queda aquí como norma operativa.

---

## 2026-11-15 — UI-03 · Reorganizar las secciones de Ajustes

- Contexto: el selector de tema ya vive en Ajustes > Apariencia. Ajustes mantiene `Cuenta` y `Administradores`, pero `Administradores` mezcla la gestión de fichas con el diagnóstico de almacenamiento, y `Cuenta` acumula los tokens MCP y el cierre de sesión. La jerarquía de secciones queda fuera de UI-01.
- Qué falta: decidir un mapa estable de secciones (Cuenta, Apariencia, Administradores, Almacenamiento, Tokens MCP, Auditoría…), separar responsabilidades, revisar qué secciones requieren propietario o administración y conservar las URLs existentes con compatibilidad o redirecciones. Revisar también el sidebar en móvil.
- Criterios mínimos: cada sección agrupa un solo tema; los permisos no muestran secciones restringidas; las URLs canónicas y atrás/adelante siguen funcionando; no se duplica lógica de cuenta, administración ni almacenamiento.
- Notas técnicas: `?view=ajustes&section=apariencia` ya es válido. `SettingsStorage` es un componente independiente en `app/board/settings/settings-storage.tsx`; se puede promover a sección propia sin tocar la API. La entrada no cambia el alcance de UI-01 ni de la fase 7.1.

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

## 2026-11-14 — MCP-05 · Acciones de cada app: Diagramas, Bloques, Pizarras y Herramientas de aula

- Contexto: «usar las aplicaciones» desde el plugin significa leer y escribir su trabajo guardado. Diagramas y Bloques guardan un documento JSON por proyecto en `app_documents` (`/api/app-documents`, máximo 200 KB, guest 403). Excalidraw guarda en `boards` (`ownerType` `task` | `project` | `space`, máximo 2 MB, revisión optimista, alumnado solo en sus tareas). Herramientas de aula no guarda nada en el servidor (historial de la calculadora en `localStorage`). Depende de MCP-03; los enlaces de MCP-04.
- Qué falta antes de retomarlo:
  - [ ] **Diagramas (`mermaid`):** `leer_diagrama` (`proyectoId`) devuelve `{ codigo, actualizado }`. `guardar_diagrama` (`proyectoId`, `codigo` hasta 200 KB) guarda `{ code }`, el mismo formato que `mermaid-app.tsx`. `listar_plantillas_diagrama` devuelve `MERMAID_TEMPLATES` (flujo, secuencia, Gantt…), movido a `lib/`.
  - [ ] **Bloques (`blockly`):** `leer_programa_bloques` devuelve la serialización de `Blockly.serialization.workspaces`. `guardar_programa_bloques` (`proyectoId`, `estado` JSON) valida la forma mínima (`blocks.blocks[]`) antes de guardar.
  - [ ] **Pizarras (Excalidraw):** `leer_pizarra` (`proyectoId`, `tipo` `task` | `project` | `space`, `duenoId`) devuelve escena y `revision`. `guardar_pizarra` (… `escena`, `revision`) aplica `canWrite` y devuelve `conflict` 409. `anadir_a_pizarra` (escritura: lista acotada de elementos `texto` | `rectangulo` | `elipse` | `flecha` con posición y texto) la construye el servidor para que el agente no tenga que generar JSON de Excalidraw a mano.
  - [ ] **Avisar a la sala en vivo:** al guardar una pizarra por MCP, enviar la escena nueva al `BoardRoom` de `${proyectoId}:${tipo}:${duenoId}`. Si no, una pestaña abierta seguiría con la escena vieja y su siguiente guardado chocaría con 409.
  - [ ] **Herramientas de aula (`edu-tools`):** `consultar_elemento` (lectura: `simbolo` o `numero`) sobre `periodic-elements.json`, que es un dato que ya existe.
  - [ ] Que todas las herramientas de una app respondan `not_found` («La aplicación no está instalada») si la app está desinstalada en la instancia.
- Decisión (2026-11-14): descartado el cálculo en el servidor (calculadora, ecuaciones, generar código de Bloques, validar sintaxis Mermaid). Motivo: `@cortex-js/compute-engine` pesa 6,3 MB y, con Blockly y Mermaid, engordaría el Worker. Se quedan en el navegador.
- Notas técnicas: una app nueva del catálogo debe declarar sus herramientas MCP en su carpeta, igual que se registra en `app/board/apps/registry.tsx`.
