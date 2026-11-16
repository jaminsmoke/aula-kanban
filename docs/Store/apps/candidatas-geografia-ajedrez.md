# Candidatas · Geografía y ajedrez

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **En backlog:** Ajedrez (`chess.js` + `react-chessboard`) como **STORE-06**.
> Mapas sigue como candidata condicionada por la dependencia de teselas externas.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Mapas | `leaflet` 1.9.4 | BSD-2 | Marcadores, capas, coordenadas | ~140 KB | Teselas OSM: dependencia de red y atribución |
| Ajedrez | `chess.js` 1.4.0 + `react-chessboard` 5.12.1 | BSD-2 / MIT | Reglas completas y tablero | ~70 KB | Dos jugadores o rival aleatorio |

## Valoración

- **Ajedrez** es la incorporación más barata del catálogo: reglas completas,
  tablero, sin red y sin servidor. Sirve para lógica, estrategia y torneos de
  clase.
- **Mapas** aporta geografía, pero obliga a decidir el proveedor de teselas, la
  atribución, la caché y el comportamiento sin conexión. No entra en backlog
  hasta resolver esa dependencia.
