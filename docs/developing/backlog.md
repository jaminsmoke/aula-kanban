# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** Sin roadmap activo · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** APP-03 (carpetas) pendiente de priorizar

---


## 2026-11-15 — APP-03 (seguimiento) · Carpetas e iconos propios en mochila y maletín

- Contexto: la mochila del alumnado y el maletín docente son hoy el mismo escritorio que Tienda, sin tienda (APP-03 completada, commit `8986249`). Queda pendiente la organización interna: carpetas e iconos específicos, diferenciando alumnado y profesorado, y decidir qué apps van entrando (hay una lista por pensar).
- Diseño pendiente: si el escritorio personal admite carpetas con apps dentro, iconos propios por rol o por usuario, y si la organización se guarda por usuario+proyecto (como favoritos/orden) o es común por rol. La API actual (`/api/personal-apps`) guarda favorito y orden; habría que extender el modelo si se añaden carpetas.
- Al retomar: definir primero el modelo (carpeta = contenedor de apps con posición) y las reglas por rol; después la interfaz del escritorio.
- Criterios: el escritorio personal sigue sin tienda ni instalación; la organización es por usuario+proyecto; sin regresión en ventanas y dock; pruebas de persistencia y de roles.
- Dependencias: STORE-01/STORE-02 si las carpetas agrupan por categoría o familia; APP-02 (completado) fijó los ids `calculadora` y `tabla-periodica`; la migración 0039 copia instalaciones y preferencias, que esta entrada deberá usar.
