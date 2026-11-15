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

- [x] Decidir si se podan tumbas: **no por ahora**. Con 10.509 caracteres en total y 8.544 en la pizarra mayor, el ahorro máximo medido es de 1.872 caracteres en una sola pizarra; el riesgo de resucitar elementos y las pruebas de fusión no compensan.
- [x] Confirmar `appState` y ficheros: `appState` ya se guarda como `{}` y los ficheros quedan como URL tras la subida, así que no hay nada que sacar del snapshot.
- [x] Fijar la política si se retoma: ventana de 30 días sobre `element.updated`, solo para `isDeleted`, y prueba de fusión con un cliente desfasado.
- **Criterios de aceptación:** cumplidos; decisión escrita con cifras y sin cambios de código.

### Fase 3 — Medición en producción

- [x] Añadir al diagnóstico de almacenamiento el tamaño de los snapshots: número, máximo, media y cuántos superan 1 MB y 1,5 MB.
- [x] Revisar la proporción de tumbas en las tres pizarras más grandes.
- [ ] Ejecutar la medición con datos de producción.
- **Criterios de aceptación:** el instrumento está en el diagnóstico y en el panel; la poda se decide solo con cifras reales.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Poda de tumbas demasiado pronto | Un elemento borrado reaparece en una sesión desincronizada | No se poda todavía; si se retoma, ventana de 30 días sobre `updated` y prueba de fusión. |
| Pizarra de más de 1 MB | El canal en vivo no la publica y el sondeo descarga el snapshot completo | Medir cuántas superan ese umbral; en local ninguna. |
| Guardado completo del snapshot | Cada cambio reescribe todo el JSON | Aceptable con estos tamaños; revisar si crecen. |

## 6. Notas de sesión

- 2026-11-15: fase 3 instrumentada. `GET /api/storage/status` incluye `boardStats` (número de pizarras, máximo, media, umbrales de 1 y 1,5 MB y las tres mayores con elementos y tumbas) y el panel lo muestra. Falta ejecutarla con datos de producción.
- 2026-11-15: fase 2 completada. No se poda: el ahorro máximo medido hoy es de 1.872 caracteres y el riesgo de resurrección no compensa. `appState` ya se guarda vacío y los ficheros son URLs. Si se retoma: ventana de 30 días sobre `element.updated` y prueba con un cliente desfasado. La siguiente fase mide los snapshots en producción.
- 2026-11-15: PER-06 sale del backlog. Auditoría local (2 pizarras, máximo 8.544 caracteres): `appState` y `files` vacíos, elementos al 99 % y una pizarra con el 95 % del peso en 3 tumbas. Sin datos de producción y sin podar nada.
