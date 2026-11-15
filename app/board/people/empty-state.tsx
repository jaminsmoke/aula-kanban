"use client";

import type { ComponentType } from "react";

type EmptyIcon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

/**
 * Estado vacío de una sección de personas, con una acción de alta opcional.
 * @param props - Icono, título, explicación y acción (etiqueta y clic).
 * @returns El bloque centrado que sustituye a una rejilla sin fichas.
 */
export default function PeopleEmptyState({ icon: Icon, title, description, action }: {
  icon: EmptyIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="people-empty">
      <span className="people-empty-icon" aria-hidden><Icon size={24} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <button type="button" className="primary" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
