# Rendimiento del cliente

> **Estado:** línea base de PERF-01 · build `1.1.26` · 2026-11-15
> **Informe:** `npm run perf:report` · **Datos:** [`perf-baseline.json`](perf-baseline.json)

---

## Cómo medir

El informe trabaja sobre una build existente; no reconstruye ni necesita red:

```bash
npm run build
npm run perf:report
```

Para actualizar la línea base:

```bash
npm run perf:report -- --json --out docs/perf-baseline.json
```

El script lee `dist/client/.vite/manifest.json`, sigue los `imports` estáticos y el CSS de cada entrada y suma sus tamaños bruto y gzip. Los `dynamicImports` no se siguen automáticamente: cada flujo añade como raíz explícita las cargas dinámicas que necesita (motor de cálculo, núcleo de Mermaid, diagrama de flujo, ELK, wasm de Excalidraw y Blockly).

El gzip se calcula con `zlib` nivel 9. No incluye fuentes, imágenes ni otros assets que no estén declarados en el manifiesto. Por eso sirve para comparar flujos entre sí y detectar regresiones, no como sustituto de una medición real de red.

## Línea base

| Flujo | Bruto | Gzip | Presupuesto provisional (+5 %) | Archivos |
|---|---:|---:|---:|---:|
| Tablero | 543,7 KiB | 163,3 KiB (167.258 B) | 175.621 B | 25 |
| Herramientas de aula · abrir Básica | 492,5 KiB | 139,1 KiB (142.480 B) | 149.604 B | 15 |
| Herramientas de aula · primer `=` en Básica | 6.654,3 KiB | 1.922,3 KiB (1.968.399 B) | 2.066.819 B | 16 |
| Herramientas de aula · Científica/Ecuaciones | 6.658,9 KiB | 1.924,0 KiB (1.970.225 B) | 2.068.736 B | 17 |
| Diagramas · flujo inicial | 1.135,3 KiB | 308,7 KiB (316.105 B) | 331.910 B | 42 |
| Diagramas · con ELK | 2.573,9 KiB | 749,8 KiB (767.844 B) | 806.236 B | 40 |
| Pizarra · abrir | 3.573,0 KiB | 1.254,5 KiB (1.284.625 B) | 1.348.856 B | 31 |
| Pizarra · conversión Mermaid | 4.273,1 KiB | 1.430,5 KiB (1.464.855 B) | 1.538.098 B | 51 |
| Blockly · abrir | 1.145,6 KiB | 321,5 KiB (329.171 B) | 345.630 B | 17 |
| Blockly · panel de código | 1.279,9 KiB | 356,5 KiB (365.023 B) | 383.274 B | 20 |

Los totales incluyen el framework y la entrada compartida. La comparación útil es entre flujos del mismo informe, no contra una medición externa con otra build.

## Presupuestos

- **Tablero:** no puede incorporar `compute-engine`, Mermaid, Excalidraw, ELK ni Blockly. Es la única regla estructural que no admite el margen del 5 %.
- **Flujos:** ninguno debe superar su presupuesto provisional sin una mejora deliberada y una actualización razonada de la línea base.
- **Herramientas de aula:** abrir Básica no descarga el motor; el primer `=` sí lo hace hoy. La fase 2 debe eliminar esa descarga de la Básica antes de consolidar su presupuesto.
- **Pizarra:** el wasm de Excalidraw es un coste aceptado de abrir la Pizarra. No se divide ni se sustituye la librería sin una decisión explícita.
- **Blockly:** el motor y los generadores son costes de la app; deben seguir cargándose solo al abrirla o al pedir el panel de código.
- **Cualquier flujo nuevo** debe añadirse al script y a esta tabla antes de considerarse cubierto.

La fase 4 convertirá estos presupuestos en una comprobación de CI. Hasta entonces son una referencia documentada, no una puerta automática.

## Hallazgos

- El tablero queda en **163,3 KiB gzip** y no incluye ninguna app pesada.
- La primera evaluación de la Básica añade **1.783,1 KiB gzip** de `compute-engine`; Científica añade solo **1,8 KiB** más sobre esa base.
- Abrir la Pizarra cuesta **1.254,5 KiB gzip**, de los que **717,8 KiB** son el chunk wasm de Excalidraw.
- Diagramas con la plantilla de flujo cuesta **308,7 KiB gzip**; el caso con ELK sube a **749,8 KiB**.
- Abrir Blockly cuesta **321,5 KiB gzip**; el panel de código añade **35,0 KiB** con los generadores y el idioma.
- El chunk de `compute-engine` empaquetado es la versión 0.188.0. El motor 0.29.1 que entra por `mathlive` no aparece en el cliente.

## Limitaciones

- Esta línea base mide bytes estáticos, no tiempo de ejecución ni latencia de red.
- La latencia real con caché fría y red lenta se medirá en la fase 2 sobre una build servida; no se afirmará una mejora de tiempo sin esa comparación.
- El informe no modela el cacheo de Sites ni el orden exacto de las peticiones del navegador.
- No se ejecuta un rebuild solo para medir: se reutiliza el `dist/client` actual.
- Sin cambios de versión; `package.json` sigue en `1.1.26`.
