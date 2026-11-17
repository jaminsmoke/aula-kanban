# Candidatas · Aula y evaluación

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **Integrada:** Tarjetas de repaso (`ts-fsrs`) cerró como **STORE-09**. Los mazos
> se guardan en `app_documents`; el progreso de repaso vive en `localStorage` y
> la sincronización por usuario queda como seguimiento.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| SM-2 (alternativa a FSRS) | `supermemo` 2.0.23 | MIT | Alternativa simple a FSRS | ~15 KB | Solo algoritmo; no es la app integrada |
| Conjuntos de preguntas | `@open-spaced-repetition/srs-kit` 1.0.0 | BSD-3 | Contratos y esquema de SRS | ~20 KB | Requiere implementar la UI |

## Valoración

- **FSRS + UI propia** ya está integrado. El progreso por usuario en servidor
  sigue siendo el principal seguimiento pendiente.
- **SM-2** serviría para otra app más pequeña, aunque el algoritmo es más simple
  y el resultado pedagógico es menos ambicioso.
- **`srs-kit`** no es una app: aporta contratos y esquema; habría que construir
  toda la interfaz y la persistencia.
