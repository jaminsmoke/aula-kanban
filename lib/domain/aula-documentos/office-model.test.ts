import { describe, expect, it } from "vitest";
import {
  MAX_OFFICE_FILE_BYTES,
  detectOfficeFormat,
  formatFileSize,
  officeErrorMessage,
  officeFormatLabel,
  validateOfficeFile,
} from "./office-model";

describe("modelo de Visor Office", () => {
  it("detecta los tres formatos admitidos sin distinguir mayúsculas", () => {
    expect(detectOfficeFormat("clase.DOCX")).toBe("docx");
    expect(detectOfficeFormat("notas.xlsx")).toBe("xlsx");
    expect(detectOfficeFormat("charla.pptx")).toBe("pptx");
    expect(detectOfficeFormat("clase.pdf")).toBeNull();
    expect(detectOfficeFormat("clase.docx.exe")).toBeNull();
  });

  it("valida tamaño y extensión antes de leer el archivo", () => {
    expect(validateOfficeFile({ name: "clase.docx", size: 2048 })).toEqual({
      file: { name: "clase.docx", size: 2048, format: "docx" },
    });
    expect(validateOfficeFile({ name: "clase.pdf", size: 2048 })).toEqual({
      error: "Solo se admiten archivos .docx, .xlsx y .pptx. Los formatos .doc, .xls y .ppt no se pueden abrir.",
    });
    expect(validateOfficeFile({ name: "clase.docx", size: 0 })).toEqual({ error: "El archivo está vacío o no se puede leer." });
    expect(validateOfficeFile({ name: "clase.docx", size: MAX_OFFICE_FILE_BYTES + 1 })).toEqual({
      error: expect.stringMatching(/30 MB.*más pequeño/),
    });
  });

  it("formatea el tamaño y la etiqueta del formato", () => {
    expect(formatFileSize(900)).toBe("900 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toContain("MB");
    expect(officeFormatLabel("docx")).toContain("Word");
    expect(officeFormatLabel("xlsx")).toContain("Excel");
    expect(officeFormatLabel("pptx")).toContain("PowerPoint");
  });

  it("traduce los errores conocidos a mensajes de aula", () => {
    expect(officeErrorMessage({ code: "encrypted" })).toContain("contraseña");
    expect(officeErrorMessage({ code: "legacy-binary-format" })).toContain("formato antiguo");
    expect(officeErrorMessage({ code: "not-ooxml" })).toContain("no parece");
    expect(officeErrorMessage({ code: "unsupported-content" })).toContain("todavía no puede");
    expect(officeErrorMessage({ metric: "image-pixels", limit: 10, observed: 20 })).toContain("imágenes demasiado grandes");
    expect(officeErrorMessage({ code: "ooxml-resource-limit" })).toContain("demasiado grande o complejo");
    expect(officeErrorMessage({ cause: { code: "encrypted" } })).toContain("contraseña");
    expect(officeErrorMessage(new Error("desconocido"))).toContain("No se pudo abrir");
  });
});
