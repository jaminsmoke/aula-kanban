# Roadmap — APP-01 · Matriz de herramientas, roles y alcance

> **Estado:** Activo · En curso
> **Backlog:** [`backlog.md`](backlog.md)
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Definir una matriz aprobable de herramientas, audiencia, alcance de datos, colaboración y acciones.
- [ ] Criterio de éxito: documentar los valores por defecto y las reglas para alumno, profesor, ambos e invitado, sin inferir privilegios ni herramientas de profesor no definidas.

## 2. Alcance

**Dentro:**
- Inventario de EduTools como capacidades —calculadora/ecuaciones, tabla periódica, medición y lectura— sin separarlas todavía.
- Inventario de Excalidraw, Blockly y Diagramas, incluida su cobertura MCP actual.
- Matriz por herramienta: audiencia, alcance de datos (dispositivo, usuario, proyecto o instancia), posibilidad de colaboración y acciones (ver, usar, crear, editar, instalar y desinstalar).
- Casos de persona con varios roles en un proyecto, varios proyectos, invitado y ausencia de proyecto.
- Regla de instalación global: solo el dueño y los administradores de instancia instalan o desinstalan apps.

**Fuera de alcance:**
- Separar EduTools (APP-02 queda aparcada).
- Implementar mochila del alumnado / maletín docente (APP-03) o delegación de permisos (PERM-01).
- Cambiar la autorización de instalación global o los permisos actuales.
- UI-09: el código actual ya oculta “Instalar” a roles no autorizados y muestra el aviso en la ficha; su cierre documental puede hacerse sin cambiar APP-01.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Matriz primero, sin cambiar apps | Definir permisos al hacer APP-03/PERM-01 | Evita inferir privilegios y permite diseñar mochila, maletín y delegación sobre reglas explícitas. |
| EduTools como capacidades compartibles | Duplicar herramientas por rol | El rol no debe decidir el nombre ni la existencia de una herramienta; la audiencia y el uso se definen por capacidad. |
| Instalación solo para owner/administradores de instancia | Delegar a profesor por concesión individual | Una profesor de un proyecto no debe afectar la instalación de toda la instancia. |
| Inventario MCP incluido | Revisar solo la web | La matriz debe cubrir también las acciones expuestas por el servidor MCP. |

## 4. Fases

### Fase 1: Inventario

- [ ] Listar cada herramienta, su vista actual, sus datos, su estado local y su cobertura MCP.
- [ ] Revisar la regla actual de `visibleTools`, documentos por proyecto e instalación por instancia.
- **Criterios de aceptación:** inventario completo sin cambios de permisos ni de catálogo.

### Fase 2: Matriz aprobable

- [ ] Definir audiencia y alcance de cada capacidad, con valores por defecto y excepciones justificadas.
- [ ] Incluir alumno, profesor, ambos e invitado; varios roles por proyecto; varios proyectos; y sin proyecto.
- [ ] Dejar explícito que el rol de profesor por sí solo no concede instalación global.
- **Criterios de aceptación:** matriz revisable y lista para decidir APP-03 y PERM-01.

### Fase 3: Cierre documental

- [ ] Actualizar documentación de producto y decidir si APP-03 y PERM-01 salen a roadmap.
- [ ] Retirar las entradas cerradas del backlog y registrar el resumen en el changelog al completar el roadmap.
- **Criterios de aceptación:** el backlog no contiene trabajo duplicado y el departamento de producto puede priorizar la siguiente fase.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Confundir audiencia con privilegios | Un alumno o invitado podría obtener una acción no definida. | Separar ver/usar/crear/editar de instalar/desinstalar y aplicar denegación por defecto. |
| Tomar APP-02 como prerrequisito | Retrasar mochila, maletín y permisos. | Mantener APP-02 aparcada y diseñar la matriz sobre las capacidades actuales de EduTools. |
| Inventar herramientas de profesor | El diseño se adelanta a necesidades no confirmadas. | Solo incluir capacidades definidas o marcar explícitamente las propuestas sin conceder acceso. |

## 6. Notas de sesión

- UI-09 ya está corregida en el código actual: la tarjeta no muestra “Instalar” a roles no autorizados y la ficha informa que solo el propietario o un administrador puede instalar.
