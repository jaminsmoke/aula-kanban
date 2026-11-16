# Roadmap UI-02 · Reorganización de la cabecera y el remix en Ajustes

> **Estado:** Completado
> **Inicio:** 2026-11-16
> **Cierre:** 2026-11-16
> **Entrada:** revisión visual de la 1.1.34 — la marca no queda anclada a la izquierda, la navegación no está centrada y «Haz tu Site de Aula Kanban» vive en el menú de proyecto en vez de en Ajustes.
> **Dependencias:** ninguna funcional; no toca la demo, los datos ni el backend.
> **Backlog:** sin entradas aparcadas.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Reorganizar la cabecera en tres zonas estables y mover el remix a una sección contextual de Ajustes.
- [ ] Criterio de éxito: la marca queda siempre pegada al borde izquierdo, el botón de Clase ocupa el centro geométrico del header, la navegación no desborda en móvil y «Haz tu Site de Aula Kanban» solo se ofrece desde Ajustes con su propia URL y pruebas.

## 2. Alcance

**Dentro:**
- Cabecera con tres zonas: marca a la izquierda, navegación centrada y controles de proyecto/cuenta a la derecha.
- El botón de Clase como ancla central; Administración y el resto de vistas se colocan alrededor sin desplazarlo.
- Revisión del caso sin proyecto y de 1366, 1024 y 390 px.
- Nueva sección de Ajustes para el remix (por ejemplo «Tu Site»), con su entrada en el sidebar, su URL canónica y el mismo diálogo.
- Retirada de «Haz tu Site de Aula Kanban» del menú de proyecto y de sus estilos asociados.
- Pruebas de estructura, navegación y URL; actualización de ayuda, README y changelog.

**Fuera de alcance:**
- Cambiar la demo, sus datos, la siembra o la seguridad de la instancia.
- Cambiar permisos de cuentas o el comportamiento del remix más allá de su ubicación.
- Rediseñar otras vistas, el sidebar de Administración o la portada.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Cabecera en tres zonas** | Mantener `justify-content: space-between` con márgenes sueltos | Los extremos y el centro quedan definidos por la estructura, no por el contenido. |
| **Clase como ancla central** | Centrar el grupo de navegación completo | El requisito es que el botón de Clase quede en el centro geométrico; Administración se coloca alrededor sin moverlo. |
| **Sección nueva `SettingsSection` para el remix** | Entrada dentro de Cuenta | Da URL propia, navegación atrás/adelante y un lugar contextual; se prueba como el resto de secciones. |
| **Mantener `RemixDialog` en `Board` y pasar un callback a Ajustes** | Montar el diálogo dentro de `SettingsView` | Conserva un único estado de diálogo y evita duplicar su ciclo de vida. |
| **Mantener la visibilidad actual del remix** | Restringirlo a propietario/administrador | El botón actual no restringía por rol; este roadmap solo cambia su ubicación. |
| **Sin cambios en demo ni datos** | Aprovechar para tocar la siembra | Es una reorganización de interfaz; mezclar datos añadiría riesgo y alcance. |

## 4. Fases

### Fase 1: Cabecera en tres zonas — completada (2026-11-16)
- [x] Reestructurar `app/board/layout/header.tsx` para separar marca, navegación y controles; la marca conserva icono, nombre, versión y autor.
- [x] Ajustar `header.css` para que la marca quede pegada a la izquierda, la navegación se centre y el botón de Clase quede en el centro geométrico del header; revisar el caso sin proyecto.
- [x] Revisar 1366, 1024 y 390 px: sin desbordes, sin saltos al cambiar de vista y con el selector de proyecto y la cuenta en su zona.
- [x] Añadir pruebas de estructura y de que la navegación conserva sus destinos.
- **Criterios de aceptación:** la marca no se mueve del borde izquierdo; Clase queda centrado en escritorio; la navegación no desborda en móvil; no hay regresiones en el resto de la cabecera.
- **Verificación:** la cabecera usa tres zonas (`topbar-brand`, `topbar-nav`, `topbar-actions`) en una rejilla `1fr auto 1fr`; la marca es el primer elemento y Clase queda en el centro geométrico (683 px de 1366, 512 de 1024 y 195 de 390). En 1024 y 390 la navegación pasa a una fila propia centrada y el resto de controles se mantiene a la derecha. El caso sin proyecto oculta la navegación y conserva marca y cuenta. 5 pruebas del header, suite completa **160 archivos / 1.172 pruebas**, `tsc` y ESLint correctos.

### Fase 2: Remix en Ajustes — completada (2026-11-16)
- [x] Añadir la sección «Tu Site» a `SettingsSection`, `SETTINGS_SECTIONS`, el parser y el constructor de URL, con sus pruebas de ida y vuelta.
- [x] Renderizar la entrada en el sidebar de Ajustes y una tarjeta que explique el remix y abra `RemixDialog` mediante un callback desde `Board`.
- [x] Quitar «Haz tu Site de Aula Kanban» del menú de proyecto, retirar `onRemix` del header y limpiar los estilos del desplegable.
- [x] Añadir pruebas de la nueva sección, del callback y de que el menú de proyecto ya no ofrece el remix.
- **Criterios de aceptación:** el remix solo se ofrece desde Ajustes; la sección tiene URL canónica y funciona con atrás/adelante; el diálogo se abre una sola vez y el menú de proyecto queda limpio.
- **Verificación:** `SettingsSection` incluye `sitio` y `SETTINGS_SECTIONS` lo coloca tras Cuenta; `/?project=…&view=ajustes&section=sitio` se parsea y reconstruye igual. La sección «Tu Site» muestra la tarjeta y abre el mismo `RemixDialog` desde `Board`; el menú de proyecto ya no contiene `.remix-action` y el header no recibe `onRemix`. Se actualizó el snapshot del catálogo MCP porque el enum de secciones incluye `sitio`. Revisión visual a 1366 y 390 px. Suite completa **160 archivos / 1.173 pruebas**, `tsc` y ESLint correctos.

### Fase 3: Verificación y cierre — completada (2026-11-16)
- [x] Pasar suite completa, `tsc`, ESLint, build y `perf:budget`; revisar la cabecera y Ajustes a 1366, 1024 y 390 px.
- [x] Actualizar README, ayuda, changelog y archivar este roadmap.
- **Criterios de aceptación:** la cabecera cumple las tres zonas, el remix está contextualizado y probado, no hay regresiones ni cambios de datos, y el roadmap se cierra con todas las fases verificadas.
- **Verificación:** cabecera y Ajustes revisados a 1366, 1024 y 390 px; la marca queda a la izquierda, Clase centrada y la tarjeta de «Tu Site» cabe sin desbordes. La ayuda y el README remiten a Ajustes > Tu Site, y la definición del remix ya no figura entre las acciones del menú de proyecto. Suite completa **160 archivos / 1.173 pruebas**, `tsc`, ESLint, build y `perf:budget` en verde (`tablero` 170.875 B, `basica` 132.657 B, `cientifica` 1.960.403 B gzip). Sin cambios de datos ni de versión: la instancia sigue en **1.1.34**.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El centrado depende del ancho del nombre del proyecto | El botón de Clase se desplaza | Zonas de ancho flexible con la navegación anclada al centro y truncado del selector. |
| Con solo dos elementos, «centrar la navegación» no centra Clase | No se cumple el requisito | Anclar Clase al centro y colocar Administración alrededor sin afectar al eje. |
| La nueva sección rompe atrás/adelante o los enlaces | Navegación inconsistente | Añadirla al esquema de URL con pruebas de parse/build y de historial. |
| El remix se duplica o queda visible en proyectos | Dos puntos de entrada | Quitar la acción del header y probar que el menú ya no la muestra. |
| La cabecera se rompe en móvil o sin proyecto | Desbordes o saltos | Revisar 390 px y el estado sin proyecto; pruebas de estructura. |
| El diálogo pierde estado al cambiar de vista | Remix no abre o se cierra solo | Mantener el diálogo en `Board` y pasar el callback a Ajustes. |

## 6. Notas de sesión

- 2026-11-16: UI-02 sale del backlog y pasa a ser el roadmap activo; el backlog queda sin entradas aparcadas.
- 2026-11-16: el feedback se tomó sobre la 1.1.34; la cabecera usa `justify-content: space-between` y `.main-nav` tiene `margin-left:24px`, por eso la navegación queda a la izquierda.
- 2026-11-16: el remix actual es `button.remix-action` dentro del desplegable de proyecto y abre `RemixDialog` desde `app/board.tsx`.
- 2026-11-16: no se publica en Sites ni se cambia la versión en este roadmap; el cierre es local y el push, único, como en los anteriores.
- 2026-11-16: cierre verificado con la suite completa y la build; la ayuda y el README ya sitúan el remix en Ajustes > Tu Site y el menú de proyecto queda solo con las acciones de proyecto.
