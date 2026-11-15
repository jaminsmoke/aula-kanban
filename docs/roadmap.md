# Roadmap MCP-05A + MCP-05C

> **Backlog:** MCP-05B, MCP-05D y MCP-05E siguen en [`backlog.md`](backlog.md).
> **Inicio:** 2026-11-15 · **Estado:** En curso

---

## 1. Objetivo

- [ ] Dejar un contrato MCP común para las apps nativas y probarlo con la primera herramienta de contenido de una app.
- [ ] Criterio de éxito: una app instalada puede consultarse por MCP sin repetir permisos ni comprobaciones; una app desinstalada responde `not_found`; el catálogo sigue teniendo una sola fuente.

## 2. Alcance

**Dentro:**
- Contrato de servidor `resolverAppInstalada` / `resolverAppEnProyecto` para validar app, instalación, proyecto y permisos.
- Manifiesto `APP_MCP_DECLARACIONES` con una entrada por app del catálogo y una prueba que impide dejar una app sin declarar.
- `consultar_elemento` de Herramientas de aula por símbolo o número, sin proyecto y sin escritura.
- Datos periódicos compartidos entre la interfaz y MCP, sin duplicar los 118 elementos.
- Catálogo, ejemplos, roles, snapshot, matriz y documentación de cobertura.

**Fuera de alcance:**
- Excalidraw, Blockly y Diagramas; quedan en MCP-05B, MCP-05D y MCP-05E.
- Escritura de documentos, pizarras o estados de app.
- Cálculo, ecuaciones, generación de código, ejecución, render de Mermaid o lectura en voz alta en el Worker.
- Subida de imágenes, cambios de esquema y migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Contrato y declaraciones en `lib/server/mcp/apps/` | `mcp.ts` dentro de `app/board/apps/<id>/` | `lib/` no puede importar desde `app/`; la frontera ya la bloquea ESLint. |
| Manifiesto central con una entrada por `NATIVE_APP_IDS` | registrar herramientas app por app sin lista canónica | una app nueva sin declaración rompe un test en vez de quedar invisible. |
| `consultar_elemento` sin `proyectoId` | exigir proyecto para una consulta global | el dato es de la app y la instalación es de la instancia; no hay estado de proyecto que proteger. |
| Herramientas de app de solo lectura en este roadmap | incluir escritura o cálculo | el piloto valida el contrato sin abrir permisos nuevos ni meter compute en el Worker. |
| Datos periódicos en `lib/domain/edu-tools/` | importar el JSON desde `app/board/apps/edu-tools/` | cliente y servidor comparten una sola copia sin invertir la dependencia. |

## 4. Fases

### Fase 1: Contrato común y manifiesto

- [x] Crear `resolverAppInstalada` y `resolverAppEnProyecto` con el contrato de errores existente: `not_found` si la app no existe o no está instalada, `forbidden` para invitados en escritura y resolución previa del proyecto cuando haga falta.
- [x] Crear `APP_MCP_DECLARACIONES` con una entrada por app; las que aún no tienen herramientas declaran `pendiente`.
- [x] Agregar `herramientasDeApps` al registro central sin cambiar el catálogo público.
- [x] Añadir tests del contrato y de la cobertura de las cuatro apps.
- [x] Documentar en `app/board/apps/README.md` que la superficie MCP vive en `lib/server/mcp/apps/`.
- **Criterios de aceptación:** el catálogo sigue en 50 herramientas y `0.21.0`; todas las apps tienen declaración; ninguna herramienta de app se registra sin pasar por el contrato; `lib` no importa desde `app`.
- **Estado:** Completada el 2026-11-15.

### Fase 2: Piloto de Herramientas de aula

- [ ] Mover `periodic-elements.json` y `PeriodicElement` a `lib/domain/edu-tools/`, dejando un reexport o import compartido en la tabla.
- [ ] Implementar `consultar_elemento` con `simbolo` o `numero` como alternativas excluyentes, búsqueda insensible a mayúsculas y `not_found` si no existe.
- [ ] Declarar la herramienta en `APP_MCP_DECLARACIONES` y retirar su `pendiente`.
- [ ] Añadir la entrada al catálogo público, ejemplo de argumentos y regla de rol; subir el catálogo a `0.22.0` con 51 herramientas.
- [ ] Actualizar snapshot, matriz de roles y pruebas de la herramienta y del dato compartido.
- **Criterios de aceptación:** `consultar_elemento` funciona por símbolo y por número; la app desinstalada responde `not_found`; no se introduce cálculo en el servidor; la web y MCP leen la misma lista.

### Fase 3: Cobertura y cierre

- [ ] Añadir `docs/mcp-apps.md` con la matriz de cobertura por app: abrir, ventana, leer, escribir, exportar, permisos y límites.
- [ ] Enlazar la matriz desde `docs/README.md` y `app/board/apps/README.md`.
- [ ] Revisar que no queden otras acciones de app sin cubrir y registrar las que sean entradas nuevas.
- [ ] Ejecutar lint, `tsc`, tests y build; resumir el roadmap en `docs/changelog.md` y reiniciar `docs/roadmap.md`.
- **Criterios de aceptación:** la matriz deja explícito qué falta en cada app; la verificación final está en verde; el roadmap se cierra solo cuando las tres fases estén completas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Importar datos o tipos desde `app/` en MCP | rompe la frontera `app → lib` y el lint | mover el dato compartido a `lib/domain/edu-tools/` antes de usarlo. |
| Cambiar el catálogo sin actualizar snapshot, ejemplos y matriz | tests de contrato en rojo y clientes con metadatos incoherentes | actualizar catálogo, snapshot y matriz en la misma fase. |
| Comprobar instalación antes que el proyecto | filtrar la existencia de proyectos ajenos | resolver proyecto y acceso primero en las herramientas con `proyectoId`. |
| Duplicar la tabla periódica | dos fuentes que se desincronizan | una sola copia en `lib/domain/edu-tools/` y reexport en la app. |
| Confundir app instalada con app abierta | `consultar_elemento` no necesita ventana | la comprobación es de instalación; abrir/cerrar sigue en MCP-04. |

## 6. Notas de sesión

- Base: catálogo `0.21.0` con 50 herramientas y 9 entradas de backlog antes de este roadmap.
- La fase 1 no añade herramientas ni sube la versión del catálogo; la fase 2 es la que cambia el contrato público.
- `MCP-05C` se usa como piloto porque es la app con menor superficie: un dato de solo lectura y sin estado de proyecto.
- Fase 1 completada: contrato, manifiesto y tests; 21 tests focalizados, `tsc`, lint y `git diff --check` en verde. El catálogo sigue en 50 herramientas y `0.21.0`.
