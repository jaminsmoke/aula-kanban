# Roadmap PER-02 · Miniaturas derivadas de las imágenes de tareas

> **Estado:** `En curso` · versión local `1.1.28` · 2026-11-15
> **Backlog:** [`backlog.md`](backlog.md) · **Línea base:** [`miniaturas.md`](miniaturas.md)

---

## 1. Objetivo

- [x] Decidir con datos si las imágenes de tarea necesitan una miniatura derivada y, si la respuesta es sí, definir cómo integrarla sin tocar los originales.
- [x] Criterio de éxito: una comparación reproducible de peso, decodificación y memoria entre el original y el derivado, y una decisión documentada con su coste de integración.

## 2. Alcance

**Dentro:**
- Imágenes de tarea subidas a R2 con `purpose=task-image` y su pintado en la tarjeta (`.card-image`, 130 px).
- Medición de alternativas: derivado generado en el cliente, binding de imágenes de Cloudflare, no hacer nada.
- Prototipo aislado, pruebas de la aritmética de dimensiones y, solo si la decisión es sí, integración en la subida.

**Fuera de alcance:**
- Imágenes de la pizarra (`board-asset`), documentos, avatares y capturas de la ayuda.
- Reescritura o borrado de originales ya guardados; migraciones de esquema y tareas programadas.
- Subir el límite de 5 MB (se anota como consecuencia, no se cambia aquí).
- Publicación en Sites y `release:prepare`; la versión sigue en `1.1.28`.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Medir en Chrome headless con imágenes sintéticas y decodificación real | Medir sobre producción | No hay sesión de producción y el tablero no se puede sembrar con fotos reales desde esta sesión. |
| Sustituir el original por el derivado en las subidas nuevas (recomendado en fase 2) | Guardar original y derivado | La tarjeta y el detalle no pasan de 220 px; conservar ambos exige una referencia nueva, cambios en la purga y en el inventario, y duplica el almacenamiento. |
| El derivado, si se implementa, se genera en el cliente | Transformación al vuelo en cada lectura | El binding de imágenes no está confirmado en Sites; generarlo una vez evita coste por visita. Se compara en la fase 2. |
| La decisión se toma tras medir, no antes | Implementar directamente | El propio backlog pide evaluar si merece la complejidad. |

## 4. Fases

### Fase 1 — Diagnóstico y línea base

- [x] Documentar el recorrido actual: subida de 5 MB, original en R2, `/api/files/[id]`, tarjeta de 130 px con `loading="lazy"` y sin `srcset`.
- [x] Añadir `npm run perf:images` y medir original frente a derivado de 800 px en WebP.
- [x] Registrar método, cifras y límites en `docs/miniaturas.md`.
- **Criterios de aceptación:** la medición se repite con un comando y no depende de producción; la tabla incluye peso, transferencia estimada, decodificación y memoria.

### Fase 2 — Prototipo y comparación

- [x] Extraer una función pura de dimensiones (ancho máximo, proporción, sin ampliar) con pruebas: `lib/domain/uploads/thumbnail.ts` y 7 pruebas.
- [x] Prototipar el derivado en cliente con `createImageBitmap` y canvas, respetando la orientación y sin metadatos, y medir calidad y CPU: `app/board/shared/image-thumbnail.ts` y PSNR en `perf:images`.
- [x] Comparar con el binding de imágenes de Cloudflare y con no hacer nada, incluyendo el coste de almacenar y limpiar derivados. El Site no declara el binding `IMAGES` (solo `BUCKET` y `DB`), así que se descarta.
- [x] Recomendar una opción con su coste de integración: derivado en cliente que sustituye al original, con respaldo, en [`miniaturas.md`](miniaturas.md).
- **Criterios de aceptación:** cumplidos; la tabla compara las cuatro alternativas (incluida la variante que conserva el original) y la recomendación es explícita.

### Fase 3 — Decisión e integración (pendiente de aprobación)

- [ ] Confirmar la recomendación de la fase 2: derivado en cliente que sustituye al original en subidas nuevas, con respaldo al original si falla.
- [ ] Integrar en `handleUpload`: generar el derivado, subirlo como `task-image`, dejar los GIF intactos y no tocar las imágenes ya guardadas.
- [ ] Probar el camino feliz, el respaldo cuando el generador devuelve `null` y el GIF sin transformar.
- [ ] Documentar en el README la pérdida del original en subidas nuevas, la asimetría con el MCP y el límite de 5 MB.
- [ ] Pasar lint, tipos, pruebas y build sobre el resultado.
- **Criterios de aceptación:** decisión escrita con evidencia, sin cambios de esquema ni de versión, y checks verdes. Si no se aprueba, se documenta el motivo y se cierra sin tocar código de producto.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Orientación EXIF o animación GIF | El derivado se ve girado o pierde movimiento | Respetar la orientación al decodificar y excluir GIF animado del derivado. |
| Doble almacenamiento y huérfanos | El derivado se purga o queda para siempre | Referenciarlo desde la tarea y cubrirlo con la purga de PER-03. |
| El MCP sube archivos sin pasar por el cliente | Imágenes del MCP sin derivado | Documentar la asimetría o generar el derivado también en el servidor. |
| CPU en móviles de gama media | La subida se percibe lenta | Medir antes de prometer; limitar el tamaño de trabajo y mostrar estado. |
| Calidad insuficiente en pantallas HiDPI | Tarjetas borrosas | Usar 800 px de ancho y revisar calidad antes de integrar. |
| La revisión visual no es posible en esta sesión | No se valida el resultado en un navegador real | Comparar con capturas locales y dejar la comprobación visual para la publicación. |

## 6. Notas de sesión

- 2026-11-15: PER-02 sale del backlog y entra al roadmap tras publicar `1.1.28`. Fase 1 completada con una foto sintética de 12 MP: 3,9 MB, 46,5 MB decodificados y ~20 s en Fast 3G frente a 61 KB, 1,8 MB y ~0,3 s del derivado de 800 px.
- 2026-11-15: fase 2 completada. El derivado de 800 px WebP 0,8 obtiene 35,7 dB de PSNR y cuesta 27–35 ms de codificación en escritorio. El binding `IMAGES` no está disponible en el Site. Se recomienda el derivado en cliente que sustituye al original, con respaldo; conservar ambos se descarta por esquema, purga e inventario. La fase 3 queda pendiente de aprobación.
