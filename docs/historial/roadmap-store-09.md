# Roadmap STORE-09 · Tarjetas de repaso

> **Estado:** Completado · **Origen:** STORE-09, extraído del catálogo de candidatas (2026-11-16)
> **Backlog:** STORE-07, STORE-08 y STORE-10 a STORE-13 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Tarjetas de repaso a Aula Store con mazos compartidos por proyecto y sesiones de estudio basadas en FSRS.
- [ ] Criterio de éxito: se pueden crear mazos y tarjetas, guardarlos, repasarlos con cuatro valoraciones y recuperar el progreso al volver a abrir la app.

## 2. Alcance

**Dentro:**

- Instalar `ts-fsrs` 6.0.0 (MIT) y crear `app/board/apps/tarjetas/`.
- Mazos y tarjetas guardados como JSON versionado en `app_documents`; sin tabla ni endpoint nuevos.
- Crear, editar y eliminar mazos y tarjetas; estado vacío y estados de carga/guardado.
- Sesión de repaso con FSRS, cola de tarjetas pendientes y valoraciones **Otra vez / Difícil / Bien / Fácil**.
- Progreso de repaso en `localStorage` por proyecto y navegador en la primera versión.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.2.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Progreso por usuario en servidor o sincronización entre dispositivos; queda como seguimiento.
- Importar/exportar mazos Anki, CSV o JSON externo.
- Generación de tarjetas con IA, imágenes, audio o notificaciones.
- Añadir Tarjetas al seed de la demo.
- Herramientas MCP específicas en la primera versión; la app declara `pendiente`.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `ts-fsrs` 6.0.0 con FSRS-7 | `supermemo` o implementar FSRS a mano | Es la opción moderna, MIT y pequeña; evita mantener el algoritmo y sus parámetros. |
| Mazos y tarjetas en `app_documents` | Tabla nueva por mazo o tarjeta | El dato es un documento JSON por proyecto; no hace falta migración ni ruta nueva. |
| Progreso de repaso en `localStorage` en la primera versión | Tabla de progreso por usuario desde el primer día | Permite cerrar una app usable ahora; el progreso compartido se puede añadir después sin cambiar el formato del mazo. |
| Invitados en solo lectura; el resto edita | Todos editan o todos leen | Mantiene la regla de los documentos compartidos y protege el trabajo del proyecto. |
| Id `tarjetas`, categoría Educación y subcategoría Herramientas | Una categoría nueva de evaluación | Usa la taxonomía cerrada y describe el uso real. |
| `AULA_STORE_VERSION` 1.2.0 | Mantener 1.1.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Modelo, mazos y tarjetas (completada)

- [x] Instalar `ts-fsrs` y fijar la versión en `package.json` y el lockfile.
- [x] Crear `app/board/apps/tarjetas/` con el modelo de documento, validación y prueba unitaria.
- [x] Implementar alta, edición y borrado de mazos y tarjetas, con estado vacío y avisos de carga/guardado.
- [x] Guardar y cargar el documento con `useAppDocument(projectId, "tarjetas")`; invitados en solo lectura.
- **Criterios de aceptación:**
  - El documento JSON conserva mazos y tarjetas tras recargar y guardar.
  - No se puede editar con rol de invitado.
  - El estado vacío explica cómo crear el primer mazo.
  - Pruebas del modelo y de la app en verde.

### Fase 2 — Repaso FSRS, acabado y portada (completada)

- [x] Integrar el scheduler de `ts-fsrs` y convertir las fechas del documento a `Date` al cargar.
- [x] Implementar la cola de repaso, las cuatro valoraciones, la siguiente fecha y el resumen de sesión.
- [x] Guardar el progreso en `localStorage` por proyecto y navegador; mostrar la limitación en la interfaz.
- [x] Añadir navegación por teclado, foco visible y adaptación a 1366, 1024 y 390 px.
- [x] Crear `public/store/tarjetas.svg` con el formato de las portadas actuales.
- **Criterios de aceptación:**
  - Una tarjeta nueva se puede valorar y vuelve a aparecer según FSRS.
  - El progreso sobrevive a recargar en el mismo navegador.
  - La sesión se puede completar sin ratón y se ve bien en móvil.
  - La portada se ve completa en tarjeta 16:9 y ficha 16:7.

### Fase 3 — Integración, documentación y cierre (completada)

- [x] Añadir `tarjetas` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [x] Declarar la superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [x] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.2.0`.
- [x] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [x] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-07, STORE-08 y STORE-10 a STORE-13.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El progreso en `localStorage` no se comparte entre dispositivos | Un alumno no ve su progreso en otro equipo | Documentarlo en la app y dejar una tabla por usuario como seguimiento, sin cambiar el formato del mazo. |
| `ts-fsrs` usa un scheduler asíncrono y fechas | Errores de serialización o de carga | Encapsular el scheduler en un módulo, guardar fechas ISO y probar la conversión al cargar. |
| El documento crece con muchas tarjetas | Guardados lentos o límites de `app_documents` | Validar tamaño, paginar por mazo y mantener el JSON plano; medir con una muestra realista. |
| Dos personas guardan a la vez | La última escritura pisa el trabajo de la otra | Avisar de que el guardado es explícito y no concurrente; valorar revisión optimista en una fase posterior. |
| La app se convierte en un editor demasiado grande | Retraso del roadmap | Limitar la primera versión a mazos, tarjetas y repaso; dejar importación, imágenes y audio fuera. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |

## 6. Notas de sesión

- 2026-11-16: STORE-09 sale del catálogo de candidatas y pasa a ser el roadmap activo. `ts-fsrs` 6.0.0 es MIT, requiere Node >=24 y el proyecto usa Node 24.19.
- La app guarda mazos y tarjetas en `app_documents`; el progreso de repaso empieza en `localStorage` para no abrir una tabla por usuario antes de validar el producto.
- 2026-11-16: Fase 1 completada. La app permite crear mazos, añadir/editar/eliminar tarjetas y guardar el documento; los invitados quedan en solo lectura. El modelo y la UI se revisaron a 1366 y 390 px con datos simulados; la ruta real se validará al registrar el id en la fase 3. Pruebas de modelo y app: 8 correctas.
- 2026-11-16: Fase 2 completada. El repaso usa FSRS-7, guarda la programación en `localStorage` por proyecto y navegador, ofrece las cuatro valoraciones, resumen de sesión y atajos de teclado. La portada `public/store/tarjetas.svg` sigue el formato de Aula Store. Revisada a 1366 y 390 px; pruebas de repaso, modelo y app: 10 correctas.
- 2026-11-17: Fase 3 completada. Tarjetas de repaso se registró en el catálogo, «Mejores aplicaciones», el registro lazy, la ayuda y la matriz MCP; `AULA_STORE_VERSION` subió a `1.2.0`. Tienda, ficha y app revisadas a 1366, 1024 y 390 px; la app se instaló y abrió desde Aula Store. Suite completa 165 archivos / 1.193 pruebas, `tsc`, ESLint, build y `perf:budget` correctos.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
