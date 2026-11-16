import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata } from "./page";

describe("PrivacyPage", () => {
  it("muestra el documento sin sesión con los datos que guarda la app", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Privacidad" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Qué datos guarda" })).toBeTruthy();
    expect(screen.getByText(/No hay analítica/)).toBeTruthy();
    expect(screen.getByText(/base de datos D1/)).toBeTruthy();
    expect(screen.getByText(/almacenamiento R2/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "jorgemd@siberia.solutions" })).toBeTruthy();
  });

  it("publica título, descripción y canónica propios", () => {
    expect(metadata.title).toBe("Privacidad · Aula Kanban");
    expect(metadata.description).toMatch(/datos guarda esta instancia/);
    expect(metadata.alternates?.canonical).toBe("/privacidad");
  });
});
