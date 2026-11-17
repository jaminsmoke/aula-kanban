# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 3 entradas: DEV-01, STORE-15 y STORE-16 pendientes

---

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.

## 2026-11-17 — STORE-15 · Notas y documentos

- Contexto: `@tiptap/core` 3.34.0 y su conjunto MIT de extensiones permiten un editor de texto enriquecido local, reutilizable en Oficina y Productividad.
- Alcance:
  1. Crear `app/board/apps/documentos/` con editor de texto enriquecido y barra de formato.
  2. Títulos, párrafos, listas, negrita/cursiva, enlaces, citas y bloques de código; tablas solo si la extensión elegida es MIT.
  3. Guardar JSON validado por proyecto en `app_documents`; invitados en solo lectura; exportación HTML local.
  4. Ficha en categorías Oficina y Productividad, subcategoría Herramientas.
- Criterios: escribir y editar texto con formato, guardar/cargar, exportar HTML y mantener el modo lectura para invitados; revisar a 1366, 1024 y 390 px.
- Notas: usar solo extensiones MIT, sanear el contenido y no añadir imágenes ni adjuntos en la primera versión. Es una base natural para una futura fusión con Presentaciones.

## 2026-11-17 — STORE-16 · Visor Office

- Contexto: `@silurus/ooxml` 0.90.1 (MIT, visor WASM para `.docx`, `.xlsx` y `.pptx`) permite leer documentos locales sin subirlos ni depender de un servicio externo.
- Alcance:
  1. Crear `app/board/apps/visor-office/` con selector de archivo local y visor de documentos.
  2. Soportar `.docx`, `.xlsx` y `.pptx` en modo solo lectura; sin edición, subida ni exportación.
  3. Ficha en categoría Oficina, subcategoría Herramientas.
  4. Medir el chunk y el WASM; si el visor PDF entra más adelante, compartir la librería más completa entre apps.
- Criterios: abrir archivos locales de los tres formatos, mostrar su contenido, no hacer peticiones de red y adaptarse a 1366, 1024 y 390 px.
- Notas: el paquete ocupa unos 22 MB sin empaquetar y el WASM puede disparar el chunk; priorizar solo si el presupuesto lo permite. No añadir un visor PDF genérico ahora: el lector de libros ya cubre PDF y se decidirá una librería compartida cuando se aborde la fusión.
