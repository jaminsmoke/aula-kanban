# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** PER-06 activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Aparcado
> **Nota:** PER-06 está en el roadmap activo con la auditoría de los snapshots de pizarra. PER-05 se completó (caché inmutable de un año) y su resumen vive en el changelog; PER-08 recoge el derivado pendiente en las subidas por MCP. PER-04 se completó y su resumen vive en el changelog; PER-07 recoge el límite de nitidez del texto. SYNC-01 se completó y su norma vive en [`../AGENTS.md`](../AGENTS.md). La cobertura MCP está en [`mcp-apps.md`](mcp-apps.md). PER-01B se publicó en `1.1.28`; PER-02 se completó sin publicación; PER-03, MCP-05E, UI-03, UI-01, HIER-01, CI-01, UI-02, CI-02, ARCH-01, ARCH-02 y PERF-01 se completaron.

---

## 2026-11-15 — PER-08 · Derivado en las subidas por MCP

- Contexto: `subir_archivo` decodifica base64 y guarda el original en R2 con cualquier finalidad: 5 MB para imágenes y 10 MB para documentos. Las imágenes enviadas como `finalidad=document` tampoco se reducen. La web sí genera WebP (800 px en tareas, 2048 px en pizarras) porque el canvas está en el navegador.
- Oportunidad: pedir al cliente MCP que envíe la imagen ya reducida, o redimensionar en el Worker con WASM; de paso, las capturas guardadas como documento podrían tener miniatura.
- Limitación: el Site solo declara `BUCKET` y `DB`, así que el binding `IMAGES` no está disponible, y `sharp` no encaja en el Worker.
- Decisión (2026-11-15): las imágenes con `finalidad=document` **no necesitan miniatura**. Ninguna vista las lista ni las previsualiza; su único uso previsible es pegar su enlace en el campo de imagen de una tarea, y entonces se sirve el original. Una miniatura exigiría un redimensionador en el Worker, el mismo que falta para el resto del derivado por MCP.
- Evaluación WASM (2026-11-15): **viable, pero se aplaza**. `@jsquash` (Apache-2.0) cubre JPEG, PNG, WebP y `resize` con ~1,9 MB sin comprimir; `@cf-wasm/photon` pesa 6,3 MB, `@standardagents/sip` 807 KB pero solo emite JPEG y `wasm-vips` 13 MB. Desde 2026-09 el Worker admite 64 MiB sin comprimir, así que el tamaño ya no es el límite; sí lo son los 128 MB por isolate (una foto de 12 MP decodifica a ~48 MB) y la CPU (10 ms en Free).
- Medición (2026-11-15): `GET /api/storage/status` incluye `uploadStats`, que agrupa todas las subidas por origen (`web`, `mcp` o `unknown` en las anteriores), finalidad y tamaño, con máximo y cuántas superan 1 y 2 MB. La columna `uploads.origin` se rellena al subir; el panel de Ajustes > Almacenamiento lo muestra.
- Qué falta:
  - [ ] Ejecutar la medición con datos reales de producción; el instrumento está listo, pero en esta sesión no hay acceso a D1 publicado.
  - [x] Evaluar un redimensionador WASM frente a documentar la asimetría como aceptada: viable con `@jsquash`, aplazado hasta tener volumen real; mientras tanto se documenta la recomendación de enviar la imagen ya reducida.
  - [x] Decidir si las imágenes con `finalidad=document` necesitan miniatura: no, se quedan solo con el enlace.

## 2026-11-15 — PER-07 · Nitidez del texto al ampliar el derivado de pizarra

- Contexto: desde `1b15eaa`, las capturas PNG de la pizarra se guardan como WebP 0,8 de 2048 px y el original se descarta. La revisión con una captura real de `/documentacion` (2560×1440: 97 KB el derivado frente a 246 KB el PNG) deja el texto idéntico a 1:1 y algo más blando a 2x sin suavizado, sin artefactos.
- Oportunidad: si el alumnado amplía mucho una captura con texto, un tope mayor, una calidad algo superior o conservar el original junto al derivado mejorarían la lectura a costa de más peso y memoria.
- Qué falta:
  - [ ] Medir capturas reales de clase, no solo la página de documentación.
  - [ ] Comparar 2560 px, calidad 0,9 y conservar el original enlazado frente al derivado actual.
  - [ ] Decidir si conviene un umbral distinto para capturas con texto o mantener el tope único de 2048 px.
