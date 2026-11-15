# Miniaturas de imágenes de tareas

> **Estado:** fase 2 de PER-02 · build `1.1.28` · 2026-11-15
> **Medición:** `npm run perf:images` · **Prototipo:** `app/board/shared/image-thumbnail.ts` · **Roadmap:** [`roadmap.md`](roadmap.md)

---

## Cómo medir

El script no necesita la app ni la base de datos: genera imágenes sintéticas en Chrome headless, las codifica, las decodifica, calcula la calidad frente a la referencia y genera un derivado de 800 px.

```bash
npm run perf:images
# Opciones: --runs 5, --chrome <ruta>, --json, --out docs/miniaturas.json
```

Cada escenario se repite tres veces y se publica la mediana. La transferencia se calcula con el perfil de Fast 3G de `perf-latency.mjs` (1,6 Mbps de bajada); no se mide sobre la red.

## Recorrido actual

- La tarea sube el archivo tal cual a `POST /api/uploads?project=…` con `purpose=task-image`. Se admiten PNG, JPEG, WebP y GIF de hasta **5 MB**; el límite se valida en `validateUpload` y también en el MCP.
- `storeUpload` guarda el original en R2 con la clave `proyecto/task-image/id.ext` y `cacheControl: private, max-age=3600`. No hay transformación ni copia derivada.
- La tarjeta pinta `<img className="card-image" src="/api/files/…" loading="lazy">` en un marco de **130 px de alto** con `object-fit: contain`. El detalle usa `task-detail-image` con ancho completo y **220 px de alto**. No hay `width`/`height`, `srcset` ni miniatura.
- El original se descarga entero para pintarse en esos marcos. El tamaño decodificado en memoria es el de la imagen completa.

## Resultados

Medición del 2026-11-15, Chrome headless, 3 muestras por escenario:

| Escenario | Original | Derivado 800 px WebP | Reducción | Transferencia Fast 3G | Decodificación | Calidad (PSNR) | Memoria decodificada |
|---|---:|---:|---:|---:|---:|---:|---:|
| Foto 12 MP (4032×3024) | 3,9 MB | 61 KB | 98 % | 20.489 ms → 310 ms | 48 ms → 4 ms (codificar 35 ms) | 35,7 dB | 46,5 MB → 1,8 MB |
| Foto 2 MP (1920×1080) | 704 KB | 51 KB | 93 % | 3.606 ms → 259 ms | 9 ms → 3 ms (codificar 27 ms) | 35,7 dB | 7,9 MB → 1,4 MB |

La codificación del derivado es el coste que paga el cliente al subir: 27–35 ms de mediana en esta máquina, sin contar la lectura del archivo ni la subida. Un PSNR de 35,7 dB frente a la referencia reducida es una diferencia de compresión visible solo al comparar píxeles, no en una tarjeta de 130 px.

## Comparación de alternativas

| Opción | Qué implica | Coste en la tarjeta | Cambios necesarios | Riesgo | Veredicto |
|---|---|---|---|---|---|
| **No hacer nada** | Mantener el original y el `<img>` actual | 3,9 MB, 46,5 MB decodificados y ~20 s en Fast 3G por foto de 12 MP | Ninguno | El tablero sigue pesado en redes lentas y en móviles | Descartada: el coste medido es alto y crece con las fotos de cámara. |
| **Derivado en cliente que sustituye al original** | Reducir a 800 px WebP 0,8 antes de subir; si falla, subir el original | 61 KB, 1,8 MB y ~0,3 s | `handleUpload` de tareas, pruebas y README | Se pierde la resolución completa; GIF queda fuera | **Recomendada.** |
| **Derivado en cliente conservando el original** | Subir ambos y mantener una referencia al original | 61 KB | Esquema nuevo o segunda fila, cambios en la purga y en el inventario | Doble almacenamiento y riesgo de huérfanos | No recomendada ahora: la complejidad supera el beneficio para una imagen decorativa. |
| **Binding de imágenes de Cloudflare** | Redimensionar en el Worker desde R2 | Generado por visita | Binding `IMAGES` y caché | `.openai/hosting.json` solo declara `d1` y `r2`; el Worker construido solo tiene `BUCKET` y `DB`, y cada transformación se factura | No disponible en este Site. |

## Recomendación

Generar el derivado en el cliente y subir **solo** el derivado en las imágenes nuevas de tarea:

- 800 px de ancho, WebP con calidad 0,8, sin ampliar y conservando la proporción (`calcularDimensionesMiniatura`).
- Solo JPEG, PNG y WebP. Los GIF se suben intactos para no perder la animación.
- Si el navegador no puede decodificar, codificar o no tiene `OffscreenCanvas`, se sube el original como hasta ahora. La subida nunca se bloquea por la miniatura.
- Las imágenes ya guardadas no se tocan; el cambio afecta solo a las subidas nuevas.
- Se mantiene el límite de 5 MB y el contrato de `/api/uploads`; el MCP sigue subiendo el original, porque no pasa por el cliente. Esa asimetría está documentada en el README.

El detalle de tarea muestra la imagen a un máximo de 220 px de alto y la tarjeta a 130 px, así que 800 px cubre también pantallas de alta densidad en esos marcos. No hay ninguna vista que use la resolución completa.

## Coste de integración

- Unas 40 líneas en `app/board/tasks/dialog/task-dialog.tsx`: llamar a `crearMiniaturaDeArchivo`, subir `miniatura.blob` con el mismo `purpose=task-image` y caer al `file` original si devuelve `null`.
- Pruebas del diálogo con el generador simulado: camino feliz, respaldo y GIF sin transformar.
- README: explicar que las subidas nuevas guardan una versión de 800 px y que el MCP mantiene el original.
- Sin migraciones, sin cambios en `uploads`, en la purga ni en el inventario.

## Límites de la medición

- Las imágenes son sintéticas (degradado, formas, texto y grano). Un derivado real de una foto con textura fina suele pesar más que 61 KB; el porcentaje de reducción es una referencia, no una promesa.
- La transferencia es aritmética sobre Fast 3G, no una medición de red. El CDN y la caché de Sites pueden cambiarla.
- Se mide JPEG de entrada y WebP de salida con calidad 0,8; no se han probado AVIF, PNG con transparencia, GIF animado ni orientación EXIF.
- Una sola máquina y un solo navegador; no se midió un móvil de gama media ni la batería. La codificación de 27–35 ms es de escritorio.
- No se usan imágenes de producción: no hay sesión ni datos reales en esta sesión.

## Integración

La fase 3 está integrada: `handleUpload` genera la miniatura, envía el WebP si pesa menos que el original y cae al original en cualquier otro caso. Los GIF no se transforman y el MCP mantiene su propio camino.
