> **Archivo:** conservado el 2026-11-16 al reiniciar el roadmap; el resumen de cierre está arriba de `docs/developing/changelog.md` y los pendientes vigentes en el backlog.

# Roadmap STORE-03A · Taxonomía de la Tienda por familias de uso (multi-categoría)

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** STORE-03A — Las categorías de la Tienda pasan a ser familias de uso (Educación, Oficina, Productividad) con multi-categoría por app y subcategorías compartidas.
> **Backlog:** STORE-03B (barra inferior y galerías horizontales, depende de este), APP-03 (carpetas de mochila/maletín), APP-02, PERM-01.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Que cada app de Aula Store pertenezca a una o varias categorías principales (Educación, Oficina, Productividad) y a una subcategoría compartida, con filtros y secciones coherentes.
- [ ] Criterio de éxito: cada app visible aparece en ≥1 categoría principal con su subcategoría; Oficina y Productividad pueden estar vacías con «más adelante»; el contrato MCP refleja el modelo nuevo.

## 2. Alcance

**Dentro:**
- Taxonomía cerrada en `lib/native-apps.ts`: categorías principales, subcategorías y apps asignadas (`categories: string[]` + `subcategory` en cada ficha).
- Ficha de app, secciones y filtros de Aula Store según la categoría activa.
- Contrato y catálogo MCP (`categoria` → nuevo campo multi-categoría) con docs y tests actualizados.
- Estados vacíos para Oficina y Productividad.

**Fuera de alcance:**
- Barra inferior de navegación y galerías horizontales (STORE-03B).
- Libros (STORE-04: herramienta asignable, fuera de esta taxonomía).
- Nuevas apps ni paquetes.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Categorías principales: **Educación, Oficina, Productividad** | Mantener Aula/Pizarras/Programación/Diagramas | Son familias de uso, orientadas a quién la usa y para qué, como App Store/Play Store. |
| `categories: string[]` (multi-categoría) | Campo único | Una app puede servir a varias familias (p. ej. Diagramas para Educación y Productividad). |
| **Subcategorías compartidas** (p. ej. «Diagramas» existe dentro de ambas) | Subcategoría propia por categoría | Una app pertenece a la misma subcategoría en todas sus categorías principales; vocabulario único. |
| Programación como **subcategoría de Productividad** (y de Educación si encaja) | Categoría principal propia | Hoy hay una sola app de programación y encaja más en Productividad. |
| «Aula» desaparece; Pizarras y Diagramas pasan a subcategorías de Educación | Mantener «Aula» | Resto de taxonomía vieja incompatible con familias de uso. |
| Oficina y Productividad pueden nacer **vacías** | No crearlas hasta tener apps | Mejor explícitas con «más adelante» para que añadir apps sea trivial. |

## 4. Fases

### Fase 1: Taxonomía cerrada en el catálogo — completada
- [x] Categorías principales, subcategorías y `categories: string[]` + `subcategory` por app en `lib/native-apps.ts`.
- [x] Asignaciones iniciales: excalidraw → Educación/Pizarras; edu-tools → Educación/Herramientas; blockly → Productividad/Programación; mermaid → Educación y Productividad/Diagramas.
- [x] Pruebas del catálogo (cobertura: cada app visible en ≥1 categoría; subcategorías del vocabulario).
- **Criterios de aceptación:** cada app visible pertenece a ≥1 categoría principal; el vocabulario de subcategorías es cerrado y compartido.

**Implementado (2026-11-16):** categorías principales Educación/Oficina/Productividad (`STORE_TOP_CATEGORIES`) y subcategorías Pizarras/Diagramas/Programación/Herramientas (`STORE_SUBCATEGORIES`); `category` → `categories: string[]` + `subcategory` en cada ficha, con los consumidores migrados (filtros, secciones, tarjeta con subcategoría, ficha con categorías, preferencias personales, contrato MCP `categorias`+`subcategoria` e iconos por categoría). Verificado en el navegador: «Mejores aplicaciones» (4), Educación (3) y Productividad (2, con Diagramas en ambas); Oficina sin sección por estar vacía.

### Fase 2: Tienda según la nueva taxonomía — completada
- [x] Ficha de app con su(s) categoría(s) principal(es) y subcategoría.
- [x] Secciones y filtros de Aula Store por categoría principal (conteos coherentes con apps multi-categoría).
- [x] Estados vacíos para Oficina y Productividad («más adelante»).
- **Criterios de aceptación:** cada app visible aparece en ≥1 categoría principal con su subcategoría; sin regresión en búsqueda e instaladas.

**Implementado (2026-11-16):** filtros siempre con las tres categorías y sus conteos (Oficina aparece con 0); en la vista principal se renderizan también las secciones vacías con el aviso «Más adelante: habrá más aplicaciones de …»; filtrando por una categoría vacía se muestra el mismo aviso al no haber resultados; la tarjeta lleva la subcategoría y la ficha, las categorías principales separadas por «·» más la subcategoría. Verificado en el navegador: secciones Educación (3, Diagramas incluida), Oficina (0 con aviso) y Productividad (2); filtro Oficina con su vacío.

### Fase 3: MCP, documentación, verificación y cierre — completada
- [x] Contrato MCP (`categoria` → multi-categoría) con docs (`docs/Store/mcp-apps.md`) y tests/snapshots actualizados.
- [x] Documentación de ayuda y `docs/Store/libros.md` no afectados (verificar menciones).
- [x] Suite completa, `tsc`, ESLint y build en verde; revisión en navegador local y en 390 px.
- [x] Resumen arriba de `changelog.md`, roadmap archivado y reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

**Implementado (2026-11-16):** `listar_apps`/`obtener_app` devuelven `categorias` + `subcategoria` (sin referencias viejas en `mcp-apps.md` ni en la ayuda; se actualizó `docs/Store/aplicaciones-nativas.md`); suite 137 archivos / 1.078 pruebas, `tsc`, ESLint y build en verde; sin regresión en búsqueda ni instaladas; a 390 px la rejilla colapsa a una columna (`minmax(min(290px,100%),1fr)`) y los filtros ocupan fila completa. Resumen en `changelog.md`, roadmap archivado en `docs/historial/roadmap-store-03a.md` y push único.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambio de contrato MCP rompe a clientes/IA | Incompatibilidad con consumidores del campo `categoria` | Decisión explícita del nuevo contrato (array) + docs; cambio documentado en changelog. |
| Conteos de filtros-sección incoherentes con apps en dos categorías | Números distintos según dónde se mire | Una app en dos categorías cuenta una vez por categoría; pruebas con apps multi-categoría. |
| Taxonomía con apps que no encajan | Apps sin hogar | Vocabulario abierto a subcategorías nuevas solo por código (taxonomía cerrada en `lib/native-apps.ts`). |

## 6. Notas de sesión

- 2026-11-16: roadmap creado tras la revisión del split STORE-03 (usuario). Decisiones de taxonomía, multi-categoría, subcategorías y categorías vacías tomadas en la revisión; el split con 03B (navegación y carruseles) quedó en backlog.
