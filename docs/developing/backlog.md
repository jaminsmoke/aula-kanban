# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** ADOC-13 activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas pendientes
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; UI-xx mejoras de interfaz; DOC-01…DOC-12 ya están usados por el bloque documental histórico.

---

## 2026-11-19 — STORE-18 · Fichas de producto para apps-suites

- Contexto: Aula Documentos va a dejar de ser una app documental más para convertirse en una suite que absorbe Notas, Diagramas, Presentaciones y Visor Office. La ficha actual y varias tarjetas de la Tienda están pensadas para apps individuales; cuando una app crece y reúne varias experiencias, la tarjeta y la ficha deben explicar qué incluye, qué formatos abre y exporta, qué sustituye y cómo se migra. El mismo patrón se repetirá cuando otras apps crezcan o agrupen funciones.
- Alcance:
  1. Definir un modelo de ficha reutilizable para apps-suites: promesa corta, descripción ampliada, capacidades agrupadas, módulos incluidos, compatibilidad de formatos, capturas y avisos de migración.
  2. Rediseñar la tarjeta y la ficha de Aula Documentos para que comunique la suite completa, no solo el editor actual.
  3. Establecer cómo se representan las apps que pasan a ser funciones internas: no deben aparecer como apps instalables duplicadas ni confundir sobre dónde se edita cada cosa.
  4. Dejar el patrón preparado para futuras suites, sin convertir la Tienda en un catálogo de promesas ambiguas.
- Criterios: la ficha de Aula Documentos explica con claridad qué incluye y qué puede importar/exportar; las tarjetas retiradas dejan de competir con la suite; el patrón se puede reutilizar; no cambia la versión del Site.
- Notas: depende de ADOC-13 y se ejecuta al cerrar la convergencia o inmediatamente después. Evitar duplicar la misma promesa en la tarjeta de Aula Documentos y en tarjetas individuales que ya no aportan nada.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
