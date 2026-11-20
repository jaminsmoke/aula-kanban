# Auditoría de MCP y tooling

> **Estado:** Fase 1 de DEV-02 · **Fecha:** 2026-11-20
> **Alcance:** configuración de OpenCode, MCP activos, raíces y datos accesibles desde este workspace.
> **Regla:** una herramienta solo puede leer la raíz `aula-kanban` o debe fallar cerrada.

## 1. Conclusión

El incidente de CodArch no era una dependencia del producto ni un archivo de este repositorio. Era una entrada `codarch` en la configuración **global** de OpenCode con `--root` apuntando a `C:/Users/jaminsmoke/Documents/Proyectos/Programacion/Visual Software Architecture` y snapshots de ese proyecto.

La entrada se retiró el 2026-11-20. El catálogo activo de OpenCode ya no expone CodArch. La copia anterior queda en `~/.config/opencode/opencode.json.before-codarch-removal` y no debe restaurarse sin revisar su raíz.

## 2. Fuentes de configuración

| Fuente | Ámbito | Estado | Nota |
|---|---|---|---|
| `~/.config/opencode/opencode.json` | Global del cliente | Activa | Contiene `unreal` y `blender-mcp`; no contiene CodArch |
| `~/.config/opencode/opencode.json.before-codarch-removal` | Copia de seguridad | Inactiva | Conserva el bloque CodArch retirado; riesgo de restauración accidental |
| `~/.config/opencode/opencode.json.bak` | Copia anterior | Inactiva | No contiene CodArch |
| `opencode.json`, `.opencode/opencode.json`, `.mcp.json`, `.cursor/mcp.json` en el repo | Proyecto | No existen | No hay MCP versionado en `aula-kanban` |
| `.codarch.yml` en el repo | Proyecto | No existe | La revisión inicial lo atribuyó por error a este repositorio |

`service.json` y otros archivos locales del cliente no se incluyen aquí por contener credenciales o datos de servicio.

## 3. Inventario de MCP activos

| Servidor | Tipo | Configuración | Raíz de repositorio | Datos expuestos | Riesgo actual |
|---|---|---|---|---|---|
| `unreal` | Remoto | `http://127.0.0.1:8001/mcp` | No declara raíz | Estado del editor Unreal, assets, escenas y herramientas del proyecto Unreal | Local, fuera de este repo; no debe recibir rutas de `aula-kanban` |
| `blender-mcp` | Local | `uvx --python 3.11 mcp-for-blender`; host `localhost:9876` | No declara raíz | Recursos `blender://collection`, `material`, `object` y viewport | Proceso local con permisos del usuario; no debe leer archivos del repo |
| `codarch` | Local | Retirado | Apuntaba a `Visual Software Architecture` | Capas, snapshot y reporte de otro producto | **Retirado**; no debe volver a configurarse globalmente |

## 4. Modelo de amenaza

### Activos que proteger

- Código y documentación de `aula-kanban`.
- Datos de proyecto: D1, R2, documentos, tareas, personas y permisos.
- Configuración local del cliente y credenciales de servicio.
- Contexto del agente: lo que una herramienta devuelve se usa para tomar decisiones.

### Fronteras

1. **Workspace** `aula-kanban` → herramientas locales.
2. **Cliente OpenCode** → configuración global → MCP.
3. **MCP local** → sistema operativo, procesos, Blender o Unreal.
4. **MCP remoto** → servicio local/red y estado de otra aplicación.

### Escenarios de fallo

| Escenario | Impacto | Control |
|---|---|---|
| Un MCP global fija `--root` a otro repo | Diagnósticos y decisiones contaminadas | Guard local, configuración por repo y revisión de configuración |
| Se restaura una copia con CodArch | Vuelve a leer otro producto | La copia no es una fuente activa; revisar antes de restaurar |
| Un MCP local hereda el cwd y lee archivos del repo | Exfiltración o cambios no deseados | No pasar rutas del repo; auditar herramientas y permisos |
| Un MCP remoto devuelve estado de otra sesión | Contexto falso | Revisar URL, autenticación y alcance del servicio |
| Un JSON de configuración inválido oculta una raíz | Falso negativo | El checker falla cerrado ante JSON inválido |

## 5. Política de configuración

### Permitido

- Configuración MCP **del proyecto** con rutas relativas al workspace.
- Herramientas que no declaren raíz de repositorio y no reciban rutas de `aula-kanban`.
- CodArch, si se decide adoptarlo, con:
  - configuración versionada por repositorio,
  - `--root` relativo o validado contra el workspace,
  - snapshot y reporte propios de `aula-kanban`.

### Prohibido

- MCP global con una raíz absoluta de otro proyecto.
- Configuración de proyecto con `--root`, `root` o `cwd` fuera del workspace.
- Restaurar configuraciones antiguas sin revisar la raíz.
- Pasar rutas de este repositorio a `unreal`, `blender-mcp` o cualquier herramienta no auditada.
- Depender de CodArch para que `arch:check` funcione.

## 6. Controles existentes

- `scripts/architecture-check.mjs` revisa `opencode.json`, `.opencode/opencode.json`, `.mcp.json` y `.cursor/mcp.json` del proyecto.
- El checker detecta `--root`, claves `root`/`cwd` y falla si resuelven fuera del workspace o si el JSON no es válido.
- `npm run arch:check` se ejecuta en `npm run check` y CI.
- La raíz del checker también falla cerrada si se le pasa un workspace externo.

## 7. Hallazgos y seguimiento

| Hallazgo | Prioridad | Fase |
|---|---|---|
| CodArch global apuntando a otro repo | Crítico | Retirado; guard en Fase 2 |
| Copia `.before-codarch-removal` con la ruta externa | Alto | Revisar o retirar en Fase 3 |
| `unreal` y `blender-mcp` son globales y no tienen raíz de repo | Medio | Auditar alcance y permisos en Fase 3 |
| No hay configuración MCP versionada en el repo | Medio | Definir plantilla y procedimiento en Fase 3 |
| El checker solo mira configuración del proyecto, no la global | Bajo | La global se revisa en el procedimiento, no en CI |

## 8. Criterio de salida de la Fase 1

- Todos los MCP activos están inventariados con tipo, configuración, raíz y datos expuestos.
- El incidente CodArch está documentado como caso de regresión.
- Las configuraciones permitidas y prohibidas están definidas.
- Los controles existentes y los huecos de la Fase 2/3 están identificados.
