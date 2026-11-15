# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** PERM-01 · Matriz y delegación de permisos · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** APP-02 aparcada; APP-03 pendiente de PERM-01

---

## 2026-11-15 — APP-02 · Posible extracción futura de herramientas de EduTools

- Contexto: `edu-tools` es hoy una única entrada instalada por instancia y agrupa cuatro vistas; la calculadora incluye ecuaciones y modos básico/científico. Las pestañas ya se cargan parcialmente bajo demanda, pero no son apps independientes.
- Estado: aparcado por decisión del usuario. Mantener EduTools como está; no separarlo ni convertir cada vista en app ahora. Retomar solo cuando una herramienta concreta deba incorporarse a otra aplicación o exista una necesidad definida.
- Al retomar: acotar la extracción a la herramienta necesaria y decidir sus límites, ficha, icono, ventana, versión y carga; revisar dependencias compartidas sin duplicar lógica y preservar accesibilidad.
- Compatibilidad: diseñar migración idempotente del estado `instance_apps` de `edu-tools` para preservar lo instalado, sin reinstalar funciones desinstaladas posteriormente; conservar o redirigir enlaces, ventanas y clientes MCP (`abrir_app`, `consultar_elemento`, catálogo y contratos). Auditar estado local, documentos, cachés y versiones antes de migrar; no borrar ni duplicar datos sin una decisión probada.
- Criterios: pruebas de migración en una copia con instalaciones existentes y nueva instancia, retrocompatibilidad, permisos, enlaces, MCP y presupuesto de carga; decidir si existe un paquete agrupador opcional sin imponerlo.
- Dependencias: ninguna necesidad inmediata de APP-03; APP-01 sirve para identificar usos futuros. No bloquear mochila, maletín ni permisos por esta extracción.

## 2026-11-15 — APP-03 · Mochila del alumnado y maletín docente

- Contexto: Tienda ya contiene un escritorio de ventanas y un catálogo; el catálogo controla el estado de apps para toda la instancia, no una selección personal. El proyecto activo y el rol pueden cambiar entre sesiones.
- Objetivo: diseñar una zona de trabajo propia «Mi mochila» para alumnado y «Mi maletín» para profesorado, reutilizando el escritorio y las mismas apps compartidas, con acceso claro desde Aula y un catálogo separado de la gestión global. La presentación de dueño/administrador y personas con varios roles queda por decidir en APP-01.
- Qué falta: definir si la selección, favoritos y disposición son por usuario y por instancia o por proyecto, cómo se cambia de contexto y qué pasa si una app se desinstala globalmente o se revoca el acceso. Proteger la información personal y mantener documentos compartidos según su alcance actual; no prometer aislamiento por usuario cuando el documento es por proyecto.
- Criterios: alumnado, profesorado e invitados ven solo herramientas autorizadas; separación entre herramientas disponibles, instaladas y elegidas personalmente; interfaz accesible y adaptable, compatibilidad con enlaces y ventanas MCP y pruebas con usuarios de varios proyectos.
- Dependencias: APP-01 y los permisos necesarios de PERM-01; APP-02 queda aparcada y no bloquea esta propuesta.
