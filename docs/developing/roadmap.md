# Roadmap ADOC-09 · Menús y barra de edición

> **Estado:** Activo · **Origen:** ADOC-09 del backlog (2026-11-19)
> **Backlog:** ADOC-10, ADOC-11, Hoja de cálculo y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Reorganizar la barra de Aula Documentos en menús claros y etiquetados, sin duplicar acciones ni esconder el formato solo en iconos.
- [ ] Criterio de éxito: cualquier acción se encuentra en uno o dos pasos en escritorio y móvil, tiene nombre accesible y la barra no se desborda entre 390 y 1366 px.

## 2. Alcance

**Dentro:**

- Menús de Archivo, Formato, Insertar, Exportar y Presentar.
- Agrupación de acciones y eliminación de duplicados.
- Etiquetas visibles, iconos coherentes, atajos y estados activo/deshabilitado.
- Menú de formato etiquetado en móvil, además de «Acciones».
- Navegación por teclado, foco, Escape y cierre al pulsar fuera.
- Acciones nuevas: tachado, línea horizontal, limpiar formato, alineación y listas de tareas.
- Guardado, exportación HTML/impresión y recarga de las acciones nuevas.
- Pruebas de menús, accesibilidad, serialización y tamaños.

**Fuera de alcance:**

- Tablas, imágenes y buscar/reemplazar; se valorarán en otra entrada por el coste de extensiones, almacenamiento y exportación.
- Cambiar el modelo del documento o su esquema v2 más allá de las extensiones necesarias.
- Rediseñar el lienzo blanco o los temas; eso ya está en ADOC-08.
- Paridad de Notas, Diagramas y Presentaciones; eso corresponde a ADOC-10.
- Cambiar `AULA_STORE_VERSION`, versiones de app o el Site.
- Publicar en Sites: el cierre termina con un push al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Menús por intención | Seguir añadiendo iconos sueltos | Archivo, Formato, Insertar y Exportar se entienden sin memorizar iconos. |
| Mantener un grupo directo mínimo (negrita, cursiva, subrayado, enlace, deshacer/rehacer) | Mover todo a menús | Las acciones frecuentes siguen a un clic y el resto gana claridad. |
| Un único componente de menú reutilizable | Implementar cada desplegable por separado | Comparte teclado, foco, cierre y estados. |
| Menús no modales | Reutilizar el foco atrapado de los diálogos | Un menú debe cerrarse con Escape o al pulsar fuera, sin encerrar al usuario. |
| Etiquetas visibles dentro de los menús | Depender solo de tooltips | En táctil no hay hover y los iconos no siempre son autoexplicativos. |
| Una sola entrada para presentar | Mantener barra y panel lateral duplicados | Reduce ambigüedad y mantenimiento. |
| Acciones nuevas con extensiones oficiales de Tiptap 3.34.0 | Reescribir comandos manuales | Alineación y listas de tareas necesitan extensiones probadas. |
| Markdown conserva solo lo representable | Inventar sintaxis para alineación | El HTML y el JSON conservan todo; Markdown no tiene esa capacidad estándar. |

## 4. Fases

### Fase 1 — Arquitectura de menús y escritorio

- [ ] Definir el modelo de acciones y grupos con etiqueta, icono, atajo, estado y comando.
- [ ] Crear un menú reutilizable con apertura, cierre, teclado y pulsación exterior.
- [ ] Reorganizar la barra: grupo directo mínimo, Archivo, Formato, Insertar, Exportar y una sola acción Presentar.
- [ ] Eliminar duplicados entre barra, panel lateral y diálogos.
- [ ] Cubrir con pruebas el orden, los estados activo/deshabilitado y las acciones disponibles.
- **Criterios de aceptación:**
  - Cada acción tiene una única ubicación y un nombre accesible.
  - Los menús funcionan con ratón y teclado.
  - La barra no se desborda a 900, 1024 y 1366 px.

### Fase 2 — Móvil y accesibilidad

- [ ] Añadir un menú «Formato» etiquetado junto a «Acciones» en contenedores estrechos.
- [ ] Mantener objetivos táctiles de 44×44 px y etiquetas visibles.
- [ ] Revisar foco, Escape, devolución al disparador y orden de tabulación.
- [ ] Evitar solapamientos y scroll horizontal a 390, 620 y 900 px.
- [ ] Cubrir con pruebas la apertura/cierre, el teclado y los nombres accesibles.
- **Criterios de aceptación:**
  - En móvil se llega a cualquier acción en dos pasos como máximo.
  - El menú no atrapa el foco ni deja elementos inaccesibles.
  - La barra y los menús caben sin desbordarse.

### Fase 3 — Acciones nuevas y serialización

- [ ] Añadir tachado, línea horizontal y limpiar formato con las capacidades actuales de StarterKit.
- [ ] Evaluar e incorporar alineación y listas de tareas con las extensiones oficiales de Tiptap 3.34.0.
- [ ] Extender el Markdown y la exportación HTML para tachado, línea horizontal y listas de tareas; documentar la limitación de alineación en Markdown.
- [ ] Revisar el impacto en el bundle y el presupuesto de rendimiento.
- [ ] Cubrir con pruebas guardado, recarga, HTML, impresión y Markdown.
- **Criterios de aceptación:**
  - Las acciones nuevas se guardan y vuelven a cargar sin perder formato.
  - HTML e impresión conservan todas las acciones.
  - Markdown conserva tachado, línea horizontal y listas de tareas; la alineación se mantiene en JSON y HTML.

### Fase 4 — Verificación y cierre

- [ ] Revisar escritorio y móvil a 390, 620, 900, 1024 y 1366 px.
- [ ] Revisar todos los menús con teclado, tacto y lector de pantalla.
- [ ] Actualizar ayuda, capturas y changelog si cambian los flujos.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget`.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-09.md`, reiniciar `developing/roadmap.md` y dejar el backlog con cuatro entradas.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Todos los menús y acciones nuevas se verifican con datos reales.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Menús que atrapan el foco o no se cierran | Bloqueo de teclado | Patrón no modal, Escape, click fuera y pruebas. |
| Extensiones nuevas elevan el bundle | Se supera el presupuesto | Medir antes/después y cargar solo lo necesario. |
| Acciones nuevas no serializan en Markdown | Exportación incompleta | Definir el subconjunto Markdown y conservar todo en HTML/JSON. |
| Duplicados supervivientes | Dos fuentes de verdad | Modelo único de acciones y pruebas de presencia. |
| Cambios de toolbar rompen atajos | Pérdida de productividad | Mantener Ctrl/Cmd+B/I/K/S y cubrirlos con pruebas. |
| Menús móviles tapan el documento | Mala experiencia | Posicionamiento dentro del contenedor y cierre al seleccionar. |

## 6. Notas de sesión

- 2026-11-19: ADOC-09 sale del backlog y pasa a ser el roadmap activo.
- Puntos de partida: `app/board/apps/aula-documentos/aula-documentos-app.tsx`, `aula-documentos.css`, `app/board/shared/aula-documentos/document-extensions.ts`, `lib/domain/aula-documentos/markdown.ts` y las pruebas de la app.
- Estado actual: barra de iconos, archivo a la derecha, «Acciones» solo en móvil y «Presentar» duplicado. StarterKit ya ofrece tachado y línea horizontal, pero no tienen botón; alineación y listas de tareas requieren extensiones.
- No se abordan tablas, imágenes ni buscar/reemplazar. La barra debe seguir funcionando con el guardado condicional y la recuperación de ADOC-07.
