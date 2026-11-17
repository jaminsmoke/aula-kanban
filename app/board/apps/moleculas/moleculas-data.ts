import type { Molecule } from "./moleculas-model";

/** Biblioteca local curada; las estructuras se sirven desde el bundle. */
export const MOLECULES: Molecule[] = [
  {
    id: "agua",
    name: "Agua",
    formula: "H₂O",
    description: "Dos hidrógenos unidos a un oxígeno con geometría angular; la base de la química de la vida.",
    cid: 962,
    sdf: `962
  -OEChem-11172603253D

  3  2  0     0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    0.2774    0.8929    0.2544 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.6068   -0.2383   -0.7169 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
M  END`,
  },
  {
    id: "metano",
    name: "Metano",
    formula: "CH₄",
    description: "El hidrocarburo más simple: un carbono central con cuatro enlaces a hidrógeno.",
    cid: 297,
    sdf: `297
  -OEChem-11172603253D

  5  4  0     0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5541    0.7996    0.4965 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.6833   -0.8134   -0.2536 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.7782   -0.3735    0.6692 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4593    0.3874   -0.9121 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
  1  4  1  0  0  0  0
  1  5  1  0  0  0  0
M  END`,
  },
  {
    id: "etanol",
    name: "Etanol",
    formula: "C₂H₆O",
    description: "Alcohol de dos carbonos con enlaces C–C, C–O y O–H; un ejemplo de cadena corta.",
    cid: 702,
    sdf: `702
  -OEChem-11172603253D

  9  8  0     0  0  0  0  0  0999 V2000
   -1.1712    0.2997    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0463   -0.5665    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2175    0.2668    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0958   -1.2120    0.8819 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0952   -1.1938   -0.8946 H   0  0  0  0  0  0  0  0  0  0  0  0
    2.1050   -0.3720   -0.0177 H   0  0  0  0  0  0  0  0  0  0  0  0
    1.2426    0.9307   -0.8704 H   0  0  0  0  0  0  0  0  0  0  0  0
    1.2616    0.9052    0.8886 H   0  0  0  0  0  0  0  0  0  0  0  0
   -1.1291    0.8364    0.8099 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  9  1  0  0  0  0
  2  3  1  0  0  0  0
  2  4  1  0  0  0  0
  2  5  1  0  0  0  0
  3  6  1  0  0  0  0
  3  7  1  0  0  0  0
  3  8  1  0  0  0  0
M  END`,
  },
  {
    id: "cafeina",
    name: "Cafeína",
    formula: "C₈H₁₀N₄O₂",
    description: "Alcaloide con dos anillos fusionados; una molécula grande para practicar la lectura de modelos.",
    cid: 2519,
    sdf: `2519
  -OEChem-11172603253D

 24 25  0     0  0  0  0  0  0999 V2000
    0.4700    2.5688    0.0006 O   0  0  0  0  0  0  0  0  0  0  0  0
   -3.1271   -0.4436   -0.0003 O   0  0  0  0  0  0  0  0  0  0  0  0
   -0.9686   -1.3125    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    2.2182    0.1412   -0.0003 N   0  0  0  0  0  0  0  0  0  0  0  0
   -1.3477    1.0797   -0.0001 N   0  0  0  0  0  0  0  0  0  0  0  0
    1.4119   -1.9372    0.0002 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.8579    0.2592   -0.0008 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.3897   -1.0264   -0.0004 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0307    1.4220   -0.0006 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.9061   -0.2495   -0.0004 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.5032   -1.1998    0.0003 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.4276   -2.6960    0.0008 C   0  0  0  0  0  0  0  0  0  0  0  0
    3.1926    1.2061    0.0003 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.2969    2.1881    0.0007 C   0  0  0  0  0  0  0  0  0  0  0  0
    3.5163   -1.5787    0.0008 H   0  0  0  0  0  0  0  0  0  0  0  0
   -1.0451   -3.1973   -0.8937 H   0  0  0  0  0  0  0  0  0  0  0  0
   -2.5186   -2.7596    0.0011 H   0  0  0  0  0  0  0  0  0  0  0  0
   -1.0447   -3.1963    0.8957 H   0  0  0  0  0  0  0  0  0  0  0  0
    4.1992    0.7801    0.0002 H   0  0  0  0  0  0  0  0  0  0  0  0
    3.0468    1.8092   -0.8992 H   0  0  0  0  0  0  0  0  0  0  0  0
    3.0466    1.8083    0.9004 H   0  0  0  0  0  0  0  0  0  0  0  0
   -1.8087    3.1651   -0.0003 H   0  0  0  0  0  0  0  0  0  0  0  0
   -2.9322    2.1027    0.8881 H   0  0  0  0  0  0  0  0  0  0  0  0
   -2.9346    2.1021   -0.8849 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  9  2  0  0  0  0
  2 10  2  0  0  0  0
  3  8  1  0  0  0  0
  3 10  1  0  0  0  0
  3 12  1  0  0  0  0
  4  7  1  0  0  0  0
  4 11  1  0  0  0  0
  4 13  1  0  0  0  0
  5  9  1  0  0  0  0
  5 10  1  0  0  0  0
  5 14  1  0  0  0  0
  6  8  1  0  0  0  0
  6 11  2  0  0  0  0
  7  8  2  0  0  0  0
  7  9  1  0  0  0  0
 11 15  1  0  0  0  0
 12 16  1  0  0  0  0
 12 17  1  0  0  0  0
 12 18  1  0  0  0  0
 13 19  1  0  0  0  0
 13 20  1  0  0  0  0
 13 21  1  0  0  0  0
 14 22  1  0  0  0  0
 14 23  1  0  0  0  0
 14 24  1  0  0  0  0
M  END`,
  },
];

/**
 * Devuelve la molécula solicitada o la primera de la biblioteca.
 * @param id - Identificador estable de la molécula.
 * @returns La molécula correspondiente.
 */
export function getMolecule(id: string): Molecule {
  return MOLECULES.find((molecule) => molecule.id === id) ?? MOLECULES[0];
}
