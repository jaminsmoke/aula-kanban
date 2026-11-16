# Candidatas · Geografía y ajedrez

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **Ajedrez integrado:** `chess.js` + `react-chessboard` cerraron en **STORE-06**.
> Mapas sigue como candidata condicionada por la dependencia de teselas externas.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Mapas | `leaflet` 1.9.4 | BSD-2 | Marcadores, capas, coordenadas | ~140 KB | Teselas OSM: dependencia de red y atribución |

## Valoración

- **Ajedrez** ya está integrado: era la incorporación más barata y cubre lógica,
  estrategia y torneos de clase sin red ni servidor.
- **Mapas** aporta geografía, pero obliga a decidir el proveedor de teselas, la
  atribución, la caché y el comportamiento sin conexión. No entra en backlog
  hasta resolver esa dependencia.
