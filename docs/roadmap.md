# Roadmap — APP-03 · Mochila del alumnado y maletín docente

> **Estado:** Activo · En curso
> **Backlog:** [`backlog.md`](backlog.md)
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Definir espacios personales de trabajo para el alumnado y el profesorado que reutilicen el escritorio de Tienda, sin mezclar datos entre usuarios o proyectos.
- [ ] Criterio de éxito: documentar el alcance de selección, favoritos y disposición; el contexto, la desinstalación global y la revocación de acceso.

## 2. Alcance

**Dentro:**
- Definir si la selección, los favoritos y la disposición son por usuario y instancia o por proyecto, y cómo se cambia de contexto.
- Diseñar el acceso claro desde Aula, manteniendo el catálogo global de Aula Store separado de la gestión de la instancia.
- Decidir qué ocurre si una app se desinstala globalmente o se revoca el acceso.
- Proteger la información personal y mantener la regla actual de documentos compartidos.
- Mantener compatibilidad con enlaces, ventanas y controles MCP.

**Fuera de alcance:**
- Cambiar la instalación global: seguirá siendo solo para owner y administradores de instancia.
- Separar EduTools (APP-02 queda aparcada).
- Implementar la delegación de permisos: es PERM-01 y seguirá siendo prerequisito para la implementación.
- Prometer aislamiento por usuario cuando un documento sea por proyecto.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| El espacio personal no cambia la instalación global | Selección personal como instalación | Toda la instancia comparte el catálogo; la personalización solo debe ordenar o fijar herramientas. |
| Contexto explícito por proyecto | Acumular herramientas de todos los proyectos | Evita filtración de datos y dependencias cuando un alumno o profesor cambia de proyecto. |
| Documentos compartidos según su alcance actual | Aislar cada documento por usuario | Los documentos de Blockly/Diagramas y las pizarras ya son por proyecto; el espacio personal no cambia esa regla. |
| Acceso por capacidad según la matriz de APP-01 | Acceso uniforme a todas las herramientas | Permite distinguir ver, usar y editar en cada rol. |
| Desinstalación global como evento explícito | Ocultar contenido eliminado | La herramienta puede desaparecer para todos y deben definirse el comportamiento y la aviso. |

## 4. Fases

### Fase 1: Definición de espacios y datos — completada

- [x] Decidir alcance, contexto, favoritos y disposición para alumnado y profesorado.
- [x] Definir la presentación de dueño/administrador y de usuarios con varios roles.
- **Criterios de aceptación:** diseño aprobado sin prometer aislamiento donde el dato es compartido.

**Definición (registrada el 2026-11-15):**

- **Alcance:** la selección de herramientas, los favoritos y el orden de presentación se guardan **por usuario y por proyecto activo**. No hay preferencias de instancia ni globales. Cambiar de proyecto cambia de contexto (el selector de la cabecera ya existe); nunca se acumulan herramientas ni datos de varios proyectos. Sin proyecto activo no hay mochila ni maletín, igual que `abrir_app` exige acceso al proyecto y la matriz de APP-01 solo permite dos consultas públicas sin proyecto.
- **Mochila y maletín son la misma capa:** dos presentaciones de una única organización personal sobre las apps **instaladas** (favoritos y orden). La mochila es la presentación de alumnado e invitados; el maletín es la del profesorado, que fija su conjunto de trabajo habitual. Ninguna de las dos instala ni desinstala nada: la instalación global sigue siendo exclusiva de owner y administradores (`POST /api/space-apps`).
- **Owner / administrador:** su superficie principal sigue siendo el catálogo global de Aula Store (Administración > Tienda). Pueden organizar su vista personal igual que el resto, pero eso no les concede ni les quita el rol global: la gestión de instalación se evalúa por rol de instancia, como hoy.
- **Usuarios con varios roles:** la presentación se decide por el rol **del proyecto activo**, tal y como lo evalúa `projectAccessForUser` (rol global primero, si no, membresía activa). Un profesor que es alumno en otro proyecto ve el maletín en el suyo y la mochila en el de alumno. Un administrador que es profesor ve las superficies globales y, dentro de cada proyecto, el rol que tenga en él.
- **Invitado:** puede organizar su vista de las herramientas que tiene permitidas ver/usar; no puede crear ni editar documentos compartidos, como ya marca APP-01. Su organización solo afecta a su propia vista.
- **Documentos compartidos:** Blockly, Diagramas y las pizarras siguen guardando por proyecto (`app_documents` y `boards`). La mochila y el maletín **no aíslan** el trabajo del usuario: lo que edita en un documento compartido del proyecto sigue siendo visible para el resto del proyecto. La copy de la interfaz deberá decirlo expresamente (Fase 2).
- **Desinstalación global:** una app desinstalada desaparece de todas las mochilas y maletines, porque la organización personal solo referencia apps instaladas; una selección personal nunca reinstala una app. Las entradas de favoritos de apps no instaladas se conservan en el almacenamiento pero no se muestran mientras la app no esté instalada.
- **Revocación de acceso:** sin membresía activa en el proyecto, la mochila/maletín de ese proyecto deja de ser accesible (el servidor exige la membresía, como en el resto de rutas). Las preferencias se conservan, igual que las fichas de `deleted_students`/`deleted_teachers`; no se borran datos al retirar un acceso.
- **Sin código en esta fase:** la Fase 1 es solo definición. El modelo de datos y el acceso desde Aula se diseñan en la Fase 2; PERM-01 sigue siendo prerequisito para cualquier capacidad nueva de autorización, aunque organizar los propios favoritos no necesita más permiso que el acceso ya vigente al proyecto.

### Fase 2: Acceso y catálogo personal

- [ ] Diseñar el acceso desde Aula y la separación entre catálogo global, herramientas disponibles e instaladas y elegidas personalmente.
- [ ] Incluir App-01 y PERM-01 como dependencias para cualquier implementación de permisos.
- **Criterios de aceptación:** alumnado, profesorado e invitados ven solo herramientas autorizadas y un acceso accesible.

### Fase 3: Implementación y compatibilidad

- [ ] Revisar la desinstalación global, la revocación de acceso y la pérdida de herramientas.
- [ ] Verificar enlaces, ventanas, controles MCP y usuarios de varios proyectos.
- **Criterios de aceptación:** sin filtración de información personal, sin cruzar proyectos y sin que una selección personal reinstale una app desinstalada globalmente.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Mezclar datos entre proyectos | Un rol en un proyecto expone herramientas o documentos de otro. | Salto explícito de contexto y permisos por proyecto activo. |
| Prometer aislamiento por usuario | Documentos compartidos pueden revelar trabajo ajeno. | Mantener el alcance vigente de cada documento y documentarlo. |
| Desinstalación global sin regla | La herramienta desaparece y la selección personal queda rota. | Definir comportamiento, avisos y retorno al catálogo global. |
| PERM-01 pendiente | Las capacidades no pueden implementarse completo sin permisos explícitos. | Dejar PERM-01 como prerequisito en el backlog y no conceder acceso en la UI sin servidor. |

## 6. Notas de sesión

- PERM-01 vuelve al backlog para poder activar APP-03 en el roadmap; sigue siendo prerequisito para la implementación.
