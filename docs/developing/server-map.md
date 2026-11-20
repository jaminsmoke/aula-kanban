# Mapa del servidor: `lib/server` y `app/api`

> **Estado:** Fase 1 cerrada; Fase 2 en curso · **Fecha:** 2026-11-20
> **Fase 2 (2026-11-20):** el adaptador HTTP de alumnado y profesorado ya vive en `app/api/students` y `app/api/teachers`; `lib/server/people/*` solo expone repositorio, reglas y operaciones tipadas. Las siete rutas que resolvían el proyecto a mano usan ahora `withProjectRoute`; archivos y copias usan `withResourceProject` porque el ámbito es el del objeto guardado. `tasks/service.ts` absorbe revisión, permisos y decoración; `api/tasks` queda como adaptador de 46 líneas. El 503 de almacenamiento sale de un único `storageUnavailable()` con mensaje y estado compartidos. `api/members` y `api/space-apps` ya tienen prueba de contrato propia. Ninguna ruta de `app/api` importa D1. `storage.ts` queda como servicio: el repositorio R2/D1 vive en `storage/repository.ts` y las reglas de cuota en `storage/quota.ts`.
> **Alcance:** inventario y clasificación provisional. La Fase 1 no movió ni renombró código.
> **Roadmap:** [`roadmap.md`](roadmap.md) · **Arquitectura:** [`arquitectura-global.md`](arquitectura-global.md)
> **Regla de oro:** una regla de servidor tiene un único hogar; las rutas solo analizan, autorizan, delegan y responden.

---

## 1. Medición de partida

Medición propia del árbol, separando producto y prueba:

| Área | Archivos de producto | Líneas de producto | Archivos de prueba | Líneas de prueba | Total |
|---|---:|---:|---:|---:|---:|
| `lib/server` | 89 | 9.906 | 50 (+1 snapshot) | 9.792 | 140 / 19.698 |
| `app/api` | 26 rutas | 1.357 | 25 + 4 transversales | 3.371 | 52 / 4.728 |

Reconciliación con el punto de partida del roadmap (139 / 14.227 y 52 / 4.188): el recuento anterior mezclaba criterios de producto y prueba. Aquí **89 + 50 + 1 snapshot = 140** archivos; el snapshot es la única diferencia con los 139. Los totales de líneas no son comparables entre sí porque incluyen o excluyen pruebas de forma distinta. **Este mapa usa siempre las cifras de producto para juzgar el servidor.**

Reparto de pruebas dentro de `lib/server`:

| Carpeta | Pruebas |
|---|---:|
| `lib/server` (raíz) | 25 |
| `lib/server/mcp` | 11 |
| `lib/server/mcp/apps` | 6 |
| `lib/server/mcp/dominios` | 2 |
| `lib/server/mcp/__snapshots__` | 1 |
| `lib/server/uploads` | 4 |
| `lib/server/oauth` | 1 |
| `lib/server/tasks` | 1 |

---

## 2. Contrato de capas

Estas son las definiciones que gobiernan ARC-06. La clasificación de cada archivo se deriva de ellas, no al revés.

| Clase | Qué es | Puede hacer | No puede hacer | Cómo se prueba |
|---|---|---|---|---|
| **D · Dominio / contrato puro** | Tipos, constantes, validaciones y reglas sin efectos | Recibir datos y devolver datos tipados | Tocar D1, R2, `Request`, `Response`, cookies o React | Prueba unitaria sin mocks de plataforma |
| **R · Repositorio D1** | Única puerta de escritura/lectura de una tabla o conjunto de tablas | SQL/Drizzle, transacciones, mapear filas a tipos | Decidir permisos, construir respuestas HTTP o conocer la URL | D1 local o doble inyectado |
| **B · Repositorio R2** | Única puerta de objetos del bucket (put/get/delete/list) | Hablar con `env.BUCKET` y devolver objetos o estados | Decidir cuotas de producto ni validar MIME de negocio | Bucket falso o estado local |
| **S · Servicio de aplicación** | Una operación de negocio completa | Componer repositorios, dominio y reglas; devolver resultados tipados | Construir `Response`, leer cookies o parsear `Request` | Repos o D1 falsos, sin HTTP |
| **H · Helper HTTP** | Transporte reutilizable | `json`, same-origin, content-type, cuerpos acotados, mapear fallos a estado | Conocer tablas o reglas de producto | `Request`/`Response` puros |
| **P · Plataforma** | Sesión, cookies, Durable Objects, bindings | `getChatGPTUser`, demo, salas WebSocket | Mezclarse con reglas de un dominio concreto | Doble del binding o prueba de integración |
| **A · Adaptador MCP / protocolo** | Traduce una herramienta o protocolo a servicios | Registrar herramientas, validar esquema, devolver payload MCP | Duplicar la regla que ya vive en un servicio | Prueba de catálogo o de paridad |
| **MX · Mixto** | Varias clases en un mismo archivo | — | Permanecer así al cerrar ARC-06 | Se separa en Fase 3 |

### Cómo clasificar un archivo nuevo

1. ¿Tiene efectos sobre D1 o R2? → repositorio (`R`/`B`); si además decide reglas, es `MX`.
2. ¿Recibe `Request` o devuelve `Response`? → helper (`H`) o adaptador de ruta; un servicio no.
3. ¿Compone varias operaciones y aplica reglas? → servicio (`S`).
4. ¿Solo tipos, constantes o funciones puras? → dominio/contrato (`D`).

### Reglas de dirección ya verificadas

- `lib/server` no importa `app`; ningún archivo de `lib/server` lo hace hoy.
- `app/api` importa `lib/server`, `lib/domain` y `db`; nunca UI.
- `lib/domain` no importa servidor, HTTP ni React.
- Un helper compartido necesita dos consumidores reales o justificación escrita.

---

## 3. Inventario de `lib/server` (104 archivos)

Clases: `D` dominio/contrato, `R` repositorio D1, `B` repositorio R2, `S` servicio, `H` helper HTTP, `P` plataforma, `A` adaptador MCP, `MX` mixto. La columna **Prueba** cuenta las pruebas que importan el módulo directamente; `—` no significa necesariamente ausencia de cobertura indirecta.

### 3.1 Identidad, acceso y personas (22)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `access/auth.ts` | 111 | `P` sesión | 27 archivos: rutas, MCP, páginas | 9 |
| `access/auth-user.ts` | 8 | `D` tipo de cuenta | `access/auth.ts`, `demo/demo.ts` | — |
| `access/owner.ts` | 83 | `S` bootstrap y propiedad | `board/board-room.ts`, `projects/project-access.ts`, `space/space-room.ts` | 1 |
| `access/owner-repository.ts` | 51 | `R` `instance_owner` | `access/owner.ts` | — |
| `projects/project-access.ts` | 187 | `S` autorización de proyectos | 31 archivos: rutas, MCP, servicios | 5 |
| `projects/access-repository.ts` | 85 | `R` administradores, membresías y proyectos | `projects/project-access.ts` | — |
| `projects/project-contract.ts` | 10 | `D` mensajes de fallo | `projects/project-http.ts`, `projects/projects.ts`, `mcp/contexto.ts` | — |
| `projects/project-http.ts` | 21 | `H` fallo de proyecto | 14 rutas y servicios de personas | 2 |
| `access/capabilities.ts` | 51 | `S` matriz de permisos | `mcp/dominios/apps.ts`, `project-books`, `space-apps` | 1 |
| `access/administradores.ts` | 194 | `S` administradores | `mcp/dominios/administracion.ts`, `api/administrators` | ruta |
| `access/administradores-repository.ts` | 108 | `R` `administrators_unified` | `access/administradores.ts` | integración |
| `access/members.ts` | 172 | `S` miembros e invitaciones | `mcp/dominios/personas/*`, `api/members` | ruta |
| `access/members-repository.ts` | 156 | `R` `project_members`, `students`, `teachers` | `access/members.ts` | 1 |
| `access/invitaciones.ts` | 69 | `S` invitaciones | `mcp/dominios/invitaciones.ts`, `api/invitations` | ruta |
| `access/invitaciones-repository.ts` | 67 | `R` `project_members` y `administrators_unified` | `access/invitaciones.ts` | — |
| `access/profile-update.ts` | 43 | `S` perfil + miembro | `people/students.ts`, `people/teachers.ts` | — |
| `access/deleted-profiles.ts` | 49 | `R` histórico + purga | `api/tasks` (purga perezosa) | — |
| `people/campos.ts` | 49 | `D` referencia y visibilidad | `people/students.ts`, `people/teachers.ts` | — |
| `people/students.ts` | 122 | `S` alumnado | `mcp/dominios/personas/*`, `api/students` | paridad |
| `people/students-repository.ts` | 95 | `R` `students` + invitación | `people/students.ts` | — |
| `people/teachers.ts` | 115 | `S` profesorado | `mcp/dominios/personas/*`, `api/teachers` | paridad |
| `people/teachers-repository.ts` | 95 | `R` `teachers` + invitación | `people/teachers.ts` | — |

**Resuelto en Fase 2:** `mutateStudent`/`mutateTeacher` vivían en el servicio y construían `Request`/`Response`. El adaptador se movió a las rutas (`students` 59 líneas, `teachers` 66); los servicios bajaron a 140 y 133 líneas y ya no importan `http`, `project-http` ni `project-access` salvo los tipos.

### 3.2 Proyectos, apps y documentos (17)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `apps/apps.ts` | 61 | `S` instalación de apps | `mcp/apps`, `mcp/dominios`, `personal-apps`, `space-apps` | ruta |
| `apps/apps-repository.ts` | 47 | `R` `instance_apps` | `apps/apps.ts` | — |
| `apps/app-migration.ts` | 30 | `S` migración legacy | `apps/apps.ts`, `apps/personal-apps.ts` | 1 |
| `apps/personal-apps.ts` | 188 | `S` preferencias personales | `api/personal-apps` | 1 |
| `apps/personal-apps-repository.ts` | 53 | `R` `app_preferences` | `apps/personal-apps.ts` | — |
| `apps/app-documents.ts` | 56 | `S` documentos de app | `migration`, `mcp/apps`, `api/app-documents` | 2 |
| `apps/app-documents-repository.ts` | 110 | `R` `app_documents` | `apps/app-documents.ts` | — |
| `aula-documentos/aula-documentos-migration.ts` | 284 | `S` migración transaccional | `api/aula-documentos/migration` | 1 |
| `aula-documentos/document-copies.ts` | 90 | `R` `document_copies` + borrado R2 | `api/aula-documentos/copies[/:id]` | — |
| `projects/projects.ts` | 125 | `S` proyectos | `mcp/dominios`, `api/projects` | ruta |
| `projects/projects-repository.ts` | 109 | `R` proyectos y recuentos | `projects/projects.ts` | 1 |
| `projects/project-overview.ts` | 92 | `S` lectura agregada | `api/projects` | 1 |
| `projects/project-rekey.ts` | 49 | `S` migración de id | `projects/project-access.ts`, `projects/project-overview.ts` | 1 |
| `books/project-books.ts` | 73 | `S` libros por proyecto | `api/project-books` | 1 |
| `books/project-books-repository.ts` | 36 | `R` `project_books` | `books/project-books.ts` | — |
| `books/books.ts` | 76 | `S` catálogo de libros | rutas `api/books`, visor de clase | 1 |
| `books/books-repository.ts` | 25 | `B` R2 del catálogo | `books/books.ts` | — |

### 3.3 Tablero, ventanas y tareas (13)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `board/boards.ts` | 170 | `S` pizarras | `board/board-control.ts`, `mcp/apps/excalidraw.ts`, `api/boards` | 2 |
| `board/boards-repository.ts` | 90 | `R` `boards`, `tasks` y `task_assignees` | `board/boards.ts` | — |
| `board/board-types.ts` | 13 | `D` dueño de pizarra | `board/boards.ts`, `board/boards-repository.ts` | — |
| `board/board-control.ts` | 34 | `S` publicación en sala | `mcp/apps/excalidraw.ts` | 1 |
| `board/board-room.ts` | 151 | `P` Durable Object WebSocket | `board/board-control.ts` | 1 |
| `board/board-stats.ts` | 107 | `R` métricas del tablero | `api/storage/status` | 1 |
| `space/space-control.ts` | 65 | `S` sala de espacio | `mcp/dominios/contexto.ts`, `ventanas.ts` | — |
| `space/space-room.ts` | 135 | `P` Durable Object WebSocket | `space/space-control.ts` | — |
| `tasks/service.ts` | 144 | `S` aplicación de tareas | `api/tasks` | ruta |
| `tasks/mutations.ts` | 186 | `S` mutaciones de tareas | `mcp/dominios/tareas/escritura.ts`, `tasks/service.ts` | — |
| `tasks/mutations-repository.ts` | 148 | `R` `tasks`, `task_assignees` y `boards` | `tasks/mutations.ts` | — |
| `tasks/permissions.ts` | 105 | `D` permisos + guard SQL | `mcp/dominios/tareas/*`, `tasks/service.ts`, `api/tasks` | 1 |
| `tasks/queries.ts` | 73 | `R` lectura y decoración | `mcp/dominios/tareas/*`, `tasks/service.ts` | — |
| `tasks/types.ts` | 48 | `D` tipos de tarea | `tasks/*`, `api/tasks` | 1 |

### 3.4 Almacenamiento, subidas y cuotas (7)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `storage.ts` | 155 | `S` servicio de subidas | rutas de ficheros, subidas y copias | 8 |
| `storage/repository.ts` | 240 | `R` R2 + `uploads`/`document_copies` | `storage.ts`, inventario y purga | — |
| `storage/quota.ts` | 132 | `V` reglas puras de cuota y MIME | `storage.ts`, `api/uploads`, copias, MCP | 8 |
| `uploads/inventory.ts` | 83 | `S` cotejo R2/D1 | `api/storage/inventory` | 1 |
| `uploads/purge.ts` | 163 | `S` purga con relectura | `api/storage/purge` | 1 |
| `uploads/stats.ts` | 60 | `R` agregados de `uploads` | `api/storage/status` | 1 |
| `uploads/usage.ts` | 119 | `R` referencias + `D` | `uploads/purge.ts` | 1 |

**Hallazgo P1 resuelto (2026-11-20):** `storage.ts` mezclaba repositorio R2, repositorio D1 de `uploads`, reglas de cuota, validación MIME y diagnóstico. Ahora el servicio tiene 155 líneas; el acceso a datos vive en `storage/repository.ts` (240) y las reglas puras en `storage/quota.ts` (132).

### 3.5 MCP (35)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `mcp/registro.ts` | 210 | `A` catálogo de herramientas | `mcp/auth.ts`, `reads`, `writes`, rutas MCP | 9 |
| `mcp/auth.ts` | 90 | `S` autenticación por token | `api/mcp` | 1 |
| `mcp/database.ts` | 14 | `R` apertura D1 | `api/mcp` | ruta |
| `mcp/token-service.ts` | 85 | `S` tokens de la web | `api/mcp/tokens` | ruta |
| `mcp/tokens.ts` | 206 | `S` formato y verificación de tokens | `mcp/auth.ts`, `administracion.ts`, `token-service.ts` | 2 |
| `mcp/tokens-repository.ts` | 117 | `R` `mcp_tokens` | `mcp/tokens.ts` | — |
| `mcp/auditoria.ts` | 149 | `R` `mcp_audit_log` + retención | `administracion.ts`, `registro.ts` | 1 |
| `mcp/contexto.ts` | 124 | `D`/`H` resultados de herramienta | 22 archivos MCP | 2 |
| `mcp/enlaces.ts` | 64 | `H` enlaces profundos | 5 dominios | — |
| `mcp/instrucciones.ts` | 20 | `D` texto de instrucciones | `registro.ts`, rutas MCP | 1 |
| `mcp/prompts.ts` | 22 | `D` prompts | `api/mcp` | 1 |
| `mcp/rate-limit.ts` | 41 | `H` ventana en memoria | `registro.ts`, `api/mcp` | 2 |
| `mcp/ui-apertura.ts` | 147 | `H` recursos de UI | `contexto.ts`, `registro.ts`, `app/mcp` | — |
| `mcp/apps/contrato.ts` | 68 | `D` contrato de app MCP | 4 apps | 1 |
| `mcp/apps/registro.ts` | 90 | `A` registro de apps | `mcp/registro.ts` | 2 |
| `mcp/apps/blockly.ts` | 98 | `A` adaptador Blockly | `apps/registro.ts` | 1 |
| `mcp/apps/excalidraw.ts` | 283 | `A` adaptador Excalidraw | `apps/registro.ts` | 1 |
| `mcp/apps/mermaid.ts` | 209 | `A` adaptador Mermaid | `apps/registro.ts` | 1 |
| `mcp/apps/tabla-periodica.ts` | 82 | `A` adaptador tabla periódica | `apps/registro.ts` | 1 |
| `mcp/dominios/tipos.ts` | 72 | `D` tipos de herramienta | 18 archivos MCP | — |
| `mcp/dominios/administracion.ts` | 294 | `A` herramientas de administración | `registro.ts` | 2 |
| `mcp/dominios/apps.ts` | 181 | `A` herramientas de apps | `registro.ts` | 1 |
| `mcp/dominios/archivos.ts` | 159 | `A` herramientas de archivos | `registro.ts` | 2 |
| `mcp/dominios/contexto.ts` | 232 | `A` contexto del aula | `registro.ts` | 1 |
| `mcp/dominios/invitaciones.ts` | 59 | `A` invitaciones | `registro.ts` | 1 |
| `mcp/dominios/proyectos.ts` | 141 | `A` proyectos | `registro.ts` | 1 |
| `mcp/dominios/ventanas.ts` | 121 | `A` ventanas | `registro.ts` | 1 |
| `mcp/dominios/personas/index.ts` | 206 | `A` registro de personas | `registro.ts` | 1 |
| `mcp/dominios/personas/alumnado.ts` | 122 | `A` alumnado | `personas/index.ts` | — |
| `mcp/dominios/personas/comun.ts` | 103 | `A`/`S` común de personas | 4 archivos de personas | — |
| `mcp/dominios/personas/invitaciones.ts` | 69 | `A` invitaciones de personas | `personas/index.ts` | — |
| `mcp/dominios/personas/profesorado.ts` | 121 | `A` profesorado | `personas/index.ts` | — |
| `mcp/dominios/tareas/index.ts` | 182 | `A` registro de tareas | `registro.ts` | 1 |
| `mcp/dominios/tareas/comun.ts` | 103 | `A`/`S` común de tareas | 4 archivos de tareas | — |
| `mcp/dominios/tareas/escritura.ts` | 308 | `A` escritura de tareas | `tareas/index.ts` | — |
| `mcp/dominios/tareas/lectura.ts` | 99 | `A` lectura de tareas | `tareas/index.ts` | — |
| `mcp/dominios/tareas/filtros.ts` | 90 | `D` filtros | `tareas/lectura.ts` | — |

**Nota:** `mcp/dominios/*` son adaptadores de herramienta, no servicios de dominio: validan esquema, autorizan alcance y delegan en `tasks/*`, `people/*`, `projects/projects.ts`, etc. Los casos donde vuelven a decidir reglas son deuda de Fase 2.

### 3.6 OAuth (7)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `oauth/types.ts` | 54 | `D` tipos y errores | 5 archivos OAuth | — |
| `oauth/cripto.ts` | 144 | `H` PKCE y hashes | 4 archivos OAuth | — |
| `oauth/clientes.ts` | 71 | `R` `oauth_clients` | `service.ts`, `tokens.ts` | — |
| `oauth/codigos.ts` | 73 | `R` authorization codes | `service.ts`, `tokens.ts` | — |
| `oauth/tokens.ts` | 170 | `R` access/refresh tokens | `service.ts` | — |
| `oauth/service.ts` | 49 | `S` flujo OAuth | 9 rutas OAuth y `well-known` | 3 |
| `oauth/http.ts` | 72 | `H` respuestas OAuth | `register`, `revoke`, `token` | — |

### 3.7 Helpers transversales (5)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `http.ts` | 40 | `H` `json`, same-origin, JSON, 503 de almacenamiento | 31 archivos | 2 |
| `route-helpers.ts` | 53 | `H` composición de rutas | 21 rutas | 1 |
| `bounded-json.ts` | 26 | `H` cuerpo acotado | `api/app-documents` | — |
| `demo/demo.ts` | 27 | `P` cookie y cuenta demo | `access/auth.ts` | 1 |
| `demo/demo-seed.ts` | 27 | `S` lote de la demo | `api/admin/demo` | ruta |
| `demo/demo-availability.ts` | 16 | `S` disponibilidad demo | `app/page.tsx` | 1 |

---

## 4. Inventario de `app/api` (26 rutas)

Clase actual: **fina** = guardas + un servicio; **mixta** = resuelve proyecto/errores o toca bindings a mano; **gruesa** = decide reglas o consulta D1; **protocolo** = adaptador de un protocolo, no de negocio.

| Ruta | L | Clase | Servicios usados | Prueba |
|---|---:|---|---|---|
| `admin/demo` | 19 | fina | `demo-seed`, `isOwner` | 1 |
| `administrators` | 56 | fina (global) | `administradores`, `auth`, `project-http` | 2 |
| `app-documents` | 86 | fina | `app-documents`, `bounded-json` | 1 |
| `aula-documentos/copies` | 123 | fina (multipart) | `document-copies`, `storage`, dominio de copias | 1 |
| `aula-documentos/copies/[id]` | 68 | fina (recurso) | `document-copies`, `storage` | 1 |
| `aula-documentos/migration` | 69 | fina | `aula-documentos-migration` | 1 |
| `boards` | 54 | fina | `boards` | 1 |
| `books` | 21 | fina | `books` | 1 |
| `books/[id]/file` | 33 | fina (binario) | `books`, `auth`, `route-helpers` | 1 |
| `books/[id]/image` | 34 | fina (binario) | `books`, `auth`, `route-helpers` | 1 |
| `files/[id]` | 31 | fina (binario, recurso) | `storage`, `auth`, `route-helpers` | 1 |
| `invitations` | 29 | fina | `invitaciones` | 1 |
| `mcp` | 154 | protocolo | SDK MCP, `mcp/auth`, `registro`, `rate-limit`, `mcp/database` | 3 |
| `mcp/tokens` | 63 | fina | `mcp/token-service`, `http` | 2 |
| `members` | 27 | fina | `members` | **—** |
| `personal-apps` | 56 | fina | `personal-apps` | 1 |
| `project-books` | 40 | fina | `capabilities`, `project-books` | 1 |
| `projects` | 39 | fina | `projects`, `project-overview` | 1 |
| `space-apps` | 41 | fina | `apps`, `capabilities`, `route-helpers` | **—** |
| `storage/inventory` | 48 | mixta (admin) | `uploads/inventory`, `storage` | 1 |
| `storage/purge` | 50 | mixta (admin) | `uploads/purge`, `storage` | 1 |
| `storage/status` | 29 | mixta (admin) | `storage`, `uploads/stats`, `board-stats` | 1 |
| `students` | 59 | fina | `people/students` + esquema y guardas en la ruta | paridad |
| `tasks` | 46 | fina | `tasks/service`; zod y respuesta en la ruta | 1 |
| `teachers` | 66 | fina | `people/teachers` + esquema y guardas en la ruta | paridad |
| `uploads` | 46 | fina (multipart) | `storage`, `route-helpers`, `http` | 1 |

Cobertura de rutas: **24 de 26** tienen `route.test.ts` propio. Sin prueba propia: `students` y `teachers`, cubiertas por las pruebas de paridad de personas.

### Resolución de proyecto

Ninguna ruta de `app/api` importa ya `resolveProject`. Las que tienen el proyecto en la URL usan `withProjectRoute`. Las descargas de archivo y de copia no llevan `?project`, así que su ámbito de autorización es el del recurso guardado: usan `withResourceProject(projectId, handler)`, que reutiliza la misma guarda con una petición interna.

Queda como excepción justificada `api/space-apps`: conserva `getChatGPTUser` y la comprobación de capacidad antes de resolver el proyecto para no alterar el orden de sus 401/403/400.

---

## 5. Mapa D1 y R2

### 5.1 Tablas D1

| Tabla | Escritura principal | Lectura principal |
|---|---|---|
| `projects` | `projects/projects-repository.ts` (alta/baja), `projects/project-rekey.ts` | `projects/access-repository.ts`, `projects/project-overview.ts`, MCP |
| `project_members` | `access/members-repository.ts`, `access/invitaciones-repository.ts`, `access/profile-update.ts`, `people/students-repository.ts`, `people/teachers-repository.ts` | `people/students-repository.ts`, `people/teachers-repository.ts`, `access/members.ts`, `projects/access-repository.ts`, `tasks/queries.ts` |
| `administrators_unified` | `access/administradores-repository.ts`; sincronización de correo en `projects/project-access.ts` | `access/administradores.ts`, `projects/access-repository.ts` |
| `instance_owner` | `access/owner-repository.ts` | `access/owner-repository.ts`, `projects/project-access.ts` |
| `instance_apps` | `apps/apps-repository.ts` | `apps/apps-repository.ts`, `apps/personal-apps.ts`, MCP |
| `app_documents` | `apps/app-documents-repository.ts` | `aula-documentos/aula-documentos-migration.ts`, MCP de apps, `uploads/usage.ts` |
| `app_preferences` | `apps/personal-apps.ts` | `apps/personal-apps.ts` |
| `boards` | `board/boards-repository.ts`; snapshot en vivo en `board/board-room.ts` | `board/boards-repository.ts`, `uploads/usage.ts` |
| `tasks` | `tasks/mutations-repository.ts`; `access/deleted-profiles.ts` (crédito y purga) | `tasks/queries.ts`, `board/boards-repository.ts`, `projects/projects-repository.ts`, `uploads/usage.ts` |
| `task_assignees` | `tasks/mutations-repository.ts` | `tasks/queries.ts`, `board/boards-repository.ts`, `access/deleted-profiles.ts` |
| `students` | `people/students-repository.ts` | `people/students-repository.ts`, `access/members-repository.ts`, `tasks/queries.ts` |
| `teachers` | `people/teachers-repository.ts` | `people/teachers-repository.ts`, `access/members-repository.ts`, `tasks/queries.ts` |
| `deleted_students` / `deleted_teachers` | `people/*` (baja), `access/deleted-profiles.ts` (purga) | `access/deleted-profiles.ts`, `tasks/queries.ts` |
| `project_books` | `books/project-books-repository.ts` | `books/project-books-repository.ts`, `projects/project-overview.ts` |
| `project_rekeys` | `projects/project-rekey.ts` | `projects/project-access.ts`, `projects/project-overview.ts` |
| `document_copies` | `aula-documentos/document-copies.ts`; `storage.deleteProjectUploads` | `aula-documentos/document-copies.ts`, rutas de copias |
| `uploads` | `storage.storeUpload`, `storage.deleteUpload`, `uploads/purge.ts` | `storage.ts`, `uploads/*`, `projects/projects-repository.ts` (baja) |
| `mcp_tokens` | `mcp/tokens-repository.ts` | `mcp/tokens-repository.ts`, `mcp/dominios/administracion.ts` |
| `mcp_audit_log` | `mcp/auditoria.ts` | `mcp/auditoria.ts`, `administracion.ts` |
| `oauth_clients` / `oauth_authorization_codes` / `oauth_access_tokens` / `oauth_refresh_tokens` | `oauth/{clientes,codigos,tokens}.ts` | `oauth/service.ts` |
| `user_identities` | `projects/project-overview.ts` (nombre); `access/deleted-profiles.ts` (limpieza) | `projects/project-overview.ts`, `tasks/queries.ts`, `mcp/dominios/contexto.ts` |

**Pendiente de verificar en Fase 3:** no aparece en `lib/server` el alta inicial de `user_identities`. Se crea fuera de este árbol (bootstrap o seed). No se toca aquí; queda anotado para que el repositorio de identidad tenga un hogar explícito.

### 5.2 R2

Un único binding, `BUCKET`. Claves:

- Subidas web/MCP: `${projectId}/${purpose}/${uuid}${ext}` (`storage.ts` con `uploadExtension`).
- Libros: `storageKey`, `coverKey` y `backKey` propios (`books/books.ts`); lectura en `books/books-repository.ts`.
- Lectura de subidas: `storage.readUpload`; libros: `books.readBookFile`/`readBookImage`.
- Listado: `storage/repository.listBucketPage` (página máxima de 100).
- Borrado: `storage.deleteUpload`, `storage.deleteProjectUploads`, `uploads/purge.ts`.

R2 nunca se lee ni se escribe desde una ruta: todas pasan por `storage.ts`, `storage/repository.ts` o `books/books.ts`. Esa regla ya se cumple.

---

## 6. Límites, cuotas, purgas e inventario

| Regla | Valor | Hogar único hoy | Validación | Prueba |
|---|---|---|---|---|
| Imagen de subida | 5 MB | `lib/domain/aula-documentos/image.ts` (`AULA_IMAGE_MAX_BYTES`); `storage/quota.ts` lo reexporta como `MAX_IMAGE_BYTES` | `validateUpload`, MCP y cliente | `storage.test.ts`, `image-upload.test.ts` |
| Documento suelto | 10 MB | `storage/quota.ts` (`MAX_DOCUMENT_BYTES`) | `validateUpload` | `storage.test.ts` |
| Imágenes por proyecto | 50 MB | `storage/quota.ts` (`MAX_PROJECT_DOCUMENT_IMAGE_BYTES`, `fitsDocumentImageQuota`) + `storage/repository.ts` (`projectDocumentImageUsage`) | `storeUpload` | `storage.test.ts` |
| ZIP de copia portable | 60 MB | `lib/domain/aula-documentos/copy.ts` (`AULA_COPY_MAX_ZIP_BYTES`) | dominio + `storage/quota.ts` toma el valor | dominio y `storage` |
| Copias por proyecto | 20 | `storage/quota.ts` (`AULA_COPY_MAX_PER_PROJECT`) | `storeUpload` | `storage.test.ts` |
| Cuota de copias | 200 MB | `storage/quota.ts` (`AULA_COPY_PROJECT_QUOTA_BYTES`) | `storeUpload` | `storage.test.ts` |
| Estado de documento de app | 200.000 caracteres | `apps/app-documents.ts` (`MAX_APP_DOCUMENT_CHARS`) | ruta `app-documents` | `app-documents.test.ts` |
| Perfil borrado (histórico) | 30 días; chequeo 1 h | `access/deleted-profiles.ts` | purga perezosa desde `api/tasks` | `deleted-profiles` |
| Auditoría MCP | 90 días; purga 1 h | `mcp/auditoria.ts` | purga perezosa | `mcp/auditoria.test.ts` |
| Límite MCP | 120/min por token; 30 escrituras/min por cuenta | `mcp/rate-limit.ts` | ventana en memoria del isolate | `rate-limit.test.ts` |
| Purga de subidas | gracia 7 días; lote 100 (máx. 500); escaneo 1.000 | `uploads/usage.ts` | relectura antes de borrar | `uploads/*.test.ts` |
| Página de inventario R2 | 100 objetos | `storage/repository.ts` (`MAX_BUCKET_PAGE`) | ruta `storage/inventory` | `storage.test.ts` |
| Cursor de inventario | 8.192 caracteres | `api/storage/inventory/route.ts` (local) | ruta | `route.test.ts` |

**Duplicidad P2 resuelta (Fase 4):** el valor canónico es `AULA_IMAGE_MAX_BYTES` en `lib/domain/aula-documentos/image.ts`. `storage/quota.ts` lo reexporta como `MAX_IMAGE_BYTES` y toma de ahí también la lista de MIME; API, MCP, copias y cliente comparten una sola fuente. `uploadLimitBytes` concentra el límite por finalidad.

**Purgas existentes:** perfiles borrados (`access/deleted-profiles.ts`), auditoría MCP (`mcp/auditoria.ts`), subidas sin uso (`uploads/purge.ts`), copias huérfanas (`document-copies.cleanupOrphanDocumentCopies`), subidas de proyectos eliminados (`storage.cleanupOrphanUploads`). **Auditoría Fase 4:** `cleanupOrphanUploads` y `cleanupOrphanDocumentCopies` solo se invocan desde pruebas o tareas manuales; se mantienen como limpieza manual documentada, sin scheduler en ARC-06. La purga de subidas relee referencias antes de borrar, conserva la fila si R2 falla y es idempotente.

---

## 7. Migraciones

- **Esquema:** `db/schema.ts` + `drizzle/0000…0041`. Son 42 migraciones; la última es `0041_tranquil_sunset_bain.sql`, que crea `document_copies`.
- **Aplicación:** solo local (`wrangler --local --persist-to .wrangler/state-v20`). ARC-06 prohíbe migraciones remotas y cambios de datos reales.
- **Migraciones de datos en runtime:** `apps/app-migration.ts` (apps y preferencias legacy), `aula-documentos/aula-documentos-migration.ts` (documentos de apps antiguas, transaccional), `projects/project-rekey.ts` (id canónico de proyecto). Se ejecutan por petición, no por despliegue.
- **Riesgo:** las tres migraciones de datos viven en `lib/server` como servicios; las de esquema viven en `drizzle/`. Esa separación es correcta y no se cambia en ARC-06.
- **Revisión local (Fase 4, 2026-11-20):** 42 entradas de journal = 42 archivos; se aplican en orden sobre SQLite en memoria y dejan 25 tablas, incluidas `projects`, `uploads` y `document_copies`. La prueba permanente `scripts/migrations.test.mjs` fija journal, orden y aplicación.
- **Rollback:** D1 no tiene migraciones inversas. El rollback local consiste en descartar `.wrangler/state-v20` y reaplicar desde cero; no hay comando remoto ni se ejecutará en ARC-06. Las migraciones de datos anteriores (`apps`, `aula-documentos`, tablas legacy) ya tienen pruebas propias, incluidas las transaccionales.

---

## 8. Reglas duplicadas y deuda ordenada

| Prioridad | Hallazgo | Evidencia | Fase |
|---|---|---|---|
| P0 | El adaptador HTTP de personas vivía en el servicio | movido a `app/api/students` y `app/api/teachers` | 2 · **resuelto** |
| P0 | `api/tasks` decidía reglas y consultaba D1 | movido a `tasks/service.ts`; la ruta queda en 46 líneas | 2 · **resuelto** |
| P1 | `storage.ts` mezclaba R2, D1, cuotas, MIME y diagnóstico | dividido en servicio, repositorio y reglas | 3 · **resuelto** |
| P1 | Proyectos y miembros mezclaban reglas y D1 | `projects/projects-repository.ts` y `access/members-repository.ts` concentran la persistencia | 3 · **resuelto** |
| P1 | Propietario, invitaciones y administradores mezclaban reglas y D1 | `access/{owner,invitaciones,administradores}-repository.ts` concentran las filas | 3 · **resuelto** |
| P1 | Alumnado y profesorado mezclaban reglas y D1 | `people/students-repository.ts` y `people/teachers-repository.ts` concentran fichas e invitaciones | 3 · **resuelto** |
| P1 | Apps, preferencias y documentos mezclaban reglas y D1 | `apps/{apps,personal-apps,app-documents}-repository.ts` concentran las filas | 3 · **resuelto** |
| P1 | Catálogo de libros leía R2 y `project_books` desde el servicio | `books/books-repository.ts` (R2) y `books/project-books-repository.ts` (D1) | 3 · **resuelto** |
| P1 | Pizarras leían `boards` y `task_assignees` desde el servicio | `board/boards-repository.ts` + contrato neutral en `board/board-types.ts` | 3 · **resuelto** |
| P1 | Mutaciones de tareas mezclaban permisos, SQL y lotes | `tasks/mutations-repository.ts` concentra las sentencias; `mutations.ts` conserva las reglas | 3 · **resuelto** |
| P1 | Tokens MCP mezclaban formato, cifrado y filas | `mcp/tokens-repository.ts` concentra `mcp_tokens`; `tokens.ts` conserva formato y hash | 3 · **resuelto** |
| P1 | `project-access.ts` mezclaba autorización y filas D1 | `projects/access-repository.ts` concentra administradores, membresías y proyectos | 3 · **resuelto** |
| P1 | `resolveProject` + `projectFailureResponse` repetidos en 7 rutas | eliminados; recursos usan `withResourceProject` | 2 · **resuelto** |
| P1 | Respuesta de almacenamiento no disponible duplicada con tres textos | unificada en `storageUnavailable()` | 2 · **resuelto** |
| P1 | Cuatro rutas importaban D1 directamente | extraídas a servicios; `app/api` no importa D1 | 2 y 3 · **resuelto** |
| P2 | 5 MB definido dos veces | fuente única en `lib/domain/aula-documentos/image.ts`; `storage/quota.ts` la reexporta | 4 · **resuelto** |
| P2 | `reads.ts` y `writes.ts` no tienen consumidor de producto | retirados; sus pruebas usan `registro.registerTools` | 3 · **resuelto** |
| P2 | Purga huérfana sin disparador | limpieza manual documentada; sin scheduler en ARC-06 | 4 · **aceptado** |
| P2 | Nombres mezclan español e inglés en la misma capa | convención no adoptada; sin impacto funcional | aceptado, sin cambio en ARC-06 |

### Código muerto y fachadas

El baseline conserva **46 exports** sin consumidor estático como superficie pública o deuda aceptada, **1 módulo público** y **0 módulos solo-test**. En Fase 3 se revisaron las dos fachadas MCP sin consumidor de producto: ninguna ruta, conector, paquete ni documento externo importaba `lib/server/mcp/reads.ts` o `writes.ts`, y ambas puertas usan `registro.registerTools`. Se retiraron, sus pruebas registran el subconjunto con el registro central y `contexto.toolError` dejó de existir. El checker no detecta exports huérfanos fuera del baseline.

---

## 9. Cómo se prueba cada capa

| Capa | Entorno | Qué no debe aparecer |
|---|---|---|
| Dominio (`D`) | Vitest puro | `cloudflare:workers`, D1, R2, `next/headers`, React |
| Repositorio (`R`/`B`) | D1 local o doble del binding | Reglas de rol, `Response` |
| Servicio (`S`) | Repos con doble o D1 local | `Request`, `Response`, cookies |
| Helper HTTP (`H`) | `Request`/`Response` puros | Tablas y permisos |
| Ruta (`app/api`) | Contrato: método, estado, cuerpo, permisos | SQL y reglas de negocio |
| MCP (`A`) | Catálogo + prueba de paridad | Duplicar la regla del servicio |

**Huecos de cobertura declarados:** `access/members`, `access/invitaciones`, `access/profile-update` y `access/deleted-profiles` no tienen prueba directa; se cubren a través de servicios y rutas, sin cambio en ARC-06. `api/members`, `api/space-apps` y `api/projects` tienen contrato propio.

---

## 10. Criterios de aceptación de Fase 1

- [x] Cada archivo de `lib/server` tiene clase provisional y consumidor conocido (104/104).
- [x] Cada ruta de `app/api` tiene clase provisional y servicios identificados (26/26).
- [x] Están identificadas las reglas duplicadas entre rutas, servicios, MCP y almacenamiento.
- [x] Está mapeado el acceso a D1 y R2, con tablas, claves y responsables.
- [x] Están inventariados cuotas, purgas, retención e inventario, con su hogar actual.
- [x] Están definidos dominio, repositorio, servicio, helper HTTP, plataforma y adaptador.
- [x] No se ha movido, renombrado ni borrado código de producto.
- [x] No se ha cambiado la versión del Site (`1.1.37`), ni URLs, ni permisos, ni datos.

---

## 11. Orden propuesto para Fase 2

1. **Hecho (2026-11-20):** `mutateStudent`/`mutateTeacher` salieron de los servicios; las rutas validan y autorizan, y los servicios reciben datos.
2. **Hecho (2026-11-20):** las 7 rutas usan `withProjectRoute`; archivos y copias, `withResourceProject`.
3. **Hecho (2026-11-20):** `tasks/service.ts` orquesta revisión, permisos y decoración; `api/tasks` solo valida y responde.
4. **Hecho (2026-11-20):** `storageUnavailable()` en `http.ts` centraliza el 503; las ocho rutas afectadas lo consumen.
5. **Hecho (2026-11-20):** `members` y `space-apps` tienen contrato; `projects` lo recibe al abrir la Fase 3.

---

## 12. Criterios de aceptación de Fase 3

- [x] Cada regla tiene un hogar: servicios de aplicación, repositorios D1/R2 y reglas puras separados por dominio.
- [x] Sin ciclos nuevos: **417 archivos de producto / 1.018 imports / 0 violaciones / 0 ciclos**.
- [x] `lib/server` no importa `app` (regla de arquitectura en verde).
- [x] Las pruebas de dominio y de repositorio corren sin D1 ni R2 reales: **31 archivos / 165 pruebas dirigidas**.
- [x] Fachadas MCP revisadas: `reads.ts` y `writes.ts` retiradas; `registro.ts` es la puerta única y el baseline queda sin `testOnlyModules`.
- [x] Suite final: **242 archivos / 1.644 pruebas**; `dead:check`, `app:budget` y ESLint sin problemas.

---

## 13. Criterios de aceptación de Fase 4

- [x] Cada límite tiene un hogar único; imagen y MIME viven en el dominio y el servidor los reexporta.
- [x] `uploadLimitBytes` concentra el máximo por finalidad y web/MCP comparten validación.
- [x] La purga de subidas es idempotente, relee referencias y recupera fallos de R2.
- [x] Las 42 migraciones se aplican en orden en local; rollback documentado y sin remoto.
- [x] Suite **243 archivos / 1.647 pruebas**.

---

## 14. Cierre de ARC-06

- [x] Mapa, rutas y helpers sin deuda sin dueño: P0/P1 resueltos; P2 resueltos o aceptados.
- [x] Checks locales sin MCP ni rutas externas: `npm run check`, suite, build y presupuestos.
- [x] Documentación, changelog y backlog actualizados; roadmap archivado y reiniciado.
- [x] `1.1.37` sin cambios; sin push ni publicación en este cierre local.
