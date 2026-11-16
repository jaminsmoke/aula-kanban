# Roadmap PROMO-06 · Primer resultado de la calculadora científica

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PROMO-06 — en Fast 3G la Científica abre en unos 3,4 s, como la Básica, pero el primer resultado tarda unos 13 s porque descarga `@cortex-js/compute-engine` (~1,9 MB gzip).
> **Dependencias:** APP-02 y el roadmap de carga diferida de la calculadora (2026-11-14), que ya dejaron la Básica sin motor y la precarga al entrar en Científica o abrir Ecuaciones.
> **Backlog:** PROMO-01 pausado; no quedan más entradas pendientes.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Reducir la espera percibida hasta el primer resultado en Científica y Ecuaciones sin cargar `compute-engine` en Básica, Tablero ni Tienda.
- [ ] Criterio de éxito: la mediana del primer resultado mejora o, si el motor no se puede recortar, la persona ve de inmediato que el motor se está preparando y la precarga se adelanta a la intención; los presupuestos de `tablero`, `espacio`, `basica` y `basica-evalua` no empeoran y la decisión queda documentada con medidas.

## 2. Alcance

**Dentro:**
- Reproducir la línea base de latencia y separar descarga del motor, evaluación y render.
- Exponer el estado de carga del motor (`preparando`, listo) en la calculadora.
- Precargar por intención: al pasar o enfocar Científica/Ecuaciones, al cambiar de modo y, si se guarda el último modo, al abrir la calculadora en Científica.
- Mostrar «Preparando el motor…» mientras descarga y «Calculando…» al evaluar, sin parpadeos cuando el motor ya está en caché.
- Evaluar un recorte del motor, una carga por subconjunto o una alternativa más ligera, con medidas antes y después.
- Actualizar `docs/rendimiento.md`, README/ayuda y el changelog con los números reales.

**Fuera de alcance:**
- Mover `compute-engine` a los flujos prohibidos (`tablero`, `espacio`, `basica`, `basica-evalua`) o cargarlo al abrir la Básica.
- Cambiar la exactitud simbólica o el editor de ecuaciones por otro producto sin una decisión explícita.
- Prometer latencias de producción: las medidas son locales, en Fast 3G y sobre la build servida.
- Publicar en Sites o cambiar la versión `1.1.32`.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Mantener `compute-engine`** | `mathjs` u otro motor | La decisión de 2026-11-14 ya descartó `mathjs`: ahorra peso pero no cubre LaTeX nativo ni la exactitud simbólica actual. |
| **Precarga por intención, no al abrir la Básica** | Precargar al montar la calculadora | Abrir Básica no debe descargar el motor; el presupuesto lo prohíbe y la mayoría de aperturas no usan Científica. |
| **Indicador separado «Preparando el motor…» y «Calculando…»** | Un único «Calculando…» al pulsar `=` | La espera real es la descarga; avisar al elegir el modo explica la pausa antes de escribir. |
| **Precarga con retardo corto en `pointerenter`/`focus`** | Precargar en cuanto se pinta el botón | Evita descargar 1,9 MB por un simple movimiento del puntero; el retardo confirma la intención. |
| **Recordar el último modo y precargar solo si era Científica** | Precargar siempre al abrir | Ayuda a quien vuelve a la Científica sin castigar a quien abre la Básica. |
| **Medir con `perf-latency` a 5 muestras** | Cronómetro manual | Es el método de APP-02: build servida, Fast 3G, caché limpia y mediana. |
| **Cerrar con datos si no hay mejora** | Añadir complejidad sin ganancia | Si el recorte o el worker no reducen la descarga, se documenta y se mantiene lo actual. |

## 4. Fases

### Fase 1: Línea base y estado del motor — completada (2026-11-16)
- [x] Reproducir la medición actual sobre la build servida en `127.0.0.1:8791` con `node scripts/perf-latency.mjs --runs 5 --json --out docs/perf-latency.json` y anotar apertura, primer resultado y total de Básica y Científica.
- [x] Confirmar que la Básica no descarga `compute-engine` y que Científica/Ecuaciones lo hacen, con la precarga que ya existe desde 2026-11-14.
- [x] Exponer el estado del motor en `use-calculator`/`edu-evaluate` (cargando, listo, error) sin cambiar el comportamiento visible.
- [x] Añadir pruebas del estado y de que la Básica sigue sin precargar.
- **Criterios de aceptación:** la línea base queda registrada con los mismos números de partida; el estado del motor se puede observar y probar; `perf:budget` no cambia y la Básica no descarga el motor.
- **Verificación:** medición sobre la build servida con el proyecto de demo, 5 muestras y Fast 3G: Básica abre en **3.444,9 ms**, primer resultado **141,4 ms**, total **3.592,5 ms**, sin `compute-engine`; Científica abre en **3.428,4 ms**, primer resultado **9.695,2 ms**, total **13.138 ms**, con el motor descargado. `engine-status.ts` publica `idle | loading | ready | error`, `use-calculator` lo expone como `engineStatus` y las pruebas cubren la suscripción, el estado listo tras evaluar y que la Básica no precarga. Suite completa **156 archivos / 1.146 pruebas**, `tsc`, ESLint y build correctos. `perf:budget` sigue en verde: `tablero` 170.708 B, `basica` 132.298 B y `cientifica` 1.960.043 B gzip.

### Fase 2: Precarga por intención e indicador — completada (2026-11-16)
- [x] Precargar al enfocar o pasar el puntero por Científica/Ecuaciones, con un retardo corto y una sola vez, además del cambio de modo actual.
- [x] Guardar el último modo y, si era Científica, precargar al abrir la calculadora; la Básica sigue sin precargar por defecto.
- [x] Mostrar «Preparando el motor…» mientras carga y «Calculando…» al evaluar; evitar el parpadeo si el motor ya está listo o en caché.
- [x] Medir de nuevo y comparar la mediana del primer resultado con la línea base.
- **Criterios de aceptación:** el aviso aparece al elegir el modo, no solo al pulsar `=`; la Básica, el Tablero y la Tienda conservan sus presupuestos; la comparación de latencia queda documentada con 5 muestras.
- **Verificación:** la precarga por intención espera 120 ms y se cancela al salir o desenfocar; el último modo se guarda y, si era Científica, la descarga empieza al abrir la calculadora. El aviso «Preparando el motor…» aparece con Fast 3G (comprobado en navegador: texto visible, opacidad 1) y no se muestra con `busy`. La medición con 5 muestras queda prácticamente igual: Básica 3.442,6 / 147,8 / 3.594,9 ms; Científica 3.416,9 / 9.685,4 / 13.124,3 ms. `perf-latency` limpia `localStorage` y pulsa Científica sin pasar por encima, así que no puede medir la precarga por intención ni el modo recordado; la mejora es de percepción y se documenta como tal. Suite completa **156 archivos / 1.149 pruebas**, `tsc`, ESLint y build correctos. `perf:budget`: `tablero` 170.713 B, `basica` 132.617 B y `cientifica` 1.960.363 B gzip.

### Fase 3: Recorte o alternativa y cierre
- [ ] Evaluar un recorte del motor, una carga por subconjunto o una alternativa más ligera; medir el tamaño y la latencia antes de decidir.
- [ ] Si no hay mejora real, mantener `compute-engine` y documentar por qué; si la hay, aplicar el cambio con pruebas de evaluación y paridad.
- [ ] Pasar suite completa, `tsc`, ESLint, build y `perf:budget`; actualizar `docs/rendimiento.md`, README/ayuda, changelog y archivar este roadmap.
- **Criterios de aceptación:** la decisión final está justificada con medidas; no hay regresiones de exactitud ni de presupuesto; el roadmap se cierra con todas las fases verificadas y sin publicar ni cambiar de versión.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La precarga por hover descarga datos sin intención real | Consumo innecesario en redes lentas | Retardo corto, una sola vez y también en `focus`; nunca al abrir la Básica. |
| La precarga al recordar el modo sorprende a quien abre la Básica | Descarga inesperada | Solo si el último modo fue Científica; la preferencia se puede borrar y la Básica sigue siendo el defecto. |
| El indicador parpadea con el motor en caché | Ruido visual | Mostrarlo solo si la carga supera un umbral corto; probar con caché fría y caliente. |
| Regresión en los presupuestos de Básica, Tablero o Tienda | CI en rojo | `perf:budget` en cada fase y regla estructural del Tablero. |
| La medición varía entre ejecuciones | Conclusiones falsas | 5 muestras, misma build, misma red y mediana; no comparar con datos de producción. |
| Un motor alternativo pierde exactitud o LaTeX | Resultados incorrectos | Pruebas de evaluación y paridad antes de cambiar; si no cubre, mantener el actual. |
| Un worker no reduce la descarga | Complejidad sin mejora | Medir primero el peso y el tiempo; solo adoptarlo si mejora la percepción o el bloqueo. |
| Prometer una latencia que depende de la red | Expectativas falsas | Documentar que son medidas locales en Fast 3G, no una garantía de producción. |

## 6. Notas de sesión

- 2026-11-16: PROMO-06 sale del backlog y pasa a ser el roadmap activo; el backlog queda solo con PROMO-01 pausado.
- 2026-11-16: la precarga al entrar en Científica o abrir Ecuaciones ya existe desde el hito del 2026-11-14; esta fase no la repite, mide su efecto y añade la precarga por intención y el aviso.
- 2026-11-16: línea base de `docs/rendimiento.md`: Básica abre en 3.409,4 ms y el primer resultado tarda 125,9 ms; Científica abre en 3.368,2 ms y el primer resultado tarda 9.657,4 ms, con un total de 13.051,2 ms.
- 2026-11-16: el flujo `cientifica` de `docs/perf-budget.json` tiene un límite de 2.069.960 B y la última medición local quedó en 1.959.897 B; la Básica no incluye `compute-engine`.
- 2026-11-16: la revisión que originó esta entrada también descartó «GPT con Actions»; el sustituto es el plugin de Sites con MCP y no forma parte de este roadmap.
- 2026-11-16: no se publica en Sites ni se cambia la versión `1.1.32`; el cierre es local y el push, único, como en los roadmaps anteriores.
- 2026-11-16: la línea base se midió con el proyecto de demo `2222…` en la build local y se guardó en un JSON temporal; `docs/perf-latency.json` y la tabla de `docs/rendimiento.md` se actualizarán al cerrar la fase 2 o 3, con la comparación definitiva.
- 2026-11-16: `perf-latency` limpia `localStorage` y pulsa Científica sin simular hover, así que no mide la precarga por intención ni el modo recordado; la mejora de esta fase es de percepción y la fase 3 decidirá si añade una variante de medición o la documenta como cambio cualitativo.
