"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

/**
 * Open the protected AFFiNE application in a separate browser tab.
 * @param props - Current project identifier.
 * @returns A launch control and any connection error.
 */
export default function AffineApp({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = async () => {
    const target = `aula_affine_${crypto.randomUUID().replaceAll("-", "")}`;
    const popup = window.open("", target);
    if (!popup) { setError("Permite las ventanas emergentes para abrir AFFiNE."); return; }
    popup.opener = null;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/space-access/ticket?project=${encodeURIComponent(projectId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app: "affine" }), cache: "no-store" });
      if (!response.ok) throw new Error("unavailable");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("ticket" in data) || !("launchUrl" in data) || typeof data.ticket !== "string" || typeof data.launchUrl !== "string") throw new Error("invalid_response");
      const url = new URL(data.launchUrl);
      if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/__aula/launch" || url.search || url.hash) throw new Error("invalid_url");
      const form = document.createElement("form");
      form.method = "post"; form.action = url.href; form.target = target; form.hidden = true;
      const field = document.createElement("input"); field.name = "ticket"; field.value = data.ticket; form.appendChild(field);
      document.body.appendChild(form); form.submit(); form.remove();
    } catch {
      popup.close();
      setError("No se pudo abrir AFFiNE. Comprueba que el acceso seguro al VPS está conectado.");
    } finally { setBusy(false); }
  };
  return <div className="affine-app"><div className="affine-bar">
    <span className="affine-bar-note">AFFiNE se abre en otra pestaña protegida. Sus documentos y cuentas se gestionan dentro de AFFiNE.</span>
    <button type="button" className="affine-bar-link" onClick={() => void open()} disabled={busy}>{busy ? "Abriendo…" : "Abrir AFFiNE"} <ExternalLink size={13} aria-hidden /></button>
  </div>{error && <p className="affine-bar-note" role="alert" style={{ padding: 20 }}>{error}</p>}</div>;
}
