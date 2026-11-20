# Roadmap ARC-02 — Descomponer las apps monolíticas restantes

> **Estado:** Completada · **Origen:** ARC-02 del backlog (2026-11-20)
> **Backlog:** ARC-03 a ARC-06, ADOC-16 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [x] Separar estado, dominio y UI en Timeline, Hoja de cálculo, Office y Tarjetas sin cambiar su comportamiento.
- [x] Extraer los archivos residuales de Aula Documentos que el baseline todavía asigna a ARC-02.
- [x] Aplicar el mismo patrón a Mapas, Ajedrez y Geometría solo cuando el tamaño o la mezcla de responsabilidades lo justifiquen.
- [x] Criterio de éxito: cada app intervenida tiene un shell reconocible, sus archivos TS/TSX de producto quedan por debajo de 600 líneas, las pruebas cubren los flujos y `arch:check` no conserva excepciones de tamaño de ARC-02.

## 2. Alcance

**Dentro:**

- `app/board/apps/timeline/`: shell, hooks de edición, componentes de vista y pruebas.
- `app/board/apps/hoja-calculo/`: shell, hook de edición, rejilla, barra de fórmulas, exportación y pruebas.
- `app/board/shared/office/`: visor, selector de archivo, controles y exportadores DOCX/PPTX.
- `app/board/apps/tarjetas/`: shell, editor de mazos/tarjetas, repaso y pruebas.
- `app/board/apps/mapas/`, `ajedrez/` y `geometria/`: evaluación y extracción solo donde haya una responsabilidad separable.
- `lib/domain/aula-documentos/document.ts` y `app/board/shared/aula-documentos/mermaid-block.tsx`: descomposición residual.
- `arch-baseline.json`, documentación, changelog y backlog al cerrar cada bloque.

**Fuera:**

- Cambiar URLs, permisos, textos, formato de datos, claves de persistencia o autosave.
- Rediseñar la interfaz o crear el sistema de CSS de ARC-04.
- Rescatar o retirar el sistema de borradores de ARC-03.
- Crear un harness de pruebas compartido de ARC-05.
- Reorganizar `lib/server` o las rutas API de ARC-06.
- Cambiar la versión del Site, publicar o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Separar por responsabilidad y consumidor | Trocear solo por número de líneas | Un archivo corto puede seguir mezclando estado, dominio y presentación. |
| Mantener los contratos externos de cada app | Aprovechar para cambiar APIs o datos | El roadmap es de estructura; el comportamiento y la compatibilidad no se negocian. |
| Extraer una utilidad compartida solo con dos consumidores reales | Crear una capa común preventiva | Evita abstracciones sin uso y mantiene el diff revisable. |
| Mantener el CSS en ARC-04 | Mezclar el rediseño visual con la descomposición | Los presupuestos y capas visuales tienen dueño y caducidad propios. |
| Refactorizar Mapas, Ajedrez y Geometría solo con justificación | Aplicar el patrón a todas por uniformidad | Son apps más pequeñas; el churn sin responsabilidad clara no aporta valor. |
| Retirar una excepción de `arch-baseline.json` al terminar su archivo | Dejar excepciones “por si acaso” | El baseline debe reflejar deuda real, no trabajo ya resuelto. |

## 4. Punto de partida

Medición del 2026-11-20, antes de empezar:

| Área | Archivo principal | Líneas |
|---|---|---:|
| Timeline | `timeline-app.tsx` | 720 |
| Timeline | `timeline-model.ts` | 401 |
| Hoja de cálculo | `hoja-calculo-app.tsx` | 552 |
| Hoja de cálculo | `hoja-calculo-formula.ts` | 561 |
| Office | `office-viewer.tsx` | 577 |
| Office | `office-export.ts` | 554 |
| Tarjetas | `tarjetas-app.tsx` | 442 |
| Mapas | `mapas-app.tsx` | 362 |
| Ajedrez | `ajedrez-app.tsx` | 309 |
| Geometría | `geometria-app.tsx` | 382 |
| Aula Documentos | `lib/domain/aula-documentos/document.ts` | 655 |
| Aula Documentos | `shared/aula-documentos/mermaid-block.tsx` | 607 |

`arch-baseline.json` mantiene excepciones de tamaño para Timeline, `document.ts` y `mermaid-block.tsx`. `timeline.css` (503), `office-viewer.css` (512) y `tarjetas.css` (621) superan el límite de CSS, pero pertenecen a ARC-04 y no se convierten en criterio de este roadmap.

## 5. Fases

### Fase 1 — Timeline

- [x] Extraer el shell de `timeline-app.tsx` y dejar la composición de ventana en un archivo pequeño.
- [x] Mover la carga/guardado, la selección, los formularios y las acciones de eventos/épocas a hooks con responsabilidades acotadas.
- [x] Separar la barra de herramientas, el panel de edición, los formularios y el host del lienzo en componentes de vista.
- [x] Mantener `timeline-model.ts` como contrato del documento y conservar plantillas, zoom, grupos y lectura invitada.
- [x] Cubrir crear, editar y borrar eventos/épocas, cambiar plantilla, guardar/cargar y permisos de invitado.
- [x] Retirar Timeline de `largeFiles` en `arch-baseline.json`.
- **Criterios:** shell <450 líneas; archivos TS/TSX de producto <600; sin cambios de URL, permisos, claves de persistencia ni textos funcionales; tests, `arch:check` y presupuestos pasan.

### Fase 2 — Hoja de cálculo

- [x] Separar el shell de `hoja-calculo-app.tsx` de la inicialización y el ciclo de vida de la rejilla.
- [x] Extraer selección, barra de fórmulas, formato y exportación CSV a hooks/componentes con límites claros.
- [x] Mantener `hoja-calculo-formula.ts` y `hoja-calculo-model.ts` como módulos de dominio; dividirlos solo si la fase descubre responsabilidades mezcladas.
- [x] Conservar fórmulas, estilos, límites, autosave y lectura invitada.
- [x] Añadir o ajustar pruebas de edición, fórmulas, formato, CSV, guardado/carga y errores.
- **Criterios:** shell <450 líneas y componentes/hooks <600; semántica de fórmulas y formato intacta; sin cambios de datos o persistencia; suite, `arch:check` y presupuestos pasan.

### Fase 3 — Office: visor y exportación

- [x] Dividir el visor en selector/validación de archivo, host de renderizado, controles de zoom y navegación.
- [x] Extraer el estado de carga, errores y ciclo de vida de la instancia a un hook.
- [x] Separar la exportación en construcción DOCX, construcción PPTX y utilidades compartidas de contenido.
- [x] Mantener los mismos formatos aceptados, avisos, nombres de descarga y resultados de exportación.
- [x] Cubrir DOCX/PPTX, tablas, imágenes, avisos, controles del visor y errores de archivo.
- **Criterios:** archivos TS/TSX de producto <600; salidas Office equivalentes; pruebas existentes y nuevas pasan; sin dependencias nuevas; presupuestos pasan.

### Fase 4 — Tarjetas y apps secundarias

- [x] Extraer de Tarjetas el shell, el editor de mazos/tarjetas y la sesión de repaso a componentes/hooks separados.
- [x] Mantener FSRS, progreso local, permisos y autosave sin cambios.
- [x] Medir Mapas, Ajedrez y Geometría; extraer solo si hay una responsabilidad clara y dejar por escrito la decisión cuando no la haya.
- [x] Cubrir creación/edición/borrado, repaso, progreso y estados vacíos de Tarjetas.
- **Criterios:** Tarjetas con shell reconocible y archivos TS/TSX <600; Mapas, Ajedrez y Geometría quedan igual o mejor justificados, sin refactors cosméticos; CSS sigue en ARC-04; pruebas y presupuestos pasan.

### Fase 5 — Residual de Aula Documentos

- [x] Separar `document.ts` en tipos, normalización y tablas, conservando un punto de entrada compatible para sus consumidores.
- [x] Separar `mermaid-block.tsx` en render, edición y acciones.
- [x] Retirar `document.ts` y `mermaid-block.tsx` de `largeFiles` en `arch-baseline.json`.
- [x] Añadir o ajustar pruebas de normalización, tablas, spans, límites, render y edición de Mermaid.
- **Criterios:** ningún archivo de producto de ARC-02 supera 600 líneas; el documento serializado y las importaciones públicas siguen siendo compatibles; `arch:check` no conserva excepciones de tamaño de ARC-02; suite y presupuestos pasan.

### Fase 6 — Cierre

- [x] Actualizar `arquitectura-global.md`, `arch-baseline.json`, changelog y backlog.
- [x] Ejecutar `npm run check`, suite completa, build, `perf:budget` y `perf:office`.
- [x] Archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** todas las fases verificadas; sin archivos de ARC-02 por encima de 600 líneas ni excepciones de tamaño sin dueño; documentación y presupuestos actualizados; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Comportamiento oculto en componentes grandes | Regresiones en edición, autosave o permisos | Pruebas por flujo antes y después de cada extracción. |
| Abstracciones sin consumidores | Deuda nueva y diffs innecesarios | Extraer solo con dos consumidores reales o justificación escrita. |
| Pérdida de fidelidad en DOCX/PPTX | Exportaciones distintas | Conservar fixtures y comparar contenido, avisos y estructura. |
| Acoplamiento de pruebas al DOM | Refactor bloqueado por tests frágiles | Probar comportamiento visible y contratos de datos. |
| Confundir ARC-02 con ARC-04 | Mezclar CSS, responsive y descomposición | Mantener el alcance visual fuera de este roadmap. |
| Baseline obsoleto | Excepciones que ocultan deuda resuelta | Retirar cada excepción en la fase que la resuelve y revisar el inventario al cerrar. |

## 7. Notas de sesión

- 2026-11-20: ARC-02 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **11 entradas**; siguiente candidato **ARC-03**.
- La medición de partida se tomó de los archivos actuales; algunas cifras del backlog habían quedado desactualizadas.
- `arch:check` sigue siendo la puerta de arquitectura: 357 archivos de producto, 907 imports y 0 problemas nuevos al abrir este roadmap.
- 2026-11-20: **Fase 1 completada.** Timeline pasa de un `timeline-app.tsx` de 720 líneas a un shell de 100 líneas, hooks de editor/lienzo y tarjetas de vista separadas. Se retiró su excepción de `largeFiles`; `arch:check` queda en **364 archivos / 923 imports / 0 problemas**. Suite: **228 archivos / 1.584 pruebas**; build, `perf:budget` y `perf:office` correctos.
- 2026-11-20: **Fase 2 completada.** Hoja de cálculo queda con un shell de 80 líneas, hooks de documento y rejilla, barra de herramientas, barra `fx`, panel lateral y exportación CSV separada. Se conservaron fórmulas, estilos, límites, autosave y lectura invitada. Suite: **229 archivos / 1.585 pruebas**; `arch:check` en **370 archivos / 933 imports / 0 problemas**; `hoja-calculo` en **310.192 / 315.000 B gzip**.
- 2026-11-20: **Fase 3 completada.** El visor Office queda con un hook de archivo/visor y componentes de cabecera, controles, error y estado vacío. La exportación se separa en utilidades comunes, DOCX y PPTX, manteniendo el barrel público. Añadidas pruebas del estado vacío, formato inválido y modo embebido. Suite: **230 archivos / 1.589 pruebas**; `arch:check` en **379 archivos / 951 imports / 0 problemas**; `aula-documentos` 369.601, export 329.694 y Office 196.481 B gzip.
- 2026-11-20: **Fase 4 completada.** Tarjetas pasa de un `tarjetas-app.tsx` de 442 líneas a un shell de 98 líneas, hooks de editor/repaso y componentes de mazos, formulario, lista y sesión. Se mantienen FSRS, localStorage, permisos y autosave. Mapas (362), Ajedrez (309) y Geometría (382) no se refactorizan: están por debajo de 600 líneas, no tienen excepción en el baseline y no hay una separación que justifique el churn. `tarjetas.css` sigue siendo ARC-04. Suite: **230 archivos / 1.590 pruebas**; `arch:check` en **389 archivos / 970 imports / 0 problemas**; `hoja-calculo` 310.201, `aula-documentos` 369.609, export 329.701 y Office 196.481 B gzip.
- 2026-11-20: **Fase 5 completada.** `document.ts` queda como barrel de 2 líneas, con tipos, tablas y validación separados; `mermaid-block.tsx` queda como extensión de 44 líneas, con vista, cabecera, vista previa y almacén de borradores. Se retiraron las dos excepciones de `largeFiles` y el baseline queda sin archivos de código por encima de 600 líneas. Añadidas pruebas de acciones del bloque y del registro de borradores. Suite: **232 archivos / 1.593 pruebas**; `arch:check` en **396 archivos / 982 imports / 0 problemas**; `aula-documentos` 369.825 / 370.000 B gzip; export 329.699; Office 196.481.
- 2026-11-20: **Fase 6 completada y ARC-02 cerrado.** Documentación, changelog y backlog actualizados. Verificación final: suite **232 archivos / 1.593 pruebas**; `npm run check`, `tsc`, ESLint, build, `perf:budget` y `perf:office` correctos; `aula-documentos` **369.831 / 370.000 B gzip**, export **329.694**, Office **196.481** y hoja **310.193 B gzip**. `arch:check`: **396 archivos / 982 imports / 0 problemas**; `largeFiles` vacío.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
