import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { props, resetAulaDocumentMocks } from "../../../../test-utils/aula-documentos";
import { AULA_SHORTCUTS, matchesAulaShortcut } from "../../shared/aula-documentos/shortcuts";
import AulaDocumentosApp from "./aula-documentos-app";
import { AulaDocumentosShortcuts } from "./aula-documentos-help";

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

describe("mapa central de atajos", () => {
  it("mantiene identificadores y combinaciones únicas", () => {
    const ids = AULA_SHORTCUTS.map((shortcut) => shortcut.id);
    const combos = AULA_SHORTCUTS.map((shortcut) => shortcut.combo);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(combos).size).toBe(combos.length);
    expect(AULA_SHORTCUTS.filter((shortcut) => shortcut.intercept).every((shortcut) => shortcut.scope === "app")).toBe(true);
  });

  it("exige que los modificadores coincidan exactamente", () => {
    expect(matchesAulaShortcut(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }), "save")).toBe(true);
    expect(matchesAulaShortcut(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, shiftKey: true }), "save")).toBe(false);
    expect(matchesAulaShortcut(new KeyboardEvent("keydown", { key: "f", ctrlKey: true, altKey: true }), "search")).toBe(false);
    expect(matchesAulaShortcut(new KeyboardEvent("keydown", { key: "o", ctrlKey: true, shiftKey: true }), "outline")).toBe(true);
    expect(matchesAulaShortcut(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }), "bold")).toBe(false);
  });

  it("genera la ayuda visible desde el mismo mapa", () => {
    render(<AulaDocumentosShortcuts />);
    expect(screen.getByRole("heading", { name: "Aplicación", level: 4 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Editor", level: 4 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Contexto", level: 4 })).toBeTruthy();
    expect(screen.getByText(/guardar\./)).toBeTruthy();
    expect(screen.getByText(/aplicar el código de un diagrama\./)).toBeTruthy();
  });
});
