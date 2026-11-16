# Roadmap STORE-06 · Ajedrez

> **Estado:** Activo · **Origen:** STORE-06 del backlog (2026-11-16)
> **Backlog:** STORE-07 y STORE-08 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Ajedrez a Aula Store como app nativa de cliente, con tablero, reglas completas, dos jugadores locales y un rival aleatorio.
- [ ] Criterio de éxito: la app se instala y abre desde la Tienda, aplica todas las reglas, funciona sin red ni servidor y se usa a 1366, 1024 y 390 px.

## 2. Alcance

**Dentro:**

- Instalar `chess.js` 1.4.0 y `react-chessboard` 5.12.1, con sus avisos de licencia.
- Crear `app/board/apps/ajedrez/` con tablero, piezas, movimientos legales, jaque, jaque mate, tablas, turno, historial y reinicio.
- Dos jugadores en el mismo navegador y un rival aleatorio que solo elige movimientos legales.
- Portada SVG de 1200×675 y ficha en el catálogo.
- Registro en `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `APP_MCP_DECLARACIONES`.
- Actualizar ayuda, matriz de herramientas, cobertura MCP, pruebas, snapshots y documentación.
- Subir `AULA_STORE_VERSION` a `1.1.0` por la nueva app; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Motor de ajedrez, Stockfish, WASM o análisis de posiciones.
- Multijugador online, cuentas, salas o sincronización en vivo.
- Guardado de partidas en la primera versión; si se añade después, usará `app_documents`.
- Añadir Ajedrez al seed de la demo: la demo conserva sus cinco apps actuales.
- Cambiar la versión del Site, publicar en Sites o abrir herramientas MCP específicas de ajedrez.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `chess.js` para reglas y `react-chessboard` para el tablero | Tablero y validación propios | Reduce el riesgo de reglas incompletas y mantiene el chunk pequeño (~70 KB). |
| Dos jugadores locales y rival aleatorio | Motor de ajedrez o Stockfish | La primera versión no necesita fuerza de juego ni WASM; el rival aleatorio solo usa movimientos legales. |
| Sin persistencia inicial | `app_documents` desde el primer día | Evita abrir un modelo de partidas guardadas antes de validar la app; se puede añadir después sin migración. |
| Id `ajedrez`, categorías Educación y Productividad, subcategoría Herramientas | Una categoría nueva solo para juegos | Usa la taxonomía cerrada y refleja su valor lógico y de aula. |
| Incluir en «Mejores aplicaciones» | Dejarla solo en su categoría | Es una app nueva y visible; la galería destacada debe mostrarla. |
| `AULA_STORE_VERSION` 1.1.0 | Mantener 1.0.0 | Añadir una app es una capacidad nueva de la Tienda; el Site mantiene su versión. |

## 4. Fases

### Fase 1 — Tablero y reglas (completada)

- [x] Instalar `chess.js` y `react-chessboard` en `package.json` y actualizar el lockfile.
- [x] Crear `app/board/apps/ajedrez/` con el componente, estilos y prueba de la ventana.
- [x] Implementar tablero, piezas, selección de casilla, movimientos legales, turno, jaque, jaque mate, tablas, reinicio e historial.
- [x] Cubrir dos jugadores en el mismo navegador.
- **Criterios de aceptación:**
  - Las reglas se aplican completas y no se permite un movimiento ilegal.
  - El estado de la partida (turno, jaque, jaque mate o tablas) es visible.
  - La app funciona sin red y sin estado de servidor.
  - Pasa las pruebas de la app y se revisa a 1366, 1024 y 390 px.

### Fase 2 — Rival, acabado y portada (completada)

- [x] Añadir un rival aleatorio que elija únicamente entre movimientos legales.
- [x] Completar la accesibilidad: coordenadas, turno, selección, alternativa por teclado y foco visible.
- [x] Crear `public/store/ajedrez.svg` con el formato de las portadas actuales y área segura para el icono de la tarjeta.
- [x] Revisar el tablero en ventana pequeña y en móvil, sin piezas cortadas ni scroll horizontal.
- **Criterios de aceptación:**
  - El rival no puede hacer movimientos ilegales ni bloquear la partida.
  - La partida se puede jugar con teclado y con puntero.
  - La portada se ve completa en tarjeta 16:9 y ficha 16:7.
  - La app mantiene el formato visual de Aula Store.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `ajedrez` a `NATIVE_APP_IDS` y su ficha a `NATIVE_APPS` (nombre, tagline, descripción, categorías, subcategoría, portada, características, `appVersion` 1.0.0, upstream y ventana).
- [ ] Registrar icono y componente lazy en `app/board/apps/registry.tsx` y añadir el id a `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir Ajedrez a la ayuda (`app/board/docs/content/workspace.ts`) y actualizar la cobertura documental.
- [ ] Subir `AULA_STORE_VERSION` a `1.1.0`, actualizar snapshots y ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-07 y STORE-08.
- **Criterios de aceptación:**
  - Ajedrez aparece en la Tienda, se instala y abre como las demás apps.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP nombran la app y explican que no tiene herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto de rendimiento en verde.
  - Sin cambios de datos, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `react-chessboard` cambia de API o no encaja con React 19 | Retrabajo en la UI | Fijar la versión 5.12.1, revisar sus tipos y encapsular el tablero en un componente propio. |
| El tablero no cabe en móvil | Mala experiencia y piezas cortadas | Probar 390 px desde la fase 1 y usar un tablero cuadrado con controles fuera del área de juego. |
| La accesibilidad depende solo de arrastrar | La app no es usable con teclado | Añadir selección por teclado y estados de foco desde la fase 2. |
| El rival aleatorio elige movimientos ilegales | Partida bloqueada | Obtener siempre los movimientos de `chess.js` y probar el flujo completo. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar `APP_MCP_DECLARACIONES`, snapshots y pruebas de cobertura en la misma fase. |
| Se amplía el alcance a motor, online o demo | Retraso y más superficie | Mantener fuera de alcance; cualquier necesidad se anota como entrada nueva. |

## 6. Notas de sesión

- 2026-11-16: STORE-06 sale del backlog y pasa a ser el roadmap activo. `chess.js` 1.4.0 es BSD-2 y `react-chessboard` 5.12.1 es MIT; este último declara peer dependencies de React 19, que coincide con el proyecto.
- La app no necesita persistencia en la primera versión. Si se añade guardado, el camino es `app_documents`, no una tabla nueva.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales. Añadir Ajedrez a la demo sería una tarea aparte.
- 2026-11-16: Fase 1 completada. La app tiene tablero, reglas completas, jaque, mate, tablas, historial, reinicio, coronación con elección de pieza y dos jugadores locales. Se revisó a 1366, 1024 y 390 px con un contenedor de ventana; el tablero usa colores propios claros para mantener el contraste de las piezas en ambos temas. Pruebas de la app y del modelo: 8 correctas; suite completa: 162 archivos / 1.181 pruebas.
- 2026-11-16: Fase 2 completada. El rival aleatorio elige entre los movimientos legales de `chess.js`, con una pausa breve y estado «El rival está pensando…». Se añadió el formulario «Mover con teclado», foco visible y una portada SVG ámbar con área segura para el icono de la tarjeta. Revisada a 1366, 1024 y 390 px y en tarjeta 16:9/ficha 16:7. Pruebas de la app y del modelo: 10 correctas; suite completa: 162 archivos / 1.183 pruebas.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
