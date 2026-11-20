"use client";

import type { FormEvent } from "react";
import { X } from "lucide-react";

type TarjetasCardFormProps = {
  front: string;
  back: string;
  editingId: string | null;
  readOnly: boolean;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

/**
 * Formulario para añadir o editar una tarjeta.
 * @param props - Valores, edición y acciones.
 * @returns El formulario de tarjeta.
 */
export function TarjetasCardForm({
  front,
  back,
  editingId,
  readOnly,
  onFrontChange,
  onBackChange,
  onSubmit,
  onCancel,
}: TarjetasCardFormProps) {
  return (
    <form className="tarjetas-card-form" onSubmit={onSubmit}>
      <label htmlFor="tarjetas-front">Anverso
        <textarea
          id="tarjetas-front"
          value={front}
          onChange={(event) => onFrontChange(event.target.value)}
          placeholder="Pregunta o concepto"
          rows={3}
          disabled={readOnly}
        />
      </label>
      <label htmlFor="tarjetas-back">Reverso
        <textarea
          id="tarjetas-back"
          value={back}
          onChange={(event) => onBackChange(event.target.value)}
          placeholder="Respuesta o explicación"
          rows={3}
          disabled={readOnly}
        />
      </label>
      <div className="tarjetas-form-actions">
        <button type="submit" disabled={readOnly || !front.trim() || !back.trim()}>
          {editingId ? "Guardar tarjeta" : "Añadir tarjeta"}
        </button>
        {editingId ? (
          <button type="button" className="tarjetas-secondary" onClick={onCancel}>
            <X size={15} aria-hidden /> Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
