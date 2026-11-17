# Roadmap STORE-11 · Presentaciones

> **Estado:** Activo · **Origen:** STORE-11 del backlog (2026-11-17)
> **Backlog:** STORE-12 y STORE-13 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Presentaciones a Aula Store con editor Markdown, vista previa y modo presentación.
- [ ] Criterio de éxito: el alumnado puede escribir diapositivas, navegar por ellas y guardar el contenido en el proyecto sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `reveal.js` 6.0.2 con su licencia MIT y aviso de dependencia.
- Crear `app/board/apps/presentaciones/` con editor, parser de diapositivas, vista previa y modo presentación.
- Separar diapositivas con `---`; admitir texto, títulos, listas, énfasis y enlaces Markdown sin HTML crudo.
- Guardar y cargar el documento por proyecto con `useAppDocument`; invitados en solo lectura.
- Plantillas iniciales, navegación con teclado y exportación HTML local.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.6.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Importar PPTX, Google Slides, PDF o imágenes externas.
- Exportación PDF; solo se plantea HTML estático en la primera versión.
- Colaboración en vivo, IA generativa, CDN, fuentes externas o HTML incrustado.
- Nueva tabla, endpoint o migración: el estado usa `app_documents`.
- Añadir Presentaciones a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `reveal.js` 6.0.2 | Editor de diapositivas propio | Resuelve navegación, transiciones y modo presentación con licencia MIT. |
| Markdown limitado con separador `---` | HTML o PPTX | Es legible, seguro y cabe en un documento JSON pequeño. |
| Sin HTML crudo en el Markdown | Renderizar HTML del usuario | Evita inyectar scripts en la ventana de la app. |
| Editor y presentación como dos vistas | Reveal dentro del editor en todo momento | Mantiene la edición cómoda y evita reinicializar el motor en cada cambio. |
| HTML estático como exportación | PDF o servicio de impresión | No necesita servicios externos ni binarios; PDF queda para otra fase. |
| Estado en `app_documents` | Tabla o endpoint por app | Usa la persistencia común por proyecto. |
| Id `presentaciones`, categorías Educación y Productividad, subcategoría Herramientas | Categoría nueva de documentos | Respeta la taxonomía cerrada. |
| `AULA_STORE_VERSION` 1.6.0 | Mantener 1.5.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Editor, parser y vista previa

- [x] Instalar `reveal.js` 6.0.2 y fijar la versión.
- [x] Crear `app/board/apps/presentaciones/` con modelo, parser de Markdown y estilos.
- [x] Montar el editor, el separador de diapositivas y la vista previa.
- [x] Añadir el modo presentación con navegación por teclado y reinicio.
- **Criterios de aceptación:**
  - Se escriben varias diapositivas y la vista previa coincide con el editor.
  - El modo presentación avanza y retrocede con teclado.
  - No se ejecuta HTML crudo del Markdown.
  - El layout se adapta a 1366, 1024 y 390 px sin scroll horizontal.
  - El modelo y la ventana tienen pruebas en verde.

### Fase 2 — Persistencia, plantillas, acabado y portada

- [x] Integrar `useAppDocument(projectId, "presentaciones")` con guardar, cargar y estados de error.
- [x] Añadir plantillas iniciales y exportación HTML local.
- [x] Revisar la interacción táctil, el foco, el teclado y la reducción de movimiento.
- [x] Crear `public/store/presentaciones.svg` con el formato de las portadas actuales.
- [x] Medir el chunk y confirmar que reveal.js y su CSS se sirven desde el Site.
- **Criterios de aceptación:**
  - Guardar y recuperar conserva el Markdown y las diapositivas.
  - Los invitados ven el documento y no pueden editarlo ni guardarlo.
  - Las plantillas son distinguibles y reiniciables.
  - La exportación HTML se descarga sin red y abre las diapositivas.
  - La app se adapta a móvil y la portada se ve en tarjeta y ficha.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `presentaciones` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.6.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-12 y STORE-13.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reveal.js necesita CSS y un DOM con tamaño | Vista previa vacía o rota | Medir el contenedor antes de inicializar, cargar CSS local y probar escritorio y móvil. |
| El Markdown permite HTML crudo | XSS en la ventana | Escapar o rechazar HTML antes de renderizar; probar etiquetas y enlaces peligrosos. |
| El modo presentación entra en pantalla completa | Bloqueo del navegador | Mantenerlo como mejora progresiva y ofrecer modo dentro de la ventana. |
| El autoguardado escribe en cada tecla | Coste y conflictos | Guardado explícito con estado sucio, igual que en Mapas. |
| La exportación HTML duplica el render | HTML distinto de la vista | Generar desde el mismo parser y probar que abre sin red. |
| La app crece hacia un editor de diapositivas enorme | Retraso del roadmap | Limitar a Markdown, plantillas, navegación y persistencia. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-17: STORE-11 sale del backlog y pasa a ser el roadmap activo. `reveal.js` 6.0.2 es MIT y el estado cabe en `app_documents`.
- 2026-11-17: fase 1 completada. Editor Markdown con separador `---`, parser seguro sin HTML crudo, vista previa de todas las diapositivas, modo presentación con reveal.js y navegación por teclado. Verificado en navegador a 1366, 1024 y 390 px sin scroll horizontal; modelo y ventana con 10 pruebas focalizadas en verde.
- 2026-11-17: fase 2 completada. Guardado y carga con `useAppDocument(projectId, "presentaciones")`, serialización validada, aviso de cambios sin guardar y modo lectura para invitados. Plantillas Clase, Proyecto y En blanco; exportación HTML autónoma; portada `public/store/presentaciones.svg`; foco, teclado, táctil y reducción de movimiento revisados. Chunk de comprobación 128,6 KB / 34,6 KB gzip; CSS 61,2 KB / 12,6 KB gzip con reveal.js servido desde `dist/client`. Pruebas focalizadas: 16 en verde.
- La primera versión no importa PPTX ni genera PDF; el Markdown limitado evita HTML crudo.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
