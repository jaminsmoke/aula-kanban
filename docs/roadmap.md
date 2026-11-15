# Roadmap PERF-01 · Coste de las apps pesadas

> **Estado:** Activo
> **Origen:** entrada «Recortes de rendimiento de los chunks pesados» del backlog (2026-11-14), revisada el 2026-11-15.
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- Reducir la descarga y el tiempo de la primera interacción de las apps pesadas sin tocar la entrada del tablero ni el contrato funcional.
- Criterio de éxito: cada flujo crítico tiene una medición repetible y un presupuesto; la calculadora básica no paga el motor simbólico; no quedan descargas duplicadas evitables; una regresión futura rompe CI.

## 2. Alcance

**Dentro:**
- Medir por separado el tablero, la calculadora básica, la primera evaluación, Científica/Ecuaciones, Diagramas, la Pizarra y Blockly.
- Separar el coste de Abrir una app del coste de usar una función concreta.
- Revisar `compute-engine`, Mermaid 12 frente a Mermaid 11, KaTeX, ELK, Cytoscape, el wasm de Excalidraw y los generadores de Blockly.
- Añadir un informe de chunks y un presupuesto de descarga que pueda ejecutarse en CI.
- Documentar qué costes son inevitables y por qué.

**Fuera de alcance:**
- Sustituir Excalidraw, reescribir Blockly o cambiar la experiencia de las apps.
- Optimizar D1, R2 o el renderizado del servidor.
- Subir `chunkSizeWarningLimit` o dividir chunks solo para silenciar el aviso de 500 kB.
- Precargar todas las apps al abrir el tablero.
- Cambiar la versión, publicar o desplegar.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Medir por flujo y en gzip, además del tamaño bruto | Usar solo el aviso de chunks >500 kB | El aviso mezcla chunks lazy y no dice qué descarga el usuario ni cuándo |
| Mantener las cuatro apps en `lazy` y sin prefetch global | Precargar apps desde el tablero | La entrada del tablero no debe pagar código que quizá no se use |
| Conservar `compute-engine` para Científica y Ecuaciones | Sustituirlo por `mathjs` o un motor único | Se necesita LaTeX y cálculo simbólico; el coste solo es aceptable cuando se usa |
| Evaluar la Básica con un evaluador numérico pequeño | Cargar 1,83 MB gzip para cualquier `=` | La Básica no necesita símbolos ni resultados exactos simbólicos |
| No forzar alias de Mermaid ni KaTeX | Unificar versiones con `overrides` sin prueba | Mermaid 11.17 y 12.3 no son intercambiables; la conversión a Excalidraw es sensible |
| Aceptar el wasm de Excalidraw como coste de la Pizarra | Dividirlo o cambiar de librería | Es un binario de producción de Excalidraw; no hay un recorte limpio |
| No deduplicar el `compute-engine` 0.29.1 de `mathlive` | Forzar una versión única en todo el árbol | No aparece en el bundle cliente actual; solo sería un problema de instalación |

## 4. Línea base observada

Medición sobre `dist/client` del build actual, sin rebuild:

| Flujo o pieza | Evidencia | Coste |
|---|---|---|
| Entrada del tablero | `index` y `board`; las apps se importan con `lazy` | En torno a 150 KB gzip según la línea base anterior; la fase 1 lo recalcula con el cierre completo |
| Abrir Herramientas de aula en Básica | `edu-tools-app` no importa el motor al abrir | Sin `compute-engine` |
| Pulsar `=` en Básica | `useCalculator` llama siempre a `evaluateLatex` | `compute-engine`: 6.309.699 B / **1.828.624 B gzip** |
| Científica o Ecuaciones | `preloadEngine` y evaluaciones | El mismo motor de 1,83 MB gzip |
| Diagramas | `mermaid` 12.3.0; el render inicial usa la plantilla de flujo | Núcleo de Mermaid y chunks asociados bajo demanda |
| Diagramas con ELK/Cytoscape | Dependencias de Mermaid 12.3.0 | ELK 1.501.961 B / **459.844 B gzip**; Cytoscape 442.621 B / **138.507 B gzip**; solo en diagramas que los usan |
| Pizarra | Excalidraw 0.18.1 y `whiteboard` | Wasm Emscripten 1.821.059 B / **741.648 B gzip**; `whiteboard` 1.135.890 B / **360.430 B gzip** |
| Blockly | `blockly` y generadores cargados bajo demanda | `blockly_compressed` 629.116 B / **174.382 B gzip** |
| KaTeX duplicado | `mermaid` 12.3.0 usa 0.18.10; `@excalidraw/mermaid-to-excalidraw` 2.2.2 usa 0.16.47 | Dos chunks de **76.755 B** y **76.564 B gzip** |
| Mermaid duplicado | `@excalidraw/mermaid-to-excalidraw` trae Mermaid 11.17.2 | Chunk de parser separado; confirmar si se carga al abrir la Pizarra o solo al convertir |

### Hallazgos de la revisión

- **La Básica no es gratuita al evaluar.** El backlog hablaba de Científica y Ecuaciones, pero `equals` usa `evaluateLatex` en todos los modos. Es el mayor ahorro potencial y no exige tocar el motor científico.
- **El `compute-engine` 0.29.1 de `mathlive` no está en el cliente.** `@smst/edu-tools` lo instala como dependencia, pero no hay rastro de `mathlive` en `dist/client`; no conviene gastar trabajo en un problema que no se descarga.
- **La conversión Mermaid de Excalidraw es una importación dinámica.** `whiteboard` referencia `@excalidraw/mermaid-to-excalidraw`, pero no se puede afirmar que sus dos KaTeX se descarguen al abrir la Pizarra. La fase 3 debe medir el flujo antes de unificar.
- **Lo que ya está bien:** las apps están en `lazy`, abrir Básica no descarga el motor, ELK/Cytoscape/Blockly no forman parte de la entrada y las fuentes de Excalidraw se sirven localmente. No se debe reescribir eso.
- **El aviso de build no es el objetivo.** Un chunk de 6,3 MB en bruto es un problema, pero el presupuesto útil es el gzip que descarga cada flujo. El aviso de 500 kB puede quedar mientras los flujos no regresen.

## 5. Fases

### Fase 1 — Línea base reproducible y presupuesto

- [x] Añadir `scripts/perf-report.mjs` para leer `dist/client/.vite/manifest.json`, resolver el cierre estático de cada flujo y listar los chunks principales con tamaño bruto y gzip.
- [x] Medir tablero, apertura de Básica, primer `=`, Científica/Ecuaciones, Diagramas con plantilla inicial, Diagramas con ELK, Pizarra, conversión Mermaid y Blockly.
- [x] Guardar una línea base versionada en `docs/perf-baseline.json` y documentar la metodología y los presupuestos en `docs/rendimiento.md`.
- [x] Reutilizar el build existente; no reconstruir solo para medir.

**Criterios de aceptación:** el informe es determinista, no necesita red ni navegador para la parte estática, deja claros los costes por flujo y sirve como referencia para las fases siguientes. La latencia real con red lenta requiere una build servida y pasa a la fase 2.

### Fase 2 — Básica sin el motor simbólico

- [ ] Medir la latencia real de la primera evaluación en una build servida, con caché fría y red lenta; usar la mediana antes de cambiar el motor.
- [ ] Confirmar con el informe que el primer `=` de Básica descarga `compute-engine` y medir su impacto en una red lenta.
- [ ] Implementar un evaluador numérico pequeño para Básica, sin `eval`: decimales, suma, resta, multiplicación, división, porcentaje, signo, potencias, factorial y paréntesis del teclado físico.
- [ ] Mantener `evaluateLatex` para Científica y Ecuaciones, con memoria, historial, errores y resultados exactos sin cambios.
- [ ] Añadir pruebas de paridad para los casos básicos y una comprobación de que el chunk del motor no se solicita en Básica; conservar la prueba de que sí se solicita en Científica.
- [ ] Si la paridad no se puede conservar, detener la sustitución y documentar el coste; no se acepta una calculadora menos capaz.

**Criterios de aceptación:** un cálculo básico no descarga los 1,83 MB gzip del motor, los resultados y mensajes no cambian y Científica/Ecuaciones siguen usando el motor actual.

### Fase 3 — Mermaid, KaTeX y conversión

- [ ] Medir qué carga realmente abrir Diagramas, un diagrama con ELK y la conversión Mermaid a Excalidraw.
- [ ] Determinar si las dos copias de KaTeX y los dos parsers de Mermaid se descargan en algún flujo real o si una de ellas es solo una importación dinámica no usada.
- [ ] Evaluar una alineación de versiones compatible, o un `override` acotado, solo si Diagramas y la conversión pasan sus pruebas; no forzar un alias.
- [ ] Mantener ELK y Cytoscape bajo demanda y evitar que un diagrama normal los incorpore.
- [ ] Retirar las copias duplicadas que no se usen o documentar por qué son inevitables.

**Criterios de aceptación:** no hay una descarga duplicada evitable en los flujos medidos; si Mermaid 11/12 debe seguir separado, queda justificado con una medición y una prueba de conversión.

### Fase 4 — Pizarra, Blockly y guardas de CI

- [ ] Confirmar que el wasm y las fuentes de Excalidraw solo se cargan al abrir la Pizarra y que el tablero o Mi espacio no los precargan.
- [ ] Confirmar que Blockly y sus generadores solo se descargan al abrir la app o el panel de código, no al cargar el tablero.
- [ ] Añadir `npm run perf:budget` después del build de CI: falla si el cierre inicial incorpora una app pesada o si un flujo supera el presupuesto acordado.
- [ ] Documentar la línea base, los costes aceptados y el procedimiento para actualizar un presupuesto con una mejora medida.
- [ ] Cerrar con una comparación antes/después y sin cambios de versión.

**Criterios de aceptación:** CI protege la entrada y los flujos críticos; el coste inevitable de Excalidraw y Blockly está documentado; no hay regresiones funcionales.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El evaluador básico cambia resultados o mensajes | Alto | Pruebas de paridad, casos de teclado físico y fallback al motor si no se puede conservar |
| Mermaid 11 y 12 no son compatibles | Alto | No forzar el alias; probar Diagramas y la conversión antes de aceptar |
| La medición de red es variable | Medio | Medianas, caché fría, presupuesto estático en gzip y comparación con la misma build |
| El despliegue en Sites cambia el cacheo de assets | Medio | Medir el build local con caché fría; verificar en la próxima publicación sin cambiar la versión |
| El alcance se convierte en una reescritura de Excalidraw o Blockly | Medio | Limitarlos a comprobar carga bajo demanda; no sustituir librerías |
| El informe se vuelve frágil ante nombres de chunks con hash | Bajo | Resolver el grafo desde el manifiesto, nunca por nombre de archivo |

## 7. Notas de sesión

- Revisión del 2026-11-15 sobre `dist/client`: se confirmaron las cifras del backlog y se añadieron la Básica, la separación entre abrir y usar, y la diferencia entre dependencia instalada y código descargado.
- `compute-engine` 0.188.0 sí se empaqueta; el 0.29.1 de `mathlive` no aparece en el cliente. No se toca el árbol de dependencias por este segundo motor.
- Las apps ya están registradas con `lazy` en `app/board/apps/registry.tsx`; la entrada del tablero no debe cambiar de estrategia.
- El aviso de chunks >500 kB es de tamaño bruto y no se usará como criterio de éxito.
- Fase 1 completada el 2026-11-15: `npm run perf:report`, `docs/perf-baseline.json` y `docs/rendimiento.md`; diez flujos deterministas. La Pizarra incluye ya el wasm de Excalidraw (1.254,5 KiB gzip).
- La latencia real no se ha medido todavía; se validará en la fase 2 antes de cambiar el motor. No se atribuye ninguna mejora de tiempo a esta fase.
- Sin cambios de versión: `package.json` sigue en `1.1.26`.
