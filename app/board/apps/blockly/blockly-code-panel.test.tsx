import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BlocklyCodePanel from "./blockly-code-panel";

describe("panel de código de Blockly", () => {
  it("muestra el código y cambia de lenguaje", () => {
    const onTab = vi.fn();
    render(<BlocklyCodePanel codeTab="javascript" code="print('hola')" codeError={null} runResult={null} running={false} onTab={onTab} onRun={() => {}} onCopy={() => {}} />);
    expect(screen.getByText("print('hola')")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Python" }));
    expect(onTab).toHaveBeenCalledWith("python");
  });

  it("muestra la salida del programa", () => {
    render(<BlocklyCodePanel codeTab="javascript" code="" codeError={null} runResult={{ kind: "ok", logs: ["Hola"] }} running={false} onTab={() => {}} onRun={() => {}} onCopy={() => {}} />);
    expect(screen.getByText("Salida")).toBeTruthy();
    expect(screen.getByText("Hola")).toBeTruthy();
  });
});
