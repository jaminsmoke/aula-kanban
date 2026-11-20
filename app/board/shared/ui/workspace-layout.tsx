"use client";

import type { ComponentType, ReactNode } from "react";
import "./workspace-layout.css";

/** Icono compatible con las entradas del sidebar. */
export type WorkspaceIcon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

/** Entrada de navegación de un workspace. */
export type WorkspaceItem<T extends string> = {
  id: T;
  label: string;
  icon: WorkspaceIcon;
};

/**
 * Layout de pantalla partida con sidebar de secciones.
 * @param props - Título, etiqueta accesible, secciones, sección activa y contenido.
 * @returns El workspace con sidebar y contenido.
 */
export default function WorkspaceLayout<T extends string>({ title, label, items, active, onSelect, hideMobileTitle = false, children }: {
  title: string;
  label: string;
  items: readonly WorkspaceItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  hideMobileTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`workspace-layout${hideMobileTitle ? " workspace-layout--compact-title" : ""}`}>
      <aside className="workspace-sidebar">
        <p className="workspace-sidebar-title">{title}</p>
        <nav className="workspace-nav" aria-label={label}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active === item.id ? "page" : undefined}
                onClick={() => onSelect(item.id)}
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="workspace-content">{children}</div>
    </div>
  );
}
