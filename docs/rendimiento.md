# Rendimiento del cliente

> **Estado:** línea base de PERF-01 · presupuestos por app de ARC-05 · build `1.1.37` · 2026-11-20
> **Informe:** `npm run perf:report` · **Presupuesto de flujo:** `npm run perf:budget` · **Presupuesto de app:** `npm run app:budget` · **Datos:** [`perf-baseline.json`](perf-baseline.json) · **Latencia:** [`perf-latency.json`](perf-latency.json) · **Imágenes:** [`image-baseline.json`](image-baseline.json)

---

## Cómo medir

El informe trabaja sobre una build existente; no reconstruye ni necesita red:

```bash
npm run build
npm run perf:report
```

Para comprobar los presupuestos y medir la latencia real:

```bash
npm run app:budget
npm run perf:budget
# Con `npm start -- --port 8791` sirviendo la build:
node scripts/perf-latency.mjs --runs 5 --json --out docs/perf-latency.json
npm run perf:images -- --json --out docs/image-baseline.json --runs 3 --widths 800,1600,2048
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
| Tablero | 572,6 KiB | 170,0 KiB (174.044 B) | 175.656 B | 32 |
| Hoja de cálculo · abrir | 1.057,9 KiB | 303,8 KiB (311.063 B) | 315.000 B | 26 |
| Aula Documentos · exportar Office | 1.045,3 KiB | 322,0 KiB (329.701 B) | 340.000 B | 14 |
| Calculadora · abrir Básica | 439,9 KiB | 130,5 KiB (133.650 B) | 150.827 B | 17 |
| Calculadora · primer `=` en Básica | 439,9 KiB | 130,5 KiB (133.650 B) | 150.827 B | 17 |
| Calculadora · Científica/Ecuaciones | 6.606,2 KiB | 1.915,4 KiB (1.961.393 B) | 2.069.960 B | 19 |
| Aula Documentos · abrir | 1.262,8 KiB | 377,2 KiB (386.260 B) | 387.000 B | 50 |
| Tienda · abrir | 544,7 KiB | 169,1 KiB (173.195 B) | 174.779 B | 20 |
| Pizarra · abrir | 3.441,7 KiB | 1.214,2 KiB (1.243.296 B) | 1.348.890 B | 23 |
| Pizarra · conversión Mermaid | 4.206,4 KiB | 1.412,2 KiB (1.446.106 B) | 1.560.999 B | 51 |
| Blockly · abrir | 1.157,2 KiB | 323,2 KiB (330.964 B) | 345.631 B | 18 |
| Blockly · panel de código | 1.291,4 KiB | 358,2 KiB (366.817 B) | 383.275 B | 21 |

Línea base regenerada el 2026-11-20 con la build `1.1.37`. La raíz de los flujos de la calculadora es `app/board/apps/calculadora/calculadora-app.tsx`; la Tienda sigue midiendo desde `app/board/store/store-desktop.tsx` y las secciones «Cambio de fase 2», «Cambio de fase 3» y «Cambio PROMO-06» conservan las cifras históricas de sus mediciones.

Los totales incluyen el framework y la entrada compartida. La comparación útil es entre flujos del mismo informe, no contra una medición externa con otra build.

## Presupuestos por app

`npm run app:budget` comprueba test, CSS, latencia registrada e imágenes registradas. `npm run perf:budget` comprueba los flujos y asigna a cada app su flujo más pesado.

| App | Flujos | Gzip de app | Tests actuales / límite | CSS actual / límite |
|---|---|---:|---|---|
| Tablero | 1 | 175.656 B | 29 / 2.226 → 32 / 2.450 | 12 / 1.529 → 13 / 1.650 |
| Aula Documentos | 2 | 387.000 B | 54 / 5.348 → 54 / 5.400 | 16 / 3.734 → 16 / 3.800 |
| Hoja de cálculo | 1 | 315.000 B | 6 / 615 → 6 / 650 | 1 / 345 → 2 / 380 |
| Calculadora | 3 | 2.069.960 B | 6 / 295 → 7 / 330 | 1 / 124 → 2 / 140 |
| Espacio / Tienda | 1 | 174.779 B | 9 / 723 → 10 / 800 | 2 / 245 → 3 / 270 |
| Pizarra | 2 | 1.560.999 B | 7 / 439 → 8 / 490 | 1 / 9 → 2 / 12 |
| Blockly | 2 | 383.275 B | 5 / 169 → 5 / 180 | 1 / 39 → 2 / 50 |

Los límites de test y CSS tienen un margen deliberado para evitar que una prueba pequeña rompa CI; el límite de gzip de la app nunca puede ser menor que el de su flujo más pesado. Los flujos `aula-documentos-export`, `basica`, `basica-evalua`, `pizarra-mermaid` y `blockly-codigo` siguen teniendo su propio presupuesto aunque compartan app. El presupuesto de `aula-documentos` se ajustó a **387.000 B** con la barra de estado accesible de UI-11; el build de referencia queda en **386.260 B**. Los límites de pruebas y CSS se ajustan a **53 / 5.297 → 54 / 5.400** y **16 / 3.734 → 16 / 3.800** al incorporar a la app las pruebas y el CSS del visor Office en ARC-08 Fase 4. Hoja de cálculo conserva **315.000 B** y queda en **311.063 B** con el guardado con versión de ARC-09. ARC-10 amplía su presupuesto de pruebas de **500** a **650** líneas para cubrir el adaptador y la acción de portapapeles; el límite de archivos sigue en **6**.

### Latencia e imágenes

- **Calculadora:** la última medición registrada exige `≤ 4.000 ms` de total para Básica y `≤ 15.000 ms` para Científica, con `engineLoaded` correcto. Se comprueba sobre `docs/perf-latency.json`; Chrome no se ejecuta en CI.
- **Imágenes:** `docs/image-baseline.json` registra la medición sintética de 800, 1.600 y 2.048 px. `app:budget` comprueba bytes del derivado y PSNR mínimo por escenario. La medición se repite manualmente con `npm run perf:images` cuando cambia el codificador.
- El detalle de las imágenes está en [`miniaturas.md`](miniaturas.md).

### Cómo actualizar un presupuesto

1. Medir la build actual con `npm run build && npm run perf:report`, `npm run perf:budget` y, si aplica, `npm run perf:latency` y `npm run perf:images`.
2. Comparar antes/después y explicar la causa del cambio; no subir un límite para ocultar una regresión.
3. Actualizar `docs/perf-budget.json`. Si se añade un flujo, asignarlo a una app y mantener `apps[id].gzip >= max(flows)`.
4. Refrescar el JSON de latencia o imágenes solo con una medición nueva y registrar la fecha.
5. Ejecutar `npm run check`, `npm run build`, `npm run perf:budget` y `npm run app:budget`; adjuntar la evidencia en el changelog o en la revisión.

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
- **Cualquier flujo nuevo** debe añadirse al script, asignarse a una app y documentarse en esta tabla antes de considerarse cubierto.

`npm run perf:budget` lee `docs/perf-budget.json`, ejecuta el informe y falla si un flujo supera su límite, si falta un flujo, si una app supera su límite o si aparece un chunk prohibido o falta uno obligatorio. `npm run app:budget` comprueba test, CSS, latencia e imágenes registradas. CI ejecuta `app:budget` en los checks y `perf:budget` después de `npm run build`; ambos son puertas automáticas.

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
- Sin cambios de versión; `package.json` sigue en `1.1.37`.
