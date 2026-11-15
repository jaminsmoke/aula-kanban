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

### Fase 2: Acceso y catálogo personal — completada

- [x] Diseñar el acceso desde Aula y la separación entre catálogo global, herramientas disponibles e instaladas y elegidas personalmente.
- [x] Incluir App-01 y PERM-01 como dependencias para cualquier implementación de permisos.
- **Criterios de aceptación:** alumnado, profesorado e invitados ven solo herramientas autorizadas y un acceso accesible.

**Diseño (registrado el 2026-11-15, sin código: la implementación es la Fase 3):**

- **Punto de acceso:** un botón de icono en la cabecera, junto al de Clase, que abre **una sección nueva de la vista Clase** (`view=clase&section=mochila`, etiqueta «Mi mochila» para alumnado e invitados y «Maletín» para profesorado). Dentro de Clase el contexto es el proyecto activo, que es justo el alcance decidido en la Fase 1: sin proyecto no hay entrada. Esto separa el espacio personal del catálogo global, que sigue en Administración > Tienda con su botón de Aula Store, sin tocar la URL canónica de Tienda ni el alias `view=espacio`.
- **Separación en tres capas, en orden de lectura:**
  1. **Catálogo global (Aula Store):** el estado de instalación por instancia (`instance_apps`). Sin cambios: solo owner/admin instalan y desinstalan; se sigue gestionando desde el escritorio de Tienda.
  2. **Herramientas disponibles:** las apps instaladas que el rol del usuario **en el proyecto activo** puede abrir, según la matriz de APP-01 (ver/usar; Excalidraw de Tienda en solo lectura para alumnado e invitados). La autoridad es el servidor, no la lista `roles` de la interfaz: la capa personal no otorga acceso a una app no disponible.
  3. **Elegidas personalmente:** favoritos y orden de presentación dentro de las disponibles. Es una capa de organización: nunca instala, nunca concede permiso y nunca cambia el catálogo global.
- **Modelo de datos propuesto (Fase 3):** una fila por usuario, proyecto y app con favorito y posición —p. ej. `app_preferences(project_id, user_id, app_id, favorite, position, updated_at)` con clave primaria en las tres primeras—. La ausencia de fila equivale a «no favorita» y sin posición, con el orden del catálogo como defecto. Los favoritos de apps no instaladas se conservan pero no se muestran, como se decidió en la Fase 1; al perder la membresía activa el usuario deja de poder leer o escribir sus preferencias de ese proyecto.
- **Contrato de API propuesto (Fase 3):** una ruta nueva (p. ej. `/api/personal-apps?project=…`), separada de `/api/space-apps` para no romper su contrato: lectura con comprobación de membresía activa y escritura idempotente que solo acepta apps instaladas y nunca las instala. Los anexos de ventana, enlazado profundo (`view=…&app=…`) y controles MCP (`abrir_app`, `listar_ventanas`…) no cambian: una selección personal no reinstala una app desinstalada globalmente.
- **Dependencias de permisos:** la matriz de APP-01 define qué puede ver/usar cada rol; el espacio personal usa esa columna como puerta de entrada. PERM-01 sigue siendo prerequisito para cualquier capacidad nueva (p. ej. decidir quién puede cambiar la selección de otro): organizar los propios favoritos no necesita más permiso que el acceso ya vigente al proyecto, pero el servidor debe aplicar la membresía activa igual que en el resto de rutas. Ninguna capacidad de gestión global se delega desde la capa personal.
- **Accesibilidad:** el acceso de la cabecera es un botón real con `aria-label` y texto visible en la sección, foco visible con los tokens de `globals.css` y orden de tabulación igual al visual; la sección se revisa en 390 px igual que el resto de vistas.

### Fase 3: Implementación y compatibilidad — completada

- [x] Revisar la desinstalación global, la revocación de acceso y la pérdida de herramientas.
- [x] Verificar enlaces, ventanas, controles MCP y usuarios de varios proyectos.
- **Criterios de aceptación:** sin filtración de información personal, sin cruzar proyectos y sin que una selección personal reinstale una app desinstalada globalmente.

**Implementado (2026-11-15, commit local):**

- **Datos:** migración `0037` crea `app_preferences(project_id, user_id, app_id, favorite, position, updated_at)` con clave primaria en las tres primeras columnas y un índice por usuario/proyecto. La ausencia de fila equivale a «no favorita» y sin posición, con el orden del catálogo como defecto.
- **API:** `/api/personal-apps` con `GET` (lee) y `PUT` (sustituye la selección completa). Ambas rutas exigen la membresía activa en el proyecto (`withProjectRoute`), validan cada `id` y rechazan con 400 cualquier app no instalada: una selección personal nunca reinstala una app desinstalada globalmente. La lógica vive en `lib/server/personal-apps.ts` (merge de preferencias con instalación, orden favoritas > posición > catálogo). `/api/space-apps` y su `POST` de instalación no se tocan.
- **Interfaz:** nueva sección de Clase `view=clase&section=mochila` (esquema en `lib/domain/board-url.ts`, con su test de parse/build y roundtrip) con acceso desde la cabecera junto al botón de Clase. Etiqueta «Mi mochila» para alumnado e invitados y «Maletín» para profesorado (iconos `Backpack`/`Briefcase`). La vista lista favoritas primero y luego el resto de disponibles, con abrir (deep-link a Administración > Tienda con `app=<id>`, reutilizando el mecanismo existente, sin efecto en la URL de Tienda), estrella de favorito con `aria-pressed` y botones de subir/bajar con `aria-label`, foco visible con los tokens de `globals.css` y revisión en 390 px.
- **Aislamiento honesto:** la vista incluye el aviso de que los documentos de trabajo se comparten con el proyecto y de que la organización personal no instala ni desinstala nada; las preferencias se conservan al perder la membresía y dejan de ser accesibles porque el servidor exige la membresía activa.
- **Compatibilidad:** el enlace profundo `view=administracion&section=tienda&app=<id>`, el canal `SpaceRoom`/`space-control` y `/api/space-socket` no cambian; las herramientas MCP no se añaden ni se retiran, por lo que no cambia la versión del catálogo MCP (0.27.0, 59 herramientas) y `abrir_app` sigue exigiendo acceso al proyecto y app instalada.
- **Verificación:** suite completa en verde (128 archivos, 1.042 pruebas, incluidas las nuevas de lógica, ruta, vista, cabecera y URL), `tsc --noEmit`, ESLint y build correctos, y `perf:budget` dentro de presupuesto. Sin publicación en Sites: la aplicación de la migración en remoto y el despliegue los hace Codex.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Mezclar datos entre proyectos | Un rol en un proyecto expone herramientas o documentos de otro. | Salto explícito de contexto y permisos por proyecto activo. |
| Prometer aislamiento por usuario | Documentos compartidos pueden revelar trabajo ajeno. | Mantener el alcance vigente de cada documento y documentarlo. |
| Desinstalación global sin regla | La herramienta desaparece y la selección personal queda rota. | Definir comportamiento, avisos y retorno al catálogo global. |
| PERM-01 pendiente | Las capacidades no pueden implementarse completo sin permisos explícitos. | Dejar PERM-01 como prerequisito en el backlog y no conceder acceso en la UI sin servidor. |

## 6. Notas de sesión

- PERM-01 vuelve al backlog para poder activar APP-03 en el roadmap; sigue siendo prerequisito para la implementación.
