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

- [x] Listar cada herramienta, su vista actual, sus datos, su estado local y su cobertura MCP.
- [x] Revisar la regla actual de `visibleTools`, documentos por proyecto e instalación por instancia.
- **Criterios de aceptación:** inventario completo sin cambios de permisos ni de catálogo.

**Inventario de Fase 1**

| Herramienta | Vista y audiencia actual | Datos y persistencia | Estado local | Cobertura MCP |
|---|---|---|---|---|
| Calculadora y ecuaciones | Vista «Calculadora» de EduTools: básica, científica y ecuaciones. visible para owner, admin, teacher, student y guest cuando EduTools está instalada. | No guarda documento en servidor. | Historial en `localStorage` (`aula.calc.history`); memoria y sesión no compartidas. | Sin herramienta; solo interactivo. |
| Tabla periódica | Vista «Ciencias»: búsqueda, filtros, ficha, descripción, historia y modelo atómico. Visible para los cinco roles si EduTools está instalada. | Datos locales del paquete; no hay documento de proyecto. | Estado de búsqueda y selección en el navegador. | `consultar_elemento`: cualquier cuenta autenticada, incluso sin proyecto, si EduTools está instalada. |
| Medición | Vista «Medir»: regla y transportador. Visible para los cinco roles si EduTools está instalada. | Sin persistencia de trabajo. | Medidas y giro en React, sin documento. | Sin herramienta; solo interactivo. |
| Lectura en voz alta | Vista «Lectura»: texto, voz y lectura con la voz del sistema. Visible para los cinco roles si EduTools está instalada. | No envía el texto fuera del navegador; sin persistencia. | Texto y voz seleccionada en memoria. | Sin herramienta; solo interactivo. |
| Excalidraw | Ventana de Tienda dentro de «Pizarra del proyecto». Visible para los cinco roles si está instalada; en Tienda es de solo lectura para student y guest, y editable para owner, admin y teacher. | Snapshot por proyecto persistido y sincronización en vivo (`BoardRoom`). | Geometría de ventana efímera; la escena no se guarda en `localStorage`. | `leer_pizarra` (cualquier miembro), `guardar_pizarra` y `anadir_a_pizarra` (sin student ni guest en Tienda; revisión y límites actuales). |
| Programación por bloques | Ventana de Blockly con ejemplo, código y ejecución. Visible para los cinco roles; guest queda en solo lectura en la UI. | `app_documents` por proyectos (`app=blockly`); se guarda el estado de bloques. | Respaldo en `localStorage` (`aula.blockly.<projectId>`) y salida local de ejecución. | `leer_programa_bloques` (cualquier miembro), `guardar_programa_bloques` (sin guest; último guardado gana). |
| Diagramas | Editor de Mermaid con plantillas, vista previa y exportación SVG. Visible para los cinco roles; el servidor deniega el guardado a guest. | `app_documents` por proyecto (`app=mermaid`) con `{ code }`; plantillas compartidas en `lib/domain/mermaid/templates.ts`. | Respaldo en `localStorage` (`aula.mermaid.<projectId>`); la UI intenta guardar y, si el servidor responde 403, queda el respaldo local. | `leer_diagrama` (cualquier miembro), `guardar_diagrama` (sin guest) y `listar_plantillas_diagrama` (cualquier autenticada si la app está instalada, sin proyecto). |
| Instalación y ventana | Aula Store decide por instancia con `instance_apps`; Tienda actúa como escritorio de ventanas. `visibleTools(role)` hoy devuelve todas las herramientas de `storeTools`, porque cada ficha incluye los cinco roles. | Instalación global; sin selección personal ni por proyecto. | Geometría y selección de ventanas en React, sin persistencia. La sala en vivo es por proyecto y pestaña, sin datos retenidos. | Comunes: `listar_apps`, `obtener_app`, `instalar_app`, `desinstalar_app`, `abrir_app`, `listar_ventanas`, `cerrar_app`, `minimizar_app`, `restaurar_app` y `ampliar_app`. |

**Resultados:** no se cambian permisos ni catálogo. La audiencia actual es amplia —toda herramienta instalada es visible para los cinco roles—, y la diferencia real está en el modo de escritura de cada app y en la instalación global. Esto debe corregirse con la matriz de la fase 2, no asumiendo que el escritorio decide los permisos.

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
