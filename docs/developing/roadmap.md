# Roadmap STORE-12 · Moléculas 3D

> **Estado:** Activo · **Origen:** STORE-12 del backlog (2026-11-16)
> **Backlog:** STORE-13 pendiente · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Incorporar Moléculas 3D a Aula Store con un visor que gire, amplíe y etiquete estructuras locales.
- [ ] Criterio de éxito: el alumnado elige una molécula de la biblioteca, la manipula, ve su nombre, fórmula y atribución, y todo funciona sin red ni servidor.

## 2. Alcance

**Dentro:**

- Instalar `3dmol` 2.5.5 con su licencia BSD-3 y aviso de dependencia.
- Crear `app/board/apps/moleculas/` con visor 3D, selector de moléculas, ficha y estilos.
- Incluir una biblioteca local curada de estructuras PDB/SDF con nombre, fórmula y atribución.
- Rotación, zoom, etiquetas de átomos y selección de moléculas.
- Cargar los datos desde el propio bundle, sin descargas externas ni CDN.
- Portada SVG, ficha, registro lazy, ayuda, matriz, pruebas y documentación.
- `AULA_STORE_VERSION` a `1.7.0`; el Site sigue en `1.1.34`.

**Fuera de alcance:**

- Editor químico, generación de estructuras o cálculos cuánticos.
- Descargar estructuras de RCSB, PubChem u otros servicios.
- Guardar la cámara o la selección por proyecto: es un visor de referencia y la vista se reinicia al abrir.
- Exportar imágenes, PDF o vídeo; la primera versión se centra en manipular y leer.
- Colaboración en vivo, IA generativa o recursos externos.
- Nueva tabla, endpoint o migración.
- Añadir Moléculas 3D a la demo o cambiar la versión del Site.
- Publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `3dmol` 2.5.5 | Visor WebGL propio u otra librería | Resuelve renderizado, rotación, zoom, etiquetas y lectura de PDB/SDF con licencia BSD-3. |
| Estructuras PDB/SDF embebidas en el bundle | Descargarlas de RCSB o PubChem | Garantiza el modo sin red, evita dependencias externas y permite revisar la atribución. |
| Biblioteca curada de 6 a 10 moléculas | Catálogo químico amplio | Mantiene el peso y la revisión bajo control; se puede ampliar en otro roadmap. |
| Representación ball-and-stick con etiquetas opcionales | Editor completo de estilos | Cubre la lectura básica sin convertir la app en un laboratorio de modelado. |
| Sin persistencia en `app_documents` | Guardar cámara y selección | Es un visor de referencia; no hay un documento que el alumnado deba conservar. |
| Id `moleculas`, categoría Educación, subcategoría Herramientas | Categoría nueva de ciencias | Respeta la taxonomía cerrada de la Tienda. |
| Ventana de 1120×720 | Ventana más pequeña | Da espacio al lienzo 3D y a la ficha sin apretar los controles. |
| `AULA_STORE_VERSION` 1.7.0 | Mantener 1.6.0 | Añadir una app es una capacidad nueva de la Tienda. |

## 4. Fases

### Fase 1 — Visor 3D y biblioteca local

- [ ] Instalar `3dmol` 2.5.5 y fijar la versión.
- [ ] Crear `app/board/apps/moleculas/` con modelo, datos, visor y estilos.
- [ ] Cargar estructuras PDB/SDF locales y mostrar la molécula seleccionada.
- [ ] Añadir rotación, zoom, etiquetas de átomos y ficha con nombre y fórmula.
- **Criterios de aceptación:**
  - La biblioteca local carga sin peticiones externas.
  - La molécula gira y se amplía con ratón, rueda y gestos táctiles básicos.
  - Las etiquetas se activan y desactivan sin romper la escena.
  - La ficha muestra nombre, fórmula y atribución.
  - El layout se adapta a 1366, 1024 y 390 px sin scroll horizontal.
  - El modelo y la ventana tienen pruebas en verde.

### Fase 2 — Catálogo curado, accesibilidad y portada

- [ ] Completar la biblioteca con 6 a 10 moléculas y revisar coordenadas y atribución.
- [ ] Revisar foco, teclado, contraste y reducción de movimiento.
- [ ] Añadir estados de carga, error y WebGL no disponible.
- [ ] Crear `public/store/moleculas.svg` con el formato de las portadas actuales.
- [ ] Medir el chunk y confirmar que `3dmol` y los datos se sirven desde el Site.
- **Criterios de aceptación:**
  - Todas las moléculas de la biblioteca cargan y muestran su información.
  - La atribución es visible y no hay recursos de red.
  - La app se maneja con teclado y se adapta a móvil.
  - La portada se ve correctamente en tarjeta y ficha.
  - El chunk diferido cabe en el presupuesto y se documenta su peso.

### Fase 3 — Integración, documentación y cierre

- [ ] Añadir `moleculas` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Declarar su superficie MCP en `APP_MCP_DECLARACIONES` con `pendiente` y actualizar `docs/Store/mcp-apps.md` y `docs/Store/matriz-herramientas.md`.
- [ ] Añadir la app a la ayuda, actualizar snapshots y elevar `AULA_STORE_VERSION` a `1.7.0`.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar `docs/Store/apps/integradas.md`, archivar este roadmap, reiniciar `roadmap.md` y dejar el backlog con STORE-13.
- **Criterios de aceptación:**
  - La app aparece en la Tienda, se instala y abre.
  - La ficha muestra versión y upstream correctos; no hay 404 en la portada.
  - La ayuda y la matriz MCP explican que no hay herramientas propias.
  - Suite completa, tipos, lint, build y presupuesto en verde.
  - Sin cambios de datos versionados, Site ni publicación; el push se hace una sola vez al cerrar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `3dmol` pesa cerca de 1 MB y arrastra WebGL | Chunk grande y arranque lento | Cargarlo solo al abrir la app, medir con `perf:budget` y evitar importarlo en el catálogo. |
| El contenedor cambia de tamaño dentro de la ventana | Lienzo borroso o recortado | Inicializar tras medir el contenedor y escuchar redimensionados. |
| WebGL no está disponible en algún navegador o contexto | La app no muestra nada | Detectar el fallo y ofrecer un mensaje claro sin romper la ventana. |
| Los gestos táctiles compiten con el scroll de la ventana | Mala experiencia en móvil | Limitar el arrastre al lienzo y ofrecer controles de zoom accesibles. |
| Las estructuras o sus coordenadas no son fiables | Fichas incorrectas | Usar una selección pequeña, revisar cada archivo y conservar la fuente. |
| La licencia BSD-3 exige conservar el aviso | Incumplimiento legal | Añadir el aviso a `THIRD-PARTY-NOTICES.md` y mostrar la atribución en la ficha. |
| Añadir la app rompe snapshots y contratos MCP | Suite en rojo | Actualizar declaraciones, snapshots y pruebas de cobertura en la fase 3. |
| La app deriva hacia un editor químico | Retraso del roadmap | Limitar el alcance a visor, biblioteca, etiquetas y ficha. |

## 6. Notas de sesión

- 2026-11-17: STORE-12 sale del backlog y pasa a ser el roadmap activo. `3dmol` 2.5.5 es BSD-3 y la biblioteca se servirá localmente.
- La primera versión no descarga estructuras ni guarda la vista: es un visor de referencia, no un editor.
- La demo no se toca: `DEMO_APPS` sigue con las cinco apps actuales.
- No se cambia la versión del Site (`1.1.34`) ni se publica en Sites desde este roadmap.
