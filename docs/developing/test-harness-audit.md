# Auditoría de tests, harness y presupuestos

> **Estado:** Fases 1 y 2 de ARC-05 · **Fecha:** 2026-11-20
> **Alcance:** mocks, setup, datos de prueba y presupuestos de la suite.
> **Regla:** el harness reduce duplicación sin ocultar mocks ni compartir estado mutable entre pruebas.

## 1. Resumen

- **234 archivos / 1.597 pruebas** al iniciar ARC-05.
- Tras la Fase 2: **235 archivos / 1.599 pruebas** y **1.297 líneas eliminadas** de los seis tests de Aula.
- Aula Documentos concentra cinco archivos grandes:
  - `aula-documentos-copies.test.tsx`: 582 líneas.
  - `aula-documentos-presentation.test.tsx`: 525.
  - `aula-documentos-autosave.test.tsx`: 491.
  - `aula-documentos-documents.test.tsx`: 464.
  - `aula-documentos-recovery.test.tsx`: 420.
- Se repiten aproximadamente **190 líneas** de shims, mocks, helpers y reset entre esos archivos.
- `vitest.setup.ts` ya cubre limpieza y shims de entorno; no es un lugar para mocks de producto.
- No hay `knip` ni `ts-prune` instalados.
- Los presupuestos actuales están en `docs/perf-budget.json`; hay 12 flujos y no hay presupuesto explícito por app.

## 2. Capas del setup

### Global (`vitest.setup.ts`)

Mantener aquí:

- `cleanup()` y `vi.unstubAllGlobals()`.
- `HTMLDialogElement.showModal/close`.
- `crypto.randomUUID` y `crypto.subtle`.
- `IntersectionObserver` y `ResizeObserver`.
- `stubLocation` y `jsonResponse` como helpers explícitos.

No mover aquí:

- `vi.mock` de `use-app-document`, Mermaid, Office, copias o impresión.
- Datos de un documento concreto.
- Estado mutable de un flujo.

### Local de cada prueba

Debe seguir siendo local:

- La importación explícita del harness del flujo, que registra sus propios mocks.
- Los overrides concretos de `documentMock` y sus valores iniciales.
- Los timers, `localStorage`, `URL.createObjectURL` y spies de descarga.
- Las aserciones y los nombres de menús/acciones.

### Harness de flujo

Debe aportar:

- Factorías explícitas de documentos y respuestas.
- Un render wrapper si el flujo necesita providers.
- Helpers de interacción estables (abrir menú, elegir acción).
- Un `reset()` que devuelva los mocks a su estado base.
- Tipos de los mocks para que las pruebas no repitan casts.

## 3. Inventario de Aula Documentos

| Archivo | Líneas | Dependencias mockeadas | Helpers repetidos |
|---|---:|---|---|
| `aula-documentos-copies.test.tsx` | 582 | `useAppDocument`, Office import, Mermaid, print, copy client | shims DOM, `documentMock`, `savedDocument`, menús, descarga |
| `aula-documentos-presentation.test.tsx` | 525 | mismas | shims DOM, `documentMock`, `savedDocument`, menús |
| `aula-documentos-autosave.test.tsx` | 491 | mismas | shims DOM, `documentMock`, `savedDocument`, menús |
| `aula-documentos-documents.test.tsx` | 464 | mismas | shims DOM, `documentMock`, `savedDocument`, menús |
| `aula-documentos-recovery.test.tsx` | 420 | mismas | shims DOM, `documentMock`, `savedDocument`, menús |
| `aula-documentos-tables.test.tsx` | 324 | mismas | shims DOM, `documentMock`, menús, descarga |

Bloques candidatos:

1. Shims de `Range`, `Element` y `Node` para ProseMirror.
2. `officeImportMock` y `CloseTrigger`.
3. `documentMock` con load/save/saveVersioned y cargas de notas, Mermaid y presentaciones.
4. `mermaidMock`, `printMock` y `copyMock`.
5. `vi.mock` de `use-app-document`, Mermaid, Office, impresión y copias.
6. `props`, `openMenu`, `chooseMenu`, `savedDocument`, `stubDownload` y `countMermaid`.
7. `afterEach` de reseteo de mocks, timers, storage y URLs.

## 4. Contrato implementado

### `test-utils/aula-documentos.tsx`

Vive fuera del catálogo de producto para no alterar `arch:check`. Exporta:

```ts
documentMock;
mermaidMock;
printMock;
copyMock;
officeImportMock;
props;
CloseTrigger;
WindowCloseProvider;
savedDocument(title);
stubDownload();
countMermaid(content);
openMenu(name);
chooseMenu(menu, item);
newDocument();
openCopies();
importDocument();
insertMermaid();
insertSlideBreak();
printPdf();
resetAulaDocumentMocks();
```

Reglas:

- Los `vi.mock` viven en el harness, no en `vitest.setup.ts`, y solo se registran cuando un test de Aula lo importa.
- El test importa primero el harness y después `AulaDocumentosApp`, para que los mocks existan antes de cargar la app.
- `resetAulaDocumentMocks` restaura valores base y se registra con `afterEach` en cada archivo.
- Los shims de `Range`/`Element`/`Node` se movieron a `vitest.setup.ts` porque son del entorno jsdom.
- El harness no importa ni muta estado de otra prueba; la prueba de aislamiento está en `aula-documentos-harness.test.tsx`.

### Otros flujos

| Flujo | Mocks actuales | Candidato |
|---|---|---|
| Office | archivos y visor | factoría de archivo y controles si se repite en más tests |
| Tarjetas | `fetch` y `jsonResponse` | helper de fetch encolado, sin global |
| Timeline | `vis-timeline/standalone` | factoría de instancia del lienzo |
| Hoja | `jspreadsheet-ce` | factoría de worksheet |

Revisados en la Fase 2: ningún flujo fuera de Aula tiene hoy dos consumidores reales de la misma factoría. `jsonResponse` y `stubLocation` siguen en el setup global; Office, Tarjetas, Timeline y Hoja quedan como candidatos, no como código extraído. No se extrae una utilidad hasta que tenga dos consumidores reales.

## 5. Código muerto y presupuestos

- No se ha instalado ninguna herramienta de código muerto.
- Primero se evaluará un checker local porque el repo ya tiene `scripts/architecture-check.mjs` y evita otra dependencia.
- `knip`/`ts-prune` solo se añadirán si el checker local no cubre imports, exports y dependencias.
- Presupuestos actuales: 12 flujos en `docs/perf-budget.json`; no hay un límite explícito por app.
- La Fase 4 debe decidir si los presupuestos viven en el mismo JSON o en un documento por flujo, y cómo se ejecutan en CI.

## 6. Criterio de salida de la Fase 1

- Inventario de mocks y helpers repetidos completo.
- Separación entre setup global, setup local y harness definida.
- Contrato del harness de Aula y candidatos de otros flujos documentados.
- En la Fase 1 no se migraron pruebas; la migración llegó en la Fase 2.
- `npm run check` y `arch:check` siguen pasando.
