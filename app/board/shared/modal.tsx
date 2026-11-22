"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Diálogo modal nativo con título y botón de cierre.
 * @param props - Título, cierre, contenido, si se puede cerrar y clase extra del `dialog`.
 * @returns El elemento `dialog` abierto con su contenido.
 */
export default function Modal({ title, onClose, children, closable = true, className }: { title: string; onClose: () => void; children: ReactNode; closable?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.showModal();
    return () => {
      const target = returnFocus.current;
      if (target?.isConnected) target.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={className} aria-label={title} onCancel={(event) => { event.preventDefault(); if (closable) onClose(); }}>
      <div className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="icon-button" disabled={!closable} onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}
