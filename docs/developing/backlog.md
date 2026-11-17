# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** STORE-12 activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** 1 entrada: STORE-13 pendiente

---

## 2026-11-16 — STORE-13 · Líneas de tiempo

- Contexto: `vis-timeline` 8.5.6 tiene opción MIT y ~200 KB; cubre historia, proyectos y secuencias temporales, un hueco transversal del catálogo.
- Alcance:
  1. Crear `app/board/apps/timeline/` con eventos, épocas, zoom y agrupación.
  2. Guardar y cargar por proyecto en `app_documents`; invitados en solo lectura.
  3. Plantillas de línea temporal histórica y de proyecto.
- Criterios: crear/editar eventos y épocas, mover y hacer zoom, guardar/cargar, sin red; revisar a 1366, 1024 y 390 px.
- Notas: elegir explícitamente la opción MIT; no usar recursos de red ni mapas. Mantener el estado como JSON validado.
