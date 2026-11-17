# Roadmap STORE-14 · Hoja de cálculo

> **Estado:** Activo · **Origen:** STORE-14 del backlog (2026-11-17)
> **Backlog:** STORE-15 y STORE-16 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Hoja de cálculo a Aula Store con edición de celdas, fórmulas y guardado por proyecto.
- [ ] Criterio de éxito: el alumnado crea una hoja, calcula con fórmulas, la guarda en el proyecto y la recupera sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `jspreadsheet-ce` 5.0.4 con licencia MIT y sus dependencias locales.
- Crear `app/board/apps/hoja-calculo/` con rejilla, barra de herramientas, modelo y estilos.
- Editar celdas, filas y columnas; aplicar formato esencial de texto y números.
- Fórmulas básicas de la edición community, con recálculo al editar.
- Exportación CSV local, con protección frente a fórmulas inyectadas.
- Guardar y cargar el documento por proyecto con `useAppDocument`; invitados en solo lectura.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.9.0`; el Site sigue en `1.1.35`.

**Fuera de alcance:**

- Importar o exportar `.xlsx`, macros, gráficas, tablas dinámicas o formato condicional avanzado.
- Varias hojas por documento en la primera versión.
- Colaboración en vivo, historial de versiones o edición desde el servidor.
- Fórmulas o funciones que no cubra la librería elegida.
- Nueva tabla, endpoint o migración: el estado usa `app_documents`.
- Añadir Hoja de cálculo a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `jspreadsheet-ce` 5.0.4 | Univer, Handsontable o una rejilla propia | Es MIT, pesa poco y cubre celdas, fórmulas y formato sin backend. |
| Una sola hoja por documento | Varias pestañas desde la primera versión | Mantiene pequeño el JSON y deja la fusión de apps para más adelante. |
| Formato esencial de celda | Suite de oficina completa | Cubre el uso escolar sin convertir la app en Excel. |
| Exportación CSV local | Exportación `.xlsx` | No necesita binarios ni servicios externos; `.xlsx` queda para otra fase. |
| JSON validado en `app_documents` | Tabla o endpoint por app | Usa la persistencia común por proyecto y permite invitados en solo lectura. |
| Proteger el CSV frente a fórmulas inyectadas | Exportar el valor tal cual | Evita que una celda con `=`, `+`, `-` o `@` se ejecute al abrir el archivo. |
| Id `hoja-calculo`, categorías Oficina y Productividad, subcategoría Herramientas | Categoría nueva de documentos | Respeta la taxonomía cerrada de la Tienda. |
| Ventana de 1200×720 | Ventana más estrecha | Da espacio a columnas, filas y barra de fórmulas. |
| `AULA_STORE_VERSION` 1.9.0 | Mantener 1.8.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Rejilla, edición y fórmulas

- [x] Instalar `jspreadsheet-ce` 5.0.4 y fijar la versión.
- [x] Crear `app/board/apps/hoja-calculo/` con modelo, rejilla, barra de herramientas y estilos.
- [x] Permitir editar celdas, añadir filas y columnas y seleccionar rangos.
- [x] Añadir fórmulas básicas y formato esencial de texto y números.
- **Criterios de aceptación:**
  - Se crea y edita una hoja con varias filas y columnas.
  - Las fórmulas se recalculan al cambiar una celda.
  - El formato esencial se mantiene al editar.
  - El layout se adapta a 1366, 1024 y 390 px sin scroll horizontal.
  - El modelo y la ventana tienen pruebas en verde.

### Fase 2 — Persistencia, CSV, accesibilidad y portada

- [x] Integrar `useAppDocument(projectId, "hoja-calculo")` con guardar, cargar y estados de error.
- [x] Validar el JSON guardado y descartar documentos incompletos sin romper la app.
- [x] Exportar CSV local y proteger las celdas que empiezan por `=`, `+`, `-` o `@`.
- [x] Revisar foco, teclado, contraste, reducción de movimiento y edición táctil.
- [x] Crear `public/store/hoja-calculo.svg` con el formato de las portadas actuales.
- [x] Medir el chunk y confirmar que la librería y sus dependencias se sirven desde el Site.
- **Criterios de aceptación:**
  - Guardar y recuperar conserva celdas, fórmulas y formato.
  - Los invitados ven la hoja y no pueden editarla ni guardarla.
  - La exportación CSV se descarga sin red y no ejecuta fórmulas inyectadas.
  - La app se maneja con teclado y se adapta a móvil.
  - La portada se ve correctamente en tarjeta y ficha.
  - El chunk diferido cabe en el presupuesto y se documenta su peso.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `hoja-calculo` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.9.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-15 y STORE-16.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La edición community no cubre todas las fórmulas esperadas | Alcance incompleto | Validar fórmulas básicas antes de la integración y documentar las que quedan fuera. |
| Una rejilla grande bloquea la ventana | Mala experiencia | Limitar dimensiones, cargar solo la hoja activa y medir con datos de clase. |
| El CSV exportado ejecuta fórmulas inyectadas | Riesgo al abrir el archivo | Escapar las celdas que empiecen por `=`, `+`, `-` o `@`. |
| El formato de celda no se serializa bien | Pérdida al recargar | Guardar solo propiedades soportadas y probar el ciclo completo. |
| La edición táctil en móvil es incómoda | Abandono en tablet | Priorizar selección de celdas y controles grandes; documentar límites. |
| La fusión futura con Notas o Visor Office cambia el modelo | Retrabajo | Aislar el documento y sus tipos en el modelo de la app. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-17: fase 1 completada. `jspreadsheet-ce` 5.0.4 se carga con la hoja de ejemplo de presupuesto; la rejilla permite editar celdas, fórmulas (`=B3*C3`, `=SUM(D3:D5)`), añadir filas y columnas y aplicar formato esencial. Verificado en navegador a 1366, 1024 y 390 px con scroll interno de la rejilla y sin scroll horizontal de página; 10 pruebas focalizadas en verde.
- 2026-11-17: fase 2 completada. La app guarda y carga datos y estilos con `useAppDocument`, descarta documentos incompletos, exporta CSV local protegido y deja la hoja en solo lectura para invitados. La portada está revisada y el chunk de la vista previa pesa 128,9 KB gzip de JS y 5,4 KB gzip de CSS, con `jspreadsheet-ce` y sus dependencias dentro del bundle local. Foco, navegación con teclado, fórmulas al editar y descarga CSV comprobados en navegador a 1366, 1024 y 390 px; 14 pruebas focalizadas en verde.
- 2026-11-17: STORE-14 sale del backlog y pasa a ser el roadmap activo. `jspreadsheet-ce` 5.0.4 es MIT y el documento cabe en `app_documents`.
- La primera versión no importa `.xlsx` ni crea varias hojas: prioriza editar, calcular y guardar.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.35`) ni se publica en Sites desde este roadmap.
