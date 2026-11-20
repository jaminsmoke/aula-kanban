# Roadmap DEV-02 — Aislar MCP y tooling por repositorio

> **Estado:** Activo · **Origen:** DEV-02 del backlog (2026-11-20)
> **Backlog:** ARC-02 a ARC-06, ADOC-16 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Evitar que una herramienta MCP global lea, analice o devuelva datos de un repositorio distinto al workspace abierto.
- [ ] Convertir el aislamiento de tooling en un comportamiento comprobable, no en una recomendación.
- [ ] Criterio de éxito: cualquier configuración MCP de este proyecto que fije una raíz fuera de `aula-kanban` falla cerrada; ninguna integración opcional se activa desde una configuración global con una ruta absoluta externa.

## 2. Alcance

**Dentro:**

- Inventariar los MCP activos y sus formas de configuración.
- Documentar el modelo de amenaza y las rutas que puede leer cada herramienta.
- Reforzar el guard local de configuración MCP.
- Definir el procedimiento para habilitar/deshabilitar MCP por repositorio.
- Auditar `unreal` y `blender-mcp` para confirmar que no filtran estado de otro proyecto.
- Añadir pruebas y documentación.

**Fuera:**

- Cambiar el producto, la UI, la versión del Site o los datos.
- Integrar CodArch como dependencia obligatoria.
- Publicar o desplegar.
- Convertir este roadmap en una auditoría de seguridad completa de todos los MCP del sistema.

## 3. Decisiones

1. La configuración global no puede fijar raíces absolutas de proyectos.
2. Si una herramienta no está configurada para este repositorio, falla cerrada.
3. CodArch solo se usará, si se decide, con configuración por repositorio, raíz relativa/validada y snapshot propio.
4. Los MCP remotos (`unreal`) y locales (`blender-mcp`) no deben recibir rutas de este repositorio salvo que se documente y pruebe.
5. La comprobación vive en el repo y puede ejecutarse en local y CI.

## 4. Fases

### Fase 1 — Inventario y modelo de amenaza

- [x] Inventariar MCP globales y locales, comandos, URLs, variables de entorno y raíces.
- [x] Identificar qué datos puede leer cada herramienta y desde qué workspace.
- [x] Documentar el incidente de CodArch como caso de regresión.
- [x] Definir qué configuraciones se permiten en el repo y cuáles quedan fuera.
- **Inventario:** [`mcp-tooling-audit.md`](mcp-tooling-audit.md), con MCP activos, fuentes de configuración, modelo de amenaza y política permitido/prohibido.
- **Criterios:** hay un inventario completo y un modelo de amenaza comprensible; no se ejecutan herramientas sin conocer su raíz.

### Fase 2 — Guard local y pruebas

- [x] Reforzar `architecture-check` para revisar configuraciones MCP locales y raíces de comandos.
- [x] Rechazar rutas absolutas externas, `..` fuera del workspace y configuraciones inválidas.
- [x] Añadir pruebas de configuración permitida, raíz externa y JSON inválido.
- [x] Ejecutar el guard desde `npm run check` y CI.
- **Criterios:** una configuración externa falla de forma determinista y una configuración local válida pasa.

### Fase 3 — Aislamiento por proyecto y documentación

- [x] Documentar el procedimiento para habilitar/deshabilitar MCP por repositorio.
- [x] Auditar `unreal` y `blender-mcp` y registrar su alcance.
- [x] Definir una plantilla de configuración local si se adopta algún MCP opcional.
- [x] Registrar cómo se valida una raíz y qué hacer ante una herramienta contaminada.
- **Criterios:** cualquier persona puede configurar una herramienta sin afectar a otros repositorios y sabe cómo comprobarlo.

### Fase 4 — Cierre

- [ ] Actualizar documentación, backlog y changelog.
- [ ] Ejecutar suite, `tsc`, ESLint, build y presupuestos.
- [ ] Archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** no queda ninguna ruta MCP global con raíz externa y el procedimiento está documentado y probado.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Configuración global silenciosa | Herramientas leen otro repo | Guard local, revisión de arranque y documentación |
| Falso positivo del guard | Bloquea una integración legítima | Configuración explícita por repo y pruebas de fixture |
| MCP remoto con estado compartido | Fuga entre proyectos | Auditar alcance y separar credenciales/URLs |
| Dependencia de CodArch | Acoplamiento innecesario | Mantenerlo opcional y validar su raíz si se usa |
| Cambios de configuración fuera del repo | No se pueden versionar | Documentar el procedimiento y no depender de ellos |

## 6. Notas de sesión

- 2026-11-20: DEV-02 sale del backlog y pasa a ser el roadmap activo. El bloque `codarch` de la configuración global de OpenCode apuntaba a `Visual Software Architecture`; se retiró y se guardó una copia previa en `opencode.json.before-codarch-removal`. El catálogo activo ya no expone CodArch.
- La revisión inicial de ARC-01 añadió el guard de configuraciones MCP del proyecto en `architecture-check`; este roadmap amplía el aislamiento y lo documenta.
- 2026-11-20: **Fase 1 completada.** Inventariados MCP activos, fuentes globales, copias inactivas y configuración de proyecto en [`mcp-tooling-audit.md`](mcp-tooling-audit.md). `unreal` y `blender-mcp` no declaran raíz de repositorio; CodArch quedó retirado y su copia previa marcada como inactiva. Definidos el modelo de amenaza y la política permitido/prohibido.
- 2026-11-20: **Fase 2 completada.** El checker rechaza `--root`, `root`/`cwd`, rutas absolutas o con `..` en `command`/`args`, y JSON inválido. Pruebas nuevas de configuración relativa válida, comando absoluto externo, JSON inválido y raíz externa. `npm run check` y CI ejecutan el guard. Suite: 228 archivos / 1.583 pruebas; `aula-documentos` 369.614 / 370.000 B gzip.
- 2026-11-20: **Fase 3 completada.** Añadidos el procedimiento por repositorio, la plantilla [`mcp-project.example.json`](mcp-project.example.json) y la auditoría de alcance de `unreal` y `blender-mcp`. Documentado cómo validar la raíz, desactivar una herramienta y actuar ante una contaminación.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
