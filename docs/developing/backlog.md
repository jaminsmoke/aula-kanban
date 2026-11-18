# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** STORE-16 activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas: STORE-17 y DEV-01 pendientes

---

## 2026-11-18 — STORE-17 · Aula Documentos · Editor unificado

- Contexto: Notas y documentos, Diagramas y Presentaciones comparten el trabajo con documentos, pero usan tres modelos distintos: Tiptap JSON, Mermaid y Markdown/reveal.js. La fusión puede unificar editor, persistencia, exportación y ficha, y dejar los motores pesados como bloques diferidos.
- Decisiones ya tomadas:
  1. Nombre visible: **Aula Documentos**; id y carpeta nuevos: `aula-documentos`. El documento se guarda bajo la clave `aula-documentos` en `app_documents`, separado de la app actual `documentos`.
  2. Un documento compuesto por proyecto en la primera versión.
  3. La primera fusión será texto enriquecido + bloque Mermaid. Presentaciones y el modo Markdown llegarán después.
  4. No habrá migración destructiva: los datos de `documentos`, `mermaid` y `presentaciones` se conservan y se importan con vista previa cuando haya paridad. La app `documentos` actual no comparte estado ni instalación con `aula-documentos`.
  5. Las apps antiguas se mantienen un ciclo de compatibilidad antes de ocultarlas o retirarlas.
  6. Markdown será importación/exportación y vista previa; no habrá dos fuentes de verdad desde el inicio.
  7. Mermaid y reveal.js se cargarán bajo demanda; la fusión no debe aumentar el chunk inicial.
  8. Estructura interna: `apps/aula-documentos/` será la app de entrada y el núcleo compartido; los bloques y funciones vivirán en subcarpetas suyas (`blocks/`, `presentation/`, `markdown/`). Las apps antiguas que sigan existiendo durante la compatibilidad serán adaptadores finos sobre ese núcleo, no copias. El registro de apps seguirá plano por id; la jerarquía será interna.
- Alcance por fases:
  1. Spike de modelo de documento, validación, migración de datos, estructura de carpetas, presupuesto de chunks y ficha con procedencia.
  2. Editor unificado v1 con texto enriquecido y bloque Mermaid editable, guardado y exportación HTML.
  3. Importación/exportación Markdown y vista previa, sin edición dual simultánea.
  4. Modo presentación con `reveal.js` diferido y migración asistida de Presentaciones.
  5. Paridad, retirada gradual de apps antiguas, alias y actualización de ayuda, MCP y matriz.
- Criterios: no perder documentos existentes, abrir y editar los tres tipos de contenido, mantener invitados en solo lectura, respetar el presupuesto de chunks y actualizar las fichas con «incluye» y los paquetes upstream.
- Notas: el nombre elegido es **Aula Documentos** y el id `aula-documentos`; `Composio`, `Aula Studio`, `Aula Docs` y `Docxpress` se descartan por sonar a marcas tecnológicas o estudios audiovisuales. El id distinto evita colisiones de instalación y de `app_documents` con la app `documentos` actual. Mapas conceptuales y Líneas de tiempo quedan fuera de esta fusión. No abrir roadmap hasta cerrar STORE-16.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
