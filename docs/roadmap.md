# Roadmap — CI-01 · Añadir el build al workflow de CI

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** CI-01 — Añadir el build al workflow de CI (sale del backlog).
> **Backlog:** UI-02, PER-03, PER-01B, PER-02, UI-01, ARCH-01, ARCH-02, SYNC-01, MCP-05 y recortes de rendimiento (10 entradas). SYNC-01 se queda como norma operativa.
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** los commits y el push van al repo personal `jaminsmoke/aula-kanban`; Sites lo publica y verifica Codex de OpenAI. Un push no es una publicación.

---

## 1. Objetivo

- [ ] Añadir `npm run build` al job de checks de GitHub Actions después de los tests.
- [ ] Criterio de éxito: un push o una pull request a `main` ejecuta lint, `tsc`, tests y build, y falla si el build falla; el job no necesita secretos ni bindings reales.

## 2. Alcance

**Dentro:**
- Añadir el paso de build a `.github/workflows/ci.yml`.
- Medir el tiempo que añade al job.
- Comprobar que el build no requiere secretos, D1/R2 reales ni acceso a Sites.

**Fuera de alcance:**
- Desplegar, publicar o aplicar migraciones.
- Cambiar código de la aplicación, dependencias o versión.
- Sustituir el flujo de publicación de Codex/Sites.
- Añadir servicios externos o credenciales al workflow.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Build después de los tests | Build antes de lint/tests | Deja el fallo más caro al final y evita gastar build si lo básico falla. |
| Usar `npm run build` | Comando específico de vinext | Es el mismo comando que usa el proyecto en local y en la preparación de publicación. |
| CI sin secretos ni bindings | Ejecutar el build contra Sites | La compilación no debe depender de producción ni exponer credenciales en pull requests. |
| Solo verificación | Añadir deploy al workflow | El despliegue sigue siendo responsabilidad exclusiva de Codex. |

## 4. Fases

### Fase 1 — Build en CI

- [ ] Añadir `npm run build` después de `npm test` en el job `checks`.
- [ ] Ejecutar el workflow y medir la duración añadida.
- [ ] Confirmar que el job no necesita secretos, bindings de D1/R2 ni acceso a Sites.
- **Criterios de aceptación:** el workflow es válido, el job completa lint, `tsc`, tests y build, y un fallo de compilación hace fallar CI.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El build alarga demasiado el job | Feedback más lento en cada push | Medir la duración y ajustar caché o estrategia si el coste es desproporcionado. |
| El build espera variables de producción | CI falla en pull requests o expone configuración | Ejecutarlo sin secretos y revisar que no toque bindings remotos. |
| El paso duplica trabajo local | Mantenimiento innecesario | Mantener un único comando, `npm run build`, igual que en local. |

## 6. Notas de sesión

- CI-01 sale del backlog el 2026-11-15. SYNC-01 no entra al roadmap: se ejecuta tras cada bloque y se conserva como norma operativa.
- Estado actual del workflow: `npm ci`, lint, `tsc --noEmit` y tests; falta el build.
- No se ha modificado el workflow todavía. Cada cambio se verificará en GitHub Actions y se subirá al repo personal; la publicación en Sites queda para Codex.
