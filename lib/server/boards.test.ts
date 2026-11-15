import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../../db", () => ({ getDb: () => state.db }));

import { boards, taskAssignees, tasks } from "../../db/schema";
import type { Access } from "./project-access";
import {
  BOARD_CONFLICT,
  BOARD_OWNER_NOT_FOUND,
  BOARD_WRITE_FORBIDDEN,
  MAX_BOARD_SNAPSHOT_BYTES,
  canWrite,
  ownerExists,
  readBoard,
  saveBoard,
} from "./boards";

type BoardRow = {
  id: string;
  projectId: string;
  ownerType: string;
  ownerId: string;
  snapshot: string;
  revision: number;
  updatedAt: number;
};

type FakeInput = {
  task?: boolean;
  assignees?: Array<{ kind: string; profileId: string }>;
  board?: BoardRow | null;
  insertResult?: BoardRow[];
  updateResult?: BoardRow[];
};

function fixture(input: FakeInput) {
  const calls = {
    inserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
  };
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === tasks) return input.task ? [{ id: "task1" }] : [];
          if (table === taskAssignees) return input.assignees ?? [];
          if (table === boards) return input.board ? [input.board] : [];
          return [];
        },
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            calls.inserts.push(values);
            return input.insertResult ?? [];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            calls.updates.push(values);
            return input.updateResult ?? [];
          },
        }),
      }),
    }),
  };
  return { db, calls };
}

function board(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    id: "board1",
    projectId: "project1",
    ownerType: "task",
    ownerId: "task1",
    snapshot: '{"elements":[]}',
    revision: 1,
    updatedAt: 10,
    ...overrides,
  };
}

function access(role: Access["role"], studentSection: string | null = null): Access {
  return {
    user: { userId: "u1", email: "u1@example.com", displayName: "Uno", fullName: null },
    role,
    studentSection,
    teacherId: null,
  };
}

describe("servicio de pizarras", () => {
  beforeEach(() => {
    state.db = null;
  });

  it("reconoce tareas y pizarras de proyecto o espacio", async () => {
    state.db = fixture({ task: true }).db;
    expect(await ownerExists("project1", "task", "task1")).toBe(true);
    expect(await ownerExists("project1", "project", "project1")).toBe(true);
    expect(await ownerExists("project1", "space", "project1")).toBe(true);
    expect(await ownerExists("project1", "space", "otro")).toBe(false);

    state.db = fixture({ task: false }).db;
    expect(await ownerExists("project1", "task", "task1")).toBe(false);
  });

  it("permite escribir al profesorado y bloquea a invitados y alumnado fuera de su tarea", async () => {
    state.db = fixture({}).db;
    expect(await canWrite(access("teacher"), "project1", "project", "project1")).toBe(true);
    expect(await canWrite(access("guest"), "project1", "space", "project1")).toBe(false);

    state.db = fixture({ assignees: [{ kind: "student", profileId: "s1" }] }).db;
    expect(await canWrite(access("student", "s1"), "project1", "task", "task1")).toBe(true);

    state.db = fixture({ assignees: [{ kind: "student", profileId: "s2" }] }).db;
    expect(await canWrite(access("student", "s1"), "project1", "task", "task1")).toBe(false);
    expect(await canWrite(access("student", "s1"), "project1", "space", "project1")).toBe(false);
  });

  it("devuelve una pizarra vacía cuando todavía no existe", async () => {
    state.db = fixture({ task: true }).db;
    expect(await readBoard("project1", "task", "task1")).toEqual({
      ok: true,
      value: { ownerType: "task", ownerId: "task1", snapshot: "", revision: 0, updatedAt: 0 },
    });
  });

  it("lee una pizarra existente y rechaza un dueño inexistente", async () => {
    state.db = fixture({ task: true, board: board() }).db;
    expect(await readBoard("project1", "task", "task1")).toEqual({
      ok: true,
      value: { ownerType: "task", ownerId: "task1", snapshot: '{"elements":[]}', revision: 1, updatedAt: 10 },
    });

    state.db = fixture({ task: false }).db;
    expect(await readBoard("project1", "task", "task1")).toEqual({
      ok: false,
      status: 404,
      message: BOARD_OWNER_NOT_FOUND,
    });
  });

  it("crea con revisión 0 y actualiza con la revisión esperada", async () => {
    const created = board({ revision: 1, snapshot: '{"elements":[1]}' });
    const insert = fixture({ task: true, insertResult: [created] });
    state.db = insert.db;
    expect(await saveBoard({
      projectId: "project1",
      access: access("teacher"),
      ownerType: "task",
      ownerId: "task1",
      snapshot: '{"elements":[1]}',
      revision: 0,
    })).toEqual({
      ok: true,
      value: { ownerType: "task", ownerId: "task1", snapshot: '{"elements":[1]}', revision: 1, updatedAt: 10 },
    });
    expect(insert.calls.inserts[0]).toMatchObject({ projectId: "project1", ownerId: "task1", revision: 1 });

    const updated = board({ revision: 3, snapshot: '{"elements":[2]}' });
    const update = fixture({ task: true, updateResult: [updated] });
    state.db = update.db;
    expect(await saveBoard({
      projectId: "project1",
      access: access("teacher"),
      ownerType: "task",
      ownerId: "task1",
      snapshot: '{"elements":[2]}',
      revision: 2,
    })).toEqual({
      ok: true,
      value: { ownerType: "task", ownerId: "task1", snapshot: '{"elements":[2]}', revision: 3, updatedAt: 10 },
    });
    expect(update.calls.updates[0]).toMatchObject({ snapshot: '{"elements":[2]}' });
  });

  it("devuelve la revisión actual cuando otra sesión guardó antes", async () => {
    const current = board({ revision: 5 });
    state.db = fixture({ task: true, board: current, updateResult: [] }).db;
    expect(await saveBoard({
      projectId: "project1",
      access: access("teacher"),
      ownerType: "task",
      ownerId: "task1",
      snapshot: '{"elements":[]}',
      revision: 4,
    })).toEqual({
      ok: false,
      status: 409,
      message: BOARD_CONFLICT,
      revisionActual: 5,
    });
  });

  it("aplica permisos y tamaño antes de escribir", async () => {
    const guest = fixture({ task: true });
    state.db = guest.db;
    expect(await saveBoard({
      projectId: "project1",
      access: access("guest"),
      ownerType: "task",
      ownerId: "task1",
      snapshot: '{"elements":[]}',
      revision: 1,
    })).toEqual({ ok: false, status: 403, message: BOARD_WRITE_FORBIDDEN });
    expect(guest.calls.inserts).toHaveLength(0);
    expect(guest.calls.updates).toHaveLength(0);

    state.db = fixture({ task: true }).db;
    expect(await saveBoard({
      projectId: "project1",
      access: access("teacher"),
      ownerType: "task",
      ownerId: "task1",
      snapshot: "x".repeat(MAX_BOARD_SNAPSHOT_BYTES + 1),
      revision: 1,
    })).toEqual({ ok: false, status: 400, message: "La pizarra no es válida o supera los 2 MB." });
  });
});
