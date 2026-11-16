"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Galería horizontal de tarjetas de Aula Store: scroll nativo con snap y
 * fade lateral (máscara CSS) solo cuando el contenido desborda, sin
 * scrollbar visible.
 * @param props - Etiqueta accesible de la galería y tarjetas a mostrar.
 * @returns El carril horizontal con las tarjetas.
 */
export default function StoreGallery({ label, children }: { label: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setHasOverflow(track.scrollWidth > track.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={trackRef}
      className={`store-gallery${hasOverflow ? " store-gallery--fade" : ""}`}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
