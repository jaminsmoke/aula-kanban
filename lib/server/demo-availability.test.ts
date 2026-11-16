import { describe, expect, it, vi } from "vitest";

const { findProject } = vi.hoisted(() => ({ findProject: vi.fn() }));

vi.mock("./project-access", () => ({ findProject }));

import { isDemoAvailable } from "./demo-availability";

describe("disponibilidad de la demo", () => {
  it("es verdadera solo si el proyecto demo existe", async () => {
    findProject.mockResolvedValue({ id: "demo", name: "Demo", createdAt: 1 });
    await expect(isDemoAvailable()).resolves.toBe(true);

    findProject.mockResolvedValue(null);
    await expect(isDemoAvailable()).resolves.toBe(false);
  });

  it("no rompe la portada si la base no responde", async () => {
    findProject.mockRejectedValue(new Error("sin base"));
    await expect(isDemoAvailable()).resolves.toBe(false);
  });
});
