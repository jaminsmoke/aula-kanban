import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readLegacy: vi.fn(),
  selectRow: vi.fn(),
  selectSummaries: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  selectUpdatedAt: vi.fn(),
}));

vi.mock("../apps/app-documents", () => ({
  MAX_APP_DOCUMENT_CHARS: 200_000,
  readAppDocument: mocks.readLegacy,
}));

vi.mock("./documents-repository", () => ({
  selectAulaDocumentRow: mocks.selectRow,
  selectAulaDocumentSummaries: mocks.selectSummaries,
  insertAulaDocumentRow: mocks.insert,
  updateAulaDocumentRowIfCurrent: mocks.update,
  selectAulaDocumentUpdatedAt: mocks.selectUpdatedAt,
}));

import {
  LEGACY_AULA_DOCUMENT_ID,
  listAulaDocumentSuite,
  migrateLegacyAulaDocument,
  readAulaDocument,
  saveAulaDocumentIfCurrent,
} from "./documents";

/** Documento de prueba válido. */
const document = {
  schemaVersion: 3,
  title: "Clase",
  content: {
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "Hola mundo" }],
    }],
  },
};

/**
 * Construye una fila de la suite.
 * @param overrides - Campos que se cambian.
 * @returns La fila.
 */
function row(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "p1",
    id: LEGACY_AULA_DOCUMENT_ID,
    title: "Clase",
    excerpt: "Hola mundo",
    state: JSON.stringify(document),
    status: "active",
    createdAt: 5,
    updatedAt: 5,
    archivedAt: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

describe("suite de Aula Documentos", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.selectRow.mockResolvedValue(null);
    mocks.readLegacy.mockResolvedValue({ state: document, updatedAt: 7 });
    mocks.insert.mockImplementation(async (input: Record<string, unknown>) => row(input));
    mocks.selectSummaries.mockResolvedValue([]);
    mocks.selectUpdatedAt.mockResolvedValue(12);
  });

  it("migra el documento único a legacy sin modificar la fila antigua", async () => {
    const migrated = await migrateLegacyAulaDocument("p1");

    expect(migrated).toMatchObject({ id: "legacy", title: "Clase", excerpt: "Hola mundo" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "p1",
      id: "legacy",
      state: JSON.stringify(document),
      updatedAt: 7,
      createdBy: null,
      updatedBy: null,
    }));
    expect(mocks.readLegacy).toHaveBeenCalledWith("p1", "aula-documentos");
  });

  it("no vuelve a insertar legacy si ya existe", async () => {
    mocks.selectRow.mockResolvedValue(row());
    const migrated = await migrateLegacyAulaDocument("p1");

    expect(migrated?.id).toBe("legacy");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.readLegacy).not.toHaveBeenCalled();
  });

  it("no crea nada si el proyecto nunca guardó un documento", async () => {
    mocks.readLegacy.mockResolvedValue(null);
    await expect(migrateLegacyAulaDocument("p1")).resolves.toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("agrupa la lista por estado sin devolver el estado completo", async () => {
    mocks.selectSummaries.mockResolvedValue([
      row({ id: "activo", status: "active" }),
      row({ id: "archivado", status: "archived", archivedAt: 8 }),
      row({ id: "borrado", status: "deleted", archivedAt: 9 }),
    ]);
    mocks.readLegacy.mockResolvedValue(null);

    const suite = await listAulaDocumentSuite("p1");

    expect(suite.active.map((item) => item.id)).toEqual(["activo"]);
    expect(suite.archived.map((item) => item.id)).toEqual(["archivado"]);
    expect(suite.deleted.map((item) => item.id)).toEqual(["borrado"]);
    expect(suite.active[0]).not.toHaveProperty("state");
  });

  it("lee el estado canónico de un documento", async () => {
    mocks.selectRow.mockResolvedValue(row());
    await expect(readAulaDocument("p1", "legacy")).resolves.toMatchObject({
      id: "legacy",
      title: "Clase",
      state: document,
    });
  });

  it("devuelve conflicto cuando la versión cambió", async () => {
    mocks.update.mockResolvedValue(null);
    await expect(saveAulaDocumentIfCurrent({
      projectId: "p1",
      id: "legacy",
      state: document,
      updatedByUserId: "u1",
      expectedUpdatedAt: 5,
    })).resolves.toEqual({ status: "conflict", updatedAt: 12 });
  });

  it("guarda cuando la versión sigue vigente", async () => {
    mocks.update.mockResolvedValue(9);
    await expect(saveAulaDocumentIfCurrent({
      projectId: "p1",
      id: "legacy",
      state: document,
      updatedByUserId: "u1",
      expectedUpdatedAt: 5,
    })).resolves.toEqual({ status: "saved", updatedAt: 9 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      title: "Clase",
      excerpt: "Hola mundo",
      expectedUpdatedAt: 5,
      updatedBy: "u1",
    }));
  });

  it("rechaza un estado demasiado grande antes de escribir", async () => {
    await expect(saveAulaDocumentIfCurrent({
      projectId: "p1",
      id: "legacy",
      state: { ...document, content: { type: "doc", content: [{ type: "text", text: "x".repeat(200_001) }] } },
      updatedByUserId: "u1",
      expectedUpdatedAt: 5,
    })).resolves.toEqual({ status: "too-large" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("trata un estado no serializable como inválido", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await expect(saveAulaDocumentIfCurrent({
      projectId: "p1",
      id: "legacy",
      state: circular,
      updatedByUserId: "u1",
      expectedUpdatedAt: 5,
    })).resolves.toEqual({ status: "invalid" });
  });
});
