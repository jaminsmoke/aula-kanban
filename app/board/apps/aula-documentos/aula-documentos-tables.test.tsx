import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import {
  chooseMenu,
  documentMock,
  openMenu,
  props,
  resetAulaDocumentMocks,
  stubDownload,
} from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("Tablas de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("conserva celdas combinadas al cargar y guardar", async () => {
    const merged = {
      schemaVersion: 3,
      title: "Tabla combinada",
      content: {
        type: "doc",
        content: [{
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", attrs: { colspan: 2, rowspan: 1 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Cabecera" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", attrs: { colspan: 1, rowspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Lateral" }] }] },
                { type: "tableCell", attrs: { colspan: 1, rowspan: 1 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Dato" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", attrs: { colspan: 1, rowspan: 1 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Final" }] }] },
              ],
            },
          ],
        }],
      },
    };
    documentMock.load.mockResolvedValue({ state: merged, updatedAt: 5, ok: true });
    render(<AulaDocumentosApp {...props} />);

    await waitFor(() => expect(document.querySelector(".aula-documentos-prose table")).toBeTruthy());
    expect(document.querySelector("th[colspan='2']")).toBeTruthy();
    expect(document.querySelector("td[rowspan='2']")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const table = saved.content.content?.[0];
    expect(table?.content?.[0]?.content?.[0]?.attrs).toMatchObject({ colspan: 2, rowspan: 1 });
    expect(table?.content?.[1]?.content?.[0]?.attrs).toMatchObject({ colspan: 1, rowspan: 2 });
  });

  it("avisa al exportar una tabla combinada a Markdown", async () => {
    const merged = {
      schemaVersion: 3,
      title: "Tabla combinada",
      content: {
        type: "doc",
        content: [{
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [{ type: "tableHeader", attrs: { colspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Cabecera" }] }] }],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Dato" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Otro" }] }] },
              ],
            },
          ],
        }],
      },
    };
    documentMock.load.mockResolvedValue({ state: merged, updatedAt: 5, ok: true });
    stubDownload();
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(document.querySelector(".aula-documentos-prose table")).toBeTruthy());

    openMenu("Exportar");
    fireEvent.click(screen.getByRole("menuitem", { name: "Exportar Markdown" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("celdas combinadas"));
  });

  it("ofrece cabeceras, combinación y foco al salir de la tabla", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    chooseMenu("Insertar", "Insertar tabla");
    fireEvent.click(await screen.findByRole("gridcell", { name: "Crear tabla de 2 filas y 2 columnas" }));

    const toolbar = await screen.findByRole("toolbar", { name: "Herramientas de tabla" });
    expect(screen.getByRole("button", { name: "Convertir celda en cabecera" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alternar columna de cabecera" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Combinar celdas" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Dividir celda" })).toHaveProperty("disabled", true);

    const merge = screen.getByRole("button", { name: "Combinar celdas" });
    merge.focus();
    fireEvent.keyDown(toolbar, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Contenido del documento")));
  });
});
