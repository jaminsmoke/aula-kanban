# Roadmap SYNC-01 · Norma de sincronización del repositorio

> **Estado:** `En curso` · versión local `1.1.28` · 2026-11-15
> **Backlog:** [`backlog.md`](backlog.md) · **Norma:** [`../AGENTS.md`](../AGENTS.md)

---

## 1. Objetivo

- [x] Sacar SYNC-01 del backlog y dejarlo como norma verificable del repositorio.
- [x] Criterio de éxito: una sola fuente escrita para el push de cierre, comprobada contra el último cierre real.

## 2. Alcance

**Dentro:**
- Reglas de commit, push, CI y secretos al cerrar un roadmap.
- Verificación del cierre de PER-02 como caso real.

**Fuera de alcance:**
- Publicación en Sites, migraciones y `release:prepare`.
- Cambios de código, dependencias o versión.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| La norma vive en `AGENTS.md` | Duplicarla también en el backlog y el roadmap | Tres copias se desincronizan; el agente lee `AGENTS.md` en cada sesión. |
| SYNC-01 se cierra como roadmap de proceso | Dejarlo indefinidamente en el backlog | El backlog guarda trabajo pendiente; una norma ya verificada no lo es. |

## 4. Fases

### Fase 1 — Norma en un solo sitio

- [x] Confirmar que `AGENTS.md` cubre commits por bloque, push único al cierre, checks y build previos, y revisión de secretos.
- [x] Retirar la copia del backlog para que no quede una segunda lista de reglas.
- **Criterios de aceptación:** `AGENTS.md` es la única fuente de la norma y el backlog no la repite.

### Fase 2 — Verificación con el cierre de PER-02

- [x] Comprobar el push único `174436a..06eeb67` y que `github/main` coincide con el commit local.
- [x] Revisar que los checks y el build se ejecutaron sobre el estado final y que no se subieron secretos ni archivos `.env*`.
- **Criterios de aceptación:** el último cierre real cumple la norma punto por punto.

### Fase 3 — Cierre

- [ ] Registrar el resultado y cerrar el roadmap.
- **Criterios de aceptación:** sin cambios de código ni de versión; el backlog queda con las entradas de persistencia.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un push intermedio consume CI | Cuota y ruido en el repositorio | Mantener el push único al cierre. |
| Reglas duplicadas | El agente aplica una versión antigua | `AGENTS.md` como fuente única. |

## 6. Notas de sesión

- 2026-11-15: SYNC-01 sale del backlog tras verificar el cierre de PER-02. El push `174436a..06eeb67` fue único y `github/main` quedó en `06eeb67`. No hubo cambios de código ni de versión.
