type MermaidApi = typeof import("mermaid").default;

/** Renderizador compartido con una cola para evitar renders simultáneos. */
export type MermaidRenderer = {
  render: (source: string) => Promise<string | null>;
};

/**
 * Da al SVG un tamaño explícito para conservar la legibilidad del diagrama.
 * @param svg - SVG generado por Mermaid.
 * @returns El SVG con ancho y alto explícitos.
 */
export function normalizeMermaidSvg(svg: string): string {
  const opening = /<svg[^>]*>/.exec(svg);
  if (!opening) return svg;
  const tag = opening[0];
  const viewBox = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(tag);
  if (!viewBox) return svg;
  const [, , , width, height] = viewBox;
  const nextTag = tag
    .replace(/style="max-width:[^"]*"/, 'style="max-width:none"')
    .replace(/\swidth="[^"]*"/, ` width="${width}"`)
    .replace(/\sheight="[^"]*"/, ` height="${height}"`);
  return svg.replace(tag, nextTag);
}

/**
 * Crea un renderizador de Mermaid con una única instancia y una cola interna.
 * @returns Un renderizador con `render`.
 */
export function createMermaidRenderer(): MermaidRenderer {
  let api: MermaidApi | null = null;
  let sequence = 0;
  let chain: Promise<string | null> = Promise.resolve(null);

  return {
    render(source: string): Promise<string | null> {
      const current = ++sequence;
      const run = async (): Promise<string | null> => {
        if (!source.trim()) return "";
        if (!api) {
          const mermaidModule = await import("mermaid");
          mermaidModule.default.initialize({
            startOnLoad: false,
            theme: "base",
            securityLevel: "strict",
            fontFamily: '"Instrument Sans", system-ui, sans-serif',
            themeVariables: {
              primaryColor: "#eeebfb",
              primaryTextColor: "#211b36",
              primaryBorderColor: "#5839be",
              lineColor: "#5839be",
              secondaryColor: "#f7f5fd",
              tertiaryColor: "#ffffff",
            },
          });
          api = mermaidModule.default;
        }
        if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;
        const targetId = `aula-documentos-mermaid-${current}`;
        try {
          const { svg } = await api.render(targetId, source);
          cleanupStrayMermaidSvg(targetId);
          return normalizeMermaidSvg(svg);
        } catch (error) {
          cleanupStrayMermaidSvg(targetId);
          setTimeout(() => cleanupStrayMermaidSvg(targetId), 0);
          throw error;
        }
      };

      chain = chain.then(run, run);
      return chain.then((svg) => current === sequence ? svg : null);
    },
  };
}

/**
 * Elimina el SVG de error que Mermaid deja en el body tras un render fallido.
 * No toca el SVG que ya está dentro de la vista previa.
 * @param id - Identificador usado en el render.
 */
function cleanupStrayMermaidSvg(id: string): void {
  if (typeof document === "undefined") return;
  const stray = document.getElementById(id);
  if (!stray) return;
  let candidate: HTMLElement = stray;
  while (candidate.parentElement && candidate.parentElement !== document.body) {
    candidate = candidate.parentElement;
  }
  if (candidate.parentElement === document.body) candidate.remove();
}

let sharedRenderer: MermaidRenderer | null = null;

/**
 * Devuelve el renderizador compartido de Aula Documentos.
 * @returns La instancia única para la ventana actual.
 */
export function getMermaidRenderer(): MermaidRenderer {
  sharedRenderer ??= createMermaidRenderer();
  return sharedRenderer;
}
