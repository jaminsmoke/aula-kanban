"use client";

import { BookOpen } from "lucide-react";

/**
 * Estado vacío cuando todavía no hay ningún mazo.
 * @returns El estado inicial de Tarjetas.
 */
export function TarjetasEmptyState() {
  return (
    <div className="tarjetas-empty-state">
      <BookOpen size={30} aria-hidden />
      <h3>Crea tu primer mazo</h3>
      <p>Agrupa las tarjetas por tema y guárdalas en el proyecto para repasarlas después.</p>
    </div>
  );
}
