"use client";

type HojaCalculoFormulaBarProps = {
  value: string;
  hasSelection: boolean;
  ready: boolean;
  readOnly: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
};

/**
 * Barra de edición de la fórmula o valor de la celda seleccionada.
 * @param props - Valor, estado y acciones.
 * @returns La barra `fx`.
 */
export function HojaCalculoFormulaBar({
  value,
  hasSelection,
  ready,
  readOnly,
  onChange,
  onCommit,
}: HojaCalculoFormulaBarProps) {
  return (
    <div className="hoja-calculo-formula-bar">
      <span aria-hidden>fx</span>
      <input
        aria-label="Fórmula de la celda seleccionada"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
          }
        }}
        disabled={!ready || readOnly || !hasSelection}
        placeholder={hasSelection ? "Escribe un valor o una fórmula" : "Selecciona una celda para ver su fórmula"}
        spellCheck={false}
      />
    </div>
  );
}
