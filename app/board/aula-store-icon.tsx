import type { SpaceIconProps } from "./tools";

/**
 * Logo de Aula Store: baldosa hexagonal ámbar con un glifo de tienda
 * (tejado, toldo festoneado y puerta), dibujado en SVG propio para no
 * depender de iconos genéricos. Forma geométrica distinta de los iconos
 * redondeados de las apps del escritorio.
 * @param props - Tamaño y clases del icono.
 * @returns El logo de Aula Store como SVG.
 */
export function AulaStoreIcon({ size = 24, className }: SpaceIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="aula-store-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#febc2e" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Baldosa hexagonal */}
      <path
        d="M32 3 58 18v28L32 61 6 46V18L32 3Z"
        fill="url(#aula-store-tile)"
        stroke="#b45309"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Glifo de tienda: tejado, toldo festoneado, cuerpo y puerta */}
      <g fill="none" stroke="#3a2a00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 28 32 16l13 12" />
        <path d="M21 28h22" />
        <path d="M21 28c0 3.3 2.5 6 5.5 6s5.5-2.7 5.5-6c0 3.3 2.5 6 5.5 6s5.5-2.7 5.5-6" />
        <path d="M24 34v12c0 1.7 1.3 3 3 3h10c1.7 0 3-1.3 3-3V34" />
        <path d="M29 49V40a3 3 0 0 1 6 0v9" />
      </g>
    </svg>
  );
}
