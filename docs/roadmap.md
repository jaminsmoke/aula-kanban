# Roadmap PER-04 · Imágenes de pizarra: derivado antes de subir

> **Estado:** `En curso` · versión local `1.1.28` · 2026-11-15
> **Backlog:** [`backlog.md`](backlog.md) · **Medición:** [`miniaturas.md`](miniaturas.md)

---

## 1. Objetivo

- [x] Decidir con datos si las imágenes que se insertan en la pizarra se reducen antes de subir.
- [x] Criterio de éxito: medir 1600 y 2048 px con el mismo método de PER-02 y comparar peso, decodificación, memoria, calidad y coste de codificación.

## 2. Alcance

**Dentro:**
- Imágenes insertadas en Excalidraw y subidas como `board-asset`.
- Medición con `npm run perf:images -- --widths` y decisión documentada.

**Fuera de alcance:**
- GIF y PNG con transparencia; quedan intactos en esta fase.
- Imágenes ya guardadas, el MCP, migraciones y cambios de esquema.
- Publicación en Sites y `release:prepare`; la versión sigue en `1.1.28`.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Medir con el script de PER-02 y `--widths` | Script aparte para la pizarra | Reutiliza el mismo método y hace comparables las cifras. |
| Generar derivado solo si la imagen supera el tope | Reducir siempre | En una imagen de 1920 px, pedir 2048 no reduce memoria y duplica la decodificación. |
| 2048 px como candidato | 1600 px | Conserva más ampliación; 1600 px pesa 223 KB frente a 348 KB, pero cubre menos zoom. |

## 4. Fases

### Fase 1 — Medición

- [x] Permitir varios anchos en `perf:images` sin cambiar el valor por defecto de 800 px.
- [x] Medir 1600 y 2048 px sobre las mismas fotos sintéticas de 12 MP y 2 MP.
- [x] Registrar la tabla, la lectura y los límites en [`miniaturas.md`](miniaturas.md).
- **Criterios de aceptación:** cumplidos; la medición se repite con un comando y cubre peso, transferencia, decodificación, memoria, PSNR y codificación.

### Fase 2 — Decisión

- [x] Aprobar el tope de 2048 px, con PNG y GIF fuera del derivado.
- **Criterios de aceptación:** la recomendación queda escrita con las cifras y el motivo; si se descarta, se documenta y se cierra sin tocar código.

### Fase 3 — Integración

- [x] Reducir antes de subir en `uploadBlob`, sin ampliar y con respaldo al original.
- [x] Probar el camino feliz, el PNG intacto y el fallo del generador.
- [x] Actualizar el README y pasar lint, tipos, pruebas y build.
- **Criterios de aceptación:** sin cambios de esquema ni de versión; el original se conserva cuando no hay reducción real.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pérdida de nitidez al ampliar | El detalle de la pizarra se ve blando | 2048 px cubre más zoom que 1600; revisar en navegador antes de publicar. |
| Coste de codificación en móvil | La inserción se percibe lenta | 210 ms medidos en escritorio; mostrar estado y no bloquear la escena. |
| PNG con transparencia o capturas con texto | El derivado pierde bordes o legibilidad | Dejarlos intactos hasta medirlos aparte. |
| Imágenes ya guardadas | Siguen a resolución completa | No se reescriben; el cambio afecta solo a subidas nuevas. |

## 6. Notas de sesión

- 2026-11-15: fase 1 completada. En 12 MP, 1600 px deja 223 KB y 7,3 MB decodificados; 2048 px deja 348 KB y 12,0 MB, con 36,1–36,3 dB y 130–210 ms de codificación. En 2 MP, el tope de 2048 no reduce nada porque la imagen ya mide 1920 px. Se recomienda 2048 px solo si el ancho original lo supera; la decisión queda pendiente de aprobación.
- 2026-11-15: aprobado el tope de 2048 px. `uploadBlob` reduce JPEG y WebP que superen ese ancho, deja PNG y GIF intactos y cae al original si el generador devuelve `null` o el derivado pesa más. Tres pruebas nuevas en `whiteboard-model.test.ts`; sin cambios de esquema ni de versión.
