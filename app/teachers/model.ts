export type Teacher = {
  id: string;
  projectId: string;
  name: string;
  displayName: string;
  role: string;
  activities: string;
  aiHelp: string;
  revision: number;
  accountStatus?: "pending" | "active" | "unlinked";
  accountEmail?: string;
  accountMemberId?: string | null;
};

/**
 * Crea una ficha de profesor vacía lista para el formulario.
 * @returns Ficha nueva con identificador generado.
 */
export const blankTeacher = (): Teacher => ({ id: crypto.randomUUID(), projectId: "", name: "", displayName: "", role: "", activities: "", aiHelp: "", revision: 0, accountEmail: "" });
