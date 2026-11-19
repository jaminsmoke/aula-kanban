# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 5 entradas pendientes
> **Nota:** ADOC-xx identifica mejoras de Aula Documentos; UI-xx mejoras de interfaz; DOC-01…DOC-12 ya están usados por el bloque documental histórico.

---

## 2026-11-19 — ADOC-09 · Menús y barra de edición

- **Prioridad:** P1.
- **Contexto:** la barra de Aula Documentos es casi toda de iconos y mezcla formato, inserción, archivo y presentación. En móvil, «Acciones» solo agrupa archivo; el formato sigue siendo una fila de iconos sin etiqueta visible. Faltan acciones que el editor ya soporta o que se esperan en un editor de documentos.
- **Alcance:**
  1. Agrupar las acciones en menús claros: Archivo, Formato, Insertar y Exportar; eliminar duplicados y dejar una sola entrada para presentar.
  2. Añadir etiquetas visibles en los menús y conservar tooltips, foco y estados activos/deshabilitados.
  3. En móvil, ofrecer un menú de formato etiquetado además de «Acciones».
  4. Incorporar en una primera fase tachado, línea horizontal, limpiar formato, alineación y listas de tareas; valorar tablas, imágenes y buscar/reemplazar en una fase posterior.
- **Criterios de aceptación:**
  - Todas las acciones se alcanzan con uno o dos pasos y tienen nombre accesible.
  - La barra no se desborda a 390, 620, 900, 1024 y 1366 px.
  - Las acciones nuevas se guardan, exportan y vuelven a cargar sin perder formato.
- **Notas:** el alcance de tablas e imágenes debe decidirse aparte porque añaden extensiones, validación, almacenamiento y pruebas de exportación.

## 2026-11-19 — ADOC-10 · Paridad de apps heredadas

- **Prioridad:** P2.
- **Contexto:** Notas y documentos, Diagramas y Presentaciones usan el guardado incondicional anterior a ADOC-07. No tienen autosave, estado sucio, guarda de cierre ni resolución de conflictos. Diagramas tampoco recibe el rol: un invitado puede pulsar Guardar o Limpiar y el servidor rechaza la escritura. «Cargar», «Limpiar» y «Reiniciar» pueden descartar cambios sin confirmación.
- **Alcance:**
  1. Decidir si estas apps se mantienen como productos independientes o quedan como fuentes de importación de Aula Documentos.
  2. Si se mantienen: usar `saveVersioned`, autosave, indicador de cambios, guarda de cierre y copias recuperables.
  3. Impedir la edición de invitados en Diagramas y revisar el resto de roles.
  4. Pedir confirmación antes de cargar, limpiar o reiniciar contenido con cambios.
  5. Unificar nombres de exportación basados en el título.
- **Criterios de aceptación:**
  - Ninguna app pierde cambios en silencio al cerrar, cargar o reiniciar.
  - Un invitado no puede editar ni guardar desde Diagramas.
  - Los conflictos se resuelven con el mismo contrato que Aula Documentos.
- **Notas:** es una decisión de producto antes que de código. Si Aula Documentos absorbe estas experiencias, conviene reducir las apps heredadas a modo lectura/importación en lugar de duplicar mantenimiento.

## 2026-11-19 — ADOC-11 · Diagramas: lienzo y editor

- **Prioridad:** P2.
- **Contexto:** la vista previa de Diagramas usa el tema oscuro, aparece recortada y con scroll horizontal, y deja mucho espacio vacío. No hay ajuste automático, zoom, paneo ni pantalla completa. El editor es un textarea plano, sin números de línea ni resaltado, y la exportación SVG usa el `projectId` en vez de un nombre legible.
- **Alcance:**
  1. Lienzo claro y legible para la vista previa, independiente del tema de la interfaz.
  2. Ajuste automático, zoom, paneo y pantalla completa, con controles de teclado.
  3. Evaluar un editor con resaltado y números de línea sin romper el límite de peso.
  4. Errores de sintaxis completos con línea y detalle, y exportación SVG con nombre derivado del contenido o del título.
- **Criterios de aceptación:**
  - Los diagramas se ven completos a 390, 1024 y 1366 px sin recortes iniciales.
  - El zoom y el paneo funcionan con ratón, tacto y teclado.
  - La exportación conserva el SVG legible y un nombre de archivo identificable.
- **Notas:** las confirmaciones de Limpiar/Cargar y el modo invitado pertenecen a ADOC-10; este bloque se centra en el lienzo y la edición.

## 2026-11-19 — Hoja de cálculo · Recuperar el cálculo automático

- Las fórmulas se conservan como texto porque Jspreadsheet CE 5.0.4 evalúa las expresiones como JavaScript. El siguiente motor debe evaluar fórmulas de documentos compartidos sin ejecutar JavaScript y acotar el coste de sus rangos y referencias.
- Verificar que el ejemplo de presupuesto vuelve a calcular sus totales y que las fórmulas guardadas se recuperan sin perderse.

## 2026-11-17 — DEV-01 · Evaluar la migración de npm a pnpm

- Contexto: hay varios proyectos, cada uno con su propio `node_modules`, y la caché global de npm de este equipo ocupa unos 14,8 GB. pnpm comparte un store global mediante hardlinks y reduce el espacio y el tiempo de instalación cuando varios proyectos usan las mismas versiones. Este repo tiene un solo worktree, `node_modules` de 1,68 GB y una cadena de instalación, release, CI y publicación todavía específica de npm.
- Alcance:
  1. Definir la estrategia global: nuevos proyectos con pnpm desde el inicio, store en el mismo volumen que los proyectos para conservar los hardlinks y un orden de migración para los repos existentes.
  2. Hacer el spike de este repo en una copia desechable con una versión de pnpm fijada por Corepack, `pnpm import`, instalación con lockfile congelado y comprobación de dependencias fantasma.
  3. Comparar espacio real y tiempo de instalación con npm después de limpiar la caché; medir también lint, `tsc`, tests, build y `perf:budget`.
  4. Si el resultado es viable, adaptar `packageManager`, `pnpm-lock.yaml`, `.npmrc`, `install:ci`, `install-ci.sh`, CI, `prepare-release`, README y AGENTS antes de retirar `package-lock.json`.
- Criterios: instalación limpia en Windows y Linux, todos los checks en verde, publicación de prueba validada por Codex/Sites y ahorro de disco demostrado. Si Sites no admite pnpm o aparecen roturas por hoisting, se conserva npm y solo se limpia la caché.
- Notas: no mantener dos lockfiles ni dos gestores en el mismo repo. No migrar este repo hasta confirmar el soporte de Sites; los proyectos nuevos sí pueden empezar en pnpm mientras tanto. No borrar la caché de npm hasta que los proyectos que aún lo usen estén migrados o se acepte volver a descargar paquetes.
