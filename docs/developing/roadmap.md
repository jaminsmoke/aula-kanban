# Roadmap STORE-07 · Física 2D

> **Estado:** Activo · **Origen:** STORE-07 del backlog (2026-11-17)
> **Backlog:** STORE-08 y STORE-10 a STORE-13 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar un laboratorio de Física 2D a Aula Store con gravedad, colisiones, muelles y péndulos manipulables.
- [ ] Criterio de éxito: el alumnado puede abrir la app, elegir un experimento, reproducirlo, pausarlo, reiniciarlo y arrastrar cuerpos sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `matter-js` 0.20.0 y sus tipos, con el aviso MIT.
- Crear `app/board/apps/fisica/` con lienzo, motor, controles y presets.
- Presets de gravedad, colisiones, muelle y péndulo; gravedad ajustable y botón para añadir una pelota.
- Reproducir/pausar, reiniciar y arrastrar cuerpos con ratón o puntero.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.3.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Guardado de escenas o progreso; la primera versión es efímera.
- Rapier, WASM, fluidos, cuerdas complejas o un editor de niveles.
- Servidor, red, assets externos o herramientas MCP específicas.
- Añadir Física a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `matter-js` 0.20.0 | Rapier/WASM o motor propio | Es pequeño, MIT, sin WASM y suficiente para un laboratorio de aula. |
| Lienzo 2D con render propio y `requestAnimationFrame` | `Matter.Render` sin personalización | Permite controlar el tamaño, los colores y el estado de pausa con los tokens del Site. |
| Escena efímera | `app_documents` desde el primer día | El objetivo es experimentar, no editar un nivel; guardar escenas se puede añadir después. |
| Id `fisica`, categoría Educación y subcategoría Herramientas | Categoría nueva de ciencias | Usa la taxonomía cerrada y describe el uso real. |
| `AULA_STORE_VERSION` 1.3.0 | Mantener 1.2.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Motor, lienzo y controles (completada)

- [x] Instalar `matter-js` y `@types/matter-js` con versiones fijas.
- [x] Crear `app/board/apps/fisica/` con el componente, estilos y prueba del modelo de escena.
- [x] Montar el motor, el suelo, las paredes, el render y el arrastre de cuerpos.
- [x] Implementar reproducir/pausar, reiniciar y añadir una pelota.
- **Criterios de aceptación:**
  - La simulación arranca, se pausa y se reinicia sin errores.
  - Se puede arrastrar un cuerpo con el puntero.
  - El lienzo mantiene la proporción y no genera scroll horizontal a 1366, 1024 y 390 px.
  - El modelo de presets y la ventana tienen pruebas en verde.

### Fase 2 — Presets, acabado y portada

- [ ] Implementar los presets de gravedad, colisiones, muelle y péndulo.
- [ ] Añadir control de gravedad, botón de nueva pelota y textos de ayuda.
- [ ] Revisar la interacción táctil, el foco de los controles y la reducción de movimiento.
- [ ] Crear `public/store/fisica.svg` con el formato de las portadas actuales.
- **Criterios de aceptación:**
  - Los cuatro presets son distinguibles y reiniciables.
  - Los controles funcionan con teclado y el lienzo se adapta a móvil.
  - La portada se ve completa en tarjeta 16:9 y ficha 16:7.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `fisica` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.3.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-08 y STORE-10 a STORE-13.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El canvas no tiene contexto 2D en jsdom | Pruebas de UI frágiles | Probar el modelo de escena y los controles por separado; el canvas se verifica en navegador. |
| El puntero no coincide con el canvas escalado | Arrastre impreciso | Ajustar `Mouse.setScale` con el tamaño renderizado y probar a 1366 y 390 px. |
| La simulación consume CPU en segundo plano | Batería y rendimiento | Pausar al cerrar/ocultar la ventana y usar un paso fijo. |
| El estado efímero se percibe como pérdida | El usuario espera guardar la escena | Explicarlo en la interfaz; guardar escenas queda como seguimiento. |
| La app se convierte en un editor de niveles | Retraso del roadmap | Limitar la primera versión a presets y controles básicos. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-17: STORE-07 sale del backlog y pasa a ser el roadmap activo. `matter-js` 0.20.0 es MIT y no necesita red ni servidor.
- 2026-11-17: Fase 1 completada. La app monta el motor, el suelo y las paredes, reproduce/pausa/reinicia, permite arrastrar cuerpos y añadir pelotas, y adapta el lienzo con escala de puntero. Revisada a 1366 y 390 px; modelo de escena y estilos: 9 pruebas correctas.
- La primera versión no guarda escenas: abrir, experimentar y cerrar. Si se añade persistencia, el camino es `app_documents`.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
