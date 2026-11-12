"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}
