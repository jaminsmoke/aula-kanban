import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { props, resetAulaDocumentMocks } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("navegación de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("salta a secciones y diapositivas y abre la vista previa en la activa", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    const outline = await screen.findByRole("navigation", { name: "Esquema del documento" });
    expect(within(outline).getByRole("button", { name: "Introducción" })).toBeTruthy();
    expect(within(outline).getByRole("button", { name: "Plan de trabajo" })).toBeTruthy();

    fireEvent.click(within(outline).getByRole("button", { name: "Plan de trabajo" }));
    await waitFor(() => {
      expect(within(outline).getByRole("button", { name: "Plan de trabajo" }).getAttribute("aria-current")).toBe("location");
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 2: Plan de trabajo" }).getAttribute("aria-current")).toBe("location");
    });

    fireEvent.click(screen.getByRole("button", { name: "Vista previa desde la diapositiva 2" }));
    expect(await screen.findByText("Diapositiva 2 de 2")).toBeTruthy();
  });
});
