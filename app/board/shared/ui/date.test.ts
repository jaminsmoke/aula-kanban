import { describe, expect, it } from "vitest";
import { formatDateTime } from "./date";

describe("fechas compartidas", () => {
  it("formatea una fecha válida y rechaza valores vacíos", () => {
    expect(formatDateTime(0)).toContain("1970");
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime(Number.NaN)).toBeNull();
  });
});
