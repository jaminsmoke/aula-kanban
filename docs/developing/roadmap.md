# Roadmap STORE-01 · Vistas y secciones físicas en Aula Store

> **Estado:** En curso (2026-11-15)
> **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [x] Aula Store deja de ser una única rejilla plana y pasa a tener vistas (Aplicaciones, con Libros preparada para STORE-02) y, dentro de Aplicaciones, un apartado «Mejores aplicaciones» más secciones físicas por categoría, al estilo Google Play / App Store.
- Criterio de éxito: al abrir Aula Store se ve primero «Mejores aplicaciones» y después cada categoría como sección con sus tarjetas; el buscador, los filtros, la ficha y la instalación siguen funcionando como antes.

## 2. Alcance

**Dentro:**
- Vista «Aplicaciones» de Aula Store con secciones físicas por categoría (las actuales: Aula, Pizarras, Programación, Diagramas) reutilizando la tarjeta existente, que ya muestra la categoría.
- Apartado «Mejores aplicaciones» con una lista curada en el código (`FEATURED_APP_IDS` en `store-model.ts`); con el catálogo actual las cuatro apps son destacadas.
- Estructura de vistas de Tienda: «Aplicaciones» activa y «Libros» deshabilitada con «Próximamente» (STORE-02, sin contenido fingido).
- Compatibilidad total: buscador, filtros de categoría/instaladas, ficha de detalle, instalar/desinstalar y roles (solo owner/admin gestionan).

**Fuera de alcance:**
- Renombrar la taxonomía (Educación, Oficina, Productividad…): queda en el backlog como STORE-03.
- La vista de Libros y las familias descargables: STORE-02.
- Cambios en instalación, permisos, MCP o esquema de datos.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Secciones físicas por categoría con las categorías actuales | Renombrar la taxonomía ahora | Las tarjetas ya llevan `category`; renombrar es una decisión mayor (STORE-03) y no debe hacerse «a lo loco» |
| «Mejores aplicaciones» como lista curada en `store-model.ts` | Destacar por instalación o por orden del catálogo | Es una selección editorial, como en Play Store; al crecer el catálogo se cura la lista |
| Vista «Libros» deshabilitada, sin contenido | No mostrar ninguna segunda vista | Deja visible la estructura de vistas pedida sin inventar catálogo |
| Modo inicio (secciones) vs. modo filtrado (rejilla única) | Secciones siempre, también al buscar | Al buscar/filtrar, una única rejilla de resultados es lo esperado; en inicio, las secciones físicas |

## 4. Fases

### Fase 1: Vistas y secciones físicas — completada
- [x] Vista de Tienda con pestañas «Aplicaciones» (activa) y «Libros» (deshabilitada, «Próximamente»).
- [x] En Aplicaciones, modo inicio con «Mejores aplicaciones» y una sección por categoría visible, con la tarjeta existente.
- [x] Lista curada `FEATURED_APP_IDS` en `store-model.ts`.
- **Criterios de aceptación:** al abrir Aula Store se ven las pestañas, «Mejores aplicaciones» y las secciones por categoría con sus tarjetas; «Libros» no abre contenido.

### Fase 2: Compatibilidad y acabado — completada
- [x] Al buscar o filtrar (categoría/instaladas), una única rejilla de resultados como hasta ahora.
- [x] Ficha de detalle, acciones Abrir/Instalar/Desinstalar y roles sin regresión; claves únicas al repetir una app en destacadas y su categoría.
- [x] Responsive y accesibilidad (pestañas, foco visible); ayuda de workspace actualizada.
- **Criterios de aceptación:** buscador, filtros, ficha y gestión funcionan igual que antes; sin errores de consola ni desbordes a 390 px.

### Fase 3: Verificación y cierre
- [ ] Suite completa, `tsc`, ESLint y build en verde.
- [ ] Revisión en navegador local de Aula Store (vistas, secciones, búsqueda, ficha, instalación).
- [ ] Resumen arriba de `changelog.md`, roadmap reiniciado y push único a `github main`.
- **Criterios de aceptación:** todo verificado y el roadmap cerrado en local y en GitHub, sin publicar en Sites.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Tarjetas duplicadas (destacadas + categoría) rompen tests de `getByRole` | Tests frágiles | Consultas por `getAllByRole` y claves por sección |
| «Mejores» con 4 apps muestra todo dos veces | Ruido visual | Aceptado con el catálogo actual; la lista curada ordena y acotará al crecer |
| Renombrar categorías afectaría a MCP y documentación | Alcance mayor | Fuera de alcance: STORE-03 en el backlog |

## 6. Notas de sesión

- 2026-11-15: STORE-01 entra al roadmap desde el backlog con el alcance clarificado por el usuario (secciones físicas con las categorías actuales + mejores apps; Libros para STORE-02; taxonomía nueva aparcada como STORE-03).
