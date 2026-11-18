# Documentación de Aula Kanban

Índice y guía del trabajo del proyecto. La documentación se organiza en dos carpetas: `Store/` reúne todo lo de la Tienda y las apps nativas, y `developing/` todo el trabajo de planificación (roadmap, backlog, changelog y plantillas).

## Tienda y apps (`Store/`)

| Documento | Para qué | Orden |
|---|---|---|
| [`apps/README.md`](Store/apps/README.md) | Catálogo de apps nativas: criterios, integración, versiones y candidatas por categoría | Temático |
| [`apps/integradas.md`](Store/apps/integradas.md) | Apps integradas y versiones por app | Temático |
| [`mcp-apps.md`](Store/mcp-apps.md) | Cobertura MCP, permisos y límites de las apps nativas | Temático |
| [`matriz-herramientas.md`](Store/matriz-herramientas.md) | Matriz de APP-01: audiencia, alcance, colaboración y acciones | Temático |
| [`matriz-permisos.md`](Store/matriz-permisos.md) | Matriz de PERM-01: capacidades con ámbito, roles y concesiones | Temático |
| [`libros.md`](Store/libros.md) | Catálogo de libros escolares, licencias e ingesta a R2 | Temático |

## Planificación (`developing/`)

| Documento | Para qué | Orden |
|---|---|---|
| [`roadmap.md`](developing/roadmap.md) | STORE-16 activo: Visor Office | Secuencia de ejecución |
| [`backlog.md`](developing/backlog.md) | Trabajo aparcado o pendiente de priorizar | Lo nuevo arriba |
| [`changelog.md`](developing/changelog.md) | Hitos completados y versiones publicadas | Lo nuevo arriba |
| [`roadmap-template.md`](developing/templates/roadmap-template.md) | Plantilla para reiniciar el roadmap | — |
| [`backlog-template.md`](developing/templates/backlog-template.md) | Plantilla para reiniciar el backlog | — |
| [`changelog-template.md`](developing/templates/changelog-template.md) | Plantilla para reiniciar el changelog | — |

## Arquitectura

Dirección de dependencias:

```text
app  →  lib  →  db
```

- `app/` contiene páginas, componentes y rutas HTTP.
- `lib/domain/` contiene tipos y funciones puras compartidas por cliente y servidor.
- `lib/server/` contiene autenticación y acceso server-side.
- `db/` contiene el esquema y la conexión a D1.
- `lib/` **no puede importar desde `app/`**. La regla `no-restricted-imports` de ESLint lo bloquea.

## Tokens CSS

La fuente única es `app/globals.css`. Los tokens se agrupan por intención:

- **Superficies y texto:** `--ui-surface-page`, `--ui-surface-raised`, `--ui-surface-frame`, `--ui-surface-muted`, `--ui-text-primary`, `--ui-text-muted`, `--ui-border-default`, `--ui-border-accent`.
- **Marca y foco:** `--ui-action-primary`, `--ui-action-text`, `--ui-action-soft`, `--ui-focus-ring`, `--ui-focus-on-dark`.
- **Estados:** `--ui-danger-*`, `--ui-success-*`, `--ui-warning-*` y `--ui-info-*`.
- **Primitivas:** `--primitive-*` solo se declaran en `globals.css` y no se consumen fuera de él.
- **Forma:** `--border-width-hairline`, `--border-width-strong`, `--border-width-accent`, `--radius-2xs`, `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius`, `--radius-lg`, `--radius-xl`, `--radius-pill`.
- **Temas:** `[data-theme="dark"]` redefine las superficies, la tinta, los bordes, la acción, el peligro, el foco y las sombras; la preferencia `system | light | dark` se guarda en `aula-kanban-theme` y el script inicial evita el destello.
- **Tipografía:** `--font-body`, `--font-display`, `--font-mono` y la escala `--text-*`.

Regla: un token debe representar un patrón compartido o una intención; no se tokeniza cada valor aislado. Los tamaños de letra siguen la escala `--text-*` y las sombras se agrupan por intención. La guarda `app/styles.test.ts` falla ante un color crudo o un alias retirado en un CSS distinto de `globals.css`; los colores de configuración de Blockly, Mermaid, Excalidraw y del HTML aislado del MCP son excepciones documentadas.

Las fuentes Bricolage Grotesque e Instrument Sans se autohospedan en `public/fonts`, con sus licencias OFL. `public/_headers` fija caché inmutable de un año para los archivos de fuente; no se depende de Google Fonts en producción. Las fuentes latinas de Excalidraw se sirven desde `public/excalidraw/fonts`; Xiaolai queda fuera por tamaño.

### CSS compartido y CSS específico

- `globals.css` contiene los tokens, la base, las animaciones y las reglas compartidas por más de un componente o usadas más de una vez.
- Cada feature mantiene su CSS junto al código y solo incluye las especificidades que usa una vez.
- Si un valor o selector empieza a repetirse en otro componente, o se repite dos veces en el mismo, se promociona a token o regla compartida en `globals.css`.
- `globals.css` no se elimina ni se carga desde una vista lazy. Los estilos compartidos de `layout.tsx` (`buttons`, `access`, `dialogs`) tampoco se mueven a una vista lazy.

## Flujo de trabajo

1. **Entra una idea o una revisión.** Si se va a hacer ahora, se convierte en la fase activa de `developing/roadmap.md`. Si se aparca (incluidas las ideas que hay que seguir investigando), se añade arriba de `developing/backlog.md`.
2. **Se ejecuta el roadmap.** El roadmap contiene solo la fase activa y sus subfases; no es una lista de deseos. Cada bloque verificado se confirma con un commit local; no se hace push por bloque. El push a `jaminsmoke/aula-kanban` (`git push github main`) se reserva para cerrar el roadmap completo. Ese push no publica en Sites: la publicación y la verificación en producción las realiza Codex de OpenAI.
3. **Se cierra el roadmap.** Solo cuando **todas** sus fases están completadas, incluida la verificación final, su resumen pasa arriba de `developing/changelog.md`, `developing/roadmap.md` se reinicia desde `developing/templates/roadmap-template.md` y se hace un único push con los commits acumulados.
4. **Lo aparcado no se pierde.** Permanece en `developing/backlog.md` hasta que se convierte en roadmap o se descarta con una nota.
5. **Las plantillas no se usan para trabajo real.** Se copian desde `developing/templates/` para reiniciar un documento y se quedan limpias.

## Reglas de orden

- **Changelog y backlog:** lo más reciente va siempre arriba; lo más antiguo queda al final.
- El orden indica **recencia**, no prioridad.
- No se borran entradas antiguas del changelog; se añaden hitos nuevos encima.
- Nada detectado se elimina: o pasa al roadmap, o se ejecuta y queda registrado en el changelog, o permanece en el backlog.
- En el backlog, cada entrada debe explicar contexto, qué falta antes de retomarla y notas técnicas.

## Estado actual

- **Reparto de trabajo:** commits locales durante el roadmap y push único al repo personal `jaminsmoke/aula-kanban` al cerrarlo; despliegue y verificación en Sites, siempre por Codex de OpenAI.
- **Roadmap STORE-16 activo:** Visor Office con `@silurus/ooxml` 0.90.1 (MIT), apertura local de `.docx`, `.xlsx` y `.pptx` en solo lectura, WASM servido desde el Site y sin subida ni persistencia; plan en [`roadmap.md`](developing/roadmap.md). El Site sigue en `1.1.35` y sin publicación.
- **Roadmap STORE-15 completado:** Notas y documentos integrada con `@tiptap/core` 3.34.0 (MIT): editor de texto enriquecido, título, listas, citas, código, enlaces, guardado por proyecto en `app_documents`, invitados en solo lectura y exportación HTML local. `AULA_STORE_VERSION` sube a `1.10.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-15.md`](historial/roadmap-store-15.md). El Site sigue en `1.1.35` y sin publicación.
- **Roadmap STORE-14 completado:** Hoja de cálculo integrada con `jspreadsheet-ce` 5.0.4 (MIT): celdas editables, fórmulas, formato esencial, filas y columnas ampliables, CSV local protegido y guardado por proyecto en `app_documents`; invitados en solo lectura. `AULA_STORE_VERSION` sube a `1.9.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-14.md`](historial/roadmap-store-14.md). El Site sigue en `1.1.35` y sin publicación.
- **Roadmap STORE-13 completado:** Líneas de tiempo integrada con `vis-timeline` 8.5.6 en su opción MIT: eventos, épocas, grupos, zoom, plantillas, guardado por proyecto en `app_documents`, rango visible persistido y modo lectura para invitados. `AULA_STORE_VERSION` sube a `1.8.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-13.md`](historial/roadmap-store-13.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-12 completado:** Moléculas 3D integrada con `3Dmol` 2.5.5: visor local con rotación, zoom, etiquetas, ficha con fórmula y ocho estructuras SDF con atribución de PubChem, sin red; control por teclado y portada propia. `AULA_STORE_VERSION` sube a `1.7.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-12.md`](historial/roadmap-store-12.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-11 completado:** Presentaciones integradas con `reveal.js` 6.0.2: editor Markdown, vista previa, modo presentación, plantillas, guardado por proyecto en `app_documents`, modo lectura para invitados y exportación HTML; `AULA_STORE_VERSION` sube a `1.6.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-11.md`](historial/roadmap-store-11.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-10 completado:** Mapas conceptuales integrados con `@xyflow/react` 12.12.1: nodos y conexiones editables, plantillas, guardado por proyecto en `app_documents` y modo lectura para invitados; `AULA_STORE_VERSION` sube a `1.5.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-10.md`](historial/roadmap-store-10.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-08 completado:** Geometría interactiva integrada con `jsxgraph` 1.14.3 en su opción MIT: construcciones, presets, medidas y funciones; `AULA_STORE_VERSION` sube a `1.4.0`. Verificada en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-08.md`](historial/roadmap-store-08.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-07 completado:** Física 2D integrada con `matter-js`, cuatro presets, controles, arrastre y portada SVG; `AULA_STORE_VERSION` sube a `1.3.0`. Verificada en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-07.md`](historial/roadmap-store-07.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-09 completado:** Tarjetas de repaso integrada con mazos en `app_documents`, repaso FSRS, cuatro valoraciones, progreso local por navegador y portada SVG; `AULA_STORE_VERSION` sube a `1.2.0`. Verificada en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-09.md`](historial/roadmap-store-09.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-06 completado:** Ajedrez integrado en Aula Store con tablero, reglas completas, dos jugadores locales, rival aleatorio, formulario de teclado y portada SVG; `AULA_STORE_VERSION` sube a `1.1.0`. Verificado en Tienda y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-06.md`](historial/roadmap-store-06.md). Sin cambio de versión del Site ni publicación.
- **Roadmap STORE-05 completado:** las cinco portadas de Aula Store son SVG de 1200×675; Excalidraw, Programación por bloques y Diagramas sustituyen sus capturas PNG y se retiran los archivos antiguos. Verificado en tarjeta y ficha a 1366, 1024 y 390 px; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-05.md`](historial/roadmap-store-05.md). Sin cambio de versión ni publicación.
- **Backlog:** STORE-17 (Aula Documentos, editor unificado) y DEV-01 (evaluación de pnpm), pendientes de priorizar.
- **Roadmap UI-08 completado:** Tienda en Administración, Clase como botón de icono en la cabecera, URL canónica `view=administracion&section=tienda` y alias `view=espacio`; revisado en 1366, 1024, 900, 620 y 390. Catálogo MCP `0.27.0`. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap APP-01 completado:** inventario y matriz de herramientas, roles y alcance en [`matriz-herramientas.md`](Store/matriz-herramientas.md). Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap APP-03 completado:** mochila del alumnado y maletín docente (migración 0037 y sección `clase > mochila`); resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap STORE-01 completado:** vistas de Tienda (Aplicaciones / Libros próximamente), «Mejores aplicaciones» y secciones físicas por categoría; resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap STORE-02 completado:** vista Libros con persistencia propia (R2), catálogo curado de 10 títulos, portadas/contraportadas y visor PDF; resumen en [`changelog.md`](developing/changelog.md), detalle en [`Store/libros.md`](Store/libros.md) y plan archivado en [`historial/roadmap-store-02.md`](historial/roadmap-store-02.md).
- **Roadmap STORE-04 completado:** libros como herramientas asignables por proyecto (pestaña «Herramientas», carpeta «Libros» en mochila/maletín, visor de solo lectura) y retirada de la pestaña de la Tienda; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-04.md`](historial/roadmap-store-04.md).
- **Roadmap STORE-03A completado:** taxonomía por familias de uso (Educación/Oficina/Productividad) con multi-categoría y subcategorías compartidas, filtros y secciones coherentes, vacíos con «Más adelante» y contrato MCP (`categorias`+`subcategoria`); resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-03a.md`](historial/roadmap-store-03a.md).
- **Roadmap STORE-03B completado:** barra inferior fija (Todo + categorías) y subcategorías como galerías horizontales con fade en Aula Store; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-store-03b.md`](historial/roadmap-store-03b.md).
- **Roadmap UI-02 completado:** cabecera en tres zonas con la marca a la izquierda y Clase centrada, y remix movido a Ajustes > Tu Site; verificado a 1366, 1024 y 390 px. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-ui-02.md`](historial/roadmap-ui-02.md).
- **Roadmap PERM-01 completado:** matriz y delegación de permisos (capacidades con ámbito, roles y concesiones revocables, con control autoritativo de servidor); resumen en [`changelog.md`](developing/changelog.md), matriz en [`Store/matriz-permisos.md`](Store/matriz-permisos.md) y plan archivado en [`historial/roadmap-perm-01.md`](historial/roadmap-perm-01.md).
- **Roadmap PROMO-02 completado:** portada pública nueva de `/` centrada en el producto y el plugin de ChatGPT, con CTA de acceso, enlace a documentación y previsualización estática del tablero; verificada a 1366, 1024 y 390 px en claro y oscuro. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-promo-02.md`](historial/roadmap-promo-02.md).
- **Roadmap PROMO-07 completado (publicación pendiente):** demo preparada para producción con datos compartidos, SQL idempotente sin `instance_apps`, portada que oculta la demo si falta y procedimiento autorizado para Codex; verificada en una D1 limpia. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-promo-07.md`](historial/roadmap-promo-07.md).
- **Roadmap PROMO-06 completado:** estado del motor y aviso «Preparando el motor…», precarga por intención y modo recordado en la calculadora científica, con la decisión de mantener `compute-engine` y la nueva línea base de latencia. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-promo-06.md`](historial/roadmap-promo-06.md).
- **Roadmap PROMO-05 completado:** modo demo sin cuenta y de solo lectura sobre el proyecto ficticio de PROMO-03, con identidad de servidor, cookie `__demo`, entrada desde la portada, banner y bloqueo de escrituras; verificado con D1 limpia y seed. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-promo-05.md`](historial/roadmap-promo-05.md).
- **Roadmap PROMO-04 completado:** páginas públicas de privacidad y condiciones, enlaces desde la portada y la ayuda, y archivos de rastreo (`robots.txt`, `sitemap.xml`, `manifest.webmanifest`) con iconos; verificadas sin sesión a 1366, 1024 y 390 px. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-promo-04.md`](historial/roadmap-promo-04.md).
- **Roadmap PROMO-03 completado:** proyecto de demostración versionado e idempotente (`npm run seed:demo`, `--dry-run` y guarda local) y capturas nuevas de la ayuda desde esa demo a 1200 px y menos de 50 KB; verificada a 1366, 1024 y 390 px. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-promo-03.md`](historial/roadmap-promo-03.md).
- **PROMO-01 cerrado:** metadatos Open Graph, Twitter Card, tarjeta 1200×630 y páginas públicas publicados en 1.1.34; vista previa social comprobada. Plan en [`historial/roadmap-promo-01.md`](historial/roadmap-promo-01.md).
- **Roadmap APP-03B completado:** carpetas personales en la mochila del alumnado y el maletín docente, con organizador y ventanas de carpeta por usuario y proyecto; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-app-03b.md`](historial/roadmap-app-03b.md).
- **Roadmap APP-02 completado:** Calculadora y Tabla periódica como apps independientes, sin Medir ni Lectura; transición de datos idempotente, alias `edu-tools` y catálogo MCP `0.28.0`. Resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-app-02.md`](historial/roadmap-app-02.md).
- **Roadmap PERM-02 completado:** sección «Permisos» en Ajustes (instancia) y pestaña «Permisos» en Profesores y Alumnos (proyecto), generadas desde una fuente única con el servidor; resumen en [`changelog.md`](developing/changelog.md) y plan archivado en [`historial/roadmap-perm-02.md`](historial/roadmap-perm-02.md).
- **Roadmap UI-07 completado:** Documentación como sección de Ajustes, con URL canónica `view=ajustes&section=documentacion` y alias antiguo, y selector de proyecto en el hueco derecho de la cabecera; revisado en 1366, 1024 y 390. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap UI-05 completado:** estados vacíos de alumnado y profesorado con un componente compartido, selector oculto sin fichas y alta conectada a los diálogos existentes; revisado en 1366 y 390. Resumen en [`changelog.md`](developing/changelog.md); roadmap sin fase activa.
- **Roadmap UI-04 completado:** Alumnos y Profesores en una sola vista de administración con sidebar, URL canónica `view=administracion` y alias antiguos, revisada en 1366, 1024 y 390. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap UI-06 completado:** hero del tablero en franja de 71 px con progreso en línea, medido en 1366, 1024, 820 y 390. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap PER-05 completado:** caché inmutable de un año para `/api/files/[id]`, en la respuesta y en los metadatos de R2. Sin cambios de esquema ni de versión; resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap PER-04 completado:** derivado de 2048 px para JPEG, PNG y WebP de pizarra, con los GIF intactos; medición de fotos, PNG con alfa y capturas, más revisión visual del texto. Resumen en [`changelog.md`](developing/changelog.md) y límite de nitidez en el backlog como PER-07.
- **Roadmap PER-01B completado:** inventario de R2 publicado y revisado en producción. Resultado en [`changelog.md`](developing/changelog.md).
- **Roadmap PER-03 completado:** inventario de referencias en tareas, pizarras y documentos, purga idempotente de R2 y `uploads` con 7 días de gracia, simulación previa y control en Ajustes > Almacenamiento. Sin migraciones ni cambio de versión; resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap MCP-05E completado:** lectura, guardado y plantillas de la app Diagramas desde MCP sobre `app_documents`, con la lista de plantillas compartida, límite de 200 KB y bloqueo de invitados. Catálogo `0.26.0` con 59 herramientas; resumen en [`changelog.md`](developing/changelog.md) y cobertura en [`mcp-apps.md`](Store/mcp-apps.md).
- **Roadmap MCP-05D completado:** lectura y guardado del programa de Blockly desde MCP sobre `app_documents`, con límite compartido de 200 KB, validación de `blocks.blocks[]` y bloqueo de invitados. Catálogo `0.25.0` con 56 herramientas; resumen en [`changelog.md`](developing/changelog.md) y cobertura en [`mcp-apps.md`](Store/mcp-apps.md).
- **Roadmap HIER-01 completado:** documentación en `app/board/docs/content/`; `edu-tools` en `calculator/`, `periodic-table/` y `tools/`; diálogo de tareas en `tasks/dialog/`; `modal` en `shared/`; y `project-access` en lugar de `project`. Resumen en [`changelog.md`](developing/changelog.md).
- **Fase 1 completada:** reorganización de `app/board` por dominios, módulos compartidos y estilos.
- **Roadmap CSS completado:** tokens, CSS por feature, limpieza y verificación final. Resumen en [`changelog.md`](developing/changelog.md); la auditoría temporal ya se eliminó.
- **Roadmap de dominio/auth completado:** `lib/domain/`, `lib/server/auth.ts`, regla de frontera y documentación. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de guardas HTTP completado:** `lib/server/http.ts`, 12 rutas con `json`, mutaciones JSON con origen/formato y `uploads` con origen. Publicado en la versión 1.1.17; resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de tareas completado:** `lib/server/tasks/` con tipos, consultas, permisos y mutaciones; ruta HTTP delgada. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de componentes completado:** Aula Store, calculadora, Mermaid, diálogo de tarea, Blockly y Whiteboard divididos; verificación final correcta. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de reintento de pizarra completado:** el error de carga se limpia cuando la pizarra vuelve a cargar; regresión de hook y vista añadida. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de carga por pestañas de `edu-tools` completado:** tabla periódica, medición, lectura y ecuaciones se cargan bajo demanda; datos periódicos en JSON. Resumen en [`changelog.md`](developing/changelog.md).
- **Versión publicada:** 1.1.33. Los últimos hitos están en [`changelog.md`](developing/changelog.md).
- **Roadmap de respuestas sin sesión completado:** contrato 401/403/404/400 aplicado a las 12 rutas y contrato del socket documentado. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de propiedad completado:** identidad estable en `instance_owner`, migración `0028`, helper común y checklist de remix. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de `compute-engine` completado:** motor mantenido, carga selectiva en Científica/Ecuaciones y estado de cálculo. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de documentos completado:** Blockly y Mermaid usan `app_documents`; las dos tablas históricas se retiraron tras la auditoría y respaldo.
- **Roadmap de rendimiento y acabado completado:** tokens CSS, check de Aula Store sin Lottie y fuentes autohospedadas; verificación final correcta. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de versiones de Aula Store completado:** versiones propias por app, versión de la tienda y ficha técnica con upstream y ampliaciones. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de navegación de Clase completado:** Clase como vista principal, sidebar de pantalla partida, Tareas, header de cuatro vistas y Administración con Tienda en su sidebar. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de ajustes generales completado:** vista con sidebar, Cuenta, Administradores y engranaje de cabecera. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de jerarquía de personas completado:** alumnos en `people/students/`, profesores en `people/teachers/` y compartidos en `people/`. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de medición de chunks completado:** inventario, decisión de no dividir librerías lazy y fuentes latinas de Excalidraw autohospedadas. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de sesión de whiteboard completado:** pizarra agrupada y sesión separada en persistencia, conflicto y presencia. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de extracción de Medir completado:** hook y componente propios, shell de 90 líneas y comportamiento conservado. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de URLs por vista y sección completado:** esquema query canónico con `board-url.ts`/`use-board-url.ts`, enlaces de proyecto y `returnTo` completos, y Documentación pública en `/documentacion`. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de portada pública y mensaje de remix completado:** portada anónima en `/` con `getChatGPTUser()`, tablero/API/socket protegidos, mensaje de remix con «quien da la orden» y README con la sección «Visibilidad del Site en Sites». Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de Calendario en Clase completado:** `react-big-calendar` 1.20.0 (MIT) con localizer de `date-fns` en carga diferida, sección `calendario` con las tareas por `dueDate`, `section=calendario` en la URL, estilos con tokens, pruebas y avisos de licencia. Resumen en [`changelog.md`](developing/changelog.md).
- **Site público confirmado** por el propietario el 2026-11-14: la portada anónima de `/` y `/documentacion` son visibles sin sesión. La entrada del backlog queda cerrada.
- **Roadmap de Servidor MCP completado:** servidor MCP remoto en `/api/mcp` con 8 herramientas, tokens personales en Ajustes > Cuenta, límite básico por token y documentación de instalación en README y `/documentacion`. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap MCP-05B completado:** lectura, guardado y adición de pizarras de Excalidraw desde MCP, con publicación en `BoardRoom` y catálogo `0.24.0` con 54 herramientas. Resumen en [`changelog.md`](developing/changelog.md) y cobertura en [`mcp-apps.md`](Store/mcp-apps.md).
- **Roadmap MCP-05A + MCP-05C completado:** contrato común de MCP para apps y primer piloto `consultar_elemento` de Herramientas de aula. Catálogo `0.22.0` con 51 herramientas; resumen en [`changelog.md`](developing/changelog.md) y cobertura en [`mcp-apps.md`](Store/mcp-apps.md).
- **Backlog:** PER-02 y SYNC-01 (2 entradas). MCP-04, MCP-03, MCP-01 y MCP-02 están cerrados; el plugin de Sites sustituye la entrada «GPT con Actions».
- **Roadmap de hidratación en `view=ajustes` completado:** el estado inicial de vista/sección pasa de la página (servidor) al hook, y la primera pintura ya coincide. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de repositorio público en GitHub completado:** `jaminsmoke/aula-kanban` con licencia MIT, textos de licencia de Excalidraw, CI en verde, segundo push con instrucciones de clonado y mensaje de remix con git. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de OAuth 2.1 para MCP y GPT completado:** servidor de autorización en el Site (RFC 7591, PKCE S256, consentimiento SIWC), MCP como resource server con alcances `mcp:read`/`mcp:write` y documentación de conexión para clientes y GPT. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de Plugin de Aula Kanban para Sites completado:** endpoint `/mcp` con identidad de sesión de Sites y catálogo reutilizado, OAuth experimental deshabilitado en producción (503), manifiesto con ejemplo versionado y real gitignored, y plugin publicado y verificado en GPT. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-00 + MCP-12 completado:** fundamentos del catálogo (registro por dominio, errores con contrato HTTP, anotaciones con confirmación, auditoría `mcp_audit_log`, límites del plugin) y su contrato (snapshot de `tools/list`, igualdad de puertas, matriz de roles 8×7 y paridad MCP ↔ HTTP). Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-01 + MCP-02 completado:** esquema de URL en `lib/domain` con enlaces absolutos, herramientas de contexto (`quien_soy`, `obtener_enlace`, `obtener_resumen_proyecto`) e invitaciones, tareas completas (mover, asignar/desasignar, reprogramar, filtros y calendario; 18 herramientas, catálogo `0.4.0`), con matriz de roles 18×7 (122 casos) y paridad extendida. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-03 completado:** Aula Store con lógica extraída a `lib/server/apps.ts` (`appVersion` guardado al instalar), catálogo/ficha/instalación/desinstalación con 403 global compartido y aviso de confirmación (22 herramientas, catálogo `0.5.0`), matriz de roles extendida y paridad. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-04 completado:** enlace profundo `abrir_app` con 404 sin instalación, canal en vivo `SpaceRoom` (escritorio efímero por pestaña; `listar_ventanas`/`cerrar_app`/`minimizar_app`/`restaurar_app`/`ampliar_app` y `abrir_app` en vivo) y recurso `ui://` SEP-1865 (sin `ext-apps`) con `_meta` en `abrir_app`; catálogo en 28 herramientas (`0.7.0`), matriz de roles 191 casos y paridad 18. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap documental de cara al usuario completado:** DOC-01, DOC-05, DOC-02, DOC-03, DOC-04, DOC-06, DOC-10, DOC-12, DOC-08, DOC-09 y DOC-11 cerrados (ayuda reescrita por secciones, tabla de permisos, FAQ con mensajes reales, test de cobertura y capturas WebP sobre un proyecto de demostración). Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-06 completado:** fichas de alumnado y profesorado por MCP (leer, crear, editar y eliminar) con lógica compartida en `lib/server/people/`, 36 herramientas (`0.10.0`), matriz, snapshot y paridad HTTP ↔ MCP. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-07 completado:** miembros e invitaciones por MCP (listar sin `userId`, invitar y retirar con confirmación) con lógica compartida en `lib/server/members.ts`, 39 herramientas (`0.13.0`), matriz, snapshot y paridad HTTP ↔ MCP. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap de MCP-08 completado:** crear y eliminar proyectos por MCP con lógica compartida en `lib/server/projects.ts`, aviso con recuento, nombre exacto, `unavailable` 503 si quedan archivos y 41 herramientas (`0.16.0`), con matriz, snapshot y paridad HTTP ↔ MCP. Resumen en [`changelog.md`](developing/changelog.md).
- **Roadmap DOC-07 + MCP-11 completado:** catálogo público en `lib/domain/mcp-catalogo.ts`, instrucciones y prompts compartidos por `/mcp` y `/api/mcp`, guía del plugin en la ayuda y README generada desde el catálogo. Resumen en [`changelog.md`](developing/changelog.md). Backlog: MCP-05, MCP-10 y recortes de chunks (3 entradas).
- **Roadmap de MCP-09 completado:** administración de la instancia, tokens propios y auditoría por MCP (7 herramientas, catálogo `0.19.0`), con matriz, snapshot, paridad y pruebas SQLite. Resumen en [`changelog.md`](developing/changelog.md). Backlog: MCP-05, MCP-10 y recortes de chunks (3 entradas).
- **Roadmap de MCP-10 completado:** archivos del proyecto por MCP con `subir_archivo` y `obtener_archivo`, límites compartidos con la web, matriz ampliada y 50 herramientas (`0.20.0`). Resumen en [`changelog.md`](developing/changelog.md). Backlog: MCP-05 y recortes de chunks (2 entradas).
- **Roadmap UI-03 completado:** Ajustes separado en Cuenta, Apariencia, Tokens MCP, Administradores y Almacenamiento, con URLs compatibles, permisos por sección y enlaces MCP actualizados. Sin migraciones; resumen en [`changelog.md`](developing/changelog.md). Después se completó el roadmap MCP-05A + MCP-05C. Backlog: 7 entradas (PER-03, PER-01B, PER-02, SYNC-01 y MCP-05B, MCP-05D y MCP-05E). La inspección visual de UI-03 queda pendiente.
- **Roadmap UI-01 completado:** sistema visual con superficies semánticas, contraste AA, tipografía, iconografía, temas claro/oscuro, bordes/radios, guarda de color y cierre documental. Fases 1-8 completadas; resumen en [`changelog.md`](developing/changelog.md). SYNC-01 permanece como norma operativa; PERF-01 y los roadmaps anteriores están en [`changelog.md`](developing/changelog.md), y el roadmap anterior de PER-01 sigue en [`historial/roadmap-per-01.md`](historial/roadmap-per-01.md). La inspección visual en navegador de UI-01 queda pendiente.

## Documentación relacionada

- [`../README.md`](../README.md): instalación, desarrollo, base de datos y migraciones.
- [`../AGENTS.md`](../AGENTS.md): reglas del repo personal, publicación por Codex y trabajo del agente.
- [`../package.json`](../package.json): dependencias y scripts del proyecto.
- [`rendimiento.md`](rendimiento.md): línea base de chunks, presupuestos y generación del informe con `npm run perf:report`.
- [`estilos.md`](estilos.md): inventario de CSS, capas de tokens y reglas del sistema visual.
