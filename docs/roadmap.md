# Roadmap UI-08 · Tienda en Administración y Clase en el dock

> **Estado:** Activo
> **Origen:** entrada del backlog del 2026-11-15, segunda parte del replanteo de navegación.
> **Cierre:** al completar las tres fases, el resumen pasa arriba de `docs/changelog.md`, este documento se reinicia desde la plantilla y se hace el push único del roadmap. Sin publicación en Sites.

---

## 1. Objetivo

Llevar el escritorio de aplicaciones a **Administración > Tienda**, retirar **Mi espacio** de la cabecera y convertir **Clase** en la salida principal del dock, sin romper enlaces antiguos ni el control de ventanas por MCP.

- [ ] Criterio de éxito: desde la cabecera solo se navega a Administración; Tienda es una sección más del sidebar, con URL canónica y alias antigua, y Clase se alcanza desde el dock o desde el sidebar de Administración.
- [ ] Criterio de éxito: las apps instaladas, Aula Store, las ventanas redimensionables, el enlace profundo `app=<appId>` y el canal en vivo siguen funcionando dentro del workspace, en 1366, 1024, 900, 620 y 390.
- [ ] Criterio de éxito: pruebas, tipos, lint y build en verde; sin migraciones, sin cambio de versión y sin publicación.

## 2. Alcance

**Dentro:**

- Sección `tienda` en el sidebar de Administración, después de Alumnos y Profesores, con el escritorio de apps como contenido.
- Aula Store se queda como catálogo del dock: se abre encima del escritorio y se cierra con «Escritorio».
- Retirada de «Mi espacio» de `nav.main-nav` y de su botón `space-action`.
- Retirada de «Clase» de la navegación de cabecera; el dock de Tienda la recupera como elemento principal.
- Salida a Clase desde el sidebar de Administración para Alumnos y Profesores, que no tienen dock.
- URL canónica `view=administracion&section=tienda`, alias `view=espacio` y `app=<appId>` conservado en Tienda.
- Renombrado de la vista de escritorio y de sus tipos a Tienda; el protocolo de ventanas del servidor conserva sus nombres.
- Enlaces MCP, catálogo público, ayuda, README y etiquetas de rendimiento actualizados.
- Pruebas de URL, cabecera, administración, escritorio, MCP y paridad; revisión visual en cinco anchos.

**Fuera de alcance:**

- Convertir Aula Store en una sección propia de Administración o cambiar su catálogo, filtros o fichas.
- Cambiar permisos de instalación: sigue siendo propietario/administración; el resto solo abre apps instaladas.
- Persistencia de ventanas entre recargas o entre pestañas.
- Cambiar el protocolo `SpaceRoom`, `/api/space-socket`, `space-control` ni las herramientas de ventanas.
- Rediseñar las apps nativas, el tablero, Calendario, Ajustes o Documentación.
- Migraciones, cambio de la versión del Site, `release:prepare`, push intermedio o publicación.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Tienda es el escritorio completo; Aula Store sigue siendo el catálogo que se abre desde el dock. | Una sección `tienda` solo para el catálogo y otra para el escritorio. | Conserva el flujo actual escritorio → catálogo → abrir app y evita duplicar rutas y estados de instalación. |
| URL canónica `view=administracion&section=tienda`; `view=espacio` se lee y se reescribe como alias. | Una vista nueva `view=tienda` o mantener `view=espacio` como canónica. | Tienda es una sección de Administración; el alias evita romper favoritos, enlaces MCP y pruebas de rendimiento. |
| `app=<appId>` solo tiene significado en Administración > Tienda y se conserva al canonizar `view=espacio`. | Un parámetro nuevo o perder el enlace profundo. | `abrir_app`, `ui://` y los enlaces existentes deben seguir abriendo la misma ventana. |
| El dock vuelve a Clase > Tareas (`view=clase`, sin `section`). | Recordar la última sección de Clase (Tareas o Calendario). | El dock se llama «Clase», no «Calendario»; la URL canónica no guarda estado de una vista que ya no está activa. |
| El sidebar de Administración incorpora una salida «Clase» en todas sus secciones; Tienda además la tiene en el dock. | Dejar Clase solo en el dock, con Alumnos y Profesores sin salida. | Evita un callejón sin salida sin convertir el dock en un chrome persistente. La duplicación en Tienda es deliberada. |
| Tienda la ve cualquier miembro con proyecto activo, igual que Mi espacio; instalar y desinstalar sigue limitado a propietario/administración. | Reservar la sección a propietario/administración. | No cambia el acceso actual a las apps ni amplía permisos de gestión. |
| Componente `StoreDesktop` para el escritorio y `AppsStore` para el catálogo; carpeta `app/board/store/` con el catálogo en `catalog/`. | Llamar `StoreView` a ambos o mantener `SpaceView`. | Elimina la ambigüedad entre la vista y el catálogo antes del renombrado. |

## 4. Fases

### Fase 1 — Integración en Administración y URLs

- [ ] Añadir `tienda` a `AdministracionSection` y `ADMINISTRACION_SECTIONS`, con la sección en `AdministrationView` y carga diferida del escritorio.
- [ ] Pasar rol, proyecto y salida a Clase a la sección Tienda; mantener el catálogo lazy y el refresco de apps cada 10 s.
- [ ] Quitar `.space-topbar` y el botón de vuelta del escritorio; hacer que `.store-view` llene el contenido del workspace en vez de ser un `position:fixed` de viewport.
- [ ] Medir el contenedor del escritorio para abrir, maximizar, arrastrar y redimensionar ventanas dentro del contenido, también al cambiar el tamaño y en móvil.
- [ ] Cambiar el dock a dos acciones: **Clase** como principal y **Aula Store** como catálogo; conservar el estado minimizado y el canal en vivo.
- [ ] Retirar «Clase» y «Mi espacio» de `nav.main-nav`; dejar Administración como única entrada de vistas y limpiar `space-action`, su import y su CSS.
- [ ] Añadir a `WorkspaceLayout` una salida opcional a Clase y usarla en las tres secciones de Administración.
- [ ] Canonizar `view=espacio` a `view=administracion&section=tienda` en `parseBoardUrl`/`buildBoardUrl`, conservar `app` solo en Tienda y actualizar `use-board-url`, cabecera y enlaces MCP de contexto.
- [ ] Actualizar pruebas de URL, cabecera, Administración y escritorio; añadir la comprobación del alias y del enlace profundo.

**Criterios de aceptación:**

- El sidebar muestra Alumnos, Profesores y Tienda; Tienda abre el escritorio con las apps instaladas y Aula Store se abre y cierra sin salir de la sección.
- La cabecera no contiene Clase ni Mi espacio; Administración sigue marcándose activa y el selector de proyecto conserva su sitio.
- Clase desde el dock y desde el sidebar vuelve a `view=clase` (Tareas); Alumnos y Profesores no quedan sin salida.
- `view=espacio&app=mermaid` se lee como Administración > Tienda, abre la ventana y la URL se reescribe a la forma canónica; `app` se ignora y se limpia fuera de Tienda.
- Las ventanas no se salen del área de contenido ni al maximizar; el escritorio no tapa la cabecera ni el sidebar.
- Pruebas focalizadas de URL, cabecera, Administración y escritorio en verde.

### Fase 2 — Renombrado, MCP y documentación

- [ ] Renombrar `app/board/space/` a `app/board/store/`, `space-view.tsx` a `store-desktop.tsx` y `space.css` a `store-desktop.css`; mover el catálogo a `store/catalog/`.
- [ ] Renombrar `SpaceView` a `StoreDesktop`, `SpaceRole`/`SpaceTool`/`SpaceCategory` a `StoreRole`/`StoreTool`/`StoreCategory` y las clases `.space-*` a `.store-*` que pertenezcan a la vista; conservar `SpaceRoom`, `space-control` y `/api/space-socket` como protocolo de ventanas.
- [ ] Actualizar `lib/server/mcp/enlaces.ts`, `dominios/contexto.ts`, `lib/domain/mcp-catalogo.ts`, `mcp-prompts.ts` y los textos de `abrir_app`, catálogo y ventanas para hablar de Tienda y devolver enlaces canónicos.
- [ ] Subir `MCP_CATALOG_VERSION` a `0.27.0` por el enum de sección y los enlaces; actualizar snapshot, matriz de roles y paridad sin cambiar el número de herramientas.
- [ ] Actualizar ayuda, README, `docs/mcp-apps.md` y las referencias de producto; mantener «Mi espacio» solo en el changelog histórico.
- [ ] Renombrar la etiqueta «Mi espacio · abrir» de `perf-latency.mjs`/`perf-report.mjs` a «Tienda · abrir», actualizar raíces y `docs/rendimiento.md`, y regenerar `perf-baseline.json` si cambian los nombres de chunk.
- [ ] Actualizar pruebas de MCP, enlaces y catálogo; comprobar que un enlace antiguo con `app` sigue abriendo la app instalada.

**Criterios de aceptación:**

- No quedan referencias de navegación a `SpaceView`, `view=espacio` como forma canónica ni a «Mi espacio» en la interfaz, la ayuda o los metadatos MCP; el changelog histórico no se reescribe.
- `obtener_enlace` con `vista=espacio` o `vista=administracion&seccion=tienda` devuelve la misma URL canónica; `abrir_app` y las herramientas de ventanas devuelven enlaces de Tienda.
- Snapshot, matriz de roles y paridad actualizados; mismo número de herramientas y ningún permiso nuevo.
- La etiqueta y la raíz de rendimiento apuntan a la nueva vista; la línea base sigue siendo comparable o queda regenerada con nota.
- Pruebas de MCP, catálogo, enlaces y renombrado en verde.

### Fase 3 — Verificación final, revisión y cierre

- [ ] Ejecutar suite completa, `tsc`, lint, build y `git diff --check`.
- [ ] Revisar la build servida en 1366×900, 1024×768, 900×700, 620×800 y 390×844: sidebar, Tienda, dock, catálogo, ventana abierta y maximizada, alias y salida a Clase.
- [ ] Medir ausencia de desbordes horizontales, altura útil del escritorio, posición del dock y encaje de las ventanas; corregir lo que falle y repetir la medida.
- [ ] Comprobar consola sin excepciones y el enlace profundo de una app instalada.
- [ ] Escribir el resumen en `changelog.md`, reiniciar `roadmap.md` desde la plantilla, actualizar README/backlog y dejar el árbol limpio.
- [ ] Restaurar el dev en `http://127.0.0.1:5173` con un solo `workerd`; sin push hasta cerrar el roadmap y sin publicación.

**Criterios de aceptación:**

- Suite completa, tipos, lint, build y `git diff --check` en verde, con el número de pruebas registrado.
- Las cinco anchuras revisadas sin desbordes ni ventanas fuera del escritorio; el dock visible y usable; catálogo y Clase funcionando.
- Alias y enlace profundo comprobados en navegador; cero excepciones de consola.
- Changelog, roadmap, README y backlog coherentes; commits locales del plan, la implementación y el cierre.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `.space-view` está fijada al viewport y las ventanas usan `window.innerWidth`/`innerHeight`; dentro del workspace se saldrían del contenido. | Ventanas tapando el sidebar o desbordes en móvil. | Convertir la vista en un contenedor flex del workspace y medir su caja con `ResizeObserver`; probar maximizar en 1366, 900 y 390. |
| El sidebar móvil es horizontal y el escritorio necesita altura; un `height:100%` puede colapsar. | Tienda vacía o con altura 0 en 390/620. | Fijar `min-height:0` en la cadena grid/flex, dar altura explícita al contenido y medir el área útil en la revisión. |
| El alias `view=espacio` puede perder `app` al canonizar o conservarlo fuera de Tienda. | Enlaces MCP y favoritos que no abren la app, o `app` residual en Clase. | Probar parse/build y roundtrip con y sin `app`; limpiar `app` en el resto de vistas y en la cabecera. |
| El renombrado de carpeta, tipos y clases toca muchos imports y pruebas. | Ruido, imports rotos o estilos perdidos. | Hacerlo como bloque mecánico después de que la integración funcione; compilar y ejecutar pruebas focalizadas tras el movimiento. |
| Cambia el contrato MCP al añadir `tienda` y modificar enlaces. | Snapshot, matriz o clientes desalineados. | Actualizar catálogo, snapshot, matriz y paridad en el mismo bloque; conservar `vista=espacio` como entrada y elevar solo `MCP_CATALOG_VERSION`. |
| El acceso a Tienda para invitados o alumnado puede revelar acciones de gestión. | Instalación o desinstalación indebida. | Mantener la regla actual: sección visible, catálogo con acciones solo para propietario/administración y pruebas de rol. |
| Dos salidas a Clase dentro de Tienda (dock y sidebar) pueden parecer redundantes. | Ruido visual menor. | Aceptado: el dock cumple el diseño pedido y el sidebar evita dejar sin salida a las otras secciones. |

## 6. Notas de sesión

- Versión del Site: `1.1.30`; sin migraciones ni `release:prepare`. El renombrado no cambia datos.
- El protocolo en vivo de ventanas se conserva: `SpaceRoom`, `space-control`, `/api/space-socket` y las herramientas `listar_ventanas`, `cerrar_app`, `minimizar_app`, `restaurar_app` y `ampliar_app`.
- Aula Store mantiene su versión propia (`AULA_STORE_VERSION`); no se toca por este roadmap.
- Antes de compilar hay que detener los listeners de `5173`/`8791` y los `workerd`; un proceso vivo provoca `EPERM` sobre `dist`.
- Capturas, métricas y scripts de revisión van en `outputs/`, ignorado por git.
