import type { DocSection } from "./types";

export const helpSections: DocSection[] = [
  {
    id: "enlaces",
    title: "Enlaces, portada y tu propio Site",
    lead: "Cada vista tiene su dirección. Puedes guardar un enlace a Clase > Calendario, a Alumnos o a Ajustes, y la portada y esta documentación se abren sin sesión.",
    blocks: [
      { type: "paragraph", text: "La dirección sigue el esquema `?project=<id>&view=<vista>&section=<sección>`. Solo se escribe lo que no es el valor por defecto, así que `/?project=<id>` ya es Clase > Tareas." },
      {
        type: "definitions",
        items: [
          { term: "Clase > Tareas", text: "`/?project=<id>` o `/?project=<id>&view=clase`." },
          { term: "Clase > Calendario", text: "`/?project=<id>&section=calendario`; también admite `view=clase`." },
          { term: "Alumnos y Profesores", text: "`view=alumnos` y `view=profesores`." },
          { term: "Mi espacio", text: "`view=espacio`; `app=<appId>` abre una aplicación instalada, por ejemplo `view=espacio&app=mermaid`." },
          { term: "Ajustes", text: "`view=ajustes`, con `section=cuenta` (por defecto), `apariencia`, `tokens`, `administradores` o `almacenamiento`; las dos últimas solo con permiso." },
          { term: "Documentación", text: "`/documentacion` sin sesión; dentro del tablero, `view=documentacion`." },
          { term: "Enlaces de proyecto", text: "El menú de la cabecera enlaza cada proyecto conservando la vista y la sección en las que estás." },
          { term: "Valores no válidos", text: "Un `view` o un `section` desconocidos caen a su valor por defecto; `project` conserva el proyecto activo." },
        ],
      },
      { type: "note", tone: "info", text: "La portada (`/`) y `/documentacion` se ven sin sesión y no muestran datos de la instancia: ni proyectos, ni fichas, ni correos. Los enlaces que llevan `project` piden sesión y acceso al proyecto." },
      {
        type: "steps",
        items: [
          "Abre el menú del proyecto y pulsa «Haz tu Site de Aula Kanban».",
          "Copia el mensaje de `@Sites` con «Copiar mensaje» y pégalo en ChatGPT: el agente publica la copia en tu cuenta.",
          "Si prefieres clonar, «Copiar mensaje (git)» parte de `https://github.com/jaminsmoke/aula-kanban.git` y publica esa revisión como tu Site.",
          "El propietario de la copia es quien da la orden: la cuenta de ChatGPT que la pide. Antes de publicar, `OWNER_EMAIL` se configura con el correo de esa misma cuenta.",
          "En el primer acceso con esa cuenta queda guardada la identidad del propietario; después comprueba que puedes crear un proyecto y gestionar administradores.",
        ],
      },
      { type: "note", tone: "warning", text: "La copia empieza vacía: sin proyectos, tareas, fichas, administradores ni variables de entorno del Site original. «Haz tu Site de Aula Kanban» no crea el Site: solo copia el mensaje y abre ChatGPT." },
    ],
  },
  {
    id: "novedades",
    title: "Novedades",
    lead: "Lo que ha cambiado en Aula Kanban, contado para quien lo usa. Solo aparece lo que ya está en una versión publicada.",
    blocks: [
      {
        type: "definitions",
        items: [
          { term: "Versión 1.1.23", text: "Ajustes generales con «Cuenta» y «Administradores», una navegación de Clase más clara entre Tareas y Calendario, y fichas de Aula Store con la versión de cada aplicación, su paquete upstream y sus ampliaciones." },
        ],
      },
      { type: "note", tone: "info", text: "Esta lista solo recoge versiones ya publicadas: lo que está en la aplicación pero aún no se ha publicado no se anuncia aquí. La versión que estás usando aparece en la cabecera, bajo «Aula Kanban»." },
      { type: "note", tone: "tip", text: "Cada publicación añade su entrada arriba, contada en lenguaje de uso: qué cambia para el grupo, no cómo se ha hecho por dentro." },
    ],
  },
  {
    id: "problemas",
    title: "Si algo no funciona",
    lead: "Los avisos de Aula Kanban dicen qué ha pasado y qué hacer a continuación. Estos son los más frecuentes, con su texto exacto.",
    blocks: [
      {
        type: "definitions",
        items: [
          { term: "«Este enlace no está disponible para tu cuenta»", text: "Pantalla de acceso cuando el enlace trae un proyecto y tu cuenta no es miembro activo. Comprueba que has iniciado sesión con la cuenta invitada; si no, pide una invitación a quien gestione el proyecto." },
          { term: "«Aún no tienes acceso a un proyecto»", text: "La misma pantalla sin enlace de proyecto: tu cuenta todavía no pertenece a ninguno. Si aparece una invitación debajo, pulsa «Aceptar invitación»." },
          { term: "«No tienes acceso a este proyecto.»", text: "La app responde 403 cuando la cuenta ya no es miembro, por ejemplo porque la han quitado del proyecto. Recarga y, si el proyecto no sale en el selector, pide acceso a quien lo gestione." },
          { term: "«No se encuentra el proyecto.»", text: "El proyecto del enlace se ha eliminado (404). Abre el selector de la cabecera y elige otro." },
          { term: "«Inicia sesión para continuar.»", text: "La sesión de ChatGPT ha caducado (401). Vuelve a iniciar sesión con la misma cuenta y recarga." },
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "La invitación no aparece", text: "«Invitaciones pendientes» se vuelve a consultar al volver a la pestaña. Si no sale, comprueba que la sesión es la cuenta invitada, que no la has aceptado ya (entonces el proyecto está en el selector) y que la ficha conserva el correo; si sigue sin aparecer, pide una invitación nueva." },
          { term: "«Esa cuenta ya tiene otro rol en el proyecto.»", text: "Una cuenta solo puede tener un rol por proyecto. Para cambiarlo, edita su miembro en «Gestionar miembros» en vez de invitarla de nuevo." },
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "«Esta tarea cambió en otra sesión. Abre la versión actual para continuar.»", text: "Otra persona guardó la misma tarea antes que tú (409) y tu cambio no la sobrescribe. Cierra el diálogo, vuelve a abrirla con la versión actual y repite el cambio." },
          { term: "«La tarea ya no está disponible.»", text: "Se eliminó mientras la tenías abierta. Al cerrar el aviso, el tablero se recarga sin ella." },
          { term: "«La pizarra cambió en otra sesión. Actualiza antes de guardar.»", text: "Alguien guardó la pizarra antes que tú (409). La app combina los cambios y lo cuenta con «Combinando cambios de otra sesión…»; si no lo consigue, recarga la pizarra." },
          { term: "«No se pudo cargar la pizarra. Revisa tu conexión e inténtalo de nuevo.»", text: "El lienzo no llegó. Usa «Reintentar»: lo dibujado no se pierde, y si falla el guardado se avisa con «No se pudo actualizar la pizarra; los cambios siguen pendientes.» o «No se pudo guardar la pizarra o una imagen; se volverá a intentar.»." },
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "«La imagen supera los 5 MB permitidos.»", text: "La miniatura de una tarea admite PNG, JPEG, WebP o GIF hasta 5 MB. Reduce la imagen o pega una URL externa en «Miniatura»." },
          { term: "«Tipo de archivo no admitido para esta subida.»", text: "Solo se aceptan esos cuatro formatos de imagen (y PDF, TXT, Markdown o CSV para documentos). Convierte el archivo antes de subirlo." },
          { term: "«La subida de archivos aún no está habilitada en este despliegue. Usa una URL externa de momento.»", text: "El almacenamiento del Site no está activo (503). Pega la URL de la imagen: el campo «Miniatura» la acepta sin subir nada." },
          { term: "«No se pudo subir la imagen.»", text: "La subida no llegó a completarse. Vuelve a intentarlo o usa una URL externa." },
          { term: "«No se pudo guardar el documento.» y «No se pudo cargar el documento guardado.»", text: "Los documentos de Programación por bloques y Diagramas se guardan en el proyecto. Revisa la conexión y vuelve a pulsar «Guardar»." },
          { term: "«No se pudo conectar con el tablero. Inténtalo de nuevo.»", text: "Fallo de red al pedir los datos. Reintenta desde el aviso; si sigue, recarga la página." },
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "El MCP responde 401 `unauthorized`", text: "El token falta, es incorrecto o se ha revocado. Crea otro en Ajustes > Tokens MCP y actualiza la cabecera `Authorization: Bearer …` del cliente." },
          { term: "El MCP responde 429 `rate_limited`", text: "Cada token admite 120 peticiones por minuto. Espera los 60 segundos de la cabecera `retry-after` y repite." },
          { term: "El MCP responde 503 `database_unavailable`", text: "El Site no encuentra su base de datos en ese momento. Reintenta en unos segundos." },
          { term: "El MCP responde 403 `insufficient_scope`", text: "El token OAuth es de solo lectura y la herramienta escribe. Autoriza de nuevo con `mcp:write` o usa un token personal." },
        ],
      },
      { type: "note", tone: "tip", text: "Si no ves «Añadir alumno», «Gestionar miembros» o «Instalar», no es un error: tu rol no incluye esa acción. La sección «Roles y permisos» tiene la tabla completa." },
    ],
  },
  {
    id: "ayuda",
    title: "Pedir ayuda",
    lead: "Aula Kanban se mejora con ayuda de la inteligencia artificial, y tú también puedes pedir ayuda directamente.",
    blocks: [
      {
        type: "steps",
        items: [
          "Para dudas de uso o ideas, pregunta a ChatGPT desde el chat que tienes abierto.",
          "Para cambios en el propio Aula Kanban (funciones, textos, correcciones), el canal es Codex: quien gestiona el proyecto puede pedir el cambio allí.",
        ],
      },
      { type: "note", tone: "warning", text: "Nunca pegues contraseñas ni tokens en el chat: si una función pide credenciales, configúralas en el panel de Sites." },
    ],
  },
];
