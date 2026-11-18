# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas: ADOC-07 y DEV-01 pendientes
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; DOC-01…DOC-12 ya están usados por el bloque documental histórico.

---

## 2026-11-18 — ADOC-07 · Concurrencia y versiones

- **Prioridad:** P2 · después de ADOC-01.
- Contexto: `useAppDocument` hace un POST del estado completo y no compara versiones. Dos ventanas o dos pestañas pueden guardar el mismo proyecto y la última sobrescribe a la anterior sin avisar. No hay una copia recuperable más allá del guardado actual.
- Alcance:
  1. Enviar y comprobar `updatedAt` o una revisión en el POST; si el servidor tiene una versión más nueva, abrir un conflicto y no sobrescribir.
  2. Ofrecer «recargar la versión del servidor», «conservar la mía» y «descargar copia» antes de resolver.
  3. Guardar una copia local de la última versión antes de un reemplazo destructivo, sin convertir esto en un historial completo.
  4. Probar dos ventanas, dos pestañas y un guardado tras otro.
- Criterios de aceptación:
  - Dos guardados simultáneos no se pisan en silencio.
  - El conflicto se puede resolver sin perder la copia local.
  - Una versión recuperable sigue disponible después de recargar.
- Notas: si el endpoint no puede exponer una revisión, la alternativa mínima es comparar `updatedAt` y pedir confirmación; no añadir migraciones de base sin evaluar primero el contrato de `app_documents`. Depende de ADOC-01 para el autosave y los estados de guardado.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
