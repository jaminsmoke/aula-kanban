import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../../../db", () => ({ getDb: () => state.db }));

import { students, teachers } from "../../../db/schema";
import {
  deleteMemberRow,
  findMemberRowByEmail,
  findMemberRowByStudentSection,
  findMemberRowByTeacherId,
  findProjectMemberRow,
  findStudentRow,
  findTeacherRow,
  insertMemberRow,
  listProjectMemberRows,
  updateMemberInvitationEmailRow,
} from "./members-repository";

type Member = {
  id: string;
  projectId: string;
  email: string;
  userId: string | null;
  role: string;
  studentSection: string | null;
  teacherId: string | null;
  status: string;
};

const member: Member = {
  id: "m1",
  projectId: "p1",
  email: "ada@example.com",
  userId: null,
  role: "student",
  studentSection: "s1",
  teacherId: null,
  status: "pending",
};

/**
 * Convierte un resultado en una consulta encadenable como la de Drizzle.
 * @param rows - Filas que devuelve la consulta.
 * @returns Promesa con `where` y `orderBy` para el fixture.
 */
function query<T>(rows: T[]) {
  const promise = Promise.resolve(rows) as Promise<T[]> & {
    where: () => Promise<T[]>;
    orderBy: () => Promise<T[]>;
  };
  promise.where = () => promise;
  promise.orderBy = () => promise;
  return promise;
}

/**
 * Construye una base D1 falsa con filas y capturas de escritura.
 * @param input - Miembros, fichas, resultados de actualización, alta y baja.
 * @returns La base, los valores actualizados y los insertados.
 */
function fixture(input: {
  members?: Member[];
  student?: Record<string, unknown> | null;
  teacher?: Record<string, unknown> | null;
  updated?: Member | null;
  created?: Member | null;
  deletedId?: string | null;
} = {}) {
  const sets: unknown[] = [];
  const inserts: unknown[] = [];
  const db = {
    select: () => ({
      from: (table: unknown) => {
        if (table === students) return query(input.student ? [input.student] : []);
        if (table === teachers) return query(input.teacher ? [input.teacher] : []);
        return query(input.members ?? []);
      },
    }),
    update: () => ({
      set: (values: unknown) => {
        sets.push(values);
        return {
          where: () => ({
            returning: async () => (input.updated ? [input.updated] : []),
          }),
        };
      },
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserts.push(values);
        return { returning: async () => (input.created ? [input.created] : []) };
      },
    }),
    delete: () => ({
      where: () => ({
        returning: async () => (input.deletedId ? [{ id: input.deletedId }] : []),
      }),
    }),
  };
  return { db, sets, inserts };
}

describe("repositorio de miembros", () => {
  it("lista los miembros del proyecto por correo", async () => {
    state.db = fixture({ members: [member] }).db;
    await expect(listProjectMemberRows("p1")).resolves.toEqual([member]);
  });

  it("encuentra fichas de alumnado y profesorado solo si existen", async () => {
    state.db = fixture({ student: { section: "s1" }, teacher: { id: "t1" } }).db;
    await expect(findStudentRow("p1", "s1")).resolves.toEqual({ section: "s1" });
    await expect(findTeacherRow("p1", "t1")).resolves.toEqual({ id: "t1" });

    state.db = fixture({ student: null, teacher: null }).db;
    await expect(findStudentRow("p1", "s1")).resolves.toBeNull();
    await expect(findTeacherRow("p1", "t1")).resolves.toBeNull();
  });

  it("localiza la membresía por correo, ficha o identificador", async () => {
    state.db = fixture({ members: [member] }).db;
    await expect(findMemberRowByEmail("p1", "ada@example.com")).resolves.toEqual(member);
    await expect(findMemberRowByStudentSection("p1", "s1")).resolves.toEqual(member);
    await expect(findMemberRowByTeacherId("p1", "t1")).resolves.toEqual(member);
    await expect(findProjectMemberRow("p1", "m1")).resolves.toEqual(member);

    state.db = fixture({ members: [] }).db;
    await expect(findMemberRowByEmail("p1", "ada@example.com")).resolves.toBeNull();
    await expect(findProjectMemberRow("p1", "m1")).resolves.toBeNull();
  });

  it("cambia el correo de la invitación y la devuelve a pendiente", async () => {
    const updated = { ...member, email: "nuevo@example.com" };
    const fixtureWithUpdate = fixture({ updated });
    state.db = fixtureWithUpdate.db;
    await expect(updateMemberInvitationEmailRow("p1", "m1", "ada@example.com", "nuevo@example.com"))
      .resolves.toEqual(updated);
    expect(fixtureWithUpdate.sets[0]).toEqual({ email: "nuevo@example.com", status: "pending", userId: null });

    state.db = fixture({ updated: null }).db;
    await expect(updateMemberInvitationEmailRow("p1", "m1", "ada@example.com", "nuevo@example.com"))
      .resolves.toBeNull();
  });

  it("inserta una invitación pendiente y devuelve la fila creada", async () => {
    const creada = fixture({ created: member });
    state.db = creada.db;
    await expect(insertMemberRow(member)).resolves.toEqual(member);
    expect(creada.inserts[0]).toEqual(member);

    state.db = fixture({ created: null }).db;
    await expect(insertMemberRow(member)).resolves.toBeNull();
  });

  it("borra por identificador o devuelve null si ya no existe", async () => {
    state.db = fixture({ deletedId: "m1" }).db;
    await expect(deleteMemberRow("p1", "m1")).resolves.toBe("m1");

    state.db = fixture({ deletedId: null }).db;
    await expect(deleteMemberRow("p1", "m1")).resolves.toBeNull();
  });
});
