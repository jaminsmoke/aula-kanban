import type { DocSection } from "./types";

export const peopleSections: DocSection[] = [
  {
    id: "personas",
    title: "Personas, miembros e invitaciones",
    lead: "Administración reúne Alumnos y Profesores, con las fichas del grupo y sus tareas asignadas. Gestionar miembros decide qué cuenta de ChatGPT entra al proyecto y con qué rol.",
    blocks: [
      { type: "paragraph", text: "Las dos secciones se abren desde «Administración», en la cabecera, con el sidebar de la vista. Comparten aspecto: un contador («n alumnos» o «n profesores»), dos disposiciones («Vista mosaico» y «Vista lista») y una tarjeta por ficha con su nombre, su puesto y el estado de su cuenta. Al abrir una tarjeta ves la ficha completa; si eres alumno, tu propia ficha se abre directamente al entrar en Alumnos." },
      { type: "paragraph", text: "Quien gestiona el proyecto ve tres pestañas: «Miembros», «Herramientas» y «Permisos». La de «Permisos» es de solo lectura: muestra la matriz de capacidades del proyecto (Administración, Profesorado, Alumnado e Invitado) y el rol efectivo de cada ficha con cuántas de las cuatro capacidades cuenta. No hay casillas que marcar porque los permisos se conceden por rol; las capacidades de instancia se consultan en Ajustes > Permisos." },
      {
        type: "definitions",
        items: [
          { term: "Nombre", text: "Obligatorio, hasta 80 caracteres. Es el nombre con el que la ficha aparece en las listas y en las asignaciones de tareas." },
          { term: "Nombre a mostrar", text: "Opcional, hasta 80. Si se deja vacío se usa el nombre: el formulario lo indica con «Igual que el nombre»." },
          { term: "Correo de ChatGPT", text: "Opcional, hasta 254 caracteres. Sin correo la ficha no concede acceso. Añadir o cambiar el correo crea una invitación al guardar y no se envía ningún email; cambiarlo o eliminarlo retira el acceso anterior. Mientras el cambio no se guarda, el formulario avisa con «Cambio sin guardar»." },
          { term: "Puesto de trabajo", text: "Hasta 500 caracteres. Se ve en la tarjeta; si está vacío, la tarjeta pone «Puesto sin especificar» y la ficha «Sin especificar»." },
          { term: "Actividades cotidianas y Ayuda de la IA", text: "Dos textos de hasta 2000 caracteres cada uno, con su propio apartado en la ficha. Vacíos muestran «Sin especificar»." },
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "Cuenta activa", text: "La persona ya aceptó la invitación y entra con ese correo." },
          { term: "Invitación pendiente", text: "La ficha tiene correo, pero esa cuenta aún no ha aceptado la invitación: todavía no da acceso." },
          { term: "Sin correo: cuenta inactiva", text: "La ficha existe sin correo, así que no da acceso a nadie. La ficha lo recuerda: «Sin correo, la ficha no da acceso a esta cuenta. Añade un correo en Editar para activarla.»" },
        ],
      },
      { type: "paragraph", text: "La ficha abierta muestra su cabecera («Ficha de alumno» o «Ficha de profesor»), el botón «← Todos los alumnos» o «← Todos los profesores», los iconos «Editar perfil» y «Eliminar perfil» (solo si puedes hacerlo) y el apartado «Sus tareas» con el número y cada tarea con su estado y su «Entrega». Si no tiene ninguna: «Todavía no tiene tareas asignadas.». Si la ficha se borra mientras la tienes abierta, la vista avisa con «Esta ficha ya no está disponible.»" },
      {
        type: "definitions",
        items: [
          { term: "Fichas de alumno", text: "Las crea el profesorado con «Añadir alumno»; alumnado e invitados no pueden. Cada alumno y cada profesor puede editar su propia ficha («Solo puedes editar tu propia ficha.»)." },
          { term: "Fichas de profesor", text: "Solo el propietario o un administrador añade profesores con «Añadir profesor» («Solo un administrador puede añadir profesores.»). Después, cada profesor edita la suya." },
        ],
      },
      { type: "note", tone: "warning", text: "«Eliminar perfil» (en una ficha de alumno) o «Eliminar ficha» (en la de profesor) pide confirmación y retira el acceso de esa cuenta al momento. Sus tareas siguen en el tablero con su nombre como alumno o profesor eliminado durante 30 días; después quedan sin asignar y las tareas que creó aparecen como del propietario del aula." },
      {
        type: "steps",
        items: [
          "Abre el menú del proyecto y elige «Gestionar miembros». Lo ven el propietario, la administración y el profesorado.",
          "Escribe el correo de la cuenta de ChatGPT y elige el rol: Alumno, Profesor o Invitado · solo lectura. Profesor e Invitado solo aparecen para el propietario y la administración.",
          "Elige la ficha que corresponde al rol (alumno o profesor) y pulsa «Crear invitación».",
          "La lista «Invitaciones y miembros» muestra cada cuenta con su rol y su estado, «Activo» o «Pendiente», con los botones «Editar» y «Quitar»; «Quitar» pide confirmación con «Quitar acceso». El profesorado solo ve y gestiona al alumnado y su propia cuenta.",
        ],
      },
      { type: "note", tone: "info", text: "Invitar no es compartir. «Compartir proyecto» solo copia el enlace del proyecto: quien lo abra sigue necesitando una invitación aceptada. Si tu invitación no aparece, comprueba que has iniciado sesión con la cuenta invitada." },
      {
        type: "steps",
        items: [
          "Con una invitación pendiente, arriba del tablero aparece «Invitaciones pendientes» con el proyecto y el rol. Sin proyecto activo, la pantalla de acceso muestra las mismas invitaciones.",
          "Pulsa «Aceptar invitación»: el acceso se activa y pasas a ese proyecto. La lista se vuelve a consultar al volver a la pestaña.",
          "Una cuenta solo puede tener un rol por proyecto: si intentas invitar un correo con otro rol, verás «Esa cuenta ya tiene otro rol en el proyecto.»",
        ],
      },
      { type: "note", tone: "info", text: "Las fichas de administrador se gestionan en Ajustes > Administradores: «Nombre de la ficha» y «Correo de ChatGPT» (ambos opcionales), «Añadir ficha» o «Guardar» y «Eliminar ficha» con confirmación. La sección solo la ven el propietario y la administración; una ficha sin correo aparece en la lista pero no concede acceso." },
    ],
  },
  {
    id: "proyectos",
    title: "Proyectos y ajustes",
    lead: "El menú del proyecto reúne crear, compartir, gestionar miembros y eliminar. El engranaje de la cabecera abre Ajustes: Cuenta, Apariencia, Documentación, Tokens MCP y, si te corresponde, Administradores, Permisos y Almacenamiento.",
    blocks: [
      { type: "image", src: "/capturas/ajustes.webp", alt: "Ajustes de Cuenta con el permiso en la aplicación, el proyecto activo y el rol", caption: "Ajustes > Cuenta: permiso en la aplicación, proyecto activo y rol, con los datos ficticios de la demostración." },
      { type: "paragraph", text: "La cabecera muestra el proyecto activo en «Seleccionar proyecto»: al desplegarlo ves la lista «Proyectos» con una marca en el actual y las acciones de abajo. Cambiar de proyecto cambia de tablero: tareas, fichas y aplicaciones son las de ese proyecto." },
      {
        type: "definitions",
        items: [
          { term: "Nuevo proyecto", text: "Solo el propietario y la administración. Pide el «Nombre del proyecto» (hasta 80 caracteres) y se confirma con «Crear proyecto»; al terminar entras directamente en el proyecto nuevo." },
          { term: "Compartir proyecto", text: "Copia el enlace del proyecto. El diálogo avisa: «Comparte este enlace para abrir el proyecto «…». El acceso se gestiona desde Sites.». Puedes copiarlo con «Copiar enlace» o seleccionando el campo «Enlace del proyecto»; el botón pasa a «Enlace copiado»." },
          { term: "Gestionar miembros", text: "Invita cuentas y cambia roles y fichas. Solo aparece para el propietario, la administración y el profesorado; el detalle está en «Personas, miembros e invitaciones»." },
          { term: "Eliminar proyecto", text: "Solo el propietario y la administración. El aviso enumera lo que se pierde —proyecto, tareas, fichas y permisos de acceso— y hay que escribir el nombre exacto para habilitar «Eliminar proyecto». Al borrarlo sales a la pantalla sin proyecto." },
        ],
      },
      { type: "note", tone: "warning", text: "«Eliminar proyecto» no tiene papelera: se borran el proyecto, sus tareas, sus fichas y sus permisos de acceso, y no se puede deshacer. Revisa antes que has escrito el nombre exacto del proyecto correcto." },
      {
        type: "steps",
        items: [
          "Abre el engranaje de la cabecera. La barra lateral de Ajustes tiene «Cuenta», «Apariencia», «Documentación» y «Tokens MCP» y, si eres propietario o administrador, «Administradores», «Permisos» y «Almacenamiento».",
          "En «Cuenta» ves tu «Cuenta de ChatGPT» con nombre y correo, tu «Permiso en la aplicación», el «Proyecto activo» y tu «Rol en el proyecto» (Propietario, Administrador, Profesor, Alumno o Invitado).",
          "El mismo panel avisa de que los permisos de la aplicación son independientes de la propiedad del Site en Sites, y ofrece «Cerrar sesión».",
        ],
      },
      { type: "paragraph", text: "En Ajustes > Tokens MCP están los tokens del servidor. Cada token ve exactamente lo que tú ves en el tablero, así que sirve para conectar Claude, ChatGPT u otro cliente MCP con tu cuenta." },
      {
        type: "steps",
        items: [
          "Escribe una «Etiqueta del token» (hasta 80 caracteres, por ejemplo «Claude, uso en clase…») y pulsa «Crear token».",
          "Copia el token en ese momento: el panel avisa «Token creado. Guárdalo ahora: solo se muestra esta vez.» y ofrece «Copiar» (que pasa a «Copiado») y «Cerrar».",
          "La lista muestra cada token con su etiqueta —o «Sin etiqueta»—, la fecha de creación, su último uso o «Todavía no se ha usado», y el botón «Revocar». Los revocados siguen visibles marcados «(revocado)».",
        ],
      },
      { type: "note", tone: "warning", text: "Un token no se puede recuperar: si lo pierdes, revócalo y crea otro. Al revocarlo deja de funcionar de inmediato para el cliente que lo usaba." },
      { type: "note", tone: "info", text: "Ajustes > Administradores solo aparece para el propietario y la administración, y es donde se dan permisos de administración a otras cuentas. Sus campos y su borrado están explicados en «Personas, miembros e invitaciones». Del resto de Ajustes, «Cuenta» no cambia de proyecto: el «Proyecto activo» y el rol que muestra son los del proyecto que tengas abierto." },
      { type: "note", tone: "info", text: "¿Qué versión estás usando? Debajo de «Aula Kanban», en la cabecera, aparece `v<versión> - <autor>`; ese número es la versión de la aplicación que sirve esta instancia." },
    ],
  },
];
