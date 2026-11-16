/**
 * Matriz de permisos PERM-01 como **fuente única** (Fase 1 de PERM-02).
 *
 * Vive en `lib/domain` para que la compartan el servidor (evaluación) y la
 * interfaz (matriz de Ajustes > Permisos y pestaña Permisos de Profesores y
 * Alumnos). Antes la tabla del documento y las reglas de
 * `lib/server/capabilities.ts` podían desalinearse; ahora ambas leen de aquí.
 *
 * Reglas invariables:
 * - Por defecto se deniega: una capacidad solo se concede si aparece abajo.
 * - Una capacidad de **instancia** nunca se concede por rol de proyecto: el
 *   rol de profesor de un curso no alcanza a toda la instancia.
 * - Una capacidad de **proyecto** se concede por el rol en ese proyecto
 *   (dueño y administradores de instancia llegan con rol `owner`/`admin`).
 */

/** Rol global de instancia. */
export type RolGlobal = "owner" | "admin";

/** Rol dentro de un proyecto concreto. */
export type RolProyecto = "owner" | "admin" | "teacher" | "student" | "guest";

/** Ámbito de una capacidad. */
export type AmbitoCapacidad = "instancia" | "proyecto";

/** Capacidades de la matriz, con regla propia. */
export type Capacidad =
  | "instalar-app"
  | "administrar-administradores"
  | "gestionar-proyectos"
  | "consulta-publica"
  | "asignar-libros"
  | "gestionar-miembros"
  | "editar-documentos"
  | "pizarra-proyecto";

/** Roles que el evaluador distingue: global de instancia y de proyecto. */
export type CapacidadContexto = {
  /** Rol global de la cuenta (`owner`, `admin` o `null` sin rol global). */
  globalRole: RolGlobal | null;
  /** Rol en el proyecto concreto, o `null` sin acceso. */
  projectRole: RolProyecto | null;
};

/** Definición de una capacidad de la matriz. */
export type CapacidadDefinicion = {
  id: Capacidad;
  titulo: string;
  descripcion: string;
  ambito: AmbitoCapacidad;
  /** Roles globales que la poseen; vacío si no se concede por rol global. */
  global: readonly RolGlobal[];
  /** Roles de proyecto que la poseen; vacío en capacidades de instancia. */
  proyecto: readonly RolProyecto[];
  /** Se concede a cualquier cuenta autenticada, sin rol ni proyecto. */
  publica?: boolean;
};

/** Matriz completa, en el orden en que se muestra. */
export const CAPACIDADES: readonly CapacidadDefinicion[] = [
  {
    id: "instalar-app",
    titulo: "Instalar y desinstalar apps",
    descripcion: "Añade o retira aplicaciones de la instancia para todos los proyectos.",
    ambito: "instancia",
    global: ["owner", "admin"],
    proyecto: [],
  },
  {
    id: "administrar-administradores",
    titulo: "Administrar administradores",
    descripcion: "Crea, edita y retira fichas de administración de la instancia.",
    ambito: "instancia",
    global: ["owner", "admin"],
    proyecto: [],
  },
  {
    id: "gestionar-proyectos",
    titulo: "Gestionar proyectos",
    descripcion: "Crea, elimina y ajusta proyectos de la instancia.",
    ambito: "instancia",
    global: ["owner", "admin"],
    proyecto: [],
  },
  {
    id: "consulta-publica",
    titulo: "Consultas sin proyecto",
    descripcion: "Consulta la tabla periódica y las plantillas de diagramas sin proyecto activo.",
    ambito: "instancia",
    global: [],
    proyecto: [],
    publica: true,
  },
  {
    id: "asignar-libros",
    titulo: "Asignar libros",
    descripcion: "Decide qué libros del catálogo recibe el proyecto.",
    ambito: "proyecto",
    global: [],
    proyecto: ["owner", "admin", "teacher"],
  },
  {
    id: "gestionar-miembros",
    titulo: "Gestionar miembros",
    descripcion: "Invita y retira cuentas del proyecto; el profesorado solo gestiona alumnado.",
    ambito: "proyecto",
    global: [],
    proyecto: ["owner", "admin", "teacher"],
  },
  {
    id: "editar-documentos",
    titulo: "Editar documentos compartidos",
    descripcion: "Crea y edita los documentos de las apps del proyecto; la cuenta invitada solo consulta.",
    ambito: "proyecto",
    global: [],
    proyecto: ["owner", "admin", "teacher", "student"],
  },
  {
    id: "pizarra-proyecto",
    titulo: "Editar la pizarra del proyecto",
    descripcion: "Dibuja en la pizarra de Tienda del proyecto; el alumnado la ve sin editar.",
    ambito: "proyecto",
    global: [],
    proyecto: ["owner", "admin", "teacher"],
  },
];

/**
 * Busca la definición de una capacidad.
 * @param capacidad - Identificador de la capacidad.
 * @returns Su definición o `undefined` si no existe en la matriz.
 */
export function definicionCapacidad(capacidad: Capacidad): CapacidadDefinicion | undefined {
  return CAPACIDADES.find((item) => item.id === capacidad);
}

/**
 * Capacidades de un ámbito, en el orden de la matriz.
 * @param ambito - Ámbito a filtrar.
 * @returns Las definiciones de ese ámbito.
 */
export function capacidadesDe(ambito: AmbitoCapacidad): readonly CapacidadDefinicion[] {
  return CAPACIDADES.filter((item) => item.ambito === ambito);
}

/**
 * Evalúa una capacidad contra la matriz (función pura, sin base de datos).
 * Deniega por defecto: lo que no está en la matriz no se concede.
 * @param capacidad - Capacidad a evaluar.
 * @param contexto - Rol global de instancia y rol en el proyecto.
 * @returns `true` si la matriz concede la capacidad.
 */
export function capacidadConcedida(capacidad: Capacidad, contexto: CapacidadContexto): boolean {
  const definicion = definicionCapacidad(capacidad);
  if (!definicion) return false;
  if (definicion.publica) return true;
  if (contexto.globalRole && definicion.global.includes(contexto.globalRole)) return true;
  if (contexto.projectRole && definicion.proyecto.includes(contexto.projectRole)) return true;
  return false;
}
