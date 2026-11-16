# Roadmap PROMO-01 · Vista previa en redes (Open Graph y Twitter Card)

> **Estado:** En curso
> **Inicio:** 2026-11-16
> **Entrada:** PROMO-01 — los enlaces públicos a Aula Kanban deben mostrar una tarjeta grande y reconocible al compartirlos en redes y mensajería.
> **Backlog:** PROMO-02..06 (5 entradas, pendientes de debate)
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Que cualquier enlace público a Aula Kanban muestre una tarjeta Open Graph coherente, con imagen de 1200×630, título y descripción, en LinkedIn, X, Facebook y WhatsApp.
- [ ] Criterio de éxito: el HTML servido sin sesión contiene `og:title`, `og:description`, `og:url`, `og:image` absoluta y `twitter:card=summary_large_image`; la imagen responde 200 con las dimensiones correctas y los validadores no muestran errores.

## 2. Alcance

**Dentro:**
- Resolver la URL pública canónica con una variable de entorno y un fallback para el Site actual.
- Metadatos compartidos en `app/layout.tsx`: `metadataBase`, Open Graph y Twitter Card.
- Imagen social estática `public/og/aula-kanban.png` de 1200×630, sin datos de una cuenta ni de un proyecto.
- Pruebas de los metadatos y del HTML público servido; validación en los principales validadores sociales.
- Documentar la variable de URL y el proceso de sustituir la imagen.

**Fuera de alcance:**
- Imágenes generadas por petición (`opengraph-image.tsx`) o tarjetas distintas por proyecto, tarea o cuenta.
- Metadatos propios para `/documentacion` u otras rutas: en esta fase todas comparten la tarjeta raíz.
- Cambiar la portada pública, el vídeo, las páginas legales o el modo demo (PROMO-02..05).
- Publicar en Sites, cambiar de dominio o crear cuentas en redes sociales.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **PNG estático en `public/og/`** | `app/opengraph-image.tsx` generado en el Worker | La imagen se revisa una vez, no depende de fuentes ni de runtime y evita sorpresas de soporte en vinext/Workers. |
| **Tarjeta única en el layout raíz** | Metadatos distintos por ruta | El producto y el mensaje son los mismos; una sola fuente evita divergencias y mantiene el alcance pequeño. |
| **`NEXT_PUBLIC_SITE_URL` con fallback al Site actual** | URL fija incrustada | El Site actual funciona sin configuración, y una copia puede anunciar su propio dominio. |
| **PNG 1200×630** | WebP o SVG | Es el formato y tamaño que aceptan de forma consistente los rastreadores sociales. |
| **Imagen de marca sin captura de cuenta** | Recorte de `espacio.webp` | Evita mostrar «Seedy» o el proyecto «pruebas» y no bloquea la promoción con PROMO-03. |

## 4. Fases

### Fase 1: URL canónica y metadatos — completada
- [x] Añadir una constante/helper de URL pública con `NEXT_PUBLIC_SITE_URL` y fallback `https://aula-kanban.doubleoak32.chatgpt.site`, documentando que una copia debe configurar su dominio.
- [x] Ampliar `metadata` en `app/layout.tsx` con `metadataBase`, `openGraph` (`title`, `description`, `url`, `type`, `locale: es_ES`, `siteName` e `images`) y `twitter` (`card: summary_large_image`, `title`, `description`, `images`).
- [x] Añadir una prueba que compruebe la URL base, el locale, el tipo y que la imagen declarada es `/og/aula-kanban.png` con `alt`.
- **Criterios de aceptación:** los metadatos se generan sin depender de la sesión; la URL de imagen es absoluta al renderizar; ningún dato personal entra en la tarjeta.

**Implementado (2026-11-16):** `lib/domain/site.ts` centraliza la URL pública, el nombre, la descripción y la imagen social; `resolveSiteUrl` acepta solo HTTP/HTTPS, normaliza al origen y cae al dominio actual si la variable falta o no es válida. `app/layout.tsx` publica `metadataBase`, Open Graph y Twitter Card con una imagen absoluta de 1200×630. `lib/domain/site.test.ts` y `app/layout.test.ts` cubren la resolución y el contrato de metadatos; el README documenta `NEXT_PUBLIC_SITE_URL`.

### Fase 2: Imagen social — completada
- [x] Diseñar `public/og/aula-kanban.png` a 1200×630 con la marca, una frase corta y los cinco iconos de apps o una composición equivalente; sin capturas con datos reales.
- [x] Optimizar el PNG (objetivo < 300 KB) y añadir caché razonable para `/og/*` si encaja con `public/_headers`.
- [x] Revisar la tarjeta a tamaño completo y en la previsualización reducida de LinkedIn, X y WhatsApp; comprobar que el texto clave sigue legible.
- **Criterios de aceptación:** la imagen mide exactamente 1200×630, se sirve con `200` y `image/png`, y no contiene texto cortado ni datos de una cuenta.

**Implementado (2026-11-16):** la tarjeta combina la marca, «Tu clase, en orden.», la propuesta de tareas, calendario, pizarras y apps con IA, y un escritorio simulado con el dock de cinco apps y el chip «Plugin de ChatGPT». No reutiliza capturas ni incluye nombres de cuenta o proyecto. El PNG mide 1200×630 y pesa **121 KB**; `public/_headers` sirve `/og/*` con caché pública de un día. Se revisó a tamaño completo y a 600×315: el titular y la propuesta siguen legibles y no hay texto cortado.

### Fase 3: Verificación y cierre — pendiente
- [ ] Suite completa, `tsc`, ESLint, build y `perf:budget`; comprobar el HTML público de `/` y `/documentacion` con la build servida.
- [ ] Pasar LinkedIn Post Inspector, Facebook Sharing Debugger y X Card Validator; probar un enlace en WhatsApp; repetir tras publicar si cambia la URL.
- [ ] Actualizar README, ayuda/documentación si procede, changelog y archivar este roadmap.
- **Criterios de aceptación:** todos los validadores leen título, descripción e imagen; la tarjeta se ve bien en redes y mensajería; sin regresiones en la portada ni en las pruebas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un remix conserva la URL del Site original | La tarjeta enlaza al dominio equivocado | Variable de entorno documentada y fallback solo para el Site actual. |
| Los rastreadores conservan una tarjeta antigua | Se sigue viendo la vista previa anterior | Revalidar en cada validador tras publicar; no cambiar la URL de la imagen sin motivo. |
| La imagen pesa demasiado o tiene texto diminuto | La tarjeta tarda o se lee mal | PNG optimizado, composición simple y revisión a tamaño reducido. |
| Duplicar etiquetas por usar imagen estática y ruta generada | Metadatos contradictorios | Una sola vía: archivo estático declarado en `metadata`. |
| La URL de Sites cambia | `metadataBase` queda obsoleto | Configurar `NEXT_PUBLIC_SITE_URL` en el despliegue y revisar antes de publicar. |

## 6. Notas de sesión

- 2026-11-16: PROMO-01 sale del backlog como primera fase de promoción. Se elige tarjeta estática compartida y se deja PROMO-02..06 en el backlog a la espera de debate.
- 2026-11-16: la imagen no reutilizará las capturas actuales para no publicar nombres de cuenta o proyecto; la captura de producto se abordará en PROMO-03.
- 2026-11-16: Fase 1 completada; los metadatos ya apuntan a `/og/aula-kanban.png`, que se crea en la Fase 2.
- 2026-11-16: Fase 2 completada; la tarjeta se revisó a 1200×630 y 600×315, y `/og/*` queda con caché de un día para poder sustituir el archivo sin esperar un año.
