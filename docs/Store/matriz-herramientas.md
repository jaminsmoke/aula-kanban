# Matriz de herramientas, roles y alcance

Matriz propuesta para APP-01. Define cómo se está y cómo se propone que se
comporten las apps de Tienda; no cambia por sí misma los permisos actuales.

## Reglas comunes

- La visibilidad de un icono no otorga permiso de escritura ni de gestión.
- El servidor, la API, MCP y el canal en vivo deciden la autorización; la UI solo muestra acciones posibles.
- La instalación y desinstalación de apps es global y exclusiva del dueño y de administradores de instancia.
- Un rol se evalúa dentro de cada proyecto. No se mezclan datos ni permisos entre proyectos.
- Sin proyecto activo solo se permiten las consultas públicas `consultar_elemento` y `listar_plantillas_diagrama`.
- Por defecto se deniega lo que no está listado.

## Herramientas

| Herramienta | Audiencia por defecto | Ver / usar | Crear / editar compartido | Colaboración | Alcance de datos | MCP |
|---|---|---|---|---|---|---|
| Calculadora y ecuaciones | Todos los roles del proyecto | Sí | No, solo trabajo local | No | Dispositivo / navegador | Sin herramienta |
| Tabla periódica | Todos los roles del proyecto | Sí | No | No | Datos de referencia en el cliente | `consultar_elemento` |
| Excalidraw de Tienda | Owner, admin y teacher; student y guest en modo lectura | Sí | Sí para owner, admin y teacher; no para student ni guest | En vivo | Pizarra del proyecto | `leer_pizarra`, `guardar_pizarra`, `anadir_a_pizarra` |
| Programación por bloques | Todos los roles; guest en solo lectura | Sí | Sí para owner, admin, teacher y student; no para guest | Documento compartido de proyecto | `app_documents` | `leer_programa_bloques`, `guardar_programa_bloques` |
| Diagramas | Todos los roles; guest en solo lectura | Sí | Sí para owner, admin, teacher y student; no para guest | Documento compartido de proyecto | `app_documents` | `leer_diagrama`, `guardar_diagrama`, `listar_plantillas_diagrama` |
| Ajedrez | Todos los roles del proyecto; invitados en local | Sí | No, partida local | No | Dispositivo / navegador | Sin herramienta |
| Tarjetas de repaso | Todos los roles; invitados en solo lectura | Sí | Owner, admin, teacher y student editan mazos; guest no | Documento compartido de proyecto | `app_documents` + `localStorage` | Sin herramienta |
| Física 2D | Todos los roles del proyecto; invitados en local | Sí | No, simulación local | No | Dispositivo / navegador | Sin herramienta |
| Apertura y ventanas | Cualquier miembro con acceso al proyecto y la app instalada | Sí, sobre sus propias pestañas | No cambia contenido | No | Estado efímero de ventanas | `abrir_app`, `listar_ventanas`, `cerrar_app`, `minimizar_app`, `restaurar_app`, `ampliar_app` |
| Instalación global | Solo owner y admin de instancia | Ver catálogo e instalar/desinstalar | No aplica | No | Instancia / `instance_apps` | `listar_apps`, `obtener_app`, `instalar_app`, `desinstalar_app` |

## Excepciones y defaults

| Caso | Regla |
|---|---|
| Invitado | Puede ver, usar y consultar; no crea ni edita documentos compartidos. Los borradores locales no cuentan como documentos del proyecto. |
| Alumno | Puede crear y editar documentos de Blockly y Diagramas del proyecto; Excalidraw de Tienda queda en solo lectura. Las pizarras de tareas mantienen su propia regla vigente. |
| Profesor | No tiene herramientas exclusivas definidas. Puede editar documentos compartidos y la pizarra de Tienda, pero no instalar ni desinstalar apps de la instancia. |
| Owner / admin | Acceso completo al proyecto y gestión global de apps. |
| Varios proyectos | Aplicar la matriz por proyecto activo; no se acumulan datos ni permisos entre proyectos. |
| Sin proyecto | Solo `consultar_elemento` y `listar_plantillas_diagrama`. Sin pizarra ni documentos de app. |
| Herramientas de profesor | No se inventa ninguna en esta matriz. Si surge una necesidad concreta, se define su definición, audiencia y alcance antes de crear la app. |

## Límites pendientes

- APP-02 cerró el reparto de EduTools en Calculadora y Tabla periódica, sin Medir ni Lectura; esta matriz no cambia los permisos por ese reparto.
- La mochila del alumnado y el maletín docente (APP-03/APP-03B) son una organización personal de las apps instaladas; no cambian la audiencia ni los permisos de esta matriz.
- La matriz no delega permisos (PERM-01); la instalación global permanece owner/admin.
- Exportaciones visuales (imagen de Excalidraw, SVG de Diagramas, JSON de Blockly) siguen siendo locales de la ventana; no se añaden herramientas MCP de exportación.
