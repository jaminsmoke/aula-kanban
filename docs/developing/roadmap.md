# Roadmap APP-02 · Separar Herramientas de aula en Calculadora y Tabla periódica

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** APP-02 — Separar `edu-tools` en dos aplicaciones independientes, Calculadora y Tabla periódica, y retirar Medir y Lectura.
> **Backlog:** APP-03 (seguimiento: carpetas e iconos de mochila/maletín; usa los identificadores nuevos de este roadmap).
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Que Calculadora y Tabla periódica sean aplicaciones independientes de Aula Store, con instalación por app, y que Medir y Lectura desaparezcan del producto y del código.
- [ ] Criterio de éxito: la Tienda ofrece cinco apps; cada una se instala y desinstala sin la otra; `consultar_elemento` sigue funcionando con la tabla instalada; `edu-tools` no queda en el catálogo, las dependencias ni los datos; instalaciones y preferencias personales se migran sin pérdida.

## 2. Alcance

**Dentro:**
- Retirar Medir y Lectura: vistas, conmutador, lector de voz, estilos, pruebas y referencias en la ayuda y la documentación.
- Eliminar `@smst/edu-tools` (estilos, regla y transportador), sus tipos y su entrada en `vitest`; la calculadora conserva `@cortex-js/compute-engine`.
- Nuevas apps `calculadora` y `tabla-periodica`, con ficha, portada, icono, ventana y carga diferida propias; ambas en «Mejores aplicaciones».
- `consultar_elemento` pasa a exigir `tabla-periodica`; la calculadora declara su superficie MCP como pendiente.
- Migración local `0039` de `instance_apps` y `app_preferences`, alias de enlaces y de `abrir_app`, y pruebas de idempotencia.
- Actualización de ayuda, `aplicaciones-nativas.md`, `matriz-herramientas.md`, README, snapshot del catálogo, pruebas y presupuesto de rendimiento.

**Fuera de alcance:**
- Reescribir la calculadora o la tabla periódica por dentro; las ecuaciones siguen dentro de la calculadora.
- Cambiar la instalación de instancia a instalación por proyecto, ni los permisos de instalación.
- Sustituir Medir o Lectura por otras herramientas.
- Carpetas e iconos de mochila/maletín (APP-03), que solo actualiza sus ids.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Dos apps independientes** (`calculadora`, `tabla-periodica`) | Una app con dos pestañas | Es el reparto pedido: cada herramienta se instala y se abre por separado. |
| **Borrado definitivo** de Medir y Lectura | Pestañas deshabilitadas o «Próximamente» | No guardan datos y no se quieren; no dejar superficie que aparente una función inexistente. |
| **Sin `@smst/edu-tools`** | Mantener el paquete por Medir | Al retirar Medir solo quedaban imports de estilos y de regla/transportador; se elimina una dependencia de ~2,3 MB. |
| Etiqueta **«Tabla periódica»** e id `tabla-periodica` | «Ciencias» o «Elementos periódicos» | Es el término escolar estándar en español y deja una URL clara. |
| Instalación **por app**, ámbito de instancia | Instalación conjunta de las dos | Permite decidir cada herramienta por separado sin tocar la regla de permisos. |
| `upstream` **opcional** para integración propia | Declarar `@smst/edu-tools` en la tabla | El código y los datos de la tabla son locales; no atribuir un paquete que ya no se usa. |
| Alias `edu-tools` → `calculadora` durante un ciclo | Romper enlaces y clientes MCP | Conserva `?app=edu-tools` y `abrir_app`; la tabla se consulta con su id nuevo. |
| Migración `0039` **idempotente** | Migrar solo la instalación | Hay que preservar también favoritos y orden personales de APP-03. |

## 4. Fases

### Fase 1: Recorte de Medir, Lectura y la dependencia — completada
- [x] Retirar las vistas Medir y Lectura del shell, `measure-tools`, `use-measure-tools`, `edu-tts` y sus estilos y pruebas; los atajos quedan para las dos vistas restantes.
- [x] Quitar `@smst/edu-tools` del `package.json`, el import de estilos, `types/edu-tools.d.ts`, la entrada `inline` de `vitest` y cualquier referencia en scripts.
- [x] Actualizar la ayuda y la documentación que describen cuatro pestañas.
- **Criterios de aceptación:** calculadora y tabla funcionan igual; no quedan referencias a Medir, Lectura ni `ruler`/`protractor`; suite, `tsc`, ESLint y build en verde; `package-lock.json` sin `@smst/edu-tools`.

**Implementado (2026-11-16):** el shell queda con dos pestañas, Calculadora y Tabla periódica, con atajos Alt+1 y Alt+2. Se eliminan `measure-tools.tsx`, `use-measure-tools.ts`, `edu-tts.tsx`, `types/edu-tools.d.ts` y sus reglas CSS y pruebas. `@smst/edu-tools` sale de `package.json`, del lock (180 paquetes menos), del import de estilos, de `vitest` y de la documentación; la calculadora conserva `@cortex-js/compute-engine` como upstream. La ayuda, la matriz, MCP y la ficha de la app describen solo las dos vistas. Verificación: 18 pruebas focales, `tsc` y ESLint en verde; suite completa y build en la verificación final de la fase.

### Fase 2: Dos aplicaciones en el catálogo
- [ ] Añadir `calculadora` y `tabla-periodica` a `NATIVE_APP_IDS` con ficha, categorías, subcategoría, ventana y versión `1.0.0`; `upstream` opcional para la tabla (integración propia).
- [ ] Crear portadas en `public/store/` e iconos en el registro; ambas entran en `FEATURED_APP_IDS`.
- [ ] Mover el código a carpetas propias (`apps/calculadora/`, `apps/tabla-periodica/`) y registrar sus componentes lazy.
- [ ] Declarar la superficie MCP: `consultar_elemento` en `tabla-periodica` y la calculadora con motivo `pendiente`; subir el catálogo a `0.28.0`, actualizar snapshot, matriz y paridad.
- **Criterios de aceptación:** la Tienda lista cinco apps; cada una abre en su ventana; la ficha de la tabla no atribuye un paquete que no usa; las pruebas de catálogo, registro y MCP están en verde.

### Fase 3: Migración y compatibilidad
- [ ] Migración local `0039`: si `edu-tools` estaba instalada, insertar `calculadora` y `tabla-periodica` instaladas; si no, ninguna; conservar versión y limpiar la fila vieja.
- [ ] Copiar las filas de `app_preferences` de `edu-tools` a los dos ids nuevos, conservando favorito y posición, y retirar las antiguas.
- [ ] Alias `edu-tools` → `calculadora` en la URL de Tienda y en `abrir_app`; `consultar_elemento` exige `tabla-periodica` instalada.
- [ ] Pruebas de migración con instalada/no instalada, con y sin preferencias, y ejecución repetida; actualizar la dependencia de APP-03 en el backlog.
- **Criterios de aceptación:** no se pierde ninguna instalación ni preferencia; una app desinstalada no reaparece; la migración se puede ejecutar dos veces sin duplicar filas; el enlace antiguo abre la calculadora.

### Fase 4: Verificación y cierre
- [ ] Suite completa, `tsc`, ESLint, build y `perf:budget` en verde; revisión en navegador a 1366 y 390 px, en claro y oscuro.
- [ ] Comprobar Tienda con cinco apps, instalación y desinstalación independientes, apertura de las dos y alias `app=edu-tools`.
- [ ] Ayuda y documentación actualizadas; resumen arriba de `changelog.md`, roadmap archivado y reiniciado, y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites ni cambiar la versión del Site.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Se pierde Lectura (texto a voz) y Medir | Regresión funcional y de accesibilidad | Decisión de producto tomada; no hay datos que migrar y el código queda recuperable en git. |
| La migración duplica instalaciones o preferencias | Datos incoherentes o apps que reaparecen | Migración idempotente y pruebas con los cuatro casos, incluida la ejecución repetida. |
| El alias no cubre sockets, ventanas o MCP | Enlaces y clientes antiguos rotos | Resolver `edu-tools` en la URL, el escritorio y `abrir_app`, con pruebas de contrato. |
| Al quitar los estilos del paquete cambia el aspecto | Calculadora o tabla con estilos roto | El CSS propio ya define `.calc-*` y `.pt-*`; revisión visual de ambas apps en los dos temas. |
| El cambio de ids afecta a APP-03 | Favoritos y orden perdidos | Copiar preferencias en la migración y anotar los ids nuevos en el backlog. |
| Cambia el contrato MCP de apps | Catálogo y clientes desalineados | Subir la versión del catálogo, actualizar snapshot, matriz y paridad en la misma fase. |

## 6. Notas de sesión

- 2026-11-16: el usuario decide separar EduTools en Calculadora y Tabla periódica y retirar Medir y Lectura; APP-02 sale del backlog y pasa a roadmap activo. Se confirman el nombre «Tabla periódica», el borrado definitivo de las dos herramientas y el alias temporal de `edu-tools`.
