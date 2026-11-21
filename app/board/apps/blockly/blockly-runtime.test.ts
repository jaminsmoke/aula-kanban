import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile } from "../../shared/ui/download";
import { downloadBlocklyState } from "./blockly-download";
import { runJavaScript } from "./blockly-run-worker";

vi.mock("../../shared/ui/download", () => ({ downloadTextFile: vi.fn() }));

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(public url: string) {
    FakeWorker.instances.push(this);
  }
}

describe("runtime de Blockly", () => {
  afterEach(() => {
    FakeWorker.instances = [];
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("descarga el programa con el helper compartido", () => {
    const state = { blocks: { blocks: [] } };
    downloadBlocklyState(state, "p1");
    expect(downloadTextFile).toHaveBeenCalledWith(
      JSON.stringify(state, null, 2),
      "application/json",
      "programa-p1.json",
    );
  });

  it("revoca la URL y termina el worker al recibir la salida", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:worker", revokeObjectURL: revoke });
    vi.stubGlobal("Worker", FakeWorker);
    const onResult = vi.fn();

    runJavaScript("print(1)", onResult);
    const worker = FakeWorker.instances[0];
    worker.onmessage?.({ data: { ok: true, logs: ["1"] } } as MessageEvent);

    expect(onResult).toHaveBeenCalledWith({ kind: "ok", logs: ["1"] });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:worker");
  });

  it("revoca la URL si el worker no se puede crear", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:fallo", revokeObjectURL: revoke });
    vi.stubGlobal("Worker", class {
      constructor() {
        throw new Error("worker bloqueado");
      }
    });
    const onResult = vi.fn();

    runJavaScript("print(1)", onResult);

    expect(revoke).toHaveBeenCalledWith("blob:fallo");
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "error" }));
  });
});
