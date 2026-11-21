# Roadmap ADOC-18 — Buscar, esquema y navegación del documento

> **Estado:** Activo (2026-11-21) · **Origen:** ADOC-18 del backlog
> **Backlog:** 4 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Añadir búsqueda y reemplazo interno con resultados navegables, sin depender del buscador del navegador.
- [ ] Construir un esquema de títulos real que permita saltar a cualquier sección.
- [ ] Añadir un navegador de diapositivas y salto directo desde la vista de estructura.
- [ ] Incorporar modo enfoque y barra de estado con recuento, sección actual y guardado.
- [ ] Cubrir teclado, foco, lector de pantalla y móvil.
- [ ] Criterio de éxito: buscar y sustituir no rompe el formato, el esquema refleja los títulos reales y la navegación funciona con teclado y en móvil.

## 2. Alcance

**Dentro:**

- Buscar en el documento activo con coincidencias, anterior/siguiente y recuento.
- Reemplazar una coincidencia o todas, con opción sensible a mayúsculas y acentos.
- Esquema de títulos H1–H3 con jerarquía, salto y estado activo.
- Navegador de diapositivas construido desde los saltos reales del documento.
- Salto a una diapositiva concreta desde el esquema y la vista previa.
- Modo enfoque para ocultar cromo no esencial.
- Barra de estado con palabras, diagramas, sección actual y estado de guardado.
- Atajos de teclado, foco y accesibilidad.
- Pruebas de búsqueda, reemplazo, esquema, diapositivas, teclado y móvil.

**Fuera:**

- Cambiar el modelo canónico de `AulaDocument` o el esquema de Tiptap.
- Rehacer la presentación, el editor o el sistema de guardado de ADOC-17.
- Buscar en todos los documentos de la suite a la vez.
- Indexación semántica, búsqueda por voz o IA.
- Exportar un PDF nuevo o cambiar la salida de presentación de ADOC-19.
- Publicar, migrar datos o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Buscar sobre el árbol Tiptap y el texto visible | Usar el buscador del navegador | El navegador no reemplaza ni respeta el formato del documento. |
| Resultado con rango de posición y texto | Buscar por índice de string serializado | El JSON incluye marcas y atributos; el índice no corresponde al texto visible. |
| Reemplazo como transacción Tiptap | Manipular el DOM o el JSON a mano | Conserva marcas, tablas, imágenes y deshacer. |
| Esquema derivado del documento | Mantener una lista manual de secciones | La lista manual se desincroniza al editar. |
| Diapositivas desde `buildPresentationSlides` | Duplicar el parser de saltos | La presentación y el navegador deben ver la misma estructura. |
| Modo enfoque como estado de vista | Ocultar CSS por selector global | Debe recordar el estado y no afectar a otras apps. |
| Barra de estado derivada del editor | Guardar sección actual en el documento | Es información de UI, no del contenido. |
| Sin índice persistente | Indexar al guardar | El documento es pequeño y el índice añadiría migración y ruido. |

## 4. Punto de partida

- No hay búsqueda interna ni reemplazo; el usuario depende de `Ctrl+F` del navegador.
- No hay esquema de títulos ni salto entre secciones.
- La presentación ya construye diapositivas con `buildPresentationSlides` y la vista previa permite anterior/siguiente, pero no hay navegador ni salto directo.
- La barra superior muestra palabras, diagramas y estado de guardado; no muestra la sección actual.
- No hay modo enfoque.
- Suite registrada al abrir: **252 archivos / 1.689 pruebas**; presupuesto `aula-documentos` **372.018 / 373.000 B gzip**; Site `1.1.37`.

## 5. Fases

### Fase 1 — Inventario, contrato y modelo de búsqueda

- [x] Inventariar los nodos, marcas, tablas, imágenes y diapositivas que debe respetar la búsqueda.
- [x] Definir el contrato de resultados: posición, texto, contexto, índice y estado activo.
- [x] Decidir búsqueda por texto visible, mayúsculas y acentos; documentar límites.
- [x] Definir el esquema de títulos y el modelo de diapositivas.
- [x] Documentar el contrato en `docs/developing/aula-documentos-navegacion.md`.
- **Criterios:** búsqueda, reemplazo, esquema y diapositivas tienen un contrato común; no se mueve código todavía.
- **Cierre (2026-11-21):** [`aula-documentos-navegacion.md`](aula-documentos-navegacion.md) fija búsqueda sobre texto visible, resultados por posiciones Tiptap, reemplazo transaccional, esquema H1–H3, diapositivas compartidas con la presentación, enfoque de sesión, barra de estado y atajos. Sin cambios de código.

### Fase 2 — Buscar y reemplazar

- [x] Añadir una barra de búsqueda con resultados y navegación anterior/siguiente.
- [x] Resaltar coincidencias sin modificar el contenido.
- [x] Reemplazar una coincidencia o todas mediante transacciones Tiptap.
- [x] Respetar mayúsculas/acentos y no romper marcas, tablas, imágenes ni deshacer.
- [x] Añadir pruebas de búsqueda, reemplazo, cancelación y formato.
- **Criterios:** se encuentra y reemplaza texto sin perder estructura; el documento solo cambia al confirmar.
- **Cierre (2026-11-21):** barra de búsqueda con navegación, toggles de mayúsculas/acentos, resaltado por decoraciones y reemplazo actual/todo en una transacción Tiptap. Pruebas de coincidencia, marcas y flujo de UI en verde; sin cambios de esquema ni autosave antes de confirmar.

### Fase 3 — Esquema y navegador de diapositivas

- [x] Construir el esquema H1–H3 desde el documento con jerarquía y posición.
- [x] Permitir saltar a una sección y marcar la sección activa.
- [x] Añadir un navegador de diapositivas con número, título y salto directo.
- [x] Sincronizar el índice de la vista previa con el navegador.
- [x] Probar documentos sin títulos, con títulos repetidos y con muchas diapositivas.
- **Criterios:** el esquema refleja los títulos reales y cualquier diapositiva se abre desde el navegador.
- **Cierre (2026-11-21):** esquema jerárquico H1–H3 derivado de posiciones Tiptap, sección activa según la selección y navegador que reutiliza la agrupación de `buildPresentationSlides`. Cada diapositiva salta a su bloque y la vista previa se abre en la diapositiva activa. Suite: **256 archivos / 1.698 pruebas**; build **375.633 B**; presupuesto **377.000 B**.

### Fase 4 — Enfoque, barra de estado, teclado y accesibilidad

- [ ] Añadir modo enfoque con salida clara y estado recordado por sesión.
- [ ] Mostrar sección actual, palabras, diagramas y guardado en la barra de estado.
- [ ] Definir atajos de búsqueda, navegación y enfoque sin pisar los del editor.
- [ ] Revisar foco, lector de pantalla, contraste y comportamiento móvil.
- [ ] Probar teclado, Escape, resultados vacíos y cambio de documento.
- **Criterios:** toda la navegación funciona con teclado y móvil, y el foco vuelve al lugar correcto.

### Fase 5 — Cierre

- [ ] Revisar que búsqueda, reemplazo, esquema y diapositivas comparten el documento real.
- [ ] Actualizar ayuda, documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- **Criterios:** navegación estable y accesible, suite y presupuestos correctos; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reemplazo sobre JSON o DOM | Pérdida de marcas y estructura | Usar transacciones Tiptap y probar tablas, enlaces e imágenes. |
| Búsqueda por string serializado | Posiciones y resultados incorrectos | Buscar texto visible y mapear rangos del documento. |
| Esquema desincronizado | Saltos a secciones equivocadas | Derivarlo del documento en cada cambio relevante. |
| Índice costoso en documentos grandes | Apertura lenta | Actualización incremental y sin persistencia. |
| Atajos en conflicto | El editor deja de responder | Mapa central de atajos y pruebas de teclado. |
| Modo enfoque atrapa al usuario | No se puede salir | Escape, botón visible y foco restaurado. |
| Cambio de documento con búsqueda abierta | Resultados de otro documento | Cerrar o reiniciar búsqueda al cambiar de id. |

## 7. Notas de sesión

- 2026-11-21: ADOC-18 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **4 entradas**; siguiente candidato **ADOC-19**.
- ADOC-17 queda cerrado y archivado en `docs/historial/roadmap-adoc-17.md`.
- 2026-11-21: **Fase 1 completada.** Contrato de búsqueda, reemplazo, esquema, diapositivas, enfoque y barra de estado en [`aula-documentos-navegacion.md`](aula-documentos-navegacion.md). Sin cambios de código.
- 2026-11-21: **Fase 2 completada.** Búsqueda y reemplazo con posiciones Tiptap, decoraciones, toggles de mayúsculas/acentos y transacciones que conservan marcas. Suite: **254 archivos / 1.692 pruebas**. Presupuesto `aula-documentos`: **375.000 B**.
- No se ha cambiado código de producto al abrir este roadmap; no hay publicación ni migraciones remotas.
- El Site sigue en `1.1.37`.
