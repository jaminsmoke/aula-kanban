# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 4 entradas pendientes

---

## 2026-11-22 — UI-12 · Abrir tareas del calendario con el teclado

- En la prueba local de 1.1.40, pulsar una tarea en Mes o Agenda abrió su ficha y respetó el modo de edición o de lectura según la asignación. Las tareas de día completo en Mes y Semana no recibieron foco y no se pudieron abrir con el teclado.
- Permitir recorrer y abrir tareas con Tab y Enter o Espacio en Mes, Semana y Agenda, con foco visible y el título accesible. Al cerrar la ficha, devolver el foco a la tarea. Verificar una tarea propia y otra asignada a otra persona.

## 2026-11-22 — TASK-01 · Abrir un documento de entrega desde su tarea

- La alumna pudo guardar un informe y pasar la tarea a En revisión. El profesor tuvo que copiar la URL escrita en la descripción, abrir el Maletín y lanzar Aula Documentos a mano para llegar al informe. El enlace con `doc` ya selecciona el documento al abrir la aplicación.
- Permitir vincular un documento existente del proyecto desde la ficha y abrirlo en Aula Documentos con un solo paso. Reutilizar el identificador y la navegación existentes. Comprobar que una cuenta ajena al proyecto no puede abrirlo y que una referencia a un documento archivado o eliminado muestra un estado claro.

## 2026-11-22 — ADOC-22 · Aclarar la apertura de una suite documental vacía

- Al abrir Aula Documentos en el proyecto nuevo, se vio «Todavía no hay documentos» mientras el primer documento se creaba automáticamente. Al pulsar «Nuevo» para preparar la entrega quedaron dos documentos, uno de ellos en blanco. Con la lista en error también aparecía el mensaje de lista vacía.
- Decidir si el primer documento se crea al pulsar «Nuevo» o se abre automáticamente con un estado de carga coherente. Verificar que una primera apertura seguida de «Nuevo» deja el número esperado de documentos y que un fallo de carga muestra un error con reintento.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
