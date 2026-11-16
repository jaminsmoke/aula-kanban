# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** PERM-02 · Secciones de permisos en Ajustes y Administración · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** APP-02 aparcada; APP-03 (carpetas) pendiente de priorizar

---


## 2026-11-15 — APP-03 (seguimiento) · Carpetas e iconos propios en mochila y maletín

- Contexto: la mochila del alumnado y el maletín docente son hoy el mismo escritorio que Tienda, sin tienda (APP-03 completada, commit `8986249`). Queda pendiente la organización interna: carpetas e iconos específicos, diferenciando alumnado y profesorado, y decidir qué apps van entrando (hay una lista por pensar).
- Diseño pendiente: si el escritorio personal admite carpetas con apps dentro, iconos propios por rol o por usuario, y si la organización se guarda por usuario+proyecto (como favoritos/orden) o es común por rol. La API actual (`/api/personal-apps`) guarda favorito y orden; habría que extender el modelo si se añaden carpetas.
- Al retomar: definir primero el modelo (carpeta = contenedor de apps con posición) y las reglas por rol; después la interfaz del escritorio.
- Criterios: el escritorio personal sigue sin tienda ni instalación; la organización es por usuario+proyecto; sin regresión en ventanas y dock; pruebas de persistencia y de roles.
- Dependencias: STORE-01/STORE-02 si las carpetas agrupan por categoría o familia; APP-02 si EduTools se extrae.

## 2026-11-15 — APP-02 · Posible extracción futura de herramientas de EduTools

- Contexto: `edu-tools` es hoy una única entrada instalada por instancia y agrupa cuatro vistas; la calculadora incluye ecuaciones y modos básico/científico. Las pestañas ya se cargan parcialmente bajo demanda, pero no son apps independientes.
- Estado: aparcado por decisión del usuario. Mantener EduTools como está; no separarlo ni convertir cada vista en app ahora. Retomar solo cuando una herramienta concreta deba incorporarse a otra aplicación o exista una necesidad definida.
- Al retomar: acotar la extracción a la herramienta necesaria y decidir sus límites, ficha, icono, ventana, versión y carga; revisar dependencias compartidas sin duplicar lógica y preservar accesibilidad.
- Compatibilidad: diseñar migración idempotente del estado `instance_apps` de `edu-tools` para preservar lo instalado, sin reinstalar funciones desinstaladas posteriormente; conservar o redirigir enlaces, ventanas y clientes MCP (`abrir_app`, `consultar_elemento`, catálogo y contratos). Auditar estado local, documentos, cachés y versiones antes de migrar; no borrar ni duplicar datos sin una decisión probada.
- Criterios: pruebas de migración en una copia con instalaciones existentes y nueva instancia, retrocompatibilidad, permisos, enlaces, MCP y presupuesto de carga; decidir si existe un paquete agrupador opcional sin imponerlo.
- Dependencias: ninguna necesidad inmediata de APP-03; APP-01 sirve para identificar usos futuros. No bloquear mochila, maletín ni permisos por esta extracción.
