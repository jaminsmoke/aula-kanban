# Acceso protegido a las aplicaciones del VPS

Estado: diseño pendiente de implementación y validación. No habilitar el acceso público de las aplicaciones o del gestor basándose solo en este documento.

Hay un prototipo local de pasarela, verificación de permisos y apertura en una pestaña. Se ha probado con AFFiNE real en Docker: página inicial, Socket.IO y cierre de WebSocket al retirar el permiso. También se ha probado la instalación y desinstalación mediante el gestor con Docker real, conservando los datos. Otra prueba ha conectado AFFiNE y la pasarela con el Worker compilado y una base D1 local aislada: un alumno activo accedió y al retirar su membresía quedó bloqueado. La identidad y el transporte del Worker eran locales y simulados. Aún falta validar Sites publicado, HTTPS, Caddy, navegadores y el VPS, e instalar la pasarela como servicio. El acceso del gestor sigue cerrado y n8n y Nodum aún no tienen una pasarela operativa. La sesión del prototipo caduca a los 15 minutos; actualmente cerrar sesión en Sites no la revoca automáticamente. No presentar el prototipo como una solución lista para producción.

El 13 de noviembre se ejecutó además la prueba aislada de la pasarela contra AFFiNE en el VPS: la página, Socket.IO y la revocación funcionaron. La autorización del usuario en esa prueba era simulada y no se modificó el proxy público. Sites y el VPS ya pueden derivar dos credenciales diferentes del token privado del gestor con HMAC y ámbitos separados; queda integrarlas en la configuración del servicio y probarlas extremo a extremo. La pasarela no debe recibir el token maestro del gestor.

## Objetivo y límites

- Aula Kanban valida la sesión de Sites y la pertenencia activa a un proyecto antes de autorizar el acceso; owner y administradores conservan sus permisos globales.
- El propietario o un administrador pueden gestionar el catálogo. El acceso de los demás usuarios a cada aplicación debe seguir la política de Aula y la aplicación debe conservar sus propios permisos y cuentas cuando no exista una integración de identidad verificada.
- Los puertos de aplicaciones, bases de datos y gestor permanecen en loopback o en las redes aisladas de Docker. El punto de acceso HTTPS solo reenvía tráfico autenticado y autorizado. Las rutas públicas antiguas permanecen bloqueadas.
- El acceso por URL directa de una persona ya autenticada no puede distinguirse de forma fiable del acceso desde una ventana de la aplicación. El control real debe ser la identidad y la autorización en cada petición, no el hecho de mostrar un iframe.
- El primer administrador de AFFiNE se crea únicamente con acceso de owner o administrador de Aula; no se debe abrir el alta inicial a otros usuarios ni a Internet de forma anónima.

## Diseño que hay que validar

1. Aula comprueba la identidad proporcionada por Sites y la pertenencia en el servidor. El navegador nunca recibe el token del gestor.
2. Un servicio de entrada independiente comprueba una sesión de aplicación de corta duración, ligada a usuario, instancia y alcance. La emisión debe protegerse frente a CSRF y repetición; la revocación y el vencimiento deben dejar de autorizar nuevas peticiones y conexiones.
3. El proxy solo acepta destinos predefinidos en la configuración del servidor. Debe rechazar destinos, cabeceras de identidad, redirects y rutas no autorizados procedentes del cliente; debe proteger cookies, credenciales y registros. Las operaciones Docker se mantienen separadas del tráfico de aplicaciones.
4. Las aplicaciones deben quedar aisladas entre sí y del origen de Aula. La compatibilidad con rutas bajo un único dominio no debe suponerse: probar activos, rutas absolutas, cookies, subidas, redirecciones y WebSocket de cada aplicación. Si es necesario, evaluar orígenes aislados ocultos tras el mismo selector y un único punto de gestión.
5. El transporte entre el Site y el VPS debe usar autenticación de servicio y cifrado. Investigar la disponibilidad efectiva de conexiones privadas de Sites; si no están disponibles, el extremo público debe estar protegido y no confiar en el nombre de dominio como control de acceso.

## Pruebas obligatorias antes de habilitar

- Sin sesión, con cabeceras de identidad falsificadas y con sesiones expiradas o revocadas: denegado para HTML, activos, API y WebSocket.
- Alumno sin pertenencia, invitación pendiente y usuario retirado: denegado; usuario activo: solo acceso autorizado. Gestión del catálogo: solo owner y admin.
- El alta inicial y las acciones administrativas de AFFiNE no son accesibles para alumnos ni anónimos.
- Los secretos y tickets no aparecen en URL, registros, código cliente ni cabeceras reenviadas a otras aplicaciones. Los tokens de un servicio no se aceptan en otro.
- Probar apertura dentro de Mi espacio, cierre de sesión, revocación, sincronización WebSocket, cookies y reinstalación preservando datos. Comprobar navegadores con bloqueo de cookies de terceros.
- Validar el aislamiento y no interferencia con los servicios preexistentes del VPS. No activar n8n o Nodum hasta validar sus imágenes, dependencias, licencias y límites de recursos.
