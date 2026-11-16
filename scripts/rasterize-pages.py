"""Rasteriza la primera y la segunda página del PDF a JPEG (STORE-02).

Uso: python scripts/rasterize-pages.py <pdf> <directorio_salida>
Escribe `<directorio_salida>/cover.jpg` (página 1, portada) y
`<directorio_salida>/back.jpg` (página 2, contraportada legal).
Ancho objetivo: 480 px, JPEG calidad 80.
"""
import sys
from pathlib import Path

import pymupdf


def main() -> None:
    pdf_path, out_dir = sys.argv[1], sys.argv[2]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    if doc.page_count < 2:
        raise SystemExit(f"el PDF tiene {doc.page_count} páginas; se necesitan al menos 2")
    for page_index, name in ((0, "cover"), (1, "back")):
        page = doc[page_index]
        matrix = pymupdf.Matrix(480 / page.rect.width, 480 / page.rect.width)
        pix = page.get_pixmap(matrix=matrix)
        pix.save(out / f"{name}.jpg", jpg_quality=80)
    print(f"cover/back extraídos de {pdf_path} ({doc.page_count} páginas)")


if __name__ == "__main__":
    main()
