# Miniaturas de imágenes de tareas

> **Estado:** línea base de PER-02 · fase 1 · build `1.1.28` · 2026-11-15
> **Medición:** `npm run perf:images` · **Roadmap:** [`roadmap.md`](roadmap.md)

---

## Cómo medir

El script no necesita la app ni la base de datos: genera imágenes sintéticas en Chrome headless, las codifica, las decodifica y genera un derivado de 800 px.

```bash
npm run perf:images
# Opciones: --runs 5, --chrome <ruta>, --json, --out docs/miniaturas.json
```

Cada escenario se repite tres veces y se publica la mediana. La transferencia se calcula con el perfil de Fast 3G de `perf-latency.mjs` (1,6 Mbps de bajada); no se mide sobre la red.

## Recorrido actual

- La tarea sube el archivo tal cual a `POST /api/uploads?project=…` con `purpose=task-image`. Se admiten PNG, JPEG, WebP y GIF de hasta **5 MB**; el límite se valida en `validateUpload` y también en el MCP.
- `storeUpload` guarda el original en R2 con la clave `proyecto/task-image/id.ext` y `cacheControl: private, max-age=3600`. No hay transformación ni copia derivada.
- La tarjeta pinta `<img className="card-image" src="/api/files/…" loading="lazy">` en un marco de **130 px de alto** con `object-fit: contain`. No hay `width`/`height`, `srcset` ni miniatura.
- El original se descarga entero para pintarse a 130 px. El tamaño decodificado en memoria es el de la imagen completa, no el del marco.

## Resultados

Medición del 2026-11-15, Chrome headless, 3 muestras por escenario:

| Escenario | Original | Derivado 800 px WebP | Reducción | Transferencia Fast 3G | Decodificación | Memoria decodificada |
|---|---:|---:|---:|---:|---:|---:|
| Foto 12 MP (4032×3024) | 3,9 MB | 61 KB | 98 % | 20.489 ms → 310 ms | 47 ms → 4 ms (codificar 36 ms) | 46,5 MB → 1,8 MB |
| Foto 2 MP (1920×1080) | 704 KB | 51 KB | 93 % | 3.606 ms → 259 ms | 9 ms → 4 ms (codificar 29 ms) | 7,9 MB → 1,4 MB |

La codificación del derivado es el coste que paga el cliente al subir: 29–36 ms de mediana en esta máquina, sin contar la lectura del archivo ni la subida.

## Lectura

- Una foto de móvil de 12 MP ocupa 3,9 MB, se decodifica en 46,5 MB de memoria y tarda unos **20 s** en descargarse en Fast 3G para verse en una tarjeta de 130 px. La misma imagen como WebP de 800 px pesa 61 KB (98 % menos), decodifica en 4 ms y tarda unos **0,3 s**.
- Incluso una imagen de 2 MP, que ya cabe de sobra en el límite actual, multiplica por siete la descarga y por cinco la memoria frente al derivado.
- La decodificación no es el cuello de botella en escritorio (47 ms), pero sí lo es la descarga y la memoria en un móvil. El coste real en CPU móvil no está medido.
- El límite de 5 MB deja fuera muchas fotos de cámara actuales; el derivado permitiría aceptar originales mayores sin castigar el tablero. Eso exige una decisión aparte sobre el límite.

## Límites de la medición

- Las imágenes son sintéticas (degradado, formas, texto y grano). Un derivado real de una foto con textura fina suele pesar más que 61 KB; el porcentaje de reducción es una referencia, no una promesa.
- La transferencia es aritmética sobre Fast 3G, no una medición de red. El CDN y la caché de Sites pueden cambiarla.
- Se mide JPEG de entrada y WebP de salida con calidad 0,8; no se han probado AVIF, PNG con transparencia, GIF animado ni orientación EXIF.
- Una sola máquina y un solo navegador; no se midió un móvil de gama media ni la batería.
- No se usan imágenes de producción: no hay sesión ni datos reales en esta sesión.

## Siguiente paso

La fase 2 compara el derivado en cliente con el binding de imágenes y con no hacer nada, y decide si merece la complejidad. La fase 3 solo integra si la decisión es sí.
