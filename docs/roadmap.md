# Roadmap UI-07 · Documentación en Ajustes y selector de proyecto

> **Estado:** En curso
> **Backlog:** UI-08 · Tienda en Administración y Clase en el dock.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

Documentación deja de ser una vista de la cabecera y pasa a ser una sección del sidebar de Ajustes. El selector de proyecto ocupa la zona derecha que deja libre el botón retirado.

**Criterio de éxito:** desde el engranaje se abre Ajustes > Documentación con la documentación completa; `view=documentacion` y `/documentacion` siguen funcionando; el selector queda a la derecha del header en escritorio y móvil; no hay botón de Documentación duplicado.

## 2. Alcance

**Dentro:**
- Sección `documentacion` en el sidebar de Ajustes, con carga diferida.
- URL canónica `view=ajustes&section=documentacion`; alias `view=documentacion` para el tablero.
- Retirada de `button.header-docs` y recolocación de `details.project-menu` a la derecha.
- Cabecera de la documentación sin botón de vuelta cuando se integra en Ajustes.
- Pruebas de URL, cabecera, Ajustes y documentación; ayuda y README.
- Revisión visual en 1366, 1024 y 390.

**Fuera de alcance:**
- Tienda dentro de Administración, retirada de Mi espacio y Clase en el dock (UI-08).
- Cambiar la documentación pública de `/documentacion`.
- Cambios de esquema, versión o publicación.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Documentación como sección de Ajustes | Mantener una vista propia en el header | Elimina un botón y agrupa la ayuda con el resto de ajustes. |
| URL canónica `view=ajustes&section=documentacion` | Conservar `view=documentacion` como forma principal | Una sola URL por pantalla; el alias antiguo se reescribe sin romper enlaces. |
| Carga diferida de la documentación dentro de Ajustes | Importarla en el chunk de Ajustes | Abrir Cuenta o Apariencia no debe descargar el contenido completo de ayuda. |
| Selector de proyecto en la zona derecha | Dejarlo junto a la navegación principal | Ocupa el hueco natural que deja Documentación y mantiene marca a la izquierda. |

## 4. Fases

### Fase 1: Integración y cabecera
- [ ] Añadir `documentacion` a `SettingsSection` y a la navegación de Ajustes.
- [ ] Renderizar `DocumentationView` sin botón de vuelta y con ajustes de layout para el workspace.
- [ ] Canonizar `view=documentacion` a Ajustes > Documentación y conservar `/documentacion`.
- [ ] Retirar el botón de Documentación del header y llevar el selector de proyecto a su hueco.
- **Criterios de aceptación:** el engranaje abre Ajustes; Documentación se abre y navega por sus anclas; la URL se reescribe; no hay botón duplicado.

### Fase 2: Pruebas, revisión y cierre
- [ ] Actualizar pruebas de URL, cabecera, Ajustes y documentación.
- [ ] Actualizar ayuda, README y documentación de planificación.
- [ ] Ejecutar suite, `tsc`, lint y build.
- [ ] Revisar en navegador 1366, 1024 y 390, y comprobar que `/documentacion` sigue pública.
- **Criterios de aceptación:** checks en verde, sin desbordes ni regresiones visuales, y changelog con el cierre.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La documentación embebida necesita más ancho del disponible | Contenido estrecho o desbordado | Ajustar la rejilla y ocultar el índice lateral en anchos medios; revisar 1024. |
| Enlaces antiguos a `view=documentacion` | Enlaces favoritos rotos | Alias en `parseBoardUrl` y canonización con `replaceState`. |
| Peso de la ayuda en el chunk de Ajustes | Ajustes más lento | `lazy` solo al abrir la sección. |
| Documentación pública | Pérdida de acceso anónimo | Mantener `/documentacion` y no tocar su página. |

## 6. Notas de sesión

- UI-08 conserva los puntos 3-5 de la revisión de diseño original.
