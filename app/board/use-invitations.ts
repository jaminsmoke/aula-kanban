"use client";

import { useCallback, useEffect, useState } from "react";
import type { Invitation } from "./model";
import { request } from "./api";

const requestInvitations = () => request<Invitation[]>("GET", undefined, "/api/invitations");

/**
 * Invitaciones pendientes de la cuenta y su aceptación.
 * @returns Invitaciones, estado de carga y acción de aceptar.
 */
export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoaded, setInvitationsLoaded] = useState(false);
  const [invitationLoadError, setInvitationLoadError] = useState("");
  const [invitationError, setInvitationError] = useState("");
  const [invitationBusy, setInvitationBusy] = useState(false);

  const refreshInvitations = useCallback(async () => {
    try { setInvitations(await requestInvitations()); setInvitationLoadError(""); }
    catch (error) { setInvitationLoadError((error as Error).message); }
    finally { setInvitationsLoaded(true); }
  }, []);

  useEffect(() => {
    let active = true;
    requestInvitations()
      .then(
        (items) => { if (active) { setInvitations(items); setInvitationLoadError(""); } },
        (error) => { if (active) setInvitationLoadError((error as Error).message); },
      )
      .finally(() => { if (active) setInvitationsLoaded(true); });
    const onFocus = () => { void refreshInvitations(); };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshInvitations]);

  async function acceptInvitation(invitation: Invitation) {
    if (invitationBusy) return;
    setInvitationBusy(true);
    setInvitationError("");
    try {
      const result = await request<{ projectId: string | null }>("POST", { id: invitation.id, scope: invitation.scope }, "/api/invitations");
      window.location.assign(result.projectId ? "/?project=" + encodeURIComponent(result.projectId) : "/");
    } catch (error) {
      setInvitationError((error as Error).message);
      setInvitationBusy(false);
    }
  }

  return {
    invitations, invitationsLoaded, invitationLoadError, invitationError, invitationBusy,
    refreshInvitations, acceptInvitation,
  };
}
