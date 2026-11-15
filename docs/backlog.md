# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** PER-01 se archivó con su trabajo pendiente conservado abajo; HIER-01, CI-01 y UI-02 se completaron, CI-02 pasó al roadmap y SYNC-01 se queda aquí como norma operativa.

---

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

## 2026-11-15 — UI-01 · Sistema visual: superficies, contraste y gradientes

- Contexto: la revisión de las capturas muestra Tareas, Calendario y Ajustes dominados por superficies blancas sobre un canvas casi blanco; Mi espacio y Aula Store ya tienen una identidad más definida. El CSS tiene 23 archivos, 2.212 líneas y 237 colores hexadecimales distintos en 302 usos, señal de deriva de tokens. No es un rediseño funcional.
- Qué falta antes de retomarlo:
  - [ ] Definir una escala semántica de superficies (`canvas`, `raised`, `sunken`, `tint`) y sustituir blancos puros y hexadecimales sueltos por tokens en `app/globals.css` y los CSS de cada vista.
  - [ ] Suavizar la tinta principal y los metadatos sin bajar del contraste AA; revisar foco, estados hover y textos pequeños.
  - [ ] Añadir un gradiente global sutil al marco y al héroe; reservar los gradientes intensos para el progreso, Mi espacio y Aula Store, sin convertir todas las tarjetas en degradados.
  - [ ] Hacer un piloto en Clase > Tareas y extenderlo después a Calendario, Ajustes y Documentación.
  - [ ] Revisar escritorio, tablet y móvil, además de `prefers-reduced-motion`.
- Notas técnicas: mantener `app/globals.css` como fuente de verdad de tokens y los CSS de feature como consumidores; no duplicar paletas por pantalla. Validar contraste y no tocar lógica.

## 2026-11-15 — ARCH-01 · Contratos de rutas y límites de capa

- Contexto: hay 24 handlers en 15 `route.ts` de `app/api`. Se repiten `isSameOrigin`, `isJsonRequest`, `resolveProject`, `projectFailureResponse`, la comprobación de invitado y el parseo del cuerpo. `lib/server/project.ts` mezcla acceso con respuestas HTTP, `projects.ts` importa mensajes HTTP y `app/api/projects/route.ts` ejecuta migración de UUID, identidad y limpieza de huérfanos.
- Qué falta antes de retomarlo:
  - [ ] Extraer helpers de ruta (`withProjectRoute` y mutación JSON) sin cambiar códigos ni mensajes del contrato.
  - [ ] Separar el acceso de proyecto (`project-access.ts`) de sus respuestas HTTP (`project-http.ts`); los servicios no deben importar mensajes de transporte.
  - [ ] Mover la migración de UUID, la actualización de identidad y la limpieza de huérfanos de `/api/projects` a un servicio idempotente.
  - [ ] Cubrir el refactor con el contrato de sesión, permisos, errores y paridad HTTP ↔ MCP.
- Notas técnicas: refactor incremental; no mover carpetas; no ocultar validaciones específicas de cada ruta detrás de un helper genérico.

## 2026-11-15 — ARCH-02 · Dividir los módulos grandes restantes

- Contexto: los mayores pendientes son `lib/server/mcp/dominios/tareas.ts` (700 líneas), `lib/server/mcp/dominios/personas.ts` (523) y `lib/server/oauth/service.ts` (499). `app/board/docs/content.ts` ya se dividió en HIER-01; `section-art.tsx` (415) queda como agrupación opcional, no por el umbral de 500.
- Qué falta antes de retomarlo:
  - [ ] Dividir `tareas.ts` en lectura, escritura y filtros, conservando `herramientasTareas` como export público.
  - [ ] Dividir `personas.ts` en alumnado, profesorado e invitaciones.
  - [ ] Dividir `oauth/service.ts` en clientes, códigos, tokens y utilidades criptográficas, compartiendo la interfaz `Db`.
  - [ ] Agrupar las ilustraciones de `section-art.tsx` por familias (opcional).
  - [ ] Conservar exports públicos, snapshots y pruebas; no dividir `mcp-catalogo.ts` ni `mcp-descripciones.ts`, que son fuentes de verdad/generadas.
- Notas técnicas: división mecánica y verificable; no partir archivos solo por número de líneas si la cohesión es mayor que el coste.

## 2026-11-15 — SYNC-01 · Sincronizar el repositorio tras cada publicación

- Contexto: hay dos destinos distintos. El deploy en Sites lo hace Codex; el repositorio personal `jaminsmoke/aula-kanban` (usuario JaminSmoke) se actualiza con commit y push desde local. El push a GitHub no despliega en Sites.
- Decisión (2026-11-15): no pasa al roadmap; se ejecuta tras cada bloque y se conserva aquí como norma operativa.
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
