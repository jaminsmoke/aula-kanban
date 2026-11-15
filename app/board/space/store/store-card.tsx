"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { m } from "motion/react";
import type { SpaceTool } from "../tools";
import { STATUS_META, statusLabel } from "./store-model";
import StoreSuccess from "./store-success";

/**
 * Tarjeta de una aplicación en el catálogo de Aula Store.
 * @param props - Herramienta, estado, acciones y apertura de la ficha.
 * @returns La tarjeta animada.
 */
export default function StoreCard({ tool, index, status, justInstalled, actions, onDetails }: {
  tool: SpaceTool;
  index: number;
  status: string;
  justInstalled: boolean;
  actions: ReactNode;
  onDetails: () => void;
}) {
  const Icon = tool.icon;
  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.04 }}
      className="store-card"
    >
      <button type="button" className="store-card-cover" onClick={onDetails} aria-label={`Ver detalles de ${tool.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tool.cover} alt="" loading="lazy" />
        <span className="store-card-icon" aria-hidden><Icon size={24} strokeWidth={2} /></span>
        <span className="store-card-category">{tool.category}</span>
      </button>

      <div className="store-card-body">
        <h3>{tool.name}</h3>
        <p className="store-card-tagline">{tool.tagline}</p>
        <p className="store-meta">
          <span className={`store-chip ${STATUS_META[status]?.className ?? "store-chip--pending"}`}>
            <span className="store-chip-dot" aria-hidden />
            {statusLabel(status)}
          </span>
        </p>
      </div>

      <div className="store-card-footer">
        {actions}
        <button type="button" className="store-secondary store-details" onClick={onDetails}><Info size={16} aria-hidden /> Detalles</button>
      </div>

      <StoreSuccess visible={justInstalled} />
    </m.article>
  );
}
