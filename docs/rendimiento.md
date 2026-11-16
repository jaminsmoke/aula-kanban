# Rendimiento del cliente

> **Estado:** línea base de PERF-01 · cierre de APP-02 · build `1.1.31` · 2026-11-16
> **Informe:** `npm run perf:report` · **Presupuesto:** `npm run perf:budget` · **Datos:** [`perf-baseline.json`](perf-baseline.json) · **Latencia:** [`perf-latency.json`](perf-latency.json)

---

## Cómo medir

El informe trabaja sobre una build existente; no reconstruye ni necesita red:

```bash
npm run build
npm run perf:report
```

Para comprobar el presupuesto y medir la latencia real:

```bash
npm run perf:budget
# Con `npm start -- --port 8791` sirviendo la build:
node scripts/perf-latency.mjs --runs 5 --json --out docs/perf-latency.json
```

Para actualizar la línea base:

```bash
npm run perf:report -- --json --out docs/perf-baseline.json
```

El script lee `dist/client/.vite/manifest.json`, sigue los `imports` estáticos y el CSS de cada entrada y suma sus tamaños bruto y gzip. Los `dynamicImports` no se siguen automáticamente: cada flujo añade como raíz explícita las cargas dinámicas que necesita (motor de cálculo, núcleo de Mermaid, diagrama de flujo, diagrama de flujo de la conversión, ELK, wasm de Excalidraw y Blockly).

El gzip se calcula con `zlib` nivel 9. No incluye fuentes, imágenes ni otros assets que no estén declarados en el manifiesto. Por eso sirve para comparar flujos entre sí y detectar regresiones, no como sustituto de una medición real de red.

## Línea base

| Flujo | Bruto | Gzip | Presupuesto vigente | Archivos |
|---|---:|---:|---:|---:|
| Tablero | 561,1 KiB | 166,7 KiB (170.713 B) | 175.656 B | 28 |
| Calculadora · abrir Básica | 435,3 KiB | 129,5 KiB (132.617 B) | 150.827 B | 16 |
| Calculadora · primer `=` en Básica | 435,3 KiB | 129,5 KiB (132.617 B) | 150.827 B | 16 |
| Calculadora · Científica/Ecuaciones | 6.601,6 KiB | 1.914,4 KiB (1.960.363 B) | 2.069.960 B | 18 |
| Diagramas · flujo inicial | 1.141,5 KiB | 309,3 KiB (316.683 B) | 331.923 B | 42 |
| Diagramas · con ELK | 2.580,2 KiB | 750,4 KiB (768.431 B) | 806.262 B | 40 |
| Tienda · abrir | 525,7 KiB | 164,0 KiB (167.926 B) | 174.779 B | 20 |
| Pizarra · abrir | 3.438,8 KiB | 1.213,5 KiB (1.242.609 B) | 1.348.890 B | 21 |
| Pizarra · conversión Mermaid | 4.202,7 KiB | 1.410,8 KiB (1.444.615 B) | 1.560.999 B | 48 |
| Blockly · abrir | 1.151,9 KiB | 322,0 KiB (329.717 B) | 345.631 B | 17 |
| Blockly · panel de código | 1.286,1 KiB | 357,0 KiB (365.568 B) | 383.275 B | 20 |

Línea base regenerada el 2026-11-16 con la build de cierre de PROMO-06. La raíz de los flujos de la calculadora es `app/board/apps/calculadora/calculadora-app.tsx`; la Tienda sigue midiendo desde `app/board/store/store-desktop.tsx` y las secciones «Cambio de fase 2», «Cambio de fase 3» y «Cambio PROMO-06» conservan las cifras históricas de sus mediciones.

Los totales incluyen el framework y la entrada compartida. La comparación útil es entre flujos del mismo informe, no contra una medición externa con otra build.

## Cambio de fase 2

- Antes: el primer `=` de Básica costaba **1.922,3 KiB gzip** (1.968.399 B) porque incluía `compute-engine`.
- Ahora: cuesta **140,3 KiB gzip** (143.645 B), lo mismo que abrir la app. La reducción es de **1.782,0 KiB gzip** (1.824.754 B).
- El motor sigue disponible para Científica/Ecuaciones: **1.925,2 KiB gzip**.
- El parser básico añade **1,2 KiB gzip** al chunk de la app, pero elimina 1,83 MB de descarga en el flujo más común.
- El informe falla si el flujo `basica-evalua` vuelve a incluir un archivo `compute-engine`. También falla si la Pizarra incluye Mermaid/KaTeX, si Diagramas incluye ELK/Cytoscape o si la conversión mezcla Mermaid 11 y 12.

## Cambio de fase 3

- Abrir la Pizarra no descarga la conversión: **1.254,5 KiB gzip** (1.284.638 B), sin Mermaid ni KaTeX.
- La conversión Mermaid solo se paga al usarla. El informe ahora incluye su diagrama de flujo de Mermaid 11: **1.451,8 KiB gzip** (1.486.653 B), **197,3 KiB** más que abrir la Pizarra.
- El aumento respecto a la cifra anterior (1.430,5 KiB) es de **21,3 KiB gzip** (21.770 B) y no es una regresión: antes el informe no seguía esa carga dinámica.
- Mermaid 12.3.0 se queda en Diagramas; Mermaid 11.17.2 solo aparece en la conversión. Ningún flujo carga ambos.
- KaTeX 0.18.10 y 0.16.47 son importaciones dinámicas de sus respectivos Mermaid; no aparecen en los flujos medidos y no se cargan juntas.
- No se fuerza ningún alias. `@excalidraw/mermaid-to-excalidraw` 3.6.0 eliminaría Mermaid 11 y KaTeX 0.16, pero cambia el motor de conversión a Pele y el resultado visual; queda fuera de este roadmap.
- El diagrama de flujo normal no incluye ELK ni Cytoscape; el flujo con ELK sigue separado.
- Hay una prueba funcional de conversión (`mermaid-conversion.test.ts`) que convierte un flowchart y comprueba que produce rectángulos y flechas.

## Latencia real

Medición sobre `npm start` (build servida), Chrome headless, red **Fast 3G** (1,6 Mbps, 150 ms RTT), caché desactivada y limpiada en cada muestra; **5 muestras por modo**. El cronómetro arranca al iniciar la navegación y termina en el primer `4` de `2+2`; abrir Tienda y Calculadora forma parte del tiempo.

| Modo | Apertura (mediana) | Primer resultado (mediana) | Total (mediana) | Motor |
|---|---:|---:|---:|---|
| Básica | 3.442,6 ms | 147,8 ms | 3.594,9 ms | No |
| Científica | 3.416,9 ms | 9.685,4 ms | 13.124,3 ms | Sí |

La apertura es prácticamente la misma en ambos modos (unos 3,4 s). La diferencia de **9.537,6 ms** está en el primer resultado de Científica y coincide con la descarga de `compute-engine`; la Básica no lo solicita. Es una medición local, no una promesa de latencia de producción.

## Cambio PROMO-06

- La calculadora muestra el estado del motor y avisa con «Preparando el motor…» mientras descarga; «Calculando…» sigue apareciendo al evaluar.
- La precarga se adelanta a la intención: al enfocar o pasar el puntero por Científica/Ecuaciones espera 120 ms; si el último modo fue Científica, empieza al abrir la calculadora. La Básica sigue sin precargar por defecto.
- Esta medición no refleja esas mejoras: `perf-latency` limpia `localStorage` en cada muestra y pulsa Científica sin simular hover, así que la descarga empieza al cambiar de modo, como antes. El aviso sí se comprobó en navegador con Fast 3G.
- Se mantiene `@cortex-js/compute-engine` 0.188.0. El subpath `core` importa los mismos chunks grandes y falla 6 pruebas de la calculadora porque no incluye el diccionario LaTeX; `mathjs` ya se descartó por no cubrir LaTeX nativo ni la exactitud simbólica, y un worker no reduciría la descarga.

## Presupuestos

- **Tablero:** no puede incorporar `compute-engine`, Mermaid, Excalidraw, ELK ni Blockly. Es la única regla estructural que no admite el margen del 5 %.
- **Flujos:** ninguno debe superar su presupuesto provisional sin una mejora deliberada y una actualización razonada de la línea base.
- **Calculadora:** abrir Básica y pulsar `=` no descargan el motor. Científica y Ecuaciones sí lo usan.
- **Tienda:** no puede incluir `compute-engine`, Mermaid, KaTeX, Excalidraw, ELK, Cytoscape ni Blockly; solo debe cargar el escritorio y el catálogo.
- **Pizarra:** el wasm de Excalidraw es un coste aceptado de abrir la Pizarra. No se divide ni se sustituye la librería sin una decisión explícita.
- **Conversión Mermaid:** 1.560.999 B. Abrir la Pizarra no puede incluir Mermaid 11, KaTeX ni `mermaid-to-excalidraw`; la conversión debe conservar su diagrama de flujo de Mermaid 11.
- **Blockly:** el motor y los generadores son costes de la app; deben seguir cargándose solo al abrirla o al pedir el panel de código.
- **Cualquier flujo nuevo** debe añadirse al script y a esta tabla antes de considerarse cubierto.

`npm run perf:budget` lee `docs/perf-budget.json`, ejecuta el informe y falla si un flujo supera su límite, si falta un flujo o si aparece un chunk prohibido o falta uno obligatorio. CI lo ejecuta después de `npm run build`; el presupuesto es ahora una puerta automática.

## Hallazgos

- El tablero queda en **164,2 KiB gzip** y no incluye ninguna app pesada.
- La primera evaluación de la Básica ya no descarga `compute-engine`; usa el evaluador racional incluido en la app.
- Abrir la Pizarra cuesta **1.213,1 KiB gzip**, de los que **717,8 KiB** son el chunk wasm de Excalidraw. La conversión Mermaid añade **197,3 KiB** y solo se descarga al usarla.
- Abrir Tienda cuesta **162,5 KiB gzip** y no incluye ninguna app pesada.
- Diagramas con la plantilla de flujo cuesta **308,9 KiB gzip**; el caso con ELK sube a **750,0 KiB**. El flujo normal no incluye ELK ni Cytoscape.
- Abrir Blockly cuesta **321,6 KiB gzip**; el panel de código añade **35,0 KiB** con los generadores y el idioma.
- El chunk de `compute-engine` empaquetado es la versión 0.188.0. El motor 0.29.1 que entra por `mathlive` no aparece en el cliente.

## Limitaciones

- Esta línea base mide bytes estáticos, no tiempo de ejecución ni latencia de red.
- La latencia real se midió en la fase 4 sobre una build servida; no se afirma una mejora de tiempo respecto a la medición anterior porque las condiciones y la app cambiaron.
- El informe no modela el cacheo de Sites ni el orden exacto de las peticiones del navegador.
- La conversión se mide con un flowchart de Mermaid 11, que es el caso más habitual; otros tipos de diagrama pueden añadir chunks propios.
- La latencia se midió en un servidor local con Fast 3G y Chrome headless; no representa la red ni el CDN de producción y no se ejecuta en CI.
- No se ejecuta un rebuild solo para medir: se reutiliza el `dist/client` actual.
- Sin cambios de versión; `package.json` sigue en `1.1.31`.
