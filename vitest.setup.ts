import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom no abre el modo modal de <dialog>; los tests solo necesitan que no lance.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
}

if (typeof globalThis.crypto?.randomUUID !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { ...globalThis.crypto, randomUUID: () => "00000000-0000-4000-8000-000000000000" },
  });
}

/* Los tokens del MCP usan WebCrypto (como en Cloudflare Workers); jsdom no
   expone `crypto.subtle`, así que se toma el de Node cuando falta. */
import { webcrypto } from "node:crypto";
if (typeof (globalThis.crypto as Crypto | undefined) === "undefined" || !("subtle" in globalThis.crypto)) {
  Object.defineProperty(globalThis, "crypto", { configurable: true, writable: true, value: webcrypto });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Reemplaza window.location por un espía, porque jsdom no implementa navegación. */
export function stubLocation(search = "") {
  const assign = vi.fn();
  const replace = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      origin: "http://localhost:5173",
      href: `http://localhost:5173/${search}`,
      search,
      assign,
      replace,
    },
  });
  return { assign, replace };
}

/** Respuesta JSON mínima compatible con el cliente `request`. */
export function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => body } as Response;
}

/* motion/react (whileInView) necesita IntersectionObserver; jsdom no lo tiene
   y las secciones con reveal quedarían invisibles. El stub considera
   visible todo lo observado. */
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverStub {
    private readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: IntersectionObserverStub });
}

/* El escritorio y alguna app nativa miden su contenedor con ResizeObserver;
   jsdom no lo implementa y los efectos lanzarían. */
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: ResizeObserverStub });
}

/* ProseMirror mide rangos al cambiar la selección; jsdom no implementa esas
   medidas y el editor de Aula Documentos fallaría al montar. */
if (typeof Range !== "undefined" && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}
if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }) as DOMRect;
}
if (typeof Element !== "undefined" && !Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
}
if (typeof Node !== "undefined") {
  const nodePrototype = Node.prototype as unknown as {
    getClientRects?: () => DOMRectList;
    getBoundingClientRect?: () => DOMRect;
  };
  nodePrototype.getClientRects ??= () => [] as unknown as DOMRectList;
  nodePrototype.getBoundingClientRect ??= () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }) as DOMRect;
}
