# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 3 entradas pendientes · siguiente candidato recomendado ARC-13
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; UI-xx mejoras de interfaz; ARC-xx arquitectura y mantenimiento global; DEV-xx infraestructura de desarrollo; DOC-01 a DOC-12 ya están usados por el bloque documental histórico.
> **Revisión:** [`arquitectura-global.md`](arquitectura-global.md) contiene el diagnóstico, el árbol objetivo y el orden recomendado.

---

## Línea base de reducción

El código de producto pasó de **51.311** líneas en 1.1.37 a **65.811** en 1.1.38 y **66.108** en 1.1.39. En el salto a 1.1.38, Aula Documentos y `app/board/shared` sumaron 8.836 líneas, junto con la incorporación de la suite documental. En el salto a 1.1.39 crecieron 297 líneas de producto, 443 de pruebas y 1.157 de documentación. Los archivos generados quedaron estables en ese último salto. ARC-08 reubicó buena parte del código que antes figuraba en `shared`.

Se cuentan líneas físicas de archivos de texto versionados, incluidas las líneas en blanco. Producto comprende código, estilos y SQL de `app`, `lib`, `db` y `worker`, con pruebas y fixtures aparte. La comparación usa `bbd59a8`, `bbb1bf6` y `4d88e00`, que contiene el código de la 1.1.39 antes del cambio de versión. Para cada recorte, medir el saldo de todos los archivos de producto afectados, incluidos los módulos que se creen o se muevan. Registrar las pruebas, la documentación y los archivos generados por separado. Validar con `npm run check`, las pruebas del área y los presupuestos del build.

## 2026-11-22 — ARC-14 · Reutilizar los límites de importación y revisión documental

- El importador antiguo define `LEGACY_MARKDOWN_MAX_LENGTH` con el mismo límite de 200.000 caracteres que usa la importación actual. El historial valida el mismo estado de Aula Documentos con una segunda constante de 190.000 caracteres.
- Revisar `importers.ts`, `markdown.ts`, `document-types.ts` y `revision.ts` para que cada límite compartido tenga una sola definición. Si dos rutas hacen la misma validación, reutilizar también su validador. Mantener diferenciados el tamaño de la petición, la longitud del Markdown y la del documento serializado.
- Comprobar entradas justo en el límite y por encima, importaciones antiguas y restauración de versiones existentes. Mantener los límites efectivos y los errores que devuelve cada flujo.

## 2026-11-22 — ARC-13 · Retirar reglas CSS duplicadas en las ventanas de apps

- Calculadora carga `edu-base.css` y vuelve a declarar `.edu-app` en `calculadora.css`. Mapas, Líneas de tiempo, Tarjetas, Moléculas y Hoja de cálculo repiten la disposición inicial de ventana con variaciones locales.
- Eliminar la regla duplicada y comprobar qué variables tienen consumidores antes de conservarlas. Revisar si las otras ventanas pueden reutilizar una misma clase base con los tokens del tema y mantener sus diferencias de contenido y desplazamiento.
- Verificar Calculadora y Tabla periódica juntas y por separado. Revisar temas claro y oscuro, ventanas estrechas y maximizadas, foco visible y desplazamiento. Medir el CSS neto y su carga por ruta.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
