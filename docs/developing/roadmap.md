# Roadmap ARC-13 — Retirar reglas CSS duplicadas en las ventanas de apps

> **Estado:** Activo (2026-11-22) · **Origen:** ARC-13 del backlog
> **Backlog:** 2 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Eliminar la declaración duplicada de `.edu-app` en Calculadora.
- [ ] Definir una base de ventana compartida para las apps que hoy repiten la misma disposición con variaciones locales.
- [ ] Conservar las diferencias de contenido, desplazamiento, foco y comportamiento de cada app.
- [ ] Criterio de éxito: menos CSS duplicado y menos carga por ruta, con las ventanas y los temas visualmente equivalentes.

## 2. Alcance

**Dentro:**

- Inventario de reglas, variables y consumidores de `edu-base.css`, `calculadora.css`, `tabla-periodica.css` y las ventanas de Mapas, Líneas de tiempo, Tarjetas, Moléculas y Hoja de cálculo.
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

- [ ] Inventariar reglas duplicadas, variables locales y consumidores en las seis apps.
- [ ] Comparar `.edu-app` con las clases raíz de Mapas, Líneas, Tarjetas, Moléculas y Hoja.
- [ ] Decidir si la base compartida es `.edu-app` o una clase neutral nueva.
- [ ] Identificar variables sin consumidores y reglas que deben seguir locales.
- [ ] Documentar el contrato en [`css-ventanas-apps.md`](css-ventanas-apps.md).
- **Criterios:** mapa completo y decisión justificada; sin cambios de producto.

### Fase 2 — Base compartida y Calculadora

- [ ] Retirar la declaración duplicada de `.edu-app` de `calculadora.css`.
- [ ] Conservar en Calculadora solo variables y reglas propias de su contenido.
- [ ] Aplicar la base decidida a las ventanas que puedan reutilizarla sin cambiar su disposición.
- [ ] Mantener las diferencias de cada app y sus container queries.
- **Criterios:** mismo aspecto y comportamiento, con menos reglas duplicadas.

### Fase 3 — Verificación visual y de carga

- [ ] Revisar Calculadora y Tabla periódica juntas y por separado.
- [ ] Revisar Mapas, Líneas, Tarjetas, Moléculas y Hoja de cálculo.
- [ ] Comprobar temas claro y oscuro, ventanas estrechas y maximizadas, foco y desplazamiento.
- [ ] Medir CSS neto, carga por ruta, `app:budget` y `perf:budget`.
- **Criterios:** sin desbordamientos ni regresiones visuales; presupuestos correctos.

### Fase 4 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** CSS reducido y verificado, sin cambios funcionales ni publicación desde el roadmap.

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
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
