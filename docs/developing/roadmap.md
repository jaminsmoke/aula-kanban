# Roadmap ARC-01 — Contratos de arquitectura y verificación local

> **Estado:** Activo · **Origen:** ARC-01 del backlog (2026-11-20)
> **Backlog:** DEV-02, ARC-02 a ARC-06, ADOC-16 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Convertir el mapa de [`arquitectura-global.md`](arquitectura-global.md) en contratos comprobables dentro de este repositorio.
- [ ] Evitar que una herramienta externa o un MCP global vuelva a introducir capas, rutas o diagnósticos de otro proyecto.
- [ ] Criterio de éxito: `npm run arch:check` describe solo `aula-kanban`, detecta imports prohibidos, ciclos y crecimientos no justificados, y puede ejecutarse en local y CI sin depender de CodArch.

## 2. Alcance

**Dentro:**

- Clasificar los archivos reales en shell, apps, shared, dominio, servidor y API.
- Definir reglas de dependencia, ciclos, presupuestos y excepciones justificadas.
- Implementar un checker local con una línea base para no bloquear el trabajo actual.
- Integrarlo en los checks del proyecto.
- Documentar cómo se añade un archivo, una app o una excepción.

**Fuera:**

- Trocear las apps monolíticas; eso es ARC-02.
- Retirar el sistema de borradores; eso es ARC-03.
- Rediseñar CSS; eso es ARC-04.
- Cambiar comportamiento de producto, URLs, permisos o datos.
- Usar CodArch como requisito. Si se adopta, será una integración opcional por repositorio.

## 3. Decisiones de arquitectura

1. La fuente de verdad es este repositorio, no un MCP global.
2. Las dependencias apuntan hacia dentro: apps → shared → dominio; servidor no importa apps; dominio no importa React, app ni servidor.
3. Las reglas se ejecutan en local. CodArch no es dependencia obligatoria.
4. La línea base registra excepciones existentes; una excepción nueva debe justificarse y caducar.
5. Los límites no sustituyen la revisión: shell <450, componentes/hooks <600, CSS <500 y pruebas <600, salvo excepción documentada.
6. Ningún checker puede leer una ruta fuera del workspace.

## 4. Fases

### Fase 1 — Mapa definitivo y contratos

- [x] Inventariar imports reales entre shell, apps, shared, dominio, servidor y API.
- [x] Clasificar cada archivo y documentar los casos dudosos.
- [x] Definir reglas de dirección, ciclos y presupuestos con severidad.
- [x] Crear una línea base de excepciones existentes.
- [x] Acordar el formato del checker y su salida.
- **Formato acordado:** salida legible por línea (`ERROR regla: origen -> destino`), resumen `N archivos / N imports / N violaciones / N ciclos`, código de salida 1 si hay violaciones no incluidas en [`arch-baseline.json`](arch-baseline.json), y modo `--json` para CI.
- **Criterios:** existe un contrato legible y una lista inicial de violaciones separada de las excepciones aceptadas.

### Fase 2 — Checker local y línea base

- [x] Implementar `scripts/architecture-check.mjs` o el mecanismo local acordado.
- [x] Resolver imports relativos/estáticos y excluir `node_modules`, `dist`, `.next` y `.vinext`.
- [x] Detectar imports prohibidos, ciclos y archivos por encima del presupuesto.
- [x] Hacer que una ruta fuera del workspace falle cerrada.
- [x] Añadir `npm run arch:check` y una prueba del propio checker.
- **Criterios:** el checker pasa sobre la línea base y falla con un caso artificial de import prohibido, ciclo o ruta externa.

### Fase 3 — Integración, correcciones y enforcement

- [x] Corregir las violaciones pequeñas que no pertenezcan a ARC-02/03/04.
- [x] Clasificar las excepciones de archivos grandes y enlazarlas con su roadmap.
- [x] Integrar `arch:check` en los checks locales y en CI.
- [x] Añadir una comprobación de que no hay MCP con raíz externa en la configuración del proyecto.
- [x] Documentar el flujo para añadir una app y para retirar una excepción.
- **Criterios:** el check es obligatorio, no hay violaciones nuevas sin justificar y las excepciones tienen dueño y fecha.

### Fase 4 — Cierre

- [ ] Actualizar `arquitectura-global.md`, backlog y changelog.
- [ ] Ejecutar suite, `tsc`, ESLint, build y presupuestos.
- [ ] Archivar este roadmap si el siguiente bloque lo requiere.
- **Criterios:** no queda trabajo de arquitectura básica sin dueño; el repositorio puede crecer sin volver a depender de una configuración externa.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Checker demasiado estricto | Bloquea trabajo legítimo | Línea base, severidades y excepciones con caducidad |
| Checker demasiado superficial | Falsa sensación de seguridad | Probar imports prohibidos, ciclos y rutas externas |
| Resolver imports de forma incompleta | Falsos negativos | Empezar por imports relativos y documentar límites |
| CodArch vuelve a colarse | Diagnósticos de otro repo | Regla de workspace, configuración por repo y fallo cerrado |
| Duplicar reglas con otras herramientas | Mantenimiento doble | Una sola fuente y salida legible |

## 6. Notas de sesión

- 2026-11-20: ARC-01 sale del backlog y pasa a ser el roadmap activo. El repositorio no tiene `.codarch.yml`; la revisión inicial se contaminó por un MCP global apuntando a otro proyecto. Ese MCP se retiró y DEV-02 queda como guard de tooling.
- 2026-11-20: **Fase 1 completada.** Inventario de producto: 357 archivos, 907 imports locales, 5 violaciones base y 0 ciclos base. Capas, reglas de dirección y presupuestos documentados en [`arquitectura-global.md`](arquitectura-global.md); excepciones y archivos grandes registrados en [`arch-baseline.json`](arch-baseline.json). Formato del checker acordado para la Fase 2.
- 2026-11-20: **Fase 2 completada.** Añadido `scripts/architecture-check.mjs`, `npm run arch:check` y `--json`; consume el baseline, detecta imports prohibidos, ciclos y presupuestos, y falla cerrado ante una raíz externa. Prueba del checker en `scripts/architecture-check.test.mjs` con fixture de import prohibido, ciclo y CSS sobredimensionado. Resultado real: 357 archivos de producto / 907 imports / 5 violaciones base / 0 ciclos base / 0 problemas nuevos.
- 2026-11-20: **Fase 3 completada.** Añadido `npm run check` y `arch:check` en CI; el checker también rechaza configuraciones MCP del proyecto con `--root` fuera del workspace. El ciclo `auth ↔ demo` se eliminó moviendo `ChatGPTUser` a `lib/server/auth-user.ts`. Documentado el flujo para añadir apps y retirar excepciones.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
