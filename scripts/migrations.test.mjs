import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const journal = JSON.parse(readFileSync(path.join(root, "drizzle/meta/_journal.json"), "utf8"));
const files = readdirSync(path.join(root, "drizzle")).filter((file) => file.endsWith(".sql")).sort();

describe("migraciones locales", () => {
  it("mantiene el journal y los archivos alineados y en orden", () => {
    expect(journal.entries).toHaveLength(45);
    expect(files).toHaveLength(journal.entries.length);
    for (const [index, entry] of journal.entries.entries()) {
      expect(entry.tag.startsWith(`${String(index).padStart(4, "0")}_`)).toBe(true);
      expect(`${entry.tag}.sql`).toBe(files[index]);
    }
  });

  it("aplica todas las migraciones en orden sobre una base limpia", () => {
    const db = new DatabaseSync(":memory:");
    for (const file of files) {
      const sql = readFileSync(path.join(root, "drizzle", file), "utf8");
      for (const part of sql.split("--> statement-breakpoint")) {
        const statement = part.trim();
        if (statement) db.exec(statement);
      }
    }
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(expect.arrayContaining(["projects", "uploads", "document_copies", "aula_documents"]));
    db.close();
  });
});
