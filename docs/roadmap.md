# Roadmap PER-05 · Caché inmutable para `/api/files/[id]`

> **Estado:** `En curso` · versión local `1.1.28` · 2026-11-15
> **Backlog:** [`backlog.md`](backlog.md)

---

## 1. Objetivo

- [x] Dejar de revalidar y volver a descargar archivos que no cambian.
- [x] Criterio de éxito: la respuesta declara caché inmutable de un año y una prueba de contrato lo fija.

## 2. Alcance

**Dentro:**
- Cabecera de `/api/files/[id]` y metadatos de R2 de las subidas nuevas.
- Prueba de contrato y actualización de `miniaturas.md`.

**Fuera de alcance:**
- Cambios de esquema, de identificadores o de la purga.
- `ETag`/304 y versionado de archivos: con contenido inmutable no hacen falta.
- Archivos ya guardados: la cabecera se aplica al servirlos, sin reescribir objetos.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| `private, max-age=31536000, immutable` | `ETag` con 304 | El id es un UUID nuevo por subida y el objeto no se reemplaza; no hay nada que revalidar. |
| `private` | `public` | El archivo exige sesión y acceso al proyecto; no debe quedar en cachés compartidas. |
| Un año | Una hora | El contenido de un id no cambia; la hora forzaba revalidaciones innecesarias. |

## 4. Fases

### Fase 1 — Confirmar inmutabilidad

- [x] Revisar `storeUpload`: id aleatorio, clave nueva por subida y sin sobrescritura.
- [x] Confirmar que el cambio de proyecto conserva el id y el contenido del objeto.
- **Criterios de aceptación:** ningún flujo reutiliza un id para contenido distinto.

### Fase 2 — Aplicar y probar

- [x] Enviar la cabecera inmutable desde la ruta y en los metadatos de R2.
- [x] Añadir la comprobación de la cabecera a la prueba de contrato.
- **Criterios de aceptación:** prueba en verde y resto de respuestas (401, 403, 404, 503) sin caché.

### Fase 3 — Documentación

- [x] Actualizar `miniaturas.md` y el estado del proyecto.
- **Criterios de aceptación:** sin referencias a `max-age=3600`.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reemplazar un archivo con el mismo id | El navegador mostraría el contenido viejo durante un año | Ningún flujo sobrescribe un id; un futuro versionado debe crear un id nuevo. |
| Caché en un equipo compartido | Un archivo privado quedaría en la caché local de otra cuenta | `private` limita la caché al navegador y el acceso sigue exigiendo sesión y proyecto. |

## 6. Notas de sesión

- 2026-11-15: PER-05 sale del backlog. Se aplica caché inmutable de un año en la respuesta y en los metadatos de R2; la prueba de contrato fija la cabecera.
