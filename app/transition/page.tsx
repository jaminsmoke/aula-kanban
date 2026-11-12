"use client";

import { useEffect, useState } from "react";

export default function TransitionPage() {
  const [status, setStatus] = useState("Consultando…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/transition", { cache: "no-store" }).then(async response => {
      const data = await response.json() as { status?: string; message?: string };
      setStatus(response.ok ? data.status === "complete" ? "Traslado completado" : "Preparado para trasladar" : data.message ?? "No se pudo comprobar la transición");
    }).catch(() => setStatus("No se pudo comprobar la transición"));
  }, []);
  async function run() {
    setBusy(true);
    try {
      const response = await fetch("/api/transition", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json() as { message?: string };
      setStatus(response.ok ? "Traslado completado" : data.message ?? "No se pudo realizar el traslado");
    } catch { setStatus("No se pudo realizar el traslado"); }
    finally { setBusy(false); }
  }
  return <main className="shell"><div className="access-card" style={{ margin: "48px auto", maxWidth: 640 }}>
    <h1>Preparar actualización</h1>
    <p>Este paso traslada las fichas de administración a la nueva estructura de Aula Kanban.</p>
    <p role="status">{status}</p>
    <button className="primary" type="button" disabled={busy || status !== "Preparado para trasladar"} onClick={() => void run()}>Preparar datos</button>
  </div></main>;
}
