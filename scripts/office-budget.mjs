import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const budget = 210_000;
const entries = [
  {
    id: "docx",
    contents: `
      import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
      export { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType };
    `,
  },
  {
    id: "pptx",
    contents: `
      import PptxGenJS from "pptxgenjs";
      export default PptxGenJS;
    `,
  },
];

let total = 0;
for (const entry of entries) {
  const result = await build({
    stdin: {
      contents: entry.contents,
      resolveDir: root,
      sourcefile: `office-${entry.id}-entry.js`,
      loader: "js",
    },
    bundle: true,
    format: "esm",
    minify: true,
    platform: "browser",
    write: false,
    logLevel: "silent",
  });
  const contents = result.outputFiles?.[0]?.contents ?? new Uint8Array();
  const gzip = gzipSync(contents, { level: 9 }).byteLength;
  total += gzip;
  process.stdout.write(`${entry.id.padEnd(8)} ${String(contents.byteLength).padStart(9)} B bruto / ${String(gzip).padStart(9)} B gzip\n`);
}

process.stdout.write(`office   ${String(total).padStart(9)} B gzip / ${String(budget).padStart(9)} B\n`);
if (total > budget) {
  process.stderr.write(`\nPresupuesto de exportación Office incumplido: ${total} B gzip > ${budget} B.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("\nPresupuesto Office correcto.\n");
}
