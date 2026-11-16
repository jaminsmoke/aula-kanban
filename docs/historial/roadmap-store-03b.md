> **Archivo:** conservado el 2026-11-16 al reiniciar el roadmap; el resumen de cierre está arriba de `docs/developing/changelog.md` y los pendientes vigentes en el backlog.

# Roadmap STORE-03B · Barra inferior y galerías horizontales en Aula Store

> **Estado:** Completado
> **Inicio:** 2026-11-16
> **Entrada:** STORE-03B — La Tienda deja el scroll infinito: navegación inferior fija con Todo + categorías y subcategorías como galerías horizontales (App Store / Play Store).
> **Backlog:** APP-03 (carpetas de mochila/maletín), APP-02, PERM-01.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Que Aula Store se navegue con una barra inferior fija (Todo + Educación/Oficina/Productividad) y que cada categoría presente sus subcategorías como galerías horizontales con fade lateral.
- [ ] Criterio de éxito: la categoría activa se cambia desde la barra inferior siempre visible; las apps se reparten en galerías horizontales por subcategoría sin scrollbar; sin scroll infinito ni barras de scroll visibles.

## 2. Alcance

**Dentro:**
- Reestructuración de `AppsStore`: cabecera y catálogo con scroll propio + barra inferior fija fuera del scroll.
- Barra inferior con Todo y las tres categorías principales (activa resaltada); compatibilidad con búsqueda e instaladas (siguen arriba).
- Subcategorías como carruseles horizontales con scroll-snap y fade en los bordes (máscara CSS), sin scrollbar visible.
- Categorías vacías con su aviso «Más adelante» dentro de la vista (sin galería).

**Fuera de alcance:**
- Nuevas categorías, subcategorías o apps.
- Libros (STORE-04) y carpetas de mochila/maletín (APP-03).
- Material design real; SOLO tokens del sistema visual existente.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Barra inferior fija** dentro de la ventana de Tienda | Secciones finales del catálogo | Es el patrón de App Store/Play Store: la navegación principal siempre visible y el scroll queda corto. |
| Subcategorías como **galerías horizontales** con fade (máscara) | Rejillas verticales por subcategoría | Contenido más denso y navegable sin scroll infinito; el fade comunica el desbordamiento sin scrollbar visible. |
| «Todo» entra como una tab más de la barra; «Mejores aplicaciones» pasa a su cabecera | Mantener «Mejores» como vista propia | Coherente con STORE-03A: el Todo es la vista global y Mejores su selección editorial. |
| Reestructurar `.store-catalog` (salir de `absolute inset: 0`) | Barra absoluta dentro del scroll | La barra debe quedarse fija fuera del área con scroll; la estructura actual la anclaría mal. |
| Carruseles con scroll nativo + snap | Carrusel controlado con JS | Táctil/mouse/trackpad natural y sin librerías nuevas. |

## 4. Fases

### Fase 1: Barra inferior fija con Todo y categorías
- [x] Reestructuración de `AppsStore` (cabecera, scroll propio y barra inferior fuera del scroll).
- [x] Barra inferior: Todo, Educación, Oficina, Productividad (+ Instaladas se mantiene como filtro superior).
- [x] La navegación por categorías reemplaza filtros superiores de categoría sin regresión en búsqueda e instaladas.
- **Criterios de aceptación:** cambiar de categoría desde la barra sin perder la barra al hacer scroll; búsqueda/instaladas intactos.

### Fase 2: Galerías horizontales con fade por subcategoría
- [x] Dentro de cada categoría, las apps se reparten en galerías por subcategoría (compartida entre categorías).
- [x] Fade lateral con máscara CSS, scroll-snap y sin scrollbar visible.
- [x] Categorías vacías con su aviso sin galería.
- **Criterios de aceptación:** cada categoría muestra sus subcategorías como galerías horizontales; los fades comunican el desbordamiento; sin barras de scroll visibles.

### Fase 3: Verificación y cierre — completada
- [x] Suite completa, `tsc`, ESLint y build en verde; revisión en navegador local y en 390 px.
- [x] Resumen arriba de `changelog.md`, roadmap archivado y reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

**Implementado (2026-11-16):** suite completa 137 archivos / 1.079 pruebas, `tsc`, ESLint completo y build en verde; dev local responde 200 y la estructura a 390 px se verificó por CSS y tests (barra de 4 tabs flex, tarjetas de galería de 272 px con `max-width: 78vw`, sin scroll horizontal); sin `release:prepare` ni publicación en Sites (el push no publica; la publicación es de Codex). Resumen en `changelog.md`, roadmap archivado en `docs/historial/roadmap-store-03b.md` y push único.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La barra fija roba altura útil en la ventana (sobre todo a 390 px) | Contenido reducido | Barra compacta con iconos y etiqueta corta; a 390 px sigue cabiendo (4–5 destinos). |
| Los fades ocultan tarjetas al inicio/fin | Apps invisibles | La máscara solo esconde el desbordamiento; scroll-snap deja la primera/de la última visible al desplazar. |
| Estado de «Instaladas» ambiguo con la barra | Duplicidad de navegación | Instaladas sigue como filtro superior (alternable con cualquier categoría), no como tab inferior. |

## 6. Notas de sesión

- 2026-11-16: roadmap creado tras cerrar STORE-03A; la entrada STORE-03B sale del backlog y la de STORE-03A se elimina (regla de flujo).
- 2026-11-16: Fase 1 completada — `.store-shell` (column flex) con `.store-catalog` de scroll propio y `.store-bottombar` fija (Todo + 3 categorías, `aria-current`); chips de categoría retirados de `StoreFilters` (quedan búsqueda + Instaladas combinable). Suite de catálogo 6/6, `tsc` y ESLint en verde. La entrada STORE-03B se eliminó del backlog al pasar al roadmap.
- 2026-11-16: Fase 2 completada — `StoreGallery` (scroll nativo + snap, fade con máscara solo si desborda, sin scrollbar) y `renderCategoryGalleries` (Educación: Pizarras/Diagramas/Herramientas; Productividad: Diagramas/Programación; Oficina vacía sin galería); «Mejores» como galería en Todo. Suite de catálogo 7/7, `tsc` y ESLint en verde.
- 2026-11-16: Fase 3 completada — suite completa 137/1.079, `tsc`, ESLint y build en verde; roadmap archivado y reiniciado, resumen en `changelog.md` y push único a `github main`, sin publicar en Sites ni cambiar la versión (1.1.31).
