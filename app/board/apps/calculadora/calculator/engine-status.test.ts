import { describe, expect, it } from "vitest";
import { getEngineStatus, setEngineStatus, subscribeEngineStatus } from "./engine-status";

describe("estado del motor", () => {
  it("avisa del estado actual y de cada cambio", () => {
    setEngineStatus("idle");
    const seen: string[] = [];
    const unsubscribe = subscribeEngineStatus((status) => seen.push(status));

    setEngineStatus("loading");
    setEngineStatus("ready");
    unsubscribe();
    setEngineStatus("idle");

    expect(seen).toEqual(["idle", "loading", "ready"]);
    expect(getEngineStatus()).toBe("idle");
  });
});
