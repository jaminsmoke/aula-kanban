# Roadmap APP-03B · Carpetas e iconos propios en mochila y maletín

> **Estado:** Completado
> **Inicio:** 2026-11-16
> **Entrada:** APP-03 (seguimiento) — la mochila del alumnado y el maletín docente necesitan organización interna: carpetas, iconos propios y una presentación que distinga ambos espacios, sin tienda ni instalación.
> **Backlog:** Sin entradas pendientes; las nuevas se debatirán después de este roadmap.
> **Changelog:** [`../developing/changelog.md`](../developing/changelog.md)

---

## 1. Objetivo

- [x] Que alumnado y profesorado puedan organizar sus herramientas instaladas en carpetas propias, conservadas por usuario y proyecto, y abrir cada carpeta como una ventana del escritorio personal.
- [x] Criterio de éxito: la mochila y el maletín mantienen sus iconos y títulos diferenciados, agrupan apps en carpetas sin perder favoritos ni orden, y no muestran tienda, instalación ni apps no instaladas.

## 2. Alcance

**Dentro:**
- `folder` opcional en `app_preferences`, con migración local y validación en la API.
- Organizador sencillo: asignar cada app instalada a una carpeta por nombre o dejarla suelta; guardar y releer.
- Iconos de carpeta y ventana de contenido en el escritorio personal, con una carpeta por nombre y sin carpetas vacías.
- La mochila y el maletín conservan sus iconos y títulos propios; la carpeta «Libros» sigue siendo independiente.
- Pruebas de modelo, API, agrupación y organizador; documentación y verificación visual.

**Fuera de alcance:**
- Arrastrar y soltar apps entre carpetas, carpetas anidadas o carpetas vacías.
- Carpetas comunes por rol o configuración editorial de qué apps entran: la organización es personal.
- Cambiar la instalación de instancia, los permisos de APP-01 o la carpeta «Libros» de STORE-04.
- Nuevas herramientas MCP o cambios en el catálogo de apps.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Etiqueta `folder` en `app_preferences`** | Tabla de carpetas con miembros | Una app pertenece a una carpeta como máximo; evita una entidad vacía y conserva el modelo actual por usuario+proyecto. |
| **Organizador con nombre de carpeta** | Arrastrar y soltar | Es accesible, funciona en ventanas estrechas y permite crear una carpeta escribiendo su nombre. |
| **Carpeta = ventana con sus apps** | Carpetas anidadas en el propio escritorio | Reutiliza `StoreWindow` y el patrón de la carpeta «Libros»; mantiene los iconos del escritorio simples. |
| **Sin carpetas vacías** | Carpetas persistentes sin miembros | La carpeta existe mientras tenga apps; al vaciarla desaparece sin dejar filas huérfanas. |
| **Iconos diferenciados por espacio** | Iconos distintos por app | La mochila usa `Backpack` y el maletín `Briefcase`; las carpetas usan un icono propio y las apps conservan el icono del catálogo. |

## 4. Fases

### Fase 1: Modelo, migración y API — completada
- [x] Añadir `folder` a `app_preferences`, generar la migración local y actualizar el snapshot de Drizzle.
- [x] Extender `PersonalAppPreference`, `applyPreferences`, `listPersonalApps`, `setPersonalApps` y `parsePersonalItems`.
- [x] Validar nombres de carpeta (texto recortado, máximo 40 caracteres) y conservar compatibilidad con clientes que no envían `folder`.
- **Criterios de aceptación:** una preferencia guarda y recupera su carpeta; una app sin carpeta sigue igual; ids, favoritos y posiciones no cambian.

**Implementado (2026-11-16):** `drizzle/0040_personal_folders.sql` añade `folder text` a `app_preferences`, con snapshot y journal actualizados. El modelo devuelve `folder: null` cuando no hay carpeta; el parseo recorta, colapsa espacios, rechaza tipos no textuales y nombres de más de 40 caracteres, y guarda `null` para vacío o ausente. Las pruebas cubren persistencia, normalización, compatibilidad y errores de validación.

### Fase 2: Escritorio personal y organizador — completada
- [x] Agrupar el escritorio por carpeta, abrir cada carpeta en una ventana y mantener la carpeta «Libros» independiente.
- [x] Añadir el organizador con un campo de carpeta por app y guardado mediante `PUT /api/personal-apps`.
- [x] Diferenciar mochila y maletín con sus iconos y títulos actuales; evitar tienda e instalación.
- **Criterios de aceptación:** las carpetas aparecen en orden personal, se abren y sus apps abren ventanas; el organizador persiste y permite vaciar una carpeta.

**Implementado (2026-11-16):** `PersonalSpaceView` agrupa por `folder` conservando el orden personal, sitúa la carpeta donde estaba su primera app y muestra un icono `Folder` propio. Cada carpeta abre una ventana con sus apps; al vaciarla desaparece y su ventana se filtra. El organizador abre una ventana con un campo por app, guarda el borrador completo por `PUT` y no se pisa con el refresco periódico. Las ventanas personalizadas respetan `tool.window` (carpeta 520×320, organizador 560×480); «Libros» sigue separada. Pruebas de agrupación, apertura y guardado añadidas.

### Fase 3: Verificación y cierre — completada
- [x] Suite completa, `tsc`, ESLint, build y `perf:budget` en verde; revisión visual a 1366 y 390 px en claro y oscuro.
- [x] Actualizar ayuda, documentación, changelog y archivar este roadmap.
- **Criterios de aceptación:** sin regresiones en ventanas, dock, Libros ni API personal; roadmap cerrado y resumen arriba del changelog.

**Implementado (2026-11-16):** suite de **142 archivos / 1.106 pruebas**, `tsc`, ESLint, build y `perf:budget` correctos. Migración `0040` aplicada en local; guardado, relectura y agrupación comprobados con la API real. Revisión a 1366×900 y 390×844 en claro y oscuro: carpeta en el escritorio, ventana con sus apps y organizador sin desbordamiento horizontal ni excepciones de consola. Sin publicación en Sites y sin cambio de versión del Site (`1.1.32`).

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Nombres de carpeta duplicados o con espacios raros | Carpetas inconsistentes | Normalizar a texto recortado, máximo 40 caracteres y comparación exacta tras normalizar. |
| Guardar una selección sin `folder` borra carpetas existentes | Pérdida de organización | La API devuelve y la interfaz envía siempre la carpeta actual; los clientes antiguos conservan el comportamiento anterior. |
| Una ventana de carpeta queda abierta al vaciarla | Ventana fantasma | Filtrar las ventanas por las carpetas vigentes, como ya se hace con los libros deshabilitados. |
| El organizador compite con el refresco de 10 s | Cambios perdidos mientras se edita | Mantener un borrador local y reiniciarlo solo tras guardar o al abrir el organizador. |

## 6. Notas de sesión

- 2026-11-16: APP-03B sale del backlog como único pendiente y se abre con carpetas personales por usuario+proyecto. Se descarta arrastrar y soltar en esta iteración.
- 2026-11-16: el primer guardado desde el navegador de revisión falló por el `Origin` del proxy local, no por la aplicación; la prueba directa contra la API autenticada confirmó el guardado y la relectura.
- 2026-11-16: la revisión visual detectó filas del organizador estiradas por la rejilla y ventanas personalizadas con el tamaño por defecto; se corrigieron `grid-auto-rows` y el uso de `tool.window`.
