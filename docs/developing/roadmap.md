# Roadmap STORE-18 — Fichas de producto para apps-suites

> **Estado:** Activo · **Origen:** STORE-18 del backlog (2026-11-19)
> **Backlog:** DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Definir una ficha de producto reutilizable para apps-suites y aplicarla a Aula Documentos sin duplicar promesas de apps que ya son funciones internas.
- [ ] Criterio de éxito: la tarjeta y la ficha de Aula Documentos explican qué incluye la suite, qué formatos abre y exporta, qué sustituye y cómo se migra; el patrón sirve para futuras suites sin convertir la Tienda en un catálogo ambiguo y sin cambiar la versión del Site.

## 2. Alcance

**Dentro:**
- Modelo opcional de suite en el catálogo compartido: promesa corta, capacidades agrupadas, módulos incluidos, formatos de apertura y exportación, capturas y aviso de migración.
- Ficha de Aula Documentos con jerarquía de suite, módulos, formatos, capturas y migración desde las apps retiradas.
- Tarjeta de Aula Documentos que comunica la suite y no compite con módulos internos.
- Representación explícita de apps que pasan a ser funciones internas: no aparecen como instalables ni como promesas duplicadas.
- Contrato reutilizable y documentado para futuras apps-suites.

**Fuera de alcance:**
- Añadir nuevos editores, módulos o funciones a Aula Documentos.
- Rediseñar las fichas de las apps individuales que no son suites.
- Cambiar datos, migraciones, permisos o MCP de la suite.
- Publicar en Sites o cambiar la versión del Site (`1.1.36`).
- Retirar nuevas apps del catálogo; las cuatro documentales ya se retiraron en ADOC-13.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `suite` opcional dentro de `NativeAppMeta` | Un catálogo paralelo de suites | Mantiene una sola fuente para Tienda, MCP, ficha y pruebas, y deja intactas las apps individuales. |
| Datos de suite en `lib/native-apps` | Datos hardcodeados en `store-detail.tsx` | La ficha debe ser data-driven y compartible con MCP y documentación. |
| Ficha condicional: suite si existe, ficha actual si no | Reescribir todas las fichas | El patrón debe ser reutilizable sin regresiones en las trece apps actuales. |
| Tarjeta compacta con promesa y módulos | Repetir la ficha completa en la tarjeta | La galería debe seguir siendo escaneable y evitar duplicar la misma promesa. |
| Aviso de migración en la metadata de suite | Tarjetas retiradas que compiten con la suite | Las apps absorbidas ya no son instalables; la ruta de migración se explica en la ficha de la suite. |
| Capturas opcionales con texto alternativo | Imágenes decorativas sin contrato | Accesibilidad y compatibilidad con futuras suites. |
| Sin cambio de `appVersion` de Aula Documentos | Subir la versión de la app por un rediseño de Tienda | La app no cambia; solo cambia su representación en Aula Store. `AULA_STORE_VERSION` sí recibe la versión de la Tienda. |

## 4. Fases

### Fase 1 — Contrato y datos de suite

- [x] Definir el tipo `NativeAppSuite` en `lib/native-apps.ts`: promesa, módulos, grupos de capacidades, formatos de apertura/exportación, capturas y migración.
- [x] Añadir `suite?: NativeAppSuite` a `NativeAppMeta`, manteniéndolo opcional para las apps individuales.
- [x] Completar la metadata de Aula Documentos con sus módulos, formatos y migración desde Notas, Diagramas, Presentaciones y Visor Office.
- [x] Validar la estructura con pruebas puras: campos requeridos, grupos no vacíos, formatos normalizados y ausencia de IDs retirados como apps instalables.
- [x] Añadir una prueba de compatibilidad que confirme que las apps sin `suite` siguen mostrando su ficha actual.
- **Criterios de aceptación:**
  - El catálogo sigue siendo la única fuente de la ficha.
  - Aula Documentos declara la suite completa sin duplicar apps retiradas.
  - Las demás apps no cambian de comportamiento ni de datos.

### Fase 2 — Ficha y tarjeta de suite

- [ ] Rediseñar `StoreDetail` para suites: portada, promesa, módulos incluidos, capacidades agrupadas, formatos de apertura/exportación, capturas y aviso de migración.
- [ ] Adaptar `StoreCard` para mostrar la promesa de suite y un resumen de módulos sin romper la galería ni las acciones de instalar/abrir/desinstalar.
- [ ] Mantener la ficha técnica existente (versión, upstream, ampliaciones) como sección secundaria de la suite.
- [ ] Añadir estilos responsive y accesibles con los tokens existentes; revisar teclado, foco, contraste y reducción de movimiento.
- [ ] Cubrir la ficha y la tarjeta con pruebas de render, contenido, acciones y navegación por teclado.
- **Criterios de aceptación:**
  - La ficha de Aula Documentos explica con claridad qué incluye y qué formatos abre y exporta.
  - La tarjeta comunica la suite sin repetir la ficha completa ni prometer apps retiradas.
  - Las apps individuales conservan su tarjeta y ficha actuales.
  - Sin desbordamiento a 390, 620, 900, 1024 y 1366 px en tema claro y oscuro.

### Fase 3 — Integración, documentación y cierre

- [ ] Revisar la representación en Tienda, Aula Store MCP y documentación de apps; ajustar textos y capturas.
- [ ] Actualizar `docs/Store/apps/document-suite.md`, `integradas.md`, `mcp-apps.md` y la ayuda si cambia la forma de presentar la suite.
- [ ] Subir `AULA_STORE_VERSION` a la versión de la Tienda que corresponda; conservar `Aula Documentos 1.2.0` y el Site `1.1.36`.
- [ ] Ejecutar suite completa, `tsc`, ESLint, build, `perf:budget` y `perf:office`; revisar los cinco anchos y ambos temas.
- [ ] Actualizar el changelog, archivar este roadmap, reiniciar `roadmap.md` y dejar DEV-01 en el backlog.
- [ ] Hacer commits locales por fase y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - La ficha de suite es la única promesa de Aula Documentos en la Tienda.
  - El patrón queda documentado y probado para futuras suites.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Duplicar la promesa de la suite en la tarjeta y la ficha | Confusión y ruido visual | Tarjeta breve con promesa y módulos; detalle completo solo en la ficha. |
| Convertir la ficha en una lista larga de funciones | Pérdida de jerarquía | Grupos de capacidades y límite de elementos visibles; contenido secundario plegable si hace falta. |
| Volver a mostrar apps retiradas como instalables | Competencia falsa con la suite | Validación contra `NATIVE_APP_IDS` y pruebas de catálogo. |
| Romper apps individuales al generalizar la ficha | Regresión en trece apps | Ficha condicional y pruebas de compatibilidad. |
| Capturas pesadas o sin accesibilidad | Rendimiento y barreras | Imágenes locales optimizadas, `alt` obligatorio y carga diferida. |
| El rediseño se convierte en nuevos módulos | Alcance desbordado | STORE-18 solo representa lo que ya existe; nuevas funciones requieren otro roadmap. |

## 6. Notas de sesión

- 2026-11-19: STORE-18 sale del backlog y pasa a ser el roadmap activo. ADOC-13 cerró la convergencia y retiró las cuatro apps documentales; el backlog queda con DEV-01.
- La ficha mínima de ADOC-13 ya no anuncia apps retiradas. Este roadmap desarrolla el patrón reutilizable de suite, no nuevas capacidades de edición.
- El Site sigue en `1.1.36`; no se publica nada desde este roadmap.
- 2026-11-19: Fase 1 completada. `NativeAppSuite` queda definido con promesa, módulos, capacidades agrupadas, formatos, capturas opcionales y migración. Aula Documentos declara Notas, Diagramas, Presentaciones y Office, sus formatos y las cuatro apps absorbidas; las apps individuales conservan la ficha clásica. Verificado con pruebas puras de estructura, compatibilidad y propagación al catálogo de la Tienda. Suite completa: 210 archivos / 1.485 pruebas; `tsc` y ESLint correctos.
