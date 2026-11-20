# Auditoría de estado local y persistencia

> **Estado:** Fase 1 de ARC-03 · **Fecha:** 2026-11-20
> **Alcance:** claves de `localStorage`, consumidores, datos y sistema de borradores versionados.
> **Regla:** los documentos compartidos viven en `useAppDocument`; `localStorage` solo guarda estado local del cliente.

## 1. Decisión

El sistema de borradores versionados **se retira**. No tiene ningún consumidor de producto: `useVersionedDraft`, `versioned-draft-recovery`, `unsaved-changes-dialog` y `version-conflict-dialog` solo se importaban entre sí o desde sus propias pruebas. Aula Documentos ya tiene su autosave, persistencia y recuperación propios; el resto de apps usa `useAppDocument` para documentos compartidos.

No se conserva como infraestructura preventiva. Si una app necesita autosave local en el futuro, debe entrar por el contrato de la Fase 2 y demostrar un consumidor real.

## 2. Inventario de claves

| Clave | Formato | Consumidor actual | Decisión |
|---|---|---|---|
| `aula-kanban-calculator-mode` | `"basica" \| "cientifica"` | `use-calculator.ts` | Conservar y migrar en Fase 3 |
| `aula.calc.history` | JSON `HistoryEntry[]` | `use-calculator.ts` | Conservar y migrar en Fase 3 |
| `aula-kanban-theme` | `"light" \| "dark" \| "system"` | `use-theme.ts` y script de arranque | Conservar, migrar y respetar el arranque temprano |
| `aula.blockly.${projectId}` | JSON de workspace Blockly | `use-blockly.ts` | Conservar como respaldo local; el documento compartido sigue en `useAppDocument` |
| `aula-kanban-tarjetas:${projectId}` | JSON `TarjetasProgress` | `use-tarjetas-review.ts` | Conservar y migrar en Fase 4 |
| `aula-kanban:aula-documentos:recuperacion:${projectId}` | JSON de copias de recuperación | `lib/domain/aula-documentos/recovery.ts` | Conservar y migrar en Fase 4 |
| `aula-kanban:borrador:${projectId}:${appId}` | Copia versionada de borrador | Sistema retirado | Eliminar; sin consumidor |

## 3. Código retirado

| Archivo | Líneas |
|---|---:|
| `app/board/apps/use-versioned-draft.ts` | 527 |
| `app/board/apps/use-versioned-draft.test.tsx` | 247 |
| `app/board/apps/versioned-draft-recovery.ts` | 123 |
| `app/board/apps/versioned-draft-recovery.test.ts` | 107 |
| `app/board/apps/unsaved-changes-dialog.tsx` | 79 |
| `app/board/apps/unsaved-changes-dialog.test.tsx` | 68 |
| `app/board/apps/unsaved-changes-dialog.css` | 132 |
| `app/board/apps/version-conflict-dialog.tsx` | 148 |
| `app/board/apps/version-conflict-dialog.test.tsx` | 129 |
| `app/board/apps/version-conflict-dialog.css` | 134 |

Total: **1.694 líneas** retiradas (877 de producto, 551 de pruebas y 266 de CSS).

`useWindowCloseGuard` y `useDialogFocus` se mantienen: Aula Documentos los usa para su propio cierre y sus diálogos.

## 4. Consecuencias para la Fase 2

- El contrato debe permitir conservar las claves actuales o migrarlas sin pérdida.
- El tema se lee también desde un script anterior a React; la migración no puede romper ese arranque.
- Blockly mantiene dos capas: `useAppDocument` para el documento compartido y el respaldo local para recuperación.
- Las copias de Aula Documentos tienen límites y validación propios que deben conservarse.
- Toda lectura debe tolerar JSON corrupto, clave ausente, versión desconocida y cuota agotada.

## 5. Verificación de la Fase 1

- No quedan imports de los módulos retirados en `app`, `lib` ni `scripts`.
- Añadida una prueba de regresión que falla si vuelven a aparecer sus símbolos.
- `npm run check`, suite y `arch:check` se ejecutan después de la retirada: **392 archivos / 975 imports / 0 problemas**, **229 archivos / 1.573 pruebas**, build y presupuestos correctos.
- El Site sigue en `1.1.37`; no se publica nada desde esta fase.
