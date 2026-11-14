import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInvitations } from "./use-invitations";
import { jsonResponse, stubLocation } from "../../../vitest.setup";

const invitation = {
  id: "i1",
  projectId: "p1",
  projectName: "Aula",
  role: "student" as const,
  scope: "project" as const,
};

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("useInvitations", () => {
  it("carga las invitaciones pendientes", async () => {
    stubLocation("");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([invitation])));

    const { result } = renderHook(() => useInvitations());
    await waitFor(() => expect(result.current.invitationsLoaded).toBe(true));

    expect(result.current.invitations).toEqual([invitation]);
    expect(result.current.invitationLoadError).toBe("");
  });

  it("acepta la invitación y navega al proyecto asignado", async () => {
    const { assign } = stubLocation("");
    const fetchMock = vi.fn(async () => jsonResponse({ projectId: "p1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvitations());
    await waitFor(() => expect(result.current.invitationsLoaded).toBe(true));
    fetchMock.mockClear();

    await act(async () => {
      await result.current.acceptInvitation(invitation);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/invitations"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(assign).toHaveBeenCalledWith("/?project=p1");
  });

  it("vuelve a habilitar el botón si aceptar falla", async () => {
    stubLocation("");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "Invitación caducada" }, false, 409)));

    const { result } = renderHook(() => useInvitations());
    await waitFor(() => expect(result.current.invitationsLoaded).toBe(true));

    await act(async () => {
      await result.current.acceptInvitation(invitation);
    });

    expect(result.current.invitationError).toBe("Invitación caducada");
    expect(result.current.invitationBusy).toBe(false);
  });
});
