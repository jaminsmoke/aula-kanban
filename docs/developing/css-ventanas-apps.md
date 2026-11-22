# CSS de las ventanas de apps

> **Estado:** ARC-13, Fase 1 completada · **Fecha:** 2026-11-22
> **Alcance:** clases raíz, variables locales y reglas compartidas de las ventanas de apps.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Resultado del inventario

- Calculadora y Tabla periódica importan `app/board/apps/edu-base.css`; el resto de apps importa su propio CSS.
- `.edu-app` está declarada **dos veces**: en `edu-base.css` y en `calculadora.css`. La segunda copia repite propiedades, `container` y las mismas 14 variables locales.
- Las 14 variables locales de `.edu-app` no tienen ningún `var()` en CSS, TS o TSX: son definiciones sin consumidor.
- Ocho clases raíz más (`.ajedrez-app`, `.fisica-app`, `.geometria-app`, `.mapas-app`, `.timeline-app`, `.tarjetas-app`, `.moleculas-app`, `.hoja-calculo-app`) repiten la misma disposición de ventana.
- Solo cambian el `container-name`, la ausencia de `min-height` en `.edu-app` y algunas variables locales de Ajedrez.
- La base compartida puede cubrir la disposición sin tocar contenido, scroll ni container queries.

## 2. Archivos y cargas

| Archivo | Líneas | Se carga desde |
|---|---:|---|
| `app/board/apps/edu-base.css` | 61 | `calculadora-app.tsx`, `tabla-periodica-app.tsx` |
| `app/board/apps/calculadora/calculadora.css` | 206 | `calculadora-app.tsx` |
| `app/board/apps/tabla-periodica/tabla-periodica.css` | 10 | `tabla-periodica-app.tsx` |
| `app/board/apps/mapas/mapas.css` | 330 | `mapas-app.tsx` |
| `app/board/apps/timeline/timeline.css` | 495 | `timeline-app.tsx` |
| `app/board/apps/tarjetas/tarjetas.css` | 329 | `tarjetas-app.tsx` |
| `app/board/apps/tarjetas/tarjetas-review.css` | 284 | `tarjetas-app.tsx` |
| `app/board/apps/moleculas/moleculas.css` | 352 | `moleculas-app.tsx` |
| `app/board/apps/hoja-calculo/hoja-calculo.css` | 402 | `hoja-calculo-app.tsx` |
| `app/board/apps/ajedrez/ajedrez.css` | 425 | `ajedrez-app.tsx` |
| `app/board/apps/fisica/fisica.css` | 234 | `fisica-app.tsx` |
| `app/board/apps/geometria/geometria.css` | 268 | `geometria-app.tsx` |

## 3. Clases raíz

| Clase | Archivo | `container-name` | Propiedades comunes | Diferencia local |
|---|---|---|---|---|
| `.edu-app` | `edu-base.css` (+ copia en `calculadora.css`) | `eduapp` | 9 de 10 | No tiene `min-height:0`; añade `font-family` y 14 variables |
| `.mapas-app` | `mapas.css` | `mapasapp` | 10 de 10 | Ninguna |
| `.timeline-app` | `timeline.css` | `timelineapp` | 10 de 10 | Ninguna |
| `.tarjetas-app` | `tarjetas.css` | `tarjetasapp` | 10 de 10 | Ninguna |
| `.moleculas-app` | `moleculas.css` | `moleculasapp` | 10 de 10 | Ninguna |
| `.hoja-calculo-app` | `hoja-calculo.css` | `hojacalculoapp` | 10 de 10 | Ninguna |
| `.ajedrez-app` | `ajedrez.css` | `ajedrezapp` | 10 de 10 | 6 variables de tablero |
| `.fisica-app` | `fisica.css` | `fisicaapp` | 10 de 10 | Ninguna |
| `.geometria-app` | `geometria.css` | `geometriaapp` | 10 de 10 | Ninguna |

Propiedades comunes detectadas:

```css
flex:1 1 auto;
width:100%;
min-width:0;
min-height:0;
display:flex;
flex-direction:column;
height:100%;
background:var(--ui-surface-hover);
color:var(--ui-text-primary);
container-type:inline-size;
```

Cada app conserva su `container-name` y sus variables locales. La base común no debe absorberlas.

## 4. Duplicado de `.edu-app`

`calculadora.css` vuelve a declarar el bloque completo de `.edu-app` que ya aporta `edu-base.css`. No hay diferencias funcionales: la copia repite las propiedades, el `container-name:eduapp` y las variables locales. Debe retirarse.

## 5. Variables locales de `.edu-app`

Las siguientes variables se declaran en `edu-base.css` y en la copia de `calculadora.css`, pero no tienen ningún `var()` en el código de producto:

| Variable | Definiciones | Usos |
|---|---:|---:|
| `--background` | 2 | 0 |
| `--foreground` | 2 | 0 |
| `--card` | 2 | 0 |
| `--surface` | 2 | 0 |
| `--border` | 2 | 0 |
| `--rule` | 2 | 0 |
| `--muted-foreground` | 2 | 0 |
| `--accent` | 2 | 0 |
| `--accent-foreground` | 2 | 0 |
| `--calc-key` | 2 | 0 |
| `--calc-operator` | 2 | 0 |
| `--calc-operator-foreground` | 2 | 0 |
| `--calc-func` | 2 | 0 |
| `--calc-func-foreground` | 2 | 0 |

La Fase 2 debe retirarlas de ambos archivos; si alguna aparece en una prueba o componente futuro, se reintroduce con un consumidor real.

## 6. Decisión para la Fase 2

- Crear `app/board/apps/app-window.css` con una clase neutral `.app-window` para las propiedades comunes.
- Añadir `app-window` a la clase raíz de las nueve ventanas: Calculadora/Tabla (`edu-app`), Mapas, Líneas, Tarjetas, Moléculas, Hoja, Ajedrez, Física y Geometría.
- Mantener en cada clase raíz su `container-name` y sus variables locales.
- Eliminar de `calculadora.css` el bloque `.edu-app` duplicado.
- Eliminar las 14 variables sin consumidores de `edu-base.css` y de la copia de Calculadora.
- Mantener `font-family` en `.edu-app` para no alterar la herencia del resto de apps.
- Conservar las reglas de toolbar, contenido, scroll, foco y responsive en cada app.

La base no incluirá `container-name`: es la única propiedad que debe variar por ventana.

## 7. Pruebas y revisión

- Calculadora y Tabla periódica juntas y por separado.
- Mapas, Líneas, Tarjetas, Moléculas, Hoja, Ajedrez, Física y Geometría.
- Temas claro y oscuro.
- Anchos estrechos, ventana normal y maximizada.
- Foco visible, teclado y desplazamiento interno.
- Comparación del CSS neto y de la carga por ruta antes/después.

## 8. Baseline

- Arquitectura: **461 archivos / 1.154 imports**.
- Suite: **268 archivos / 1.774 pruebas**.
- Aula Documentos: **386.658 / 387.000 B**.
- Hoja de cálculo: **312.862 / 315.000 B**.
- Site: `1.1.39`.
