# Candidatas · Geografía y ajedrez

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **Ajedrez integrado:** `chess.js` + `react-chessboard` cerraron en **STORE-06**.
> Mapas geográficos sigue como candidata condicionada por la dependencia de teselas externas.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Mapas geográficos | `leaflet` 1.9.4 | BSD-2 | Marcadores, capas, coordenadas | ~140 KB | Teselas OSM: dependencia de red y atribución. No confundir con Mapas conceptuales, ya integrada |

## Valoración

- **Ajedrez** ya está integrado: era la incorporación más barata y cubre lógica,
  estrategia y torneos de clase sin red ni servidor.
- **Mapas geográficos** aporta geografía, pero obliga a decidir el proveedor de
  teselas, la atribución, la caché y el comportamiento sin conexión. No entra en
  backlog hasta resolver esa dependencia.
