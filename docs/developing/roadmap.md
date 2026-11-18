# Roadmap STORE-16 · Visor Office

> **Estado:** Activo · **Origen:** STORE-16 del backlog (2026-11-17)
> **Backlog:** DEV-01 pendiente · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Visor Office a Aula Store para abrir documentos `.docx`, `.xlsx` y `.pptx` locales en solo lectura.
- [ ] Criterio de éxito: una persona elige un archivo de su equipo, lo ve dentro de Aula Kanban, puede moverlo y ampliarlo, y el archivo no se sube ni se modifica.

## 2. Alcance

**Dentro:**

- Instalar `@silurus/ooxml` 0.90.1 (MIT) con sus WASM y recursos servidos desde el Site.
- Crear `app/board/apps/visor-office/` con selector de archivo local, visor y controles de navegación.
- Abrir `.docx`, `.xlsx` y `.pptx` en modo solo lectura, con detección de formato y límite de tamaño.
- Usar los visores incluidos de la librería y liberar sus recursos al cambiar o cerrar el archivo.
- Mensajes claros para archivos corruptos, protegidos, demasiado grandes o no soportados.
- Controles accesibles de zoom, ajuste y navegación según el formato; foco visible y diseño adaptable.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas, medición de chunk/WASM y documentación.
- `AULA_STORE_VERSION` a `1.11.0`; el Site sigue en `1.1.35`.

**Fuera de alcance:**

- Editar, guardar, exportar o convertir documentos; la librería y la app son de solo lectura.
- Subir archivos al servidor, guardarlos en `app_documents`, R2 o cualquier almacenamiento remoto.
- Formatos legacy `.doc`, `.xls` y `.ppt`, o el add-on OpenDocument.
- Contraseñas para documentos cifrados: se muestran como no soportados en esta versión.
- PDF genérico: el lector de libros ya cubre PDF.
- Macros, scripts, vídeo o contenido interactivo de los documentos.
- Nueva tabla, endpoint o migración.
- Añadir la app a la demo, cambiar la versión del Site o publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `@silurus/ooxml` 0.90.1 | Un motor propio o una librería comercial | Es MIT, renderiza los tres formatos en canvas y mantiene el archivo en el navegador. |
| Importaciones por formato | Importar el paquete completo | Reduce el grafo inicial: `@silurus/ooxml/docx`, `/xlsx` y `/pptx` solo cuando hacen falta. |
| Visores incluidos por formato | Construir la UI sobre el motor headless | Menos código propio para la primera versión; la API headless queda para una fusión futura. |
| Leer `File.arrayBuffer()` y pasar bytes | Enviar el archivo a una API o crear un object URL permanente | El archivo nunca sale del navegador y se libera al cerrar. |
| Un archivo a la vez | Varias pestañas de documentos | Mantiene pequeño el estado y el consumo de memoria del WASM. |
| Límite de 30 MB | Aceptar cualquier tamaño | Evita bloquear la ventana con archivos desproporcionados para el aula. |
| Sin persistencia | Guardar el archivo o una copia en `app_documents` | El visor es una herramienta local y no debe conservar documentos del equipo. |
| Sin formatos legacy ni contraseñas | Añadir los add-ons experimentales | Mantiene el alcance y evita prometer una compatibilidad incompleta. |
| Id `visor-office`, categoría Oficina, subcategoría Herramientas | Categoría nueva de documentos | Respeta la taxonomía cerrada de la Tienda. |
| Ventana de 1200×720 | Ventana más estrecha | Da espacio a páginas, hojas y diapositivas. |
| `AULA_STORE_VERSION` 1.11.0 | Mantener 1.10.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Visor local para los tres formatos

- [x] Instalar y fijar `@silurus/ooxml` 0.90.1.
- [x] Crear `app/board/apps/visor-office/` con modelo de formato, selector y superficie de visor.
- [x] Detectar `.docx`, `.xlsx` y `.pptx`, validar el límite de 30 MB y leer los bytes localmente.
- [x] Instanciar el visor correspondiente y liberarlo al cambiar de archivo, cerrar o desmontar.
- [x] Añadir nombre, tamaño y formato del archivo, estados de carga y errores básicos.
- [x] Incorporar controles de zoom, ajuste y navegación disponibles en cada visor.
- [x] Revisar el layout a 1366, 1024 y 390 px, sin scroll horizontal de página.
- **Criterios de aceptación:**
  - Se abre un archivo local de cada uno de los tres formatos.
  - El archivo no se sube, no se modifica, no se persiste en el proyecto y no se envía fuera del navegador.
  - Cambiar de archivo destruye el visor anterior y no acumula recursos.
  - Los controles y mensajes se entienden con teclado.
  - Modelo y componente tienen pruebas en verde.

### Fase 2 — Robustez, accesibilidad, portada y medición

- [ ] Manejar archivos corruptos, protegidos, no soportados y demasiado grandes con mensajes claros.
- [ ] Confirmar que WASM, workers y fuentes se sirven desde el Site y que abrir un archivo no hace peticiones externas ni lo envía fuera del navegador.
- [ ] Revisar foco, teclado, contraste, reducción de movimiento y límites de accesibilidad del canvas.
- [ ] Añadir un estado vacío útil y evitar que el selector acepte formatos fuera de alcance.
- [ ] Crear `public/store/visor-office.svg` con el formato de las portadas actuales.
- [ ] Medir el chunk, los assets WASM y el tiempo de carga de cada formato; documentar el presupuesto.
- **Criterios de aceptación:**
  - Los errores no rompen la ventana ni dejan visores huérfanos.
  - Abrir un archivo no hace peticiones externas; WASM, workers y fuentes se sirven desde el propio Site.
  - La app se adapta a 1366, 1024 y 390 px y tiene controles utilizables en móvil.
  - La portada se ve correctamente en tarjeta y ficha.
  - El chunk y el WASM caben en el presupuesto o queda documentado el límite.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `visor-office` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.11.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con DEV-01.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El WASM y los assets disparan el chunk | Arranque lento o fuera de presupuesto | Import lazy, importaciones por formato y medición separada de JS, WASM y fuentes. |
| Fuentes o workers intentan cargar desde fuera | La app deja de ser offline y falla la CSP | Servir todos los assets desde el Site y auditar la red con un archivo real. |
| Un archivo enorme bloquea la memoria | Ventana congelada o cierre inesperado | Límite de 30 MB, mensaje previo y liberación del visor. |
| El canvas no es accesible para lectores de pantalla | Contenido no anunciado | Documentar el límite, mantener accesibles el selector, los controles y el estado; no prometer lectura completa. |
| Documentos cifrados o legacy no abren | Expectativa incumplida | Mensaje explícito y alcance documentado; no añadir add-ons experimentales. |
| El ciclo de vida deja visores o workers abiertos | Fugas de memoria | `destroy()` en cambio, cierre y desmontaje; prueba de limpieza. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la misma fase. |

## 6. Notas de sesión

- 2026-11-17: STORE-16 sale del backlog y pasa a ser el roadmap activo. `@silurus/ooxml` 0.90.1 es MIT, ESM y trae WASM propio; el paquete completo ocupa unos 23 MB sin empaquetar.
- La primera versión es solo lectura y no guarda archivos: el visor trabaja con `File.arrayBuffer()` en memoria.
- No se añade PDF: el lector de libros ya lo cubre.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.35`) ni se publica en Sites desde este roadmap.
- 2026-11-18: Fase 1 verificada con archivos reales de Word, Excel y PowerPoint en 1366, 1024 y 390 px. El visor usa un host DOM estable, ajusta Word al ancho y PowerPoint a la ventana, mantiene Excel al 100 % y vuelve a ajustar al redimensionar. Cambiar o cerrar el archivo destruye el visor y limpia sus nodos. Modelo y componente tienen 8 pruebas en verde.
