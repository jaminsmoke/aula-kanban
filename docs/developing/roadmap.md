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

### Fase 1: Taxonomía cerrada en el catálogo
- [ ] Categorías principales, subcategorías y `categories: string[]` + `subcategory` por app en `lib/native-apps.ts`.
- [ ] Asignaciones iniciales: excalidraw → Educación/Pizarras; edu-tools → Educación/<sub nueva>; blockly → Productividad/Programación; mermaid → Educación y Productividad/Diagramas.
- [ ] Pruebas del catálogo (cobertura: cada app visible en ≥1 categoría; subcategorías del vocabulario).
- **Criterios de aceptación:** cada app visible pertenece a ≥1 categoría principal; el vocabulario de subcategorías es cerrado y compartido.

### Fase 2: Tienda según la nueva taxonomía
- [ ] Ficha de app con su(s) categoría(s) principal(es) y subcategoría.
- [ ] Secciones y filtros de Aula Store por categoría principal (conteos coherentes con apps multi-categoría).
- [ ] Estados vacíos para Oficina y Productividad («más adelante»).
- **Criterios de aceptación:** cada app visible aparece en ≥1 categoría principal con su subcategoría; sin regresión en búsqueda e instaladas.

### Fase 3: MCP, documentación, verificación y cierre
- [ ] Contrato MCP (`categoria` → multi-categoría) con docs (`docs/Store/mcp-apps.md`) y tests/snapshots actualizados.
- [ ] Documentación de ayuda y `docs/Store/libros.md` no afectados (verificar menciones).
- [ ] Suite completa, `tsc`, ESLint y build en verde; revisión en navegador local y en 390 px.
- [ ] Resumen arriba de `changelog.md`, roadmap archivado y reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambio de contrato MCP rompe a clientes/IA | Incompatibilidad con consumidores del campo `categoria` | Decisión explícita del nuevo contrato (array) + docs; cambio documentado en changelog. |
| Conteos de filtros-sección incoherentes con apps en dos categorías | Números distintos según dónde se mire | Una app en dos categorías cuenta una vez por categoría; pruebas con apps multi-categoría. |
| Taxonomía con apps que no encajan | Apps sin hogar | Vocabulario abierto a subcategorías nuevas solo por código (taxonomía cerrada en `lib/native-apps.ts`). |

## 6. Notas de sesión

- 2026-11-16: roadmap creado tras la revisión del split STORE-03 (usuario). Decisiones de taxonomía, multi-categoría, subcategorías y categorías vacías tomadas en la revisión; el split con 03B (navegación y carruseles) quedó en backlog.
