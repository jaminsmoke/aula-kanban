import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StoreSuccess from "./store-success";

describe("check de instalación", () => {
  it("muestra el check SVG cuando la instalación termina", () => {
    const { container } = render(<StoreSuccess visible />);
    expect(container.querySelector(".store-check")).toBeTruthy();
    expect(container.querySelector(".store-check-circle")).toBeTruthy();
    expect(container.querySelector(".store-check-mark")).toBeTruthy();
  });

  it("no muestra nada cuando no hay instalación reciente", () => {
    const { container } = render(<StoreSuccess visible={false} />);
    expect(container.querySelector(".store-check")).toBeNull();
  });
});
