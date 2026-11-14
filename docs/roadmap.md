# Roadmap

> **Estado:** Activo
> **Inicio:** 2026-11-14
> **Versión de partida:** 1.1.20 publicada
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.

---

## 1. Objetivo

Cerrar los detalles de rendimiento y acabado sin romper la arquitectura CSS: mantener `globals.css` como capa de tokens y reglas compartidas, dejar las especificidades junto a cada feature, sustituir la animación Lottie por una solución ligera y decidir el alojamiento de las fuentes.

**Criterio de éxito:** no hay regresiones visuales, `globals` conserva solo lo compartido, el check de instalación deja de cargar `lottie-react`, la decisión sobre fuentes está documentada y lint, tipos, tests, build y smoke están en verde.

## 2. Alcance

**Dentro:**

- Auditar tokens y reglas de `globals.css` según la política compartido/específico.
- Retirar tokens sin uso y promover a `globals` lo que se repita entre componentes.
- Sustituir `lottie-react` y `check-lottie.json` por SVG/CSS.
- Decidir si las fuentes de Google se sirven desde el propio Site.
- Verificar CSS, tienda, animación de éxito y build.

**Fuera de alcance:**

- Rediseñar la interfaz o cambiar la identidad visual.
- Vaciar `globals.css` o mover sus tokens a una vista lazy.
- Lazy-load de `buttons.css`, `access.css` o `dialogs.css`, que son compartidos.
- Añadir una librería de animación nueva.
- Publicar o incrementar la versión.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mantener `globals` como capa de tokens/base/reglas compartidas | Mover todo a CSS por componente | Los tokens y primitivas compartidas necesitan una fuente única |
| Promocionar un valor cuando se repite | Duplicarlo en cada feature | Evita divergencias y mantiene el CSS como optimizador de tokens |
| CSS específico junto a su componente | Un único CSS global por conveniencia | Reduce el acoplamiento y el alcance de cada regla |
| Sustituir Lottie por SVG/CSS | Añadir otra librería de animación | El check es pequeño y no justifica un chunk de 300 KB |
| Decidir las fuentes con medición | Autohospedarlas sin datos | Hay que comparar rendimiento, caché y mantenimiento |

## 4. Fases

### Fase 1: Auditoría de globals y política CSS

- [x] Auditar los 37 tokens actuales y sus usos fuera de `globals.css`.
- [x] Retirar tokens sin uso, empezando por `--font-mono`.
- [x] Revisar reglas compartidas y promocionar valores repetidos.
- [x] Mover a CSS de feature solo las reglas que sean de un único componente.
- [x] Verificar que no hay cambios visuales.
- **Resultado:** `--font-mono` eliminado; 11 colores repetidos en al menos tres CSS promocionados a tokens; los valores que ya tenían token (`#fff`, `#e0daef`, `#4a4458`, `#8f1d2c`, `#00000014`, `#f5f2fb`) se sustituyeron por sus variables. Quedan 47 tokens; `--canvas` se mantiene porque lo usan las reglas base. No había reglas de un solo componente dentro de `globals`.
- **Criterios de aceptación:** `globals` contiene solo base, tokens y reglas compartidas; cada feature conserva sus especificidades; CSS y smoke visual correctos.
- **Estado:** Completada · 2026-11-14

### Fase 2: Check de instalación sin Lottie

- [x] Caracterizar el estado de éxito de Aula Store antes de cambiarlo.
- [x] Sustituir `lottie-react` y `check-lottie.json` por un check SVG/CSS.
- [x] Eliminar la dependencia, el JSON y el chunk diferido.
- [x] Conservar la aparición/desaparición y el respeto a movimiento reducido.
- [x] Añadir o actualizar el test del estado de éxito.
- **Resultado:** nuevo `store-check.tsx` con SVG y trazo CSS; `store-lottie`, `check-lottie.json` y `lottie-react` eliminados. El overlay sigue usando Motion y el check respeta `prefers-reduced-motion`. El build ya no incluye ningún chunk de Lottie.
- **Criterios de aceptación:** la instalación sigue mostrando el check; no se carga `lottie-react`; el build no incluye su chunk.
- **Estado:** Completada · 2026-11-14

### Fase 3: Fuentes, verificación y cierre

- [ ] Medir el coste y el comportamiento actual de las fuentes de Google.
- [ ] Decidir entre mantenerlas o servirlas desde el Site, documentando la razón.
- [ ] Ejecutar lint, tipos, tests, build y recorrido visual de tienda, tablero y documentación.
- [ ] Actualizar el changelog y reiniciar el roadmap.
- **Criterios de aceptación:** decisión de fuentes documentada, sin regresiones visuales y checks en verde.
- **Estado:** Pendiente

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Retirar un token que sí se usa | Cambios visuales o estilos rotos | Auditar usos y comparar capturas antes/después |
| Promocionar demasiado a `globals` | Se vuelve un cajón de sastre | Promocionar solo repeticiones reales entre componentes |
| Cambiar la animación de éxito | Pérdida de feedback al instalar | Mantener la misma secuencia y probar movimiento reducido |
| Autohospedar fuentes sin medición | Más peso o peor caché | Medir antes de decidir; no añadir dependencias nuevas |
| Mezclar rendimiento y rediseño | Difícil revisar el cambio | Mantener el alcance de acabado, sin rediseño |

## 6. Notas de sesión

- 2026-11-14: última entrada extraída del backlog. Revisión previa: `docs.css`, `space.css` y `store.css` ya son lazy; `layout.tsx` solo importa `globals.css` y los compartidos `buttons.css`, `access.css` y `dialogs.css`. Auditoría inicial: 37 tokens, `--font-mono` sin usos externos. Roadmap preparado; **ninguna fase iniciada**.
- 2026-11-14: fase 1 completada. Se retiró `--font-mono`, se promocionaron 11 colores repetidos y se sustituyeron los valores que ya tenían token. Quedan 47 tokens; no se movió ninguna regla compartida a una vista lazy. Tests 38/162; lint, tipos, build y smoke de tablero, tienda y documentación correctos. Siguiente: fase 2.
- 2026-11-14: fase 2 completada. Check de Aula Store migrado a SVG/CSS; `lottie-react`, `check-lottie.json` y su chunk eliminados. Tests 39/164 y build correctos; smoke normal y con movimiento reducido correcto. Siguiente: fase 3.
