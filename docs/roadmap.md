# Roadmap UI-08 · Tienda en Administración y Clase en la cabecera

> **Estado:** Activo · Fase 1 completada (2026-11-15)
> **Origen:** entrada del backlog del 2026-11-15, segunda parte del replanteo de navegación.
> **Cierre:** al completar las tres fases, el resumen pasa arriba de `docs/changelog.md`, este documento se reinicia desde la plantilla y se hace el push único del roadmap. Sin publicación en Sites.

---

## 1. Objetivo

Llevar el escritorio de aplicaciones a **Administración > Tienda**, retirar **Mi espacio** de la cabecera y devolver **Clase** a la cabecera como botón de icono, sin romper enlaces antiguos ni el control de ventanas por MCP.

- [ ] Criterio de éxito: la cabecera navega a Administración y a Clase mediante un icono; Tienda es una sección más del sidebar, con URL canónica y alias antigua.
- [ ] Criterio de éxito: las apps instaladas, Aula Store, las ventanas redimensionables, el enlace profundo `app=<appId>` y el canal en vivo siguen funcionando dentro del workspace, en 1366, 1024, 900, 620 y 390.
- [ ] Criterio de éxito: pruebas, tipos, lint y build en verde; sin migraciones, sin cambio de versión y sin publicación.

## 2. Alcance

**Dentro:**

- Sección `tienda` en el sidebar de Administración, después de Alumnos y Profesores, con el escritorio de apps como contenido.
- Aula Store se queda como catálogo del dock: se abre encima del escritorio y se cierra con «Escritorio».
- Retirada de «Mi espacio» de `nav.main-nav` y de su botón `space-action`.
- Clase vuelve a `nav.main-nav` como botón de icono con estado activo, en el lugar que ocupaba Mi espacio.
- Sin salida a Clase en el sidebar de Administración ni en el dock; el dock solo contiene Aula Store y las ventanas minimizadas.
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
| Clase vuelve a la cabecera como botón de icono con estado activo, en el lugar que ocupaba Mi espacio. | Dejar Clase en el dock o una salida lateral en Administración. | Es accesible desde todas las vistas, como antes, y evita duplicar salidas dentro del workspace. |
| El workspace de Administración no incluye salida a Clase; Alumnos, Profesores y Tienda comparten el botón de la cabecera. | Salida lateral solo en algunas secciones. | Una única salida global evita callejones y no depende de la sección activa. |
| Tienda la ve cualquier miembro con proyecto activo, igual que Mi espacio; instalar y desinstalar sigue limitado a propietario/administración. | Reservar la sección a propietario/administración. | No cambia el acceso actual a las apps ni amplía permisos de gestión. |
| Componente `StoreDesktop` para el escritorio y `AppsStore` para el catálogo; carpeta `app/board/store/` con el catálogo en `catalog/`. | Llamar `StoreView` a ambos o mantener `SpaceView`. | Elimina la ambigüedad entre la vista y el catálogo antes del renombrado. |

## 4. Fases

### Fase 1 — Integración en Administración y URLs

- [x] Añadir `tienda` a `AdministracionSection` y `ADMINISTRACION_SECTIONS`, con la sección en `AdministrationView` y carga diferida del escritorio.
- [x] Pasar rol, proyecto y salida a Clase a la sección Tienda; mantener el catálogo lazy y el refresco de apps cada 10 s.
- [x] Quitar `.space-topbar` y el botón de vuelta del escritorio; hacer que `.store-view` llene el contenido del workspace en vez de ser un `position:fixed` de viewport.
- [x] Medir el contenedor del escritorio para abrir, maximizar, arrastrar y redimensionar ventanas dentro del contenido, también al cambiar el tamaño y en móvil.
- [x] Dejar Aula Store y las ventanas minimizadas en el dock, sin una acción de Clase; conservar el canal en vivo.
- [x] Retirar «Mi espacio» y el antiguo botón de texto de Clase; dejar Administración y el nuevo botón de icono de Clase (`Columns3`) con estado activo.
- [x] Retirar la salida lateral de Clase del workspace; `WorkspaceLayout` solo gestiona secciones.
- [x] Canonizar `view=espacio` a `view=administracion&section=tienda` en `parseBoardUrl`/`buildBoardUrl`, conservar `app` solo en Tienda y actualizar `use-board-url`, `page`, cabecera y enlaces MCP de contexto.
- [x] Actualizar pruebas de URL, cabecera, Administración y escritorio; añadir la comprobación del alias y del enlace profundo.

**Criterios de aceptación:**

- El sidebar muestra Alumnos, Profesores y Tienda; Tienda abre el escritorio con las apps instaladas y Aula Store se abre y cierra sin salir de la sección.
- La cabecera contiene Administración y el botón de icono de Clase, sin Mi espacio; el selector de proyecto conserva su sitio.
- Clase desde el icono de la cabecera vuelve a `view=clase` (Tareas); Alumnos y Profesores no tienen una salida lateral duplicada.
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
- [ ] Revisar la build servida en 1366×900, 1024×768, 900×700, 620×800 y 390×844: sidebar, Tienda, dock, catálogo, ventana abierta y maximizada, alias y botón de Clase en la cabecera.
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
| El botón de icono de Clase compite con Administración por el ancho en móvil. | La navegación puede apretarse a 390. | Mantener el icono compacto de 40 px y revisar la cabecera en 620 y 390. |

## 6. Notas de sesión

- Revisión de diseño posterior: Clase no va al dock ni al sidebar; vuelve a la cabecera como botón de icono, en el lugar de Mi espacio. El dock queda solo con Aula Store y las ventanas minimizadas.
- Fase 1 verificada en la build servida: Tienda ocupa el contenido en 1366, 1024, 900, 620 y 390, sin desbordes; el alias `view=espacio&app=excalidraw` se canoniza y abre la ventana; Clase vuelve a Tareas desde la cabecera.
- El título del sidebar se oculta solo en Administración y por debajo de 430 px para que Alumnos, Profesores y Tienda quepan sin una salida lateral.
- `app/page.tsx` conserva `app` al construir el estado inicial; sin eso, la canonización del alias perdía el enlace profundo antes de hidratar.
- Versión del Site: `1.1.30`; sin migraciones ni `release:prepare`. El renombrado no cambia datos.
- El protocolo en vivo de ventanas se conserva: `SpaceRoom`, `space-control`, `/api/space-socket` y las herramientas `listar_ventanas`, `cerrar_app`, `minimizar_app`, `restaurar_app` y `ampliar_app`.
- Aula Store mantiene su versión propia (`AULA_STORE_VERSION`); no se toca por este roadmap.
- Antes de compilar hay que detener los listeners de `5173`/`8791` y los `workerd`; un proceso vivo provoca `EPERM` sobre `dist`.
- Capturas, métricas y scripts de revisión van en `outputs/`, ignorado por git.
