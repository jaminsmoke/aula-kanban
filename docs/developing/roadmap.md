# Roadmap STORE-10 · Mapas conceptuales

> **Estado:** Activo · **Origen:** STORE-10 del backlog (2026-11-17)
> **Backlog:** STORE-11 a STORE-13 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Mapas conceptuales a Aula Store con nodos y conexiones editables directamente en el lienzo.
- [ ] Criterio de éxito: el alumnado puede crear, mover, conectar y eliminar nodos, guardar el mapa en el proyecto y recuperarlo después sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `@xyflow/react` 12.12.1 con su licencia MIT y aviso de dependencia.
- Crear `app/board/apps/mapas/` con lienzo, nodos, conectores, zoom, paneo y edición de etiquetas.
- Añadir, mover, conectar y eliminar nodos; seleccionar y editar etiquetas.
- Guardar y cargar el mapa por proyecto con `useAppDocument`; invitados en solo lectura.
- Presets de mapa conceptual y mapa mental, sin imágenes ni recursos externos.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.5.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Colaboración en vivo o cursores compartidos; el guardado es por proyecto y la última escritura gana.
- IA generativa, importación de imágenes, recursos externos o edición de diagramas Mermaid.
- Nueva tabla, endpoint o migración: el estado usa `app_documents`.
- Exportación PDF o PNG en la primera versión; el foco es editar y guardar el mapa.
- Añadir Mapas a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `@xyflow/react` 12.12.1 | Un lienzo propio o Konva | Ya resuelve nodos, conexiones, zoom, paneo y accesibilidad con una licencia MIT. |
| Estado JSON validado en `app_documents` | Nueva tabla o endpoint por app | Es el modelo común de persistencia por proyecto y no necesita servidor propio. |
| Guardado explícito con «Guardar» y «Cargar» | Autoguardado en cada arrastre | Evita escrituras constantes y deja claro cuándo se comparte el mapa. |
| Presets de mapa conceptual y mapa mental | Editor vacío desde el primer día | Da una estructura inicial útil y hace visible la diferencia entre ambos tipos. |
| Invitados en solo lectura | Edición para todos los roles | Respeta el patrón de las apps con documento compartido. |
| Id `mapas`, categorías Educación y Productividad, subcategoría Diagramas | Categoría nueva de mapas | Usa la taxonomía cerrada y comparte galería con Diagramas. |
| `AULA_STORE_VERSION` 1.5.0 | Mantener 1.4.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Lienzo y edición de nodos

- [x] Instalar `@xyflow/react` 12.12.1 y fijar la versión.
- [x] Crear `app/board/apps/mapas/` con componente, estilos y modelo de mapa.
- [x] Montar el lienzo con nodos, conectores, zoom y paneo.
- [x] Implementar añadir, mover, conectar, seleccionar, editar etiquetas y eliminar.
- **Criterios de aceptación:**
  - Se pueden crear y mover nodos y conectar dos nodos existentes.
  - Se pueden editar etiquetas y eliminar nodos o conexiones.
  - El lienzo se adapta a 1366, 1024 y 390 px sin scroll horizontal.
  - El modelo de mapa y la ventana tienen pruebas en verde.

### Fase 2 — Persistencia, presets, acabado y portada

- [ ] Integrar `useAppDocument(projectId, "mapas")` con guardar, cargar y estados de error.
- [ ] Añadir presets de mapa conceptual y mapa mental.
- [ ] Revisar la interacción táctil, el foco de los controles, el teclado y la reducción de movimiento.
- [ ] Crear `public/store/mapas.svg` con el formato de las portadas actuales.
- [ ] Medir el chunk y confirmar que React Flow y su CSS se sirven desde el Site.
- **Criterios de aceptación:**
  - Guardar y recuperar un mapa conserva nodos, conexiones, posiciones y etiquetas.
  - Los invitados ven el mapa y no pueden editarlo ni guardarlo.
  - Los presets son distinguibles, reiniciables y no dependen de red.
  - La app se usa con teclado y se adapta a móvil; la portada se ve en tarjeta y ficha.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `mapas` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.5.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-11 a STORE-13.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| React Flow añade CSS y un chunk mayor | Peso del arranque | Cargar la app en diferido, medir el chunk y encapsular sus estilos en la ventana. |
| El JSON guardado cambia entre versiones | Mapas ilegibles o corruptos | Validar y normalizar con un modelo puro; conservar un documento mínimo y probar la serialización. |
| El guardado explícito se olvida | Pérdida de cambios al cerrar | Mostrar estado sucio, avisar al cargar otro preset y ofrecer «Guardar» antes de salir. |
| El arrastre táctil choca con el scroll | Mala experiencia en tablet | Probar 390 px, usar `touch-action` y los controles de React Flow. |
| Los invitados intentan editar | 403 o cambios perdidos | Deshabilitar controles en la ventana y mantener la autorización del servidor. |
| La app se convierte en un editor de mapas enorme | Retraso del roadmap | Limitar a nodos, conexiones, etiquetas, presets y persistencia. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-17: STORE-10 sale del backlog y pasa a ser el roadmap activo. `@xyflow/react` 12.12.1 es MIT y el estado cabe en `app_documents`.
- 2026-11-17: fase 1 completada. Lienzo React Flow con mapa de ejemplo, nodos arrastrables, conexiones desde los handles, selección, edición de etiqueta, eliminación y reinicio; zoom, paneo, controles y minimapa. Verificado en navegador a 1366, 1024 y 390 px sin scroll horizontal; modelo y ventana con 9 pruebas focalizadas en verde.
- La primera versión no tiene colaboración en vivo ni IA generativa: se edita un mapa por proyecto y se guarda explícitamente.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
