// @vitest-environment node

import { describe, expect, it } from "vitest";
import { hasVbaProject } from "./office-import";

describe("detección de macros Office", () => {
  it("detecta un proyecto VBA dentro del paquete", () => {
    const bytes = new TextEncoder().encode("PK\u0003\u0004docx/vbaProject.binresto");
    expect(hasVbaProject(bytes)).toBe(true);
  });

  it("no marca un DOCX normal", () => {
    expect(hasVbaProject(new TextEncoder().encode("PK\u0003\u0004word/document.xml"))).toBe(false);
  });
});
