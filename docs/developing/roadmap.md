# Roadmap PROMO-05 · Modo demo sin cuenta, de solo lectura

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PROMO-05 — hoy todo pasa por la sesión de Sites; la portada invita a entrar, pero no hay forma de probar el tablero sin una cuenta de ChatGPT. La demo debe abrir el proyecto ficticio de PROMO-03 en modo lectura.
> **Dependencias:** PROMO-03 completada (proyecto de demo y `npm run seed:demo`), PROMO-02 completada (portada) y PROMO-04 completada (privacidad y condiciones, que la demo debe respetar).
> **Backlog:** PROMO-01 pausado y PROMO-06 pendiente de debate.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Añadir «Probar la demo» en la portada para abrir el proyecto de demostración sin cuenta, en solo lectura y sin acceso a nada más.
- [ ] Criterio de éxito: sin sesión se recorre el tablero demo con datos ficticios; toda escritura responde 403; no se puede cambiar de proyecto ni entrar en Ajustes > Tokens MCP, Administradores o Almacenamiento; no se muestran correos; con sesión real de ChatGPT, la identidad real tiene prioridad y la demo se ignora.

## 2. Alcance

**Dentro:**
- Identidad de demo sintética y fija, resuelta en el servidor, nunca leída de cabeceras que pueda enviar el cliente.
- Entrada desde la portada y salida clara («Entrar con ChatGPT»), con aviso visible de que es una demo.
- Acceso de solo lectura al proyecto fijo `22222222-2222-4222-8222-222222222222` de PROMO-03, tratado con el rol `guest` que ya existe.
- Bloqueo de escrituras en la API y en la interfaz: tareas, fichas, miembros, ajustes de proyecto, pizarras y documentos de apps.
- Aislamiento: un solo proyecto, sin listado de proyectos reales, sin ajustes sensibles y sin correos de miembros.
- Pruebas de no-escritura, aislamiento, prioridad de sesión real y ausencia de datos personales.

**Fuera de alcance:**
- Cuentas demo persistentes, más de un proyecto de demo o editar el proyecto demo desde la demo.
- MCP: `/mcp` y `/api/mcp` siguen exigiendo autenticación y quedan fuera.
- Sockets en vivo para la demo: las pizarras se sirven en solo lectura desde su instantánea.
- Cambiar el rol `guest`, la matriz de permisos o el modelo de datos.
- Publicar en Sites, sembrar la D1 remota o cambiar la versión `1.1.32`.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Identidad de demo en el servidor** | Aceptar una cabecera `x-demo` del cliente | Un cliente no debe poder declararse otra cuenta; la identidad se define en código y no se lee de la petición. |
| **Cookie de selección `__demo` (HttpOnly, SameSite=Lax)** | Enlace con `?demo=1` en cada vista | La cookie sobrevive a la navegación entre vistas y se borra al salir; no es una credencial: activa una identidad fija de solo lectura. |
| **Reutilizar el rol `guest`** | Crear un rol `demo` nuevo | `guest` ya deniega escritura en la matriz, en el MCP y en las apps; evita duplicar reglas y pruebas. |
| **Proyecto fijo de PROMO-03** | El primer proyecto o `default` | Evita mezclar datos reales; el seed ya crea ese proyecto con datos ficticios. |
| **Resolver la demo en `getChatGPTUser`/`projectAccessForUser`** | Tocar las ~33 rutas una a una | Un único punto de resolución evita olvidos; las rutas siguen usando los mismos contratos y permisos. |
| **Demo sin sockets** | Sockets con identidad de demo | Reduce la superficie de autenticación en `worker/index.ts`; la lectura de pizarras no necesita presencia en vivo. |
| **La sesión real manda** | Demo siempre activa | Una cuenta real no debe perder su identidad ni sus permisos por tener la cookie de demo. |
| **Aviso y CTA de entrada real** | Demo indistinguible | La persona debe saber que los datos son ficticios y poder entrar con su cuenta. |

## 4. Fases

### Fase 1: Identidad de demo y acceso al proyecto — completada (2026-11-16)
- [x] Extraer `DEMO_PROJECT_ID` a `lib/domain/demo.ts` para compartirlo entre `scripts/seed-demo.mjs` y el servidor, sin importar el script desde `app/`.
- [x] Añadir `lib/server/demo.ts` con la identidad fija (`userId` reservado, nombre «Demo», correo vacío o ficticio), la lectura de la cookie y el rol `guest` limitado al proyecto demo.
- [x] Resolver la demo en `getChatGPTUser` solo cuando no haya cabeceras reales de Sites y la cookie esté activa; en `projectAccessForUser`, devolver `Access` de `guest` únicamente para `DEMO_PROJECT_ID`.
- [x] Crear la entrada `/demo` (route handler) que fija la cookie y redirige a `/?project=<demo>`, y la salida `/demo/salir` que la borra y vuelve a `/`.
- [x] Si el proyecto demo no existe, mostrar un aviso con `npm run seed:demo` en lugar de crear datos desde la demo.
- **Criterios de aceptación:** sin sesión, `/demo` abre el tablero demo; con sesión real, la identidad real manda; cualquier otro `project` devuelve 403/404; la demo no crea filas ni modifica la D1.
- **Verificación:** `lib/domain/demo.ts` centraliza el id, el nombre, la cookie y la identidad `demo_local`; `getChatGPTUser` devuelve esa identidad solo con `__demo=1` y sin cabeceras de Sites, y `projectAccessForUser` le da `guest` únicamente al proyecto demo. `isOwner`/`isAdministrator` la rechazan sin tocar la base. `loadProjectsOverview` y `listVisibleProjects` devuelven solo el proyecto demo, sin actualizar `user_identities` ni reclamar la instancia. `/demo` responde `303` con `Set-Cookie: __demo=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800` y redirige a `/?project=2222…`; `/demo/salir` responde `303` y borra la cookie; sin proyecto, `/demo` sirve una página 404 con `npm run seed:demo`. En navegador, la demo abre el tablero con 25 %, ocho tareas y el rol «Demo»; con `__sites_local_auth` + `__demo` manda «Seedy» y reaparecen los permisos reales; otro proyecto muestra «Este enlace no está disponible». 10 pruebas nuevas; suite completa **154 archivos / 1.137 pruebas**, `tsc` y ESLint correctos; `npm run seed:demo -- --dry-run` sigue funcionando con el id compartido.

### Fase 2: Solo lectura en API, interfaz y sockets — completada (2026-11-16)
- [x] Auditar las rutas de escritura de `app/api/**` y garantizar 403 para `guest` en todas (crear, editar, borrar, instalar, subir, guardar pizarra o documento).
- [x] Ocultar o desactivar en la interfaz las acciones de escritura: nueva tarea, editar o arrastrar tarjetas, fichas, miembros, ajustes de proyecto, pizarras y documentos de apps; mantener la navegación de lectura y el calendario.
- [x] Bloquear Ajustes > Tokens MCP, Administradores, Almacenamiento y cualquier ajuste de instancia para la demo, además de la lista de proyectos reales.
- [x] Mantener ocultos los correos de miembros (`maySeeStudentEmail`/`maySeeTeacherEmail`) y no exponer tokens ni datos de auditoría.
- [x] Rechazar la identidad de demo en `worker/index.ts` (sockets) y evitar que el tablero demo intente abrirlos; las pizarras se leen desde la instantánea.
- **Criterios de aceptación:** ninguna escritura posible (403 con pruebas en todas las rutas); sin acceso a otros proyectos ni a ajustes sensibles; sin correos ni tokens; el tablero demo no falla por el socket.
- **Verificación:** con la cookie de demo, 14 escrituras responden 403 (`tasks`, `boards`, `app-documents`, `uploads`, `mcp/tokens`, `personal-apps`, `invitations`, `space-apps`, `project-books`, `administrators`, `storage/purge`, `/mcp`, y `projects` POST/DELETE) y las lecturas de tareas y alumnos responden 200. En el HTML servido no aparecen «Nueva tarea», «Añadir alumno/profesor», «Gestionar miembros», «Compartir/Eliminar/Nuevo proyecto» ni «Tokens MCP»; la cuenta de demo ofrece «Salir de la demo» en vez de «Cerrar sesión». `SettingsView` oculta Tokens MCP a `guest` y `Whiteboard` no abre presencia cuando `live` es falso (prueba con WebSocket espía). Los sockets del worker siguen devolviendo 401 sin cabeceras de Sites. Suite completa **155 archivos / 1.143 pruebas**, `tsc` y ESLint correctos.

### Fase 3: Entrada, textos y verificación
- [ ] Añadir «Probar la demo» en la portada y el enlace desde la ayuda, con textos que expliquen que es ficticia y de solo lectura.
- [ ] Revisar privacidad y condiciones: la demo usa datos ficticios y no requiere cuenta; no se recogen datos nuevos.
- [ ] Probar con una D1 limpia y `npm run seed:demo`: recorrer tareas, calendario, personas, tienda, pizarras y ayuda; intentar escribir desde la interfaz y desde la API.
- [ ] Pasar suite completa, `tsc`, ESLint, build y `perf:budget`; revisar 1366, 1024 y 390 px en claro y oscuro; actualizar README, ayuda, changelog y archivar el roadmap.
- **Criterios de aceptación:** la demo se reconstruye con el seed y se recorre sin cuenta; no hay escrituras, datos reales ni acceso a ajustes; los checks están en verde y no se publica ni se cambia de versión.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El cambio toca la autenticación de toda la app | Regresión de acceso o permisos | Resolver la demo en un único punto, denegar por defecto y cubrir con pruebas de acceso, escritura y prioridad de sesión real. |
| Una cookie falsificada da más de lo debido | Acceso no autorizado | La cookie solo activa una identidad fija sin escritura y limitada al proyecto demo; no concede ningún otro permiso. |
| La demo apunta a un proyecto real | Fuga de datos | Identificador fijo y prueba de que otro proyecto devuelve 403/404. |
| Alguna ruta de escritura queda abierta | Datos modificados desde la demo | Auditoría de `app/api/**` y matriz de pruebas 403 por método y recurso. |
| Se muestran correos o tokens | Fuga de datos personales | `maySee*Email` ya oculta correos a `guest`; pruebas explícitas y revisión visual. |
| El tablero intenta abrir sockets y falla | Demo rota o errores en consola | Demo sin sockets y manejo del 401 en la pizarra. |
| El proyecto demo no está sembrado | Demo vacía o error | Aviso con `npm run seed:demo`; nunca sembrar desde la demo. |
| La demo se confunde con datos reales | Mala interpretación | Banner visible y CTA para entrar con cuenta real. |

## 6. Notas de sesión

- 2026-11-16: PROMO-05 sale del bloque PROMO-05..06 del backlog y pasa a ser el roadmap activo; PROMO-06 permanece pendiente de debate.
- 2026-11-16: `getChatGPTUser` exige las cabeceras `oai-authenticated-user-*` y `projectAccessForUser` busca membresía activa; la demo se resuelve antes de esa búsqueda para no crear miembros ficticios.
- 2026-11-16: el rol `guest` ya es de solo lectura en la matriz de permisos, en el contrato MCP y en Excalidraw y Blockly; la demo lo reutiliza en lugar de inventar un rol nuevo.
- 2026-11-16: los sockets de `worker/index.ts` leen las cabeceras directamente y devuelven 401 sin usuario; la demo queda estática y no toca esa autenticación.
- 2026-11-16: el proyecto demo es el `22222222-2222-4222-8222-222222222222` de PROMO-03, con datos ficticios y sin correos reales.
- 2026-11-16: no se publica en Sites ni se cambia la versión `1.1.32`; el cierre es local y el push, único, como en los roadmaps anteriores.
- 2026-11-16: la demo no tiene filas en `project_members`; `loadProjectsOverview` y `listVisibleProjects` la resuelven con el proyecto fijo para que el tablero abra sin escribir en `user_identities` ni reclamar la instancia.
- 2026-11-16: al reutilizar `guest`, las cuentas invitadas reales también pierden Tokens MCP y la presencia en vivo de las pizarras; es coherente con su rol de solo lectura y evita ramas nuevas en la interfaz.
