import type { DocSection } from "./types";

export const introSections: DocSection[] = [
  {
    id: "que-es",
    title: "Qué es Aula Kanban",
    lead: "Aula Kanban es el tablero colaborativo del grupo de clase: organiza el trabajo del proyecto en tareas, sigue el avance de cada una y comparte pizarras y aplicaciones útiles con todo el grupo.",
    blocks: [
      { type: "paragraph", text: "Cada proyecto es un tablero independiente. Las tareas, los alumnos, los profesores y las aplicaciones de Tienda pertenecen a ese proyecto: si cambias de proyecto en el selector de la cabecera, cambias de tablero." },
      { type: "paragraph", text: "La cabecera separa el trabajo en Clase y Administración, con Clase en su botón de icono y el selector de proyecto a la derecha. Tienda está en el sidebar de Administración. El engranaje abre los ajustes generales, con Cuenta, Apariencia, Documentación, Tokens MCP, Administradores y Almacenamiento." },
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
          { term: "Usar las aplicaciones de Tienda", text: "Todos los miembros; guardar en Diagramas o Programación por bloques requiere un rol distinto de invitado." },
          { term: "Ajustes", text: "«Cuenta» y los tokens del MCP son de cada cuenta; «Administradores» solo lo ven el propietario y la administración." },
        ],
      },
      { type: "note", tone: "info", text: "Las invitaciones llegan por correo desde «Gestionar miembros» y se aceptan en «Invitaciones pendientes». «Compartir proyecto» solo copia el enlace del proyecto: quien lo usa sigue necesitando ser miembro. Si tu invitación no aparece, comprueba que has iniciado sesión con la cuenta invitada o pide una invitación nueva a quien gestiona el proyecto." },
    ],
  },
];
