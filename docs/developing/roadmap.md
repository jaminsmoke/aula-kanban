# Roadmap ADOC-11 · Diagramas: lienzo y editor

> **Estado:** Activo · **Origen:** ADOC-11 del backlog (2026-11-19)
> **Backlog:** Hoja de cálculo y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Convertir la vista previa de Diagramas en un lienzo claro, navegable y legible, y mejorar el editor sin añadir un editor pesado.
- [ ] Criterio de éxito: el diagrama se ve completo al abrir, el zoom y el paneo funcionan con ratón, tacto y teclado, y los errores indican la línea y el detalle sin sacar al usuario del editor.

## 2. Alcance

**Dentro:**

- Lienzo claro independiente del tema de la interfaz.
- Ajuste automático inicial y sin recortes ni scroll horizontal.
- Zoom, paneo, reinicio y pantalla completa con controles accesibles.
- Números de línea, resaltado ligero y errores de sintaxis con línea y detalle.
- Revisión de la exportación SVG con nombre legible, ya incorporada en ADOC-10.
- Medición del coste de cada fase con `perf:budget`.

**Fuera de alcance:**

- Cambiar el formato guardado del diagrama o el contrato de `app_documents`.
- Sustituir Mermaid, su parser o su motor de render.
- Confirmaciones de cargar/limpiar y permisos de invitado; ya pertenecen a ADOC-10.
- Un editor colaborativo o un IDE completo.
- Cambiar la versión del Site, `AULA_STORE_VERSION` o publicar en Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Lienzo blanco con tokens `--doc-*` | Heredar el tema oscuro de la interfaz | El diagrama debe leerse igual en cualquier tema. |
| Ajuste calculado con el `viewBox` y el tamaño del contenedor | Ancho fijo o `max-width` del SVG | Evita recortes y deja espacio vacío controlado. |
| Transformación CSS de zoom y desplazamiento | Volver a generar el SVG con otro tamaño | Mantiene el SVG y permite controles fluidos. |
| Pantalla completa dentro de la ventana | Depender siempre de la Fullscreen API | No requiere permisos del navegador y conserva el contexto de la app. |
| Textarea con capa de resaltado y gutter | CodeMirror o Monaco | El presupuesto actual no admite otro editor pesado. |
| Reutilizar `formatMermaidError` | Parsear mensajes en cada componente | Ya extrae línea y detalle de Mermaid. |
| Mantener el nombre SVG de ADOC-10 | Volver al `projectId` | La exportación ya es identificable. |

## 4. Fases

### Fase 1 — Lienzo claro y ajuste inicial

- [x] Aplicar un fondo claro y tokens de contenido al lienzo, independiente del tema.
- [x] Calcular un zoom inicial que encaje el SVG en el espacio disponible.
- [x] Eliminar el scroll horizontal y el recorte inicial a 390, 1024 y 1366 px.
- [x] Cubrir con pruebas el cálculo de ajuste y el render sin contenido.
- **Criterios de aceptación:**
  - El diagrama cabe completo al abrir en los tres anchos.
  - El lienzo mantiene contraste y legibilidad en tema claro y oscuro.
  - No aparece scroll horizontal en el contenedor de la vista previa.

### Fase 2 — Zoom, paneo y pantalla completa

- [x] Añadir controles de acercar, alejar, reiniciar y pantalla completa.
- [x] Implementar arrastre y rueda/pinza con límites de zoom y desplazamiento.
- [x] Soportar teclado: `+`, `-`, `0`, flechas y Escape.
- [x] Añadir una vista de pantalla completa dentro de la ventana con foco y cierre accesibles.
- [x] Cubrir con pruebas las acciones de teclado y los límites de navegación.
- **Criterios de aceptación:**
  - El zoom y el paneo funcionan con ratón, tacto y teclado.
  - Reiniciar recupera el ajuste inicial.
  - Escape sale de pantalla completa y devuelve el foco.

### Fase 3 — Editor, números de línea y errores

- [ ] Añadir un gutter de números de línea sincronizado con el scroll del textarea.
- [ ] Añadir resaltado ligero sin romper la edición, el foco ni la selección.
- [ ] Mostrar errores con línea, resumen y detalle completo; permitir saltar a la línea.
- [ ] Revisar la exportación SVG y su nombre legible como regresión.
- [ ] Medir el tamaño del chunk y ajustar el resaltado si supera el presupuesto.
- **Criterios de aceptación:**
  - Números y texto permanecen alineados al escribir y desplazar.
  - Un error de sintaxis indica línea y detalle sin ocultar el editor.
  - El SVG exportado sigue siendo legible y conserva su nombre identificable.
  - `perf:budget` sigue en verde.

### Fase 4 — Verificación y cierre

- [ ] Revisar 390, 620, 900, 1024 y 1366 px en tema claro y oscuro.
- [ ] Probar ratón, tacto, teclado, pantalla completa y errores reales.
- [ ] Comprobar que el guardado, los conflictos y el rol de ADOC-10 siguen intactos.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar ayuda y changelog; archivar en `docs/historial/roadmap-adoc-11.md`, reiniciar el roadmap y dejar el backlog con dos entradas.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Los flujos de ADOC-10 no presentan regresiones.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El SVG real no expone un `viewBox` útil | El ajuste inicial no es fiable | Fallback a ancho/alto y un zoom seguro. |
| El resaltado duplica el coste del editor | Se supera el presupuesto | Capa simple, sin dependencias y medición por fase. |
| El paneo con tacto compite con el scroll | Mala experiencia móvil | Diferenciar un dedo de dos y cancelar la captura al salir. |
| Errores de Mermaid sin línea estable | Mensaje incompleto | Mostrar el detalle completo y la línea solo si existe. |
| El estado de zoom interfiere con el autosave | Cambios falsos o pérdidas | El zoom es estado de vista y nunca llama a `markDirty`. |

## 6. Notas de sesión

- 2026-11-19: ADOC-11 sale del backlog y pasa a ser el roadmap activo.
- ADOC-10 ya dejó resueltos el rol de invitado, las confirmaciones, el autosave, los conflictos y el nombre de exportación; este roadmap se limita al lienzo y al editor.
- Punto de partida: `app/board/apps/mermaid/mermaid-app.tsx`, `use-mermaid-preview.ts`, `mermaid-render.ts`, `mermaid-filename.ts`, `mermaid-error.ts` y `mermaid.css`.
- No se cambia el formato de `{ code }` ni el guardado por proyecto.
- 2026-11-19: Fase 1 completada. El lienzo usa `--doc-*`, mide el SVG con `ResizeObserver` y aplica un zoom inicial que respeta ancho y alto. Revisado a 390 y 1366 px sin scroll horizontal. Suite completa: 210 archivos / 1.488 pruebas; `tsc`, ESLint, build y `perf:budget` correctos (límite de Diagramas 371.000 B).
- 2026-11-19: Fase 2 completada. El lienzo incorpora zoom con botones, rueda y pinza; paneo con arrastre y flechas; reinicio al ajuste inicial y pantalla completa con Escape y retorno de foco. Se limitan zoom y desplazamiento, y el estado de vista no llama a `markDirty`. Revisado con controles reales en escritorio y pantalla completa. Suite completa: 211 archivos / 1.497 pruebas; `tsc`, ESLint, build y `perf:budget` correctos (límites de Diagramas 374.000/825.000 B).
