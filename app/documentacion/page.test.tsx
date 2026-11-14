import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import DocumentationPage from "./page";

describe("DocumentationPage (pública)", () => {
  it("muestra la documentación sin sesión y un enlace para iniciar sesión", () => {
    render(<DocumentationPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Documentación de Aula Kanban" })).toBeTruthy();
    const signIn = screen.getByRole("link", { name: "Iniciar sesión con ChatGPT" });
    expect(signIn.getAttribute("href")).toBe("/signin-with-chatgpt?return_to=%2Fdocumentacion");
    expect(signIn.getAttribute("target")).toBe("_top");
  });
});
