# Roadmap PROMO-03 · Proyecto de demo versionado y capturas nuevas

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PROMO-03 — el proyecto de demostración que usan la ayuda y las capturas debe poder recrearse desde el repositorio, con datos ficticios y el aspecto actual.
> **Dependencias:** PROMO-02 completada (portada pública). PROMO-05 usará este proyecto, pero no entra aquí.
> **Backlog:** PROMO-01 pausado y PROMO-04..06 pendientes de debate.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Versionar una semilla idempotente del proyecto de demostración y rehacer las cuatro capturas de la ayuda con la interfaz actual.
- [ ] Criterio de éxito: desde una D1 local limpia, un comando reproducible crea el proyecto con 6 alumnos, 2 profesores, 8 tareas, las cinco apps, una pizarra, un diagrama y un programa de bloques; una segunda ejecución no duplica datos; las capturas son actuales, ficticias y sin tokens.

## 2. Alcance

**Dentro:**
- Script versionado `scripts/seed-demo.mjs`, con un identificador de proyecto fijo y distinto del proyecto de rendimiento.
- Datos ficticios y deterministas: proyecto de demostración, 6 alumnos, 2 profesores, 8 tareas repartidas en las cuatro columnas (25 % completado), cinco apps instaladas, una pizarra, un diagrama y un programa de bloques con contenido.
- Modo `--dry-run` y guarda de origen local: el script no debe poder apuntar a una D1 o URL remota.
- Uso de la API local para las entidades que ya tienen ruta; como `scripts/perf-latency.mjs`, las cabeceras de desarrollo identifican la sesión. La D1 local solo se usa para el estado de `instance_apps` si no existe una ruta HTTP equivalente.
- Capturas nuevas `public/capturas/{tareas,calendario,ajustes,espacio}.webp`: 1200 px, WebP, Chrome headless a 1440×950, con la cabecera actual y Ajustes recortado a Cuenta.
- Actualización de `alt`, pies y referencias en `app/board/docs/content/{tasks,people,workspace}.ts`; `app/board/docs/content-coverage.test.ts` sigue cubriendo la ayuda.
- Documentar el comando de siembra y advertir de que no se ejecuta contra producción.

**Fuera de alcance:**
- Sembrar la D1 remota o publicar en Sites; cualquier siembra en producción la autoriza y ejecuta Codex.
- El modo demo sin cuenta (PROMO-05), las páginas legales (PROMO-04), el vídeo completo y el rendimiento de la calculadora (PROMO-06).
- Cambiar el modelo de datos, los permisos o las pantallas del producto para acomodar la demo.
- Borrar o modificar otros proyectos de la D1 local.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Script Node idempotente con IDs fijos y upsert** | Volver a sembrar a mano por la API | La demo debe poder recrearse tras limpiar la D1 local y repetirse sin duplicados. |
| **API local para proyecto, personas, tareas y documentos** | Insertar todo con SQL directo | Ejercita las validaciones y permisos reales y evita acoplarse al esquema interno. |
| **D1 local solo para `instance_apps` si no hay ruta HTTP** | Instalar apps a mano desde Aula Store | Mantiene reproducible el estado de las cinco apps sin inventar endpoints. |
| **Guarda dura de origen local** | Script configurable con `--url` libre | Evita que una ejecución accidental escriba en producción o en otra instancia. |
| **Fechas relativas al mes de ejecución** | Fechas fijas de noviembre de 2026 | El calendario de la demo debe seguir siendo legible cuando se repita la siembra. |
| **Capturas con Chrome headless y cabeceras de desarrollo** | Capturas manuales sin guion | Permite repetir el mismo viewport, revisar el resultado y no depender de una sesión personal. |
| **Perfil temporal del navegador fuera del repo** | Perfil dentro de `.freebuff/` | Evita que el watcher de Vite se bloquee con archivos de Chrome en Windows. |

## 4. Fases

### Fase 1: Semilla versionada e idempotente — pendiente
- [ ] Crear `scripts/seed-demo.mjs` con `--dry-run`, `--base-url` limitado a `localhost`/`127.0.0.1`, proyecto de demo fijo y cabeceras de sesión local.
- [ ] Definir los datos ficticios y los upserts: proyecto, 6 alumnos, 2 profesores, 8 tareas en cuatro columnas, 5 apps, 1 pizarra, 1 diagrama y 1 programa de bloques.
- [ ] Sembrar desde una D1 local limpia, ejecutar dos veces y comprobar que los recuentos no cambian; documentar el comando.
- **Criterios de aceptación:** el dry-run muestra el plan sin escribir; la primera ejecución crea exactamente los datos previstos; la segunda no duplica ni pisa datos ajenos; cualquier URL remota se rechaza antes de abrir una conexión.

### Fase 2: Capturas actuales y textos — pendiente
- [ ] Capturar las cuatro vistas del proyecto de demo a 1200 px y WebP, con la cabecera actual, el escritorio de apps y sin datos reales ni tokens.
- [ ] Recortar Ajustes a Cuenta, revisar el contraste del calendario y comprobar que las cinco apps aparecen instaladas.
- [ ] Actualizar `alt`, pies y referencias en la ayuda; revisar las cuatro imágenes a tamaño completo y a 600 px de ancho.
- **Criterios de aceptación:** las cuatro rutas de `public/capturas/` responden y pesan menos de 50 KB; las capturas coinciden con la UI servida; la ayuda no menciona una app, cabecera o fecha que ya no aparezca; `content-coverage.test.ts` pasa.

### Fase 3: Verificación y cierre — pendiente
- [ ] Ejecutar la siembra desde una D1 local limpia y repetirla; comprobar el proyecto con la app servida en local, sin tocar Sites.
- [ ] Pasar suite completa, `tsc`, ESLint, build y `perf:budget`; revisar 1366, 1024 y 390 px de la ayuda con las capturas nuevas.
- [ ] Actualizar README y ayuda, añadir el resumen al changelog y archivar este roadmap.
- **Criterios de aceptación:** la demo se reconstruye con un solo comando, las capturas y sus textos son coherentes, no hay regresiones ni escrituras remotas, y el roadmap se cierra solo con todas las fases verificadas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La D1 local ya contiene un proyecto con el mismo ID | Datos duplicados o mezclados | Upsert por ID fijo, `--dry-run` y comprobación de recuentos antes de escribir. |
| El script apunta a producción por error | Datos ficticios en una instancia real | Rechazo de orígenes no locales y ausencia de credenciales remotas. |
| Nombres, correos o tokens reales en una captura | Fuga de datos personales | Datos ficticios, Ajustes recortado a Cuenta y revisión visual antes de guardar. |
| El mes de la demo queda fuera de la captura | Calendario vacío o incoherente | Fechas relativas al mes de ejecución y capturas inmediatamente después de sembrar. |
| El perfil de Chrome bloquea el watcher de Vite | El servidor local deja de responder | Perfil en el directorio temporal del sistema y cierre del navegador antes de copiar capturas. |
| La UI cambia y las capturas envejecen | La ayuda muestra una cabecera o app antigua | Repetir la captura en la misma fase que la siembra y revisar las cuatro imágenes. |
| El script toca apps de instancia de otros proyectos | Cambios fuera del alcance | Limitar `instance_apps` al estado de las apps de la demo y no alterar proyectos ajenos. |

## 6. Notas de sesión

- 2026-11-16: PROMO-03 sale del grupo PROMO-03..06 del backlog y pasa a ser el roadmap activo; PROMO-04..06 permanecen pendientes de debate.
- 2026-11-16: la entrada original describe una demo sembrada a mano en la D1 local, sin script versionado y con capturas antiguas; esta fase convierte esa base en una semilla reproducible.
- 2026-11-16: el servidor de desarrollo está en `http://localhost:5173`; no se publica ni se modifica la versión `1.1.32`.
