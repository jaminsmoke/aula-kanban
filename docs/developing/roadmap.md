# Roadmap STORE-02 · Vista Libros con persistencia propia

> **Estado:** En curso (2026-11-16)
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] La Tienda estrena la vista «Libros» con libros escolares descargables y legibles en una ventana propia de Aula Kanban, sin salir de la aplicación.
- Criterio de éxito: desde la vista Libros se puede abrir un libro (p. ej. Matemáticas de Marea Verde) en una ventana con su atribución y licencia visibles, sin navegar a un sitio externo.

## 2. Alcance

**Dentro:**
- Copia de los libros en la persistencia propia (R2, como los archivos de `/api/uploads`), con metadatos de procedencia (fuente, URL original, licencia, atribución, fecha/versión).
- Vista «Libros» de Aula Store (la pestaña ya quedó preparada en STORE-01): secciones por nivel (Primaria, ESO, Bachillerato) y materia, fichas con licencia y atribución, y apertura en ventana con visor PDF.
- Catálogo inicial curado en código (`lib/books.ts`, a imagen de `lib/native-apps.ts`): empezar por Matemáticas de Marea Verde (Primaria/ESO/Bachillerato, libros completos o capítulos según peso).
- Servido con la caché inmutable ya existente para `/api/files/[id]` (PER-05).

**Fuera de alcance:**
- Enlazar o embeber la fuente externa (ver decisión): no se usa iframe externo ni hotlink.
- Contenido HTML/SCORM de INTEF/EDIA (paquetes eXeLearning): fase posterior; primero PDF únicos, que son un solo archivo y un solo visor.
- Libros de Lengua/Inglés como libro completo (sin fuente abierta completa); podrán entrar como situaciones de aprendizaje en una fase posterior.
- Cambios en instalación de apps, permisos o MCP (los libros no son apps instalables por instancia en esta fase).

## 3. Decisión: persistencia frente a enlace/embebido

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Persistencia propia (R2)** con metadatos de procedencia y atribución visible | Enlazar o embeber la fuente en un iframe | La ventana es nuestra y no dependemos de terceros |

Motivos de la decisión (revisado 2026-11-16):

- **Licencia:** Marea Verde (CC BY-NC-SA) e INTEF/EDIA (CC BY-SA) permiten redistribuir con atribución y misma licencia; copiar es legal con la atribución visible en la ficha y en el visor.
- **Estabilidad:** los enlaces de terceros pueden cambiar, caer o bloquear el embebido (hotlink, cabeceras de encuadre); con copia propia el libro sigue disponible.
- **Formatos:** los PDF son un archivo único (visor simple); los REA de eXeLearning son paquetes HTML de varios archivos que no se pueden embeber como un enlace — para ellos también hará falta hospedar el paquete, así que la persistencia es el camino común.
- **Peso:** un libro completo puede rondar 12 MB (1º ESO de Marea Verde); se acepta por título, se prefieren capítulos/unidades cuando el libro completo sea excesivo, y el servido usa la caché inmutable de PER-05. El coste en R2 es despreciable frente al riesgo de depender de la fuente.

## 4. Fases

### Fase 1: Modelo y catálogo de libros — completada
- [x] `lib/books.ts` con el catálogo curado (id, título, nivel, curso, materia, fuente, URL original, licencia, atribución, formato, tamaño, clave de almacenamiento, versión/fecha).
- [x] Reglas de ingesta documentadas: qué títulos, qué formato (libro completo o capítulos) y cómo se verifica la licencia antes de copiar.
- **Criterios de aceptación:** el catálogo cubre Matemáticas de ESO y Bachillerato con su procedencia; ningún título sin licencia verificada.

**Implementado (2026-11-16):** 10 títulos de Marea Verde (CC BY-NC-SA): ESO 1º–4º (4ºA/4ºB) y Bachillerato (Matemáticas I/II, CCSS I/II y Generales), con URLs originales y tamaños verificados (8–32 MB; 4ºB, con 32 MB, se valora por capítulos en una fase posterior). **Corrección de alcance:** el grupo de Matemáticas de Marea Verde cubre ESO y Bachillerato, no Primaria; Primaria queda para una fase posterior con INTEF/EDIA (HTML/SCORM, CC BY-SA).

### Fase 2: Persistencia y servido — completada
- [x] Ingesta de los PDF a R2 y servido por la ruta de archivos existente, con atribución y licencia en los metadatos.
- [x] Gestión de actualizaciones: al cambiar la fuente, se sustituye el archivo y se registra la versión.
- **Criterios de aceptación:** cada libro del catálogo se sirve desde Aula Kanban (sin pedir a la fuente), con su licencia y atribución visibles.

**Implementado (2026-11-16):** claves versionadas `books/<id>/<fecha>.pdf` en el bucket `site-creator-r2`; script `scripts/ingest-books.mjs` (descarga, verifica tamaño contra el catálogo, sube y marca `storageKey`/`version` en `lib/books.ts`; `--remote` solo para Codex en producción); rutas `GET /api/books` (catálogo con procedencia y disponibilidad) y `GET /api/books/<id>/file` (PDF con caché inmutable, 404/503 según estado). Los 10 libros están ingeridos en el R2 local y verificados en el navegador (catálogo 200 y PDF servido). Documentación en `docs/Store/libros.md`. La ingesta remota la hace Codex al publicar.

### Fase 3: Vista Libros en la Tienda
- [ ] La pestaña «Libros» pasa a activa: secciones por nivel y materia, tarjetas con ficha (descripción, licencia, atribución) y apertura en ventana con visor PDF.
- [ ] Botón de descarga del archivo; sin regresión en la vista Aplicaciones (STORE-01).
- **Criterios de aceptación:** abrir un libro no saca al usuario de Aula Kanban; la vista Aplicaciones sigue igual.

### Fase 4: Verificación y cierre
- [ ] Suite completa, `tsc`, ESLint y build en verde.
- [ ] Revisión en navegador local (catálogo, ficha, visor, descarga) y en 390 px.
- [ ] Resumen arriba de `changelog.md`, roadmap reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| PDF completos pesados (12 MB+) | Carga lenta y almacenamiento | Capítulos/unidades, caché inmutable, visor con carga progresiva |
| Licencia mal atribuida | Incumplimiento CC | Cada ficha muestra autor, fuente, licencia y URL original; sin título sin licencia verificada |
| La fuente actualiza el libro y nuestra copia queda vieja | Contenido desfasado | Campo de versión/fecha y re-ingesta documentada |
| HTML/SCORM de EDIA no cabe en un visor PDF | Cobertura parcial inicial | Fuera de alcance hasta tener hosting de paquetes; el modelo ya lo prevé |

## 6. Notas de sesión

- 2026-11-16: STORE-02 entra al roadmap con la decisión tomada — persistencia propia (R2) frente a enlace/embebido — tras comprobar que los PDF de Marea Verde son archivos únicos pesados (≈12 MB) y que los REA de eXeLearning son paquetes de varios archivos no embebibles por enlace.
