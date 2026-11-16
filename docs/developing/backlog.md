# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 1 entrada: STORE-05 pendiente

---

## 2026-11-16 — STORE-05 · Portadas compuestas para Excalidraw, Programación por bloques y Diagramas

- Contexto: revisión visual de la Tienda en la 1.1.34. Calculadora y Tabla periódica usan portadas SVG compuestas de 1200×675, con fondo degradado, nombre, subtítulo y una pieza de interfaz estilizada. Excalidraw, Programación por bloques y Diagramas siguen usando capturas reales con marco de ventana de macOS, que rompen la unidad visual y se recortan al mostrarse en la tarjeta y en la ficha.
- Alcance:
  1. Crear `public/store/excalidraw.svg`, `public/store/blockly.svg` y `public/store/mermaid.svg` con el mismo lenguaje que las portadas de Calculadora y Tabla periódica: composición 16:9, degradado suave, dos círculos decorativos, bloque de texto a la izquierda (nombre, dos líneas de subtítulo y una píldora) y una pieza de interfaz estilizada a la derecha, sin captura ni chrome de ventana.
  2. Asignar una paleta propia a cada app sin repetir el morado de Calculadora; por ejemplo, azul para Excalidraw, verde para Programación por bloques y coral para Diagramas. Mantener la misma tipografía y jerarquía que las portadas actuales.
  3. Cambiar `cover` en `lib/native-apps.ts` de `.png` a `.svg`, eliminar los tres PNG antiguos cuando las nuevas portadas estén verificadas y actualizar cualquier prueba o documentación que mencione esas rutas.
- Criterios: las cinco apps comparten el mismo formato y ninguna conserva una captura real; las portadas se ven completas en la tarjeta 16:9 y en la ficha 16:7, sin recortar el nombre ni la pieza principal; texto legible a 272 px de tarjeta y a 700 px de ficha; sin 404 ni cambios en nombres, versiones, datos o lógica de la Tienda.
- Notas técnicas: los PNG actuales miden 792×504, 972×648 y 1008×648 (proporciones 1,50–1,57), mientras que la tarjeta es 16:9 y la ficha 16:7, así que `object-fit: cover` los recorta. Los SVG actuales son 1200×675 y encajan con la tarjeta. La tarjeta superpone el icono arriba a la izquierda y la categoría arriba a la derecha, y la imagen escala al pasar el ratón: dejar libres esas esquinas y no pegar texto a los bordes. Los SVG de `public/store` pueden usar colores crudos y `<text>` con la pila `Instrument Sans, system-ui, sans-serif`; no necesitan tokens CSS ni fuentes externas. No hay bloqueo técnico: falta aprobar la dirección visual y revisar el resultado en 1366, 1024 y 390 px.
