# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 5 entradas pendientes

---

## 2026-11-22 — UI-13 · Arrastrar la tarea desde toda la tarjeta

- En la prueba local de 1.1.41, el profesor pudo mover la tarea desde el asa. Al arrastrarla desde el título, se quedó en la misma columna.
- Permitir iniciar el arrastre desde el cuerpo de una tarjeta que la cuenta pueda mover. Reservar el clic o toque breve para abrir la ficha y conservar el arrastre por teclado y el desplazamiento táctil.
- Verificar que se puede mover una tarea desde el título y el cuerpo, que un clic sigue abriendo la ficha y que el alumno solo puede mover las tareas que tiene permitido editar.

## 2026-11-22 — TASK-02 · Abrir la entrega desde la ficha editable y volver a la tarea

- En la prueba como profesor, la ficha editable mostró el documento vinculado sin una acción para abrirlo. El botón de la ficha de solo lectura abrió el documento correcto, pero al cerrarlo la aplicación quedó en Tienda.
- Mostrar **Abrir documento** junto al selector de entrega cuando el vínculo esté guardado y el documento esté disponible. Al cerrar Aula Documentos, volver a la misma ficha y conservar la vista y los filtros de origen.
- Verificar el recorrido desde el tablero y el calendario con los perfiles de alumno y profesor. Comprobar también el regreso desde el detalle de solo lectura y los estados de documento archivado o eliminado.

## 2026-11-22 — UI-14 · Mejorar la navegación y el calendario en móvil

- A 390 px, «Mi mochila» quedó recortada. En Mes, dos tareas con fecha el mismo día se mostraron con títulos truncados difíciles de distinguir. Agenda mostró los títulos completos y la etiqueta «All Day».
- Mantener las secciones de Clase visibles en pantallas estrechas, abrir Agenda por defecto en móvil y traducir «All Day» como «Todo el día».
- Verificar a 390 px que se puede cambiar de sección sin desplazamiento horizontal y distinguir y abrir dos tareas del mismo día. Comprobar que las vistas Mes y Semana siguen disponibles.

## 2026-11-22 — PERM-03 · Conservar el proyecto al aceptar una invitación de administrador

- En la prueba local, el administrador invitado abrió un enlace de proyecto y, tras aceptar la invitación de instancia, aterrizó en otro proyecto.
- Conservar el proyecto del enlace y mostrarlo si la cuenta tiene acceso después de aceptar. Usar la navegación habitual cuando el destino falte, ya no exista o siga sin estar disponible para la cuenta.
- Verificar la aceptación desde un enlace de proyecto válido, sin destino y con un destino no disponible. Comprobar que la redirección conserva las comprobaciones de acceso existentes.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
