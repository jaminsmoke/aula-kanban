# Candidatas · Aula y evaluación

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **En roadmap:** Tarjetas de repaso (`ts-fsrs`) como **STORE-09**. Los mazos se
> guardan en `app_documents`; el progreso de repaso empieza en `localStorage` y
> la sincronización por usuario queda como seguimiento.

| App | Paquete | Licencia | Aporta | Peso | Notas |
|---|---|---|---|---|---|
| Tarjetas de repaso | `ts-fsrs` 6.0.0 | MIT | Repetición espaciada (FSRS) con UI propia | ~20 KB | Necesita persistencia para tener sentido (nivel 2 o 3) |
| Tarjetas (algoritmo SM-2) | `supermemo` 2.0.23 | MIT | Alternativa simple a FSRS | ~15 KB | Solo algoritmo |
| Conjuntos de preguntas | `@open-spaced-repetition/srs-kit` 1.0.0 | BSD-3 | Contratos y esquema de SRS | ~20 KB | Requiere implementar la UI |

## Valoración

- **FSRS + UI propia** es la opción más completa, pero exige decidir si el progreso
  es por usuario, por proyecto o ambos, y cómo se comparte un mazo con la clase.
- **SM-2** sirve para una primera versión más pequeña, aunque el algoritmo es más
  simple y el resultado pedagógico es menos ambicioso.
- **`srs-kit`** no es una app: aporta contratos y esquema; habría que construir
  toda la interfaz y la persistencia.

El modelo de datos se limita en la primera versión a mazos y tarjetas en
`app_documents`; el progreso por usuario en servidor queda fuera de alcance.
