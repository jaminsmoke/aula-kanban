# Presentación, estructura de diapositivas y PDF de Aula Documentos

> **Estado:** Fases 1–3 cerradas · **Fecha:** 2026-11-21
> **Alcance:** estructura editable, notas, presentador, ajustes de página y PDF.
> **Roadmap:** [`roadmap.md`](roadmap.md) · **Suite:** [`aula-documentos-suite.md`](aula-documentos-suite.md)
> **Regla:** esta fase no mueve código de producto; fija el contrato y los límites.

---

## 1. Decisión

La presentación sigue teniendo **una sola fuente**: el documento Tiptap activo.

- `buildPresentationSlides` sigue siendo la única función que agrupa bloques en diapositivas.
- La estructura editable no guarda una lista paralela de diapositivas: reordenar, duplicar y eliminar transforman bloques reales del documento.
- Las notas del orador permanecen en `presentation.notes` y se remapean junto con la estructura.
- El presentador, la vista previa, el PDF y PPTX consumen las mismas diapositivas y el mismo HTML.
- Los ajustes de página son opcionales, tienen defaults y no obligan a migrar documentos existentes.
- El PDF se obtiene del HTML imprimible; no se añade un servicio externo.

## 2. Punto de partida

| Área | Estado actual |
|---|---|
| Agrupación | `buildPresentationSlides` divide por `slideBreak` o por H1/H2. |
| Navegador | ADOC-18 muestra número, título y salto al bloque; no edita la estructura. |
| Notas | `presentation.notes` se indexa por número de diapositiva, con un máximo de 5.000 caracteres por nota y 20.000 en total. |
| Vista previa | Muestra el HTML de cada diapositiva y permite anterior/siguiente; abre en la diapositiva activa. |
| Presentador | Reveal.js a pantalla completa; el botón **Notas** muestra solo las notas de la diapositiva actual. |
| Impresión/PDF | `buildAulaDocumentHtml` y `printHtmlDocument` abren el diálogo de impresión del navegador. |
| HTML de presentación | `buildAulaPresentationHtml` usa `page-break-after: always` y un `@media print` básico; incluye notas en un `details`. |
| PPTX | `exportAulaPptx` reutiliza `buildPresentationSlides`, incrusta imágenes y añade notas por diapositiva. |
| Limitación | No hay reordenar, duplicar ni eliminar; no hay ajustes de página ni vista de siguiente diapositiva. |

## 3. Contrato de estructura

```ts
export type AulaSlideStructure = {
  index: number;
  title: string;
  from: number;
  to: number;
  blockCount: number;
  notes: string;
  explicit: boolean;
};
```

- `from` y `to` son posiciones Tiptap del **contenido** de la diapositiva; `to` es exclusivo.
- Los nodos `slideBreak` son separadores: no forman parte del contenido ni se duplican como contenido.
- `title` se calcula con la misma regla que `buildPresentationSlides`.
- `notes` es el texto actual de `presentation.notes[String(index)]` o una cadena vacía.
- `explicit` indica si el documento ya usa saltos explícitos.
- El estado vacío sigue siendo una diapositiva de respaldo; nunca se muestra una estructura sin diapositivas.
- La estructura no se persiste ni se guarda como índice del documento.

### 3.1 Materialización de saltos

Si el documento no tiene `slideBreak`, la primera operación estructural materializa los límites actuales como nodos `slideBreak` en una sola transacción. Así se conserva la agrupación que el usuario ya ve y las operaciones posteriores no dependen de mover títulos H1/H2.

La materialización:

- Solo ocurre al confirmar una operación, nunca al abrir el panel.
- No cambia los títulos ni el contenido visible.
- Puede deshacerse mediante el historial de estructura.
- Se prueba antes de mover, duplicar o eliminar.

### 3.2 Operaciones

| Operación | Contenido | Notas |
|---|---|---|
| Mover | Mueve el rango de contenido y reubica los separadores necesarios. | Las notas viajan con la diapositiva. |
| Duplicar | Clona los bloques y crea un separador para la copia. | La copia recibe una copia de la nota; las siguientes notas se desplazan. |
| Eliminar | Elimina los bloques y un separador adyacente. | Elimina la nota y desplaza las siguientes. |
| Deshacer estructura | Restaura el snapshot anterior de contenido, notas y selección. | Es independiente de la pila nativa de Tiptap. |
| Deshacer editor | La pila nativa de Tiptap sigue actuando sobre el contenido. | No se promete que `Ctrl+Z` restaure las notas por separado. |

Reglas comunes:

- Las operaciones destructivas piden confirmación; en modo lectura no se ofrecen.
- El contenido y las notas se actualizan como una sola acción de producto.
- Se conserva la diapositiva activa cuando sea posible; si se elimina, se selecciona la anterior o la primera.
- La estructura mantiene un historial de sesión de hasta 20 operaciones para deshacer contenido y notas juntos. No se persiste.
- Cualquier operación que no pueda aplicarse sin perder bloques falla cerrada y no cambia el documento.

### 3.3 Remapeo de notas

Las notas se guardan por índice `"0"`, `"1"`, … y se normalizan a índices consecutivos después de cada operación:

- Mover `0 → 2`: las notas se reordenan con las diapositivas.
- Duplicar `1`: la copia ocupa el índice siguiente y recibe una copia de la nota original.
- Eliminar `1`: se elimina su nota; las notas posteriores bajan un índice.
- Claves fuera del rango resultante se descartan.
- Las notas vacías no se guardan; se respetan los límites actuales de longitud.

## 4. Contrato del presentador

- Reutiliza el HTML ya construido y el mismo índice de diapositivas; no hace un segundo render.
- La vista de presentador muestra:
  - notas de la diapositiva actual;
  - vista previa de la siguiente diapositiva;
  - número actual y total;
  - aviso de última diapositiva cuando no hay siguiente.
- Se abre desde la presentación con un control visible; `N` no se reserva porque reveal.js ya usa el teclado para navegar.
- Mantiene los controles existentes de reveal.js y añade sus propios botones accesibles.
- `Escape` sale de la presentación; el foco vuelve al control que la abrió.
- En pantallas estrechas, notas y siguiente diapositiva se apilan sin tapar la diapositiva actual.
- Las notas privadas no se muestran en el PDF por defecto; sí se conservan en HTML y PPTX.

## 5. Contrato de página y PDF

### 5.1 Modelo opcional

```ts
export type AulaPrintPage = {
  size: "a4" | "letter";
  orientation: "portrait" | "landscape";
  margin: "normal" | "narrow" | "none";
  slideNumbers: boolean;
};

export const DEFAULT_AULA_PRINT_PAGE: AulaPrintPage = {
  size: "a4",
  orientation: "portrait",
  margin: "normal",
  slideNumbers: false,
};
```

- Se añadirá como campo opcional `presentation.page`.
- Los documentos existentes abren con `DEFAULT_AULA_PRINT_PAGE`; no hay migración obligatoria ni cambio de `schemaVersion`.
- La validación descarta valores desconocidos y conserva los defaults.
- Los ajustes se guardan con el documento, igual que el tema y las notas.

### 5.2 Impresión y PDF

- **Documento:** usa `buildAulaDocumentHtml` con tamaño, orientación y márgenes; conserva la paginación por contenido.
- **Presentación:** usa `buildAulaPresentationHtml`; cada diapositiva ocupa una página, con salto explícito y sin partir su contenido.
- El HTML incrusta imágenes y SVG de Mermaid; si un recurso falla, se muestra un aviso visible y no se enlaza a la red.
- Las notas del orador no se imprimen por defecto. Se mantienen en el HTML exportado y en las notas de PPTX.
- La numeración de diapositivas es opcional y no altera el contenido.
- El PDF se abre desde el diálogo nativo del navegador; no se añade dependencia de generación de PDF.
- Se prueban tamaños, orientaciones, márgenes, saltos, tablas, imágenes, diagramas y ausencia de recursos externos.

## 6. Teclado y accesibilidad

| Acción | Control |
|---|---|
| Mover diapositiva | Botones subir/bajar con etiqueta y posición anunciada. |
| Duplicar/eliminar | Botones con confirmación en eliminar. |
| Deshacer estructura | Botón visible en la vista de estructura; no depende de `Ctrl+Z`. |
| Abrir/cerrar presentador | Botón visible; conserva navegación de reveal.js. |
| Salir | `Escape` cierra presentador o presentación. |

- Los botones usan `button`, foco visible y etiquetas que incluyen el número y el título.
- El estado activo usa `aria-current` cuando corresponda.
- El foco vuelve al control de origen al cerrar el presentador.
- La estructura y el presentador se revisan en cinco anchos y con lector de pantalla básico.

## 7. Límites y exclusiones

- No se guarda una lista de diapositivas paralela al documento.
- No se añaden transiciones, animaciones ni diseños de diapositiva nuevos.
- No se editan notas en el PDF ni se convierten en contenido visible.
- No se añade colaboración, comentarios ni historial de versiones.
- No se cambia el esquema de nodos Tiptap ni se introducen nodos de diapositiva nuevos.
- No se publica ni se aplican migraciones remotas desde este roadmap.

## 8. Matriz de pruebas

| Caso | Debe demostrar |
|---|---|
| Estructura sin saltos | Materializa los límites una vez y conserva títulos, contenido y orden. |
| Estructura con saltos | Mueve, duplica y elimina sin crear diapositivas vacías inesperadas. |
| Notas | Reordenar, duplicar, eliminar y deshacer mantienen la nota con su diapositiva. |
| Diapositiva única | Eliminar la última deja una diapositiva vacía válida. |
| Muchas diapositivas | 60 diapositivas mantienen índices, notas y rendimiento. |
| Modo lectura | No aparecen acciones de estructura ni cambios. |
| Presentador | Muestra notas, siguiente diapositiva, última diapositiva y sale con `Escape`. |
| PDF | Tamaño, orientación, márgenes, saltos y recursos locales se aplican sin red. |
| Documentos antiguos | Abren con defaults y conservan notas, tema y contenido. |
| PPTX | Conserva diapositivas, notas, imágenes, tablas y diagramas existentes. |

## 9. Criterio de salida de la Fase 1

- Contrato de estructura, notas, presentador, página y PDF cerrado.
- Decisión de materialización de saltos y remapeo de notas documentada.
- Ajustes opcionales y defaults compatibles definidos.
- Matriz de pruebas y límites explícitos.
- Sin cambios de código, datos, URLs, permisos ni versión del Site.

## 10. Cierre de la Fase 2

Implementado el 2026-11-21:

- `slide-structure.ts` lee las diapositivas y sus notas, reconstruye el contenido con saltos explícitos y selecciona el bloque resultante.
- `useAulaSlideStructure` aplica mover, duplicar y eliminar; remapea notas; evita operaciones en lectura y mantiene historial de sesión para deshacer contenido y notas juntos.
- `DocumentNavigator` añade acciones accesibles de subir, bajar, duplicar y eliminar, además de **Deshacer**.
- La primera operación materializa los límites actuales como `slideBreak`; después la estructura es estable e independiente de los títulos.
- Las pruebas cubren reordenar, duplicar, eliminar, cancelar la confirmación, deshacer, notas que viajan con la diapositiva, modo lectura, diapositiva única y 60 diapositivas.
- Suite: **258 archivos / 1.709 pruebas**; build **377.647 B**; presupuesto **379.000 B**.

## 11. Cierre de la Fase 3

Implementado el 2026-11-21:

- `PresentationView` incorpora **Presentador**: panel lateral con notas actuales, número de diapositiva, siguiente diapositiva renderizada con el mismo HTML y aviso de última diapositiva.
- El panel no hace un segundo render: reutiliza `slides[activeSlide + 1]` construido para la presentación.
- En escritorio comparte espacio con reveal.js; en pantallas estrechas se apila debajo y el deck se recoloca con `layout()`.
- El foco y `Escape` siguen delegados en `useDialogFocus`; el botón tiene `aria-pressed` y el panel `aria-label`.
- Notas vacías y última diapositiva tienen estados explícitos.
- Pruebas de notas, siguiente diapositiva, última diapositiva, ausencia de notas y salida con `Escape`.
- Suite: **258 archivos / 1.711 pruebas**; build **377.634 B**; presupuesto **379.000 B**.
