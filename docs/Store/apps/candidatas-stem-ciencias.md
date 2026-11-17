# Candidatas · STEM y ciencias

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **Integrada:** Física 2D (`matter-js`) cerró como **STORE-07**. **En backlog:**
> Geometría interactiva (`jsxgraph`) como **STORE-08** y Moléculas 3D (`3dmol`)
> como **STORE-12**. El resto sigue como candidato hasta que se priorice.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Laboratorio STEM | `@itkdm/open-lab-components` 0.1.1 | MIT | 210+ fragmentos interactivos de física, química, biología y matemáticas | ~3 MB sin empaquetar | Fragmentos HTML/CSS/JS, no componentes React: hay que aislarlos en `iframe` con `sandbox` o sanearlos. Versión 0.1.x muy joven (febrero 2026) |
| Física 2D | `matter-js` 0.20.0 | MIT | Gravedad, colisiones, muelles, péndulos | ~90 KB gzip | Sandbox manipulable; UI propia |
| Física 2D (WASM) | `@dimforge/rapier2d` 0.21.0 | Apache-2.0 | Motor de física más preciso | ~1 MB WASM | Alternativa a Matter.js si hace falta precisión |
| Geometría interactiva | `jsxgraph` 1.14.3 | MIT **o** LGPL-3.0 | Construcciones, funciones, lugares geométricos | ~400 KB | Elegir la opción MIT de la licencia dual |
| Editor de fórmulas | `mathlive` 0.111.4 | MIT | Teclado matemático, exportación a LaTeX | ~500 KB + fuentes | Candidata si hace falta un teclado matemático más rico |
| Render de fórmulas | `katex` 0.19.1 | MIT | Render de LaTeX en cualquier app | ~280 KB + fuentes | Pieza de apoyo, no app por sí sola |
| Calculadora científica | `mathjs` 15.2.0 | Apache-2.0 | Evaluación simbólica y unidades | ~350 KB | Detrás de una UI propia |
| Moléculas 3D | `3dmol` 2.5.5 | BSD-3 | Modelos moleculares giratorios | ~1 MB | Carga estructuras PDB/SDF |
| Dibujo de moléculas | `kekule` 1.0.4 | ⚠️ sin declarar | Editor de estructuras químicas | ~1 MB | Licencia sin metadatos en npm: comprobar antes de usar |
| Cielo nocturno | `d3-celestial` 0.7.35 | BSD-3 | Mapa estelar, constelaciones | ~500 KB + datos | Necesita descargar catálogos; valorar servirlos localmente |
| Música | `vexflow` 5.0.0 | MIT | Notación musical, escalas, ejercicios | ~500 KB | UI propia |
| Audio y síntesis | `tone` 15.1.22 | MIT | Sintetizador y experimentos de sonido | ~300 KB | Requiere gesto del usuario para el audio |
| Sonido de fondo | `howler` 2.2.4 | MIT | Reproducción de audio | ~40 KB | Apoyo |

## Valoración

- **Física 2D** es el mejor primer laboratorio: paquete pequeño, licencia limpia,
  sin red y con una UI acotada.
- **Geometría interactiva** aporta otro tipo de manipulación matemática y encaja
  con la calculadora y la tabla periódica; el paquete es más grande y hay que
  elegir explícitamente la opción MIT.
- **Laboratorio STEM** tiene mucho contenido, pero su formato HTML/CSS/JS y su
  madurez lo convierten en un proyecto de aislamiento y revisión, no en una
  integración directa.
- **Moléculas 3D** y **Cielo nocturno** necesitan datos externos; se pueden servir
  localmente, pero requieren trabajo de assets y atribución.
