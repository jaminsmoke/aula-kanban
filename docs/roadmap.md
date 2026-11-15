# Roadmap MCP-05E · Diagramas Mermaid por MCP

> **Backlog:** PER-03, PER-01B, PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md).
> **Inicio:** 2026-11-15 · **Estado:** En curso

---

## 1. Objetivo

- [ ] Leer, guardar y descubrir las plantillas de la app Diagramas desde MCP, usando la misma fila de `app_documents` y la misma lista de plantillas que la web.
- [ ] Criterio de éxito: un diagrama guardado por la web se lee por MCP; uno guardado por MCP se abre en la web; las plantillas devueltas coinciden con las de la app; el límite de 200 KB y el bloqueo de invitados se respetan.

## 2. Alcance

**Dentro:**
- `leer_diagrama` para devolver `{ codigo, actualizado }` o `null` si no hay diagrama.
- `guardar_diagrama` para validar `{ code }`, aplicar el límite compartido y guardar con `saveAppDocument`.
- `listar_plantillas_diagrama` para devolver las plantillas compartidas sin necesidad de proyecto.
- Mover `MERMAID_TEMPLATES` a `lib/domain/mermaid/` para que la app y MCP lean la misma copia.
- Catálogo, snapshot, matriz, ayuda, README y matriz de cobertura actualizados.

**Fuera de alcance:**
- Validar sintaxis, renderizar SVG o exportar diagramas en el Worker.
- Cambiar el editor, la vista previa o la exportación SVG de la app.
- Añadir revisión optimista: `app_documents` mantiene la última escritura gana.
- Crear tablas, endpoints o migraciones nuevas.
- Las demás apps, ya cubiertas por MCP-05B y MCP-05D.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Reutilizar `app_documents` y `readAppDocument`/`saveAppDocument` | una tabla o un endpoint específicos de Mermaid | la app ya guarda ahí `{ code }`; duplicar la persistencia rompería la lectura web ↔ MCP. |
| Mover `MERMAID_TEMPLATES` a `lib/domain/mermaid/templates.ts` | mantener dos listas o importar desde `app` | `lib` no puede importar desde `app`; la UI y MCP deben compartir la misma fuente. |
| Validar `{ code: string }` antes de guardar | confiar en el JSON recibido | evita guardar un documento que la app no pueda cargar. |
| Devolver `{ codigo: null, actualizado: null }` cuando no hay diagrama | crear un documento vacío al leer | una lectura no debe modificar la base de datos. |
| Escritura con `resolverAppEnProyecto(..., { escritura: true })` | comprobar permisos dentro de la herramienta | el contrato común ya bloquea invitados y resuelve app, proyecto y acceso. |
| Plantillas sin proyecto con `resolverAppInstalada` | exigir proyecto para listar plantillas | las plantillas son estáticas y no dependen de un proyecto. |
| No validar sintaxis ni renderizar en el Worker | mover Mermaid al servidor | la vista previa y el render son capacidades del navegador. |

## 4. Fases

### Fase 1: Documento y plantillas compartidos

- [x] Mover `MERMAID_TEMPLATES` y su tipo a `lib/domain/mermaid/templates.ts`; la app pasa a importarlos desde allí sin cambiar su comportamiento.
- [x] Crear un validador puro en `lib/domain/mermaid/document.ts` para comprobar que el documento es `{ code: string }` y conservar el resto de claves.
- [x] Cubrir la forma válida, el rechazo de `code` no textual, la conservación de campos desconocidos y la igualdad de la lista de plantillas con pruebas.
- **Criterios de aceptación:** la app y MCP comparten plantillas y validación; el editor sigue mostrando las seis plantillas; un documento sin `code` se rechaza sin tocar la base de datos.
- **Estado:** Completada el 2026-11-15. 9 tests focalizados, `tsc` y lint en verde. `lib/domain/mermaid/templates.ts` es la única lista de plantillas y `lib/domain/mermaid/document.ts` valida `{ code }` conservando el resto de claves; `app/board/apps/mermaid/mermaid-templates.ts` desaparece.

### Fase 2: Herramientas MCP

- [x] Crear `lib/server/mcp/apps/mermaid.ts` con `leer_diagrama`, `guardar_diagrama` y `listar_plantillas_diagrama`.
- [x] Hacer que la lectura resuelva el proyecto y la app instalada, y devuelva `{ codigo, actualizado }` o `null` si no hay diagrama.
- [x] Validar en la escritura `{ code }`, el límite de 200.000 caracteres y los invitados; guardar con `saveAppDocument` y devolver la fecha.
- [x] Devolver las plantillas con `{ id, nombre, codigo }` sin exigir proyecto y con la app instalada.
- [x] Declarar las tres herramientas en `APP_MCP_DECLARACIONES` y actualizar el catálogo a `0.26.0` con 59 herramientas (26 de lectura, 33 de escritura y 8 destructivas).
- [x] Añadir pruebas de app desinstalada, proyecto inexistente, sin acceso, invitado, documento inválido, exceso de tamaño, plantillas y round-trip con la web.
- **Criterios de aceptación:** cualquier miembro con acceso lee y guarda; los invitados reciben 403; la app desinstalada responde `not_found`; un documento inválido responde `invalid`; las plantillas coinciden con la app y no requieren proyecto.
- **Estado:** Completada el 2026-11-15. Catálogo `0.26.0` con 59 herramientas; 9 pruebas de las tres herramientas, matriz de 397 casos y snapshot regenerado. `APP_MCP_DECLARACIONES` ya no marca Mermaid como pendiente.

### Fase 3: Cobertura, verificación y cierre

- [ ] Actualizar `docs/mcp-apps.md` para marcar Diagramas como cubierto, con permisos y límites.
- [ ] Actualizar la ayuda, el README generado, el snapshot y `content-coverage` con las tres herramientas.
- [ ] Ejecutar lint, `tsc`, tests y build; resumir el roadmap en `docs/changelog.md` y reiniciar `docs/roadmap.md`.
- **Criterios de aceptación:** la matriz deja de mostrar Mermaid como pendiente; la suite y el build están en verde; no se añaden entradas al backlog; MCP-05E deja de estar pendiente.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Duplicar la lista de plantillas | la app y MCP muestran diagramas distintos | mover la lista a `lib/domain/mermaid/` y probar la igualdad. |
| Renderizar Mermaid en el Worker | dependencia de DOM y coste de CPU | limitar MCP a persistir y devolver texto; el render sigue en la ventana. |
| Perder campos del documento | la app no puede cargar el diagrama | validar `{ code }` conservando el resto de claves y guardar el objeto completo. |
| Invitados escribiendo | cambios no autorizados | resolver con `escritura: true`, que ya devuelve 403. |
| Añadir herramientas sin actualizar la ayuda | `content-coverage` en rojo | actualizar catálogo, ayuda, README y snapshot en la misma fase. |
| Confundir MCP con un validador | prometer detección de sintaxis | documentar que la validación y el render se quedan en el navegador. |

## 6. Notas de sesión

- Base: catálogo `0.25.0` con 56 herramientas; MCP-05D cerrado.
- `MCP-05E` sale del backlog al entrar en este roadmap. El backlog conserva PER-03, PER-01B, PER-02 y SYNC-01.
- La app guarda `{ code }` en `app_documents` (`appId: "mermaid"`) con máximo 200.000 caracteres y sin revisión optimista.
- `readAppDocument` devuelve `state` y `updatedAt`; `saveAppDocument` reemplaza la fila del proyecto y app.
- No se cambia la versión del Site (`1.1.27`) ni se publica en Sites durante el roadmap.
- El cierre deja los commits locales; el push a GitHub se decide al cerrar, según SYNC-01 y la autorización del usuario.
