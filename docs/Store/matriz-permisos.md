# Matriz y delegación de permisos (PERM-01)

Matriz aprobada para el roadmap PERM-01 (Fase 1). Define capacidades
explícitas con ámbito, roles predeterminados y concesiones revocables. Es
el contrato que aplica el control autoritativo de servidor (Fase 2).

Aplicación actual (Fase 2): `lib/server/capabilities.ts` evalúa de forma
centralizada `instalar-app` y `asignar-libros` en HTTP y MCP, y `SpaceRoom`
revalida la pertenencia por mensaje. Las demás capacidades se apoyan en el
acceso por proyecto (`project-access.ts`), ya centralizado. Las concesiones
individuales con tabla de datos aún no existen: sin concesiones creadas no
se concede nada nuevo (se deniega por defecto), así que el contrato se
cumple sin necesitar una migración.

La matriz de herramientas de APP-01 (`matriz-herramientas.md`) se conserva
como audiencia y alcance por app; esta matriz añade quién puede conceder,
revocar y ejercer cada capacidad, con ámbito y auditoría.

## Principios

- **Por defecto se deniega** lo no concedido. La visibilidad de un icono o
  una ficha no otorga permiso de escritura ni de gestión.
- **La autorización la decide el servidor** para UI, HTTP, MCP y sockets.
  La interfaz solo muestra acciones posibles; nunca se basa en ocultar
  botones ni en `roles` del catálogo (visibilidad ≠ permiso).
- **No se delegan más poderes que los que se poseen** y nunca se retira el
  control del dueño. Un rol por sí solo no concede capacidades globales.
- **La gestión global de apps no se delega** a profesores por concesión
  individual (ver regla de instalación).
- **Revocación inmediata:** al revocar se invalidan sesiones/cachés; todo
  cambio se registra con actor y ámbito; la migración no otorga permisos
  nuevos por accidente.

## Roles y sujetos

| Rol | Ámbito del rol | Descripción |
|---|---|---|
| `owner` | Instancia | Persona dueña de la instancia (índice estable `instance_owner`). Controla siempre. |
| `admin` | Instancia | Administradora de instancia (ficha en `administrators`). Puede gestionar apps globales con el dueño. |
| `teacher` | Proyecto | Profesora de un proyecto. No concede capacidades globales por sí sola. |
| `student` | Proyecto | Alumno de un proyecto. Solo lectura/escritura según la matriz de herramientas. |
| `guest` | Proyecto | Invitado de un proyecto. Consulta sin crear documentos compartidos. |

Una persona puede acumular roles (p. ej. profesora de un proyecto y
administradora de instancia): cada capacidad se evalúa por la condición
que la otorga (global o por proyecto), nunca por un rol aislado. El
contraste obligatorio: profesor sin rol global denegado; profesor que
también es administrador permitido.

## Capacidades por ámbito

| Capacidad | Ámbito | Sujeto | Quién la concede / revoca | Duración y auditoría |
|---|---|---|---|---|
| Instalar / desinstalar apps de instancia | Instancia / app | `owner`, `admin` | Dueño (alta de administradores) y administradores existentes; no revocable por concesión (ver regla) | Permanente mientras dure el rol global; todo cambio en auditoría con actor y ámbito |
| Administrar administradores de instancia | Instancia | `owner`, `admin` (alta y baja) | Dueño y administradores existentes; nadie puede promover a dueño (el dueño nunca es ficha de administrador) | Permanente; cambios en auditoría |
| Gestionar proyectos (crear, eliminar, ajustes) | Instancia | `owner`, `admin` | Dueño y administradores de instancia | Permanente; cambios en auditoría |
| Gestionar miembros del proyecto (añadir, retirar, roles) | Proyecto | `owner`, `admin` (completo); `teacher` (listar, invitar alumnado y retirar alumnado) | Dueño, administradores y profesorado según el rol, sin tabla de concesiones todavía | Sujeto al rol de miembro; al salir del proyecto cesa |
| Habilitar libros por proyecto (STORE-04) | Proyecto | `owner`, `admin`, `teacher` (por rol) | Dueño, administradores y profesorado del propio proyecto | Sujeto al rol de miembro; al salir del proyecto cesa |
| Crear / editar documentos compartidos (app_documents) | Proyecto / app | Según matriz APP-01 (profesorado y alumnado escriben donde está listado; invitado solo consulta) | Roles predeterminados; concesiones de proyecto donde se decida | Sujeto al rol de miembro; al salir del proyecto cesa |
| Pizarra de proyecto (Excalidraw) | Proyecto | Según matriz APP-01 | Roles predeterminados | Sujeto al rol de miembro; al salir del proyecto cesa |
| Consulta pública sin proyecto (`consultar_elemento`, `listar_plantillas_diagrama`) | Instancia | Cualquier cuenta autenticada | Sin concesión | Sin ámbito de proyecto; no implica escritura |

Notas:
- La tabla recoge las acciones decididas; nuevas capacidades se añaden
  por filas explícitas (con ámbito, sujeto y otorgante) antes de
  implementarse. Ninguna vía implícita o por defecto.
- La instalación global no admite concesión individual: requiere ser
  dueño o administrador de instancia.

## Regla de instalación global

Solo el dueño y los administradores de instancia pueden instalar o
desinstalar apps de instancia (`instance_apps`, `POST /api/space-apps`).
El rol de profesor por sí solo nunca concede ni recibe esa capacidad,
ni por concesión individual. Una persona que también es profesora puede
hacerlo únicamente por su condición de dueña o administradora. La
titularidad de Sites sigue fuera de la aplicación.

## Concesiones individuales

- **Quién concede:** únicamente quien posee la capacidad (o es dueño)
  puede concederla, y solo dentro de su propio ámbito.
- **Ámbito:** instancia, proyecto, app y sujeto; una concesión de
  proyecto nunca crea capacidades globales ni entre proyectos.
- **Duración:** revocable en cualquier momento; al revocarla se
  invalidan sesiones/cachés y el cambio queda en auditoría con actor,
  sujeto, ámbito y fecha.
- **Conflictos:** por defecto denegar; una denegación explícita gana
  a cualquier concesión genérica del mismo ámbito.
- **Al salir de un proyecto:** cesan los roles y concesiones de ese
  proyecto; no se acumulan ni se trasladan entre proyectos, ni se
  convierten en capacidades globales.

## Ubicación validada (Fase 3)

- **Permisos por proyecto:** Administración (Alumnos/Profesores) con su
  gestión de miembros existente; sin sección nueva.
- **Permisos de instancia:** Ajustes > Administradores con su gestión de
  administradores existente. La sección nueva «Ajustes > Permisos» queda
  descartada mientras no exista almacenamiento de concesiones
  individuales (una UI sin datos sería un placeholder); si se añade la
  tabla de concesiones, la sección lo acogerá.

## Verificación de la matriz (Fase 1)

- Matriz documentada y aprobada (este documento).
- Casos obligatorios: profesor sin rol global denegado; profesor que
  también es administrador permitido; acceso directo/API/MCP denegado
  sin permiso; sin privilegios cruzados entre proyectos. La
  verificación en código corresponde a las Fases 2 y 3.

