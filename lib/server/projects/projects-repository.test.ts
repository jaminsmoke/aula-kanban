import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../../../db", () => ({ getDb: () => state.db }));

import {
  appDocuments,
  boards,
  deletedStudents,
  deletedTeachers,
  projectMembers,
  projects,
  students,
  taskAssignees,
  tasks,
  teachers,
  uploads,
} from "../../../db/schema";
import { DEMO_PROJECT_ID } from "../../domain/demo";
import {
  countProjectContent,
  deleteProjectRows,
  findDemoProjectRow,
  findProjectRow,
  insertProjectRow,
  listProjectRows,
} from "./projects-repository";

type Project = { id: string; name: string; createdAt: number };

const proyecto: Project = { id: "p1", name: "Aula 1", createdAt: 1 };

/**
 * Traduce una tabla de Drizzle a su nombre SQL para el fixture.
 * @param table - Tabla importada del esquema.
 * @returns El nombre de la tabla.
 */
function tableName(table: unknown): string {
  if (table === projects) return "projects";
  if (table === boards) return "boards";
  if (table === appDocuments) return "app_documents";
  if (table === taskAssignees) return "task_assignees";
  if (table === tasks) return "tasks";
  if (table === projectMembers) return "project_members";
  if (table === students) return "students";
  if (table === teachers) return "teachers";
  if (table === deletedStudents) return "deleted_students";
  if (table === deletedTeachers) return "deleted_teachers";
  if (table === uploads) return "uploads";
  return "otra";
}

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
 * @param input - Filas de proyecto, recuentos, resultado del alta y cambios.
 * @returns La base, las tablas borradas y los valores insertados.
 */
function fixture(input: {
  projects?: Project[];
  counts?: Record<string, number>;
  insertResult?: Project[];
  changes?: number;
} = {}) {
  const deletedTables: string[] = [];
  const inserts: unknown[] = [];
  const db = {
    select: (selection?: unknown) => ({
      from: (table: unknown) => {
        if (selection) return query([{ value: input.counts?.[tableName(table)] ?? 0 }]);
        return query(input.projects ?? []);
      },
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserts.push(values);
        return {
          onConflictDoNothing: () => ({
            returning: async () => input.insertResult ?? [],
          }),
        };
      },
    }),
    delete: (table: unknown) => {
      deletedTables.push(tableName(table));
      return { where: () => ({ table: tableName(table) }) };
    },
    batch: async (statements: unknown[]) =>
      statements.map((_, index) => (index === statements.length - 1 ? { meta: { changes: input.changes ?? 1 } } : {})),
  };
  return { db, deletedTables, inserts };
}

describe("repositorio de proyectos", () => {
  it("inserta sin pisar un identificador existente", async () => {
    const created = fixture({ insertResult: [proyecto] });
    state.db = created.db;
    await expect(insertProjectRow(proyecto)).resolves.toEqual(proyecto);
    expect(created.inserts[0]).toEqual(proyecto);

    state.db = fixture({ insertResult: [] }).db;
    await expect(insertProjectRow(proyecto)).resolves.toBeNull();
  });

  it("lee un proyecto, el demo y la lista completa", async () => {
    state.db = fixture({ projects: [proyecto] }).db;
    await expect(findProjectRow("p1")).resolves.toEqual(proyecto);
    await expect(listProjectRows()).resolves.toEqual([proyecto]);

    state.db = fixture({ projects: [{ ...proyecto, id: DEMO_PROJECT_ID }] }).db;
    await expect(findDemoProjectRow()).resolves.toMatchObject({ id: DEMO_PROJECT_ID });
  });

  it("suma tareas, fichas, miembros, pizarras, documentos y archivos", async () => {
    state.db = fixture({
      counts: {
        tasks: 2,
        students: 3,
        teachers: 4,
        project_members: 5,
        boards: 6,
        app_documents: 7,
        uploads: 8,
      },
    }).db;
    await expect(countProjectContent("p1")).resolves.toEqual({
      tareas: 2,
      fichas: 7,
      miembros: 5,
      pizarras: 6,
      documentos: 7,
      archivos: 8,
    });
  });

  it("borra en orden de dependencias y devuelve si el proyecto existía", async () => {
    const deleted = fixture({ changes: 1 });
    state.db = deleted.db;
    await expect(deleteProjectRows("p1")).resolves.toBe(true);
    expect(deleted.deletedTables).toEqual([
      "boards",
      "app_documents",
      "task_assignees",
      "tasks",
      "project_members",
      "students",
      "teachers",
      "deleted_students",
      "deleted_teachers",
      "projects",
    ]);

    state.db = fixture({ changes: 0 }).db;
    await expect(deleteProjectRows("p1")).resolves.toBe(false);
  });
});
