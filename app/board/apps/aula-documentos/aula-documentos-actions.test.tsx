import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { props, resetAulaDocumentMocks } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("modelo de acciones de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("comparte acciones identificadas entre escritorio y móvil", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Archivo" }));
    expect(screen.getByRole("menuitem", { name: "Nuevo documento" }).getAttribute("data-action-id")).toBe("new-document");
    fireEvent.keyDown(screen.getByRole("menu", { name: "Archivo" }), { key: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: "Acciones del documento" }));
    const menu = screen.getByRole("menu", { name: "Acciones del documento" });
    for (const group of ["Archivo", "Importar", "Exportar", "Insertar", "Documento"]) {
      expect(within(menu).getByRole("group", { name: group })).toBeTruthy();
    }
    const ids = within(menu).getAllByRole("menuitem").map((item) => item.getAttribute("data-action-id"));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("save-document");
    expect(ids).toContain("present-document");
    expect(ids).toContain("insert-mermaid");
  });
});
