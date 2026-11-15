# Roadmap MCP-05B · Excalidraw por MCP

> **Backlog:** MCP-05D y MCP-05E siguen en [`backlog.md`](backlog.md).
> **Inicio:** 2026-11-15 · **Estado:** En curso

---

## 1. Objetivo

- [ ] Leer, guardar y ampliar las pizarras de Excalidraw desde MCP con los mismos permisos, límites y revisión optimista que la web.
- [ ] Criterio de éxito: una pizarra guardada por MCP se abre en la web; una guardada en la web se lee por MCP; una revisión ajena no se pisa; el alumnado solo escribe en sus tareas y los invitados no escriben.

## 2. Alcance

**Dentro:**
- Servicio compartido `lib/server/boards.ts` para validar dueño, permisos, lectura y guardado con revisión.
- `leer_pizarra`, `guardar_pizarra` y `anadir_a_pizarra` para pizarras `task`, `project` y `space`.
- Constructor puro de elementos Excalidraw para texto, rectángulo, elipse y flecha, sin pedir JSON interno al agente.
- Publicación de la escena guardada en el `BoardRoom` de la pizarra.
- Catálogo, snapshot, matriz de roles, ayuda, README y matriz de cobertura actualizados.
- Pruebas del servicio, de las herramientas, de los permisos y de la publicación en vivo.

**Fuera de alcance:**
- Cambiar la interfaz de Excalidraw o su modelo de presencia.
- Subir imágenes o archivos desde MCP.
- Exportar la pizarra a imagen o SVG desde el Worker.
- Renderizar, validar visualmente o interpretar la escena.
- Migraciones, tablas nuevas o cambios en la app Store.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Extraer lectura, guardado, `ownerExists` y `canWrite` a `lib/server/boards.ts` | duplicar la lógica en MCP | la API y MCP deben compartir permisos, límites y revisión; una copia se desincroniza. |
| Herramientas en `lib/server/mcp/apps/excalidraw.ts` | código MCP dentro de `app/board/apps/excalidraw/` | `lib` no puede importar desde `app`; la frontera ya está bloqueada por ESLint. |
| `guardar_pizarra` y `anadir_a_pizarra` exigen `revision` | leer y escribir sin revisión | evita pisar cambios de otra sesión y evita duplicar una operación reintentada. |
| Constructor puro de elementos en `lib/domain/boards/` | aceptar el JSON interno de Excalidraw | el agente no debe conocer campos como `versionNonce`, `seed` o `boundElements`. |
| `anadir_a_pizarra` lee, fusiona y guarda con la revisión esperada | devolver una escena completa al cliente | mantiene el contrato pequeño y conserva los elementos y archivos existentes. |
| Publicar la escena con un método RPC del `BoardRoom` | abrir un endpoint HTTP interno | el Durable Object ya es el canal de la sala; no hace falta una ruta nueva. |
| Guardar hasta 2 MB y publicar en vivo hasta 1 MB | subir el límite del socket | se conserva el contrato actual de `BoardRoom`; si la escena es mayor, la web la recoge por sondeo. |

## 4. Fases

### Fase 1: Servicio compartido de pizarras

- [ ] Crear `lib/server/boards.ts` con los tipos `task | project | space`, el límite de 2 MB, `ownerExists`, `canWrite`, `readBoard` y `saveBoard`.
- [ ] Hacer que `app/api/boards/route.ts` use el servicio y quede como envoltorio HTTP, conservando los mensajes y estados 400/403/404/409.
- [ ] Cubrir dueño de tarea, pizarra de proyecto, pizarra de Mi espacio, invitado, alumnado en tarea propia y alumnado en tarea ajena.
- [ ] Probar la creación con revisión 0, la actualización con revisión coincidente y el conflicto con revisión desactualizada.
- **Criterios de aceptación:** la API mantiene su contrato; no hay validación duplicada; el alumnado solo escribe en sus tareas; los invitados no escriben; una revisión ajena no se sobrescribe.

### Fase 2: Lectura y guardado por MCP

- [ ] Implementar `leer_pizarra` con `proyectoId`, `tipo` y `duenoId`; devuelve `{ snapshot, revision, updatedAt }` y una pizarra vacía con revisión 0 si aún no existe.
- [ ] Implementar `guardar_pizarra` con el mismo contexto, `snapshot` de hasta 2 MB y `revision`; valida JSON con `elements[]`, usa el servicio común y devuelve `conflict` con `revisionActual` si otra sesión guardó antes.
- [ ] Declarar las dos herramientas en `APP_MCP_DECLARACIONES`, actualizar catálogo a `0.23.0` con 53 herramientas (23 de lectura, 30 de escritura y 8 destructivas), snapshot, matriz y ayuda.
- [ ] Añadir pruebas de app desinstalada, proyecto inexistente, sin acceso, invitado, alumnado fuera de sus tareas, tamaño excesivo, JSON inválido y conflicto.
- **Criterios de aceptación:** una pizarra vacía se puede crear con revisión 0; una pizarra existente se lee y se guarda sin perder campos; el 409 devuelve la revisión actual; no se puede escribir una pizarra ajena; la app desinstalada responde `not_found`.

### Fase 3: Añadir elementos y sala en vivo

- [ ] Crear `lib/domain/boards/excalidraw-elements.ts` con un constructor puro para `texto`, `rectangulo`, `elipse` y `flecha`; completa los campos que Excalidraw necesita y no toca `appState` ni `files`.
- [ ] Implementar `anadir_a_pizarra` con `proyectoId`, `tipo`, `duenoId`, `revision` y una lista acotada de elementos; valida cantidad, texto y coordenadas, fusiona con la escena existente y no acepta tipos fuera de la lista.
- [ ] Añadir `publicarEscena` al `BoardRoom` y un helper de servidor que publique solo después de guardar; sin binding o sin pestañas debe devolver `sincronizada: false` sin fallar.
- [ ] Si el snapshot supera 1 MB, no enviarlo por el socket: guardarlo, devolver `sincronizada: false` y dejar que el sondeo de la web lo cargue.
- [ ] Actualizar catálogo a `0.24.0` con 54 herramientas (23 de lectura, 31 de escritura y 8 destructivas), snapshot, matriz y ayuda.
- **Criterios de aceptación:** se añaden los cuatro tipos con posición y texto; se conservan elementos, archivos y estado existentes; una revisión ajena devuelve 409; una pestaña abierta recibe la escena guardada; los límites de 2 MB, 1 MB en vivo y 50 elementos se respetan.

### Fase 4: Cobertura, verificación y cierre

- [ ] Actualizar `docs/mcp-apps.md` con Excalidraw cubierto y precisar el fallback de escenas mayores de 1 MB.
- [ ] Actualizar la ayuda, el README generado y la documentación de la app; `content-coverage` debe incluir las tres herramientas.
- [ ] Ejecutar lint, `tsc`, tests y build; resumir el roadmap en `docs/changelog.md` y reiniciar `docs/roadmap.md`.
- **Criterios de aceptación:** la matriz deja de mostrar Excalidraw como pendiente; la verificación final está en verde; no se añaden entradas al backlog; el roadmap se cierra solo cuando las cuatro fases estén completas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Duplicar permisos entre API y MCP | una vía permite escribir donde la otra no | extraer el servicio en la fase 1 y usarlo en ambas. |
| Pisar una revisión ajena | pérdida de trazos | exigir `revision` en las dos escrituras y devolver `conflict` con la revisión actual. |
| Reintentar `anadir_a_pizarra` y duplicar elementos | escena con formas repetidas | la revisión cambia tras el primer guardado; el reintento recibe 409 y obliga a releer. |
| Publicar antes de guardar | pestañas con una escena que no está en D1 | publicar solo con la respuesta guardada y su revisión. |
| Superar el límite del socket | la pestaña no recibe la escena | guardar hasta 2 MB, publicar hasta 1 MB y usar el sondeo de 5 s como respaldo. |
| Cambiar el formato de Excalidraw | elementos que la app no puede abrir | fijar la versión 0.18.1 y probar el constructor con los cuatro tipos. |
| Añadir herramientas sin actualizar la ayuda | `content-coverage` en rojo y documentación incompleta | actualizar catálogo, ayuda, README y snapshot en la misma fase. |

## 6. Notas de sesión

- Base: catálogo `0.22.0` con 51 herramientas; MCP-05A + MCP-05C cerrados.
- `MCP-05B` sale del backlog al entrar en este roadmap. Quedan MCP-05D, MCP-05E, PER-03, PER-01B, PER-02 y SYNC-01.
- La app ya escribe en `boards` con `ownerType` `task | project | space`, revisión optimista y sincronización en vivo; no se cambia su interfaz.
- El snapshot puede llegar a 2 MB; la escena que viaja por `BoardRoom` sigue limitada a 1 MB.
- No se cambia la versión del Site (`1.1.27`) ni se publica en Sites durante el roadmap.
- El cierre deja los commits locales; el push a GitHub se decide al cerrar, según SYNC-01 y la autorización del usuario.
