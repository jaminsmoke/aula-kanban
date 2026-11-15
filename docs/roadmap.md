# Roadmap — UI-02 · Encuadre de miniaturas en las tarjetas

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** UI-02 — Encuadre de miniaturas en las tarjetas (sale del backlog).
> **Backlog:** PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, SYNC-01, MCP-05 y recortes de rendimiento (9 entradas). SYNC-01 se queda como norma operativa.
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** los commits y el push van al repo personal `jaminsmoke/aula-kanban`; Sites lo publica y verifica Codex de OpenAI. Un push no es una publicación.

---

## 1. Objetivo

- [ ] Mostrar la imagen completa en las tarjetas, sin recortes ni deformación, con una altura estable.
- [ ] Criterio de éxito: las imágenes horizontales, verticales y cuadradas se ven completas; la tarjeta conserva su distribución en escritorio y móvil; una imagen rota sigue mostrando «Imagen no disponible».

## 2. Alcance

**Dentro:**
- Ajustar `.card-image` en `app/board/tasks/kanban.css` para usar un marco de altura estable, `object-fit: contain` y fondo neutro.
- Tocar `app/board/tasks/task-card.tsx` solo si el marco o el fallback lo requieren.
- Mantener o ajustar la prueba de `TaskCard` para cubrir la presentación y el fallback.
- Revisar visualmente tarjetas con imágenes horizontales, verticales y cuadradas en escritorio y móvil.

**Fuera de alcance:**
- Cambiar subida, URLs, almacenamiento, permisos o miniaturas derivadas.
- Rediseñar el detalle de tarea, la vista previa del formulario o el sistema visual global.
- Cambiar la versión o desplegar.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Marco fijo de 130 px con `object-fit: contain` y fondo `var(--surface-muted)` | Mantener `object-fit: cover` | Muestra la imagen completa sin deformarla y conserva una altura predecible; las franjas quedan sobre un fondo neutro. |
| Mantener la tarjeta sin wrapper si el CSS basta | Añadir un contenedor nuevo | Evita cambios de estructura y de pruebas sin necesidad. |
| Limitar el cambio a las tarjetas | Unificar también detalle y vista previa | UI-02 describe el tablero; mezclar superficies amplía el alcance y el riesgo visual. |

## 4. Fases

### Fase 1 — Marco y verificación

- [ ] Sustituir `max-height`/`cover` por una altura estable de 130 px, `object-fit: contain` y fondo neutro, conservando el ancho completo y los radios.
- [ ] Revisar imágenes horizontales, verticales y cuadradas en escritorio y móvil; corregir desbordamientos sin cambiar la estructura de la tarjeta.
- [ ] Mantener el fallback de imagen rota y actualizar `task-card.test.tsx` si el cambio afecta al DOM.
- [ ] Ejecutar `npx tsc --noEmit`, `npx vitest run app/board/tasks/task-card.test.tsx` y `npm run build`.
- **Criterios de aceptación:** la imagen se ve completa y centrada, la altura de la tarjeta no depende de la proporción, el fallback sigue funcionando y los checks pasan.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Las imágenes muy panorámicas dejan franjas visibles | Aspecto menos lleno | Usar el fondo neutro del marco y aceptar las franjas antes que recortar. |
| Un fondo sólido compite con imágenes transparentes | Cambio visual inesperado | Usar `--surface-muted`, no blanco puro, y revisar contraste. |
| El cambio de altura altera el ritmo del tablero | Tarjetas más altas o huecos | Fijar 130 px, el máximo actual, y revisar las columnas en móvil. |

## 6. Notas de sesión

- UI-02 sale del backlog el 2026-11-15. CI-01 ya está cerrado y verificado en GitHub Actions.
- No se toca la persistencia de archivos ni se implementan miniaturas derivadas; eso sigue en PER-02/PER-03.
- La prueba actual de `TaskCard` ya cubre la imagen rota y el reintento al cambiar la URL.
