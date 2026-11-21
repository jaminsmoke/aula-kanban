# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 3 entradas pendientes · siguiente candidato recomendado ARC-09
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; UI-xx mejoras de interfaz; ARC-xx arquitectura y mantenimiento global; DEV-xx infraestructura de desarrollo; DOC-01 a DOC-12 ya están usados por el bloque documental histórico.
> **Revisión:** [`arquitectura-global.md`](arquitectura-global.md) contiene el diagnóstico, el árbol objetivo y el orden recomendado.

---

## 2026-11-21 — ARC-09 · Reutilizar el guardado con versión entre editores

- Hoja de cálculo, Mapas conceptuales, Líneas de tiempo, Tarjetas y Blockly siguen usando `save` de `useAppDocument`. Aula Documentos tiene su propia API por documento y usa guardado con versión. Comparar ambos clientes y reutilizar únicamente la lectura de versiones, el resultado del guardado y el tratamiento de conflictos que tengan la misma semántica.
- Pilotar con Hoja de cálculo mediante `saveVersioned` del cliente existente. Mantener el esquema de cada app, sus permisos, sus tiempos de guardado y su estrategia de recuperación. Usar el piloto para decidir qué merece pasar a `shared` antes de migrar otros editores.
- Salida: dos sesiones sobre la misma hoja no se pisan, un fallo al cargar no se interpreta como documento nuevo y se preserva el borrador al detectar conflicto. Revisar las herramientas de escritura del plugin y los clientes anteriores antes de endurecer la API común.

## 2026-11-21 — ARC-10 · Revisar la integración entre Aula Documentos y Hoja de cálculo

- Mantener Hoja de cálculo como aplicación. Las tablas de texto de Tiptap, la consulta local de XLSX y la hoja editable de Jspreadsheet atienden usos distintos. La hoja tiene su propio modelo, referencias de celdas, evaluación de fórmulas, formato y exportación CSV.
- Evaluar primero un flujo concreto, como trasladar una selección desde la hoja a una tabla de Aula Documentos. Comparar valores, formato y referencias para decidir qué se conserva. Compartir un adaptador de celdas o de formatos solo si lo usan ambas apps. Mantener los adaptadores de lectura y edición separados mientras tengan contratos distintos.
- Reconsiderar retirar una app únicamente cuando Aula cubra su flujo de principio a fin, con datos existentes, permisos, enlaces, exportación y rendimiento verificados. Un Gantt dentro de un documento tampoco sustituye por sí solo a una línea de tiempo interactiva.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
