import { describe, expect, it } from "vitest";
import { ensureInstanceOwner, isBootstrapOwnerEmail, isInstanceOwner, readInstanceOwner } from "./owner";

class FakeD1 {
  owner: { userId: string; email: string; claimedAt: number } | null = null;

  prepare(sql: string) {
    return {
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (!sql.includes("SELECT")) return null;
          return this.owner ? { ...this.owner } : null;
        },
        run: async () => {
          if (sql.includes("INSERT") && !this.owner) {
            this.owner = { userId: String(args[1]), email: String(args[2]), claimedAt: Number(args[3]) };
          } else if (sql.includes("UPDATE") && this.owner && this.owner.userId === String(args[2])) {
            this.owner.email = String(args[0]);
          }
          return { success: true };
        },
      }),
    };
  }
}

const db = () => new FakeD1() as unknown as D1Database;

describe("propietario de la instancia", () => {
  it("solo reclama la propiedad con el correo configurado", async () => {
    const database = db();
    expect(await ensureInstanceOwner(database, { userId: "u1", email: "otro@example.com" }, "owner@example.com")).toBeNull();
    const owner = await ensureInstanceOwner(database, { userId: "u1", email: "owner@example.com" }, "owner@example.com");
    expect(owner).toMatchObject({ userId: "u1", email: "owner@example.com" });
    expect(await readInstanceOwner(database)).toMatchObject({ userId: "u1", email: "owner@example.com" });
  });

  it("mantiene la propiedad por identificador y actualiza el correo de contacto", async () => {
    const database = db();
    await ensureInstanceOwner(database, { userId: "u1", email: "owner@example.com" }, "owner@example.com");
    const owner = await ensureInstanceOwner(database, { userId: "u1", email: "nuevo@example.com" }, "owner@example.com");
    expect(owner).toMatchObject({ userId: "u1", email: "nuevo@example.com" });
    expect(isInstanceOwner(owner, { userId: "u1", email: "nuevo@example.com" })).toBe(true);
  });

  it("no transfiere la propiedad a otra cuenta con el antiguo correo", async () => {
    const database = db();
    await ensureInstanceOwner(database, { userId: "u1", email: "owner@example.com" }, "owner@example.com");
    const owner = await ensureInstanceOwner(database, { userId: "u2", email: "owner@example.com" }, "owner@example.com");
    expect(owner?.userId).toBe("u1");
    expect(isInstanceOwner(owner, { userId: "u2", email: "owner@example.com" })).toBe(false);
  });

  it("normaliza el bootstrap sin distinguir mayúsculas", () => {
    expect(isBootstrapOwnerEmail(" OWNER@Example.com ", "owner@example.com")).toBe(true);
    expect(isBootstrapOwnerEmail("otro@example.com", "owner@example.com")).toBe(false);
    expect(isBootstrapOwnerEmail("owner@example.com", "")).toBe(false);
  });
});
