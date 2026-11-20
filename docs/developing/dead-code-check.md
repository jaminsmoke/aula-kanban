# Código muerto y dependencias

> **Estado:** Fase 3 de ARC-05 · **Fecha:** 2026-11-20
> **Alcance:** módulos, exports, dependencias y CSS de producto.
> **Regla:** el checker falla cerrado, no adivina rutas fuera del workspace y solo admite deuda conocida en el baseline.

## 1. Decisión

Se implementa `scripts/dead-code-check.mjs` con la API de TypeScript que ya instala el proyecto.

No se añade `knip` ni `ts-prune`:

| Herramienta | Cobertura | Motivo para no usarla |
|---|---|---|
| `ts-prune` | Exports sin consumidores | No detecta módulos, dependencias, CSS ni entradas del framework; no tiene baseline de proyecto. |
| `knip` | Archivos, exports y dependencias | Añade dependencia y configuración propia; duplicaría el alcance de `architecture-check` y requeriría exclusiones específicas de Next. |
| Checker local | Archivos, exports, dependencias, imports no declarados y CSS | Reutiliza `arch-baseline.json`, TypeScript ya está instalado y comparte el estilo de `architecture-check`. |

## 2. Qué comprueba

- **Módulos huérfanos:** archivo de producto sin ningún consumidor.
- **Solo pruebas:** archivo de producto consumido únicamente por tests o `test-utils/`.
- **Exports:** export de runtime sin importación ni consumidor; los módulos públicos y los de compatibilidad se excluyen mediante baseline.
- **Dependencias:** dependencia de `dependencies` sin ningún import bare.
- **Imports no declarados:** import bare que no está en `dependencies`, `devDependencies` ni `peerDependencies`.
- **CSS:** hoja de estilos sin `@import` ni import desde TypeScript.

Las entradas de Next (`page`, `layout`, `route`, `not-found`, `error`, `loading`, `template`, `default`, `manifest`, `robots`, `sitemap`) no cuentan como huérfanas. Los `.d.ts` tampoco.

## 3. Baseline

`docs/developing/dead-code-baseline.json` contiene:

- `publicModules`: `lib/connectors.ts`, API pública de conectores.
- `testOnlyModules`: `lib/server/mcp/reads.ts` y `writes.ts`, fachadas de compatibilidad MCP.
- `unusedExports`: deuda conocida de exports de runtime. Cada entrada es `ruta:nombre`.
- `dependencyExceptions`: `react-dom`, peer runtime de React/Next.
- `undeclaredImportExceptions`: `@excalidraw/mermaid-to-excalidraw`, dependencia transitiva usada por una prueba.
- `cssExceptions`: vacío; las 49 hojas de `app/**` tienen consumidor.

El baseline está fechado y tiene dueño (`ARC-06`) para las excepciones. No se actualiza automáticamente: cualquier entrada nueva exige una razón y una revisión.

## 4. Integración

```bash
npm run dead:check
npm run check   # lint + tsc + arch:check + dead:check
```

CI ejecuta `npm run dead:check` después de `arch:check` y antes de la suite. La comprobación no depende de rutas absolutas, de MCP ni de un servicio externo.

## 5. Resultado

- **396 archivos de producto** en el catálogo de arquitectura; el checker analiza 395 (excluye `.d.ts`).
- **0 módulos huérfanos**, **0 módulos solo-test**, **0 dependencias sin uso**, **0 imports no declarados** y **0 CSS sin uso**.
- **51 exports de runtime** quedan como deuda conocida en el baseline.
- `test-css.ts` salió del catálogo de producto y vive en `test-utils/aula-documentos-css.ts`.

## 6. Límites

- No interpreta strings dinámicos, templates ni imports construidos en tiempo de ejecución.
- No revisa assets de `public/` ni referencias dentro de HTML o Markdown.
- Considera un namespace o un `import()` como uso de todos los exports del módulo para evitar falsos positivos.
- No distingue subrutas de un paquete: `react-dom/client` cuenta como `react-dom`.
