import { beforeEach, describe, expect, it } from "vitest";
import { blocklyStorageKey, createBlocklyState } from "./blockly-storage";

describe("respaldo local de Blockly", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda el workspace con la envoltura versionada", () => {
    const state = createBlocklyState("p1");
    const workspace = { blocks: { blocks: [{ type: "controls_if" }] } };

    expect(state.write(workspace)).toEqual({ ok: true });
    expect(JSON.parse(window.localStorage.getItem(blocklyStorageKey("p1")) ?? "null")).toMatchObject({
      __aulaClientStorage: 1,
      version: 1,
      data: workspace,
    });
    expect(state.read()).toEqual(workspace);
  });

  it("lee el respaldo legado y rechaza datos corruptos", () => {
    window.localStorage.setItem(blocklyStorageKey("p1"), JSON.stringify({ blocks: { blocks: [] } }));
    expect(createBlocklyState("p1").readResult()).toMatchObject({
      value: { blocks: { blocks: [] } },
      status: "ok",
      migrated: true,
    });

    window.localStorage.setItem(blocklyStorageKey("p1"), "{ roto");
    expect(createBlocklyState("p1").readResult()).toMatchObject({
      value: {},
      status: "invalid",
    });
  });
});
