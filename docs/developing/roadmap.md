# Roadmap ADOC-06 · Móvil y accesibilidad de Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-06 del backlog (2026-11-18)
> **Backlog:** ADOC-07 y DEV-01 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Hacer Aula Documentos utilizable en pantalla táctil y con lector de pantalla, sin depender de tooltips ni de ampliar la ventana.
- [ ] Criterio de éxito: a 390 px se entiende y se usa cada acción, los diálogos atrapan y devuelven el foco, los estados se anuncian y el contraste es legible en los tres temas.

## 2. Alcance

**Dentro:**

- Menú de acciones con etiquetas visibles en pantallas estrechas y botones de texto para Guardar, Importar y Presentar.
- Objetivos táctiles de al menos 44×44 px en la barra y los controles de Mermaid.
- Foco atrapado en importación, nuevo documento, vista previa, cierre, presentación y recuperación; foco devuelto al control de origen.
- Revisión de `aria-live`, nombres accesibles de los SVG, contraste y navegación por teclado.
- Revisión a 390, 620, 900, 1024 y 1366 px, sin maximizar la ventana como requisito.
- Pruebas de foco, teclado, etiquetas visibles, tamaños táctiles y contraste.

**Fuera de alcance:**

- Cambiar el gestor de ventanas del escritorio o su posición inicial en móvil; se tratará como incidencia aparte si afecta a todas las apps.
- Rediseño visual completo o cambio de marca.
- Lectores de pantalla específicos o pruebas manuales en dispositivos físicos.
- Nuevas funciones de edición, colaboración o MCP.
- Cambios de `AULA_STORE_VERSION`, versión de la app o del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Menú de acciones con etiquetas en contenedores estrechos | Mantener solo iconos con `title` | Los tooltips no existen en pantalla táctil. |
| Extraer un hook reutilizable de foco para diálogos | Repetir lógica en cada modal | Evita divergencias entre importación, cierre, vista previa y recuperación. |
| Objetivos táctiles de 44×44 px en móvil | Aumentar solo el icono | El área pulsable debe crecer, no solo el dibujo. |
| Los SVG reciben un nombre accesible en su contenedor | Modificar el SVG generado por Mermaid | El SVG es contenido generado; el contenedor puede describirlo sin alterar el render. |
| Los estados se anuncian con `role="status"` y `aria-live="polite"` | Mensajes solo visuales | Guardado, errores y preparación deben ser perceptibles sin mirar. |
| La revisión móvil parte de la ventana maximizada y también sin maximizar | Ocultar el problema bajo «maximizar» | La app debe ser usable dentro del espacio disponible; el gestor de ventanas se corrige aparte. |

## 4. Fases

### Fase 1 — Acciones móviles y objetivos táctiles

- [x] Añadir un menú de acciones con etiquetas visibles en anchos estrechos.
- [x] Dar texto a Guardar, Importar, Presentar y Exportar sin perder los atajos de escritorio.
- [x] Aumentar a 44×44 px los objetivos táctiles de la barra y los controles Mermaid.
- [x] Revisar el desbordamiento del documento, la barra y el panel lateral a 390 y 620 px.
- [x] Cubrir con pruebas la presencia de etiquetas y verificar manualmente los tamaños mínimos.
- **Criterios de aceptación:**
  - En 390 px se entiende qué hace cada acción sin tooltip.
  - Guardar, importar, presentar y exportar siguen siendo accesibles.
  - No aparece desplazamiento horizontal en el contenido de la app.

### Fase 2 — Foco y semántica de diálogos

- [x] Extraer un hook de foco que atrape Tab, cierre con Escape y devuelva el foco al disparador.
- [x] Aplicarlo a importación, nuevo documento, vista previa, cierre, recuperación y presentación.
- [x] Revisar `aria-modal`, `aria-labelledby`, `aria-describedby` y el orden de tabulación.
- [x] Anunciar guardado, errores y preparación con `role="status"` o `role="alert"` según corresponda.
- [x] Cubrir con pruebas el foco atrapado, la devolución y el cierre con Escape.
- **Criterios de aceptación:**
  - El teclado no sale de un diálogo abierto.
  - Al cerrar, el foco vuelve al botón que abrió el diálogo.
  - Los estados de guardado y error se anuncian una sola vez.

### Fase 3 — Contraste, SVG y revisión visual

- [ ] Revisar contraste de texto, botones, bordes y estados en los temas Aula, Claro y Oscuro.
- [ ] Añadir nombres accesibles a los contenedores de diagramas y a los controles de zoom.
- [ ] Revisar zoom, paneo, tabla de atajos y textos largos con teclado.
- [ ] Repetir la revisión a 390, 620, 900, 1024 y 1366 px.
- [ ] Cubrir con pruebas los nombres accesibles y los estados de los controles.
- **Criterios de aceptación:**
  - El contraste es legible en los tres temas.
  - Los diagramas y controles tienen nombre accesible.
  - La navegación por teclado no depende del ratón.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Actualizar la ayuda y registrar el resumen en el changelog.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-06.md`, reiniciar `developing/roadmap.md` y dejar el backlog con ADOC-07 y DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Los flujos móviles y de teclado se verificaron con datos reales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El menú móvil oculta acciones | Funciones inaccesibles | Mantener todas las acciones y probar cada una en 390 px. |
| El foco queda atrapado tras cerrar | La app parece bloqueada | Devolver el foco al disparador y probar cada diálogo. |
| Los objetivos táctiles rompen la barra | Desbordamiento o botones gigantes | Crecer con wraps y menús, no con iconos desproporcionados. |
| El contraste falla en un tema | Texto ilegible | Revisar tokens y estados en los tres temas. |
| Se confunde el gestor de ventanas con la app | Arreglo en el sitio equivocado | Separar la incidencia de posición de ventana del trabajo de Aula Documentos. |
| Un lector anuncia estados duplicados | Ruido y desorientación | Un solo `role` por mensaje y pruebas de texto. |

## 6. Notas de sesión

- 2026-11-18: ADOC-06 sale del backlog y pasa a ser el roadmap activo. Prioridad P2; no se implementa nada en este paso.
- Puntos de partida: `app/board/apps/aula-documentos/aula-documentos-app.tsx`, `aula-documentos.css`, `mermaid-block.tsx`, `presentation-view.tsx`, los modales compartidos y `app/board/store/store-window.tsx`.
- ADOC-01 a ADOC-05 están cerrados. La posición inicial de la ventana en móvil se considerará una incidencia del escritorio si afecta a todas las apps.
- 2026-11-18: Fase 1 completada. En contenedores estrechos aparece el menú «Acciones» con etiquetas para nuevo, importar, guardar, exportar, imprimir, presentar y exportar presentación; la barra y los controles Mermaid usan objetivos de 44×44 px. Revisado a 390 y 620 px sin desbordamiento horizontal. 40 pruebas focalizadas y 1.392 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 2 completada. `useDialogFocus` atrapa Tab, cierra con Escape y devuelve el foco al disparador; se aplica a nuevo documento, importación, vista previa, cierre, recuperación y presentación. El estado de guardado usa `role="status"` con `aria-live="polite"`, y los errores mantienen `role="alert"`. 41 pruebas focalizadas y 1.393 en la suite completa; `tsc` y ESLint en verde.
