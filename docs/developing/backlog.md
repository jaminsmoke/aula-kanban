# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** PROMO-05 · Modo demo sin cuenta, de solo lectura · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 2 entradas: PROMO-01 pausado y PROMO-06 pendiente de debate

---

## 2026-11-16 — PROMO-01 · Cierre externo de la vista previa en redes (pausado)

- Contexto: las fases 1 y 2 están completas y la fase 3 se verificó en local: 144 archivos / 1.112 pruebas, `tsc`, ESLint, build, `perf:budget`, HTML de `/` y `/documentacion` e imagen social correctos.
- Falta antes de retomarlo: publicar una versión que incluya los metadatos, pasar LinkedIn Post Inspector, Facebook Sharing Debugger, X Card Validator y WhatsApp, y entonces añadir el changelog y archivar el plan.
- Notas: producción sigue en `1.1.32` y `/og/aula-kanban.png` responde 404; commits `ad73cf2`, `c7338cf` y `2f7e242`. El plan completo se conserva en [`historial/roadmap-promo-01.md`](../historial/roadmap-promo-01.md).

## 2026-11-16 — PROMO-06 · Primer resultado de la calculadora científica

> Origen: revisión de solo lectura del 16 nov 2026 sobre la 1.1.32 (web en vivo y repo). Veredicto: lista para promocionar **con arreglos**; lo que falla es la entrada pública. El vídeo será una presentación animada con fragmentos cortos de la app integrados. Orden = impacto.
>
> **Marco común (leer antes de cualquier PROMO):**
> - Stack: `vinext 1.0.0-beta.5` (Next 16.3.4 App Router sobre Vite 8) desplegado como Worker de Cloudflare (`worker/index.ts`, D1 + Durable Objects `BoardRoom`/`SpaceRoom`). No hay `middleware.ts`; las rutas viven en `app/` y la API en `app/api/**/route.ts`.
> - Sin librería de i18n: los textos van en castellano escritos directamente en los componentes (`lang="es"` en `app/layout.tsx`).
> - Estilos: CSS propio con tokens (`docs/estilos.md`); la guarda `app/styles.test.ts` falla ante colores crudos. Las fuentes se autohospedan en `public/fonts` y se declaran en `app/globals.css`.
> - Pruebas junto al código (`*.test.ts(x)`, Vitest + Testing Library + jsdom). Checks de CI (`.github/workflows/ci.yml`): `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run perf:budget`.
> - Reglas de `AGENTS.md`: commits locales por fase y **un único push** al cerrar el roadmap; **solo Codex publica en Sites**, aplica migraciones remotas y verifica la versión publicada (`npm run release:prepare -- --published-version X.Y.Z`). Que haya push no significa que esté publicado.
> - Al llevar una PROMO al roadmap, seguir `docs/developing/templates/roadmap-template.md` y cerrar en `docs/developing/changelog.md` como el resto.

- Contexto: según `docs/rendimiento.md`, en Fast 3G y 5 muestras la Científica **abre** en unos 3,4 s, como la Básica; los ~13 s son hasta el **primer resultado**, con 9,5 s por la descarga de `@cortex-js/compute-engine` (~1,9 MB gzip, flujo `cientifica` de `docs/perf-budget.json`, límite 2.069.960 B). El motor se importa de forma diferida en `app/board/apps/calculadora/calculator/edu-evaluate.ts` (`import("@cortex-js/compute-engine")`); la Básica usa `basic-evaluate.ts` y no lo descarga (`use-calculator.ts`).
- Alcance: reducir la espera del primer resultado: precarga en segundo plano al elegir Científica o Ecuaciones, indicador de «preparando motor», o recorte o alternativa del motor. No mover `compute-engine` a los flujos que lo tienen prohibido (`tablero`, `espacio`, `basica`, `basica-evalua` en `docs/perf-budget.json`).
- Archivos: `app/board/apps/calculadora/calculator/{edu-evaluate.ts,use-calculator.ts,calculator-panel.tsx,multi-equation.tsx}` y sus `*.test.ts(x)`, `app/board/apps/calculadora/calculadora-app.tsx`, metadatos de la app en `lib/native-apps.ts` (`upstream` y versión).
- Criterios: medir antes y después con el mismo método que APP-02: build servida en `127.0.0.1:8791` (`npm run build` y `npm run start`) y `node scripts/perf-latency.mjs --runs 5 --json --out docs/perf-latency.json` (Fast 3G por defecto; necesita Chrome o `CHROME_PATH`); además `npm run perf:budget` y `npm run perf:report`. Actualizar la tabla de `docs/rendimiento.md`.
- Notas: para el vídeo, mientras tanto, grabar solo la Básica o precargar la Científica antes de grabar. El otro pulido para el vídeo (carpetas de mochila y maletín) quedó completado en APP-03B.

> Descartado en esta revisión: «GPT con Actions» sigue cerrado (README, «Plugin y herramientas»). OpenAI retira los GPT personalizados el 11 dic 2026 y las acciones no se migran; el plugin de Sites con MCP (`/mcp`, identidad de Sites; `/api/mcp` con tokens personales) es el sustituto. El servidor OAuth propio sigue apagado en producción (`/.well-known/oauth-authorization-server` → 503) y no hace falta reactivarlo para estas entradas.
