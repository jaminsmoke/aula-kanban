# Backlog

> **Regla:** Las entradas nuevas van siempre arriba; lo más antiguo queda al final. El orden indica recencia, no prioridad.
> **Flujo:** Lo que entra en el roadmap activo sale de aquí. Lo que se aparca del roadmap entra aquí.
> **Roadmap:** sin fase activa · **Changelog:** [`changelog.md`](changelog.md)
> **Estado:** APP-02 aparcada; PERM-01 pendiente como prerequisito de APP-03; STORE-02, STORE-03 y APP-03 (carpetas) pendientes de priorizar

---

## 2026-11-15 — STORE-02 · Familias descargables en la Tienda: libros escolares

- Contexto: además de las apps, se valora una familia de contenido descargable en la Tienda: libros escolares por curso y materia (matemáticas, lengua, inglés…), para descargar y tener disponibles en el aula.
- Investigación (2026-11-15): los libros de texto comerciales (Santillana, Anaya, SM, Oxford, Burlington…) están protegidos por derechos de autor y no hay descarga gratuita legal; solo existen programas de préstamo (p. ej. ACCEDE). No se deben incorporar desde fuentes pirata. Las vías legales con licencia abierta encontradas:
  - **Textos Marea Verde** (vía portal de Recursos Educativos Abiertos de Canarias): libros de Matemáticas de ESO (1º–4º ESO) en PDF, versión fotocopiable y capítulos sueltos; licencia CC BY-NC-SA. Cobertura por curso y materia, en español.
  - **INTEF / Ministerio**: «Matemáticas para la ESO» (libro interactivo, CC BY-NC-SA, 1º–4º ESO); **Proyecto EDIA** (CeDeC) con inglés de ESO por proyectos (1º «English in my daily life», 2º «What a digital world!», 3º «English Speaking Cities», 4º «Teens crafting communities»), REA de descarga libre; agregador **Procomún**.
  - **OpenStax**: licencia CC BY-NC-SA (migración de todo el catálogo en 2026), PDF gratuitos y revisados por pares, pero con currículo estadounidense (Prealgebra, Algebra 1/2, Calculus, Statistics, humanidades); no alineado con el currículo español de ESO. Algunos títulos en español.
  - **CK-12 FlexBooks**: licencia propia «Curriculum Materials License» (solo fines educativos, atribución, cambios bajo la misma licencia); interactivos de Matemáticas y Ciencias con estándares EE. UU. (CCSS), con traducciones al español.
  - **Hueco**: no se ha encontrado un libro completo de Lengua castellana y Literatura de ESO en abierto equivalente a los de matemáticas; habría que buscarlo en Procomún/INTEF o decidir si se cubre con REA sueltos.
- Cobertura por nivel (investigación ampliada 2026-11-16): **sí hay libros/material descargable legal para Primaria, ESO y Bachillerato**, no solo ESO:
  - **Primaria (1º–6º):** Textos Marea Verde declara material para primaria, ESO y Bachillerato (principalmente Matemáticas, ajustado al currículo oficial y LOMLOE, CC BY-NC-SA, libros completos y capítulos en PDF); **INTEF · Situaciones de aprendizaje** ofrece SdA de Primaria por ciclos (CC BY-SA 4.0, con fuente descargable, HTML/SCORM/PDF).
  - **ESO (1º–4º):** Marea Verde, libros completos de Matemáticas de 1º a 4º ESO (PDF, fotocopiable y capítulos); INTEF/EDIA con SdA de todas las materias, incluido Inglés por proyectos (1º–4º) y Lengua («Hacemos cosas con palabras», series de 1º–4º).
  - **Bachillerato (1º–2º):** Marea Verde, Matemáticas I y II más Matemáticas aplicadas a CCSS I y II (PDF LOMLOE, con soluciones); INTEF/EDIA con SdA de Bachillerato (Geografía/Historia, Lengua, Matemáticas…).
  - Agregador: **Procomún** (repositorio oficial del INTEF) para localizar REA por etapa y materia.
  - Huecos: no hay libro completo de Lengua Castellana y Literatura de ESO/Bachillerato en abierto equivalente a los de Matemáticas (solo SdA/REA sueltos de EDIA); Inglés tampoco es un libro completo, sino proyectos REA. OpenStax/CK-12 siguen fuera del currículo español (EE. UU.).
- Cómo lo haríamos (propuesta, sin implementar): catálogo de títulos con fuente, licencia, nivel (Primaria/ESO/Bachillerato), curso, materia y formato (PDF/HTML/SCORM); ficha con atribución y licencia visibles; vista «Libros» de la Tienda (STORE-01 ya dejó la pestaña preparada); decidir si el contenido se copia a R2 (acceso offline y estable, pero peso y mantenimiento) o se enlaza a la fuente (ligero, depende de terceros, y las licencias CC permiten enlazar); y si los libros entran en mochila/maletín.
- Al retomar: elegir 2–3 fuentes con licencia verificable (Marea Verde e INTEF/EDIA como base en español), empezar por Matemáticas de Primaria/ESO/Bachillerato y dejar Lengua/Inglés como fase posterior salvo que se acepte el formato SdA.
- Criterios: licencia de cada fuente verificada y visible en la ficha; formato y peso dentro del presupuesto; atribución correcta (CC BY-NC-SA / CK-12); sin contenido con copyright de editoriales comerciales; pruebas de descarga y lectura en el escritorio personal y en Tienda; decidir cobertura MCP (probablemente fuera de alcance inicial).
- Dependencias: STORE-01 (taxonomía: las familias conviven con las categorías de apps); APP-03 (si los libros entran en mochila/maletín). No bloquear el resto de la Tienda.

## 2026-11-15 — STORE-03 · Renombrar la taxonomía de categorías de la Tienda

- Contexto: STORE-01 crea las secciones físicas con las categorías actuales (`Aula`, `Pizarras`, `Programación`, `Diagramas` en `STORE_CATEGORIES` de `lib/native-apps.ts`). Se valora una taxonomía más orientada a familias de uso, p. ej. Educación, Oficina, Productividad y Programación.
- Diseño pendiente: decidir si las categorías agrupan apps, familias descargables (STORE-02) o ambas; si la categoría es un campo único por app o admite varias; y qué categorías iniciales se adoptan (las actuales no encajan del todo: «Pizarras» y «Diagramas» son tipos de app, «Aula» es genérica). Revisar el impacto en la ficha de la app (`category` en `lib/native-apps.ts`), las secciones y filtros de Aula Store, la cobertura MCP (`docs/Store/mcp-apps.md`) y la documentación de ayuda.
- Al retomar: definir la taxonomía cerrada (nombre, icono, descripción y apps asignadas) y decidir el destino de las categorías actuales.
- Criterios: cada app visible pertenece a una categoría; filtros y secciones con conteos coherentes; sin regresión en búsqueda e instaladas; documentación y catálogo MCP actualizados si cambia el campo.
- Dependencias: STORE-01 (secciones, ya en roadmap); STORE-02 (familias) si la taxonomía las incluye.

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

## 2026-11-15 — PERM-01 · Matriz y delegación de permisos

- Estado: vuelve al backlog cuando APP-03 pasa al roadmap; sigue siendo prerequisito para implementar la mochila y el maletín.
- Contexto: hoy `POST /api/space-apps` autoriza instalación y desinstalación solo a owner o administrador y modifica `instance_apps` para toda la instancia. El rol de profesor es por proyecto; delegar una operación global a un profesor de un solo proyecto afectaría a todos los proyectos.
- Objetivo: definir capacidades explícitas con ámbito (instancia, proyecto, app y sujeto), roles predeterminados y concesiones individuales revocables para las acciones que se decidan. La instalación y desinstalación de apps de instancia se reservan exclusivamente al dueño y a administradores de instancia. Una persona que también sea profesora puede hacerlo únicamente por su condición de dueña o administradora; el rol de profesor por sí solo nunca concede ni recibe esa capacidad. La titularidad de Sites sigue fuera de la aplicación.
- Diseño pendiente: decidir quién puede conceder o revocar las demás capacidades, su ámbito, duración y auditoría, cómo se resuelven conflictos entre roles y concesiones y qué ocurre al salir de un proyecto. La gestión global de apps no se delega a profesores por concesión individual: requiere ser dueño o administrador de instancia. Por defecto denegar lo no concedido; no permitir delegar más poderes que los que se poseen ni retirar el control del dueño.
- Implementación futura: control autoritativo de servidor para UI, HTTP, MCP y sockets; no basarse en ocultar botones o en `roles` del catálogo. Centralizar evaluación, invalidar sesiones/cachés al revocar, migrar datos sin otorgar permisos nuevos accidentalmente y registrar cambios con actor y ámbito.
- Ubicación propuesta: gestión de permisos por proyecto en Administración y permisos de instancia en Ajustes > Permisos; validar la estructura y el alcance antes de implementarla.
- Criterios: matriz verificable de owner, admin, profesor, alumno e invitado; permisos individuales y por proyecto para las acciones habilitadas, revocación inmediata, acceso directo/API/MCP, pruebas negativas y sin privilegios cruzados entre proyectos. Verificar expresamente profesor sin rol global denegado y profesor que también es administrador permitido. Incluye revisión de seguridad y migración reversible.
- Dependencias: APP-01; no depende de separar EduTools ni habilita delegación de instalación a profesores no administradores.
