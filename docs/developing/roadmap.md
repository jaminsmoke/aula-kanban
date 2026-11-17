# Roadmap STORE-15 · Notas y documentos

> **Estado:** Activo · **Origen:** STORE-15 del backlog (2026-11-17)
> **Backlog:** DEV-01 y STORE-16 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Notas y documentos a Aula Store con edición de texto enriquecido y guardado por proyecto.
- [ ] Criterio de éxito: el alumnado escribe una nota con títulos, listas, enlaces y formato, la guarda en el proyecto, la recupera y puede exportarla como HTML sin red.

## 2. Alcance

**Dentro:**

- Instalar `@tiptap/core` 3.34.0 y sus extensiones MIT (`react`, `pm`, `starter-kit` y `link`).
- Crear `app/board/apps/documentos/` con modelo, editor, barra de formato y estilos.
- Título editable, párrafos, títulos H1–H3, negrita, cursiva, listas, citas, código en línea y bloques de código.
- Enlaces con protocolos permitidos, deshacer/rehacer y atajos de teclado.
- Guardar y cargar un documento JSON validado por proyecto en `app_documents`; invitados en solo lectura.
- Exportación HTML local con estilos incluidos, sin red, imágenes ni recursos externos.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.10.0`; el Site sigue en `1.1.35`.

**Fuera de alcance:**

- Imágenes, adjuntos, archivos subidos, incrustaciones, HTML crudo, iframes o scripts.
- Tablas en la primera versión: las extensiones son MIT, pero añaden UI, validación y sanitización; se reevalúan al fusionar con Presentaciones.
- Varios documentos por proyecto: v1 guarda un documento por proyecto.
- Colaboración en vivo, comentarios, historial de versiones o edición desde el servidor.
- Importar o exportar `.docx`, PDF u otros formatos binarios.
- Nueva tabla, endpoint o migración: el estado usa `app_documents`.
- Añadir la app a la demo, cambiar la versión del Site o publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `@tiptap/core` 3.34.0 y extensiones MIT | Un editor `contenteditable` propio o un editor con licencia comercial | Ofrece un modelo JSON validable, extensiones pequeñas y control del HTML generado. |
| Un documento por proyecto | Varios documentos con selector desde la primera versión | Reduce el alcance y usa el mismo patrón de persistencia que las demás apps. |
| JSON de Tiptap como fuente de verdad | Guardar HTML | Evita depender de HTML almacenado y permite validar nodos, marcas y atributos. |
| Guardado explícito con indicador de cambios | Autoguardado en cada pulsación | Evita escrituras constantes y deja claro cuándo se ha guardado. |
| Exportación HTML generada desde el JSON validado | Guardar y servir el HTML del editor | Permite un archivo autónomo y controlar los enlaces y recursos incluidos. |
| Sin HTML crudo ni imágenes | Pegar HTML arbitrario o admitir recursos externos | Reduce el riesgo de XSS y mantiene el documento pequeño y offline. |
| Sin tablas en v1 | Incluir tablas desde el inicio | Mantiene pequeña la primera integración y deja la tabla para una fase posterior. |
| Id `documentos`, categorías Oficina y Productividad, subcategoría Herramientas | Categoría nueva de documentos | Respeta la taxonomía cerrada de la Tienda. |
| Ventana de 1200×720 | Ventana más estrecha | Da espacio al editor, la barra de formato y el panel de ayuda. |
| `AULA_STORE_VERSION` 1.10.0 | Mantener 1.9.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Editor y formato

- [x] Instalar y fijar `@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` y `@tiptap/extension-link` 3.34.0.
- [x] Crear `app/board/apps/documentos/` con modelo, editor, barra de formato y estilos.
- [x] Añadir título editable, párrafos, H1–H3, negrita, cursiva, listas, citas, código y enlaces.
- [x] Incorporar deshacer/rehacer, atajos de teclado y estados activos de la barra.
- [x] Revisar el layout a 1366, 1024 y 390 px, con toolbar adaptable y sin scroll horizontal de página.
- **Criterios de aceptación:**
  - Se crea y edita una nota con varios bloques y marcas.
  - Los atajos y los botones aplican el formato correcto.
  - El contenido no pierde formato al cambiar de selección.
  - El editor se adapta a las tres anchuras acordadas.
  - Modelo y editor tienen pruebas en verde.

### Fase 2 — Persistencia, exportación, accesibilidad y portada

- [x] Integrar `useAppDocument(projectId, "documentos")` con guardar, cargar y estados de error.
- [x] Validar el JSON guardado: título acotado, nodos y marcas permitidos, profundidad y tamaño máximos.
- [x] Sanitizar enlaces (`http`, `https` y `mailto`) y rechazar `javascript:`, `data:` y HTML crudo.
- [x] Exportar un HTML autónomo y local con título, contenido y estilos incluidos.
- [x] Añadir modo invitado de solo lectura, foco visible, etiquetas accesibles y reducción de movimiento.
- [x] Crear `public/store/documentos.svg` con el formato de las portadas actuales.
- [x] Medir el chunk y confirmar que Tiptap y sus dependencias se sirven desde el Site.
- **Criterios de aceptación:**
  - Guardar y recuperar conserva título, texto, marcas y enlaces.
  - Los invitados ven el documento y no pueden editarlo ni guardarlo.
  - El HTML se descarga sin red y no incluye scripts, imágenes ni recursos externos.
  - La app se maneja con teclado y se adapta a móvil.
  - La portada se ve correctamente en tarjeta y ficha.
  - El chunk diferido cabe en el presupuesto y se documenta su peso.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `documentos` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.10.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con DEV-01 y STORE-16.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| HTML pegado con nodos o enlaces peligrosos | XSS en la vista o en el archivo exportado | Esquema cerrado, validación de JSON, protocolos permitidos y pruebas de sanitización. |
| Pérdida de formato al guardar o cargar | Documento inconsistente | Guardar JSON de Tiptap, validarlo y probar el ciclo completo con marcas y enlaces. |
| Chunk grande por Tiptap y ProseMirror | Arranque lento | Import lazy, medir el chunk y ajustar extensiones antes de cerrar la fase 2. |
| Toolbar saturada en móvil | Mala experiencia táctil | Botones con etiquetas accesibles, agrupación y ajuste a una o dos filas. |
| Tablas fuera de alcance generan expectativas | Alcance poco claro | Documentar la ausencia y reevaluarlo al fusionar con Presentaciones. |
| La fusión futura con Presentaciones cambia el modelo | Retrabajo | Aislar tipos, validación y exportación en el modelo de la app. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la misma fase. |

## 6. Notas de sesión

- 2026-11-17: fase 1 completada. Editor Tiptap con título, párrafos, H1–H3, negrita, cursiva, subrayado, listas, citas, código, enlaces normalizados y deshacer/rehacer. La barra muestra estados activos y se adapta a 1366, 1024 y 390 px; el indicador de cambios solo se activa con transacciones que modifican el documento. 6 pruebas focalizadas en verde.
- 2026-11-17: fase 2 completada. Guardado por proyecto con `useAppDocument`, validación defensiva del JSON, enlaces normalizados, exportación HTML autónoma, modo invitado, foco visible, reducción de movimiento y portada. El ciclo guardar/cargar y la descarga HTML se comprobaron en la vista local; 13 pruebas focalizadas en verde. Chunk `documentos` 421,9 KB / 131,8 KB gzip y CSS 8,6 KB / 1,9 KB gzip, servido desde `dist/client`.
- 2026-11-17: STORE-15 sale del backlog y pasa a ser el roadmap activo. `@tiptap/core` 3.34.0 y las extensiones previstas son MIT; el documento cabe en `app_documents`.
- La primera versión no incluye tablas, imágenes ni adjuntos: prioriza editar, guardar y exportar.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.35`) ni se publica en Sites desde este roadmap.
