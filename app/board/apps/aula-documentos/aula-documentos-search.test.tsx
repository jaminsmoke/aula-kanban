import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { props, resetAulaDocumentMocks } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("búsqueda y reemplazo de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("busca, navega, reemplaza y cierra la barra", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Buscar en el documento" }));
    const query = screen.getByLabelText("Texto que buscar");
    fireEvent.change(query, { target: { value: "clase" } });
    expect(await screen.findByText("1 de 1")).toBeTruthy();

    fireEvent.keyDown(screen.getByLabelText("Contenido del documento"), { key: "h", ctrlKey: true });
    fireEvent.change(query, { target: { value: "clase" } });
    fireEvent.change(screen.getByLabelText("Texto de reemplazo"), { target: { value: "material" } });
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar" }));

    await waitFor(() => expect(screen.getByLabelText("Contenido del documento").textContent).toContain("material"));
    expect(screen.getByText("0 resultados")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar búsqueda" }));
    expect(screen.queryByLabelText("Texto que buscar")).toBeNull();
  });
});
