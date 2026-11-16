# Roadmap STORE-05 · Portadas compuestas de Aula Store

> **Estado:** Completado · **Origen:** STORE-05 del backlog (2026-11-16)
> **Backlog:** sin entradas aparcadas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión.

---

## 1. Objetivo

- [x] Unificar las cinco portadas de Aula Store con el lenguaje visual de Calculadora y Tabla periódica, sustituyendo las capturas de Excalidraw, Programación por bloques y Diagramas por SVG compuestos.
- [x] Criterio de éxito: las cinco apps usan una portada SVG de 1200×675 con la misma jerarquía visual, sin capturas ni marco de ventana, y se ven completas en la tarjeta 16:9 y en la ficha 16:7.

## 2. Alcance

**Dentro:**

- Crear las portadas SVG de Excalidraw, Programación por bloques y Diagramas.
- Cambiar las rutas de `cover` en `lib/native-apps.ts` y retirar los tres PNG antiguos.
- Revisar las cinco portadas en la tarjeta y en la ficha, a 1366, 1024 y 390 px.
- Ejecutar pruebas, tipos, lint y build; cerrar la documentación y archivar el roadmap.

**Fuera de alcance:**

- Cambiar la estructura de la Tienda, la tarjeta, la ficha o `object-fit`.
- Cambiar nombres, descripciones, versiones, datos o lógica de instalación.
- Añadir apps nuevas, variantes de tema para las portadas o un generador de imágenes en tiempo de ejecución.
- Publicar en Sites o modificar la versión `1.1.34`.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| SVG estático de 1200×675 en `public/store` | Captura PNG o generación en tiempo de ejecución | Es el formato que ya usan Calculadora y Tabla periódica; pesa poco, escala sin pérdida y no depende de una pantalla concreta. |
| Mantener el texto como `<text>` con `Instrument Sans, system-ui, sans-serif` | Convertir todo el texto a trazados | Conserva la portada editable y el archivo pequeño; se revisa el fallo de fuente en la verificación visual. |
| Conservar `cover` como ruta en `lib/native-apps.ts` | Componente React específico para portadas | No añade código al catálogo ni al render; la imagen sigue siendo un activo cacheable. |
| Diseñar con área segura para el recorte 16:7 de la ficha | Cambiar `object-fit` o la proporción de la ficha | Evita tocar el layout compartido y mantiene la tarjeta 16:9 existente. |

## 4. Fases

### Fase 1 — Portadas SVG (completada)

- [x] Crear `public/store/excalidraw.svg`: fondo degradado azul, nombre, subtítulo, píldora y una pieza de lienzo con formas y flechas; sin chrome de ventana.
- [x] Crear `public/store/blockly.svg`: fondo degradado verde, nombre, subtítulo, píldora y bloques estilizados; sin chrome de ventana.
- [x] Crear `public/store/mermaid.svg`: fondo degradado coral, nombre, subtítulo, píldora y un diagrama de flujo estilizado; sin chrome de ventana.
- [x] Revisar las tres junto a Calculadora y Tabla periódica, y comprobar el texto y la pieza principal a tamaño de tarjeta y de ficha.
- **Criterios de aceptación:**
  - Las tres son SVG válidos de 1200×675, sin recursos externos.
  - Comparten la jerarquía de las portadas actuales: título, dos líneas de subtítulo, píldora y arte a la derecha.
  - Cada app tiene una paleta distinta y reconocible, sin repetir el morado de Calculadora.
  - No hay capturas reales, marco de macOS ni texto pegado a los bordes o a las esquinas que ocupan el icono y la categoría.
  - El título, el subtítulo y la pieza principal sobreviven al recorte 16:7 de la ficha.

### Fase 2 — Integración, limpieza y cierre (completada)

- [x] Cambiar `cover` en `lib/native-apps.ts` de `.png` a `.svg` para Excalidraw, Programación por bloques y Diagramas.
- [x] Eliminar `public/store/excalidraw.png`, `public/store/blockly.png` y `public/store/mermaid.png` cuando las nuevas portadas estén verificadas.
- [x] Revisar la Tienda y la ficha de cada app a 1366, 1024 y 390 px, sin 404 ni recortes del contenido principal.
- [x] Ejecutar pruebas, `tsc`, ESLint y build.
- [x] Actualizar el changelog, archivar este roadmap, reiniciar `roadmap.md` desde la plantilla y dejar el backlog vacío.
- **Criterios de aceptación:**
  - Las cinco tarjetas y las cinco fichas cargan su portada correcta.
  - No quedan referencias a los PNG retirados ni archivos muertos en `public/store`.
  - Pruebas, tipos, lint y build en verde.
  - Sin cambios de datos, versión ni publicación; el cierre queda documentado y el push se hace una sola vez al terminar.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El recorte 16:7 de la ficha corta el título o la pieza principal | Portada incompleta en la ficha | Diseñar con área segura y revisar la ficha, no solo la tarjeta. |
| Paletas demasiado parecidas entre apps | Pérdida de identidad visual | Revisar las cinco portadas juntas y separar los tonos por app. |
| El texto SVG cae a una fuente distinta | Cambio de métricas o saltos de línea | Usar la misma pila que las portadas actuales y revisar a tamaño real; si no convence, convertir solo el texto a trazados. |
| El trabajo se amplía al layout de la Tienda | Regresión visual y más alcance | No tocar CSS, tarjeta, ficha ni `object-fit`; el cambio es solo de activos y rutas. |

## 6. Notas de sesión

- 2026-11-16: STORE-05 sale del backlog y pasa a ser el roadmap activo. Calculadora y Tabla periódica ya usan SVG de 1200×675; Excalidraw, Programación por bloques y Diagramas usan PNG de 792×504, 972×648 y 1008×648, con proporciones 1,50–1,57 frente a la tarjeta 16:9 y la ficha 16:7.
- 2026-11-16: Fase 1 completada. Las tres portadas nuevas son SVG de 1200×675 (2,9–3,4 KB) con la misma composición que Calculadora y Tabla periódica; se revisaron las cinco juntas en tarjeta (272×153) y ficha (700×306) con el recorte real. Se corrigieron el texto desbordado de un bloque y las flechas del diagrama antes de dar la fase por cerrada.
- La tarjeta superpone el icono arriba a la izquierda y la categoría arriba a la derecha, y la imagen escala al pasar el ratón; las portadas deben dejar libres esas zonas.
- 2026-11-16: Fase 2 completada. Las rutas de `cover` apuntan a los SVG y los tres PNG se retiraron. La revisión real de la Tienda mostró que el icono de la tarjeta tapaba el nombre en las portadas; se desplazó el bloque de texto 50 px en las cinco para dejar libre la esquina superior izquierda. Verificado en Tienda y ficha a 1366, 1024 y 390 px; 160 archivos / 1.173 pruebas, `tsc`, ESLint, build y `perf:budget` correctos.
- No se cambia la versión `1.1.34` ni se publica en Sites desde este roadmap.
