# Roadmap PROMO-02 · Portada pública nueva

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** PROMO-02 — la portada anónima de `/` debe explicar el producto, para quién es y por qué destaca el plugin, con una entrada clara a la aplicación.
> **Dependencias:** PROMO-01 (mensaje e imagen social; su cierre externo sigue pendiente) y PROMO-03 (capturas de la demo; no bloquean la primera versión, que puede usar la ilustración existente).
> **Backlog:** PROMO-01 pausado y PROMO-03..06 pendientes de debate.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Rehacer la portada pública de `/` para que un visitante sin sesión entienda qué es Aula Kanban, cómo organiza el trabajo de clase y qué aporta el plugin de ChatGPT, sin mostrar datos de ninguna instancia.
- [ ] Criterio de éxito: la portada se ve sin sesión, mantiene el inicio de sesión con `returnTo` y el enlace a `/documentacion`, no desborda a 1366, 1024 ni 390 px, y no aumenta el presupuesto de rendimiento del flujo `tablero`.

## 2. Alcance

**Dentro:**
- Rehacer `app/portada.tsx` en la misma ruta `/`; no crear `/landing`.
- Explicar el producto en bloques breves: tablero y calendario, personas y materiales, pizarras y apps, y plugin de ChatGPT.
- Dar una entrada principal a la aplicación y un enlace secundario a la documentación, conservando el `returnTo` de la URL profunda.
- Usar la identidad visual, las fuentes y los tokens existentes; se puede reutilizar `HeroArt` o una composición estática equivalente.
- Una hoja de estilos propia de la portada y pruebas de contenido, rutas y rama sin sesión.
- Documentar el cambio en README o ayuda si el texto de presentación lo necesita.

**Fuera de alcance:**
- Crear el proyecto de demo, sembrarlo o hacer capturas nuevas: eso pertenece a PROMO-03. Si ese material llega durante este roadmap, se integra sin rehacer la estructura.
- Producir el vídeo promocional completo. Un vídeo pesado exigiría póster y `preload="none"`, pero no es requisito para esta portada.
- Añadir el botón de demo sin cuenta (PROMO-05), las páginas legales y de rastreo (PROMO-04) o cambiar precios, cuentas o dominio.
- Cambiar los metadatos sociales o la tarjeta ya implementados en PROMO-01.
- Publicar en Sites o modificar migraciones. La publicación y la validación en producción siguen el flujo del repositorio.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Mantener `/` como única URL pública** | Crear `/landing` | Evita dos portadas, enlaces duplicados y una redirección extra; `/` ya es la entrada pública. |
| **Una composición de marca sin datos reales** | Capturas de una cuenta o proyecto | La portada no debe publicar nombres, correos ni proyectos; PROMO-03 aportará material controlado. |
| **CSS propio `app/portada.css` importado desde `portada.tsx`** | Añadirlo a `app/layout.tsx` | La portada no debe cargar su CSS en el tablero, la documentación ni las pantallas de acceso. |
| **`Portada` sigue siendo un componente de servidor** | Convertirlo en cliente para animaciones | El inicio de sesión debe ser una navegación superior y la portada no necesita estado propio. |
| **Ilustración estática o `HeroArt` según el coste** | Añadir movimiento por defecto | La portada promocional no debe inflar el flujo `tablero`; si `HeroArt` añade demasiado cliente, se usa una versión estática. |
| **Mensaje alineado con `SITE_DESCRIPTION` y la tarjeta social** | Textos distintos por superficie | La imagen, el título y la propuesta deben contar la misma historia al compartir y al entrar. |

## 4. Fases

### Fase 1: Contenido y estructura — pendiente
- [ ] Auditar `app/portada.tsx`, `app/page.tsx`, `app/portada.test.tsx` y `app/page.test.tsx`; conservar la rama anónima y el tablero autenticado.
- [ ] Definir una jerarquía breve: héroe con la propuesta y el CTA, tres o cuatro bloques de valor, plugin de ChatGPT y pie con documentación.
- [ ] Redactar textos en castellano que expliquen el producto sin datos de la instancia y sin prometer funciones que el rol del visitante no tendrá.
- [ ] Quitar el `style={{...}}` en línea de los botones y mantener el inicio de sesión como `<a target="_top">`.
- **Criterios de aceptación:** `/` sin sesión muestra la nueva portada; con sesión sigue mostrando el tablero; el enlace de acceso conserva el `returnTo`; los tests cubren los CTA y la ruta de documentación.

### Fase 2: Diseño visual, temas y responsive — pendiente
- [ ] Crear `app/portada.css` junto a `portada.tsx`, usando solo tokens y sin modificar `.session-card`, que comparten otras pantallas.
- [ ] Componer el héroe y los bloques con la tipografía, el color y la ilustración de la marca; reutilizar `HeroArt` solo si el coste de cliente y movimiento es aceptable.
- [ ] Revisar 1366, 1024 y 390 px en tema claro y oscuro, foco de teclado, contraste y ausencia de desbordamiento horizontal.
- [ ] Respetar `prefers-reduced-motion` si hay animación y evitar imágenes o vídeos que empeoren la carga inicial.
- **Criterios de aceptación:** la portada se entiende y se recorre en las tres anchuras; no aparecen colores crudos ni desbordes; la entrada principal es visible sin hacer scroll en escritorio y alcanzable en móvil.

### Fase 3: Verificación y cierre — pendiente
- [ ] Ejecutar suite completa, `tsc`, ESLint, build y `perf:budget`; comparar el flujo `tablero` con la línea base.
- [ ] Servir la build y comprobar `/` sin sesión, `/documentacion`, el enlace de inicio de sesión y que los metadatos sociales de PROMO-01 siguen intactos.
- [ ] Actualizar README o ayuda si cambia la presentación pública, añadir el resumen al changelog y archivar este roadmap.
- **Criterios de aceptación:** sin regresiones en la portada, la documentación, el tablero ni el presupuesto; la nueva portada queda documentada y el roadmap cerrado solo con todas las fases verificadas.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| PROMO-03 aún no tiene proyecto de demo ni capturas nuevas | La portada podría quedarse esperando material | Lanzar la estructura con la ilustración existente; integrar capturas después sin cambiar la jerarquía. |
| `HeroArt` y `motion` añaden JavaScript al visitante anónimo | La portada promocional empeora el flujo `tablero` | Medir con `perf:budget`; usar una composición estática si supera el margen. |
| Reutilizar `.session-card` y `access.css` rompe otras pantallas | Regresión en login, sesión o documentación | Hoja `portada.css` propia y pruebas existentes de `session-page`. |
| El CTA usa navegación de cliente o pierde la URL profunda | El login no vuelve al proyecto o vista pedidos | Mantener `chatGPTSignInPath` y `<a target="_top">`, con prueba de `returnTo`. |
| La portada promete demo, datos o funciones que aún no existen | Expectativa incumplida al entrar | Copy limitado a lo disponible; el botón de demo queda para PROMO-05. |
| El CSS de la portada se carga en todas las rutas | Coste innecesario en el tablero y la documentación | Importar `app/portada.css` solo desde `app/portada.tsx`. |

## 6. Notas de sesión

- 2026-11-16: PROMO-02 sale del backlog y pasa a ser el roadmap activo. PROMO-01 se pausa con su plan conservado porque la validación externa depende de publicar la tarjeta.
- 2026-11-16: la primera versión no espera a PROMO-03; se apoyará en la ilustración y el mensaje ya existentes. Las capturas de la demo se incorporarán cuando estén disponibles.
- 2026-11-16: el botón de demo sin cuenta, las páginas legales y el vídeo quedan fuera de este roadmap.
