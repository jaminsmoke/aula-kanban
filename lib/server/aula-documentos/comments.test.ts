import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  documentUpdatedAt: vi.fn(),
  selectRows: vi.fn(),
  selectRow: vi.fn(),
  countRows: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./documents-repository", () => ({
  selectAulaDocumentUpdatedAt: mocks.documentUpdatedAt,
}));

vi.mock("./comments-repository", () => ({
  countAulaCommentRows: mocks.countRows,
  insertAulaCommentRow: mocks.insert,
  selectAulaCommentRow: mocks.selectRow,
  selectAulaCommentRows: mocks.selectRows,
  updateAulaCommentRowIfCurrent: mocks.update,
}));

import {
  createAulaComment,
  listAulaComments,
  updateAulaComment,
} from "./comments";

const anchor = {
  from: 1,
  to: 5,
  quote: "Hola",
  prefix: "",
  suffix: " mundo",
  blockIndex: 0,
};

const student = { userId: "u1", displayName: "Ana", role: "student" as const };
const teacher = { userId: "u2", displayName: "Docente", role: "teacher" as const };

/**
 * Construye una fila de comentario.
 * @param overrides - Campos que se cambian.
 * @returns La fila.
 */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    projectId: "p1",
    documentId: "doc1",
    parentId: null,
    authorUserId: "u1",
    authorName: "Ana",
    body: "Comentario",
    anchor: JSON.stringify(anchor),
    status: "open",
    createdAt: 1,
    updatedAt: 1,
    resolvedAt: null,
    resolvedBy: null,
    ...overrides,
  };
}

describe("servicio de comentarios", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.documentUpdatedAt.mockResolvedValue(5);
    mocks.countRows.mockResolvedValue(0);
    mocks.selectRows.mockResolvedValue([]);
    mocks.selectRow.mockResolvedValue(row());
    mocks.insert.mockImplementation(async (input: Record<string, unknown>) => row(input));
    mocks.update.mockImplementation(async (input: Record<string, unknown>) => row(input));
  });

  it("crea un comentario para un estudiante miembro", async () => {
    const result = await createAulaComment({
      projectId: "p1",
      documentId: "doc1",
      parentId: null,
      body: "Revisar esta parte.",
      anchor,
      actor: student,
    });

    expect(result).toMatchObject({
      status: "ok",
      value: {
        body: "Revisar esta parte.",
        authorName: "Ana",
        capabilities: { canEdit: true, canDelete: true, canResolve: false },
      },
    });
  });

  it("rechaza comentarios de invitados y anclas inválidas", async () => {
    await expect(createAulaComment({
      projectId: "p1",
      documentId: "doc1",
      parentId: null,
      body: "Hola",
      anchor,
      actor: { ...student, role: "guest" },
    })).resolves.toEqual({ status: "forbidden" });

    await expect(createAulaComment({
      projectId: "p1",
      documentId: "doc1",
      parentId: null,
      body: "Hola",
      anchor: { from: -1 },
      actor: student,
    })).resolves.toEqual({ status: "invalid" });
  });

  it("construye hilos de un nivel", async () => {
    mocks.selectRows.mockResolvedValue([
      row(),
      row({ id: "c2", parentId: "c1", authorUserId: "u2", authorName: "Docente", body: "Respuesta" }),
    ]);
    const result = await listAulaComments({ projectId: "p1", documentId: "doc1", actor: teacher });

    expect(result).toMatchObject({
      status: "ok",
      value: {
        total: 2,
        threads: [{ id: "c1", replies: [{ id: "c2", body: "Respuesta" }] }],
      },
    });
  });

  it("solo permite resolver a profesorado o administración", async () => {
    await expect(updateAulaComment({
      projectId: "p1",
      documentId: "doc1",
      commentId: "c1",
      action: "resolve",
      expectedUpdatedAt: 1,
      actor: student,
    })).resolves.toEqual({ status: "forbidden" });

    const result = await updateAulaComment({
      projectId: "p1",
      documentId: "doc1",
      commentId: "c1",
      action: "resolve",
      expectedUpdatedAt: 1,
      actor: teacher,
    });
    expect(result).toMatchObject({ status: "ok", value: { status: "resolved" } });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      id: "c1",
      status: "resolved",
      expectedUpdatedAt: 1,
    }));
  });

  it("devuelve conflicto si la fila cambió", async () => {
    mocks.update.mockResolvedValue(null);
    await expect(updateAulaComment({
      projectId: "p1",
      documentId: "doc1",
      commentId: "c1",
      action: "delete",
      expectedUpdatedAt: 1,
      actor: teacher,
    })).resolves.toEqual({ status: "conflict" });
  });
});
