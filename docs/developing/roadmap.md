# Roadmap ARC-04 — Sistema visual, CSS y responsive

> **Estado:** Activo · **Origen:** ARC-04 del backlog (2026-11-20)
> **Backlog:** ARC-05, ARC-06, ADOC-16 a ADOC-20, UI-11 y DEV-01 (9 entradas) · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Ordenar el CSS en capas explícitas: tokens, base, primitivas, layout y estilos de app.
- [ ] Eliminar primitivas duplicadas y las cinco dependencias `features → layout` asignadas a ARC-04.
- [ ] Reducir los archivos CSS de producto por debajo de 500 líneas y retirar las excepciones de `largeCss`.
- [ ] Revisar las apps principales en cinco anchos y dos temas sin cambiar su comportamiento.
- [ ] Criterio de éxito: cada CSS tiene una responsabilidad reconocible, las primitivas compartidas tienen consumidores reales y `npm run check`, presupuestos y revisión responsive pasan.

## 2. Alcance

**Dentro:**

- Inventario y clasificación de los CSS de `app/`.
- Tokens semánticos y primitivas de botón, tarjeta, diálogo, estado vacío y barra.
- Capa de layout compartida que sustituya las cinco excepciones `features → layout`.
- Migración de estilos de Aula Documentos, tablero, Timeline, Hoja, Office, Tarjetas y apps secundarias.
- Revisión responsive en 393, 560, 860, 1024 y 1374 px, en tema claro y oscuro.
- Presupuestos por flujo, cargas diferidas y documentación visual.

**Fuera:**

- Rediseñar la identidad visual o cambiar textos, URLs, permisos o datos.
- Cambiar la estructura de apps, hooks o dominio de ARC-02/ARC-03.
- Crear un design system genérico sin consumidores.
- Sustituir el sistema de pruebas de ARC-05 o tocar servidor de ARC-06.
- Cambiar la versión del Site, publicar o aplicar migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Consolidar los tokens existentes de `globals.css` | Crear otra capa de variables paralela | Ya existen primitivas y tokens `ui-*`; duplicarlos empeora el problema. |
| Crear una primitiva solo con dos consumidores reales | Anticipar un design system completo | Evita abstracciones vacías y mantiene el CSS revisable. |
| Mantener el CSS propio de cada app junto a su app | Mover todo a un CSS global | Conserva las cargas diferidas y el aislamiento de ARC-02. |
| Usar una capa `shared/ui` para layout y primitivas | Permitir que `features` importe `layout` | Elimina las cinco excepciones actuales del baseline. |
| Revisar el CSS desde los flujos reales, no solo por archivo | Contar líneas sin abrir las apps | Los presupuestos no detectan desbordamientos ni temas. |
| No cambiar el comportamiento visual sin justificación | Aprovechar para rediseñar | El roadmap ordena estilos; no cambia producto. |

## 4. Punto de partida

Medición del 2026-11-20:

| Archivo | Líneas |
|---|---:|
| `app/portada.css` | 628 |
| `app/board/apps/tarjetas/tarjetas.css` | 547 |
| `app/board/shared/office/office-viewer.css` | 444 |
| `app/globals.css` | 439 |
| `app/board/apps/timeline/timeline.css` | 437 |
| `app/board/apps/aula-documentos/styles/blocks.css` | 419 |
| `app/board/apps/aula-documentos/styles/sidebar.css` | 415 |
| `app/board/apps/aula-documentos/styles/layout.css` | 407 |
| `app/board/apps/ajedrez/ajedrez.css` | 384 |
| `app/board/apps/hoja-calculo/hoja-calculo.css` | 352 |

Hay **46 archivos CSS / 8.900 líneas con contenido**. `arch-baseline.json` conserva excepciones de CSS para `portada.css` (628) y `tarjetas.css` (547), y cinco dependencias `features → layout` asignadas a ARC-04. Aula Documentos ya tiene sus estilos separados en `styles/` y sirve como piloto.

## 5. Fases

### Fase 1 — Inventario, capas y contrato visual

- [x] Clasificar los 46 CSS en tokens, base, primitivas, layout y app.
- [x] Localizar duplicados de botón, tarjeta, modal, estado vacío, barra, foco, borde y superficie.
- [x] Documentar las reglas de composición y qué capa puede importar cada estilo.
- [x] Identificar las cinco dependencias `features → layout` y el destino de sus primitivas.
- [x] Fijar el presupuesto de CSS por archivo y por flujo antes de mover estilos.
- **Criterios:** inventario completo, capas documentadas y ningún cambio visual aún; `arch:check` sigue pasando.

### Fase 2 — Tokens y base

- [x] Consolidar tokens semánticos de color, superficie, borde, foco, radio y espaciado en `globals.css`.
- [x] Eliminar valores literales duplicados que ya tengan token equivalente.
- [x] Revisar tipografía, foco visible, selección, scrollbars y comportamiento en ambos temas.
- [x] Mantener las primitivas existentes sin convertir `globals.css` en una hoja de componentes.
- [x] Añadir pruebas o comprobaciones estáticas de tokens y presupuestos.
- **Criterios:** tokens documentados y sin duplicados evidentes; `globals.css` sigue por debajo de 500 líneas; ningún flujo cambia de comportamiento.

### Fase 3 — Primitivas compartidas y layout

- [ ] Consolidar botones, tarjetas, diálogos, estados vacíos y barras con al menos dos consumidores reales.
- [ ] Crear la capa `shared/ui` para primitivas de layout.
- [ ] Migrar las cinco vistas `features` que hoy importan `layout` y retirar sus excepciones del baseline.
- [ ] Mantener nombres de clases y compatibilidad donde otros estilos dependan de ellos.
- [ ] Revisar foco, teclado, contraste y tamaños táctiles en las primitivas migradas.
- **Criterios:** primitivas con consumidores reales, cero excepciones `features → layout`, comportamiento y accesibilidad equivalentes.

### Fase 4 — Estilos de apps y presupuestos

- [ ] Dividir `portada.css` y `tarjetas.css` por responsabilidad, que son las dos excepciones de `largeCss`.
- [ ] Revisar Office, Timeline, Aula Documentos y las apps secundarias para retirar duplicados y reglas muertas sin dividir archivos que ya cumplen presupuesto.
- [ ] Mantener el CSS de cada app en su carga diferida; no mover estilos de app a `globals.css`.
- [ ] Reducir todos los CSS de producto por debajo de 500 líneas y retirar `largeCss` cuando corresponda.
- [ ] Actualizar presupuestos por flujo y comprobar que el CSS no se duplica entre apps.
- **Criterios:** ningún CSS de producto por encima de 500 líneas sin justificación, sin excepciones de ARC-04 y presupuestos correctos.

### Fase 5 — Responsive, temas y cierre

- [ ] Revisar las apps principales en 393, 560, 860, 1024 y 1374 px en claro y oscuro.
- [ ] Corregir desbordamientos, colisiones, textos truncados y controles táctiles sin cambiar el contenido.
- [ ] Documentar las reglas responsive y las excepciones visuales justificadas.
- [ ] Ejecutar `npm run check`, suite, build, `perf:budget` y `perf:office`.
- [ ] Actualizar changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** cinco anchos y dos temas revisados, presupuestos correctos, documentación actualizada y sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Regresión visual por especificidad | Cambios en pantallas no revisadas | Migrar por flujos y revisar los cinco anchos. |
| Duplicar tokens | Dos fuentes de color y espaciado | Consolidar lo existente antes de añadir. |
| Mover CSS a global | Aumentar el bundle inicial | Mantener cargas diferidas por app. |
| Reglas `!important` ocultas | La primitiva no se puede reutilizar | Inventariarlas y retirarlas por consumidor. |
| Falta de pruebas visuales | No detectar solapamientos | Revisión manual guiada y pruebas de estructura. |
| Cambiar comportamiento sin querer | Regresión funcional | No tocar markup salvo necesidad y conservar textos/clases. |

## 7. Notas de sesión

- 2026-11-20: ARC-04 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **9 entradas**; siguiente candidato **ARC-05**.
- Medición actual: **46 CSS / 8.900 líneas con contenido**; las cifras del backlog habían quedado desactualizadas.
- `globals.css` ya contiene primitivas y tokens `ui-*`; este roadmap los consolida, no crea un sistema paralelo.
- 2026-11-20: **Fase 1 completada.** Inventario y contrato de capas en [`css-audit.md`](css-audit.md): 46 CSS, duplicados, 38 `!important`, cinco dependencias `features → layout` y presupuestos. Sin cambios de estilos. `arch:check` sigue en **397 archivos / 988 imports / 0 problemas**.
- 2026-11-20: **Fase 2 completada.** Añadidos tokens de foco y medidas compartidas; botones, diálogos y acceso usan `--ui-control-height`, `--ui-icon-button-size` y `--ui-space-*`. El foco visible incluye enlaces. Corregido `--ui-focus` inexistente en `personal-space.css`. Añadida prueba estática de tokens; `globals.css` queda en 445 líneas. Suite: **234 archivos / 1.597 pruebas**; `arch:check` en **397 archivos / 988 imports / 0 problemas**; `aula-documentos` **369.347 / 370.000 B gzip**.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
