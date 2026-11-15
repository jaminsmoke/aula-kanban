# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** vacío · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** PER-04 se completó y su resumen vive en el changelog; PER-07 recoge el límite de nitidez del texto. SYNC-01 se completó y su norma vive en [`../AGENTS.md`](../AGENTS.md). La cobertura MCP está en [`mcp-apps.md`](mcp-apps.md). PER-01B se publicó en `1.1.28`; PER-02 se completó sin publicación; PER-03, MCP-05E, UI-03, UI-01, HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron.

---

## 2026-11-15 — PER-07 · Nitidez del texto al ampliar el derivado de pizarra

- Contexto: desde `1b15eaa`, las capturas PNG de la pizarra se guardan como WebP 0,8 de 2048 px y el original se descarta. La revisión con una captura real de `/documentacion` (2560×1440: 97 KB el derivado frente a 246 KB el PNG) deja el texto idéntico a 1:1 y algo más blando a 2x sin suavizado, sin artefactos.
- Oportunidad: si el alumnado amplía mucho una captura con texto, un tope mayor, una calidad algo superior o conservar el original junto al derivado mejorarían la lectura a costa de más peso y memoria.
- Qué falta:
  - [ ] Medir capturas reales de clase, no solo la página de documentación.
  - [ ] Comparar 2560 px, calidad 0,9 y conservar el original enlazado frente al derivado actual.
  - [ ] Decidir si conviene un umbral distinto para capturas con texto o mantener el tope único de 2048 px.

## 2026-11-15 — PER-05 · Caché inmutable y validación para `/api/files/[id]`

- Contexto: cada archivo se sirve desde el Worker con `Cache-Control: private, max-age=3600`; no hay `ETag` ni `Last-Modified`. El identificador es un UUID nuevo por subida y el objeto de R2 no se reemplaza, así que el contenido es inmutable.
- Oportunidad: `private, max-age=31536000, immutable` evitaría revalidaciones y descargas repetidas de la misma imagen de tarea o de pizarra. Si se prefiere una caché corta, un `ETag` con el `etag` de R2 permitiría responder 304.
- Qué falta:
  - [ ] Confirmar que ningún flujo reutiliza un id para contenido distinto (revisar `storeUpload` y el cambio de proyecto).
  - [ ] Aplicar la cabecera y añadir una prueba de contrato de la respuesta.

## 2026-11-15 — PER-06 · Auditar el tamaño y la compactación de los snapshots de pizarra

- Contexto: `boards.snapshot` admite hasta 2 MB y se reescribe completo en cada guardado; los elementos borrados se conservan como tumbas (`isDeleted`) y `appState` se filtra antes de guardar. Los ficheros se guardan como URL cuando la subida funciona.
- Oportunidad: podar tumbas antiguas o mantener `appState` fuera del snapshot reduciría el peso en D1 y el tráfico del sondeo y de la sala en vivo. También conviene medir cuántas pizarras se acercan al límite.
- Riesgo: una tumba podada demasiado pronto puede resucitar un elemento en una sesión desincronizada; cualquier poda necesita una ventana conservadora y pruebas de fusión.
- Qué falta:
  - [ ] Medir el tamaño real de los snapshots; sin datos de producción todavía no hay cifras.
  - [ ] Evaluar la poda de tumbas y el coste de mantener `appState` fuera del snapshot.
