# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** APP-01 · Matriz de herramientas, roles y alcance · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** Propuestas pendientes de priorizar

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

## 2026-11-15 — PERM-01 · Matriz y delegación de permisos

- Contexto: hoy `POST /api/space-apps` autoriza instalación y desinstalación solo a owner o administrador y modifica `instance_apps` para toda la instancia. Rol de profesor es por proyecto; delegar una operación global a un profesor de un solo proyecto afectaría a todos los proyectos.
- Objetivo: definir capacidades explícitas con ámbito (instancia, proyecto, app y sujeto), roles predeterminados y concesiones individuales revocables para las acciones que se decidan. La instalación y desinstalación de apps de instancia se reservan exclusivamente al dueño y a administradores de instancia. Una persona que también sea profesora puede hacerlo únicamente por su condición de dueña o administradora; el rol de profesor por sí solo nunca concede ni recibe esa capacidad. La titularidad de Sites sigue fuera de la aplicación.
- Diseño pendiente: decidir quién puede conceder o revocar las demás capacidades, su ámbito, duración y auditoría, cómo se resuelven conflictos entre roles y concesiones y qué ocurre al salir de un proyecto. La gestión global de apps no se delega a profesores por concesión individual: requiere ser dueño o administrador de instancia. Por defecto denegar lo no concedido; no permitir delegar más poderes que los que se poseen ni retirar el control del dueño.
- Implementación futura: control autoritativo de servidor para UI, HTTP, MCP y sockets; no basarse en ocultar botones o en `roles` del catálogo. Centralizar evaluación, invalidar sesiones/cachés al revocar, migrar datos sin otorgar permisos nuevos accidentalmente y registrar cambios con actor y ámbito.
- Ubicación propuesta: gestión de permisos por proyecto en Administración y permisos de instancia en Ajustes > Permisos; validar la estructura y el alcance antes de implementarla.
- Criterios: matriz verificable de owner, admin, profesor, alumno e invitado; permisos individuales y por proyecto para las acciones habilitadas, revocación inmediata, acceso directo/API/MCP, pruebas negativas y sin privilegios cruzados entre proyectos. Verificar expresamente profesor sin rol global denegado y profesor que también es administrador permitido. Incluye revisión de seguridad y migración reversible.
- Dependencias: APP-01; no depende de separar EduTools ni habilita delegación de instalación a profesores no administradores.

## 2026-11-15 — UI-09 · Alinear la acción de instalar con los permisos actuales

- Hallazgo: en `app/board/store/catalog/apps-store.tsx`, para una app no instalada se muestra «Instalar» aunque el rol no sea owner ni admin. El servidor sí rechaza la acción con 403; la ficha detallada informa que solo el propietario o administrador puede instalar.
- Qué falta: mostrar una indicación clara y sin botón operativo a roles no autorizados, en tarjetas y detalle; mantener la autorización de servidor. Añadir pruebas de alumno, profesor e invitado y verificar que dueño y admin conservan la acción. Conservar la misma regla si más adelante se incorporan permisos detallados; el rol de profesor por sí solo no habilita esa gestión.
