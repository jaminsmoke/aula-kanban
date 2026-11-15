# Roadmap PER-06 · Tamaño y compactación de los snapshots de pizarra

> **Estado:** `En curso` · versión local `1.1.28` · 2026-11-15
> **Backlog:** [`backlog.md`](backlog.md)

---

## 1. Objetivo

- [x] Saber cuánto ocupan los snapshots, qué parte es peso muerto y cuándo conviene compactar.
- [ ] Criterio de éxito: decisión con cifras sobre la poda de tumbas y el contenido del snapshot; sin cambios de datos hasta aprobarla.

## 2. Alcance

**Dentro:**
- Medir `boards.snapshot` en la base local y descomponer el JSON por elementos, tumbas, `appState` y ficheros.
- Estimar cuántos elementos caben en el límite de 2 MB y evaluar la poda.

**Fuera de alcance:**
- Reescribir pizarras existentes, cambiar el límite de 2 MB o el protocolo en vivo.
- Datos de producción: en esta sesión no hay acceso a D1 publicado.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Medir la composición del JSON, no solo su longitud | Estimar por número de elementos | `appState` y los ficheros pueden dominar el peso; hay que verlo antes de decidir. |
| Auditar antes de podar | Poda automática inmediata | Una tumba eliminada antes de tiempo puede resucitar elementos en sesiones desincronizadas. |

## 4. Fases

### Fase 1 — Auditoría

- [x] Medir las pizarras de la base local: 2 pizarras, 10.509 caracteres en total y un máximo de 8.544.
- [x] Descomponer el snapshot: `appState` y `files` vacíos en ambas; el 99 % del peso son elementos.
- [x] Contar tumbas: la pizarra de tarea conserva 3 elementos y los 3 están borrados (1.872 de 1.965 caracteres, el 95 %).
- [x] Estimar la capacidad: 572 caracteres por elemento de media y 771 el mayor; unos 4.250 rectángulos en 2 MB (texto y flechas pesan más).
- **Criterios de aceptación:** cifras reproducibles y límites de la medición anotados.

### Fase 2 — Decisión

- [ ] Decidir si se podan tumbas y con qué ventana; evaluar si `appState` debe seguir guardándose vacío y si los ficheros deben quedar fuera.
- **Criterios de aceptación:** decisión escrita con las cifras y el riesgo de resurrección; sin cambios de código hasta aprobarla.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Poda de tumbas demasiado pronto | Un elemento borrado reaparece en una sesión desincronizada | Ventana conservadora y fusión por versión antes de podar. |
| Pizarra de más de 1 MB | El canal en vivo no la publica y el sondeo descarga el snapshot completo | Medir cuántas superan ese umbral; en local ninguna. |
| Guardado completo del snapshot | Cada cambio reescribe todo el JSON | Aceptable con estos tamaños; revisar si crecen. |

## 6. Notas de sesión

- 2026-11-15: PER-06 sale del backlog. Auditoría local (2 pizarras, máximo 8.544 caracteres): `appState` y `files` vacíos, elementos al 99 % y una pizarra con el 95 % del peso en 3 tumbas. Sin datos de producción y sin podar nada.
