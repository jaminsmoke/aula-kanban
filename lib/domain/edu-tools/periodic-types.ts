/** Elemento de la tabla periódica en español. */
export type PeriodicElement = {
  number: number;
  symbol: string;
  name: string;
  englishName: string;
  mass: number;
  category: string;
  predicted: boolean;
  block: string;
  group: number;
  period: number;
  phase: string;
  electronConfiguration: string;
  electronegativity: number | null;
  density: number | null;
  melt: number | null;
  boil: number | null;
  shells: number[];
  discoveredBy: string | null;
  namedBy: string | null;
};
