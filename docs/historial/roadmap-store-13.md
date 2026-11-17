# Roadmap STORE-13 · Líneas de tiempo

> **Estado:** Completado · **Origen:** STORE-13 del backlog (2026-11-16)
> **Backlog:** sin entradas pendientes · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Líneas de tiempo a Aula Store con eventos, épocas, zoom y agrupación.
- [ ] Criterio de éxito: el alumnado crea una secuencia temporal, la organiza por grupos, la guarda en el proyecto y la recupera sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `vis-timeline` 8.5.6 en su opción MIT, con sus dependencias locales y aviso de licencia.
- Crear `app/board/apps/timeline/` con modelo, datos, lienzo temporal, editor y estilos.
- Añadir, editar y eliminar eventos con fecha, título, grupo y descripción breve.
- Añadir épocas o periodos con inicio y fin, etiqueta y color.
- Agrupar eventos, mover el rango, hacer zoom y recentrar la vista.
- Guardar y cargar el documento por proyecto con `useAppDocument`; invitados en solo lectura.
- Plantillas de línea temporal histórica y de proyecto.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.8.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Importar o exportar CSV, JSON, PDF o imágenes.
- Mapas geográficos, recursos externos o datos descargados de la red.
- Colaboración en vivo, IA generativa o cálculos históricos automáticos.
- Nueva tabla, endpoint o migración: el estado usa `app_documents`.
- Añadir Líneas de tiempo a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `vis-timeline` 8.5.6 | Línea temporal propia o Gantt de otro paquete | Resuelve eventos, épocas, zoom, paneo y agrupación con licencia dual; se elige MIT. |
| Estado JSON validado en `app_documents` | Tabla o endpoint por app | Usa la persistencia común por proyecto y permite invitados en solo lectura. |
| Eventos y épocas en un único documento | Varias tablas o documentos por tipo | Mantiene la carga, el guardado y la exportación bajo un solo contrato. |
| Editor lateral y lienzo central | Edición directa sobre cada elemento | Conserva clara la relación entre formulario y representación temporal. |
| Fechas ISO y formato local | Guardar texto formateado | Evita ambigüedades de idioma, zona horaria y reedición. |
| Plantillas histórica y de proyecto | Línea vacía únicamente | Da ejemplos utilizables sin imponer datos externos. |
| Id `timeline`, categorías Educación y Productividad, subcategoría Herramientas | Categoría nueva de cronología | Respeta la taxonomía cerrada de la Tienda. |
| Ventana de 1200×720 | Ventana más estrecha | Da espacio al rango temporal y al panel de edición. |
| `AULA_STORE_VERSION` 1.8.0 | Mantener 1.7.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Lienzo temporal y editor de eventos

- [x] Instalar `vis-timeline` 8.5.6 con la opción MIT y fijar la versión.
- [x] Crear `app/board/apps/timeline/` con modelo, datos, lienzo y estilos.
- [x] Renderizar eventos, grupos y épocas sobre un rango de fechas.
- [x] Añadir, editar y eliminar eventos y épocas desde el panel lateral.
- [x] Implementar zoom, paneo y recentrado del rango visible.
- **Criterios de aceptación:**
  - La línea temporal muestra eventos y épocas con sus etiquetas.
  - Se crean, editan y eliminan eventos sin recargar la app.
  - Los grupos separan los eventos y el zoom cambia el rango visible.
  - El layout se adapta a 1366, 1024 y 390 px sin scroll horizontal.
  - El modelo y la ventana tienen pruebas en verde.

### Fase 2 — Persistencia, plantillas, accesibilidad y portada

- [x] Integrar `useAppDocument(projectId, "timeline")` con guardar, cargar y estados de error.
- [x] Validar el JSON guardado y descartar documentos incompletos sin romper la app.
- [x] Añadir plantillas histórica y de proyecto, con reinicio explícito.
- [x] Revisar foco, teclado, contraste, reducción de movimiento y gestos táctiles.
- [x] Crear `public/store/timeline.svg` con el formato de las portadas actuales.
- [x] Medir el chunk y confirmar que `vis-timeline`, su CSS y los datos se sirven desde el Site.
- **Criterios de aceptación:**
  - Guardar y recuperar conserva eventos, épocas, grupos y rango visible.
  - Los invitados ven el documento y no pueden editarlo ni guardarlo.
  - Las plantillas son distinguibles y reiniciables.
  - La app se maneja con teclado y se adapta a móvil.
  - La portada se ve correctamente en tarjeta y ficha.
  - El chunk diferido cabe en el presupuesto y se documenta su peso.

### Fase 3 — Integración, documentación y cierre

- [x] Añadir `timeline` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [x] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [x] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.8.0`.
- [x] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [x] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog sin entradas pendientes.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `vis-timeline` arrastra varios peers (`vis-data`, `vis-util`, `moment`, etc.) | Peso y conflictos de versiones | Fijar la versión, revisar el lockfile y cargar la app solo al abrirla. |
| El CSS del paquete choca con los estilos del tablero | Aspecto roto fuera de la app | Importar el CSS dentro de la app y acotar los estilos propios. |
| El lienzo necesita un contenedor con tamaño real | Línea vacía o recortada | Inicializar tras medir el contenedor y escuchar redimensionados. |
| Fechas con zona horaria o formatos distintos | Eventos desplazados | Guardar ISO y formatear solo para mostrar. |
| El documento guardado tiene datos incompletos | Error al abrir | Validar el JSON y volver a la plantilla con un aviso. |
| Los gestos táctiles compiten con el scroll | Mala experiencia en móvil | Limitar el arrastre al lienzo y ofrecer controles de rango. |
| La app deriva hacia un editor de Gantt completo | Retraso del roadmap | Limitar a eventos, épocas, grupos, zoom y persistencia. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-17: fase 3 completada. Líneas de tiempo se registró en el catálogo, «Mejores aplicaciones», el registro lazy, la ayuda y la matriz MCP; `AULA_STORE_VERSION` subió a `1.8.0`. Tienda y ficha revisadas a 1366, 1024 y 390 px con la portada, versión `1.0.0` y upstream `vis-timeline 8.5.6`; la demo es de solo lectura y no permite instalar, así que la apertura queda cubierta por el registro lazy y la prueba de sincronización del catálogo. Suite completa 175 archivos / 1.261 pruebas, `tsc`, ESLint, build y `perf:budget` correctos; chunk final `vis-timeline` 541,6 KB / 154,8 KB gzip, app 17,9 KB / 5,6 KB gzip y CSS 26,6 KB / 4,8 KB gzip.
- 2026-11-17: fase 2 completada. Guardado y carga con `useAppDocument(projectId, "timeline")`, validación del JSON, rango visible persistido, plantillas «Carrera espacial» y «Proyecto de aula», modo lectura para invitados, teclado y reducción de movimiento. Portada `public/store/timeline.svg` creada. Chunk diferido: `vis-timeline` 541,6 KB / 154,8 KB gzip, app 17,9 KB / 5,6 KB gzip, CSS 26,6 KB / 4,8 KB gzip y portada 4,47 KB. Revisado a 1366, 1024 y 390 px; 15 pruebas focalizadas en verde.
- 2026-11-17: fase 1 completada. `vis-timeline` 8.5.6 se carga dinámicamente solo en el cliente; el lienzo muestra cinco eventos en tres grupos y dos épocas de fondo, con rango ajustado a los datos. El panel lateral permite añadir, editar y eliminar eventos y épocas, y la barra superior controla zoom y recentrado. Verificado en navegador a 1366, 1024 y 390 px sin scroll horizontal de página; 10 pruebas focalizadas en verde.
- 2026-11-17: STORE-13 sale del backlog y pasa a ser el roadmap activo; el backlog queda sin entradas pendientes. `vis-timeline` 8.5.6 tiene licencia dual y se usará la opción MIT.
- La primera versión no importa ni exporta archivos: el foco es crear, organizar y guardar la línea temporal.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
