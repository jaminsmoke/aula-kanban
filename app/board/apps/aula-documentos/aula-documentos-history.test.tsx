import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { documentMock, props, resetAulaDocumentMocks, savedDocument } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("historial de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("crea una versión, la previsualiza y la restaura", async () => {
    const restored = savedDocument("Restaurada");
    const versions: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/versions?") && init?.method === "POST") {
        const version = {
          id: "v1",
          projectId: "p1",
          documentId: "legacy",
          name: "Entrega",
          schemaVersion: 3,
          sizeBytes: 120,
          createdBy: "u1",
          createdByName: "Docente",
          createdAt: 10,
          kind: "manual",
          baseUpdatedAt: 5,
        };
        versions.push(version);
        return Response.json({ version }, { status: 201 });
      }
      if (url.includes("/versions?") && (!init || !init.method || init.method === "GET")) {
        return Response.json({ versions, total: versions.length });
      }
      if (url.includes("/versions/v1?") && (!init || !init.method || init.method === "GET")) {
        return Response.json({ version: { ...versions[0], state: restored } });
      }
      if (url.includes("/versions/v1/restore?")) {
        return Response.json({ document: restored, updatedAt: 11 });
      }
      return Response.json({ message: "No encontrado." }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Historial de versiones" }));
    expect(await screen.findByRole("complementary", { name: "Historial de versiones" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nueva versión"), { target: { value: "Entrega" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar versión" }));
    expect(await screen.findByText("Entrega")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    expect(await screen.findByText("Contenido de prueba.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect((screen.getByLabelText("Título del documento") as HTMLInputElement).value).toBe("Restaurada"));
    expect(screen.getByText("Versión restaurada.")).toBeTruthy();
  });

  it("oculta el historial a estudiantes", async () => {
    render(<AulaDocumentosApp projectId={props.projectId} role="student" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Historial de versiones" })).toBeNull();
  });
});
