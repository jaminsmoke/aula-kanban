# Búsqueda, esquema y navegación de Aula Documentos

> **Estado:** Fase 1 de ADOC-18 · **Fecha:** 2026-11-21
> **Alcance:** contrato de búsqueda, reemplazo, esquema, diapositivas, enfoque y barra de estado.
> **Roadmap:** [`roadmap.md`](roadmap.md) · **Suite:** [`aula-documentos-suite.md`](aula-documentos-suite.md)
> **Regla:** esta fase no mueve código de producto; fija el contrato y los límites.

## 1. Decisión

La navegación trabaja sobre el **documento Tiptap activo**, no sobre el JSON serializado ni sobre el DOM.

- La búsqueda se calcula desde el texto visible de los nodos.
- El esquema se deriva de los títulos reales H1–H3.
- Las diapositivas se derivan de la misma agrupación que usa la presentación.
- La barra de estado se calcula desde el editor y el guardado existente.
- No hay índice persistente ni búsqueda entre documentos de la suite.

## 2. Punto de partida

| Área | Estado actual |
|---|---|
| Búsqueda | No existe búsqueda interna; solo `Ctrl+F` del navegador. |
| Reemplazo | No existe. |
| Títulos | StarterKit permite H1–H3; no hay esquema ni salto. |
| Diapositivas | `buildPresentationSlides` agrupa por `slideBreak` o H1/H2; la vista previa permite anterior/siguiente, pero no hay navegador. |
| Barra de estado | Muestra palabras, diagramas y estado de guardado; no la sección actual. |
| Enfoque | No existe modo enfoque. |
| Teclado | `Ctrl/Cmd+S` guarda; menús y diálogos tienen foco y Escape. No hay atajos de búsqueda, esquema o enfoque. |
| Suite | ADOC-17 dejó documento activo, URL `doc`, MCP y copias por documento. |

Suite: **252 archivos / 1.689 pruebas**. Aula: **372.018 / 373.000 B gzip**. Site: `1.1.37`.

## 3. Contrato de búsqueda

### 3.1 Consulta

```ts
type AulaSearchOptions = {
  query: string;
  caseSensitive: boolean;
  diacriticsSensitive: boolean;
};
```

- `query` se recorta y debe tener al menos **2 caracteres visibles** para buscar.
- Por defecto, la búsqueda **no distingue mayúsculas ni acentos**.
- Los toggles de mayúsculas y acentos se aplican sin reconstruir el documento.
- Una consulta vacía limpia resultados y decoraciones.
- No se busca dentro de textos de UI, atributos, URLs ni bloques Mermaid como SVG; sí en el texto legible de párrafos, títulos, listas, tablas, citas y bloques de código.

### 3.2 Resultado

```ts
type AulaSearchMatch = {
  index: number;
  from: number;
  to: number;
  text: string;
  before: string;
  after: string;
};
```

- `from`/`to` son posiciones del documento Tiptap, no índices del JSON.
- `before`/`after` son contexto plano de hasta 40 caracteres para la lista.
- El resultado activo se resalta y se desplaza a la vista.
- La lista muestra `resultado actual / total` y anuncia cambios con `aria-live="polite"`.

### 3.3 Reemplazo

- `replaceCurrent` sustituye el resultado activo.
- `replaceAll` sustituye todas las coincidencias en una sola transacción.
- El reemplazo usa transacciones Tiptap; no manipula el DOM ni el JSON directamente.
- El texto escrito se inserta literalmente y conserva las marcas que rodean la coincidencia cuando sea posible.
- Si una coincidencia cruza varios nodos, se reemplaza solo el texto visible y se conserva la estructura; si no se puede garantizar, se aborta con un aviso y no se modifica nada.
- `Deshacer` recupera el documento anterior; la búsqueda se recalcula tras el cambio.
- No se reemplaza dentro de atributos, URLs, imágenes, Mermaid renderizado ni UI.

## 4. Contrato del esquema

```ts
type AulaOutlineEntry = {
  level: 1 | 2 | 3;
  text: string;
  from: number;
  to: number;
  children: AulaOutlineEntry[];
};
```

- Se construye recorriendo los nodos `heading` de nivel 1–3.
- Un título vacío se omite.
- La jerarquía se anida por nivel; un salto de H1 a H3 conserva el H3 como hijo del H1.
- La sección activa es el último título cuya posición sea anterior a la selección.
- Sin títulos, el panel muestra un estado vacío y no crea un índice artificial.
- El esquema se recalcula al cambiar el documento o moverse la selección; no se persiste.

## 5. Contrato de diapositivas

- La fuente única es la agrupación de `buildPresentationSlides`.
- La vista de estructura necesitará `index`, `title`, `from` y `to` para cada diapositiva.
- Si hay `slideBreak`, cada salto crea una diapositiva.
- Sin saltos, cada H1/H2 inicia una diapositiva.
- El título sale del primer heading o párrafo con texto; si no hay, se usa `Diapositiva N`.
- El navegador y la vista previa muestran el mismo número y título.
- Saltar a una diapositiva mueve la selección al inicio de su bloque y no cambia el contenido.

## 6. Enfoque y barra de estado

### Enfoque

- El modo enfoque oculta paneles laterales y cromo no esencial con una clase de vista.
- Se entra y sale con un atajo y con un botón visible; `Escape` también sale.
- El estado es de sesión: no se guarda en `AulaDocument` ni en el servidor.
- Al salir, el foco vuelve al control que abrió el modo.

### Barra de estado

- Palabras y diagramas: los contadores existentes.
- Sección actual: título del esquema activo o `Sin sección`.
- Guardado: estado ya existente (`Guardando`, `Guardado`, `Cambios sin guardar`, conflicto o error).
- La barra no duplica el chip de guardado; lo reutiliza.

## 7. Teclado y accesibilidad

| Atajo | Acción |
|---|---|
| `Ctrl/Cmd+F` | Abrir búsqueda y enfocar la consulta. |
| `Enter` / `Shift+Enter` | Siguiente / anterior resultado. |
| `Escape` | Cerrar búsqueda, salir de enfoque o volver al editor. |
| `Ctrl/Cmd+H` | Abrir búsqueda con reemplazo visible. |
| `Ctrl/Cmd+Shift+O` | Mostrar u ocultar esquema. |
| `Alt+Shift+F` | Alternar enfoque. |

- Los atajos solo se interceptan cuando el foco está en Aula Documentos o el diálogo de búsqueda.
- No se pisan los atajos nativos del navegador fuera del ámbito de la app.
- Los resultados, el esquema y las diapositivas usan `button`/`listbox`/`aria-current` coherentes.
- El foco se restaura al editor o al control de origen al cerrar paneles.
- En móvil, búsqueda y esquema se abren como panel o diálogo, no como una barra inaccesible.

## 8. Límites y exclusiones

- No hay búsqueda global entre documentos de la suite.
- No hay índice persistente, búsqueda semántica ni IA.
- No se cambia el esquema de `AulaDocument` ni se añaden posiciones al JSON guardado.
- No se modifica la presentación ni la exportación PDF; ADOC-19 las revisa por separado.
- Al cambiar de documento se cierra la búsqueda y se reconstruyen esquema y diapositivas del documento nuevo.
- La búsqueda no altera el autosave hasta que se confirma un reemplazo.

## 9. Matriz de pruebas

| Caso | Debe demostrar |
|---|---|
| Consulta corta o vacía | No crea resultados ni decoraciones. |
| Mayúsculas/acentos | Los toggles cambian el conjunto de resultados. |
| Muchas coincidencias | Navegación y recuento correctos. |
| Reemplazo simple | Solo cambia la coincidencia y conserva marcas. |
| Reemplazo en tabla/lista | No rompe la estructura. |
| Reemplazo de todo | Una transacción y deshacer recupera el estado. |
| Esquema vacío | Estado vacío, sin saltos falsos. |
| Títulos repetidos/saltados | Jerarquía y salto correctos. |
| Diapositivas con y sin saltos | Navegador y vista previa coinciden. |
| Teclado y móvil | Búsqueda, esquema y enfoque se abren, navegan y cierran con foco correcto. |

## 10. Criterio de salida de la Fase 1

- Contrato de búsqueda, resultados y reemplazo cerrado.
- Modelo de esquema y diapositivas documentado.
- Atajos, enfoque, barra de estado y accesibilidad definidos.
- Límites de la suite y de ADOC-19 explícitos.
- Sin cambios de código, datos, URLs, permisos ni versión del Site.
