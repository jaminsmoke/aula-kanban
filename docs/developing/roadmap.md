# Roadmap PERM-01 · Matriz y delegación de permisos

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PERM-01 — Matriz y delegación de permisos: capacidades explícitas con ámbito, roles predeterminados y concesiones revocables, con control autoritativo de servidor.
> **Backlog:** APP-03 (seguimiento: carpetas e iconos de mochila/maletín, depende de este), APP-02 (aparcada).
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Definir y aplicar una matriz de permisos con control autoritativo de servidor: la instalación y desinstalación global de apps queda reservada a dueño y administradores de instancia, y el resto de capacidades se concede por ámbito y rol con revocación inmediata.
- [ ] Criterio de éxito: una matriz verificable (owner, admin, profesor, alumno, invitado) con denegación por defecto; profesor sin rol global denegado y profesor también administrador permitido; sin privilegios cruzados entre proyectos.

## 2. Alcance

**Dentro:**
- Capacidades explícitas con ámbito (instancia, proyecto, app y sujeto), roles predeterminados y concesiones individuales revocables para las acciones que se decidan.
- Control autoritativo de servidor para UI, HTTP, MCP y sockets; no basarse en ocultar botones ni en `roles` del catálogo.
- Gestión de permisos por proyecto en Administración y permisos de instancia en Ajustes > Permisos (ubicación propuesta, a validar).
- Migración de datos sin otorgar permisos nuevos accidentalmente; invalidación de sesiones/cachés al revocar; auditoría con actor y ámbito.
- Regla de instalación: solo dueño y administradores de instancia pueden instalar o desinstalar apps de instancia; el rol de profesor por sí solo nunca concede esa capacidad.

**Fuera de alcance:**
- La titularidad de Sites (sigue fuera de la aplicación).
- Carpetas e iconos de mochila/maletín (APP-03 seguimiento, depende de este roadmap).
- Extracción de EduTools (APP-02, aparcada).
- Delegación de la gestión global de apps a profesores por concesión individual.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Capacidades con ámbito + denegación por defecto | Permisos implícitos por rol | Nada se concede por defecto; cada acción se concede explícitamente. |
| Instalación/desinstalación global solo owner/admin de instancia | Delegación a profesores por concesión | Un profesor de un solo proyecto no debe afectar a toda la instancia. |
| No delegar más poderes que los que se poseen; no retirar el control del dueño | Delegación libre | La matriz es verificable y el dueño conserva siempre el control. |
| Evaluación centralizada en servidor (UI, HTTP, MCP, sockets) | Ocultar botones o `roles` del catálogo | El control no depende de la interfaz y cubre acceso directo/API/MCP. |
| Gestión por proyecto en Administración y de instancia en Ajustes > Permisos | Controles dispersos | Cada superficie ordena permisos según su ámbito. |

## 4. Fases

### Fase 1: Matriz de capacidades y reglas — completada
- [x] Definir capacidades explícitas con ámbito (instancia, proyecto, app, sujeto), roles predeterminados y concesiones individuales revocables.
- [x] Fijar la regla de instalación global (owner/admin de instancia; profesor por sí solo nunca) y la denegación por defecto.
- [x] Definir quién concede/revoca cada capacidad, ámbito, duración, auditoría, resolución de conflictos y qué ocurre al salir de un proyecto.
- **Criterios de aceptación:** matriz documentada y aprobable; profesor sin rol global denegado y profesor también administrador permitido.

**Implementado (2026-11-16):** matriz en `docs/Store/matriz-permisos.md` (principios, roles/sujetos, capacidades por ámbito con otorgante, regla de instalación global, concesiones, ubicación propuesta y casos obligatorios). Sin cambios de código: el control de servidor llega en la Fase 2.

### Fase 2: Control autoritativo de servidor
- [ ] Centralizar la evaluación de permisos en servidor para UI, HTTP, MCP y sockets (sin basarse en ocultar botones ni en `roles` del catálogo).
- [ ] Invalidar sesiones/cachés al revocar; registrar cambios con actor y ámbito; migración sin otorgar permisos nuevos por accidente.
- [ ] Pruebas negativas y sin privilegios cruzados entre proyectos, incluida la regla de instalación global.
- **Criterios de aceptación:** acceso directo/API/MCP denegado sin permiso; revocación inmediata verificada; migración reversible.

### Fase 3: UI, verificación y cierre
- [ ] Gestión de permisos por proyecto en Administración y de instancia en Ajustes > Permisos (estructura y alcance validados).
- [ ] Suite completa, `tsc`, ESLint y build en verde; revisión en navegador local y en 390 px; revisión de seguridad.
- [ ] Resumen arriba de `changelog.md`, roadmap archivado y reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La matriz crece y se vuelve inoperable | Permisos imposibles de gestionar | Empezar por las acciones decididas; concesiones revocables solo donde aporten. |
| Migración otorga permisos accidentalmente | Escalado de privilegios | Migración reversible con auditoría; por defecto denegar lo no concedido. |
| Sesiones/cachés conservan permisos revocados | Acceso tras la revocación | Invalidación al revocar y pruebas de revocación inmediata. |

## 6. Notas de sesión

- 2026-11-16: roadmap PERM-01 creado desde el backlog (prerequisito de APP-03 seguimiento); la entrada PERM-01 sale del backlog en el mismo acto (regla de flujo). APP-03 (seguimiento) permanece en el backlog hasta que este roadmap defina los permisos.
- 2026-11-16: Fase 1 completada — matriz aprobada en `docs/Store/matriz-permisos.md`; sin cambios de código (el control autoritativo llega en la Fase 2).
