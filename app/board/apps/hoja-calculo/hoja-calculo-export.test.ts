import { describe, expect, it, vi } from "vitest";

const downloadBlob = vi.hoisted(() => vi.fn());

vi.mock("../../shared/ui/download", () => ({
  downloadBlob,
}));

import { downloadSheetCsv } from "./hoja-calculo-export";

describe("exportación CSV de la hoja", () => {
  it("serializa la hoja y descarga el archivo con su nombre", async () => {
    downloadSheetCsv({ data: [["Concepto", "=1+1"]] });

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, name] = downloadBlob.mock.calls[0] as [Blob, string];
    expect(name).toBe("hoja-calculo.csv");
    expect(await blob.text()).toBe('"Concepto","\'=1+1"\r\n');
  });
});
