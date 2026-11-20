import { afterEach, describe, expect, it } from "vitest";
import { documentMock, resetAulaDocumentMocks } from "../../../../test-utils/aula-documentos";

describe("harness de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("parte de mocks limpios y sin llamadas", () => {
    expect(documentMock.loading).toBe(false);
    expect(documentMock.load).not.toHaveBeenCalled();
    expect(documentMock.save).not.toHaveBeenCalled();
    expect(documentMock.saveVersioned).not.toHaveBeenCalled();
  });

  it("restaura el estado mutable y las llamadas después de cada prueba", async () => {
    documentMock.loading = true;
    documentMock.load.mockResolvedValue({ state: "modificado", updatedAt: 7, ok: false });
    documentMock.save.mockResolvedValue(false);
    await documentMock.load();
    await documentMock.save({}, null);

    resetAulaDocumentMocks();

    expect(documentMock.loading).toBe(false);
    expect(documentMock.load).not.toHaveBeenCalled();
    expect(documentMock.save).not.toHaveBeenCalled();
    await expect(documentMock.load()).resolves.toEqual({ state: null, updatedAt: null, ok: true });
    await expect(documentMock.save({}, null)).resolves.toBe(true);
  });
});
