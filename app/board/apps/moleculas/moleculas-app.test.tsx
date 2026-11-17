import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOLECULES } from "./moleculas-data";

const threeDmolMock = vi.hoisted(() => {
  const atoms = [
    { elem: "O", x: 0, y: 0, z: 0 },
    { elem: "H", x: 0.2, y: 0.8, z: 0.2 },
    { elem: "H", x: 0.6, y: -0.2, z: -0.7 },
  ];
  const model = { selectedAtoms: vi.fn(() => atoms) };
  const viewer = {
    removeAllLabels: vi.fn(),
    removeAllModels: vi.fn(),
    addModel: vi.fn(() => model),
    setStyle: vi.fn(),
    zoomTo: vi.fn(),
    zoom: vi.fn(),
    render: vi.fn(),
    addLabel: vi.fn(),
    clear: vi.fn(),
  };
  return {
    atoms,
    model,
    viewer,
    createViewer: vi.fn(() => viewer),
  };
});

vi.mock("3dmol", () => ({
  createViewer: threeDmolMock.createViewer,
}));

import MoleculasApp from "./moleculas-app";

describe("Moléculas 3D", () => {
  afterEach(() => {
    vi.clearAllMocks();
    threeDmolMock.createViewer.mockImplementation(() => threeDmolMock.viewer);
  });

  it("muestra la biblioteca y la ficha de la molécula inicial", async () => {
    render(<MoleculasApp />);

    expect(screen.getByText("Moléculas 3D")).toBeTruthy();
    expect(screen.getByLabelText("Molécula")).toHaveProperty("value", "agua");
    expect(screen.getByRole("heading", { name: "Agua" })).toBeTruthy();
    expect(screen.getByText("H₂O")).toBeTruthy();

    await waitFor(() => {
      expect(threeDmolMock.viewer.addModel).toHaveBeenCalledWith(MOLECULES[0].sdf, "sdf");
    });
    expect(threeDmolMock.createViewer).toHaveBeenCalledTimes(1);
  });

  it("cambia de molécula y actualiza la ficha y el modelo", async () => {
    render(<MoleculasApp />);
    await waitFor(() => expect(threeDmolMock.viewer.addModel).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Molécula"), { target: { value: "cafeina" } });

    expect(screen.getByRole("heading", { name: "Cafeína" })).toBeTruthy();
    expect(screen.getByText("C₈H₁₀N₄O₂")).toBeTruthy();
    expect(screen.getByText("24")).toBeTruthy();
    expect(screen.getByText("25")).toBeTruthy();
    await waitFor(() => {
      expect(threeDmolMock.viewer.addModel).toHaveBeenLastCalledWith(MOLECULES[3].sdf, "sdf");
    });
  });

  it("activa las etiquetas y controla el zoom", async () => {
    render(<MoleculasApp />);
    await waitFor(() => expect(threeDmolMock.viewer.addModel).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Mostrar etiquetas de átomos" }));
    await waitFor(() => expect(threeDmolMock.viewer.addLabel).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(threeDmolMock.viewer.zoom).toHaveBeenCalledWith(1.2, 250);

    fireEvent.click(screen.getByRole("button", { name: "Alejar" }));
    expect(threeDmolMock.viewer.zoom).toHaveBeenCalledWith(0.8, 250);

    fireEvent.click(screen.getByRole("button", { name: "Recentrar vista" }));
    expect(threeDmolMock.viewer.zoomTo).toHaveBeenCalled();
  });

  it("muestra un aviso cuando WebGL no está disponible", async () => {
    threeDmolMock.createViewer.mockImplementationOnce(() => {
      throw new Error("WebGL no disponible");
    });

    render(<MoleculasApp />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se pudo iniciar WebGL");
  });
});
