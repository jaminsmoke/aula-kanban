# Roadmap UI-11 — Menús, atajos y barra de estado de Aula Documentos

> **Estado:** Activo (2026-11-21) · **Origen:** UI-11 del backlog
> **Backlog:** 1 entrada · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Inventariar cada acción y asignarle un único hogar: barra superior, barra del documento, menú contextual, panel o atajo.
- [ ] Evitar duplicar importar, exportar, guardar y acciones de revisión.
- [ ] Definir atajos consistentes, documentados y sin pisar los del editor.
- [ ] Revisar menús, desbordamiento, estados vacíos y barra de estado.
- [ ] Probar teclado, lector de pantalla y cinco anchos.
- [ ] Criterio de éxito: ninguna acción importante queda escondida o duplicada; el patrón se mantiene al añadir imágenes, tablas, búsqueda, documentos, comentarios e historial.

## 2. Alcance

**Dentro:**

- Inventario de acciones, menús, botones, atajos y estados actuales.
- Un único hogar para cada acción y una jerarquía de menús coherente.
- Eliminación de duplicados entre barra superior, barra del documento, paneles y menús móviles.
- Mapa central de atajos y ayuda visible.
- Barra de estado única con sección, palabras, diagramas, guardado y accesos de revisión.
- Estados vacíos, desbordamiento, menús móviles y cinco anchos.
- Teclado, foco, lector de pantalla y contraste.
- Pruebas de acciones, atajos, menús y responsive.
- Documentación, ayuda y cierre.

**Fuera:**

- Cambiar el modelo de datos, URLs, permisos o persistencia.
- Rehacer el editor, la suite documental o las exportaciones.
- Añadir acciones nuevas sin una necesidad funcional concreta.
- Cambiar la versión del Site ni publicar desde este roadmap.
- Edición colaborativa, notificaciones o control de cambios.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Una acción tiene un solo hogar | Duplicarla en varias barras | La duplicación crea dudas sobre qué control usar y rompe el responsive. |
| Los menús se construyen desde un modelo de acciones | Listas JSX independientes por ancho | El mismo modelo debe alimentar escritorio y móvil sin divergencias. |
| Los atajos viven en un mapa documentado | Manejadores dispersos por componente | Evita conflictos y permite mostrar la ayuda desde una fuente única. |
| El atajo solo actúa con foco dentro de Aula | Interceptar teclas globales del navegador | No se secuestran atajos del navegador fuera de la app. |
| La barra de estado resume el estado real | Guardar estado duplicado en el documento | La sección, guardado y recuentos se derivan de fuentes existentes. |
| El móvil usa los mismos nombres y estados | Menús con lógica distinta | Reduce regresiones y facilita las pruebas. |
| Los paneles laterales no crean acciones paralelas | Repetir guardar/exportar dentro de cada panel | El panel ofrece contexto, no una segunda barra de herramientas. |
| Los cambios visuales se prueban con la suite existente | Depender de revisión manual | La verificación debe ser reproducible. |

## 4. Punto de partida

- La barra superior contiene Archivo, Importar, Exportar, Presentar y Guardar.
- La barra del documento contiene Formato, Insertar, herramientas directas, tablas y el estado de guardado.
- La barra inferior muestra sección, palabras, diagramas, guardado, comentarios, historial y enfoque.
- Búsqueda, esquema, navegador de diapositivas, comentarios e historial añadieron controles en los últimos roadmaps.
- Hay acciones distribuidas entre menús, paneles y botones directos; falta una revisión sistemática de hogar y duplicación.
- La ayuda de atajos existe, pero el mapa de atajos no está centralizado.
- Suite: **263 archivos / 1.732 pruebas**; arquitectura **455 archivos / 1.129 imports**; Aula Documentos **384.585 / 386.000 B gzip**; Site `1.1.37`.

## 5. Fases

### Fase 1 — Inventario, contrato y mapa de acciones

- [x] Inventariar cada acción visible u oculta y su ubicación actual.
- [x] Clasificar acciones por frecuencia, riesgo, contexto y ancho.
- [x] Definir el hogar único y la jerarquía de menús.
- [x] Fijar el mapa de atajos y la relación con búsqueda, enfoque y revisión.
- [x] Documentar el contrato en `docs/developing/aula-documentos-interfaz.md`.
- **Criterios:** todas las acciones tienen hogar, atajo o justificación de ausencia; no se mueve código todavía.
- **Cierre (2026-11-21):** contrato en [`aula-documentos-interfaz.md`](aula-documentos-interfaz.md): modelo de acción, inventario por barras y paneles, auditoría de duplicados, mapa de atajos, precedencia de `Escape`, barra de estado, responsive y matriz de pruebas. Sin cambios de código.

### Fase 2 — Menús y acciones sin duplicados

- [x] Reorganizar Archivo, Importar, Exportar, Formato e Insertar.
- [x] Retirar duplicados entre barras, paneles y menús móviles.
- [x] Compartir un modelo de acciones entre escritorio y móvil.
- [x] Resolver desbordamiento, estados vacíos y grupos de acciones.
- [x] Probar cada acción desde su nuevo hogar y el menú móvil.
- **Criterios:** no hay acciones importantes escondidas ni repetidas; el patrón funciona en escritorio y móvil.
- **Cierre (2026-11-21):** acciones con `id` estable, menús y grupos móviles construidos desde las mismas definiciones, formato móvil compartido y menú agrupado por Archivo/Importar/Exportar/Insertar/Documento. Pruebas de IDs y grupos. Suite: **264 archivos / 1.733 pruebas**; build **385.018 B**; presupuesto **386.000 B**.

### Fase 3 — Atajos y ayuda

- [ ] Crear un mapa central de atajos y comprobar conflictos.
- [ ] Mantener Ctrl/Cmd+F, Ctrl/Cmd+H, Ctrl/Cmd+Shift+O, Alt+Shift+F y Ctrl/Cmd+Alt+M.
- [ ] Mostrar la ayuda desde la misma fuente que el mapa.
- [ ] Probar atajos con foco en editor, paneles y diálogos.
- **Criterios:** los atajos son descubribles, no se pisan y solo actúan dentro de Aula Documentos.

### Fase 4 — Barra de estado, responsive y accesibilidad

- [ ] Unificar sección, palabras, diagramas, guardado, comentarios, historial y enfoque.
- [ ] Revisar cinco anchos, desbordamiento y menús táctiles.
- [ ] Revisar foco, etiquetas, contraste y lector de pantalla.
- [ ] Probar estados vacíos, solo lectura, guardado fallido y conflicto.
- **Criterios:** la barra no duplica información, el foco vuelve al origen y la interfaz sigue siendo usable en móvil.

### Fase 5 — Cierre

- [ ] Revisar que el mapa de acciones y la ayuda siguen el comportamiento real.
- [ ] Actualizar documentación, ayuda, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- **Criterios:** acciones, atajos y barra de estado estables y accesibles; suite y presupuestos correctos; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Duplicar acciones | El usuario duda qué control usar | Inventario y hogar único antes de tocar la UI. |
| Atajos en conflicto | El editor deja de responder | Mapa central y pruebas por contexto. |
| Menú móvil distinto | Regresiones solo en un ancho | Modelo de acciones compartido. |
| Barra sobrecargada | Se pierde el foco en el documento | Priorizar información y usar un solo lugar por dato. |
| Cambios visuales sin pruebas | Roturas de accesibilidad | Suite, cinco anchos y revisión de foco. |
| Alcance ilimitado | El roadmap se convierte en rediseño total | Limitar a acciones, menús, atajos y barra de estado existentes. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** UI-11 sale del backlog; queda **1 entrada** y el siguiente candidato es **DEV-01**. Sin cambios de código de producto.
- 2026-11-21: **Fase 1 completada.** Inventario de acciones, hogar único, duplicados, atajos, barra de estado y responsive en [`aula-documentos-interfaz.md`](aula-documentos-interfaz.md). Sin cambios de código.
- 2026-11-21: **Fase 2 completada.** IDs estables, menús y grupos móviles desde el mismo modelo, formato compartido y menú móvil agrupado. Suite: **264 archivos / 1.733 pruebas**; build **385.018 B**.
- La base es la interfaz actual de Aula Documentos, no un rediseño de la app ni del editor.
- No hay publicación ni migraciones remotas en este roadmap.
