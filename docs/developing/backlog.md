# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas pendientes · siguiente candidato UI-11
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; UI-xx mejoras de interfaz; ARC-xx arquitectura y mantenimiento global; DEV-xx infraestructura de desarrollo; DOC-01 a DOC-12 ya están usados por el bloque documental histórico.
> **Revisión:** [`arquitectura-global.md`](arquitectura-global.md) contiene el diagnóstico, el árbol objetivo y el orden recomendado.

---

## 2026-11-19 — UI-11 · Menús, atajos y barra de estado de Aula Documentos

- Contexto: la cabecera se reorganizó en una barra superior con Archivo, Importar y Exportar y una barra del documento con Formato, Insertar y herramientas directas. Queda revisar el mapa completo de acciones y evitar que cada función nueva añada otro botón sin jerarquía.
- Alcance:
  1. Inventariar cada acción y asignarle un único hogar: barra superior, barra del documento, menú contextual o atajo.
  2. Definir atajos consistentes y una ayuda visible.
  3. Revisar desbordamiento, menús móviles, estados vacíos y barra de estado.
  4. Evitar duplicar importar/exportar/guardar en varios sitios.
  5. Probar teclado, lector de pantalla y cinco anchos.
- Criterios: ninguna acción importante queda escondida o duplicada; el patrón se mantiene al añadir imágenes, tablas, búsqueda y documentos.
- Notas: el rediseño de barras ya iniciado es la base; esta entrada cubre el sistema, no solo una pantalla.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
