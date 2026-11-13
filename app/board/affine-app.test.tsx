import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AffineApp from "./affine-app";

afterEach(() => { vi.unstubAllGlobals(); });

describe("AFFiNE in Mi espacio", () => {
  it("submits the ticket to the embedded window", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ticket: "test-ticket", launchUrl: "https://gateway.example/__aula/launch" }) }));
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (this: HTMLFormElement) {
      expect(this.target).toBe(screen.getByTitle("AFFiNE").getAttribute("name"));
      expect(this.action).toBe("https://gateway.example/__aula/launch");
    });
    render(<AffineApp projectId="default" />);
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(open).not.toHaveBeenCalled();
  });
  it("does not submit a ticket to an insecure gateway URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ticket: "private", launchUrl: "http://unsafe.example/__aula/launch" }) }));
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    render(<AffineApp projectId="default" />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(submit).not.toHaveBeenCalled();
  });
});
