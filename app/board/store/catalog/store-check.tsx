/**
 * Check animado de «instalada»: círculo y marca dibujados con SVG/CSS.
 * La animación es decorativa; el estado accesible lo comunica la tarjeta.
 * @returns El check animado.
 */
export default function StoreCheck() {
  return (
    <svg className="store-check" viewBox="0 0 100 100" aria-hidden="true">
      <circle className="store-check-circle" cx="50" cy="50" r="38" pathLength="1" />
      <path className="store-check-mark" d="M32 52 L45 65 L70 38" pathLength="1" />
    </svg>
  );
}
