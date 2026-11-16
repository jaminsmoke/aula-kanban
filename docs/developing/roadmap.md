# Roadmap PERM-02 · Secciones de permisos en Ajustes y Administración

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PERM-02 — Faltan las superficies de permisos: una sección «Permisos» en el sidebar de Ajustes (instancia) y una pestaña «Permisos» junto a Miembros y Herramientas en Administración > Profesores y en Administración > Alumnos (proyecto).
> **Backlog:** APP-03 (seguimiento: carpetas e iconos de mochila/maletín) y APP-02 (aparcada).
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Que la matriz PERM-01 sea visible en la aplicación: sección «Permisos» en Ajustes (ámbito de instancia) y pestaña «Permisos» en Profesores y Alumnos (ámbito de proyecto), generadas desde la misma fuente que evalúa el servidor.
- [ ] Criterio de éxito: ambas superficies existen en su sitio, respetan la visibilidad por rol y muestran la matriz efectiva (quién puede qué y con qué rol), sin contradecir lo que el servidor aplica.

## 2. Alcance

**Dentro:**
- Fuente única de la matriz en `lib/domain/` (capacidades, ámbito, descripción y roles que las poseen), consumida por `lib/server/capabilities.ts` y por la interfaz.
- Sección `permisos` en `SettingsSection` y `SETTINGS_SECTIONS`, con entrada en el sidebar de Ajustes y control de acceso igual que Administradores/Almacenamiento.
- Tercera pestaña `permisos` en las vistas de Profesores y Alumnos, con la misma visibilidad que hoy tiene «Herramientas».
- Matriz de instancia (capacidades globales y quién las posee) y matriz de proyecto (rol × capacidad) con el rol efectivo de cada miembro.
- Apoyo en `obtener_enlace` del MCP y actualización de snapshot, ayuda y `docs/Store/matriz-permisos.md`.

**Fuera de alcance:**
- Concesiones individuales editables (requieren tabla nueva de concesiones; sin ella un control no persistiría).
- Cambiar quién puede qué: el comportamiento autoritativo de PERM-01 no se modifica.
- Carpetas e iconos de mochila/maletín (APP-03) y extracción de EduTools (APP-02).
- URLs para las pestañas de personas: se mantiene el estado local que ya usa «Herramientas».

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Fuente única** de la matriz en `lib/domain/permisos.ts`, usada por servidor y UI | Duplicar la tabla en la interfaz | En la revisión de PERM-01 la tabla y el código se desalinearon; una sola fuente lo impide. |
| Superficies de **solo lectura** | Formulario de concesiones | No existe almacenamiento de concesiones: un control que no persiste sería mentira. |
| Pestaña «Permisos» **junto a Herramientas**, con su misma visibilidad | Sección nueva aparte en Administración | Coherente con STORE-04 y sin duplicar navegación. |
| Ajustes > Permisos **solo owner/admin** | Visible en lectura para todos | Trata capacidades globales (incluidas fichas de administrador); mismo criterio que Administradores y Almacenamiento. |
| Pestañas de personas **sin URL** (estado local) | Añadir `tab` a la URL | Paridad con la pestaña «Herramientas» actual; se puede promover más adelante si hace falta enlazar. |
| Matriz de proyecto con **rol efectivo** del miembro | Listado genérico de roles | Responde a la pregunta real («¿qué puede esta persona aquí?») sin inventar datos. |

## 4. Fases

### Fase 1: Fuente única de la matriz
- [ ] Crear `lib/domain/permisos.ts` con capacidades, ámbito, descripción y roles que las poseen (incluidas las que hoy solo viven en `project-access.ts`/`members.ts`).
- [ ] `lib/server/capabilities.ts` evalúa desde esa fuente sin cambiar la semántica actual.
- **Criterios de aceptación:** una sola definición de la matriz; `capabilities.test.ts` y la suite MCP siguen verdes sin tocar aserciones.

### Fase 2: Ajustes > Permisos (instancia)
- [ ] Añadir `permisos` a `SettingsSection`, `SETTINGS_SECTIONS` y al sidebar de `SettingsView` (mismo patrón `restricted` + corrección de URL con `replaceState`).
- [ ] Panel de instancia: capacidades globales, quién las posee (dueño y administradores) y enlace a Administradores.
- **Criterios de aceptación:** `?view=ajustes&section=permisos` abre la sección; una cuenta sin rol global no la ve y su URL se corrige; `obtener_enlace` la acepta con snapshot actualizado.

### Fase 3: Pestaña Permisos en Profesores y Alumnos
- [ ] Tercera pestaña `miembros | herramientas | permisos` en ambas vistas, con la visibilidad que hoy tiene «Herramientas» (`canManage`/`canTools`).
- [ ] Panel de proyecto: matriz rol × capacidad (profesor, alumno, invitado) y rol efectivo de los miembros del proyecto.
- **Criterios de aceptación:** las tres pestañas conviven con `aria-current` correcto; no hay controles que no persistan.

### Fase 4: Verificación y cierre
- [ ] Suite completa, `tsc`, ESLint y build en verde; revisión en navegador local a 1366 y 390 px, en claro y oscuro.
- [ ] Ayuda y `docs/Store/matriz-permisos.md` actualizados con las nuevas superficies; resumen arriba de `changelog.md`, roadmap archivado y reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La UI muestra una matriz que el servidor no aplica | Documentación engañosa | La matriz se genera desde la misma fuente que evalúa `capabilities.ts`; pruebas que comparan ambas. |
| Las pestañas parecen un vacío sin datos | Sensación de función a medias | Enseñan el rol efectivo real de los miembros y el enlace a la matriz; nada simulado. |
| Añadir `permisos` a `SETTINGS_SECTIONS` toca enlaces MCP y snapshots | Enlaces rotos o tests en rojo | Actualizar `enlaces.ts`, snapshot del catálogo y ayuda; los valores inválidos ya caen al defecto. |
| Dos sitios con la misma tabla divergen con el tiempo | Inconsistencia entre instancia y proyecto | Ambas superficies renderizan el mismo componente de matriz con distinto ámbito. |

## 6. Notas de sesión

- 2026-11-16: el usuario detectó que la Fase 3 de PERM-01 había descartado expresamente las superficies de permisos; esa decisión queda revertida y el trabajo se abre como roadmap PERM-02. La planificación se hace aquí en lugar de duplicarla en el backlog (regla de flujo: lo que entra en el roadmap sale del backlog).
