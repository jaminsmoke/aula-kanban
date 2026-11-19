# Roadmap ADOC-08 · Lienzo editorial y tema

> **Estado:** Completado · **Origen:** ADOC-08 del backlog (2026-11-19)
> **Backlog:** ADOC-09, ADOC-10, ADOC-11, Hoja de cálculo y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Separar el lienzo de edición del tema de la interfaz: la hoja de Aula Documentos, Notas y la vista previa de Presentaciones será blanca siempre.
- [ ] Criterio de éxito: en tema oscuro se sigue viendo una hoja blanca legible, con texto, código, enlaces, selección y Mermaid coherentes, sin arrastrar fondos oscuros de la ventana.

## 2. Alcance

**Dentro:**

- Tokens semánticos compartidos para el papel y su contenido.
- Hoja blanca en Aula Documentos y Notas.
- Diapositivas y vista previa de la app heredada Presentaciones.
- Títulos, texto, enlaces, citas, código, placeholders, selección y bloques Mermaid.
- Impresión, PDF y exportación HTML alineados con el lienzo visible.
- Revisión de contraste en los temas Aula, Claro y Oscuro.
- Pruebas de tokens/contraste y revisión visual a 390, 620, 900, 1024 y 1366 px.

**Fuera de alcance:**

- Cambiar los tres temas de presentación de Aula Documentos: Aula, Claro y Oscuro siguen siendo una elección de diapositiva.
- Cambiar la barra, los menús o las acciones del editor; eso corresponde a ADOC-09.
- Autosave, conflictos o paridad de las apps heredadas; eso corresponde a ADOC-10.
- El lienzo y el editor de Diagramas; eso corresponde a ADOC-11.
- Cambiar versiones de app, `AULA_STORE_VERSION` o el Site.
- Publicar en Sites: el cierre termina con un push al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Crear un ámbito de tokens `--doc-*` para el papel | Reutilizar `--ui-surface-raised` y `--ui-text-*` | El tema de la ventana no debe cambiar el color del documento. |
| La hoja base es blanca en los tres temas | Usar una hoja oscura con texto claro en tema oscuro | La lectura y la impresión deben parecerse; el usuario pidió una hoja blanca. |
| Aplicar el mismo ámbito a Aula Documentos, Notas y Presentaciones heredadas | Resolver cada app con colores sueltos | Evita tres mantenimientos y mantiene la misma jerarquía visual. |
| Mantener los temas de presentación de Aula Documentos | Forzar todas las diapositivas a blanco | Son una elección explícita del documento y no forman parte del papel de edición. |
| Componentes internos usan tokens de contenido | Heredar `--ui-surface-faint` o `--ui-text-secondary` | Código, citas y Mermaid necesitan superficies claras estables. |
| Impresión y exportación usan los mismos valores | Copiar colores en cada generador | El PDF y el HTML deben coincidir con lo que se ve. |
| Contraste AA como criterio de aceptación | Revisar solo a ojo | El cambio afecta a texto pequeño y a estados de selección. |

## 4. Fases

### Fase 1 — Tokens del papel y superficies

- [x] Definir en `globals.css` los tokens de papel, tinta, texto secundario, borde, código y selección.
- [x] Aplicar el ámbito a `.aula-documentos-paper` y `.documentos-paper` sin alterar el marco de las apps.
- [x] Sustituir en el papel los tokens de interfaz que hoy cambian con el tema.
- [x] Cubrir con pruebas los valores de token y el contraste de las parejas principales.
- **Criterios de aceptación:**
  - La hoja es blanca en tema Aula, Claro y Oscuro.
  - El marco de la app sigue usando el tema de la interfaz.
  - El texto principal alcanza contraste AA.

### Fase 2 — Contenido, código y Mermaid

- [x] Revisar títulos, párrafos, enlaces, citas, listas, código en línea, bloques de código, tablas y placeholders sobre blanco.
- [x] Definir selección de texto y foco visibles sobre la hoja.
- [x] Ajustar el contenedor Mermaid y el SVG para que se lean sobre blanco en los tres temas.
- [x] Revisar el estado vacío, el error de Mermaid y los controles del bloque.
- [x] Cubrir con pruebas el formato rico, el código y la selección.
- **Criterios de aceptación:**
  - Ningún texto o icono desaparece por heredar un color oscuro.
  - Mermaid, código y citas mantienen contraste y jerarquía.
  - La selección se distingue del fondo sin depender del tema de la ventana.

### Fase 3 — Presentaciones, impresión y exportación

- [x] Aplicar el lienzo claro a las diapositivas y a la vista previa de Presentaciones heredada.
- [x] Mantener los tres temas de presentación de Aula Documentos sin cambios.
- [x] Alinear HTML exportado, impresión/PDF y presentación exportada con el lienzo visible.
- [x] Revisar los textos de ayuda y las capturas/documentación si mencionan el tema.
- [x] Cubrir con pruebas las exportaciones y la vista previa.
- **Criterios de aceptación:**
  - La app heredada Presentaciones no cambia de fondo con el tema oscuro.
  - Aula Documentos conserva sus temas de presentación.
  - El HTML y el PDF reproducen la misma hoja blanca y los mismos colores de contenido.

### Fase 4 — Verificación y cierre

- [x] Revisar Aula Documentos, Notas y Presentaciones en los tres temas a 390, 620, 900, 1024 y 1366 px.
- [x] Revisar selección, código, Mermaid, impresión y exportación HTML con datos reales.
- [x] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget`.
- [x] Actualizar ayuda y changelog; archivar este roadmap en `docs/historial/roadmap-adoc-08.md`, reiniciar `developing/roadmap.md` y dejar el backlog con cinco entradas.
- [x] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Las capturas de los tres temas muestran una hoja blanca consistente.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Los tokens de interfaz se filtran al papel | Vuelven fondos oscuros en tema oscuro | Aislar el ámbito y sustituir cada uso dentro del papel. |
| El SVG de Mermaid usa colores del tema | Diagramas ilegibles sobre blanco | Revisar el renderer y el contenedor con capturas de los tres temas. |
| La selección hereda el color de acción | Texto seleccionado poco visible | Definir selección propia sobre la hoja. |
| Impresión y pantalla divergen | PDF distinto de lo editado | Compartir tokens y probar la exportación. |
| Cambiar los temas de presentación de Aula por error | Se pierde una función existente | Mantenerlos fuera del alcance y cubrirlos con una prueba de regresión. |
| La app heredada Presentaciones no esté instalada en el proyecto | No se puede revisar en vivo desde Tienda | Revisar su CSS y sus pruebas; instalarla solo para la verificación final si hace falta. |

## 6. Notas de sesión

- 2026-11-19: ADOC-08 sale del backlog y pasa a ser el roadmap activo.
- Evidencia inicial: `.aula-documentos-paper` y `.documentos-paper` usan `--ui-surface-raised`; `.presentaciones-preview-slide` y la vista de presentación usan `--ui-surface-pale`. En tema oscuro el documento completo se ve oscuro.
- Puntos de partida: `app/globals.css`, `app/board/apps/aula-documentos/aula-documentos.css`, `app/board/apps/documentos/documentos.css`, `app/board/apps/presentaciones/presentaciones.css`, `app/board/shared/aula-documentos/presentation.css` y los generadores de exportación/impresión.
- No se cambia el contrato del documento ni el guardado. La hoja blanca es una decisión visual, no una migración de datos.
- 2026-11-19: Fase 1 completada. `globals.css` define tokens `--doc-*` que no se sobrescriben en tema oscuro; Aula Documentos y Notas usan papel blanco, tinta oscura, bordes y selección propios. Texto principal, secundario, enlaces y código superan contraste AA. Verificado visualmente en tema oscuro: la hoja permanece blanca y el marco sigue oscuro. 5 pruebas focalizadas y 201 archivos / 1.431 pruebas; `tsc` y ESLint en verde.
- 2026-11-19: Fase 2 completada. Títulos, formato rico, enlaces, citas, código, selección y foco usan tokens del lienzo. El bloque Mermaid, su editor, controles, estados y error usan superficies claras; el SVG de Mermaid ya se renderiza con variables claras. Verificado en tema oscuro con un diagrama insertado: bloque y vista previa legibles sobre la hoja blanca. 6 pruebas focalizadas y 201 archivos / 1.432 pruebas; `tsc` y ESLint en verde.
- 2026-11-19: Fase 3 completada. Presentaciones heredadas usa el lienzo claro en tarjetas y modo presentación, con texto, títulos, citas, código, enlaces y selección propios. Los temas Aula, Claro y Oscuro de Aula Documentos no se tocaron. La exportación HTML y la impresión mantienen fondo blanco; se añadieron pruebas para el HTML del documento, la presentación exportada y el CSS de Presentaciones. La app no está instalada en este proyecto, así que la revisión fue por CSS y pruebas, como preveía el riesgo. 23 pruebas focalizadas; `tsc` y ESLint en verde.
- 2026-11-19: Fase 4 completada. Aula Documentos y Notas revisados en tema oscuro y claro a 390, 620, 900, 1024 y 1366 px: papel blanco, tinta oscura y sin scroll horizontal. Mermaid se comprobó con un diagrama temporal y el documento se restauró. Suite completa en 201 archivos / 1.433 pruebas, con `tsc`, ESLint, build y `perf:budget` correctos. Roadmap archivado; commit de cierre y push único; sin publicación en Sites.
