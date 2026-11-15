# Roadmap MCP-05D · Programación por bloques por MCP

> **Backlog:** MCP-05E sigue en [`backlog.md`](backlog.md).
> **Inicio:** 2026-11-15 · **Estado:** En curso

---

## 1. Objetivo

- [ ] Leer y guardar el programa de Blockly de un proyecto desde MCP, usando la misma fila de `app_documents` que la web.
- [ ] Criterio de éxito: un programa guardado por la web se lee por MCP; uno guardado por MCP se abre en la web; se conservan los campos desconocidos; el límite de 200 KB y el bloqueo de invitados se respetan.

## 2. Alcance

**Dentro:**
- `leer_programa_bloques` para devolver la serialización de `Blockly.serialization.workspaces` y su fecha.
- `guardar_programa_bloques` para validar `blocks.blocks[]` y guardar el estado con el mismo formato que `useBlockly`.
- Constante compartida para el límite de 200.000 caracteres de `app_documents`.
- Reutilización de `readAppDocument`/`saveAppDocument` y de `resolverAppEnProyecto` para instalación, proyecto y permisos.
- Catálogo, snapshot, matriz, ayuda, README y matriz de cobertura actualizados.

**Fuera de alcance:**
- Generar, ejecutar o validar código JavaScript/Python en el servidor.
- Cambiar la interfaz de Blockly, su toolbox o su serialización.
- Añadir revisión optimista: `app_documents` mantiene la última escritura gana.
- Crear tablas, endpoints o migraciones nuevas.
- Diagramas Mermaid, que pertenecen a MCP-05E.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Reutilizar `app_documents` y `readAppDocument`/`saveAppDocument` | una tabla o un endpoint específicos de Blockly | la app ya guarda ahí su serialización; duplicar la persistencia rompería la lectura web ↔ MCP. |
| Extraer `MAX_APP_DOCUMENT_CHARS` al servicio común | repetir `200_000` en la ruta y en MCP | la API y las herramientas deben aceptar y rechazar exactamente el mismo tamaño. |
| Validar la forma mínima `blocks.blocks[]` antes de guardar | confiar en el JSON recibido | evita guardar un estado que Blockly no pueda cargar y conserva el resto de campos. |
| Guardar el objeto JSON completo, sin reconstruirlo | mapear solo campos conocidos | Blockly añade datos internos que la web necesita al volver a cargar. |
| Devolver el estado o `null` cuando no hay programa | crear un documento vacío al leer | una lectura no debe modificar la base de datos. |
| Escritura con `resolverAppEnProyecto(..., { escritura: true })` | comprobar permisos dentro de la herramienta | el contrato común ya bloquea invitados y resuelve app, proyecto y acceso. |
| No generar ni ejecutar código en el Worker | mover el generador o el worker a MCP | la app genera y ejecuta en el navegador; MCP solo persiste el estado. |

## 4. Fases

### Fase 1: Servicio y validación compartidos

- [x] Exportar `MAX_APP_DOCUMENT_CHARS` desde `lib/server/app-documents.ts` y usarlo en `app/api/app-documents/route.ts`.
- [x] Crear un validador puro en `lib/domain/blockly/serialization.ts` para comprobar que el estado es un objeto con `blocks.blocks[]` y conservar el resto de claves.
- [x] Cubrir el límite compartido, la forma mínima y la conservación de campos desconocidos con pruebas.
- **Criterios de aceptación:** API y MCP comparten el límite; un estado válido de `Blockly.serialization.workspaces` se acepta; un JSON sin `blocks.blocks[]` se rechaza sin tocar la base de datos.
- **Estado:** Completada el 2026-11-15. 18 tests focalizados, suite completa 107 archivos / 878 tests, `tsc` y lint en verde. `MAX_APP_DOCUMENT_CHARS` es la fuente única del límite y `lib/domain/blockly/serialization.ts` valida y conserva el estado.

### Fase 2: Herramientas MCP

- [ ] Crear `lib/server/mcp/apps/blockly.ts` con `leer_programa_bloques` y `guardar_programa_bloques`.
- [ ] Hacer que la lectura resuelva el proyecto y la app instalada, y devuelva `{ estado, actualizado }` o `null` si no hay programa.
- [ ] Validar en la escritura la forma mínima, el límite de 200 KB y el JSON; guardar con `saveAppDocument` y devolver la fecha.
- [ ] Declarar las dos herramientas en `APP_MCP_DECLARACIONES` y actualizar el catálogo a `0.25.0` con 56 herramientas (24 de lectura, 32 de escritura y 8 destructivas).
- [ ] Añadir pruebas de app desinstalada, proyecto inexistente, sin acceso, invitado, estado inválido, exceso de tamaño y round-trip con la web.
- **Criterios de aceptación:** el alumnado y el profesorado pueden leer y guardar según su acceso; los invitados reciben 403; la app desinstalada responde `not_found`; no se pierden campos desconocidos.

### Fase 3: Cobertura, verificación y cierre

- [ ] Actualizar `docs/mcp-apps.md` para marcar Blockly como cubierto, con permisos y límites.
- [ ] Actualizar la ayuda, el README generado, el snapshot y `content-coverage` con las dos herramientas.
- [ ] Ejecutar lint, `tsc`, tests y build; resumir el roadmap en `docs/changelog.md` y reiniciar `docs/roadmap.md`.
- **Criterios de aceptación:** la matriz deja de mostrar Blockly como pendiente; la suite y el build están en verde; no se añaden entradas al backlog; MCP-05E sigue en el backlog.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Serialización distinta entre la web y MCP | Blockly no puede abrir el programa | validar `blocks.blocks[]` y probar un round-trip con una escena real. |
| Perder campos internos de Blockly | el programa pierde bloques o configuración | guardar el objeto completo y no reconstruirlo. |
| Límite distinto entre API y MCP | una vía acepta estados que la otra rechaza | extraer `MAX_APP_DOCUMENT_CHARS` y probarlo en ambas. |
| Invitados escribiendo | cambios no autorizados | resolver con `escritura: true`, que ya devuelve 403. |
| Confundir MCP con un ejecutor | prometer ejecución remota | documentar que generar y ejecutar código sigue en el navegador. |
| Añadir herramientas sin actualizar la ayuda | `content-coverage` en rojo | actualizar catálogo, ayuda, README y snapshot en la misma fase. |

## 6. Notas de sesión

- Base: catálogo `0.24.0` con 54 herramientas; MCP-05B cerrado.
- `MCP-05D` sale del backlog al entrar en este roadmap. El backlog conserva MCP-05E, PER-03, PER-01B, PER-02 y SYNC-01.
- La app ya guarda `Blockly.serialization.workspaces` en `app_documents` (`appId: "blockly"`) con máximo 200.000 caracteres y sin revisión optimista.
- `readAppDocument` devuelve `state` y `updatedAt`; `saveAppDocument` reemplaza la fila del proyecto y app.
- No se cambia la versión del Site (`1.1.27`) ni se publica en Sites durante el roadmap.
- El cierre deja los commits locales; el push a GitHub se decide al cerrar, según SYNC-01 y la autorización del usuario.
