# Roadmap PERM-04 — Conservar la sección de Ajustes al recargar

> **Estado:** Activo (2026-11-22) · **Origen:** PERM-04 del backlog
> **Backlog:** 8 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Conservar la sección solicitada de Ajustes al recargar o abrir un enlace directo.
- [ ] Esperar a que terminen las comprobaciones de acceso antes de redirigir.
- [ ] Redirigir a Cuenta solo cuando se confirme que el rol no puede abrir la sección.
- [ ] Criterio de éxito: Almacenamiento, Administradores y Permisos sobreviven a una recarga con una cuenta autorizada; una cuenta sin acceso termina en Cuenta sin perder la URL solicitada antes de la comprobación.

## 2. Alcance

**Dentro:**

- Ajustes > Cuenta, Tu Site, Apariencia, Documentación, Tokens MCP, Administradores, Permisos y Almacenamiento.
- Recarga y enlaces directos con `view=ajustes&section=…`.
- Propietario y administración con acceso global.
- Roles sin acceso global y cuenta demo/invitada.
- URL canónica al redirigir.
- Estado de comprobación sin parpadeo de sección incorrecta.

**Fuera:**

- Cambiar permisos, roles o reglas de acceso.
- Cambiar el modelo de datos o la API.
- Añadir secciones nuevas de Ajustes.
- Cambiar la navegación de otras vistas.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Separar el estado «comprobando acceso» del estado «sin permiso» | Un booleano `privileged` que empieza en falso | Al recargar, aún no se conoce el rol y no se debe redirigir por un falso negativo. |
| Mantener la sección solicitada mientras dura la comprobación | Redirigir a Cuenta en el primer render | La URL y la sección elegida deben sobrevivir a la carga. |
| Redirigir después de `projectsLoaded`/acceso confirmado | Redirigir al montar `SettingsView` | Evita perder Almacenamiento o Administradores en una recarga autorizada. |
| Canonizar la URL solo al redirigir | Reescribir la URL al abrir la sección | La URL directa debe poder reintentarse y compartirse. |
| Compartir la guarda entre secciones restringidas | Repetir la lógica en cada panel | Administradores, Permisos y Almacenamiento tienen el mismo requisito. |
| Mantener el flujo actual de Tokens MCP para demo | Tratar Tokens como sección privilegiada | La regla específica de demo ya existe y no se amplía. |

## 4. Punto de partida

- `SettingsView` calcula `privileged` con `owner || admin` y aplica un `useEffect` que vuelve a Cuenta cuando la sección es restringida.
- `active` se fuerza a Cuenta en el primer render si `!privileged && restricted`.
- Los enlaces directos llegan con `view=ajustes&section=almacenamiento` y el estado inicial de la URL.
- La comprobación de acceso depende de la carga de proyectos; antes de completarse, `owner` y `admin` pueden ser falsos.
- Las pruebas actuales cubren el redireccionamiento cuando no hay permiso, pero no la recarga autorizada ni el periodo de comprobación.
- Baseline: arquitectura **463 archivos / 1.166 imports**; suite **271 archivos / 1.821 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Contrato de acceso y sección solicitada

- [x] Definir `accessChecking`/`accessDenied` y la diferencia entre «comprobando» y «sin permiso».
- [x] Mantener la sección solicitada durante la comprobación.
- [x] Fijar la redirección solo tras acceso confirmado y sin acceso.
- [x] Definir la URL canónica al redirigir y conservar parámetros ajenos.
- **Criterios:** una recarga autorizada no pierde la sección; una cuenta sin acceso no redirige antes de saberlo.
- **Cierre Fase 1 (2026-11-22):** `SettingsView` distingue comprobación y denegación; conserva la sección y la URL hasta `projectsLoaded`, muestra un estado de comprobación y no monta el panel restringido. Tests de Ajustes **10**; `npm run check` correcto; arquitectura **463 / 1.166**; Tablero **32 / 2.649** y CSS **12 / 1.555**.

### Fase 2 — Implementación en SettingsView

- [x] Sustituir el forzado inmediato de `active` por un estado de acceso pendiente.
- [x] Aplicar la guarda a Administradores, Permisos y Almacenamiento.
- [x] Redirigir a Cuenta después de la comprobación cuando corresponda.
- [x] No reescribir la URL mientras la sección solicitada siga siendo válida.
- **Criterios:** Almacenamiento, Administradores y Permisos sobreviven a la recarga con cuenta autorizada; sin acceso terminan en Cuenta.
- **Cierre Fase 2 (2026-11-22):** las tres secciones conservan su enlace directo con propietario o administración, y la URL se mantiene. Sin acceso, las tres redirigen a Cuenta tras la comprobación. Tests de Ajustes **13**; `npm run check` correcto; arquitectura **463 / 1.166**; Tablero **32 / 2.681 ≤ 32 / 2.800** y CSS **12 / 1.555 ≤ 13 / 1.650**.

### Fase 3 — Pruebas y regresión

- [ ] Probar recarga y enlace directo a las tres secciones restringidas con propietario/administración.
- [ ] Probar las mismas rutas con rol sin acceso y comprobar la URL final.
- [ ] Probar Tokens MCP en demo/invitado sin alterar su regla actual.
- [ ] Verificar el estado de comprobación, el foco y la ausencia de contenido privilegiado antes de tiempo.
- **Criterios:** las rutas directas tienen un resultado estable y ninguna cuenta sin acceso ve una sección restringida.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Redirigir antes de cargar `owner/admin` | Se pierde la sección en una recarga válida | Esperar a `accessReady` antes de decidir. |
| Mantener visible una sección privilegiada sin permiso | Fuga visual o peticiones innecesarias | Mostrar comprobación y no montar el panel restringido hasta confirmar. |
| Reescribir la URL demasiado pronto | El enlace directo deja de ser reutilizable | Canonizar solo en la redirección efectiva. |
| Aplicar la guarda solo a Almacenamiento | Permisos o Administradores siguen fallando | Centralizar la comprobación para las tres secciones. |
| Romper Tokens MCP en demo | Regresión en una regla existente | Probar la excepción de demo por separado. |
| Perder parámetros ajenos al limpiar `section` | Enlaces con contexto roto | Conservar la query salvo los parámetros canónicos. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** PERM-04 entra desde el backlog por la recarga de Ajustes > Almacenamiento que volvía a Cuenta.
- El backlog queda con **8 entradas**: UI-15, UI-16, TASK-05, PER-09, UI-13, UI-14, PERM-03 y DEV-01.
- Sin cambios de producto en esta apertura.
