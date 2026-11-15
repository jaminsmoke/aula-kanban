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

### Fase 1: Definición de espacios y datos

- [ ] Decidir alcance, contexto, favoritos y disposición para alumnado y profesorado.
- [ ] Definir la presentación de dueño/administrador y de usuarios con varios roles.
- **Criterios de aceptación:** diseño aprobado sin prometer aislamiento donde el dato es compartido.

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
