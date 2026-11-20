import { z } from "zod";
import type { Access } from "../projects/project-access";

/**
 * Piezas compartidas de las fichas de alumnado y profesorado: el correo de
 * la cuenta vinculada, las referencias con revisión y quién puede ver ese
 * correo. Las rutas HTTP y el catálogo MCP usan estas mismas reglas.
 */

/** Resultado de crear o editar una ficha, con el estado HTTP si falla. */
export type FichaResult<T> = { ok: true; ficha: T } | { ok: false; status: number; message: string };

/** Resultado de una baja de ficha, con el estado HTTP si falla. */
export type BajaResult = { ok: true } | { ok: false; status: number; message: string };

/** Correo de la cuenta vinculada: vacío retira la invitación. */
export const accountEmail = z
  .string()
  .trim()
  .max(254)
  .refine((value) => !value || z.string().email().safeParse(value).success, "Correo no válido")
  .transform((value) => value.toLowerCase());

/** Referencia de una ficha de alumno con su revisión. */
export const studentReference = z.object({ section: z.string().min(1).max(80), revision: z.number().int().positive() });

/** Referencia de una ficha de profesor con su revisión. */
export const teacherReference = z.object({ id: z.string().uuid(), revision: z.number().int().positive() });

/**
 * Indica si la cuenta puede ver el correo de una ficha de alumno.
 * @param access - Acceso de la cuenta al proyecto.
 * @param section - Sección de la ficha.
 * @returns `true` para propietario, administración, profesorado y el propio alumno.
 */
export function maySeeStudentEmail(access: Access, section: string): boolean {
  return access.role === "owner" || access.role === "admin" || access.role === "teacher" || access.studentSection === section;
}

/**
 * Indica si la cuenta puede ver el correo de una ficha de profesor.
 * @param access - Acceso de la cuenta al proyecto.
 * @param id - Identificador de la ficha.
 * @returns `true` para propietario, administración y el propio profesor.
 */
export function maySeeTeacherEmail(access: Access, id: string): boolean {
  return access.role === "owner" || access.role === "admin" || access.teacherId === id;
}
