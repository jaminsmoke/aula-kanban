import { Gem } from "lucide-react";
import { describe, expect, it } from "vitest";
import { visibleTools, type SpaceTool } from "./tools";

const shared: SpaceTool = { id: "shared", name: "Compartida", description: "", icon: Gem, roles: ["teacher", "student"] };
const teacherOnly: SpaceTool = { id: "teacher", name: "Profesor", description: "", icon: Gem, roles: ["teacher"] };
const catalog = [shared, teacherOnly];

describe("catálogo nativo", () => {
  it("respeta los roles y los administradores ven todas las herramientas", () => {
    expect(visibleTools("student", catalog)).toEqual([shared]);
    expect(visibleTools("teacher", catalog)).toEqual(catalog);
    expect(visibleTools("admin", catalog)).toEqual(catalog);
  });
  it("solo incluye aplicaciones nativas", () => {
    expect(visibleTools("owner").map(tool => tool.id)).toEqual(["excalidraw"]);
  });
});
