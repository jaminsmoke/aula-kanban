# Roadmap · Hoja de cálculo: cálculo automático seguro

> **Estado:** Activo · **Origen:** Hoja de cálculo del backlog (2026-11-19)
> **Backlog:** DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Recuperar el cálculo automático de la Hoja de cálculo sin ejecutar JavaScript y conservando las fórmulas como texto en el documento compartido.
- [ ] Criterio de éxito: el presupuesto de ejemplo calcula sus totales, las fórmulas sobreviven a guardar y recargar, y una fórmula maliciosa o desmesurada no ejecuta código ni bloquea la app.

## 2. Alcance

**Dentro:**

- Un evaluador seguro de fórmulas, sin `eval` ni `new Function`.
- Referencias A1, rangos, operaciones aritméticas, comparaciones básicas y funciones habituales.
- Detección de referencias circulares, errores de valor y límites de tamaño.
- Separación entre las fórmulas guardadas y los valores mostrados en la rejilla.
- Recálculo al editar, cargar, reiniciar, añadir filas o columnas.
- Verificación del ejemplo de presupuesto y de la exportación CSV.
- Presupuesto de rendimiento específico para la app.

**Fuera de alcance:**

- Compatibilidad completa con Excel o Google Sheets.
- Funciones financieras, matrices dinámicas, macros o `LAMBDA`.
- Autosave, conflictos o migración de la hoja a `useVersionedDraft`; eso requiere su propio bloque.
- Cambiar el esquema de `app_documents` o el formato de las celdas.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Evaluador propio con parser y AST | `eval`, `new Function` o el motor de Jspreadsheet | El motor actual ejecuta expresiones como JavaScript. |
| Fórmulas como fuente de verdad | Guardar solo los resultados calculados | La hoja compartida debe conservar lo que escribió la persona. |
| Valores calculados en una capa de presentación | Sobrescribir las celdas del documento con resultados | Evita perder fórmulas al guardar. |
| Grafo de dependencias con detección de ciclos | Recálculo recursivo sin control | Una referencia circular no debe bloquear la app. |
| Límites explícitos de filas, celdas y longitud | Confiar en el tamaño del archivo | Una fórmula o un rango no puede consumir recursos sin límite. |
| Funciones comunes y mensajes `#...` | Intentar cubrir todo Excel | Mantiene el motor pequeño, testeable y comprensible. |
| Presupuesto de `hoja-calculo` separado | Mezclarlo con el flujo del tablero | Permite medir el coste real de la app. |

## 4. Fases

### Fase 1 — Motor seguro de fórmulas

- [x] Crear el lexer/parser de fórmulas con números, texto, celdas, rangos, operadores y paréntesis.
- [x] Implementar el evaluador con `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `IF`, `ROUND` y `ABS`.
- [x] Resolver referencias A1 y rangos con límites de filas, columnas y celdas.
- [x] Detectar referencias circulares y devolver errores `#VALOR!`, `#REF!`, `#DIV/0!`, `#NOMBRE!` o `#CIRC!` sin lanzar excepciones.
- [x] Cubrir con pruebas fórmulas válidas, errores, ciclos, texto, división por cero y rangos fuera de límites.
- **Criterios de aceptación:**
  - Ninguna ruta usa `eval`, `Function` o ejecución de JavaScript.
  - Los resultados numéricos y los errores son deterministas.
  - Una fórmula desmesurada se rechaza sin bloquear el hilo.

### Fase 2 — Integración con la rejilla

- [x] Separar las fórmulas persistidas de la matriz de valores mostrada.
- [x] Recalcular al editar una celda y actualizar solo las celdas dependientes.
- [x] Conservar la fórmula al seleccionar o mostrar una celda calculada.
- [x] Recalcular al cargar, reiniciar y añadir filas o columnas.
- [x] Mostrar los totales del presupuesto (`B3*C3`, `B4*C4`, `B5*C5`, `SUM(D3:D5)`).
- [x] Cubrir con pruebas edición de cantidades, recálculo, fórmulas nuevas y fórmulas mal formadas.
- **Criterios de aceptación:**
  - Cambiar una cantidad actualiza el total correspondiente y el total general.
  - Editar una celda normal no borra fórmulas ajenas.
  - Un error se muestra en su celda sin romper la rejilla.

### Fase 3 — Persistencia, CSV y estados

- [x] Guardar y recargar las fórmulas originales, no los resultados calculados.
- [x] Mantener el formato y el CSV con el texto de la fórmula protegido.
- [x] Mostrar estado de cálculo, celdas con error y límites alcanzados.
- [x] Revisar el modo lectura para invitados y el reinicio de la hoja.
- [x] Añadir el flujo `hoja-calculo` a `perf:budget` y medir el coste del motor.
- **Criterios de aceptación:**
  - Guardar, recargar y volver a calcular produce los mismos totales.
  - El CSV conserva las fórmulas sin convertirlas en valores.
  - Los invitados no pueden editar ni guardar.
  - `perf:budget` incluye y valida el flujo de la hoja.

### Fase 4 — Verificación y cierre

- [ ] Revisar 390, 620, 900, 1024 y 1366 px en tema claro y oscuro.
- [ ] Probar el presupuesto real, fórmulas circulares, rangos grandes y recarga.
- [ ] Comprobar que las demás apps no cambian.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar ayuda y changelog; archivar en `docs/historial/roadmap-hoja-calculo.md`, reiniciar el roadmap y dejar el backlog con una entrada.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - El ejemplo de presupuesto y las fórmulas guardadas funcionan con datos reales.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Jspreadsheet muestra y edita la matriz de valores | Se pierde la fórmula al tocar una celda | Mantener un mapa de fórmulas y separar presentación de persistencia. |
| Una cadena de dependencias es circular | Bloqueo o desbordamiento | Grafo con marcas y error `#CIRC!`. |
| Un rango enorme consume memoria | Cuelgue del navegador | Límite de celdas, longitud y tiempo de evaluación. |
| El motor crece demasiado | Se supera el presupuesto | Parser pequeño, funciones acotadas y medición por fase. |
| CSV convierte fórmulas en resultados | Pérdida de datos al exportar | Exportar desde las fórmulas persistidas y mantener el escape actual. |

## 6. Notas de sesión

- 2026-11-19: La Hoja de cálculo sale del backlog y pasa a ser el roadmap activo.
- Estado inicial: `parseFormulas: false` conserva las fórmulas como texto, pero no calcula; el ejemplo se muestra sin totales.
- Puntos de partida: `app/board/apps/hoja-calculo/hoja-calculo-app.tsx`, `hoja-calculo-model.ts`, `hoja-calculo-app.test.tsx` y `docs/perf-budget.json`.
- No se cambia el esquema `{ data, styles? }` ni se migra la app a otro motor de persistencia.
- DEV-01 queda como única entrada del backlog.
- 2026-11-19: Fase 1 completada. Se añadió un lexer/parser y evaluador propio con referencias A1, rangos acotados, funciones habituales, comparaciones, errores `#...` y detección de ciclos. No usa `eval` ni `Function`. Suite completa: 214 archivos / 1.514 pruebas; `tsc` y ESLint en verde.
- 2026-11-19: Fase 2 completada. La rejilla muestra los valores calculados y conserva las fórmulas en un mapa separado; al editar solo se actualizan las celdas cuyo resultado cambia, y guardar/exportar reconstruye el documento desde las fórmulas. Añadida la barra `fx` para consultar y editar la fórmula de la celda seleccionada. Verificado con Jspreadsheet real a 1366 px: cambiar `B3` actualiza `D3` y `D6`; guardar y recargar conserva los totales y las fórmulas. Suite completa: 215 archivos / 1.521 pruebas; `tsc`, ESLint, build y `perf:budget` correctos.
- 2026-11-19: Fase 3 completada. El guardado y la recarga conservan las fórmulas y recalculan los mismos totales. El CSV exporta el texto protegido de cada fórmula (por ejemplo, `'=B3*C3`) en lugar del resultado. El panel muestra «Cálculo correcto», el número de fórmulas, las celdas con error y los límites de longitud, rango o profundidad alcanzados; reiniciar limpia el estado. Invitados mantienen la rejilla, la barra `fx`, el guardado y el reinicio desactivados. Añadido el flujo `hoja-calculo` a `perf:budget`: **309.267 B gzip / 315.000 B**.
