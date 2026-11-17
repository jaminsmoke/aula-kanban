import { describe, expect, it } from "vitest";
import { MOLECULES, getMolecule } from "./moleculas-data";
import { countSdfAtoms, isRenderableMolecule } from "./moleculas-model";

describe("biblioteca de moléculas", () => {
  it("incluye las cuatro estructuras locales en orden", () => {
    expect(MOLECULES.map((molecule) => molecule.id)).toEqual(["agua", "metano", "etanol", "cafeina"]);
    expect(MOLECULES.every(isRenderableMolecule)).toBe(true);
  });

  it("cuenta átomos y enlaces del SDF", () => {
    expect(countSdfAtoms(getMolecule("agua").sdf)).toEqual({ atoms: 3, bonds: 2 });
    expect(countSdfAtoms(getMolecule("metano").sdf)).toEqual({ atoms: 5, bonds: 4 });
    expect(countSdfAtoms(getMolecule("etanol").sdf)).toEqual({ atoms: 9, bonds: 8 });
    expect(countSdfAtoms(getMolecule("cafeina").sdf)).toEqual({ atoms: 24, bonds: 25 });
  });

  it("devuelve la primera molécula cuando el id no existe", () => {
    expect(getMolecule("desconocida")).toBe(MOLECULES[0]);
  });

  it("no depende de recursos de red", () => {
    expect(MOLECULES.every((molecule) => !/https?:\/\//i.test(molecule.sdf))).toBe(true);
  });

  it("rechaza un contenido que no sea SDF V2000", () => {
    expect(countSdfAtoms("modelo vacío")).toEqual({ atoms: 0, bonds: 0 });
    expect(isRenderableMolecule({
      id: "vacia",
      name: "Vacía",
      formula: "—",
      description: "",
      cid: 0,
      sdf: "modelo vacío",
    })).toBe(false);
  });
});
