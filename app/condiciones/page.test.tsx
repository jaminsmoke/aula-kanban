import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage, { metadata } from "./page";

describe("TermsPage", () => {
  it("muestra las condiciones sin sesión", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Condiciones de uso" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Uso aceptable" })).toBeTruthy();
    expect(screen.getByText(/legislación española/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "jorgemd@siberia.solutions" })).toBeTruthy();
  });

  it("publica título, descripción y canónica propios", () => {
    expect(metadata.title).toBe("Condiciones de uso · Aula Kanban");
    expect(metadata.description).toMatch(/Condiciones de uso/);
    expect(metadata.alternates?.canonical).toBe("/condiciones");
  });
});
