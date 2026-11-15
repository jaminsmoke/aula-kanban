# Miniaturas de imágenes

> **Estado:** PER-02 integrado · PER-04 en medición · build `1.1.28` · 2026-11-15
> **Medición:** `npm run perf:images` · **Prototipo:** `app/board/shared/image-thumbnail.ts` · **Roadmap:** [`roadmap.md`](roadmap.md)

---

## Cómo medir

El script no necesita la app ni la base de datos: genera imágenes sintéticas en Chrome headless, las codifica, las decodifica, calcula la calidad frente a la referencia y genera un derivado de 800 px.

```bash
npm run perf:images
# Opciones: --runs 5, --widths 800,1600,2048, --kind png, --chrome <ruta>, --json, --out docs/miniaturas.json
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

## Imágenes de pizarra (PER-04)

Las imágenes insertadas en Excalidraw se suben con `purpose=board-asset` tal cual llegan del portapapeles o del equipo. La pizarra las amplía, así que el tope de 800 px de la tarjeta no sirve. Medición del 2026-11-15 con `npm run perf:images -- --widths 800,1600,2048`, 3 muestras por escenario:

| Escenario | Ancho derivado | Original | Derivado WebP | Reducción | Transferencia Fast 3G | Decodificación | Calidad (PSNR) | Memoria decodificada |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Foto 12 MP (4032×3024) | 800 px | 3,9 MB | 61 KB | 98 % | 20.489 ms → 310 ms | 48 ms → 4 ms (codificar 34 ms) | 35,7 dB | 46,5 MB → 1,8 MB |
| Foto 2 MP (1920×1080) | 800 px | 704 KB | 51 KB | 93 % | 3.606 ms → 259 ms | 8 ms → 3 ms (codificar 28 ms) | 35,7 dB | 7,9 MB → 1,4 MB |
| Foto 12 MP (4032×3024) | 1600 px | 3,9 MB | 223 KB | 94 % | 20.489 ms → 1.144 ms | 45 ms → 12 ms (codificar 130 ms) | 36,1 dB | 46,5 MB → 7,3 MB |
| Foto 2 MP (1920×1080) | 1600 px | 704 KB | 168 KB | 76 % | 3.606 ms → 862 ms | 8 ms → 10 ms (codificar 97 ms) | 36,2 dB | 7,9 MB → 5,5 MB |
| Foto 12 MP (4032×3024) | 2048 px | 3,9 MB | 348 KB | 91 % | 20.489 ms → 1.782 ms | 46 ms → 20 ms (codificar 210 ms) | 36,3 dB | 46,5 MB → 12,0 MB |
| Foto 2 MP (1920×1080) | 1920 px | 704 KB | 408 KB | 42 % | 3.606 ms → 2.089 ms | 8 ms → 20 ms (codificar 186 ms) | 36,2 dB | 7,9 MB → 7,9 MB |

Lectura:

- En 12 MP, 2048 px deja 348 KB (91 % menos) y 12,0 MB decodificados, con 36,3 dB y 210 ms de codificación en escritorio; 1600 px baja a 223 KB y 7,3 MB, pero cubre menos ampliación.
- En 2 MP, pedir 2048 px no reduce dimensiones: el derivado pesa 408 KB frente a 704 KB, pero la memoria decodificada es la misma y la decodificación pasa de 8 a 20 ms. **Si la imagen ya cabe en el tope, no hay que generar derivado.**
- El ahorro depende del zoom: 2048 px cubre hasta unos 2,3 aumentos en un lienzo de 900 px; 1600 px, hasta unos 1,8. La nitidez real del zoom no se puede validar en esta sesión.

Aprobado e integrado el 2026-11-15: tope de **2048 px** para fotos JPEG y WebP de pizarra, WebP 0,8, solo si el ancho original supera 2048; PNG y GIF intactos. Coste medido: 210 ms de codificación en escritorio en una foto de 12 MP, sin contar la subida.

### PNG con transparencia y capturas

Medición del 2026-11-15 con `npm run perf:images -- --kind png --widths 1600,2048`, 3 muestras por escenario. El original es PNG y se comparan tres salidas: PNG redimensionado sin pérdida, WebP 0,8 y WebP sin pérdida (calidad 1).

| Escenario | Ancho | PNG original | PNG redimensionado | WebP 0,8 | WebP sin pérdida | PSNR 0,8 | Error alfa máx. | Codificar 0,8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Logo transparente (3000×2000) | 1600 px | 341 KB | 154 KB | 58 KB | 159 KB | 41,0 dB | 0 | 122 ms |
| Captura con texto (2560×1440) | 1600 px | 120 KB | 70 KB | 14 KB | 260 KB | 45,1 dB | 0 | 45 ms |
| Logo transparente (3000×2000) | 2048 px | 341 KB | 230 KB | 72 KB | 176 KB | 41,0 dB | 0 | 185 ms |
| Captura con texto (2560×1440) | 2048 px | 120 KB | 104 KB | 20 KB | 349 KB | 46,3 dB | 0 | 69 ms |

Lectura:

- El canal alfa sobrevive intacto en WebP (error máximo 0) y también al redimensionar el PNG: la transparencia no obliga a descartar el derivado.
- En la captura con texto, WebP 0,8 deja 20 KB frente a 120 KB del PNG original, con 46,3 dB. El PNG redimensionado sin pérdida baja a 104 KB; el WebP sin pérdida es peor que el PNG por la naturaleza plana de la interfaz sintética.
- En el logo transparente, WebP 0,8 deja 72 KB frente a 341 KB, con 41,0 dB y alfa exacto; el PNG redimensionado se queda en 230 KB.
- El PSNR alto no garantiza por sí solo que el texto se lea igual de nítido: la captura es sintética y no se ha revisado en pantalla.

Decisión aprobada (2026-11-15): incluir **PNG** en el derivado de pizarra con el mismo tope de 2048 px, WebP 0,8 y el mismo respaldo; los GIF siguen intactos. El alfa llega exacto al WebP y la revisión del texto de una captura real se anota en el roadmap.

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
- La medición de pizarra usa las mismas fotos sintéticas opacas; no cubre PNG con transparencia, capturas con texto ni el zoom real de Excalidraw.

## Integración

La fase 3 está integrada: `handleUpload` genera la miniatura, envía el WebP si pesa menos que el original y cae al original en cualquier otro caso. Los GIF no se transforman y el MCP mantiene su propio camino. En la pizarra, `uploadBlob` reduce a 2048 px las imágenes JPEG, PNG y WebP que superan ese ancho; los GIF se suben intactos y el WebP conserva el canal alfa de los PNG.
