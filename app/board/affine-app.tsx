"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Opens AFFiNE inside its isolated Mi espacio window.
 * @param props - Current project identifier.
 * @returns Embedded application with its own protected session.
 */
export default function AffineApp({ projectId }: { projectId: string }) {
  const frameName = `aula_affine_${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const submitted = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    submitted.current = false;
    const launch = async () => {
      try {
        const response = await fetch(`/api/space-access/ticket?project=${encodeURIComponent(projectId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app: "affine" }), cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("ticket" in data) || !("launchUrl" in data) || typeof data.ticket !== "string" || typeof data.launchUrl !== "string") throw new Error("invalid_response");
        const url = new URL(data.launchUrl);
        if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/__aula/launch" || url.search || url.hash) throw new Error("invalid_url");
        if (controller.signal.aborted) return;
        const form = document.createElement("form");
        form.method = "post"; form.action = url.href; form.target = frameName; form.hidden = true;
        const field = document.createElement("input"); field.type = "hidden"; field.name = "ticket"; field.value = data.ticket; form.appendChild(field);
        document.body.appendChild(form); submitted.current = true; form.submit(); form.remove();
      } catch {
        if (!controller.signal.aborted) { setLoading(false); setError("No se pudo conectar con AFFiNE. Comprueba el acceso al VPS y vuelve a intentarlo."); }
      }
    };
    void launch();
    return () => controller.abort();
  }, [frameName, projectId, attempt]);

  return <div className="affine-app">
    <div className="affine-bar"><span className="affine-bar-note">AFFiNE: documentos y pizarras del espacio compartido.</span></div>
    {loading && <p className="affine-bar-note" role="status" style={{ padding: 20 }}>Conectando con AFFiNE…</p>}
    {error && <p className="affine-bar-note" role="alert" style={{ padding: 20 }}>{error} <button type="button" className="text-button" onClick={() => { setError(""); setLoading(true); setAttempt(value => value + 1); }}>Reintentar</button></p>}
    <iframe className="affine-frame" name={frameName} title="AFFiNE" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" referrerPolicy="no-referrer" onLoad={() => { if (submitted.current) setLoading(false); }} />
  </div>;
}
