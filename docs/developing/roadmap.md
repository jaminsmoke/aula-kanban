# Roadmap ADOC-13 · Converger la suite documental en Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-13 del backlog (2026-11-19)
> **Backlog:** STORE-18 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Reunir en Aula Documentos todas las capacidades de Notas y documentos, Diagramas, Presentaciones y Visor Office, conservando datos, enlaces, permisos y accesos durante la transición.
- [ ] Criterio de éxito: Aula Documentos cubre las funciones de las cuatro apps, los documentos antiguos siguen abriendo y las apps retiradas dejan de aparecer sin romper instalaciones, enlaces ni datos existentes.

## 2. Alcance

**Dentro:**

- Inventario de paridad funcional de las cuatro apps frente a Aula Documentos.
- Edición de notas, bloques Mermaid y presentaciones dentro de Aula Documentos, con sus funciones ampliadas.
- Visor Office compartido accesible desde Aula Documentos para previsualizar archivos locales.
- Migración de los datos guardados en `app_documents` y apertura de enlaces antiguos.
- Alias de IDs, URLs, ventanas, permisos, MCP y catálogo durante la transición.
- Retirada progresiva de las apps antiguas de la Tienda y del árbol de `apps/`.
- Actualización de la ficha mínima, la ayuda, la matriz de permisos, MCP y la documentación.
- Verificación completa antes de borrar cualquier ruta o dato.

**Fuera de alcance:**

- Volver a implementar el motor de Office o prometer edición de OOXML.
- Conservar automáticamente todos los archivos Office originales; la vista previa no se persiste.
- Convertir esta roadmap en el rediseño completo de tarjetas de la Tienda; eso es STORE-18.
- Retirar apps no documentales de Aula Store.
- Cambiar la versión del Site o publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Aula Documentos es la app canónica de la suite | Mantener cuatro editores equivalentes | Evita duplicar mantenimiento, datos, permisos y pruebas. |
| Apps antiguas como cáscaras compatibles durante la transición | Borrar sus rutas al empezar | Permite rollback y evita romper ventanas o enlaces existentes. |
| Alias de IDs y URLs hacia Aula Documentos | Cambiar enlaces sin transición | Conserva accesos guardados y automatizaciones. |
| Migración de `app_documents` sin borrar el origen | Sustituir el estado antiguo de golpe | Permite recuperar el documento original si algo falla. |
| Módulos compartidos en `shared` o `lib` | Anidar raíces de apps dentro de `aula-documentos/` | Las apps siguen existiendo hasta demostrar paridad. |
| Retirada física solo al final | Reorganizar carpetas primero | La mudanza no aporta paridad y complica la reversión. |
| STORE-18 separado para la ficha de suite | Incluir el rediseño completo en ADOC-13 | La retirada necesita una ficha mínima; el patrón reutilizable merece su propio bloque. |

## 4. Fases

### Fase 1 — Inventario de paridad y decisiones

- [x] Comparar funciones de Notas y documentos, Diagramas, Presentaciones y Visor Office con Aula Documentos.
- [x] Identificar huecos: editor Markdown de presentaciones, plantillas, exportación SVG por diagrama, apertura libre de Office, formatos y atajos.
- [x] Mapear estados de `app_documents`, rutas, IDs de ventana, permisos, MCP y enlaces profundos.
- [x] Decidir qué funciones pasan a Aula Documentos, cuáles se amplían y cuáles se retiran.
- [x] Documentar la matriz de paridad y el plan de reversión.
- **Criterios de aceptación:**
  - Cada función de las cuatro apps tiene una decisión: absorbida, ampliada o descartada.
  - No se retira ninguna app antes de completar la matriz.
  - Se conocen los datos, rutas y permisos que necesitan compatibilidad.

### Fase 2 — Notas y Diagramas completos en Aula Documentos

- [x] Cubrir todas las funciones de Notas y documentos dentro del editor de Aula Documentos.
- [x] Cubrir las funciones de Diagramas: edición, plantillas, códigos, errores, zoom, paneo, Gantt guiado y exportación SVG.
- [x] Resolver las diferencias de edición entre un bloque Mermaid y la app independiente.
- [x] Añadir pruebas de paridad y conservar la importación de datos antiguos.
- **Criterios de aceptación:**
  - Un usuario puede hacer en Aula Documentos todo lo que hacía en Notas y Diagramas.
  - Los datos existentes siguen abriendo y se pueden convertir sin pérdida.
  - Las funciones compartidas no duplican motores ni estilos.

### Fase 3 — Presentaciones y Office completos en Aula Documentos

- [x] Cubrir las funciones de Presentaciones: edición por diapositivas, temas, notas, vista previa, modo presentación y exportación.
- [x] Decidir y aplicar el modo de edición Markdown o equivalente para presentaciones.
- [x] Integrar una apertura estable de Office local en Aula Documentos, además de la vista previa de importación.
- [x] Mantener DOCX/PPTX de importación y exportación, tablas y avisos de fidelidad.
- [x] Añadir pruebas de paridad de presentación y Office.
- **Criterios de aceptación:**
  - Presentaciones y Visor Office no ofrecen ninguna función imprescindible fuera de Aula Documentos.
  - Los archivos Office se pueden previsualizar sin importarlos.
  - La exportación y el modo presentación siguen funcionando.

### Fase 4 — Migración, alias y compatibilidad

- [x] Migrar los estados de `app_documents` de Notas, Diagramas y Presentaciones conservando una copia del origen.
- [x] Mantener alias de IDs, URLs, ventanas, permisos y enlaces profundos hacia Aula Documentos.
- [x] Adaptar MCP y la matriz de permisos a la app unificada.
- [x] Ocultar las apps antiguas de la Tienda sin borrar sus datos ni sus rutas.
- [x] Probar instalaciones existentes, enlaces antiguos, invitados y rollback.
- **Criterios de aceptación:**
  - Los documentos antiguos se abren desde Aula Documentos sin pérdida.
  - Un enlace o ventana antigua no devuelve un error.
  - Se puede revertir la retirada antes de borrar los datos de origen.

### Fase 5 — Retirada, ficha y cierre

- [ ] Retirar las apps antiguas de `NATIVE_APP_IDS`, el catálogo, la Tienda y las rutas físicas.
- [ ] Mover a `shared` o `lib` lo que siga siendo común; no anidar raíces dentro de `aula-documentos/`.
- [ ] Actualizar la ficha mínima de Aula Documentos para que no anuncie apps retiradas; el rediseño completo queda en STORE-18.
- [ ] Actualizar ayuda, MCP, permisos, versiones y documentación; conservar el plan de reversión.
- [ ] Ejecutar suite completa, `tsc`, ESLint, build y presupuestos; revisar los cinco anchos y ambos temas.
- [ ] Actualizar changelog; archivar el roadmap, reiniciarlo y dejar en el backlog STORE-18 y DEV-01.
- [ ] Hacer commits locales por fase y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Las cuatro apps dejan de aparecer como instalables sin romper datos ni enlaces.
  - Aula Documentos es la única entrada documental de la suite.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Se borra una app antes de alcanzar paridad | Pérdida de funciones o datos | Matriz de paridad y retirada solo al final. |
| Los datos antiguos no migran | Documentos perdidos | Copia del origen, migración probada y rollback. |
| Enlaces o ventanas antiguas dejan de abrir | Accesos rotos | Alias de IDs y URLs hasta la retirada definitiva. |
| MCP o permisos cambian de ID | Automatizaciones rotas | Mapa de compatibilidad y pruebas de contrato. |
| Duplicar mantenimiento durante la transición | Coste alto y divergencia | Cáscaras finas y módulos compartidos. |
| La ficha de la Tienda sigue anunciando apps retiradas | Confusión | Actualización mínima en esta roadmap; rediseño en STORE-18. |
| El árbol de carpetas se mueve antes de tiempo | Ruido y riesgo de imports | Mudanza física solo en la fase de retirada. |

## 6. Notas de sesión

- 2026-11-19: ADOC-13 sale del backlog y pasa a ser el roadmap activo.
- ADOC-12 deja Office compartido, importación/exportación DOCX/PPTX y el visor reutilizable como base.
- STORE-18 queda en el backlog para la ficha reutilizable de apps-suites; ADOC-13 solo actualiza lo mínimo necesario.
- No se mueven raíces de apps ni se borran datos durante las primeras fases.
- El Site sigue en `1.1.36`; no se publica nada desde este roadmap.
- 2026-11-19: Fase 1 completada. Matriz de paridad y mapa de compatibilidad en [`docs/Store/apps/document-suite.md`](../../Store/apps/document-suite.md). Notas y documentos no tiene huecos funcionales; Diagramas necesita plantillas, Gantt guiado, detalle de errores, zoom/paneo y SVG por bloque; Presentaciones necesita edición Markdown de origen y plantillas; Visor Office necesita apertura libre de DOCX/XLSX/PPTX desde Aula Documentos. Mapeados `app_documents`, IDs, URLs, permisos, catálogo y los tres tools MCP de Diagramas. Ninguna app retirada ni dato borrado. No se ejecutan checks de código porque la fase es documental; se registra un commit local de la fase.
- 2026-11-19: Fase 2 completada. El bloque Mermaid de Aula Documentos incorpora Gantt guiado, selector completo de plantillas, salto a la línea del error, zoom/paneo, pantalla completa y exportación SVG por bloque. El modelo y el editor Gantt se movieron a `lib/domain/mermaid` y `app/board/shared/mermaid`, compartidos con la app Diagramas. Notas ya tenía paridad. Verificado en la app real: Gantt en modo Contenido, edición del título y vuelta a Código; SVG y pantalla completa presentes. Suite completa: 219 archivos / 1.540 pruebas; `tsc`, ESLint, build y presupuestos correctos. `diagramas` ajusta su techo a **379.000 B gzip** (378.062 B).
- 2026-11-19: Fase 3 completada. Aula Documentos añade Fuente Markdown con saltos de diapositiva, tres plantillas de presentación (breve, proyecto y blanca) y Abrir Office para DOCX/XLSX/PPTX sin importarlos. El visor reutiliza el componente compartido y se abre en un modal. Verificado en la app real: modal de Office con archivo local, fuente Markdown y plantillas. Suite completa: 219 archivos / 1.543 pruebas; `tsc`, ESLint, build, `perf:budget` y `perf:office` correctos.
- 2026-11-19: Fase 4 completada. Las cuatro apps documentales antiguas quedan ocultas en Tienda y escritorio, pero conservan IDs, filas de `app_documents`, rutas y declaraciones MCP. `resolveAppRouteId` canoniza sus URLs y comandos a `app=aula-documentos`; los enlaces antiguos abren Aula aunque la app antigua no esté instalada. La migración desde **Archivo > Migrar apps antiguas** guarda copias internas por origen y del Aula anterior, combina fuentes válidas sin borrar trabajo actual y permite `rollback` exacto. MCP de Diagramas lee y escribe el primer bloque Mermaid de Aula cuando existe; si no, mantiene la fila antigua. Verificado en la app real: `app=mermaid` abrió Aula con URL canónica, la Tienda mostró solo las apps visibles, la migración de Diagramas conservó el título y el rollback restauró estados idénticos en Aula y `mermaid`. Suite completa: 222 archivos / 1.564 pruebas; `tsc`, ESLint, build, `perf:budget` y `perf:office` correctos.
