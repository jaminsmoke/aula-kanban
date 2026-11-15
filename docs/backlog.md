# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** APP-03 · Mochila del alumnado y maletín docente · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** APP-02 aparcada; PERM-01 pendiente como prerequisito de APP-03

---

## 2026-11-15 — APP-02 · Posible extracción futura de herramientas de EduTools

- Contexto: `edu-tools` es hoy una única entrada instalada por instancia y agrupa cuatro vistas; la calculadora incluye ecuaciones y modos básico/científico. Las pestañas ya se cargan parcialmente bajo demanda, pero no son apps independientes.
- Estado: aparcado por decisión del usuario. Mantener EduTools como está; no separarlo ni convertir cada vista en app ahora. Retomar solo cuando una herramienta concreta deba incorporarse a otra aplicación o exista una necesidad definida.
- Al retomar: acotar la extracción a la herramienta necesaria y decidir sus límites, ficha, icono, ventana, versión y carga; revisar dependencias compartidas sin duplicar lógica y preservar accesibilidad.
- Compatibilidad: diseñar migración idempotente del estado `instance_apps` de `edu-tools` para preservar lo instalado, sin reinstalar funciones desinstaladas posteriormente; conservar o redirigir enlaces, ventanas y clientes MCP (`abrir_app`, `consultar_elemento`, catálogo y contratos). Auditar estado local, documentos, cachés y versiones antes de migrar; no borrar ni duplicar datos sin una decisión probada.
- Criterios: pruebas de migración en una copia con instalaciones existentes y nueva instancia, retrocompatibilidad, permisos, enlaces, MCP y presupuesto de carga; decidir si existe un paquete agrupador opcional sin imponerlo.
- Dependencias: ninguna necesidad inmediata de APP-03; APP-01 sirve para identificar usos futuros. No bloquear mochila, maletín ni permisos por esta extracción.

## 2026-11-15 — PERM-01 · Matriz y delegación de permisos

- Estado: vuelve al backlog cuando APP-03 pasa al roadmap; sigue siendo prerequisito para implementar la mochila y el maletín.
- Contexto: hoy `POST /api/space-apps` autoriza instalación y desinstalación solo a owner o administrador y modifica `instance_apps` para toda la instancia. El rol de profesor es por proyecto; delegar una operación global a un profesor de un solo proyecto afectaría a todos los proyectos.
- Objetivo: definir capacidades explícitas con ámbito (instancia, proyecto, app y sujeto), roles predeterminados y concesiones individuales revocables para las acciones que se decidan. La instalación y desinstalación de apps de instancia se reservan exclusivamente al dueño y a administradores de instancia. Una persona que también sea profesora puede hacerlo únicamente por su condición de dueña o administradora; el rol de profesor por sí solo nunca concede ni recibe esa capacidad. La titularidad de Sites sigue fuera de la aplicación.
- Diseño pendiente: decidir quién puede conceder o revocar las demás capacidades, su ámbito, duración y auditoría, cómo se resuelven conflictos entre roles y concesiones y qué ocurre al salir de un proyecto. La gestión global de apps no se delega a profesores por concesión individual: requiere ser dueño o administrador de instancia. Por defecto denegar lo no concedido; no permitir delegar más poderes que los que se poseen ni retirar el control del dueño.
- Implementación futura: control autoritativo de servidor para UI, HTTP, MCP y sockets; no basarse en ocultar botones o en `roles` del catálogo. Centralizar evaluación, invalidar sesiones/cachés al revocar, migrar datos sin otorgar permisos nuevos accidentalmente y registrar cambios con actor y ámbito.
- Ubicación propuesta: gestión de permisos por proyecto en Administración y permisos de instancia en Ajustes > Permisos; validar la estructura y el alcance antes de implementarla.
- Criterios: matriz verificable de owner, admin, profesor, alumno e invitado; permisos individuales y por proyecto para las acciones habilitadas, revocación inmediata, acceso directo/API/MCP, pruebas negativas y sin privilegios cruzados entre proyectos. Verificar expresamente profesor sin rol global denegado y profesor que también es administrador permitido. Incluye revisión de seguridad y migración reversible.
- Dependencias: APP-01; no depende de separar EduTools ni habilita delegación de instalación a profesores no administradores.
