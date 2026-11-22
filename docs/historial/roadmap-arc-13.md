# Roadmap ARC-13 — Retirar reglas CSS duplicadas en las ventanas de apps

> **Estado:** Completado (2026-11-22) · **Origen:** ARC-13 del backlog
> **Backlog:** 2 entradas · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [x] Eliminar la declaración duplicada de `.edu-app` en Calculadora.
- [x] Definir una base de ventana compartida para las apps que hoy repiten la misma disposición con variaciones locales.
- [x] Conservar las diferencias de contenido, desplazamiento, foco y comportamiento de cada app.
- [x] Criterio de éxito: menos CSS duplicado y menos carga por ruta, con las ventanas y los temas visualmente equivalentes.

## 2. Alcance

**Dentro:**

- Inventario de reglas, variables y consumidores de `edu-base.css`, `calculadora.css`, `tabla-periodica.css` y las ventanas de Mapas, Líneas de tiempo, Tarjetas, Moléculas y Hoja de cálculo; Ajedrez, Física y Geometría reproducen el mismo patrón y se incorporan al alcance.
- Eliminación de la regla `.edu-app` duplicada en Calculadora.
- Decisión entre reutilizar `.edu-app` o introducir una clase base neutral para las ventanas.
- Reutilización de la base solo cuando no altere la disposición, el scroll ni el foco de cada app.
- Revisión en temas claro y oscuro, ventanas estrechas y maximizadas.
- Medición del CSS neto, de la carga por ruta y de los presupuestos.

**Fuera:**

- Cambiar la estructura React, los componentes o el comportamiento de las apps.
- Rediseñar ventanas, barras o contenido.
- Tocar Aula Documentos, la portada o la documentación pública.
- Cambiar datos, URLs, permisos, MCP o la versión del Site.
- Publicar en Sites o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Medir consumidores antes de conservar variables locales | Mantener todas por si acaso | Una variable sin consumidor es deuda y puede ocultar dependencias. |
| Compartir solo la disposición de ventana | Unificar todo el CSS de las apps | El contenido, las barras y el scroll tienen contratos distintos. |
| Mantener las clases raíz por app | Sustituir todas por `.edu-app` sin más | Cada app necesita contenedores y nombres de container query propios. |
| Conservar `container-type` y container queries | Medir por viewport | Las apps se redimensionan dentro del escritorio. |
| Verificar Calculadora y Tabla periódica juntas y separadas | Revisar solo una app | Comparten `edu-base.css` y pueden romperse por una regla compartida. |
| Medir CSS por ruta | Medir solo el total del repositorio | La carga inicial y los presupuestos son por flujo. |

## 4. Punto de partida

- Calculadora carga `edu-base.css` y vuelve a declarar `.edu-app` en `calculadora.css`.
- `edu-base.css` aporta la ventana flexible, `container-type`, la paleta y las vistas `edu-*` a Calculadora y Tabla periódica.
- Mapas, Líneas de tiempo, Tarjetas, Moléculas y Hoja de cálculo repiten en su clase raíz: `flex`, ancho, `min-width`, `min-height`, columna, alto, fondo, tinta y `container`.
- Cada app conserva un `container-name` propio y reglas locales de toolbar, contenido y scroll.
- Baseline de ARC-12: arquitectura **461 archivos / 1.154 imports**; suite **268 archivos / 1.774 pruebas**; Aula **386.658 / 387.000 B**; Hoja **312.862 / 315.000 B**; Site `1.1.39`.

## 5. Fases

### Fase 1 — Inventario y contrato de la ventana

- [x] Inventariar reglas duplicadas, variables locales y consumidores en las apps afectadas.
- [x] Comparar `.edu-app` con las clases raíz de Mapas, Líneas, Tarjetas, Moléculas y Hoja.
- [x] Decidir si la base compartida es `.edu-app` o una clase neutral nueva.
- [x] Identificar variables sin consumidores y reglas que deben seguir locales.
- [x] Documentar el contrato en [`css-ventanas-apps.md`](../developing/css-ventanas-apps.md).
- **Criterios:** mapa completo y decisión justificada; sin cambios de producto.
- **Cierre (2026-11-22):** contrato en [`css-ventanas-apps.md`](../developing/css-ventanas-apps.md). `.edu-app` está duplicada en `calculadora.css`; sus 14 variables locales no tienen ningún `var()`; ocho clases raíz más repiten la misma disposición. Se decide una clase neutral `.app-window` que conserve `container-name` y variables locales por app. Sin cambios de producto.

### Fase 2 — Base compartida y Calculadora

- [x] Retirar la declaración duplicada de `.edu-app` de `calculadora.css`.
- [x] Conservar en Calculadora solo variables y reglas propias de su contenido.
- [x] Aplicar la base decidida a las ventanas que puedan reutilizarla sin cambiar su disposición.
- [x] Mantener las diferencias de cada app y sus container queries.
- **Criterios:** mismo aspecto y comportamiento, con menos reglas duplicadas.
- **Cierre (2026-11-22):** `.app-window` centraliza la disposición; las diez entradas la importan y las nueve clases raíz la aplican. Se retiró el `.edu-app` duplicado y las 14 variables sin consumidor. **CSS -117 líneas netas** (133 retiradas, 16 añadidas); TSX +10 por imports y clases. Calculadora **124 → 95** CSS; Hoja **345 → 335**. Suite enfocada **26 / 174**; `npm run check` correcto.

### Fase 3 — Verificación visual y de carga

- [x] Revisar Calculadora y Tabla periódica juntas y por separado.
- [x] Revisar Mapas, Líneas, Tarjetas, Moléculas y Hoja de cálculo.
- [x] Comprobar temas claro y oscuro, ventanas estrechas y maximizadas, foco y desplazamiento.
- [x] Medir CSS neto, carga por ruta, `app:budget` y `perf:budget`.
- **Criterios:** sin desbordamientos ni regresiones visuales; presupuestos correctos.
- **Cierre (2026-11-22):** revisión a **390 y 1366 px** de las apps instaladas y de Mapas, Líneas, Moléculas y Geometría con una ruta temporal retirada. Todas las raíces conservan `.app-window` y `container-name`, con `scrollWidth === clientWidth`; temas claro/oscuro y foco/scroll correctos. `npm run check`, suite **268 / 1.774**, `app:budget`, `perf:budget` y `perf:office` correctos. Build **386.673 B** (Aula) y **313.034 B** (Hoja); CSS neto **-117 líneas**.

### Fase 4 — Cierre

- [x] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [x] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** CSS reducido y verificado, sin cambios funcionales ni publicación desde el roadmap.
- **Cierre (2026-11-22):** checks, suite, build y presupuestos finales correctos. Changelog, README, arquitectura y backlog actualizados; roadmap archivado y `roadmap.md` reiniciado sin roadmap activo. Push único a GitHub; sin publicación en Sites ni migraciones.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Compartir demasiado CSS | Cambios de layout difíciles de rastrear | Compartir solo la disposición de ventana y conservar reglas locales. |
| Perder una variable con consumidor | Regresión visual | Inventario de consumidores antes de retirar. |
| Romper container queries | La app deja de responder al ancho de ventana | Conservar `container-type` y probar anchos estrechos. |
| Medir solo el total | Aumento de carga por ruta | Medir flujos y presupuestos por app. |
| Cambiar el orden de carga | Regresión de estilos | Mantener la carga actual y verificar la build servida. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** ARC-13 es la siguiente candidata recomendada del backlog; quedan ARC-14 y DEV-01. Se empieza por el inventario y el contrato de ventana. Sin cambios de producto en esta apertura.
- 2026-11-22: **Fase 1 completada.** Inventario en [`css-ventanas-apps.md`](../developing/css-ventanas-apps.md): `.edu-app` duplicada, 14 variables sin consumidor, ocho clases raíz con la misma disposición y decisión de usar `.app-window`. Sin cambios de producto.
- 2026-11-22: **Fase 2 completada.** `.app-window` y sus imports aplicados a las diez entradas; duplicado y variables retirados. **CSS -117 líneas netas**; Calculadora **95** y Hoja **335** líneas CSS. Revisión visual y bundle en la Fase 3.
- 2026-11-22: **Fase 3 completada.** Revisión visual a **390/1366 px** y temas claro/oscuro; apps no instaladas verificadas con una ruta temporal retirada. Sin desbordamiento de raíz, foco y scroll operativos. Suite **268 / 1.774**; build **386.673 B** y **313.034 B**; presupuestos correctos.
- 2026-11-22: **Fase 4 completada y roadmap cerrado.** Checks, suite, build, presupuestos, changelog, README, arquitectura, backlog y archivo del roadmap. `roadmap.md` se reinicia sin roadmap activo; push único a GitHub. Sin publicación en Sites ni migraciones.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
