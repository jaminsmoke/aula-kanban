# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** PER-04 activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** PER-04 está en el roadmap activo con su medición en [`miniaturas.md`](miniaturas.md). SYNC-01 se completó y su norma vive en [`../AGENTS.md`](../AGENTS.md). La cobertura MCP está en [`mcp-apps.md`](mcp-apps.md). PER-01B se publicó en `1.1.28`; PER-02 se completó sin publicación; PER-03, MCP-05E, UI-03, UI-01, HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron.

---

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
