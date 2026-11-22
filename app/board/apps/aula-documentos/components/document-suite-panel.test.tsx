import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  view: {
    suite: {
      active: [
        { id: "doc1", projectId: "p1", title: "Clase", excerpt: "Resumen", status: "active", createdAt: 1, updatedAt: 2, archivedAt: null, createdBy: null, updatedBy: null },
        { id: "doc2", projectId: "p1", title: "Guía", excerpt: "", status: "active", createdAt: 1, updatedAt: 2, archivedAt: null, createdBy: null, updatedBy: null },
      ],
      archived: [{ id: "old", projectId: "p1", title: "Antiguo", excerpt: "", status: "archived", createdAt: 1, updatedAt: 2, archivedAt: 2, createdBy: null, updatedBy: null }],
      deleted: [],
    },
    suiteDocumentId: "doc1",
    suiteLoading: false,
    suiteInitializing: false,
    suiteError: null as string | null,
    readOnly: false,
    openSuiteDocument: vi.fn(),
    createSuiteDocument: vi.fn(),
    duplicateSuiteDocument: vi.fn(),
    renameSuiteDocument: vi.fn(),
    archiveSuiteDocument: vi.fn(),
    deleteSuiteDocument: vi.fn(),
    restoreSuiteDocument: vi.fn(),
  },
}));

vi.mock("../aula-documentos-context", () => ({
  useAulaDocumentosView: () => mocks.view,
}));

import { DocumentSuitePanel } from "./document-suite-panel";

const initialSuite = mocks.view.suite;

describe("panel de la suite documental", () => {
  beforeEach(() => {
    for (const value of Object.values(mocks.view)) {
      if (typeof value === "function" && "mockReset" in value) value.mockReset();
    }
    mocks.view.suite = initialSuite;
    mocks.view.suiteDocumentId = "doc1";
    mocks.view.suiteLoading = false;
    mocks.view.suiteInitializing = false;
    mocks.view.suiteError = null;
    mocks.view.readOnly = false;
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("muestra los documentos y ejecuta las acciones principales", () => {
    render(<DocumentSuitePanel />);

    expect(screen.getByText("Clase")).toBeTruthy();
    expect(screen.getByText("Resumen")).toBeTruthy();
    expect(screen.getByText("Antiguo")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));
    expect(mocks.view.createSuiteDocument).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Abrir Clase" }));
    expect(mocks.view.openSuiteDocument).toHaveBeenCalledWith("doc1");

    fireEvent.click(screen.getByRole("button", { name: "Duplicar Clase" }));
    expect(mocks.view.duplicateSuiteDocument).toHaveBeenCalledWith("doc1");

    fireEvent.click(screen.getByRole("button", { name: "Archivar Clase" }));
    expect(mocks.view.archiveSuiteDocument).toHaveBeenCalledWith("doc1");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Clase" }));
    expect(mocks.view.deleteSuiteDocument).toHaveBeenCalledWith("doc1");

    fireEvent.click(screen.getByRole("button", { name: "Restaurar Antiguo" }));
    expect(mocks.view.restoreSuiteDocument).toHaveBeenCalledWith("old");
  });

  it("muestra la preparación inicial y bloquea Nuevo", () => {
    mocks.view.suite = { active: [], archived: [], deleted: [] };
    mocks.view.suiteInitializing = true;

    render(<DocumentSuitePanel />);

    expect(screen.getByRole("status").textContent).toContain("Preparando el primer documento");
    expect(screen.getByRole("button", { name: "Nuevo" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText(/Todavía no hay documentos/)).toBeNull();
  });

  it("prioriza el error y no muestra el estado vacío", () => {
    mocks.view.suite = { active: [], archived: [], deleted: [] };
    mocks.view.suiteError = "No se pudieron cargar los documentos del proyecto.";

    render(<DocumentSuitePanel />);

    expect(screen.getByRole("alert").textContent).toContain("No se pudieron cargar los documentos");
    expect(screen.queryByText(/Todavía no hay documentos/)).toBeNull();
  });

  it("renombra y cancela sin tocar el documento", () => {
    render(<DocumentSuitePanel />);

    fireEvent.click(screen.getByRole("button", { name: "Renombrar Clase" }));
    const input = screen.getByLabelText("Nuevo título");
    fireEvent.change(input, { target: { value: "Clase nueva" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.view.renameSuiteDocument).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Renombrar Clase" }));
    fireEvent.change(screen.getByLabelText("Nuevo título"), { target: { value: "Clase nueva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mocks.view.renameSuiteDocument).toHaveBeenCalledWith("doc1", "Clase nueva");
  });
});
