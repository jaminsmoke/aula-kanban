# Candidatas · Aula y evaluación

Peso = orden de magnitud del chunk diferido, sin medir en este repo.

> **Estado:** sin entrada en backlog. La evaluación es un hueco claro, pero antes
> hay que definir mazos, progreso por alumnado y permisos; no es una app de un
> solo documento compartido sin más.

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

No se selecciona todavía para no abrir un frente de evaluación sin haber cerrado
antes el modelo de datos y permisos.
