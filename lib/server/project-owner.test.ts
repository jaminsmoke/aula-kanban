import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "./auth";
import { isOwner } from "./project-access";

class FakeD1 {
  owner: { userId: string; email: string; claimedAt: number } | null = null;

  prepare(sql: string) {
    return {
      bind: (...args: unknown[]) => ({
        first: async () => (sql.includes("SELECT") && this.owner ? { ...this.owner } : null),
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

const user = (userId: string, email: string): ChatGPTUser => ({ userId, displayName: userId, email, fullName: null });

afterEach(() => {
  delete env.OWNER_EMAIL;
  delete env.DB;
});

describe("isOwner", () => {
  it("no concede propiedad por correo si la base de datos falla o falta", async () => {
    env.OWNER_EMAIL = "owner@example.com";
    expect(await isOwner(user("u2", "owner@example.com"))).toBe(false);
    env.DB = { prepare: () => { throw new Error("D1 no disponible"); } } as unknown as D1Database;
    expect(await isOwner(user("u2", "owner@example.com"))).toBe(false);
  });

  it("no reconoce propietario sin bootstrap ni registro", async () => {
    const database = new FakeD1();
    env.DB = database as unknown as D1Database;
    env.OWNER_EMAIL = "";
    expect(await isOwner(user("u1", "owner@example.com"))).toBe(false);
    expect(database.owner).toBeNull();
  });

  it("reclama la propiedad en el primer acceso y mantiene la identidad al cambiar el correo", async () => {
    const database = new FakeD1();
    env.DB = database as unknown as D1Database;
    env.OWNER_EMAIL = "owner@example.com";
    expect(await isOwner(user("u1", "owner@example.com"))).toBe(true);
    expect(await isOwner(user("u1", "nuevo@example.com"))).toBe(true);
    expect(database.owner).toMatchObject({ userId: "u1", email: "nuevo@example.com" });
  });

  it("no transfiere la propiedad a otra cuenta con el correo anterior", async () => {
    const database = new FakeD1();
    env.DB = database as unknown as D1Database;
    env.OWNER_EMAIL = "owner@example.com";
    expect(await isOwner(user("u1", "owner@example.com"))).toBe(true);
    expect(await isOwner(user("u2", "owner@example.com"))).toBe(false);
    expect(database.owner?.userId).toBe("u1");
  });
});
