import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readDocument: vi.fn(),
  selectSummaries: vi.fn(),
  selectRow: vi.fn(),
  countRows: vi.fn(),
  insert: vi.fn(),
  updateState: vi.fn(),
  purge: vi.fn(),
}));

vi.mock("./documents", () => ({
  readAulaDocument: mocks.readDocument,
}));

vi.mock("./documents-repository", () => ({
  updateAulaDocumentStateIfCurrent: mocks.updateState,
}));

vi.mock("./versions-repository", () => ({
  countAulaVersionRows: mocks.countRows,
  deleteAulaVersionsBefore: mocks.purge,
  insertAulaVersionRow: mocks.insert,
  selectAulaVersionRow: mocks.selectRow,
  selectAulaVersionSummaries: mocks.selectSummaries,
}));

import { createAulaVersion, listAulaVersions, restoreAulaVersion } from "./versions";

const document = {
  schemaVersion: 3,
  title: "Clase",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hola" }] }] },
};

const teacher = { userId: "u1", displayName: "Docente", role: "teacher" as const };
const student = { userId: "u2", displayName: "Alumno", role: "student" as const };

/**
 * Construye una versión.
 * @param overrides - Campos que se cambian.
 * @returns Fila.
 */
function row(overrides: Record<string, unknown> = {}) {
  const state = JSON.stringify(document);
  return {
    id: "v1",
    projectId: "p1",
    documentId: "d1",
    name: "Entrega",
    state,
    schemaVersion: 3,
    sizeBytes: state.length,
    createdBy: "u1",
    createdByName: "Docente",
    createdAt: 10,
    kind: "manual",
    baseUpdatedAt: 5,
    ...overrides,
  };
}

describe("servicio de versiones", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readDocument.mockResolvedValue({
      id: "d1",
      projectId: "p1",
      title: "Clase",
      excerpt: "Hola",
      status: "active",
      createdAt: 1,
      updatedAt: 5,
      archivedAt: null,
      createdBy: "u1",
      updatedBy: "u1",
      state: document,
    });
    mocks.selectSummaries.mockResolvedValue([]);
    mocks.selectRow.mockResolvedValue(row());
    mocks.countRows.mockResolvedValue(0);
    mocks.insert.mockImplementation(async (input: Record<string, unknown>) => row(input));
    mocks.updateState.mockResolvedValue(9);
    mocks.purge.mockResolvedValue(undefined);
  });

  it("lista y crea versiones solo para profesorado", async () => {
    await expect(listAulaVersions({ projectId: "p1", documentId: "d1", actor: student }))
      .resolves.toEqual({ status: "forbidden" });
    const list = await listAulaVersions({ projectId: "p1", documentId: "d1", actor: teacher });
    expect(list).toEqual({ status: "ok", value: { versions: [], total: 0 } });

    const created = await createAulaVersion({
      projectId: "p1",
      documentId: "d1",
      name: "Entrega",
      actor: teacher,
    });
    expect(created).toMatchObject({ status: "ok", value: { name: "Entrega", kind: "manual" } });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      documentId: "d1",
      kind: "manual",
      baseUpdatedAt: 5,
    }));
  });

  it("restaura con snapshot previo y conflicto optimista", async () => {
    const result = await restoreAulaVersion({
      projectId: "p1",
      documentId: "d1",
      versionId: "v1",
      expectedUpdatedAt: 5,
      actor: teacher,
    });
    expect(result).toMatchObject({ status: "ok", value: { updatedAt: 9 } });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ kind: "pre-restore" }));
    expect(mocks.updateState).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: 5, id: "d1" }));

    mocks.updateState.mockResolvedValue(null);
    await expect(restoreAulaVersion({
      projectId: "p1",
      documentId: "d1",
      versionId: "v1",
      expectedUpdatedAt: 5,
      actor: teacher,
    })).resolves.toEqual({ status: "conflict" });
  });

  it("rechaza una versión que no pertenece al documento", async () => {
    mocks.selectRow.mockResolvedValue(null);
    await expect(restoreAulaVersion({
      projectId: "p1",
      documentId: "d1",
      versionId: "otra",
      expectedUpdatedAt: 5,
      actor: teacher,
    })).resolves.toEqual({ status: "not-found" });
    expect(mocks.updateState).not.toHaveBeenCalled();
  });
});
