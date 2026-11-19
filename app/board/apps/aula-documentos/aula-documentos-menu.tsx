"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type AulaMenuAction = {
  label: string;
  icon: ReactNode;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export type AulaMenuProps = {
  label: string;
  actions: AulaMenuAction[];
  disabled?: boolean;
};

/**
 * Menú desplegable accesible de la barra de Aula Documentos.
 * No atrapa el foco: Escape, Tab o un clic fuera lo cierran.
 * @param props - Etiqueta, acciones y estado del disparador.
 * @returns El menú con su botón.
 */
export function AulaMenu({ label, actions, disabled = false }: AulaMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    const first = menuRef.current?.querySelector<HTMLElement>("button:not(:disabled)");
    first?.focus();
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  /**
   * Cierra el menú y devuelve el foco al disparador.
   */
  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  /**
   * Recorre las acciones disponibles con las flechas.
   * @param event - Evento de teclado del menú.
   */
  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      close();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
    if (!items.length) return;
    event.preventDefault();
    const active = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (active + 1) % items.length
          : (active - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div className="aula-documentos-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`aula-documentos-menu-trigger${open ? " is-open" : ""}`}
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
        <ChevronDown size={12} aria-hidden />
      </button>
      {open ? (
        <div
          className="aula-documentos-menu-popup"
          id={menuId}
          role="menu"
          aria-label={label}
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`aula-documentos-menu-item${action.active ? " is-active" : ""}`}
              role={action.active === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={action.active === undefined ? undefined : action.active}
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              <span className="aula-documentos-menu-icon" aria-hidden>{action.icon}</span>
              <span>{action.label}</span>
              {action.shortcut ? <span className="aula-documentos-menu-shortcut">{action.shortcut}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
