"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { StoreTool } from "../tools";
import { statusLabel } from "./store-model";

/**
 * Ficha de detalle de una aplicación.
 * @param props - Herramienta, estado, acciones y cierre.
 * @returns El diálogo de detalle.
 */
export default function StoreDetail({ tool, status, isAdmin, actions, onClose }: {
  tool: StoreTool;
  status: string;
  isAdmin: boolean;
  actions: ReactNode;
  onClose: () => void;
}) {
  const Icon = tool.icon;
  return (
    <div className="store-detail" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="store-detail-card" role="dialog" aria-modal="true" aria-label={tool.name}>
        <button type="button" className="store-detail-close" aria-label="Cerrar detalles" onClick={onClose} autoFocus><X size={18} aria-hidden /></button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="store-detail-cover" src={tool.cover} alt="" />
        <div className="store-detail-body">
          <div className="store-detail-head">
            <span className="store-card-icon store-card-icon--static" aria-hidden><Icon size={24} strokeWidth={2} /></span>
            <div className="store-detail-title">
              <h3>{tool.name}</h3>
              <p>{tool.categories.join(" · ")} · {tool.subcategory} · {statusLabel(status)}</p>
            </div>
          </div>
          <p className="store-detail-description">{tool.description}</p>
          <ul className="store-detail-features">
            {tool.features.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          <dl className="store-detail-tech" aria-label="Información de versión">
            <div>
              <dt>Versión de {tool.versionLabel ?? tool.name}</dt>
              <dd>{tool.appVersion}</dd>
            </div>
            {tool.upstream ? (
              <div>
                <dt>Upstream</dt>
                <dd>{tool.upstream.name} {tool.upstream.version}</dd>
              </div>
            ) : null}
            {tool.extras?.length ? (
              <div>
                <dt>Ampliaciones</dt>
                <dd>{tool.extras.map((extra) => `${extra.name} ${extra.version}`).join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
          {!isAdmin && status !== "installed" ? (
            <p className="store-detail-note">Solo el propietario o un administrador puede instalar aplicaciones.</p>
          ) : null}
          <div className="store-detail-actions">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
