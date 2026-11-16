# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Demo de producción pendiente; PROMO-01 pausado

---

## 2026-11-16 — PROMO-07B · Activar y verificar la demo en producción

- Publicada la versión 1.1.33 con el enlace oculto cuando faltan datos; el proyecto demo aún no existe en la base publicada. El conector de Sites disponible permite leer la base, pero no aplicar el SQL de datos.
- Revisar una vía admitida y autorizada para sembrar la demo sin modificar instalaciones globales ni proyectos existentes. Antes de ejecutar el SQL generado, resolver posibles colisiones de ids: los `ON CONFLICT` de alumnos, profesores y tareas actualizan campos sin comprobar el proyecto de la fila existente. Comprobar y fallar sin cambios ante cualquier colisión ajena; probarlo.
- Verificar el acceso anónimo real y el modo de solo lectura. La petición HTTP directa sin sesión desde este entorno devolvió 403 de Sites para portada, demo y páginas legales, por lo que el acceso público no quedó verificado. No cambiar permisos del Site sin instrucción del usuario.
- Tras sembrar y verificar, confirmar la aparición del enlace de demo y registrar los resultados.

## 2026-11-16 — PROMO-01 · Cierre externo de la vista previa en redes (pausado)

- Contexto: las fases 1 y 2 están completas y la fase 3 se verificó en local: 144 archivos / 1.112 pruebas, `tsc`, ESLint, build, `perf:budget`, HTML de `/` y `/documentacion` e imagen social correctos.
- Falta antes de retomarlo: publicar una versión que incluya los metadatos, pasar LinkedIn Post Inspector, Facebook Sharing Debugger, X Card Validator y WhatsApp, y entonces añadir el changelog y archivar el plan.
- Notas: producción está en `1.1.33`; la verificación pública de la imagen social sigue pendiente (la petición anónima directa devolvió 403 de Sites); commits `ad73cf2`, `c7338cf` y `2f7e242`. El plan completo se conserva en [`historial/roadmap-promo-01.md`](../historial/roadmap-promo-01.md).
