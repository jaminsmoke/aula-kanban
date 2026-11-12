import { Gem } from "lucide-react";
import { describe, expect, it } from "vitest";
import { visibleTools, type SpaceTool } from "./tools";

const shared: SpaceTool = { id: "shared", name: "Compartida", description: "", icon: Gem, roles: ["teacher", "student"] };
const teacherOnly: SpaceTool = { id: "teacher", name: "Profesor", description: "", icon: Gem, roles: ["teacher"] };
const catalog = [shared, teacherOnly];

describe("visibleTools", () => {
  it("muestra a cada rol solo sus herramientas", () => {
    expect(visibleTools("student", catalog).map((tool) => tool.id)).toEqual(["shared"]);
    expect(visibleTools("teacher", catalog).map((tool) => tool.id)).toEqual(["shared", "teacher"]);
  });

  it("el administrador ve todas las herramientas", () => {
    expect(visibleTools("admin", catalog)).toEqual(catalog);
    expect(visibleTools("owner", catalog)).toEqual(catalog);
  });

  it("Nodum y Excalidraw son las herramientas del hub (MIT)", () => {
    expect(visibleTools("student").map((tool) => tool.id)).toEqual(["nodum", "excalidraw"]);
    expect(visibleTools("owner").map((tool) => tool.id)).toEqual(["nodum", "excalidraw"]);
  });
});
