# Roadmap ARC-03 — Estado de cliente y persistencia

> **Estado:** Activo · **Origen:** ARC-03 del backlog (2026-11-20)
> **Backlog:** ARC-04 a ARC-06, ADOC-16 a ADOC-20, UI-11 y DEV-01 (10 entradas) · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Definir una única puerta de almacenamiento local para preferencias, historial, progreso y recuperación.
- [ ] Retirar o justificar el sistema de borradores versionados sin consumidores reales.
- [ ] Conservar el comportamiento de cada app y la persistencia de documentos compartidos en `useAppDocument`.
- [ ] Criterio de éxito: no quedan módulos de producto sin consumidores, no hay llamadas directas a `localStorage` fuera del contrato y las pruebas cubren datos corruptos, cuotas y migración.

## 2. Alcance

**Dentro:**

- Inventario de claves, formatos, consumidores y pruebas de `localStorage`.
- Decisión sobre `useVersionedDraft`, `versioned-draft-recovery`, `unsaved-changes-dialog` y `version-conflict-dialog`.
- Nuevo contrato de almacenamiento local en la capa de cliente compartida.
- Migración de Calculadora, tema, Blockly, Tarjetas y recuperación local de Aula Documentos.
- Pruebas de cuota, JSON corrupto, claves ausentes, versiones y migración.
- Documentación, changelog y baseline al cerrar cada bloque.

**Fuera:**

- Mover documentos compartidos de `app_documents` a `localStorage`.
- Cambiar URLs, permisos, textos, datos o autosave de proyecto.
- Rediseñar la interfaz o el sistema de CSS de ARC-04.
- Crear el harness de pruebas de ARC-05 o reorganizar servidor de ARC-06.
- Cambiar la versión del Site, publicar o aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `localStorage` solo para estado local del cliente | Usarlo como almacén de documentos compartidos | Los documentos de proyecto ya tienen `useAppDocument` y una fuente de verdad en el servidor. |
| Una sola API de lectura/escritura/eliminación | Accesos directos a `window.localStorage` en cada hook | Centraliza validación, cuotas, migración y manejo de errores. |
| Envoltura versionada y validada por consumidor | Guardar JSON suelto sin esquema | Permite fallback seguro y migraciones sin romper la app. |
| Retirar el sistema de borradores si no aparece un consumidor real | Mantenerlo como infraestructura preventiva | 877 líneas de producto y pruebas mantienen una función inexistente. |
| Conservar claves existentes o migrarlas explícitamente | Renombrar sin transición | Evita perder preferencias, historial o progreso de repaso. |
| Errores de cuota visibles y no destructivos | Fallar en silencio o borrar datos del usuario | La app debe seguir usable y avisar cuando no pueda persistir. |

## 4. Punto de partida

Medición del 2026-11-20:

| Área | Archivo principal | Líneas |
|---|---|---:|
| Sistema de borradores muerto | `use-versioned-draft.ts` | 527 |
| Sistema de borradores muerto | `versioned-draft-recovery.ts` | 123 |
| Sistema de borradores muerto | `unsaved-changes-dialog.tsx` / `version-conflict-dialog.tsx` | 79 / 148 |
| Calculadora | `use-calculator.ts` | 262 |
| Blockly | `use-blockly.ts` | 265 |
| Tema | `use-theme.ts` | 71 |
| Tarjetas | `use-tarjetas-review.ts` | 155 |
| Aula Documentos | `use-aula-recovery.ts` / `recovery.ts` | 155 / 166 |

El baseline no tiene archivos de código por encima de 600 líneas. `useAppDocument` seguirá siendo la persistencia de documentos compartidos; este roadmap solo unifica el estado local del navegador.

## 5. Fases

### Fase 1 — Inventario y decisión sobre borradores

- [ ] Inventariar claves, formatos, consumidores y pruebas de `localStorage`.
- [ ] Confirmar si alguna app necesita `useVersionedDraft`; si no, retirarlo con su recuperación, diálogos, estilos y pruebas.
- [ ] Eliminar imports, CSS y pruebas huérfanas; registrar la decisión y el ahorro.
- [ ] Añadir una prueba de que ningún módulo de producto sin consumidores queda en el catálogo.
- **Criterios:** no quedan módulos de borradores sin consumidor; no hay imports rotos; suite y `arch:check` pasan.

### Fase 2 — Contrato único de almacenamiento local

- [ ] Crear un módulo de cliente compartido con lectura, escritura y eliminación tipadas.
- [ ] Definir claves con espacio de nombres, envoltura de versión, validación por consumidor y fallback seguro.
- [ ] Manejar ausencia de `window`, JSON corrupto, cuota agotada y migraciones de versión.
- [ ] Permitir inyectar un almacenamiento en memoria para pruebas.
- [ ] Cubrir clave ausente, dato corrupto, cuota, versión antigua y versión futura.
- **Criterios:** una sola API para el estado local; ningún producto fuera del contrato; pruebas deterministas; `arch:check` sin problemas.

### Fase 3 — Migrar preferencias e historial

- [ ] Migrar el modo e historial de Calculadora al contrato, conservando sus claves o una migración explícita.
- [ ] Migrar la preferencia de tema y mantener la sincronización entre pestañas.
- [ ] Preservar el comportamiento cuando el navegador bloquea o llena el almacenamiento.
- [ ] Añadir pruebas de recarga, valor inválido y migración desde las claves actuales.
- **Criterios:** Calculadora y tema conservan su comportamiento; no hay accesos directos a `localStorage` en esos módulos; suite y presupuestos pasan.

### Fase 4 — Migrar Blockly, Tarjetas y recuperación de Aula

- [ ] Migrar el respaldo local de Blockly sin sustituir su documento de `useAppDocument`.
- [ ] Migrar el progreso FSRS de Tarjetas conservando claves y compatibilidad con el progreso existente.
- [ ] Migrar las copias de recuperación local de Aula Documentos y sus límites.
- [ ] Añadir pruebas de cuota, corrupción, migración y recuperación tras recarga.
- **Criterios:** los tres flujos conservan sus datos y límites; ningún documento compartido se mueve a `localStorage`; suite y presupuestos pasan.

### Fase 5 — Consolidación y cierre

- [ ] Auditar que ningún módulo de producto accede a `localStorage` fuera del contrato, salvo pruebas y migraciones justificadas.
- [ ] Revisar que autosave, cierre sin guardar y conflictos no duplican mecanismos.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget` y `perf:office`.
- **Criterios:** una sola puerta de almacenamiento local, sin módulos muertos, documentación actualizada, suite y presupuestos correctos; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pérdida de claves existentes | Preferencias, historial o progreso desaparecen | Migración explícita y pruebas con datos reales. |
| Cuota agotada | La app deja de guardar sin avisar | Error visible, fallback en memoria y pruebas de `QuotaExceededError`. |
| Datos corruptos | Una app no arranca | Validación por consumidor y fallback seguro. |
| Duplicar persistencia | Dos fuentes de verdad | `useAppDocument` para documentos; contrato local solo para estado local. |
| Dependencia de `window` en SSR | Fallo de renderizado | API segura sin `window` y pruebas de entorno servidor. |
| Retirar código aún usado | Regresión silenciosa | Búsqueda de imports, pruebas y `arch:check` antes de borrar. |

## 7. Notas de sesión

- 2026-11-20: ARC-03 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **10 entradas**; siguiente candidato **ARC-04**.
- La persistencia de documentos compartidos sigue en `useAppDocument`; el contrato local no sustituye D1.
- Estado de partida: **396 archivos de producto / 982 imports / 5 violaciones base / 0 ciclos / 0 problemas**; sin excepciones de tamaño de código.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
