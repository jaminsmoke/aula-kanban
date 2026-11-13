import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AffineApp from "./affine-app";

afterEach(() => { vi.unstubAllGlobals(); });

describe("AFFiNE launch", () => {
  it("explains when the browser blocks a new tab", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<AffineApp projectId="default" />);
    fireEvent.click(screen.getByRole("button", { name: /abrir affine/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/ventanas emergentes/i);
  });
  it("does not submit a ticket to an insecure gateway URL", async () => {
    const popup = { opener: {}, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ticket: "private", launchUrl: "http://unsafe.example/__aula/launch" }) }));
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    render(<AffineApp projectId="default" />);
    fireEvent.click(screen.getByRole("button", { name: /abrir affine/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(submit).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
  });
});
