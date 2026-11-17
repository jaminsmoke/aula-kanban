/** Estructura molecular local con su ficha visible. */
export type Molecule = {
  /** Identificador estable usado por el selector. */
  id: string;
  /** Nombre común en español. */
  name: string;
  /** Fórmula química con subíndices. */
  formula: string;
  /** Descripción breve para el panel lateral. */
  description: string;
  /** Identificador de la estructura en PubChem. */
  cid: number;
  /** Contenido SDF V2000 que consume 3Dmol. */
  sdf: string;
};

/** Número de átomos y enlaces declarado por un SDF V2000. */
export type MoleculeCounts = {
  atoms: number;
  bonds: number;
};

/**
 * Cuenta átomos y enlaces a partir de la línea de recuento de un SDF V2000.
 * @param sdf - Contenido SDF completo.
 * @returns Los recuentos declarados, o ceros si el formato no es V2000.
 */
export function countSdfAtoms(sdf: string): MoleculeCounts {
  const countsLine = sdf.split(/\r?\n/).find((line) => line.includes("V2000"));
  if (!countsLine) return { atoms: 0, bonds: 0 };

  const atoms = Number.parseInt(countsLine.slice(0, 3).trim(), 10);
  const bonds = Number.parseInt(countsLine.slice(3, 6).trim(), 10);

  return {
    atoms: Number.isFinite(atoms) ? atoms : 0,
    bonds: Number.isFinite(bonds) && bonds > 0 ? bonds : 0,
  };
}

/**
 * Comprueba que una molécula tiene los datos mínimos para mostrarse.
 * @param molecule - Molécula candidata.
 * @returns `true` si el SDF declara átomos y tiene ficha.
 */
export function isRenderableMolecule(molecule: Molecule): boolean {
  const counts = countSdfAtoms(molecule.sdf);
  return Boolean(molecule.id && molecule.name && molecule.formula && counts.atoms > 0);
}
