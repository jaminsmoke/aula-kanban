import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { props, resetAulaDocumentMocks, suiteMock } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("estructura editable de diapositivas", () => {
  afterEach(() => {
    suiteMock.documentId = "legacy";
    resetAulaDocumentMocks();
  });

  it("mueve, duplica, elimina y deshace la estructura con notas en el documento", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(screen.getByRole("button", { name: "Bajar diapositiva 1: Introducción" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 1: Plan de trabajo" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 2: Introducción" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Deshacer cambio de estructura" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 1: Introducción" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Duplicar diapositiva 1: Introducción" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 2: Introducción" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 3: Plan de trabajo" })).toBeTruthy();
    });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar diapositiva 2: Introducción" }));
    expect(screen.getByRole("button", { name: "Ir a la diapositiva 3: Plan de trabajo" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar diapositiva 2: Introducción" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Ir a la diapositiva 3: Plan de trabajo" })).toBeNull();
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 2: Plan de trabajo" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Deshacer cambio de estructura" }));
    expect(await screen.findByRole("button", { name: "Ir a la diapositiva 3: Plan de trabajo" })).toBeTruthy();
  });

  it("mueve la nota con la diapositiva y la restaura al deshacer", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    await screen.findByRole("dialog", { name: "Vista previa: Documento de ejemplo" });
    fireEvent.change(screen.getByLabelText(/Notas del orador/), { target: { value: "Nota de la primera" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar vista previa" }));

    fireEvent.click(screen.getByRole("button", { name: "Bajar diapositiva 1: Introducción" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ir a la diapositiva 2: Introducción" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Vista previa desde la diapositiva 2" }));
    await screen.findByRole("dialog", { name: "Vista previa: Documento de ejemplo" });
    expect((screen.getByLabelText(/Notas del orador/) as HTMLTextAreaElement).value).toBe("Nota de la primera");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar vista previa" }));

    fireEvent.click(screen.getByRole("button", { name: "Deshacer cambio de estructura" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ir a la diapositiva 1: Introducción" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    await screen.findByRole("dialog", { name: "Vista previa: Documento de ejemplo" });
    expect((screen.getByLabelText(/Notas del orador/) as HTMLTextAreaElement).value).toBe("Nota de la primera");
  });

  it("no ofrece edición de estructura en modo lectura", async () => {
    render(<AulaDocumentosApp projectId={props.projectId} role="guest" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    expect(screen.queryByRole("button", { name: /Duplicar diapositiva/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar diapositiva/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deshacer cambio de estructura" })).toBeNull();
  });
});
