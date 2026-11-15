# Roadmap — UI-06 · Hero compacto del tablero

> **Entrada:** UI-06 — Hero del tablero compacto (sale del backlog).
> **Backlog:** UI-04 (vista de administración) y UI-05 (estados vacíos de fichas).
> **Estado:** En curso · Fase 1 completada, fases 2 y 3 pendientes.
> **Versión:** `1.1.30` sin cambios hasta el cierre.

---

## 1. Objetivo

- [x] Convertir el hero de Tareas en una franja compacta con el progreso en línea, para que el kanban domine el primer pantallazo.
- [x] Criterio de éxito: en 1366×768, con la cabecera y el sidebar, la primera tarjeta de la columna izquierda se ve sin desplazar; el progreso mantiene su nombre accesible «Progreso del grupo».

## 2. Alcance

**Dentro:**
- `app/board/tasks/kanban-view.tsx` (estructura del hero) y `app/board/tasks/kanban.css` (franja, progreso y responsive).
- Ajuste del hueco con la barra de herramientas para no encadenar dos títulos.
- Pruebas de `kanban-view` que cubren titular, progreso, alta y estado de invitado.

**Fuera de alcance:**
- Cálculo del progreso, datos, filtros y orden de las columnas.
- Cabecera, sidebar y layout general de la aplicación.
- Cualquier cambio en UI-04 o UI-05.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Franja de una fila: `h1` + progreso en línea + «Nueva tarea» | Panel oscuro independiente con el porcentaje a `--text-8xl` | El panel añade altura y compite con el kanban; el dato cabe en una línea. |
| Se retiran `eyebrow` («Grupo de clase») e intro | Conservarlos como subtítulo | El proyecto activo y la barra de herramientas ya dan ese contexto; repetirlo empuja el tablero hacia abajo. |
| Se conserva la frase «N de M tareas hechas» junto al porcentaje | Sustituirla por «N/M · %» | Mantiene el texto que ya cubren las pruebas y sigue siendo explícito para lectores de pantalla. |
| Se retira el `h2` «Kanban» de la barra de herramientas | Dejar los dos títulos | Evita dos bloques de título seguidos; el `h1` ya nombra la vista y el `section` conserva su `aria-label`. |
| Barra de progreso fina bajo la franja o junto al texto, con tokens del tema | Reutilizar el fondo inverso del panel actual | Debe funcionar en claro y oscuro sin el bloque oscuro. |

## 4. Fases

### Fase 1: Línea base y composición

- [x] Medir la huella actual desde `kanban.css`: caja mínima de 230 px, relleno de 30/34 px, márgenes de 32 px arriba y abajo (294 px con márgenes) y cabecera de 76 px, así que el kanban arranca hacia los 370 px. El panel de progreso mide 265 px o más y el titular usa `--text-display`.
- [x] Fijar la composición: una sola franja con `h1`, progreso en línea («N de M tareas hechas» y porcentaje), barra fina y botón de alta; sin `eyebrow`, sin intro y sin panel oscuro.
- [x] Fijar el objetivo: 120 px de caja y 140 px contando márgenes, con apilado en 620 px y 430 px.
- **Criterios de aceptación:** la composición decide qué se retira y qué se conserva, y el objetivo de altura es medible. No hay cambio visual en esta fase.

### Fase 2: Implementación del hero compacto

- [x] Reescribir el hero como franja con `h1`, resumen de progreso y botón; retirar `eyebrow`, intro y panel oscuro.
- [x] Retirar el `h2` «Kanban» y realinear los filtros de la barra de herramientas.
- [x] Ajustar `kanban.css`: alto, relleno, márgenes, barra de progreso y responsive de 620 y 430 px.
- [x] Mantener el estado de invitado sin botón de alta y el `progress` con `aria-label="Progreso del grupo"`.
- **Criterios de aceptación:** el hero mide 120 px o menos de caja en escritorio; el progreso y el alta siguen funcionando; sin desbordes en móvil. La medición renderizada queda en la fase 3.

### Fase 3: Verificación y cierre

- [ ] Actualizar y ejecutar las pruebas de `kanban-view`; comprobar titular, progreso, alta e invitado.
- [ ] Medir la altura renderizada en 1366×768 y en 390 px de ancho, y comprobar que la primera tarjeta se ve sin desplazar.
- [ ] Ejecutar tipos, lint y build; anotar el resultado en el changelog.
- [ ] Cerrar el roadmap desde la plantilla y actualizar `docs/README.md`.
- **Criterios de aceptación:** criterio de éxito cumplido con medición real, checks en verde y documentación de cierre.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Las pruebas dependen de textos del hero | Fallos al cambiar el marcado | Conservar «N de M tareas hechas» y el nombre accesible del progreso. |
| El progreso pierde contraste al quitar el fondo oscuro | Dato poco legible | Usar tokens de texto y de pista del tema claro/oscuro. |
| La franja se aprieta en móvil | Desbordes o botón cortado | Apilado explícito en 620 y 430 px y prueba visual en 390 px. |
| No hay sesión para medir el tablero real | La línea base no es renderizada | Línea base desde CSS; la medición renderizada queda en la fase 3. |

## 6. Notas de sesión

- 2026-11-15: UI-06 sale del backlog y se abre este roadmap. Fase 1 cerrada con la línea base de CSS (230 px de caja mínima, 294 px con márgenes, 76 px de cabecera) y la composición de una franja. Sin cambios de código ni de versión; `1.1.30` se mantiene.
- 2026-11-15: fase 2 implementada. El hero es una franja de tres áreas (`title`, `progress`, `action`) con `h1`, «N de M tareas hechas», porcentaje y barra fina; se retiraron `eyebrow`, intro, panel oscuro y el `h2` «Kanban». Apilado en 820 px y en 620 px. La altura renderizada se mide en la fase 3.
- El servidor local de `127.0.0.1:5173` responde, pero no hay sesión iniciada para medir el tablero autenticado; por eso la medición renderizada se traslada a la fase 3.
