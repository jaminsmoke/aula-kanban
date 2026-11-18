# Roadmap STORE-17 · Aula Documentos

> **Estado:** Activo · **Origen:** STORE-17 del backlog (2026-11-18)
> **Backlog:** DEV-01 pendiente · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Unificar **Notas y documentos**, **Diagramas** y **Presentaciones** en una app nueva, **Aula Documentos**, con id y almacén `aula-documentos`.
- [ ] Criterio de éxito: una persona crea un documento por proyecto con texto enriquecido y diagramas Mermaid, lo guarda, lo recupera, lo exporta y lo presenta; los documentos de las apps anteriores se pueden importar con vista previa, sin perder datos ni romper las apps que ya existen.

## 2. Alcance

**Dentro:**

- Crear `app/board/apps/aula-documentos/` como app de entrada y una base compartida reutilizable para modelo, validación, bloques y exportación.
- Un documento JSON por proyecto en `app_documents`, bajo la clave `aula-documentos`, separado de `documentos`, `mermaid` y `presentaciones`.
- Editor de texto enriquecido con Tiptap y un bloque Mermaid editable, con vista previa diferida y exportación HTML autónoma.
- Importación asistida de Notas y documentos, Diagramas y Presentaciones, con vista previa y sin escritura destructiva.
- Importación y exportación Markdown del subconjunto que el editor puede representar; Mermaid viaja como bloque cercado.
- Modo presentación con `reveal.js` diferido, diapositivas derivadas de saltos explícitos o de los títulos del documento.
- Invitados en solo lectura, ayuda, matriz MCP, ficha, portada y presupuesto de chunks.
- `AULA_STORE_VERSION` a `1.12.0`; el Site sigue en `1.1.35`.

**Fuera de alcance:**

- Retirar, ocultar o reescribir las apps actuales durante esta unificación. Siguen funcionando y conservan sus datos; su conversión a adaptadores finos se hará al retirarlas, en un roadmap posterior.
- Migración automática o destructiva de `documentos`, `mermaid` o `presentaciones`. La importación siempre es explícita, con vista previa y sin borrar el origen.
- Varios documentos por proyecto, carpetas de documentos o historial de versiones.
- Edición colaborativa en tiempo real, comentarios, control de cambios o concurrencia optimista.
- Imágenes, tablas, HTML arbitrario, archivos adjuntos, vídeo o contenido interactivo.
- Importar o exportar `.docx`, `.odt` o PDF.
- Herramientas MCP de contenido en la primera entrega. La app se abre y controla con las herramientas de ventanas; su superficie MCP queda como pendiente.
- Nueva tabla, endpoint o migración de base de datos.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `aula-documentos` como id, carpeta y clave de `app_documents` | Reutilizar `documentos` | Evita colisiones de instalación, datos y enlaces; permite convivencia y comparación durante la compatibilidad. |
| Tiptap JSON como única fuente de verdad | Markdown como fuente y HTML derivado | Conserva formato enriquecido y una sola historia de deshacer; Markdown queda como importación/exportación, no como segundo modelo editable. |
| Bloque Mermaid como nodo átomo dentro del documento | Una lista de editores independientes o un panel lateral separado | Mantiene un solo editor, un solo documento y una sola historia de cambios; el diagrama se mueve con el texto. |
| Esquema `{ schemaVersion: 1, title, content }` | Guardar HTML o el JSON del editor sin versión | Permite validar, migrar y rechazar datos futuros con un mensaje claro. |
| Núcleo en `lib/domain/aula-documentos/` y UI compartida en `app/board/shared/aula-documentos/` | Poner todo el núcleo dentro de `apps/aula-documentos/` | Las apps antiguas podrán adoptarlo sin imports entre apps; la app queda como entrada, composición y estilos. |
| `app_documents` con un JSON por proyecto | Tabla o endpoint propio | Ya existe persistencia, permisos y límite de 200.000 caracteres; no hace falta infraestructura nueva. |
| Límite local de 190.000 caracteres, 4.000 nodos, profundidad 24 y 12 bloques Mermaid | Confiar solo en el límite del servidor | Deja margen al sobre de la API y evita documentos que fallen al guardar. |
| Mermaid se carga con `import()` al insertar o previsualizar un diagrama | Incluir el motor en el chunk inicial | El editor debe abrir rápido; el diagrama solo necesita su motor cuando aparece. |
| `reveal.js` se carga con `import()` al abrir la presentación | Incluirlo en el editor | Presentar es una acción ocasional; no debe pesar en la edición diaria. |
| Diapositivas por `slideBreak` y, si no hay saltos, por títulos H1/H2 | Guardar una presentación aparte | Permite presentar el mismo documento sin duplicar contenido; los saltos explícitos conservan la intención de la app anterior. |
| Importación con vista previa y sin sobrescritura automática | Migrar al abrir o reemplazar el documento nuevo | Evita pérdidas y deja claro qué se copia y desde dónde. |
| Apps antiguas intactas hasta la retirada | Refactorizarlas ahora a adaptadores | La primera entrega prioriza paridad y seguridad; mezclar la migración de datos con la reescritura de las tres apps multiplica el riesgo. |
| Sin herramientas MCP de contenido en la primera entrega | Leer y guardar el documento desde MCP antes de tener paridad | El contrato MCP se añadirá cuando el modelo y la migración estén cerrados; ahora solo se abre la ventana. |
| `AULA_STORE_VERSION` 1.12.0 | Mantener 1.11.0 | Añadir una app es una capacidad nueva de la Tienda. |

### Estructura prevista

```text
lib/domain/aula-documentos/       esquema, límites, validación, Markdown e importadores
app/board/shared/aula-documentos/ editor, extensión Mermaid, presentación y exportación
app/board/apps/aula-documentos/   entrada, toolbar, composición y CSS
public/store/aula-documentos.svg  portada cuando llegue la integración
```

La app sigue el registro plano de `NATIVE_APPS` y no importa código de `documentos`, `mermaid` o `presentaciones`. Las apps antiguas tampoco importan la app nueva; cuando se conviertan en adaptadores usarán la base compartida.

## 4. Fases

### Fase 1 — Fundación, esquema e importadores

- [x] Crear la base pura de `aula-documentos`: tipos, esquema versionado, límites, normalización de enlaces y validación defensiva.
- [x] Definir el nodo `mermaidBlock` y reservar `slideBreak` en el esquema, aunque la interfaz de presentación llegue después.
- [x] Implementar lectores de `documentos`, `mermaid` y `presentaciones` que produzcan una vista previa del documento unificado sin escribir en el origen.
- [x] Medir el peso inicial del editor y el coste de Mermaid y `reveal.js` antes de integrarlos.
- [x] Añadir pruebas de esquema, datos antiguos, límites, enlaces, nodos desconocidos y documentos corruptos.
- **Criterios de aceptación:**
  - Los tres formatos antiguos se pueden leer y describir sin modificar sus datos.
  - Un documento inválido, demasiado grande o de una versión futura se rechaza con un error explícito.
  - No hay tablas, endpoints ni migraciones nuevas; las apps antiguas no cambian.
  - El presupuesto inicial queda documentado y el motor Mermaid no está en el chunk del editor.

### Fase 2 — Editor v1: texto enriquecido y Mermaid

- [x] Crear la app y el editor con título, texto enriquecido y el bloque Mermaid editable.
- [x] Permitir insertar, editar, mover y eliminar bloques Mermaid; mostrar vista previa con retardo y error de sintaxis.
- [x] Guardar y recuperar el documento en `app_documents` con validación previa, estado de cambios y recuperación de errores.
- [x] Exportar HTML autónomo con el texto y los diagramas renderizados como SVG, sin recursos externos.
- [x] Aplicar modo lectura para invitados, foco, teclado, contraste, reducción de movimiento y diseño a 1366, 1024 y 390 px.
- [x] Cubrir el editor con pruebas de creación, guardado, recuperación, límites, Mermaid inválido y exportación.
- **Criterios de aceptación:**
  - Se crea un documento con texto y al menos dos diagramas, se guarda y se recupera completo.
  - Un invitado lo consulta sin poder editarlo ni guardarlo.
  - El HTML se abre sin red y conserva texto, enlaces y diagramas; si Mermaid falla, el código queda visible.
  - Mermaid se descarga solo al aparecer el primer bloque, dentro del presupuesto acordado.
  - La app antigua `documentos` sigue abriendo y guardando con normalidad.

### Fase 3 — Importación y Markdown

- [ ] Añadir importación asistida de `documentos` y `mermaid` con vista previa, confirmación y protección contra sobrescrituras.
- [ ] Importar y exportar Markdown del subconjunto soportado: títulos, párrafos, listas, citas, código, enlaces, énfasis y bloques Mermaid.
- [ ] Ofrecer vista previa antes de reemplazar el documento actual y un mensaje claro si el Markdown queda fuera del subconjunto.
- [ ] Mantener una sola fuente de verdad: el Markdown no se edita en paralelo al documento Tiptap.
- [ ] Probar ida y vuelta, documentos antiguos con formato, diagramas importados y Markdown inválido.
- **Criterios de aceptación:**
  - Un documento de Notas y documentos se importa con su formato y se puede guardar en `aula-documentos`.
  - Un diagrama de Diagramas se importa como bloque Mermaid y se puede editar.
  - La importación nunca borra ni modifica los datos de la app de origen.
  - Exportar a Markdown y volver a importar conserva el contenido representable.

### Fase 4 — Presentación y migración de Presentaciones

- [ ] Añadir saltos de diapositiva y modo presentación con `reveal.js` diferido.
- [ ] Derivar diapositivas de `slideBreak` y, si no hay saltos, de los títulos H1/H2; definir el comportamiento de los diagramas dentro de una diapositiva.
- [ ] Importar `presentaciones` con vista previa, convirtiendo `---` en saltos y Markdown en contenido editable.
- [ ] Cubrir teclado, foco, salida de la presentación, contenido largo y documentos sin títulos.
- **Criterios de aceptación:**
  - El mismo documento se presenta sin duplicarlo ni convertirlo en otra app.
  - Una presentación antigua se importa con diapositivas, listas, citas y código.
  - `reveal.js` se carga solo al presentar y no aparece en el chunk inicial.
  - La app antigua `presentaciones` sigue funcionando y conserva sus datos.

### Fase 5 — Integración, compatibilidad y cierre

- [ ] Añadir `aula-documentos` a `NATIVE_APP_IDS`, `NATIVE_APPS`, `registry.tsx` y `FEATURED_APP_IDS`.
- [ ] Crear portada, ficha con versión y upstream, y entrada en «Mejores aplicaciones».
- [ ] Declarar su superficie MCP como pendiente y actualizar ayuda, matriz de herramientas, catálogo y snapshots.
- [ ] Elevar `AULA_STORE_VERSION` a `1.12.0` y documentar la convivencia de las tres apps antiguas.
- [ ] Ejecutar pruebas, `tsc`, ESLint, build y `perf:budget`; actualizar `docs/Store/apps/integradas.md`.
- [ ] Archivar este roadmap, pasar su resumen al changelog, reiniciar `developing/roadmap.md` y dejar DEV-01 en el backlog.
- **Criterios de aceptación:**
  - La app aparece en Aula Store, se instala y abre; la ficha muestra la versión y el upstream correctos.
  - Las importaciones de las tres apps funcionan con datos reales y sin tocar los originales.
  - Las apps antiguas siguen instalables, se pueden abrir y editar; no se oculta ninguna.
  - La ayuda y la matriz MCP explican que no hay herramientas de contenido en esta entrega.
  - Suite completa, tipos, lint, build y presupuesto en verde; sin publicación ni cambio de versión del Site.

## 5. Presupuesto de carga

El objetivo se revisa en la fase 1 y se cierra en la fase 5. Las cifras son límites de trabajo, no una promesa de red real.

| Flujo | Objetivo |
|---|---:|
| Editor inicial, sin Mermaid ni presentación | ≤ 180 KB gzip |
| Primer bloque Mermaid, descarga adicional | ≤ 350 KB gzip |
| Modo presentación, descarga adicional | ≤ 60 KB gzip |
| Peticiones a otros orígenes | 0 |
| Fuentes externas o workers del editor | 0 |
| Documento guardado | ≤ 190.000 caracteres y ≤ 4.000 nodos |

- El chunk del editor no incluye Mermaid ni `reveal.js`.
- La exportación HTML no referencia CDN, fuentes ni workers externos.
- Si una medición supera el objetivo, se ajusta el diseño antes de cerrar la fase, no se maquilla el número.

**Línea base medida el 2026-11-18:** `documentos-app` 131,3 KB gzip + CSS 1,9 KB; el flujo inicial de Diagramas con Mermaid 317,5 KB gzip; `presentaciones-app` 35,2 KB gzip + CSS 12,9 KB. Son la referencia para el editor (≤ 180 KB), el primer diagrama (≤ 350 KB) y la presentación diferida (≤ 60 KB).

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El bloque Mermaid dentro de Tiptap rompe deshacer, selección o pegado | Edición incómoda o pérdida de cambios | Nodo átomo con NodeView estable, pruebas de teclado y límites de código; el código queda en el JSON, no en el DOM. |
| Un documento grande bloquea el guardado | Pérdida de trabajo | Validación local antes de enviar, límite de 190.000 caracteres, 12 diagramas y mensaje claro; el servidor conserva su límite de 200.000. |
| La importación pisa el documento nuevo | Pérdida de datos | Vista previa, confirmación explícita y prohibición de sobrescribir un documento no vacío sin confirmación. |
| Las apps antiguas y la nueva divergen | Doble mantenimiento y confusión | Mantenerlas intactas durante la compatibilidad; el núcleo compartido se usa en la retirada, no se copia la lógica nueva en las antiguas. |
| Mermaid o `reveal.js` entran en el chunk inicial | Arranque lento | Importaciones dinámicas por acción y medición en cada fase. |
| El contenido de Mermaid ejecuta HTML o enlaces peligrosos | Riesgo de seguridad | `securityLevel: strict`, sin HTML en el documento, enlaces normalizados y pruebas de código malicioso. |
| La presentación no conserva la intención de la app anterior | Migración confusa | Vista previa, conversión de `---` a saltos y conservación de títulos, listas, citas y código; nunca migración automática. |
| El nuevo id choca con la app `documentos` | Datos o instalación mezclados | Id, carpeta y clave `aula-documentos` separados; pruebas de convivencia. |

## 7. Notas de sesión

- 2026-11-18: STORE-17 sale del backlog y pasa a ser el roadmap activo. Se mantiene `aula-documentos` como id y almacén, un documento por proyecto y la primera fusión texto enriquecido + Mermaid.
- 2026-11-18: Fase 1 completada. `lib/domain/aula-documentos/` contiene el esquema v1, los límites, la validación de texto, enlaces, `mermaidBlock`, `slideBreak`, nodos y profundidad, y los lectores de Notas y documentos, Diagramas y Presentaciones con vista previa sin escribir en el origen. La base admite 190.000 caracteres, 4.000 nodos, 100.000 de texto y 12 diagramas. 12 pruebas focalizadas y 1.312 en la suite completa; `tsc` y ESLint en verde. No se tocaron apps, tablas ni endpoints.
- 2026-11-18: Fase 2 completada. Editor Tiptap con bloque Mermaid editable, vista previa con retardo, inserción, borrado, guardado/recuperación en `aula-documentos`, exportación HTML con SVG y fallback de código, modo invitado y revisión 1366/1024/390. La prueba local de persistencia usó una aceptación temporal del id en el API, retirada antes del commit; el registro de la app sigue en la fase 5. El editor inicial mide ~147 KB gzip y la primera carga de Mermaid ~290 KB gzip, dentro del presupuesto. 11 pruebas focalizadas y 1.323 en la suite completa; `tsc` y ESLint en verde.
- La estructura del backlog se ajusta: el núcleo puro va a `lib/domain/aula-documentos/` y la UI compartida a `app/board/shared/aula-documentos/`, para que las apps antiguas puedan adoptarlo sin imports entre apps.
- Las apps `documentos`, `mermaid` y `presentaciones` no se modifican en esta entrega. Se conservan como compatibilidad y su conversión a adaptadores finos queda para el roadmap de retirada.
- No se añaden herramientas MCP de contenido, imágenes, tablas ni edición colaborativa en esta primera unificación.
- La demo no se toca y el Site sigue en `1.1.35` sin publicación.
