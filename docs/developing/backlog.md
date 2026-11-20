# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 8 entradas pendientes — sin roadmap activo
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; UI-xx mejoras de interfaz; DOC-01 a DOC-12 ya están usados por el bloque documental histórico.

---

## 2026-11-19 — ADOC-15 · Tablas completas en el editor

- Contexto: el modelo Tiptap ya incluye tablas y la importación/exportación las conserva, pero el editor no ofrece una entrada clara para crearlas ni controles para modificarlas. Es una capacidad parcialmente presente que no está bien integrada.
- Alcance:
  1. Añadir **Insertar tabla** con selector de filas y columnas.
  2. Ofrecer acciones contextuales para añadir/eliminar filas y columnas, cabecera, combinar/dividir celdas y eliminar tabla.
  3. Resolver navegación con teclado, selección, alineación y comportamiento en móvil.
  4. Mantener fidelidad en HTML, DOCX/PPTX, Markdown, impresión/PDF y presentación.
  5. Cubrir límites de tamaño y pruebas de importación/exportación.
- Criterios: una tabla se puede crear, editar y borrar sin Markdown ni atajos ocultos, y sobrevive a guardado, recarga y exportación con una estructura predecible.
- Notas: revisar si conviene una barra flotante de tabla o acciones dentro de la barra del documento; evitar duplicar botones en dos menús.

## 2026-11-19 — ADOC-16 · Importar como flujo propio y más formatos

- Contexto: ya existe un menú **Importar** con Importar documento, Abrir Office y Migrar apps antiguas, pero el diálogo interno solo ofrece Markdown y DOCX/PPTX. Falta una entrada clara para pegar, arrastrar o importar otros formatos y explicar qué se convierte y qué se pierde.
- Alcance:
  1. Revisar y consolidar el flujo de importación: archivo, arrastrar/soltar, pegar y migración de datos anteriores.
  2. Evaluar HTML, texto plano, JSON de recuperación y otros formatos viables; no prometer ODT/RTF sin decidir una librería y su fidelidad.
  3. Unificar vista previa, avisos, confirmación y estados de error.
  4. Evitar importaciones duplicadas y conservar el origen cuando corresponda.
  5. Documentar formatos aceptados y límites.
- Criterios: todas las importaciones entran por una ruta comprensible, muestran vista previa y avisos antes de reemplazar y no obligan a conocer menús antiguos.
- Notas: la importación no debe convertirse en un editor de formatos externos; el documento canónico sigue siendo el JSON de Aula.

## 2026-11-19 — ADOC-17 · Varios documentos y gestión de la suite

- Contexto: Aula Documentos guarda un único documento por proyecto. Una suite documental necesita organizar varios documentos, recuperar el último abierto y evitar que crear uno sustituya al anterior.
- Alcance:
  1. Definir el modelo de varios documentos por proyecto y su migración desde el documento único actual.
  2. Añadir lista, crear, duplicar, renombrar, archivar/eliminar y restaurar con copia.
  3. Mantener URLs profundas, permisos, invitados y MCP sin ambigüedad sobre qué documento se abre.
  4. Mostrar fecha, extracto y estado de cada documento.
  5. Añadir pruebas de concurrencia, cuotas y recuperación.
- Criterios: se pueden tener varios documentos sin perder el actual, abrir uno concreto desde un enlace y revertir una eliminación; la migración conserva el documento existente.
- Notas: decidir si se comparte la hoja de cálculo o si cada app mantiene su propio modelo; no anidar datos sin una migración reversible.

## 2026-11-19 — ADOC-18 · Buscar, esquema y navegación del documento

- Contexto: los documentos y presentaciones pueden crecer; faltan herramientas para encontrar texto, saltar entre secciones y orientarse dentro de la hoja.
- Alcance:
  1. Buscar y reemplazar con resultados, navegación y respeto a mayúsculas/acentos.
  2. Esquema de títulos con salto a sección.
  3. Navegador de diapositivas y salto directo a una diapositiva.
  4. Modo enfoque y barra de estado con recuento, sección actual y estado de guardado.
  5. Atajos de teclado y accesibilidad.
- Criterios: encontrar y sustituir no rompe el formato, el esquema refleja los títulos reales y la navegación funciona con teclado y en móvil.
- Notas: no confundir búsqueda del navegador con búsqueda interna; no cargar un índice costoso si el documento es pequeño.

## 2026-11-19 — ADOC-19 · Presentación y PDF de calidad

- Contexto: el modo presentación existe, pero faltan controles de edición de diapositivas y una salida PDF más predecible para clase y entrega.
- Alcance:
  1. Reordenar, duplicar y eliminar diapositivas desde una vista de estructura.
  2. Vista de presentador con notas y siguiente diapositiva.
  3. Ajustes de página/diapositiva y exportación PDF con saltos y recursos controlados.
  4. Conservar notas, imágenes, tablas y diagramas en la salida.
  5. Revisar impresión, teclado y rendimiento.
- Criterios: una presentación se puede preparar y presentar sin editar saltos a mano, y el PDF reproduce el resultado visible sin recursos externos.
- Notas: la exportación PDF no debe depender de un servicio externo; reutilizar el HTML imprimible cuando sea posible.

## 2026-11-19 — ADOC-20 · Comentarios, revisión e historial

- Contexto: el aula necesita revisar documentos y dejar observaciones, pero hoy solo existen autosave, conflictos y copias locales. No hay comentarios ni versiones legibles.
- Alcance:
  1. Comentarios anclados a texto o bloques, con responder, resolver y borrar.
  2. Historial de versiones con nombre, fecha, autor y restauración.
  3. Permisos por rol: invitados en lectura, alumnado según proyecto, profesorado/administración con revisión.
  4. Exportar o imprimir comentarios cuando se solicite.
  5. Resolver concurrencia y límites de tamaño.
- Criterios: una persona puede revisar sin modificar el texto, restaurar una versión anterior y ver quién cambió qué sin perder el documento actual.
- Notas: separar comentarios de control de cambios; el control de cambios puede ser otro bloque si se necesita.

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
