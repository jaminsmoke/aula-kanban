# Roadmap — CI-02 · Disparadores y ejecución inteligente de workflows

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** CI-02 — Disparadores y ejecución inteligente de workflows (sale del backlog).
> **Backlog:** PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, SYNC-01, MCP-05 y recortes de rendimiento (9 entradas). SYNC-01 se queda como norma operativa.
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** los commits y el push van al repo personal `jaminsmoke/aula-kanban`; Sites lo publica y verifica Codex de OpenAI. Un push no es una publicación.

---

## 1. Objetivo

- [ ] Evitar que un cambio solo documental pague la suite completa y cancelar ejecuciones obsoletas.
- [ ] Criterio de éxito: un push solo de documentación no lanza los checks de código; un cambio de código sigue ejecutando lint, tipos, tests y build; una ejecución nueva cancela la anterior; no quedan checks requeridos en espera.

## 2. Alcance

**Dentro:**
- Añadir `paths-ignore` para documentación y metadatos, sin ignorar `.github/workflows/**` ni código de la aplicación.
- Añadir `concurrency` por workflow/ref con `cancel-in-progress` y un `timeout-minutes` razonable.
- Medir antes y después con runs reales; la línea base actual está entre 105 y 157 s.
- Evaluar la separación de jobs y la caché de build solo si la medición demuestra una ganancia.

**Fuera de alcance:**
- Desplegar, publicar, cambiar la versión o añadir secretos.
- Saltar tests o build en cambios de código.
- Configurar protección de rama: `main` no tiene branch protection ni rulesets.
- Trocear jobs o añadir acciones externas sin una medición que lo justifique.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Filtrar por `paths-ignore` en el evento | Filtrar dentro del job o usar una acción de detección de cambios | Es la opción más simple y un cambio mixto sigue ejecutando la suite; no hay checks requeridos que puedan quedar en espera. |
| `concurrency` por workflow y ref | Dejar que se acumulen ejecuciones | Evita que un push nuevo espere detrás de uno obsoleto de la misma rama. |
| Mantener `push` a `main` + `pull_request` | Añadir `push` en todas las ramas | Hoy no hay duplicado: las ramas de trabajo se validan por PR y `main` por push. |
| Mantener un job único por ahora | Paralelizar tests y build | Dos jobs duplicarían `npm ci`; primero se mide si la ganancia de pared compensa el coste. |

## 4. Fases

### Fase 1 — Filtros y concurrencia

- [ ] Añadir `paths-ignore` para `docs/**`, Markdown de documentación, `AGENTS.md` y `.freebuff/**`, sin ignorar el propio workflow ni código.
- [ ] Añadir `concurrency` por workflow/ref con `cancel-in-progress` y `timeout-minutes` al job `checks`.
- [ ] Medir un push solo documental y un cambio de código; comparar con la línea base de 105-157 s.
- [ ] Confirmar que un cambio mixto ejecuta la suite y que no hay checks requeridos bloqueados.
- **Criterios de aceptación:** un cambio solo documental no lanza el job de código; un cambio de código sigue validando lint, tipos, tests y build; una ejecución nueva cancela la anterior; el workflow sigue siendo válido y sin secretos.

### Fase 2 — Estructura de ejecución

- [ ] Comparar el job único actual con jobs paralelos o una caché de build; no duplicar `npm ci` sin una ganancia medida.
- [ ] Medir el tiempo de feedback de la opción elegida y documentar la decisión.
- [ ] Si no hay mejora clara, mantener el job único y cerrar la fase sin cambios.
- **Criterios de aceptación:** la decisión se basa en runs reales, no se pierde cobertura y el tiempo de feedback no empeora.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `paths-ignore` deja un check requerido en espera | Un PR no puede mergear | `main` no está protegida y no hay rulesets; verificado el 2026-11-15. |
| `cancel-in-progress` cancela una ejecución necesaria | Se pierde el feedback de un push anterior | Solo se cancela la ejecución anterior del mismo workflow y rama; no hay deploy asociado. |
| Paralelizar duplica la instalación | Más minutos de runner y menos ganancia real | Medir primero; no fragmentar jobs sin mejora de pared. |
| Ignorar un archivo que afecta al build | Un fallo no se detecta | Limitar la lista a documentación y metadatos; un cambio mixto ejecuta la suite completa. |

## 6. Notas de sesión

- CI-02 sale del backlog el 2026-11-15. Es la siguiente entrada porque reduce el coste de todos los cambios posteriores.
- Línea base: ejecuciones de 105-157 s; los commits solo documentales también lanzan la suite completa.
- No hay duplicado `push` + `pull_request` en ramas de trabajo: `push` solo escucha `main` y las ramas pasan por PR.
- La verificación de la próxima publicación en Sites sigue siendo responsabilidad de Codex; este roadmap no despliega.
