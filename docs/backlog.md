# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap activo:** [`roadmap.md`](roadmap.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** las entradas de esta revisión del 2026-11-14 comparten fecha; se muestran en el orden en que se acordaron. Las dependencias van en cada entrada.

---


## 2026-11-14 — OAuth 2.1 y tokens para clientes externos (MCP y GPT)

- Contexto: el roadmap del MCP entrega primero un token personal por cuenta (crear, listar y revocar en Ajustes > Cuenta) para no ampliar el alcance. OAuth 2.1 con registro dinámico de clientes, alcance por proyecto y caducidad se aparca hasta que haga falta conectar clientes que no acepten un token pegado a mano, o cuando el GPT tenga que actuar como la cuenta del docente sin copiar credenciales.
- Qué falta antes de retomarlo:
  - [ ] Tener el MCP remoto publicado y usado con tokens personales, para conocer los casos reales (número de clientes, caducidad, rotación).
  - [ ] Decidir si OAuth vive en el Site o en un proveedor externo; hoy no hay tabla de clientes ni de códigos de autorización.
  - [ ] Definir alcances (`tareas:leer`, `tareas:escribir`, `personas:leer`) y su comprobación en `lib/server`.
  - [ ] Resolver la convivencia con la guarda de mismo origen: OAuth tampoco debe abrir CSRF en el navegador.
- Notas técnicas: el contrato de herramientas y el hash de tokens del roadmap del MCP son la base; OAuth solo cambia cómo se obtiene la identidad, no las operaciones. No duplicar herramientas para OAuth.

## 2026-11-14 — GPT con Actions como complemento del Site

- Contexto: un GPT personalizado que hable con la API de esta instancia es el complemento del MCP, no un sustituto. Hoy no hay OpenAPI, ni token de API, ni autenticación distinta de Sign in with ChatGPT (cookies y cabeceras `oai-authenticated-user-*` inyectadas por el dispatch). Además, las mutaciones JSON rechazan origen distinto (`isSameOrigin` en `lib/server/http.ts` → 403). Una Action de GPT sale de los servidores de OpenAI, no del origen del Site, así que con el código actual un POST quedaría bloqueado aunque hubiera sesión.
- Qué falta antes de retomarlo:
  - [ ] Publicar antes las URLs por vista, para que el GPT pueda citar enlaces reales.
  - [ ] Preferible tener el MCP del Site en marcha y reutilizar las mismas operaciones, o extraer un contrato común.
  - [ ] Redactar un OpenAPI mínimo sobre `/api/projects` y `/api/tasks` (y lecturas de personas) para las Actions.
  - [ ] Definir una autenticación que no sea la cookie SIWC: token por usuario u OAuth, posterior al primer MCP. Sin eso, el GPT no puede actuar como la cuenta del docente o del alumno.
  - [ ] Decidir cómo convive ese token con la guarda de mismo origen (excepción documentada al `Authorization`, no retirar la guarda del navegador).
- Notas técnicas: no apuntar un GPT a la instancia de producción compartida como si fuera una API pública anónima. Cada instancia tiene su D1 y sus roles; el token tiene que estar atado a una cuenta y a esa instancia.


## 2026-11-14 — Recortes de rendimiento de los chunks pesados

- Contexto: la entrada del tablero ya está en torno a 150 KB gzip y las librerías grandes van en chunks lazy. Siguen existiendo descargas muy pesadas la primera vez que se usa cada función. Medición sobre el `dist/client` actual, sin rebuild: `@cortex-js/compute-engine` 6,3 MB (1,83 MB gzip) al entrar en Científica o Ecuaciones; chunk Emscripten `chunk-EIO257PC` de `@excalidraw/excalidraw` 1,82 MB (741 KB gzip) al abrir una pizarra, junto al chunk `whiteboard` de 1,14 MB (360 KB gzip); ELK 1,50 MB (460 KB gzip) y Cytoscape 443 KB (138 KB gzip) al usar ciertos diagramas Mermaid; Blockly 629 KB (175 KB gzip); dos copias de KaTeX de 259 KB (76 KB gzip cada una). Las dos KaTeX no son un fallo de empaquetado accidental: la app usa `mermaid` 12.3.0 con `katex` 0.18.10, y `@excalidraw/mermaid-to-excalidraw` trae `mermaid` 11.17.2 con `katex` 0.16.47. El roadmap de medición de chunks ya decidió no dividir esas librerías; esta entrada recoge recortes concretos posteriores.
- Qué falta antes de retomarlo:
  - [ ] `compute-engine`: es el mayor ahorro posible (~1,83 MB gzip si se evitaria del todo). Ya se descartó `mathjs` porque no cubre LaTeX nativo ni la exactitud simbólica actual. Antes de sustituirlo, medir el tiempo de la primera evaluación en red lenta y valorar si el aula puede vivir con un evaluador más pequeño en Básica, dejando el motor solo en Científica/Ecuaciones (hoy ya se precarga así).
  - [ ] KaTeX y Mermaid duplicados: unificar versiones sería ~76 KB gzip en KaTeX y, si también se comparte el parser de Mermaid, en el orden de 100–140 KB gzip más. El riesgo es alto porque 11.17 y 12.3 no coinciden; no forzar un `alias` sin una prueba de Diagramas y de «Mermaid a Excalidraw».
  - [ ] Pizarra: el wasm de 741 KB gzip es un chunk de producción de Excalidraw, no código nuestro. No hay un recorte limpio sin cambiar de librería; se deja como coste de abrir la pizarra.
  - [ ] ELK y Blockly ya son bajo demanda y no conviene dividirlos. No cargarlos desde la entrada del tablero (hoy no se cargan).
- Notas técnicas: no ejecutar un rebuild solo para remedir; el inventario anterior basta como línea base. Cualquier unificación de dependencias se verifica con `npm test`, una prueba de Diagramas y una de pizarra.