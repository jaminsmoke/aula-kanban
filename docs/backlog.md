# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** el 2026-11-15 DOC-07 + MCP-11, MCP-09 y MCP-10 se cerraron; PER-01 pasó al roadmap y SYNC-01 entra arriba; MCP-05 y los recortes siguen aquí, en su orden.

---

## 2026-11-15 — SYNC-01 · Sincronizar el repositorio tras cada publicación

- Contexto: hay dos destinos distintos. El deploy en Sites lo hace Codex; el repositorio personal `jaminsmoke/aula-kanban` (usuario JaminSmoke) se actualiza con commit y push desde local. El push a GitHub no despliega en Sites.
- Qué falta antes de retomarlo:
  - [ ] Repetir la rutina tras cada bloque verificado: `git status`, checks, commit y `git push github main`.
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

## 2026-11-14 — Recortes de rendimiento de los chunks pesados

- Contexto: la entrada del tablero ya está en torno a 150 KB gzip y las librerías grandes van en chunks lazy. Siguen existiendo descargas muy pesadas la primera vez que se usa cada función. Medición sobre el `dist/client` actual, sin rebuild: `@cortex-js/compute-engine` 6,3 MB (1,83 MB gzip) al entrar en Científica o Ecuaciones; chunk Emscripten `chunk-EIO257PC` de `@excalidraw/excalidraw` 1,82 MB (741 KB gzip) al abrir una pizarra, junto al chunk `whiteboard` de 1,14 MB (360 KB gzip); ELK 1,50 MB (460 KB gzip) y Cytoscape 443 KB (138 KB gzip) al usar ciertos diagramas Mermaid; Blockly 629 KB (175 KB gzip); dos copias de KaTeX de 259 KB (76 KB gzip cada una). Las dos KaTeX no son un fallo de empaquetado accidental: la app usa `mermaid` 12.3.0 con `katex` 0.18.10, y `@excalidraw/mermaid-to-excalidraw` trae `mermaid` 11.17.2 con `katex` 0.16.47. El roadmap de medición de chunks ya decidió no dividir esas librerías; esta entrada recoge recortes concretos posteriores.
- Qué falta antes de retomarlo:
  - [ ] `compute-engine`: es el mayor ahorro posible (~1,83 MB gzip si se evitaria del todo). Ya se descartó `mathjs` porque no cubre LaTeX nativo ni la exactitud simbólica actual. Antes de sustituirlo, medir el tiempo de la primera evaluación en red lenta y valorar si el aula puede vivir con un evaluador más pequeño en Básica, dejando el motor solo en Científica/Ecuaciones (hoy ya se precarga así).
  - [ ] KaTeX y Mermaid duplicados: unificar versiones sería ~76 KB gzip en KaTeX y, si también se comparte el parser de Mermaid, en el orden de 100–140 KB gzip más. El riesgo es alto porque 11.17 y 12.3 no coinciden; no forzar un `alias` sin una prueba de Diagramas y de «Mermaid a Excalidraw».
  - [ ] Pizarra: el wasm de 741 KB gzip es un chunk de producción de Excalidraw, no código nuestro. No hay un recorte limpio sin cambiar de librería; se deja como coste de abrir la pizarra.
  - [ ] ELK y Blockly ya son bajo demanda y no conviene dividirlos. No cargarlos desde la entrada del tablero (hoy no se cargan).
- Notas técnicas: no ejecutar un rebuild solo para remedir; el inventario anterior basta como línea base. Cualquier unificación de dependencias se verifica con `npm test`, una prueba de Diagramas y una de pizarra.
