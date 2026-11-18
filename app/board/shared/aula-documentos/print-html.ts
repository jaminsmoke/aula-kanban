/**
 * Imprime un HTML autónomo usando un iframe oculto.
 * @param contents - Documento HTML completo.
 * @param targetDocument - Documento donde se monta el iframe.
 */
export function printHtmlDocument(contents: string, targetDocument: Document = document): void {
  const iframe = targetDocument.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.srcdoc = contents;
  iframe.onload = () => {
    const view = iframe.contentWindow;
    if (!view) {
      iframe.remove();
      return;
    }
    view.focus();
    view.print();
    window.setTimeout(() => iframe.remove(), 1_000);
  };
  targetDocument.body.appendChild(iframe);
}
