# Auditoría de estado local y persistencia

> **Estado:** Fases 1–3 de ARC-03 · **Fecha:** 2026-11-20
> **Alcance:** claves de `localStorage`, consumidores, datos y sistema de borradores versionados.
> **Regla:** los documentos compartidos viven en `useAppDocument`; `localStorage` solo guarda estado local del cliente.

## 1. Decisión

El sistema de borradores versionados **se retira**. No tiene ningún consumidor de producto: `useVersionedDraft`, `versioned-draft-recovery`, `unsaved-changes-dialog` y `version-conflict-dialog` solo se importaban entre sí o desde sus propias pruebas. Aula Documentos ya tiene su autosave, persistencia y recuperación propios; el resto de apps usa `useAppDocument` para documentos compartidos.

No se conserva como infraestructura preventiva. Si una app necesita autosave local en el futuro, debe entrar por el contrato de la Fase 2 y demostrar un consumidor real.

## 2. Inventario de claves

| Clave | Formato | Consumidor actual | Decisión |
|---|---|---|---|
| `aula-kanban-calculator-mode` | `"basica" \| "cientifica"` | `calculator-storage.ts` | Migrado en Fase 3 |
| `aula.calc.history` | JSON `HistoryEntry[]` | `calculator-storage.ts` | Migrado en Fase 3 |
| `aula-kanban-theme` | `"light" \| "dark" \| "system"` | `use-theme.ts` y script de arranque | Migrado en Fase 3; arranque temprano compatible |
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

## 6. Contrato implementado en la Fase 2

`app/board/shared/client-storage.ts` expone `createLocalState` y `clientStorageKey`:

- `read`: devuelve el valor validado o el fallback.
- `readResult`: añade `ok`, `missing`, `invalid`, `future` o `unavailable`, y si hubo migración.
- `write`: guarda `{ __aulaClientStorage: 1, version, data }` y devuelve `quota`, `unavailable` o `serialize` sin lanzar.
- `remove`: elimina la clave sin romper la app.
- `storage` inyectable; `null` simula SSR.
- `migrate` recibe el valor antiguo y su versión; las claves sin envoltura se tratan como legado.
- Los datos actuales, antiguos, futuros o corruptos se validan antes de exponerse.

La migración de Calculadora, tema, Blockly, Tarjetas y recuperación de Aula empieza en la Fase 3. El contrato está cubierto por diez pruebas (`client-storage.test.ts`): envoltura, clave ausente, JSON corrupto, legado, migración, versión futura, validación, cuota, SSR y eliminación.

## 7. Migración de Calculadora y tema

- `calculator-storage.ts` define estados versionados para `aula-kanban-calculator-mode` y `aula.calc.history`, con validación de modo e historial.
- `use-calculator.ts` ya no accede a `localStorage`: lee el modo para precargar el motor, y escribe modo e historial por el contrato.
- `use-theme.ts` lee y escribe `aula-kanban-theme` por el contrato.
- `THEME_INIT_SCRIPT` acepta el valor legado sin envoltura y la envoltura versionada; ignora versiones futuras.
- Pruebas: modo legacy/versionado, historial legado/corrupto, tema legado/versionado/futuro y recarga tras remontar.
