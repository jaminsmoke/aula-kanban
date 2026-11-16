import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPage, type LegalSection } from "./legal-page";

const sections: LegalSection[] = [
  {
    id: "datos",
    title: "Qué datos guarda",
    paragraphs: ["Un párrafo de prueba."],
    items: ["Un elemento de prueba."],
    closing: ["Un cierre de prueba."],
  },
];

describe("LegalPage", () => {
  it("compone cabecera, documento, fecha, secciones y contacto", () => {
    render(
      <LegalPage
        title="Privacidad"
        lead="Entradilla de prueba."
        updatedIso="2026-11-16"
        updatedLabel="16 de noviembre de 2026"
        current="privacidad"
        sections={sections}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Privacidad" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Qué datos guarda" })).toBeTruthy();
    expect(screen.getByText("Un párrafo de prueba.")).toBeTruthy();
    expect(screen.getByText("Un elemento de prueba.")).toBeTruthy();
    expect(screen.getByText("Un cierre de prueba.")).toBeTruthy();
    expect(screen.getByText("16 de noviembre de 2026").getAttribute("dateTime")).toBe("2026-11-16");
    expect(screen.getByRole("link", { name: "jorgemd@siberia.solutions" }).getAttribute("href")).toBe("mailto:jorgemd@siberia.solutions");
  });

  it("marca la página actual y enlaza la otra legal y la documentación", () => {
    render(
      <LegalPage
        title="Condiciones de uso"
        lead="Entradilla de prueba."
        updatedIso="2026-11-16"
        updatedLabel="16 de noviembre de 2026"
        current="condiciones"
        sections={sections}
      />,
    );

    const headerNav = screen.getByRole("navigation", { name: "Páginas públicas" });
    expect(within(headerNav).getByRole("link", { name: "Condiciones" }).getAttribute("aria-current")).toBe("page");
    expect(within(headerNav).getByRole("link", { name: "Privacidad" }).getAttribute("aria-current")).toBeNull();

    const footerNav = screen.getByRole("navigation", { name: "Enlaces legales" });
    expect(within(footerNav).getByRole("link", { name: "Privacidad" }).getAttribute("href")).toBe("/privacidad");
    expect(within(footerNav).getByRole("link", { name: "Documentación" }).getAttribute("href")).toBe("/documentacion");
    expect(within(footerNav).getByRole("link", { name: "Volver al inicio" }).getAttribute("href")).toBe("/");
  });
});
