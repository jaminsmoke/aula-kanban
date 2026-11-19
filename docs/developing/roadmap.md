# Roadmap UI-10 · Ventanas responsivas de la Tienda

> **Estado:** Activo · **Origen:** UI-10 del backlog (2026-11-19)
> **Backlog:** ADOC-08, ADOC-09, ADOC-10, ADOC-11, Hoja de cálculo y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Evitar que las ventanas de la Tienda queden recortadas o fuera del escritorio al cambiar el tamaño del viewport, girar el dispositivo o restaurar una ventana.
- [ ] Criterio de éxito: una ventana abierta en escritorio y reducida a 390 px sigue completamente visible, conserva su estado y permite seguir usando sus controles.

## 2. Alcance

**Dentro:**

- Una geometría común para abrir, recolocar y redimensionar ventanas.
- Reflujo de las ventanas abiertas cuando cambia el tamaño del escritorio.
- Apertura maximizada o a pantalla completa en viewports estrechos.
- Arrastre y redimensionado limitados al área segura; controles coherentes en modo maximizado.
- Conservación del estado de la app, la ventana activa y el foco.
- Pruebas de geometría, reflujo, dock, cierre y teclado.
- Revisión visual a 390, 620, 900, 1024 y 1366 px.

**Fuera de alcance:**

- Cambiar el diseño interno de cada app o su lienzo.
- Persistir posiciones entre sesiones o sincronizarlas con otros dispositivos.
- Añadir nuevas apps o cambiar el catálogo.
- Cambiar el contrato de las apps, el guardado o las migraciones.
- Publicar en Sites: el cierre termina con un push al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Una función pura de geometría para abrir, mover, redimensionar y reflujo | Parches separados en cada acción | Una sola regla evita que las ventanas se comporten distinto según cómo se hayan colocado. |
| Margen seguro de 12 px y mínimos de 240×180 | Dejar que la ventana conserve medidas imposibles | Mantiene una superficie usable y evita recortes en viewports pequeños. |
| Reflujo al observar el tamaño real del escritorio | Confiar solo en `window.innerWidth` | El escritorio es el contenedor real y puede cambiar sin que cambie el viewport. |
| Abrir maximizadas por debajo de 640 px | Mantener ventanas flotantes en móvil | Evita la pérdida de espacio y los controles fuera de pantalla. |
| No remontar la ventana al recolocarla | Recrear la ventana con una `key` nueva | Conserva el editor, el foco y el estado interno de la app. |
| Bloquear arrastre y resize mientras está maximizada | Permitir mover una ventana maximizada | Evita posiciones incoherentes y facilita volver a un modo ventana seguro. |
| Revalidar la geometría guardada al restaurar | Confiar en la posición anterior | Un cambio de orientación puede dejar la posición guardada fuera del área. |

## 4. Fases

### Fase 1 — Geometría segura y reflujo

- [x] Extraer una función pura que ajuste posición y tamaño a unos límites con margen y mínimos.
- [x] Usarla al abrir ventanas, al arrastrar, al redimensionar y al cambiar el tamaño del escritorio.
- [x] Recolocar las ventanas abiertas desde la observación del escritorio, sin remontarlas.
- [x] Evitar actualizaciones si la geometría calculada no cambia.
- [x] Cubrir con pruebas aperturas pequeñas, posiciones fuera de rango, tamaños mínimos y reflujo.
- **Criterios de aceptación:**
  - Ninguna ventana queda fuera del escritorio después de reducirlo.
  - Las ventanas conservan un tamaño mínimo usable.
  - El reflujo no genera bucles de `ResizeObserver` ni saltos visibles.

### Fase 2 — Móvil y modo maximizado

- [x] Abrir las ventanas maximizadas por debajo del umbral acordado.
- [x] Mantener el botón de ampliar/reducir y devolver una geometría segura al reducir.
- [x] Ocultar o desactivar arrastre y resize mientras la ventana está maximizada.
- [x] Revisar el dock, el cierre y la navegación por teclado en 390 y 620 px.
- [x] Cubrir con pruebas el paso de maximizado a ventana y la restauración tras cambiar el escritorio.
- **Criterios de aceptación:**
  - En móvil no hay scroll horizontal del escritorio.
  - La ventana activa se puede minimizar, restaurar, ampliar y cerrar.
  - Al reducir una ventana maximizada sigue completamente visible.

### Fase 3 — Foco, estado y controles

- [ ] Conservar la ventana activa y el foco del control usado al recolocar.
- [ ] Revisar que abrir, enfocar, mover, redimensionar, minimizar y cerrar mantienen el orden esperado.
- [ ] Impedir que el arrastre deje la ventana fuera del área segura.
- [ ] Añadir pruebas de integración del escritorio con más de una ventana y cambios de tamaño.
- **Criterios de aceptación:**
  - El contenido de la app no se recarga ni pierde cambios al cambiar la geometría.
  - La ventana con foco sigue siendo la misma después del reflujo.
  - El dock restaura la ventana en una posición visible.

### Fase 4 — Verificación y cierre

- [ ] Revisar el flujo completo en 390, 620, 900, 1024 y 1366 px, incluido abrir en escritorio y reducir después.
- [ ] Actualizar la documentación y registrar el resumen en el changelog.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget`.
- [ ] Archivar este roadmap en `docs/historial/roadmap-ui-10.md`, reiniciar `developing/roadmap.md` y dejar el backlog con seis entradas.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - El flujo móvil y el reflujo se verificaron con ventanas reales.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `ResizeObserver` entra en bucle | Bloqueo o saltos | Comparar la geometría y actualizar solo si cambia. |
| jsdom no reproduce el tamaño real | Pruebas poco realistas | Probar la función pura y simular el observador en la integración. |
| La ventana maximizada conserva geometría antigua | Vuelve fuera de pantalla | Revalidar `saved` al restaurar y al cambiar límites. |
| El reflujo remonta la app | Pérdida de foco o estado | Mantener la misma instancia y solo cambiar estilos. |
| El umbral móvil no coincide con el de las apps | Saltos visuales | Fijar un umbral único y probarlo en 620/640 px. |
| El usuario quiere volver a ventana flotante en móvil | Vuelve a quedar recortada | Calcular una geometría segura con márgenes y límites. |

## 6. Notas de sesión

- 2026-11-19: UI-10 sale del backlog y pasa a ser el roadmap activo. Evidencia: una ventana abierta en escritorio y reducida a 390 px conserva `x=150` y `right=516`; abierta desde cero a 390 px calcula `x=12` y `right=378`.
- Puntos de partida: `app/board/store/store-window.tsx`, `app/board/store/use-desktop-windows.ts`, `app/board/store/store-desktop.tsx`, `app/board/store/store-desktop.css` y sus pruebas.
- El arreglo es transversal a todas las apps de la Tienda. No se cambia el contenido de las apps ni su contrato de guardado.
- 2026-11-19: Fase 1 completada. `window-geometry.ts` centraliza margen, mínimos y ajuste; apertura, arrastre, resize, restauración y reflujo usan la misma regla. El `ResizeObserver` recoloca las ventanas sin remontarlas y devuelve la misma referencia cuando no hay cambios. Verificado en el navegador: una ventana abierta con escritorio ancho y reducida a 390 px pasa a `x=12`, `right=378`, sin scroll horizontal. 7 pruebas focalizadas y 199 archivos / 1.421 pruebas; `tsc` y ESLint en verde.
- 2026-11-19: Fase 2 completada. Las ventanas abiertas con un escritorio de 640 px o menos arrancan maximizadas; el botón de reducir devuelve una geometría segura y el reflujo revalida la posición guardada. En maximizado se desactiva el arrastre y desaparece el asa de resize. Verificado en 390 y 620 px con apertura, reducción, minimizar/restaurar desde el dock y cierre; los controles de tráfico tienen foco visible. 10 pruebas focalizadas y 199 archivos / 1.424 pruebas; `tsc` y ESLint en verde.
