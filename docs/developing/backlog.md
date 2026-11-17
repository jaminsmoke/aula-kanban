# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** STORE-07 activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 5 entradas: STORE-08 y STORE-10 a STORE-13 pendientes

---

## 2026-11-16 — STORE-10 · Mapas conceptuales

- Contexto: `@xyflow/react` 12.12.1 (MIT, ~150 KB) permite nodos y conexiones arrastrables. Es el complemento natural de Diagramas: allí se escribe el diagrama; aquí se construye directamente. El estado cabe en `app_documents` y no necesita servidor.
- Alcance:
  1. Crear `app/board/apps/mapas/` con lienzo, nodos, conectores, zoom, paneo y edición de etiquetas.
  2. Guardar y cargar el mapa por proyecto con `useAppDocument`; invitados en solo lectura.
  3. Presets de mapa conceptual y mapa mental; sin imágenes ni recursos externos.
- Criterios: crear, mover, conectar y eliminar nodos; guardar y recuperar el mapa; responsive a 1366, 1024 y 390 px; sin red.
- Notas: no usar IA generativa en la primera versión. Mantener el JSON pequeño y validado; no crear tabla ni endpoint nuevos.

## 2026-11-16 — STORE-11 · Presentaciones

- Contexto: `reveal.js` 6.0.2 (MIT, ~200 KB) permite diapositivas desde Markdown/HTML y cubre una necesidad docente que hoy no existe. No necesita servidor ni CDN.
- Alcance:
  1. Crear `app/board/apps/presentaciones/` con editor Markdown, vista previa y modo presentación.
  2. Guardar el contenido por proyecto en `app_documents`; invitados en solo lectura.
  3. Plantillas iniciales y exportación HTML o PDF desde la ventana si no exige servicios externos.
- Criterios: editar y presentar diapositivas, guardar/cargar, navegar con teclado y revisar a 1366, 1024 y 390 px.
- Notas: usar solo assets locales; no importar PPTX ni depender de Google Slides. Si la exportación PDF necesita un servicio del navegador, dejar solo HTML en la primera versión.

## 2026-11-16 — STORE-12 · Moléculas 3D

- Contexto: `3dmol` 2.5.5 (BSD-3, ~1 MB) aporta modelos moleculares giratorios, una capacidad STEM muy visual que no repite ninguna app actual.
- Alcance:
  1. Crear `app/board/apps/moleculas/` con visor 3D, rotación, zoom, etiquetas y selección de moléculas.
  2. Incluir una biblioteca local pequeña de estructuras PDB/SDF con atribución; no descargar de RCSB en la primera versión.
  3. Revisar el peso del chunk y servir todos los datos desde el Site.
- Criterios: cargar y girar moléculas locales, mostrar nombre/fórmula y atribución, sin red; revisar a 1366, 1024 y 390 px.
- Notas: la licencia BSD-3 exige conservar el aviso. Empezar con una selección curada; no añadir un editor químico.

## 2026-11-16 — STORE-13 · Líneas de tiempo

- Contexto: `vis-timeline` 8.5.6 tiene opción MIT y ~200 KB; cubre historia, proyectos y secuencias temporales, un hueco transversal del catálogo.
- Alcance:
  1. Crear `app/board/apps/timeline/` con eventos, épocas, zoom y agrupación.
  2. Guardar y cargar por proyecto en `app_documents`; invitados en solo lectura.
  3. Plantillas de línea temporal histórica y de proyecto.
- Criterios: crear/editar eventos y épocas, mover y hacer zoom, guardar/cargar, sin red; revisar a 1366, 1024 y 390 px.
- Notas: elegir explícitamente la opción MIT; no usar recursos de red ni mapas. Mantener el estado como JSON validado.

## 2026-11-16 — STORE-08 · Geometría interactiva

- Contexto: `jsxgraph` 1.14.3 tiene licencia dual MIT/LGPL-3.0 y permite construcciones, funciones y lugares geométricos con arrastre. Usando la opción MIT encaja con la política de licencias y complementa la calculadora y la tabla periódica.
- Alcance:
  1. Crear `app/board/apps/geometria/` con puntos, segmentos, rectas, circunferencias, etiquetas y medidas.
  2. Añadir presets de construcción y representación de funciones; permitir arrastrar y reiniciar.
  3. Revisar el tamaño del chunk y el CSS de JSXGraph, sirviendo todos los assets desde el Site.
- Antes de retomarlo:
  - [ ] Confirmar la opción MIT y conservar el aviso de licencia.
  - [ ] Decidir si las construcciones se guardan o si la primera versión es efímera.
- Criterios: construcciones manipulables y reiniciables, sin CDN ni red, con aviso MIT; funciona a 1366, 1024 y 390 px y pasa pruebas, tipos, lint y build.
- Notas: no usar la opción LGPL. JSXGraph es más grande que Matter.js (~400 KB): medir el chunk antes de integrarlo y valorar si conviene dividir la app en una carga aún más específica.
