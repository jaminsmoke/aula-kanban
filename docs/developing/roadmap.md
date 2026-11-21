# Roadmap ARC-08 — Ordenar `shared` por capacidad y consumidor

> **Estado:** Activo (2026-11-21) · **Origen:** ARC-08 del backlog
> **Backlog:** 3 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Dejar en `app/board/shared` solo capacidades con dos consumidores reales o una frontera técnica justificada.
- [ ] Mover las piezas de Aula Documentos y Office a módulos de Aula Documentos, agrupadas por responsabilidad.
- [ ] Agrupar el editor Gantt de Mermaid con el bloque documental, sin perder la carga diferida del renderizador.
- [ ] Revisar los restos de las cuatro apps documentales absorbidas sin romper alias, rutas ni datos antiguos.
- [ ] Criterio de éxito: mapa de imports coherente, dependencias iniciales y diferidas iguales o mejores, presupuestos verdes y ninguna funcionalidad perdida.

## 2. Alcance

**Dentro:**

- Inventario de archivos, imports estáticos, imports dinámicos y consumidores de `shared/aula-documentos`, `shared/office` y `shared/mermaid`.
- Mapa de destino por capacidad y responsabilidad.
- Movimiento de atajos, extensiones del editor, anclas, búsqueda, esquema, estructura de diapositivas, imágenes y bloques Mermaid.
- Movimiento de presentación, exportaciones, impresión y piezas de revisión propias de Aula Documentos.
- Movimiento del visor, importación y exportación Office a Aula Documentos, conservando la carga diferida.
- Movimiento del editor Gantt y su CSS al módulo de diagramas del documento.
- Revisión de referencias residuales a apps absorbidas y de sus alias de compatibilidad.
- Actualización del mapa de arquitectura, patrones de imports, pruebas y presupuestos.

**Fuera:**

- Cambiar datos, `schemaVersion`, URLs, permisos o contratos de persistencia.
- Rediseñar Aula Documentos, el visor Office, Mermaid o la pizarra.
- Mover `shared/whiteboard`, que sí tiene consumidores independientes.
- Convertir archivos compartidos en una carpeta genérica sin consumidor real.
- Mejorar el rendimiento por el simple hecho de mover archivos: el ahorro debe medirse.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Compartir solo con dos consumidores reales o justificación escrita | Mover todo lo reutilizable a `shared` | Evita una carpeta compartida que en realidad solo usa una app. |
| Agrupar por capacidad | Mover archivos sueltos conservando nombres genéricos | La ubicación debe explicar la responsabilidad. |
| Mantener `shared/whiteboard` | Moverlo a Excalidraw | También lo usan las pizarras de tareas. |
| Conservar `lib/domain` para reglas puras y `lib/server` para persistencia | Trasladar reglas a componentes de app | Mantiene las fronteras y las pruebas sin React. |
| Conservar las cargas diferidas existentes | Importar todo de forma estática al mover | El objetivo no es aumentar el bundle inicial. |
| Mantener alias y rutas compatibles | Romper enlaces o datos antiguos | La limpieza no debe perder documentos guardados. |

## 4. Punto de partida

- `shared/aula-documentos` contiene atajos, extensiones, anclas, búsqueda, exportaciones, presentación y bloques del editor; fuera de `shared`, su consumidor de producto es Aula Documentos.
- `shared/office` contiene modelos, importación, exportación y visor usados por Aula Documentos; el visor se carga de forma diferida.
- `shared/mermaid/gantt-editor` lo consume el bloque documental.
- `shared/whiteboard` sí tiene consumidores distintos y se conserva compartido.
- Hay referencias residuales de las apps documentales absorbidas que deben distinguirse de las que aún sirven para migrar datos.
- Arquitectura: **458 archivos / 1.147 imports**; suite **265 archivos / 1.746 pruebas**; Aula Documentos **386.266 / 387.000 B gzip**; Office **196.481 / 210.000 B gzip**; Site `1.1.38`.

## 5. Fases

### Fase 1 — Inventario, consumidores y mapa de destino

- [x] Inventariar cada archivo de `shared/aula-documentos`, `shared/office` y `shared/mermaid`.
- [x] Registrar consumidores estáticos, dinámicos y tests, incluyendo cargas diferidas.
- [x] Decidir el destino por capacidad: edición, navegación, diagramas, presentación, formatos, Office y revisión.
- [x] Identificar referencias residuales a apps absorbidas y separar compatibilidad de migración.
- [x] Guardar una instantánea de dependencias iniciales y diferidas antes de mover código.
- **Criterios:** cada archivo tiene destino, consumidor y justificación; no se mueve código todavía.
- **Cierre (2026-11-21):** inventario en [`shared-consumidores.md`](shared-consumidores.md) y línea base en [`shared-baseline.json`](shared-baseline.json). **39** archivos en `shared/aula-documentos`, **21** en `shared/office` y **2** en `shared/mermaid`; `shared/whiteboard` se conserva. Arquitectura **458 archivos / 1.147 imports**; flujo Aula **386.266 B / 50 archivos**; suite **265 archivos / 1.746 pruebas**. Sin mover código.

### Fase 2 — Edición, navegación y diagramas

- [x] Mover atajos, extensiones del editor, anclas de comentarios, búsqueda, esquema y estructura de diapositivas.
- [x] Mover imágenes y bloques Mermaid a módulos de edición/diagramas de Aula Documentos.
- [x] Llevar el editor Gantt y su CSS junto al bloque documental, conservando la carga diferida del renderizador.
- [x] Mantener las APIs públicas y actualizar imports y pruebas.
- **Criterios:** edición, búsqueda, esquema, comentarios y diagramas funcionan igual; Gantt sigue cargándose bajo demanda.
- **Cierre (2026-11-21):** atajos, edición, imágenes, búsqueda, navegación, comentarios, diagramas y Gantt se movieron a `apps/aula-documentos` por capacidad. `export-html` se movió junto a su dependencia de extensiones; `shared/mermaid` desapareció. Se actualizaron imports, mocks y pruebas. Presupuesto CSS de Aula ajustado a **15 / 3.350** por incorporar `gantt-editor.css`. Arquitectura **458 archivos / 1.147 imports**; suite **265 archivos / 1.746 pruebas**; build **386.263 B**.

### Fase 3 — Presentación, exportación y revisión

- [ ] Mover la vista de presentación y sus estilos al módulo de presentación de Aula Documentos.
- [ ] Mover exportación HTML, imágenes, impresión y helpers de copias propias.
- [ ] Mantener las cargas diferidas de exportadores y renderizadores.
- [ ] Actualizar pruebas de presentación, PDF, copias e imágenes.
- **Criterios:** mismas exportaciones y mismas dependencias diferidas; ninguna ruta de revisión depende de un módulo genérico sin consumidor.

### Fase 4 — Office

- [ ] Mover el visor y sus componentes a formatos/Office de Aula Documentos.
- [ ] Mover importación y exportación DOCX/PPTX; decidir qué modelo puro queda en `lib/domain`.
- [ ] Conservar la carga diferida del visor y de los generadores Office.
- [ ] Actualizar pruebas, fixtures y presupuesto del flujo Office.
- **Criterios:** el visor y las exportaciones funcionan igual; el bundle inicial no empeora.

### Fase 5 — Restos de apps absorbidas y compatibilidad

- [ ] Revisar alias, rutas y documentos guardados de las cuatro apps documentales absorbidas.
- [ ] Corregir referencias de producto residuales sin borrar las que sirven para migrar datos.
- [ ] Revisar el ID retirado `mermaid` en el catálogo, el sembrado de demo y la descripción que menciona `app_documents`.
- [ ] Actualizar documentación, arquitectura y pruebas de compatibilidad.
- **Criterios:** no quedan restos de producto engañosos y la compatibilidad con datos antiguos sigue cubierta.

### Fase 6 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- [ ] Comparar dependencias iniciales y diferidas con la instantánea de la Fase 1.
- [ ] Actualizar changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** mapa de imports y presupuestos correctos, sin pérdida funcional y sin publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Mover un archivo con imports dinámicos | Rotura silenciosa de lazy loading | Registrar y probar cada import dinámico. |
| Duplicar módulos durante la transición | Dos fuentes de verdad | Mover y actualizar imports en el mismo bloque verificado. |
| Mover `shared/whiteboard` por error | Rotura de Excalidraw o pizarras | Mantenerlo compartido y probar ambos consumidores. |
| Romper alias o datos antiguos | Documentos inaccesibles | Separar compatibilidad de migración y probar rutas antiguas. |
| Aumentar el bundle inicial | Regresión de rendimiento | Comparar la instantánea inicial y diferida en cada fase. |
| Mover sin pruebas de integración | Fallos solo en producción | Ejecutar los flujos afectados y la suite completa antes del cierre. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** ARC-08 sale del backlog; quedan **3 entradas** y el siguiente candidato es **ARC-09**. Sin cambios de código de producto.
- 2026-11-21: **Fase 1 completada.** Inventario de consumidores y destinos en [`shared-consumidores.md`](shared-consumidores.md); instantánea de arquitectura y flujos en [`shared-baseline.json`](shared-baseline.json). Sin mover código. Arquitectura **458 archivos / 1.147 imports**; suite **265 archivos / 1.746 pruebas**; Aula **386.266 B / 50 archivos**.
- 2026-11-21: **Fase 2 completada.** Movidos atajos, edición, imágenes, búsqueda, navegación, comentarios, diagramas y Gantt a `apps/aula-documentos`; `shared/mermaid` eliminado. Presupuesto CSS **15 / 3.350**. Arquitectura **458 archivos / 1.147 imports**; suite **265 archivos / 1.746 pruebas**; build **386.263 B**.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
