# Roadmap — PROMO-07B y PROMO-01 · Demo y vista previa social

> **Estado:** Archivado al limpiar la plantilla · 2026-11-16
> **Nota:** PROMO-07B quedó verificado en producción; la validación externa de la vista previa social vuelve al backlog como PROMO-01 pausado.

## Objetivo

Preparar la demo sin modificar proyectos o instalaciones ajenos y verificar la vista previa social publicada.

## Fases

### 1. Seguridad de los datos de demo
- [x] Evitar colisiones de identificadores entre demo y proyectos ajenos; probar que falla sin cambios.
- [x] Comprobar el generador en una base con datos ajenos y ejecución repetida, incluido el esquema real de las 41 migraciones.

### 2. Demo en producción
- [x] Preparar una vía admitida para crear los datos ficticios mediante un lote atómico de D1, exclusivamente para el propietario autenticado.
- [x] Verificar acceso anónimo, solo lectura y aislamiento respecto al proyecto real; comprobar que la operación no modifica instalaciones globales.

### 3. Vista previa social
- [x] Comprobar acceso público y metadatos de producción; revisar los validadores externos disponibles sin cambiar permisos del Site.
- [ ] Registrar resultados y dejar expresamente pendientes los servicios inaccesibles.

### Avance del 16 de noviembre

- El SQL ahora comprueba colisiones de proyecto, fichas, tareas, asignaciones y pizarra antes de escribir. El ejecutor debe abortar y ejecutar `ROLLBACK` ante cualquier error; no continuar con el script.
- La petición anónima desde el ordenador devuelve **200** para `/`, `/documentacion` y la imagen social PNG; incluye las etiquetas Open Graph y Twitter. El 403 observado previamente no se reprodujo desde esta red.
- LinkedIn Post Inspector y Facebook Sharing Debugger exigen iniciar sesión; no se han validado sus vistas previas. El validador de X devolvió 403 desde la herramienta web y WhatsApp queda pendiente de una comprobación sin enviar mensajes a terceros.
- Publicada la versión **1.1.34** y ejecutada la preparación de la demo por la propietaria. La demo anónima devuelve 8 tareas, 6 alumnos y 2 profesores; rechaza crear tareas y preparar la demo (403), así como acceder al proyecto real (403). Sigue existiendo Curso IA Gestorex y `instance_apps` permanece vacía. Las apps de demo dependen de las instalaciones existentes, que no se modificaron.
- El conector de Sites permite inspeccionar D1, pero no escribir datos. La operación de la aplicación está restringida al propietario y ejecuta las sentencias fijas en un único lote D1. No recibe SQL externo y no instala apps de la instancia.

## Contexto heredado

## 2026-11-16 — PROMO-07B · Activar y verificar la demo en producción

- Publicada la versión 1.1.33 con el enlace oculto cuando faltan datos; el proyecto demo aún no existe en la base publicada. El conector de Sites disponible permite leer la base, pero no aplicar el SQL de datos.
- Revisar una vía admitida y autorizada para sembrar la demo sin modificar instalaciones globales ni proyectos existentes. Antes de ejecutar el SQL generado, resolver posibles colisiones de ids: los `ON CONFLICT` de alumnos, profesores y tareas actualizan campos sin comprobar el proyecto de la fila existente. Comprobar y fallar sin cambios ante cualquier colisión ajena; probarlo.
- Verificar el acceso anónimo real y el modo de solo lectura. La petición HTTP directa sin sesión desde este entorno devolvió 403 de Sites para portada, demo y páginas legales, por lo que el acceso público no quedó verificado. No cambiar permisos del Site sin instrucción del usuario.
- Tras sembrar y verificar, confirmar la aparición del enlace de demo y registrar los resultados.

## 2026-11-16 — PROMO-01 · Cierre externo de la vista previa en redes (pausado)

- Contexto: las fases 1 y 2 están completas y la fase 3 se verificó en local: 144 archivos / 1.112 pruebas, `tsc`, ESLint, build, `perf:budget`, HTML de `/` y `/documentacion` e imagen social correctos.
- Falta antes de retomarlo: publicar una versión que incluya los metadatos, pasar LinkedIn Post Inspector, Facebook Sharing Debugger, X Card Validator y WhatsApp, y entonces añadir el changelog y archivar el plan.
- Notas: producción está en `1.1.33`; la verificación pública de la imagen social sigue pendiente (la petición anónima directa devolvió 403 de Sites); commits `ad73cf2`, `c7338cf` y `2f7e242`. El plan completo se conserva en [`historial/roadmap-promo-01.md`](../historial/roadmap-promo-01.md).
