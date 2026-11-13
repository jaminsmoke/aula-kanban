"use client";

/**
 * Modelo atómico de Bohr animado: núcleo y electrones girando en sus capas.
 * @param props - Capas de electrones y símbolo del elemento.
 * @returns El diagrama animado del átomo.
 */
export default function BohrModel({ shells, symbol }: { shells: number[]; symbol: string }) {
  const size = 200;
  const center = size / 2;
  const maxRadius = center - 12;
  const total = shells.reduce((sum, count) => sum + count, 0);
  const step = shells.length > 0 ? (maxRadius - 18) / shells.length : 0;

  return (
    <svg
      className="pt-bohr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Modelo atómico de ${symbol}: ${total} electrones en ${shells.length} capas`}
    >
      <circle cx={center} cy={center} r="14" className="pt-bohr-halo" />
      <circle cx={center} cy={center} r="9" className="pt-bohr-nucleus" />
      {shells.map((count, index) => {
        const radius = 18 + step * (index + 1);
        const electrons = Array.from({ length: count }, (_, electron) => {
          const angle = (electron / count) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={electron}
              cx={center + Math.cos(angle) * radius}
              cy={center + Math.sin(angle) * radius}
              r="2.6"
              className="pt-bohr-electron"
            />
          );
        });
        return (
          <g
            key={index}
            className="pt-bohr-shell"
            style={{
              animationDuration: `${10 + index * 4}s`,
              animationDirection: index % 2 === 0 ? "normal" : "reverse",
            }}
          >
            <circle cx={center} cy={center} r={radius} className="pt-bohr-orbit" />
            {electrons}
          </g>
        );
      })}
    </svg>
  );
}
