import { beforeEach, describe, expect, it } from "vitest";
import { checkMcpRateLimit, clearMcpRateLimits, MCP_RATE_MAX, MCP_RATE_WINDOW_MS } from "./rate-limit";

beforeEach(() => {
  clearMcpRateLimits();
});

describe("checkMcpRateLimit", () => {
  it("permite hasta el máximo dentro de la ventana", () => {
    for (let index = 0; index < MCP_RATE_MAX; index += 1) {
      expect(checkMcpRateLimit("t1", 1000 + index)).toBe(true);
    }
    expect(checkMcpRateLimit("t1", 1000 + MCP_RATE_MAX)).toBe(false);
  });

  it("reinicia la ventana tras el intervalo", () => {
    for (let index = 0; index < MCP_RATE_MAX; index += 1) {
      checkMcpRateLimit("t1", 1000 + index);
    }
    expect(checkMcpRateLimit("t1", 1000 + MCP_RATE_WINDOW_MS)).toBe(true);
  });

  it("cada token tiene su propio contador", () => {
    for (let index = 0; index < MCP_RATE_MAX; index += 1) {
      checkMcpRateLimit("t1", 1000 + index);
    }
    expect(checkMcpRateLimit("t1", 1000 + MCP_RATE_MAX)).toBe(false);
    expect(checkMcpRateLimit("t2", 1000 + MCP_RATE_MAX)).toBe(true);
  });
});
