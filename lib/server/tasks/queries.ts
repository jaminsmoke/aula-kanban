import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { deletedStudents, deletedTeachers, projectMembers, students, taskAssignees, teachers, userIdentities } from "../../../db/schema";
import { personLabel } from "../../domain/assignments";
import type { DecoratedTask, ProjectData, TaskRef, TaskRow } from "./types";

/**
 * Carga las fichas, referencias, miembros e identidades necesarias para decorar
 * y validar las tareas de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns Las siete colecciones usadas por la ruta de tareas.
 */
export async function projectData(projectId: string): Promise<ProjectData> {
  const db = getDb();
  const [profiles, staff, removedProfiles, removedStaff, refs, members, identities] = await Promise.all([
    db.select().from(students).where(and(eq(students.projectId, projectId), eq(students.deleted, 0))),
    db.select().from(teachers).where(eq(teachers.projectId, projectId)),
    db.select().from(deletedStudents).where(eq(deletedStudents.projectId, projectId)),
    db.select().from(deletedTeachers).where(eq(deletedTeachers.projectId, projectId)),
    db.select().from(taskAssignees).where(eq(taskAssignees.projectId, projectId)),
    db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId)),
    db.select().from(userIdentities),
  ]);
  return { profiles, staff, removedProfiles, removedStaff, refs, members, identities };
}

/**
 * Convierte una fila de tarea en la forma que consume la UI, resolviendo
 * responsables, fichas eliminadas y el nombre del creador.
 * @param task - Fila de tarea.
 * @param data - Datos del proyecto precargados.
 * @returns La tarea decorada para la API.
 */
export function decorate(task: TaskRow, data: ProjectData): DecoratedTask {
  const assignments = data.refs.filter((ref) => ref.taskId === task.id).flatMap((ref) => {
    // A deleted ficha still resolves to its name until the 30-day history is purged.
    if (ref.kind === "student") {
      const active = data.profiles.find((profile) => profile.section === ref.profileId);
      const profile = active ?? data.removedProfiles.find((item) => item.section === ref.profileId);
      return profile ? [{ kind: ref.kind as TaskRef["kind"], profileId: ref.profileId, name: personLabel(profile), ...(active ? {} : { removed: true }) }] : [];
    }
    if (ref.kind === "teacher") {
      const active = data.staff.find((profile) => profile.id === ref.profileId);
      const profile = active ?? data.removedStaff.find((item) => item.id === ref.profileId);
      return profile ? [{ kind: ref.kind as TaskRef["kind"], profileId: ref.profileId, name: personLabel(profile), ...(active ? {} : { removed: true }) }] : [];
    }
    return [];
  });
  const creatorMember = data.members.find((member) => member.id === task.creatorMemberId && member.userId === task.creatorUserId && member.status === "active");
  const creatorProfile = creatorMember?.studentSection ? data.profiles.find((profile) => profile.section === creatorMember.studentSection) : creatorMember?.teacherId ? data.staff.find((profile) => profile.id === creatorMember.teacherId) : undefined;
  const creator = (creatorProfile && personLabel(creatorProfile)) || data.identities.find((identity) => identity.id === task.creatorUserId)?.displayName || task.creatorName || null;
  return { id: task.id, title: task.title, description: task.description, imageUrl: task.imageUrl ?? "", assignee: assignments.length ? assignments.map((item) => item.name).join(", ") : task.assignee, assignees: assignments, dueDate: task.dueDate, priority: task.priority, status: task.status, createdAt: task.createdAt, revision: task.revision, creator };
}
