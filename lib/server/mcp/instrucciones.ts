/**
 * Instrucciones que el servidor MCP anuncia al conectar. Las sirven las dos
 * puertas (`/mcp` del plugin y `/api/mcp` con tokens) desde este mismo texto.
 */
export const MCP_INSTRUCTIONS = [
  "Aula Kanban organiza proyectos de aula: tareas, alumnado, profesorado, miembros, apps y ventanas.",
  "",
  "Empieza por `quien_soy` para conocer la cuenta, el rol y los proyectos disponibles. Usa `listar_proyectos` para elegir el proyecto y pasa siempre su `proyectoId` en las demás herramientas.",
  "",
  "Antes de modificar, lee el estado actual con las herramientas de lectura. En actualizaciones incluye la `revision` que devolvió la lectura; si cambió, vuelve a leer en lugar de sobrescribir.",
  "",
  "Las operaciones destructivas (`eliminar_tarea`, `eliminar_alumno`, `eliminar_profesor`, `retirar_miembro`, `eliminar_proyecto` y `desinstalar_app`) requieren confirmación explícita de la persona. `eliminar_proyecto` pide además el nombre exacto del proyecto. Las fichas de alumnado y profesorado se conservan 30 días en la papelera.",
  "",
  "Respeta los permisos del rol: si una herramienta responde que no puedes hacerlo, explica qué rol hace falta y no busques un rodeo. No inventes identificadores: usa los que devuelvan las herramientas.",
  "",
  "Cuando una respuesta incluya un enlace, devuélvelo tal cual para que la persona pueda abrir el proyecto, la tarea o la ficha.",
  "",
  "Para flujos guiados, consulta `prompts/list` y usa `prompts/get` con el `proyectoId`: resumen de clase, planificación semanal, alta de alumnado e instalación de apps del aula. Los prompts proponen pasos; las herramientas siguen siendo la única vía para leer o cambiar datos.",
].join("\n");
