/**
 * Contenido de la documentación de Aula Kanban: solo datos, sin presentación.
 * Los iconos y las ilustraciones de cada sección viven en `section-visuals.ts`,
 * así este archivo se puede editar sin tocar componentes.
 */

import { MCP_CATALOGO } from "../../../lib/domain/mcp-catalogo";
import { mcpGuiaHerramientas, mcpResumen } from "../../../lib/domain/mcp-guia";
import { MCP_PROMPTS } from "../../../lib/domain/mcp-prompts";

/** Identificadores de sección: forman las anclas `#docs-<id>` del índice. */
export const docSectionIds = ["que-es", "roles", "personas", "proyectos", "tareas", "calendario", "pizarras", "espacio", "mcp", "oauth", "enlaces", "novedades", "problemas", "ayuda"] as const;

/** Identificador de una sección de la documentación. */
export type DocSectionId = (typeof docSectionIds)[number];

/** Tono de una nota: información, consejo o advertencia. */
export type DocNoteTone = "info" | "tip" | "warning";

/** Bloque de contenido: párrafo, pasos ordenados, definiciones, nota, imagen o código. */
export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "definitions"; items: { term: string; text: string }[] }
  | { type: "note"; tone: DocNoteTone; text: string }
  | { type: "image"; src: string; alt: string; caption: string }
  | { type: "code"; language: string; text: string };

/** Sección de la documentación: entradilla (junto a la ilustración) y cuerpo. */
export type DocSection = {
  id: DocSectionId;
  title: string;
  /** Primer párrafo; se muestra destacado al lado de la ilustración. */
  lead: string;
  blocks: DocBlock[];
};

/**
 * Bloques del catálogo MCP generados desde los metadatos puros: recuento,
 * herramientas por dominio con su permiso y límites de las dos puertas.
 * @returns Los bloques que se insertan en la sección «Servidor MCP».
 */
function bloquesCatalogoMcp(): DocBlock[] {
  const resumen = mcpResumen();
  const destructivas = MCP_CATALOGO.filter((entrada) => entrada.annotations.destructiveHint).map((entrada) => `\`${entrada.name}\``).join(", ");
  const prompts = MCP_PROMPTS.map((prompt) => `«${prompt.title}» (\`${prompt.name}\`)`).join(", ");
  return [
    { type: "paragraph", text: `El catálogo tiene **${resumen.total} herramientas** (${resumen.lectura} de lectura y ${resumen.escritura} de escritura; ${resumen.destructivas} destructivas) en la versión \`${resumen.version}\`. Cada descripción incluye un ejemplo de argumentos y su regla de rol.` },
    ...mcpGuiaHerramientas().flatMap(({ dominio, herramientas }) => [
      { type: "paragraph" as const, text: `**${dominio}**` },
      {
        type: "definitions" as const,
        items: herramientas.map((herramienta) => ({
          term: herramienta.name,
          text: `${herramienta.title}. ${herramienta.scope === "mcp:read" ? "Lectura" : "Escritura"}. ${herramienta.role}`,
        })),
      },
    ]),
    { type: "note", tone: "info", text: `Las bajas destructivas (${destructivas}) piden confirmación y el nombre exacto de la ficha o del proyecto. Cada llamada queda en la auditoría \`mcp_audit_log\`; el plugin limita a 120 peticiones por minuto y 30 de escritura por cuenta, y el token personal a 120 por minuto.` },
    { type: "note", tone: "tip", text: `El servidor publica cuatro prompts: ${prompts}. Pídelos con \`prompts/list\` y \`prompts/get\` para empezar un flujo guiado sobre el proyecto.` },
  ];
}

/** Título, entradilla y textos del héroe de la página. */
export const docsHero = {
  eyebrow: "Documentación",
  title: "Documentación de",
  titleAccent: "Aula Kanban",
  intro: "Cómo funciona el tablero, las tareas y su calendario, qué puede hacer cada rol, cómo se organiza el grupo y qué herramientas lo conectan con la IA.",
  back: "Volver a Clase",
  indexLabel: "Secciones de la documentación",
  indexTitle: "En esta página",
} as const;

/**
 * Secciones en el orden en que se muestran: primero qué es el tablero, después
 * quién puede hacer qué (roles), las personas y los proyectos, y al final las
 * herramientas (tareas, calendario, pizarras, Mi espacio, MCP, OAuth y ayuda).
 */
export const docSections: DocSection[] = [
  {
    id: "que-es",
    title: "Qué es Aula Kanban",
    lead: "Aula Kanban es el tablero colaborativo del grupo de clase: organiza el trabajo del proyecto en tareas, sigue el avance de cada una y comparte pizarras y aplicaciones útiles con todo el grupo.",
    blocks: [
      { type: "paragraph", text: "Cada proyecto es un tablero independiente. Las tareas, los alumnos, los profesores y las aplicaciones de Mi espacio pertenecen a ese proyecto: si cambias de proyecto en el selector de la cabecera, cambias de tablero." },
      { type: "paragraph", text: "La cabecera separa el trabajo en Clase, Alumnos, Profesores y Documentación. Mi espacio se abre desde el icono de aplicaciones, junto a las vistas principales. El engranaje abre los ajustes generales, con Cuenta y Administradores." },
    ],
  },
  {
    id: "roles",
    title: "Roles y permisos",
    lead: "Tu rol en el proyecto define lo que puedes hacer. Si no ves una acción, suele ser porque tu rol no la incluye.",
    blocks: [
      {
        type: "definitions",
        items: [
          { term: "Propietario o administrador", text: "Ve todo el proyecto y puede con todo: tareas y pizarras, fichas de alumno y de profesor, miembros e invitaciones, instalar aplicaciones y eliminar el proyecto. Solo estos dos roles ven «Administradores» en los Ajustes y «Nuevo proyecto» o «Eliminar proyecto» en el menú del proyecto." },
          { term: "Profesor", text: "Crea y edita cualquier tarea, mueve su tarjeta y escribe en cualquier pizarra. Añade y edita fichas de alumno, gestiona al alumnado desde «Gestionar miembros» y edita su propia ficha de profesor. No crea profesores, no instala aplicaciones ni ve Ajustes > Administradores." },
          { term: "Alumno", text: "Consulta el tablero, el calendario y las fichas, y usa las aplicaciones instaladas. Crea tareas, se asigna las que no tienen responsable, cambia el estado de las suyas y escribe en la pizarra de una tarea asignada únicamente a él. No gestiona fichas de otras personas ni miembros." },
          { term: "Invitado", text: "Consulta el mismo tablero en lectura: tareas, calendario, pizarras y fichas. No crea ni edita tareas, no guarda en las aplicaciones, no sube imágenes y no gestiona fichas ni miembros." },
        ],
      },
      { type: "paragraph", text: "La tabla resume quién puede hacer cada cosa. Cuando una acción no está en tu rol, el botón no aparece; si se intenta forzar, la app responde con un aviso, por ejemplo «Solo puedes editar tareas asignadas únicamente a ti.» o «No tienes permiso para gestionar miembros.»." },
      {
        type: "definitions",
        items: [
          { term: "Ver tareas, calendario y fichas", text: "Todos los roles del proyecto: propietario, administración, profesorado, alumnado e invitados." },
          { term: "Crear tareas", text: "Todos menos los invitados." },
          { term: "Editar o eliminar cualquier tarea", text: "Propietario, administración y profesorado. El alumnado solo las asignadas únicamente a él y puede reclamar las que no tienen responsable." },
          { term: "Asignar responsables", text: "Propietario, administración y profesorado, a cualquier ficha. El alumnado solo puede asignarse a sí mismo («No puedes cambiar la asignación de otras personas.»)." },
          { term: "Mover tarjetas entre columnas", text: "Propietario, administración, profesorado y alumnado en sus propias tareas. Los invitados no mueven tarjetas." },
          { term: "Escribir en la pizarra de una tarea", text: "Propietario, administración y profesorado en cualquier tarea; el alumnado en las asignadas únicamente a él; los invitados solo leen." },
          { term: "Crear fichas de alumno", text: "Profesorado, administración y propietario. El alumnado y los invitados no pueden («Solo el profesorado puede crear fichas.»)." },
          { term: "Editar fichas", text: "Cada persona puede editar la suya; el profesorado edita cualquier ficha de alumno. Solo el propietario y la administración crean o editan fichas de profesor." },
          { term: "Ver el correo de una ficha", text: "Propietario, administración y profesorado; el alumnado solo el de su propia ficha." },
          { term: "Gestionar miembros e invitaciones", text: "Propietario y administración, con cualquier rol. El profesorado solo al alumnado y su propia cuenta." },
          { term: "Crear o eliminar proyectos", text: "Solo el propietario y la administración («Solo el propietario o un administrador pueden crear proyectos.» y «…pueden eliminar proyectos.»)." },
          { term: "Compartir el proyecto o cambiar de proyecto", text: "Cualquier miembro activo: «Compartir proyecto» copia el enlace y el selector de la cabecera cambia de tablero." },
          { term: "Instalar o desinstalar aplicaciones", text: "Solo el propietario y la administración; la instalación es para toda la instancia." },
          { term: "Usar las aplicaciones de Mi espacio", text: "Todos los miembros; guardar en Diagramas o Programación por bloques requiere un rol distinto de invitado." },
          { term: "Ajustes", text: "«Cuenta» y los tokens del MCP son de cada cuenta; «Administradores» solo lo ven el propietario y la administración." },
        ],
      },
      { type: "note", tone: "info", text: "Las invitaciones llegan por correo desde «Gestionar miembros» y se aceptan en «Invitaciones pendientes». «Compartir proyecto» solo copia el enlace del proyecto: quien lo usa sigue necesitando ser miembro. Si tu invitación no aparece, comprueba que has iniciado sesión con la cuenta invitada o pide una invitación nueva a quien gestiona el proyecto." },
    ],
  },
  {
    id: "personas",
    title: "Personas, miembros e invitaciones",
    lead: "Alumnos y Profesores reúnen las fichas del grupo y sus tareas asignadas. Gestionar miembros decide qué cuenta de ChatGPT entra al proyecto y con qué rol.",
    blocks: [
      { type: "paragraph", text: "Las dos vistas se abren desde la cabecera y comparten aspecto: un contador («n alumnos» o «n profesores»), dos disposiciones («Vista mosaico» y «Vista lista») y una tarjeta por ficha con su nombre, su puesto y el estado de su cuenta. Al abrir una tarjeta ves la ficha completa." },
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
    lead: "El menú del proyecto reúne crear, compartir, gestionar miembros y eliminar. El engranaje de la cabecera abre los Ajustes de tu cuenta: Cuenta con sus tokens del MCP y, si te corresponde, Administradores.",
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
          { term: "Haz tu Site de Aula Kanban", text: "Copia un mensaje listo para pedir tu propia copia en Sites o clonar el repositorio. Este botón no crea el Site ni cambia variables: solo copia el mensaje y abre ChatGPT." },
        ],
      },
      { type: "note", tone: "warning", text: "«Eliminar proyecto» no tiene papelera: se borran el proyecto, sus tareas, sus fichas y sus permisos de acceso, y no se puede deshacer. Revisa antes que has escrito el nombre exacto del proyecto correcto." },
      {
        type: "steps",
        items: [
          "Abre el engranaje de la cabecera. La barra lateral de Ajustes tiene «Cuenta» y, si eres propietario o administrador, «Administradores».",
          "En «Cuenta» ves tu «Cuenta de ChatGPT» con nombre y correo, tu «Permiso en la aplicación», el «Proyecto activo» y tu «Rol en el proyecto» (Propietario, Administrador, Profesor, Alumno o Invitado).",
          "El mismo panel avisa de que los permisos de la aplicación son independientes de la propiedad del Site en Sites, y ofrece «Cerrar sesión».",
        ],
      },
      { type: "paragraph", text: "Dentro de Cuenta están los «Tokens del MCP». Cada token ve exactamente lo que tú ves en el tablero, así que sirve para conectar Claude, ChatGPT u otro cliente MCP con tu cuenta." },
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
  {
    id: "tareas",
    title: "Trabajar con tareas",
    lead: "Dentro de Clase, la sección Tareas reúne las cuatro columnas según su estado: Por hacer, En curso, En revisión y Hecho. El panel de progreso del tablero muestra el porcentaje de tareas hechas del grupo.",
    blocks: [
      { type: "image", src: "/capturas/tareas.webp", alt: "Tablero de tareas del proyecto de demostración con las columnas Por hacer, En curso, En revisión y Hecho, y el progreso del grupo al 25 %", caption: "Proyecto de demostración con datos ficticios: tareas repartidas por estado y progreso del grupo." },
      {
        type: "steps",
        items: [
          "Crea una tarea con «Nueva tarea» o con el botón «Añadir tarea» de una columna.",
          "Arrastra una tarjeta por su asa hasta otra columna para cambiar su estado, o edita la tarea desde su tarjeta.",
          "Asigna responsables (alumnos o profesores) a cada tarea; una tarea sin asignar puede reclamarla cualquier alumno.",
          "Filtra por prioridad o por alumno y busca por título o descripción para encontrar tareas rápido.",
        ],
      },
      { type: "note", tone: "tip", text: "Con el teclado: Tab hasta el asa de la tarjeta, Espacio para levantarla, flechas para moverla y Espacio para soltarla." },
      { type: "note", tone: "info", text: "Al editar una tarea puedes cambiar su título, descripción, prioridad, responsables, fecha y estado. Los cambios se comparten con todo el grupo al instante." },
      {
        type: "steps",
        items: [
          "El diálogo de la tarea tiene tres pestañas: «Resumen» (los datos), «Asignaciones» (los responsables) y «Pizarra» (el dibujo de la tarea).",
          "En «Resumen» caben un título de hasta 120 caracteres, una descripción de hasta 2000, la prioridad (Baja, Normal o Alta) y el estado.",
          "La miniatura es opcional: pega la URL directa de una imagen o pulsa «Subir imagen desde el equipo» (PNG, JPEG, WebP o GIF, hasta 5 MB). Se ve en la tarjeta del tablero.",
          "La fecha de entrega tiene atajos «Hoy», «Mañana», «En 3 días» y «Sin fecha»; si la fecha ya pasó, el formulario lo avisa. «Guardar cambios» o «Crear tarea» confirman.",
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "Asignar a toda la clase", text: "En «Asignaciones», «Asignar a toda la clase (n)» añade a todo el alumnado con ficha y «Quitar clase» los quita sin tocar al profesorado. «Añadir responsable» suma filas y cada una se puede quitar por separado." },
          { term: "Asignarme y guardar", text: "Si eres alumno y la tarea no tiene responsable, el diálogo avisa de que te la asignes para editarla y el botón pasa a ser «Asignarme y guardar»." },
          { term: "Sin responsables", text: "Mientras no haya responsables vinculados se puede escribir un nombre libre (máx. 80 caracteres); al añadir personas con ficha, ese texto deja de usarse." },
          { term: "Creada por", text: "La cabecera del diálogo y el detalle muestran «Creada por» con la cuenta que creó la tarea; si no se registró, aparece «No registrado»." },
        ],
      },
      { type: "note", tone: "warning", text: "Si la tarea cambió en otra sesión desde que abriste el diálogo, al guardar verás «Esta tarea cambió en otra sesión.» y no se sobrescribe: vuelve a abrirla para trabajar sobre la versión actual. «Eliminar» pide confirmación y borra la tarea del tablero de todo el grupo, sin papelera." },
    ],
  },
  {
    id: "calendario",
    title: "Calendario de Clase",
    lead: "Dentro de Clase, la sección Calendario coloca cada tarea en su fecha de entrega y la muestra en vista de mes, semana o agenda. Una tarea sin fecha no aparece: el calendario no inventa días.",
    blocks: [
      { type: "image", src: "/capturas/calendario.webp", alt: "Calendario de noviembre de 2026 con las fechas de entrega del proyecto de demostración", caption: "El mismo proyecto en Calendario: cada tarea en su fecha de entrega, en vista de mes." },
      {
        type: "steps",
        items: [
          "Abre Clase > Calendario en la cabecera. Arranca en vista de mes y puedes cambiar a «Semana» o «Agenda» arriba a la derecha.",
          "Muévete con «Anterior» y «Siguiente», y vuelve al mes actual con «Hoy».",
          "Pasa el puntero por una tarea para ver su título y su estado; pulsa una para abrirla. Si puedes editarla, se abre el diálogo de edición; si no, el detalle en solo lectura.",
          "Cuando un día tiene más tareas de las que caben, el calendario lo resume con «+n más» y las muestra al abrir ese día.",
        ],
      },
      { type: "note", tone: "info", text: "Cada tarea ocupa su fecha de entrega a lo largo de todo el día y lleva el color de su estado: Por hacer, En curso, En revisión o Hecho. Solo salen las tareas que tu cuenta puede ver en el proyecto." },
      { type: "note", tone: "tip", text: "¿Falta una tarea en el calendario? Casi siempre le falta la fecha: edítala, pon una fecha de entrega en «Resumen» y aparecerá. Si el periodo no tiene ninguna, el calendario avisa con «No hay tareas con fecha en este periodo.»" },
    ],
  },
  {
    id: "pizarras",
    title: "Pizarras de las tareas",
    lead: "Cada tarea tiene su propia pizarra de dibujo integrada (Excalidraw): ideal para esquemas, mapas, bocetos o anotaciones del trabajo.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre la tarea y entra en la pestaña «Pizarra» del diálogo.",
          "Dibuja o anota; la pizarra se guarda con la tarea y la ve todo el grupo.",
          "La pestaña «Pizarra» solo aparece al editar una tarea existente: no hay pizarra para una tarea que aún no se ha creado.",
        ],
      },
      { type: "note", tone: "info", text: "La pizarra de la tarea es distinta de la de Mi espacio: esta vive dentro de su tarea y comparte sus permisos. El propietario, la administración y el profesorado editan la de cualquier tarea; un alumno, solo la de una tarea sin responsable o la suya; las cuentas invitadas solo pueden mirarla (el diálogo se abre como «Detalle de la tarea»)." },
      { type: "note", tone: "tip", text: "La pizarra se comparte en directo: los demás ven tus trazos y tu puntero mientras dibujas. Si dos personas escriben a la vez, los cambios se combinan y el aviso lo indica; si falla el guardado de un trazo o una imagen, se reintenta sin perder lo dibujado." },
    ],
  },
  {
    id: "espacio",
    title: "Mi espacio, Aula Store y las aplicaciones",
    lead: "«Mi espacio» es el escritorio del proyecto: desde ahí se abren las aplicaciones en ventanas. Las aplicaciones se instalan desde Aula Store una sola vez para toda la instancia —las instala el propietario o un administrador— y las usan todos los miembros.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre «Mi espacio» desde el icono de la cabecera. En el escritorio solo aparecen las aplicaciones instaladas.",
          "Haz clic en un icono para abrir la aplicación en una ventana. Si ya estaba abierta, la ventana vuelve al frente.",
          "Arrastra la ventana desde su barra de título y cambia su tamaño desde la esquina inferior derecha.",
          "El semáforo de la ventana cierra, minimiza y amplia. Una ventana minimizada deja su icono en la barra superior: pulsa «Restaurar» para traerla de vuelta; ampliada ocupa la pantalla y el mismo botón la devuelve a su tamaño anterior.",
        ],
      },
      { type: "note", tone: "info", text: "Cerrar una ventana no borra nada: lo guardado sigue en el proyecto y vuelve a aparecer al abrir la aplicación otra vez." },
      { type: "image", src: "/capturas/espacio.webp", alt: "Mi espacio con las cuatro aplicaciones instaladas y el botón de Aula Store", caption: "Mi espacio con Excalidraw, Herramientas de aula, Programación por bloques y Diagramas instaladas." },
      {
        type: "steps",
        items: [
          "Abre «Aula Store» desde el icono de la bolsa, en la parte inferior del escritorio.",
          "Busca en Aula Store o filtra por categoría (Aula, Pizarras, Programación, Diagramas) y por «Instaladas».",
          "Abre la ficha de una aplicación: descripción, características, su versión, el paquete upstream y las ampliaciones que añade Aula Kanban.",
          "Pulsa «Instalar» o «Desinstalar». Solo el propietario o un administrador puede hacerlo, y el cambio vale para todos los miembros.",
        ],
      },
      { type: "note", tone: "info", text: "Instalar o desinstalar una aplicación solo registra su estado en Mi espacio: no borra paquetes ni datos, y las pizarras de las tareas no se ven afectadas. Al desinstalar, Aula Store pide confirmación." },
      {
        type: "definitions",
        items: [
          { term: "Excalidraw (1.0.0)", text: "Pizarra del espacio de trabajo del proyecto, independiente de la pizarra de cada tarea. Se guarda en el proyecto y se comparte en directo: el alumnado y las cuentas invitadas la ven en modo lectura, y todos ven el puntero de los demás mientras dibujan." },
          { term: "Herramientas de aula (1.0.0)", text: "Cuatro pestañas: Calculadora (Básica, Científica, Ecuaciones e Historial, con memoria MC/M+/M−/MR), Ciencias (tabla periódica con pestañas Ficha, Descripción e Historia, y modelo atómico del elemento), Medir (regla para medir en centímetros y pulgadas y transportador que gira con el ratón o las flechas) y Lectura (texto a voz con la voz del sistema). Atajos Alt+1 a Alt+4." },
          { term: "Programación por bloques (1.0.0)", text: "Editor de bloques con «Guardar», «Cargar», «Ejemplo», «Descargar», «Limpiar» y «Código»: genera el programa en JavaScript o Python, permite ejecutarlo y copiarlo. Se guarda por proyecto en la base de datos; las cuentas invitadas solo pueden consultarlo." },
          { term: "Diagramas (1.0.0)", text: "Escribes el diagrama en texto y ves la vista previa al instante, con plantillas listas. «Guardar» y «Cargar» trabajan por proyecto en la base de datos, y «Exportar SVG» descarga la imagen." },
        ],
      },
      { type: "note", tone: "info", text: "El historial de la calculadora se guarda en este navegador, no en el proyecto: no lo ves desde otro equipo y puedes vaciarlo con «Borrar» en el panel del historial. La memoria de la calculadora y las mediciones de la regla viven solo mientras la ventana está abierta. Los documentos de Programación por bloques y Diagramas sí se guardan en el proyecto, con el botón «Guardar»." },
    ],
  },
  {
    id: "mcp",
    title: "Servidor MCP",
    lead: "Aula Kanban también escucha a herramientas de inteligencia artificial (ChatGPT, Codex y otros clientes compatibles con MCP) gracias al plugin de Sites y a un servidor remoto alojado en el propio Site. Tu asistente ve y mueve el mismo tablero que tú.",
    blocks: [
      { type: "paragraph", text: "La vía recomendada es el **plugin de Aula Kanban para Sites**: ChatGPT o Codex usan tu sesión de Sites y no necesitan token. La vía avanzada es el servidor en `/api/mcp` con un token personal. En ambas, cada herramienta obedece los permisos de tu rol en el proyecto: las cuentas invitadas solo pueden consultar, y un alumno solo puede crear o editar sus propias tareas, igual que en la web." },
      {
        type: "steps",
        items: [
          "En ChatGPT o Codex, busca y conecta el plugin «Aula Kanban» creado por Sites. La identidad la pone Sites: no copies ningún token.",
          "Empieza pidiendo un resumen de clase o usa uno de los prompts del servidor; el agente llamará primero a `quien_soy` y elegirá el proyecto contigo.",
          "Prueba `listar_proyectos` y `listar_tareas`: si responden, el plugin está conectado. Si tu cliente no ofrece el plugin, usa la vía avanzada del token.",
          "Vía avanzada: abre Ajustes > Cuenta y, en «Tokens del MCP», crea un token con la etiqueta del cliente que vayas a usar (por ejemplo, «Claude»).",
          "Copia el token en ese momento: solo se muestra una vez y no se puede recuperar.",
          "En el cliente MCP, introduce la URL del Site y el token como cabecera `Authorization: Bearer …`, como en el bloque de abajo.",
          "Si el cliente devuelve 401, el token falta, es incorrecto o ha sido revocado; crea otro en Ajustes > Cuenta.",
        ],
      },
      {
        type: "code",
        language: "json",
        text: [
          "{",
          '  "mcpServers": {',
          '    "aula-kanban": {',
          '      "url": "https://TU-SITE/api/mcp",',
          '      "headers": { "Authorization": "Bearer TU-TOKEN" }',
          "    }",
          "  }",
          "}",
        ].join("\n"),
      },
      { type: "note", tone: "warning", text: "El token es como una contraseña: quien lo tenga actúa con tus permisos en el proyecto. Revócalo en Ajustes > Cuenta en cuanto dejes de usarlo y nunca lo pegues en un chat." },
      ...bloquesCatalogoMcp(),
      { type: "paragraph", text: "Cada ficha lleva su rol, su actividad, la ayuda de IA, una `revision` para guardar sin pisar cambios de otra sesión y el estado de su cuenta (sin vincular, pendiente o activa). El correo de la cuenta solo lo ven el propietario, la administración, el profesorado y la propia persona." },
      { type: "note", tone: "info", text: "Algunos clientes clásicos solo hablan con procesos locales (stdio). Esos necesitan un puente que reenvíe la URL remota con la cabecera de autorización; los clientes modernos con soporte HTTP remoto se conectan directamente. El plugin y el token personal tienen auditoría y límites propios: 120 peticiones por minuto por cuenta y 30 de escritura en el plugin, y 120 por minuto por token en `/api/mcp`." },
    ],
  },
  {
    id: "oauth",
    title: "Autorización OAuth",
    lead: "La autorización OAuth para clientes externos es experimental y está desactivada en producción mientras se revisa. Para ChatGPT y Codex, usa el plugin creado por Sites.",
    blocks: [
      { type: "paragraph", text: "El servidor de autorización vive en este Site, con su propia base de datos: nada se comparte con otros sitios ni con proveedores externos. Las cuentas son las de siempre (tu sesión de ChatGPT), y los tokens se guardan como hashes con sal, igual que los tokens personales del MCP." },
      {
        type: "definitions",
        items: [
          { term: "mcp:read", text: "Solo lectura: listar proyectos y tareas, y consultar alumnos y profesores." },
          { term: "mcp:write", text: "Lectura y escritura: además de leer, crear, actualizar y eliminar tareas (con las reglas de tu rol, como en la web)." },
          { term: "Token de acceso", text: "Dura 1 hora y se renueva solo con el token de refresco." },
          { term: "Token de refresco", text: "Dura 30 días y rota en cada uso: el anterior se revoca al canjearlo." },
        ],
      },
      {
        type: "steps",
        items: [
          "El cliente descubre el servidor en `/.well-known/oauth-authorization-server` (y el MCP indica el suyo con `/.well-known/oauth-protected-resource/mcp` cuando devuelve 401).",
          "El cliente se registra con `POST /oauth/register` (RFC 7591): su `redirect_uri` y los alcances. El secreto se muestra una sola vez.",
          "El cliente te redirige a `/oauth/authorize` con PKCE (S256, obligatorio). Ves una página de consentimiento con el nombre del cliente, los alcances y el destino, y autorizas con tu sesión.",
          "El cliente canjea el código en `POST /oauth/token` con el verificador PKCE y recibe el par de tokens. A partir de ahí llama al MCP con `Authorization: Bearer …`.",
          "Para cortar un acceso, se revoca en `POST /oauth/revoke` (RFC 7009): el token deja de funcionar al momento.",
        ],
      },
      {
        type: "code",
        language: "json",
        text: [
          "{",
          '  "authorization_url": "https://TU-SITE/oauth/authorize",',
          '  "token_url": "https://TU-SITE/oauth/token",',
          '  "revocation_url": "https://TU-SITE/oauth/revoke",',
          '  "resource": "https://TU-SITE/api/mcp",',
          '  "scopes": "mcp:read mcp:write",',
          '  "discovery": "https://TU-SITE/.well-known/oauth-authorization-server"',
          "}",
        ].join("\n"),
      },
      { type: "note", tone: "info", text: "Los tokens personales del MCP siguen funcionando como antes: la OAuth es opcional por cliente. Un cliente que ya tiene un token personal no necesita migrar." },
      { type: "note", tone: "warning", text: "La página de consentimiento es la única que usa tu sesión de navegador, y mantiene la guarda de mismo origen: nadie puede autorizar desde otra página sin que tú lo apruebes. Si un cliente pide un alcance que no te cuadra, deniega: el cliente recibirá `access_denied`." },
    ],
  },
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
          { term: "Ajustes", text: "`view=ajustes`, con `section=cuenta` (por defecto) o `section=administradores`." },
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
          { term: "El MCP responde 401 `unauthorized`", text: "El token falta, es incorrecto o se ha revocado. Crea otro en Ajustes > Cuenta y actualiza la cabecera `Authorization: Bearer …` del cliente." },
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

/**
 * Ancla HTML de una sección.
 * @param id - Identificador de la sección.
 * @returns El id del elemento, p. ej. `docs-roles`.
 */
export function docAnchor(id: DocSectionId): string {
  return `docs-${id}`;
}
