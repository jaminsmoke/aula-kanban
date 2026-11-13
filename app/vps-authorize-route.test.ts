import { expect, it } from "vitest";
import { POST as authorize } from "./api/space-access/authorize/route";
import { POST as ticket } from "./api/space-access/ticket/route";

it("mantiene desactivadas las antiguas rutas de aplicaciones externas", async () => {
  expect((await authorize()).status).toBe(410);
  expect((await ticket()).status).toBe(410);
});
