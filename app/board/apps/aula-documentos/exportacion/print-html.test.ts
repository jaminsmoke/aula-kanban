import { describe, expect, it, vi } from "vitest";
import { printHtmlDocument } from "./print-html";

describe("impresión de Aula Documentos", () => {
  it("monta el HTML en un iframe oculto y llama a print", () => {
    const focus = vi.fn();
    const print = vi.fn();
    const remove = vi.fn();
    const iframe = {
      style: {} as CSSStyleDeclaration,
      srcdoc: "",
      onload: null as (() => void) | null,
      contentWindow: { focus, print },
      remove,
      setAttribute: vi.fn(),
    };
    const appendChild = vi.fn();
    const target = {
      createElement: () => iframe,
      body: { appendChild },
    } as unknown as Document;

    printHtmlDocument("<html>Documento</html>", target);
    expect(iframe.srcdoc).toBe("<html>Documento</html>");
    expect(iframe.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
    expect(appendChild).toHaveBeenCalledWith(iframe);

    iframe.onload?.();
    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
  });
});
