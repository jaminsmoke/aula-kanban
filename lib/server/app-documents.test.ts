import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  insertConflict: vi.fn(),
  insertReturning: vi.fn(),
  select: vi.fn(),
  selectFrom: vi.fn(),
  selectWhere: vi.fn(),
}));

vi.mock("../../db", () => ({
  getDb: () => ({ update: mocks.update, insert: mocks.insert, select: mocks.select }),
}));

import { saveAppDocumentIfCurrent } from "./app-documents";

const input = {
  projectId: "project1",
  appId: "aula-documentos",
  state: '{"title":"Clase"}',
  updatedByUserId: "user1",
};

describe("guardado condicional de documentos", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.update.mockReturnValue({ set: mocks.updateSet });
    mocks.insertValues.mockReturnValue({ onConflictDoNothing: mocks.insertConflict });
    mocks.insertConflict.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insert.mockReturnValue({ values: mocks.insertValues });
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.updateReturning.mockResolvedValue([]);
    mocks.insertReturning.mockResolvedValue([]);
    mocks.selectWhere.mockResolvedValue([{ updatedAt: 12 }]);
  });

  it("guarda cuando la versión esperada sigue vigente", async () => {
    mocks.updateReturning.mockResolvedValue([{ updatedAt: 7 }]);

    await expect(saveAppDocumentIfCurrent({ ...input, expectedUpdatedAt: 5 }))
      .resolves.toEqual({ status: "saved", updatedAt: 7 });
    expect(mocks.updateSet).toHaveBeenCalledWith(expect.objectContaining({
      state: input.state,
      updatedByUserId: input.updatedByUserId,
    }));
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("no inserta cuando la versión esperada ya no existe", async () => {
    mocks.selectWhere.mockResolvedValue([{ updatedAt: 9 }]);

    await expect(saveAppDocumentIfCurrent({ ...input, expectedUpdatedAt: 5 }))
      .resolves.toEqual({ status: "conflict", updatedAt: 9 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("crea el documento solo cuando no existe una versión previa", async () => {
    mocks.insertReturning.mockResolvedValue([{ updatedAt: 7 }]);

    await expect(saveAppDocumentIfCurrent({ ...input, expectedUpdatedAt: null }))
      .resolves.toEqual({ status: "saved", updatedAt: 7 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("no actualiza cuando otro cliente creó el documento primero", async () => {
    mocks.selectWhere.mockResolvedValue([{ updatedAt: 9 }]);

    await expect(saveAppDocumentIfCurrent({ ...input, expectedUpdatedAt: null }))
      .resolves.toEqual({ status: "conflict", updatedAt: 9 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
