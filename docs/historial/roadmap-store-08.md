# Roadmap STORE-08 · Geometría interactiva

> **Estado:** Completado · **Origen:** STORE-08 del backlog (2026-11-17)
> **Backlog:** STORE-10 a STORE-13 pendientes · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Geometría interactiva a Aula Store con construcciones manipulables, medidas y representación de funciones.
- [ ] Criterio de éxito: el alumnado puede crear puntos, segmentos, rectas y circunferencias, arrastrarlos, medir y reiniciar la construcción sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `jsxgraph` 1.14.3 usando la opción **MIT** de su licencia dual, con aviso de licencia.
- Crear `app/board/apps/geometria/` con lienzo, barra de herramientas y estilos.
- Puntos, segmentos, rectas, circunferencias, etiquetas y medidas; selección y arrastre.
- Presets de construcción y representación de funciones.
- Reinicio, ayuda contextual y adaptación a 1366, 1024 y 390 px.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.4.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Guardado de construcciones en la primera versión; si se añade después, usará `app_documents`.
- La opción LGPL de JSXGraph, CDN, red o assets externos.
- Un editor de geometría simbólica, cálculo automático de demostraciones o herramientas MCP específicas.
- Añadir Geometría a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `jsxgraph` 1.14.3 con licencia MIT | LGPL-3.0 o un motor propio | Es la opción que ya permite construcciones y funciones sin obligaciones de copyleft. |
| Estado efímero en la primera versión | `app_documents` desde el primer día | Reduce el alcance; guardar construcciones exige definir y validar su serialización. |
| Lienzo JSXGraph con controles propios | Editor de geometría desde cero | Aprovecha una librería madura y centra el trabajo en la experiencia de aula. |
| Id `geometria`, categoría Educación y subcategoría Herramientas | Categoría nueva de matemáticas | Usa la taxonomía cerrada y describe el uso real. |
| `AULA_STORE_VERSION` 1.4.0 | Mantener 1.3.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Lienzo y construcciones

- [x] Instalar `jsxgraph` y fijar la versión, conservando el aviso MIT.
- [x] Crear `app/board/apps/geometria/` con el componente, estilos y prueba del modelo de construcción.
- [x] Montar el lienzo, la barra de herramientas y el arrastre de puntos.
- [x] Implementar puntos, segmentos, rectas, circunferencias, etiquetas y medidas.
- **Criterios de aceptación:**
  - Se pueden crear y mover las construcciones básicas.
  - Las etiquetas y medidas se actualizan al arrastrar.
  - El lienzo mantiene la proporción y no genera scroll horizontal a 1366, 1024 y 390 px.
  - El modelo de construcción y la ventana tienen pruebas en verde.

### Fase 2 — Presets, funciones, acabado y portada

- [x] Añadir presets de construcción y representación de funciones.
- [x] Revisar la interacción táctil, el foco de los controles y la reducción de movimiento.
- [x] Crear `public/store/geometria.svg` con el formato de las portadas actuales.
- [x] Medir el chunk y confirmar que JSXGraph y su CSS se sirven desde el Site.
- **Criterios de aceptación:**
  - Los presets son distinguibles y reiniciables.
  - Las funciones se representan y se pueden ocultar o reiniciar.
  - La app se usa con teclado y se adapta a móvil.
  - La portada se ve completa en tarjeta 16:9 y ficha 16:7.

### Fase 3 — Integración, documentación y cierre

- [x] Añadir `geometria` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [x] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [x] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.4.0`.
- [x] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [x] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-10 a STORE-13.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| JSXGraph pesa ~400 KB y añade CSS propio | Chunk grande o estilos en conflicto | Medir el chunk, cargar la app en diferido y encapsular sus estilos en la ventana. |
| La licencia dual se interpreta mal | Riesgo legal | Usar explícitamente la opción MIT y conservar el aviso en `THIRD-PARTY-NOTICES.md`. |
| El arrastre no funciona en táctil | Mala experiencia en tablet | Probar 390 px y usar los controles táctiles de JSXGraph. |
| La serialización de construcciones se complica | Se aplaza el guardado | Mantener la primera versión efímera; `app_documents` queda como seguimiento. |
| La app se convierte en un editor geométrico enorme | Retraso del roadmap | Limitar a construcciones básicas, medidas y funciones. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-17: STORE-08 sale del backlog y pasa a ser el roadmap activo. `jsxgraph` 1.14.3 tiene licencia dual MIT/LGPL-3.0; se usará la opción MIT.
- 2026-11-17: fase 1 completada. El CSS de JSXGraph se copia a `public/jsxgraph/jsxgraph.css` porque sus `exports` no exponen el archivo; la app lo carga con un `<link>`. El modo Punto usa `board.getUsrCoordsOfMouse` para colocar el punto donde se hace clic. Verificado en navegador a 1366, 1024 y 390 px; pruebas focalizadas en verde (6).
- 2026-11-17: fase 2 completada. Presets Libre, Triángulo, Circunferencia y Rectas; funciones Parábola, Seno y Recta con visibilidad independiente. Portada `public/store/geometria.svg` creada. El chunk de comprobación de la app mide 1.029,1 KB sin comprimir y 255,9 KB gzip; `jsxgraph.css` (4,71 KB) y la portada (4,11 KB) se copian a `dist/client`. Verificado a 1366, 1024 y 390 px sin scroll horizontal, con foco visible, `touch-action` y reducción de movimiento.
- 2026-11-17: fase 3 completada. Geometría interactiva se registró en el catálogo, «Mejores aplicaciones», el registro lazy, la ayuda y la matriz MCP; `AULA_STORE_VERSION` subió a `1.4.0`. Tienda y ficha revisadas a 1366, 1024 y 390 px; la demo es de solo lectura y no permite instalar, así que la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo. Suite completa 168 archivos / 1.208 pruebas, `tsc`, ESLint, build y `perf:budget` correctos; chunk final `geometria-app` 1.028,6 KB / 255,7 KB gzip.
- El build avisa de un `eval` directo dentro del parser JessieCode de JSXGraph. La app no evalúa código introducido por el usuario; el aviso queda como riesgo de la dependencia, no como ejecución de la escena.
- La primera versión no guarda construcciones: abrir, manipular y cerrar. Si se añade persistencia, el camino es `app_documents`.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
