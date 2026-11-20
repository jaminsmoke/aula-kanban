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

## 3. Inventario de `lib/server` (89 archivos)

Clases: `D` dominio/contrato, `R` repositorio D1, `B` repositorio R2, `S` servicio, `H` helper HTTP, `P` plataforma, `A` adaptador MCP, `MX` mixto. La columna **Prueba** cuenta las pruebas que importan el módulo directamente; `—` no significa necesariamente ausencia de cobertura indirecta.

### 3.1 Identidad, acceso y personas (15)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `auth.ts` | 111 | `P` sesión | 27 archivos: rutas, MCP, páginas | 9 |
| `auth-user.ts` | 8 | `D` tipo de cuenta | `auth.ts`, `demo.ts` | — |
| `owner.ts` | 95 | `S`+`R` `instance_owner` | `board-room.ts`, `project-access.ts`, `space-room.ts` | 1 |
| `project-access.ts` | 179 | `S` autorización + `R` proyectos | 31 archivos: rutas, MCP, servicios | 5 |
| `project-contract.ts` | 10 | `D` mensajes de fallo | `project-http.ts`, `projects.ts`, `mcp/contexto.ts` | — |
| `project-http.ts` | 21 | `H` fallo de proyecto | 14 rutas y servicios de personas | 2 |
| `capabilities.ts` | 51 | `S` matriz de permisos | `mcp/dominios/apps.ts`, `project-books`, `space-apps` | 1 |
| `administradores.ts` | 210 | `S`+`R` administradores | `mcp/dominios/administracion.ts`, `api/administrators` | 1 |
| `members.ts` | 185 | `S`+`R` `project_members` | `mcp/dominios/personas/*`, `api/members` | — |
| `invitaciones.ts` | 75 | `S`+`R` invitaciones | `mcp/dominios/invitaciones.ts`, `api/invitations` | — |
| `profile-update.ts` | 43 | `S` perfil + miembro | `people/students.ts`, `people/teachers.ts` | — |
| `deleted-profiles.ts` | 49 | `R` histórico + purga | `api/tasks` (purga perezosa) | — |
| `people/campos.ts` | 49 | `D` referencia y visibilidad | `people/students.ts`, `people/teachers.ts` | — |
| `people/students.ts` | 140 | `S`+`R` | `mcp/dominios/personas/*`, `api/students` | paridad |
| `people/teachers.ts` | 133 | `S`+`R` | `mcp/dominios/personas/*`, `api/teachers` | paridad |

**Resuelto en Fase 2:** `mutateStudent`/`mutateTeacher` vivían en el servicio y construían `Request`/`Response`. El adaptador se movió a las rutas (`students` 59 líneas, `teachers` 66); los servicios bajaron a 140 y 133 líneas y ya no importan `http`, `project-http` ni `project-access` salvo los tipos.

### 3.2 Proyectos, apps y documentos (11)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `apps.ts` | 60 | `S`+`R` `instance_apps` | `mcp/apps`, `mcp/dominios`, `personal-apps`, `space-apps` | — |
| `app-migration.ts` | 30 | `S` migración legacy | `apps.ts`, `personal-apps.ts` | 1 |
| `personal-apps.ts` | 204 | `S`+`R` `app_preferences` | `api/personal-apps` | 1 |
| `app-documents.ts` | 105 | `S`+`R` `app_documents` | `migration`, `mcp/apps`, `api/app-documents` | 2 |
| `aula-documentos-migration.ts` | 284 | `S` migración transaccional | `api/aula-documentos/migration` | 1 |
| `document-copies.ts` | 90 | `R` `document_copies` + borrado R2 | `api/aula-documentos/copies[/:id]` | — |
| `projects.ts` | 161 | `S`+`R` proyectos | `mcp/dominios`, `api/projects` | — |
| `project-overview.ts` | 92 | `S` lectura agregada | `api/projects` | 1 |
| `project-rekey.ts` | 49 | `S` migración de id | `project-access.ts`, `project-overview.ts` | 1 |
| `project-books.ts` | 81 | `S`+`R` `project_books` | `api/project-books` | 1 |
| `books.ts` | 81 | `S`+`R`+`B` catálogo de libros | rutas `api/books`, visor de clase | 1 |

### 3.3 Tablero, ventanas y tareas (10)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `boards.ts` | 182 | `S`+`R` `boards`/`tasks` | `board-control.ts`, `mcp/apps/excalidraw.ts`, `api/boards` | 2 |
| `board-control.ts` | 34 | `S` publicación en sala | `mcp/apps/excalidraw.ts` | 1 |
| `board-room.ts` | 151 | `P` Durable Object WebSocket | `board-control.ts` | 1 |
| `board-stats.ts` | 107 | `R` métricas del tablero | `api/storage/status` | 1 |
| `space-control.ts` | 65 | `S` sala de espacio | `mcp/dominios/contexto.ts`, `ventanas.ts` | — |
| `space-room.ts` | 135 | `P` Durable Object WebSocket | `space-control.ts` | — |
| `tasks/service.ts` | 144 | `S` aplicación de tareas | `api/tasks` | ruta |
| `tasks/mutations.ts` | 158 | `S`+`R` `tasks` | `mcp/dominios/tareas/escritura.ts`, `tasks/service.ts` | — |
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

### 3.5 MCP (36)

| Archivo | L | Clase | Consumidor principal | Prueba |
|---|---:|---|---|---|
| `mcp/registro.ts` | 210 | `A` catálogo de herramientas | `mcp/auth.ts`, `reads`, `writes`, rutas MCP | 9 |
| `mcp/auth.ts` | 90 | `S` autenticación por token | `api/mcp` | 1 |
| `mcp/database.ts` | 14 | `R` apertura D1 | `api/mcp` | ruta |
| `mcp/token-service.ts` | 85 | `S` tokens de la web | `api/mcp/tokens` | ruta |
| `mcp/tokens.ts` | 231 | `S`+`R` `mcp_tokens` | `mcp/auth.ts`, `administracion.ts`, `token-service.ts` | 2 |
| `mcp/auditoria.ts` | 149 | `R` `mcp_audit_log` + retención | `administracion.ts`, `registro.ts` | 1 |
| `mcp/contexto.ts` | 134 | `D`/`H` resultados de herramienta | 22 archivos MCP | 2 |
| `mcp/enlaces.ts` | 64 | `H` enlaces profundos | 5 dominios | — |
| `mcp/instrucciones.ts` | 20 | `D` texto de instrucciones | `registro.ts`, rutas MCP | 1 |
| `mcp/prompts.ts` | 22 | `D` prompts | `api/mcp` | 1 |
| `mcp/rate-limit.ts` | 41 | `H` ventana en memoria | `registro.ts`, `api/mcp` | 2 |
| `mcp/reads.ts` | 22 | `D` fachada pública | **sin consumidor de producto** | 1 |
| `mcp/writes.ts` | 19 | `D` fachada pública | **sin consumidor de producto** | 1 |
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

**Nota:** `mcp/dominios/*` son adaptadores de herramienta, no servicios de dominio: validan esquema, autorizan alcance y delegan en `tasks/*`, `people/*`, `projects.ts`, etc. Los casos donde vuelven a decidir reglas son deuda de Fase 2.

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
| `demo.ts` | 27 | `P` cookie y cuenta demo | `auth.ts` | 1 |
| `demo-seed.ts` | 27 | `S` lote de la demo | `api/admin/demo` | ruta |
| `demo-availability.ts` | 16 | `S` disponibilidad demo | `app/page.tsx` | 1 |

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
| `projects` | 39 | fina | `projects`, `project-overview` | **—** |
| `space-apps` | 41 | fina | `apps`, `capabilities`, `route-helpers` | **—** |
| `storage/inventory` | 48 | mixta (admin) | `uploads/inventory`, `storage` | 1 |
| `storage/purge` | 50 | mixta (admin) | `uploads/purge`, `storage` | 1 |
| `storage/status` | 29 | mixta (admin) | `storage`, `uploads/stats`, `board-stats` | 1 |
| `students` | 59 | fina | `people/students` + esquema y guardas en la ruta | paridad |
| `tasks` | 46 | fina | `tasks/service`; zod y respuesta en la ruta | 1 |
| `teachers` | 66 | fina | `people/teachers` + esquema y guardas en la ruta | paridad |
| `uploads` | 46 | fina (multipart) | `storage`, `route-helpers`, `http` | 1 |

Cobertura de rutas: **23 de 26** tienen `route.test.ts` propio. Sin prueba propia: `projects`, `students` y `teachers`; las dos últimas están cubiertas por las pruebas de paridad de personas. `projects` queda como único hueco de contrato.

### Resolución de proyecto

Ninguna ruta de `app/api` importa ya `resolveProject`. Las que tienen el proyecto en la URL usan `withProjectRoute`. Las descargas de archivo y de copia no llevan `?project`, así que su ámbito de autorización es el del recurso guardado: usan `withResourceProject(projectId, handler)`, que reutiliza la misma guarda con una petición interna.

Queda como excepción justificada `api/space-apps`: conserva `getChatGPTUser` y la comprobación de capacidad antes de resolver el proyecto para no alterar el orden de sus 401/403/400.

---

## 5. Mapa D1 y R2

### 5.1 Tablas D1

| Tabla | Escritura principal | Lectura principal |
|---|---|---|
| `projects` | `projects.ts` (alta/baja), `project-rekey.ts` | `project-access.ts`, `project-overview.ts`, MCP |
| `project_members` | `members.ts`, `invitaciones.ts`, `profile-update.ts`, `people/*` | `people/*`, `members.ts`, `project-access.ts`, `tasks/queries.ts` |
| `administrators_unified` | `administradores.ts`; sincronización de correo en `project-access.ts` | `administradores.ts`, `project-access.ts` |
| `instance_owner` | `owner.ts` | `owner.ts`, `project-access.ts` |
| `instance_apps` | `apps.ts` | `apps.ts`, `personal-apps.ts`, MCP |
| `app_documents` | `app-documents.ts` | `aula-documentos-migration.ts`, MCP de apps, `uploads/usage.ts` |
| `app_preferences` | `personal-apps.ts` | `personal-apps.ts` |
| `boards` | `boards.ts`; snapshot en vivo en `board-room.ts` | `boards.ts`, `uploads/usage.ts` |
| `tasks` | `tasks/mutations.ts`; `deleted-profiles.ts` (crédito y purga) | `tasks/queries.ts`, `boards.ts`, `projects.ts`, `uploads/usage.ts` |
| `task_assignees` | `tasks/mutations.ts` | `tasks/queries.ts`, `boards.ts`, `deleted-profiles.ts` |
| `students` | `people/students.ts` | `people/students.ts`, `members.ts`, `tasks/queries.ts` |
| `teachers` | `people/teachers.ts` | `people/teachers.ts`, `members.ts`, `tasks/queries.ts` |
| `deleted_students` / `deleted_teachers` | `people/*` (baja), `deleted-profiles.ts` (purga) | `deleted-profiles.ts`, `tasks/queries.ts` |
| `project_books` | `project-books.ts` | `project-books.ts`, `project-overview.ts` |
| `project_rekeys` | `project-rekey.ts` | `project-access.ts`, `project-overview.ts` |
| `document_copies` | `document-copies.ts`; `storage.deleteProjectUploads` | `document-copies.ts`, rutas de copias |
| `uploads` | `storage.storeUpload`, `storage.deleteUpload`, `uploads/purge.ts` | `storage.ts`, `uploads/*`, `projects.ts` (baja) |
| `mcp_tokens` | `mcp/tokens.ts` | `mcp/auth.ts`, `mcp/dominios/administracion.ts` |
| `mcp_audit_log` | `mcp/auditoria.ts` | `mcp/auditoria.ts`, `administracion.ts` |
| `oauth_clients` / `oauth_authorization_codes` / `oauth_access_tokens` / `oauth_refresh_tokens` | `oauth/{clientes,codigos,tokens}.ts` | `oauth/service.ts` |
| `user_identities` | `project-overview.ts` (nombre); `deleted-profiles.ts` (limpieza) | `project-overview.ts`, `tasks/queries.ts`, `mcp/dominios/contexto.ts` |

**Pendiente de verificar en Fase 3:** no aparece en `lib/server` el alta inicial de `user_identities`. Se crea fuera de este árbol (bootstrap o seed). No se toca aquí; queda anotado para que el repositorio de identidad tenga un hogar explícito.

### 5.2 R2

Un único binding, `BUCKET`. Claves:

- Subidas web/MCP: `${projectId}/${purpose}/${uuid}${ext}` (`storage.ts` con `uploadExtension`).
- Libros: `storageKey`, `coverKey` y `backKey` propios (`books.ts`).
- Lectura de subidas: `storage.readUpload`; libros: `books.readBookFile`/`readBookImage`.
- Listado: `storage/repository.listBucketPage` (página máxima de 100).
- Borrado: `storage.deleteUpload`, `storage.deleteProjectUploads`, `uploads/purge.ts`.

R2 nunca se lee ni se escribe desde una ruta: todas pasan por `storage.ts`, `storage/repository.ts` o `books.ts`. Esa regla ya se cumple.

---

## 6. Límites, cuotas, purgas e inventario

| Regla | Valor | Hogar único hoy | Validación | Prueba |
|---|---|---|---|---|
| Imagen de subida | 5 MB | `storage/quota.ts` (`MAX_IMAGE_BYTES`) | `validateUpload` + cuota | `storage.test.ts` |
| Documento suelto | 10 MB | `storage/quota.ts` (`MAX_DOCUMENT_BYTES`) | `validateUpload` | `storage.test.ts` |
| Imágenes por proyecto | 50 MB | `storage/quota.ts` (`MAX_PROJECT_DOCUMENT_IMAGE_BYTES`, `fitsDocumentImageQuota`) + `storage/repository.ts` (`projectDocumentImageUsage`) | `storeUpload` | `storage.test.ts` |
| ZIP de copia portable | 60 MB | `lib/domain/aula-documentos/copy.ts` (`AULA_COPY_MAX_ZIP_BYTES`) | dominio + `storage/quota.ts` toma el valor | dominio y `storage` |
| Copias por proyecto | 20 | `storage/quota.ts` (`AULA_COPY_MAX_PER_PROJECT`) | `storeUpload` | `storage.test.ts` |
| Cuota de copias | 200 MB | `storage/quota.ts` (`AULA_COPY_PROJECT_QUOTA_BYTES`) | `storeUpload` | `storage.test.ts` |
| Estado de documento de app | 200.000 caracteres | `app-documents.ts` (`MAX_APP_DOCUMENT_CHARS`) | ruta `app-documents` | `app-documents.test.ts` |
| Perfil borrado (histórico) | 30 días; chequeo 1 h | `deleted-profiles.ts` | purga perezosa desde `api/tasks` | `deleted-profiles` |
| Auditoría MCP | 90 días; purga 1 h | `mcp/auditoria.ts` | purga perezosa | `mcp/auditoria.test.ts` |
| Límite MCP | 120/min por token; 30 escrituras/min por cuenta | `mcp/rate-limit.ts` | ventana en memoria del isolate | `rate-limit.test.ts` |
| Purga de subidas | gracia 7 días; lote 100 (máx. 500); escaneo 1.000 | `uploads/usage.ts` | relectura antes de borrar | `uploads/*.test.ts` |
| Página de inventario R2 | 100 objetos | `storage/repository.ts` (`MAX_BUCKET_PAGE`) | ruta `storage/inventory` | `storage.test.ts` |
| Cursor de inventario | 8.192 caracteres | `api/storage/inventory/route.ts` (local) | ruta | `route.test.ts` |

**Duplicidad P2 confirmada:** el límite de 5 MB existe dos veces con nombres distintos: `MAX_IMAGE_BYTES` en `storage/quota.ts` y `AULA_IMAGE_MAX_BYTES` en `lib/domain/aula-documentos/image.ts`. Son capas distintas (servidor y cliente), pero el valor debe tener una sola fuente en Fase 4.

**Purgas existentes:** perfiles borrados (`deleted-profiles.ts`), auditoría MCP (`mcp/auditoria.ts`), subidas sin uso (`uploads/purge.ts`), copias huérfanas (`document-copies.cleanupOrphanDocumentCopies`), subidas de proyectos eliminados (`storage.cleanupOrphanUploads`). No todas tienen disparador automático: `cleanupOrphanUploads` y `cleanupOrphanDocumentCopies` solo se invocan desde pruebas o tareas manuales.

---

## 7. Migraciones

- **Esquema:** `db/schema.ts` + `drizzle/0000…0041`. Son 42 migraciones; la última es `0041_tranquil_sunset_bain.sql`, que crea `document_copies`.
- **Aplicación:** solo local (`wrangler --local --persist-to .wrangler/state-v20`). ARC-06 prohíbe migraciones remotas y cambios de datos reales.
- **Migraciones de datos en runtime:** `app-migration.ts` (apps y preferencias legacy), `aula-documentos-migration.ts` (documentos de apps antiguas, transaccional), `project-rekey.ts` (id canónico de proyecto). Se ejecutan por petición, no por despliegue.
- **Riesgo:** las tres migraciones de datos viven en `lib/server` como servicios; las de esquema viven en `drizzle/`. Esa separación es correcta y no se cambia en ARC-06.

---

## 8. Reglas duplicadas y deuda ordenada

| Prioridad | Hallazgo | Evidencia | Fase |
|---|---|---|---|
| P0 | El adaptador HTTP de personas vivía en el servicio | movido a `app/api/students` y `app/api/teachers` | 2 · **resuelto** |
| P0 | `api/tasks` decidía reglas y consultaba D1 | movido a `tasks/service.ts`; la ruta queda en 46 líneas | 2 · **resuelto** |
| P1 | `storage.ts` mezclaba R2, D1, cuotas, MIME y diagnóstico | dividido en servicio, repositorio y reglas | 3 · **resuelto** |
| P1 | `resolveProject` + `projectFailureResponse` repetidos en 7 rutas | eliminados; recursos usan `withResourceProject` | 2 · **resuelto** |
| P1 | Respuesta de almacenamiento no disponible duplicada con tres textos | unificada en `storageUnavailable()` | 2 · **resuelto** |
| P1 | Cuatro rutas importaban D1 directamente | extraídas a servicios; `app/api` no importa D1 | 2 y 3 · **resuelto** |
| P2 | 5 MB definido dos veces | `storage/quota.ts` y `domain/aula-documentos/image.ts` | 4 |
| P2 | `reads.ts` y `writes.ts` no tienen consumidor de producto | solo pruebas y baseline de ARC-05 | 3 |
| P2 | Purga huérfana sin disparador | `cleanupOrphanUploads`, `cleanupOrphanDocumentCopies` | 4 |
| P2 | Nombres mezclan español e inglés en la misma capa | `publicarEscena` / `listStudents` | 5 o nunca |

### Código muerto y fachadas

El baseline de ARC-05 mantiene **51 exports** sin consumidor estático. En este mapa se confirman dos módulos completos sin consumidor de producto: `lib/server/mcp/reads.ts` y `lib/server/mcp/writes.ts`. Son fachadas de compatibilidad del catálogo MCP; **no se borran** hasta revisar conectores externos en Fase 3.

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

**Huecos de cobertura detectados:** `api/projects` no tiene prueba propia; `people/members`, `invitaciones`, `profile-update` y `deleted-profiles` no tienen prueba directa. `api/members` y `api/space-apps` ya tienen contrato tras la Fase 2.

---

## 10. Criterios de aceptación de Fase 1

- [x] Cada archivo de `lib/server` tiene clase provisional y consumidor conocido (89/89).
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
5. Añadir pruebas de contrato a `members` y `space-apps` al tocar sus rutas.
