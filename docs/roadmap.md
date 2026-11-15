# Roadmap — PERM-01 · Matriz y delegación de permisos

> **Estado:** Activo · En curso
> **Backlog:** [`backlog.md`](backlog.md)
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Implementar permisos explícitos y delegables con ámbito, sujeto, vigencia, revocación y auditoría.
- [ ] Criterio de éxito: la autorización se evalúa en el servidor para UI, HTTP, MCP y sockets, sin privilegios cruzados entre proyectos.

## 2. Alcance

**Dentro:**
- Inventario de los puntos de autorización actuales: instalación de apps, documentos de apps, pizarras, archivos, tareas, miembros y MCP.
- Modelo central de capacidades con ámbito (instancia, proyecto, app y sujeto), roles predeterminados y concesiones individuales revocables.
- Gestión de permisos por proyecto en Administración y permisos de instancia en Ajustes, previa validación de estructura y alcance.
- Migración reversible sin otorgar permisos nuevos accidentalmente.
- Auditoría con actor, ámbito y cambio.
- Pruebas negativas para acceso directo, API, MCP y sockets.

**Fuera de alcance:**
- Mochila del alumnado / maletín docente (APP-03).
- Separar EduTools (APP-02 queda aparcada).
- Delegar la instalación o desinstalación global de apps a profesor por concesión individual.
- Titularidad de Sites.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Instalación global solo para owner y administradores de instancia | Delegar a profesores por concesión | Evita que un profesor de un proyecto afecte a toda la instancia. |
| Denegar por defecto | Permisos inferidos por rol | La matriz es la fuente de verdad; lo no concedido no se concede. |
| Servidor autoritativo | Confiar en botones ocultos o `roles` del catálogo | La autorización debe funcionar también para acceso directo, API, MCP y sockets. |
| Ámbito por proyecto | Permisos personales globales | Un usuario puede tener roles distintos en proyectos distintos; no deben acumularse entre proyectos. |
| Migración reversible | Sustituir permisos en masa | Permite revisar el impacto y deshacer la migración sin perder el control del dueño. |

## 4. Fases

### Fase 1: Modelo y migración

- [ ] Diseñar capacidades, ámbito, sujeto, duración, revocación y conflictos.
- [ ] Definir el modelo de datos, la migración reversible y la auditoría.
- **Criterios de aceptación:** diseño aprobado sin cambios de permisos efectivos.

### Fase 2: Enforcement

- [ ] Centralizar la evaluación para HTTP, MCP, sockets y UI.
- [ ] Aplicar la matriz por proyecto e instancia, con revocación inmediata y pruebas negativas.
- **Criterios de aceptación:** sin privilegios cruzados; profesor no administrador denegado para gestión global.

### Fase 3: Gestión y revisión

- [ ] Añadir la gestión por proyecto, permisos de instancia y auditoría.
- [ ] Completar migración, revisión de seguridad y documentación.
- **Criterios de aceptación:** responsable y ámbito auditables; casos directo/API/MCP cubiertos por pruebas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Acumular privilegios entre proyectos | Un rol en un proyecto otorga acciones en otro. | Evaluar siempre el proyecto activo y denegar por defecto. |
| Permisos de UI sin enforcement | Acceso directo o MCP bypasea la regla. | Tests negativos para HTTP, MCP y socket, no solo para el botón. |
| Migración que concede permisos nuevos | Acceso accidental o pérdida del control del dueño. | Migración reversible, validación explícita y revisión de seguridad. |
| Delegación superior a los poderes propios | Un administrador puede crear privilegios que no posee. | No permitir delegar más poderes que los que se poseen ni retirar el control del dueño. |

## 6. Notas de sesión

- La matriz de APP-01 es el punto de partida; esta fase no implementa todavía los permisos.
