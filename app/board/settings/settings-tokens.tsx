"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, KeyRound, ShieldX } from "lucide-react";
import { request } from "../shared/api";

type McpTokenMeta = { id: string; label: string; lastUsedAt: number | null; createdAt: number; revokedAt: number | null };
type CreatedToken = McpTokenMeta & { token: string };

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "Todavía no se ha usado";
  return new Date(timestamp).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Tokens del servidor MCP de la cuenta: crear, ver una sola vez y revocar.
 * @returns La gestión de tokens dentro de Ajustes > Cuenta.
 */
export default function SettingsTokens() {
  const [tokens, setTokens] = useState<McpTokenMeta[] | null>(null);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTokens(await request<McpTokenMeta[]>("GET", undefined, "/api/mcp/tokens"));
      setError("");
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    request<McpTokenMeta[]>("GET", undefined, "/api/mcp/tokens")
      .then((items) => {
        if (active) {
          setTokens(items);
          setError("");
        }
      })
      .catch((caught) => {
        if (active) setError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setCopied(false);
    try {
      const token = await request<CreatedToken>("POST", { label }, "/api/mcp/tokens");
      setCreated(token);
      setLabel("");
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/mcp/tokens?id=${encodeURIComponent(id)}`, { method: "DELETE", cache: "no-store" });
      if (!response.ok && response.status !== 204) throw new Error("No se pudo revocar el token. Inténtalo de nuevo.");
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const active = tokens?.filter((token) => token.revokedAt === null) ?? [];
  const revoked = tokens?.filter((token) => token.revokedAt !== null) ?? [];

  return (
    <div className="token-panel" aria-labelledby="settings-tokens-title">
      <h2 id="settings-tokens-title"><KeyRound size={20} aria-hidden /> Tokens del MCP</h2>
      <p>Conecta clientes MCP (Claude, ChatGPT u otros) a tu cuenta. Cada token solo ve lo que tú ves en el tablero.</p>

      {created && (
        <div className="token-created" role="status">
          <strong>Token creado. Guárdalo ahora: solo se muestra esta vez.</strong>
          <code>{created.token}</code>
          <button type="button" className="secondary" onClick={copy}>
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Copiado" : "Copiar"}
          </button>
          <button type="button" className="text-button" onClick={() => setCreated(null)}>Cerrar</button>
        </div>
      )}

      <form className="admin-form" onSubmit={create}>
        <label htmlFor="token-label">Etiqueta del token</label>
        <div>
          <input id="token-label" type="text" maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Claude, uso en clase…" />
          <button type="submit" className="primary" disabled={busy}>Crear token</button>
        </div>
      </form>

      {error && <p className="admin-error" role="alert">{error} <button type="button" className="text-button" onClick={load}>Reintentar</button></p>}

      {tokens === null && !error ? <p className="token-state">Cargando tus tokens…</p> : (
        <ul className="admin-list">
          {active.map((token) => (
            <li key={token.id}>
              <div>
                <strong>{token.label || "Sin etiqueta"}</strong>
                <small>Creado {formatDate(token.createdAt)} · {formatDate(token.lastUsedAt)}</small>
              </div>
              <button type="button" className="text-button admin-remove" disabled={busy} onClick={() => revoke(token.id)}>
                <ShieldX size={15} aria-hidden /> Revocar
              </button>
            </li>
          ))}
          {revoked.map((token) => (
            <li key={token.id}>
              <div>
                <strong>{token.label || "Sin etiqueta"} (revocado)</strong>
                <small>Creado {formatDate(token.createdAt)} · {formatDate(token.lastUsedAt)}</small>
              </div>
            </li>
          ))}
          {tokens !== null && tokens.length === 0 && <li className="token-state">Todavía no tienes tokens. Crea el primero con el formulario de arriba.</li>}
        </ul>
      )}
    </div>
  );
}
