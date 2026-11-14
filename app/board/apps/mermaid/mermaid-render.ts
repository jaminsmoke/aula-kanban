type MermaidApi = typeof import("mermaid").default;

/** Renderizador con cola interna para evitar renders simultáneos. */
export type MermaidRenderer = { render: (source: string) => Promise<string | null> };

/**
 * Da al SVG un tamaño explícito (el del viewBox) para que los diagramas anchos
 * se puedan leer con desplazamiento en lugar de encogerse.
 * @param svg - SVG generado por Mermaid.
 * @returns El SVG con ancho y alto explícitos.
 */
export function normalizeSvg(svg: string): string {
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
 * Crea un renderizador de Mermaid que comparte la instancia y encadena las
 * representaciones para no medir un SVG a medio construir.
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
        const { svg } = await (async () => {
          if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;
          return api!.render(`aula-mermaid-${current}`, source);
        })();
        return normalizeSvg(svg);
      };

      chain = chain.then(run, run);
      return chain.then((svg) => current === sequence ? svg : null);
    },
  };
}
