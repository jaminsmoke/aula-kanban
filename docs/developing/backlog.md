# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 3 entradas: STORE-06, STORE-07 y STORE-08 pendientes

---

## 2026-11-16 — STORE-06 · Ajedrez

- Contexto: es la candidata más barata del catálogo. `chess.js` 1.4.0 (BSD-2) resuelve las reglas y `react-chessboard` 5.12.1 (MIT) aporta el tablero; juntos ocupan unos 70 KB y no necesitan servidor ni red. Cubre lógica, estrategia y torneos de clase.
- Alcance:
  1. Crear `app/board/apps/ajedrez/` con tablero, piezas, movimientos legales, jaque, jaque mate, tablas, reinicio e historial de jugadas.
  2. Ofrecer dos jugadores en el mismo navegador y un rival aleatorio sencillo; no hace falta motor de ajedrez.
  3. Diseño responsive y accesible: coordenadas, turno visible, selección de casilla y alternativa por teclado.
- Antes de retomarlo:
  - [ ] Decidir si la primera versión incluye rival aleatorio o solo dos jugadores.
  - [ ] Definir si hace falta guardar la partida; si sí, usar `app_documents`.
- Criterios: las reglas se aplican completas, no hay red ni servidor, funciona a 1366, 1024 y 390 px y las licencias BSD-2/MIT quedan en `THIRD-PARTY-NOTICES.md`.
- Notas: no añadir Stockfish ni WASM en la primera versión. `chess.js` y `react-chessboard` se cargan solo al abrir la ventana; la portada y la ficha siguen el formato SVG actual.

## 2026-11-16 — STORE-07 · Física 2D

- Contexto: `matter-js` 0.20.0 (MIT, ~90 KB gzip) permite construir un laboratorio STEM manipulable sin servidor: gravedad, colisiones, muelles y péndulos. Es el primer paso natural para experimentar con física dentro de la Tienda.
- Alcance:
  1. Crear `app/board/apps/fisica/` con un lienzo propio, controles de reproducir/pausar/reiniciar y cuerpos arrastrables.
  2. Incluir presets de gravedad, colisiones, muelle y péndulo, con parámetros básicos visibles.
  3. Adaptar el lienzo y los controles a 1366, 1024 y 390 px; sin assets externos.
- Antes de retomarlo:
  - [ ] Definir si el estado se guarda o si la app es efímera.
  - [ ] Acordar la superficie de controles para que no parezca un editor técnico.
- Criterios: simulación estable y reiniciable, controles claros, sin red, sin servidor y sin dependencia de Rapier/WASM; pruebas de la ventana y de la ficha.
- Notas: usar `requestAnimationFrame` y el motor de Matter.js; no cargar `@dimforge/rapier2d` en esta fase. Si más adelante se guarda una escena, hacerlo como documento JSON con `app_documents`.

## 2026-11-16 — STORE-08 · Geometría interactiva

- Contexto: `jsxgraph` 1.14.3 tiene licencia dual MIT/LGPL-3.0 y permite construcciones, funciones y lugares geométricos con arrastre. Usando la opción MIT encaja con la política de licencias y complementa la calculadora y la tabla periódica.
- Alcance:
  1. Crear `app/board/apps/geometria/` con puntos, segmentos, rectas, circunferencias, etiquetas y medidas.
  2. Añadir presets de construcción y representación de funciones; permitir arrastrar y reiniciar.
  3. Revisar el tamaño del chunk y el CSS de JSXGraph, sirviendo todos los assets desde el Site.
- Antes de retomarlo:
  - [ ] Confirmar la opción MIT y conservar el aviso de licencia.
  - [ ] Decidir si las construcciones se guardan o si la primera versión es efímera.
- Criterios: construcciones manipulables y reiniciables, sin CDN ni red, con aviso MIT; funciona a 1366, 1024 y 390 px y pasa pruebas, tipos, lint y build.
- Notas: no usar la opción LGPL. JSXGraph es más grande que Matter.js (~400 KB): medir el chunk antes de integrarlo y valorar si conviene dividir la app en una carga aún más específica.
