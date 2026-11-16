> **Archivo:** conservado el 2026-11-16 al reiniciar el roadmap; el resumen de cierre está arriba de `docs/developing/changelog.md` y los pendientes vigentes en el backlog.

# Roadmap STORE-04 · Herramientas asignables por proyecto (Libros como herramienta)

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** STORE-04 — Los libros dejan de ser una sección de la Tienda y pasan a ser una herramienta asignable por proyecto en la mochila del alumnado y el maletín docente.
> **Backlog:** STORE-03 (taxonomía de la Tienda) y APP-03 (carpetas e iconos propios en mochila y maletín, con la carpeta «Libros» como piloto), APP-02, PERM-01.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Que el docente de cada proyecto habilite los libros (y futuras herramientas) para sus alumnos y para sí mismo, y que los libros aparezcan en su mochila/maletín en una carpeta «Libros» con visor de solo lectura.
- [ ] Criterio de éxito: un profesor asigna libros desde Administración → Alumnos → pestaña «Herramientas», los alumnos los ven en su mochila dentro de la carpeta «Libros», y la pestaña Libros desaparece de Aula Store.

## 2. Alcance

**Dentro:**
- Tabla `project_books` (proyecto × libro habilitado) con su migración local y API de lectura/escritura con permisos por rol y proyecto.
- Pestaña «Herramientas» en las vistas de Administración de Profesores y de Alumnos: toggle «Libros» y selección de títulos (todos o individuales).
- Carpeta «Libros» como herramienta en la mochila del alumnado y el maletín docente, con visor embebido de solo lectura (sin botón de descarga).
- Retirada de la vista y la pestaña «Libros» de Aula Store al final del roadmap.

**Fuera de alcance:**
- Desplegar o ingerir en producción (lo hace Codex al publicar con los scripts ya existentes).
- Carpetas generales de mochila y maletín (backlog APP-03; aquí se crea solo la carpeta «Libros» como piloto).
- Taxonomía de la Tienda (STORE-03) y extracción de EduTools (APP-02).

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Asignación **por proyecto** (cada curso decide sus libros) | Global para toda la instancia | Es el patrón real de uso (curso/profesor) y reutiliza la membresía por proyecto que ya existe. |
| UI como **pestaña «Herramientas»** en Profesores y Alumnos | Submenú en el sidebar | Es donde ya vive la asignación de miembros; menos navegación nueva y coherente con el resto de Administración. |
| **Solo lectura** embebida, sin botón de descarga | Lectura + descarga | Un visor embebido basta para leer; enlazar el PDF solo añade peso y custodia sin uso real. |
| Seguir persistiendo en **R2** (opción A de la revisión) | Leer desde la fuente externa y eliminar las copias | La copia propia garantiza la licencia/versionado con independencia de la fuente; la divergencia se gestiona con `version` + re-ingesta documentada, no borrando. |
| La pestaña de la Tienda se retira **al final** | Retirarla ahora | Transición segura: la vista actual sigue disponible hasta que la herramienta funciona. |

## 4. Fases

### Fase 1: Modelo de datos y API de asignación — completada
- [x] Migración local de `project_books` (proyecto × libro habilitado).
- [x] Endpoints de lectura y guardado con permisos: profesor solo su proyecto; owner/administrador, cualquiera.
- [x] Pruebas de modelo y de permisos.
- **Criterios de aceptación:** un proyecto puede listar y guardar qué libros tiene habilitados; un profesor no puede tocar otro proyecto.

**Implementado (2026-11-16):** tabla `project_books` en `db/schema.ts` con migración `drizzle/0038_crazy_puck.sql` aplicada en local; `lib/server/project-books.ts` (validación de ids de catálogo, lectura con `enabled` y guardado que sustituye el conjunto); ruta `app/api/project-books` (`GET` para cualquier miembro con acceso, `PUT` solo owner/admin/profesor del proyecto, alumnos e invitados 403). Verificado en el navegador: guardado y relectura de habilitados con 200.

### Fase 2: Pestaña «Herramientas» en Profesores y Alumnos — completada
- [x] Toggle «Libros» y selección de títulos (todos o individuales) por proyecto, en cada vista.
- [x] Estados de carga/error y guardado visible.
- **Criterios de aceptación:** un docente habilita los libros de su curso y un administrador, los de cualquier proyecto, sin salir de su vista.

**Implementado (2026-11-16):** pestañas «Miembros»/«Herramientas» en las vistas de Profesores y Alumnos (`app/board/people/administration`), con el panel compartido `BooksToolsPanel`: toggle maestro «Todos los libros», selección por nivel, guardado con confirmación y reintento si falla. Solo visible para owner/admin/profesor del proyecto. Verificado en el navegador: pestaña visible en Alumnos, 10 filas por nivel y guardado con retorno «Guardado».

### Fase 3: Carpeta «Libros» en la mochila y el maletín con visor de solo lectura — completada
- [x] Carpeta «Libros» con los libros asignados en la mochila del alumnado y el maletín docente (la carpeta general de personal sigue en backlog).
- [x] Visor embebido de solo lectura (ventana con el PDF); retirada del botón de descarga de la herramienta.
- **Criterios de aceptación:** el alumno ve sus libros en la carpeta «Libros» de su mochila y los lee en ventana propia; sin botón de descarga.

**Implementado (2026-11-16):** icono «Libros» en el escritorio personal cuando el proyecto tiene libros habilitados (`PersonalSpaceView`), con carpeta por niveles (`BooksFolder`: portada, título, materia; no ingeridos deshabilitados) y ventanas de visor embebido (`BookViewer`: iframe del PDF con la atribución, sin descarga). Al deshabilitarse un libro, su icono y ventana desaparecen. Verificado en el navegador: mochila con icono Libros, 10 filas en carpeta y visor del PDF a pantalla completa.

### Fase 4: Retirada de la Tienda, verificación y cierre — completada
- [x] Se retiran la vista y la pestaña «Libros» de Aula Store (la carpeta «Libros» queda como única puerta).
- [x] Suite completa, `tsc`, ESLint y build en verde; revisión en navegador local y en 390 px.
- [x] Resumen arriba de `changelog.md`, roadmap archivado y reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

**Implementado (2026-11-16):** retiradas la pestaña/vistas de Aula Store y el CSS muerto asociado; suite 137 archivos / 1.077 pruebas, `tsc`, ESLint y build en verde; navegador: Tienda solo Aplicaciones (con filtros y secciones) y mochila con el icono Libros; resumen en `changelog.md`, roadmap archivado en `docs/historial/roadmap-store-04.md` y push único.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Permisos mal aplicados (un profesor ve o toca otro proyecto) | Filtración entre cursos | Permisos centralizados por proyecto, con pruebas por rol. |
| La carpeta «Libros» queda fuera del sistema general de carpetas (APP-03) | Dos modelos de carpetas | Solo «Libros» vive aquí; cuando APP-03 llegue, absorbe la carpeta existente sin duplicar modelo. |
| Libros deshabilitados pero ya en mochilas abiertas | Ventanas con libros ya no asignados | Al cerrar/actualizar la mochila se filtran por la asignación vigente; no hay datos que limpiar (la carpeta es lectura). |
| PDF pesados en muchos alumnos | Carga del visor | Visor con carga progresiva del navegador; caché inmutable ya en servido. |

## 6. Notas de sesión

- 2026-11-16: roadmap creado tras la revisión con el usuario. Decisions de alcance (proyecto), UI (pestaña), lectura (solo lectura con R2) y transición (retiro al final) tomadas en sesión.
