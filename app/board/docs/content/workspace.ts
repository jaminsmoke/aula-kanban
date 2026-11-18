import { MCP_CATALOGO } from "../../../../lib/domain/mcp-catalogo";
import { mcpGuiaHerramientas, mcpResumen } from "../../../../lib/domain/mcp-guia";
import { MCP_PROMPTS } from "../../../../lib/domain/mcp-prompts";
import type { DocBlock, DocSection } from "./types";

/**
 * Bloques del catálogo MCP generados desde los metadatos puros: recuento,
 * herramientas por dominio con su permiso y límites de las dos puertas.
 * @returns Los bloques que se insertan en la sección «Servidor MCP».
 */
function bloquesCatalogoMcp(): DocBlock[] {
  const resumen = mcpResumen();
  const destructivas = MCP_CATALOGO.filter((entrada) => entrada.annotations.destructiveHint).map((entrada) => `\`${entrada.name}\``).join(", ");
  const prompts = MCP_PROMPTS.map((prompt) => `«${prompt.title}» (\`${prompt.name}\`)`).join(", ");
  return [
    { type: "paragraph", text: `El catálogo tiene **${resumen.total} herramientas** (${resumen.lectura} de lectura y ${resumen.escritura} de escritura; ${resumen.destructivas} destructivas) en la versión \`${resumen.version}\`. Cada descripción incluye un ejemplo de argumentos y su regla de rol.` },
    ...mcpGuiaHerramientas().flatMap(({ dominio, herramientas }) => [
      { type: "paragraph" as const, text: `**${dominio}**` },
      {
        type: "definitions" as const,
        items: herramientas.map((herramienta) => ({
          term: herramienta.name,
          text: `${herramienta.title}. ${herramienta.scope === "mcp:read" ? "Lectura" : "Escritura"}. ${herramienta.role}`,
        })),
      },
    ]),
    { type: "note", tone: "info", text: `Las bajas destructivas (${destructivas}) piden confirmación y el nombre exacto de la ficha o del proyecto. Cada llamada queda en la auditoría \`mcp_audit_log\`; el plugin limita a 120 peticiones por minuto y 30 de escritura por cuenta, y el token personal a 120 por minuto.` },
    { type: "note", tone: "tip", text: `El servidor publica cuatro prompts: ${prompts}. Pídelos con \`prompts/list\` y \`prompts/get\` para empezar un flujo guiado sobre el proyecto.` },
  ];
}

export const workspaceSections: DocSection[] = [
  {
    id: "espacio",
    title: "Tienda, Aula Store y las aplicaciones",
    lead: "«Tienda» es el escritorio del proyecto: desde ahí se abren las aplicaciones en ventanas. Las aplicaciones se instalan desde Aula Store una sola vez para toda la instancia —las instala el propietario o un administrador— y las usan todos los miembros.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre Administración > Tienda desde el sidebar. En el escritorio solo aparecen las aplicaciones instaladas.",
          "Haz clic en un icono para abrir la aplicación en una ventana. Si ya estaba abierta, la ventana vuelve al frente.",
          "Arrastra la ventana desde su barra de título y cambia su tamaño desde la esquina inferior derecha.",
          "El semáforo de la ventana cierra, minimiza y amplia. Una ventana minimizada deja su icono en la barra superior: pulsa «Restaurar» para traerla de vuelta; ampliada ocupa la pantalla y el mismo botón la devuelve a su tamaño anterior.",
        ],
      },
      { type: "note", tone: "info", text: "Cerrar una ventana no borra nada: lo guardado sigue en el proyecto y vuelve a aparecer al abrir la aplicación otra vez." },
      {
        type: "steps",
        items: [
          "Abre «Aula Store» desde el icono de la bolsa, en la parte inferior del escritorio.",
          "En la vista Aplicaciones, las apps aparecen en «Mejores aplicaciones» y en secciones por categoría (Aula, Pizarras, Programación, Diagramas). Busca o filtra por categoría y por «Instaladas» para ver una única rejilla de resultados.",
          "Abre la ficha de una aplicación: descripción, características, su versión, el paquete upstream y las ampliaciones que añade Aula Kanban.",
          "Pulsa «Instalar» o «Desinstalar». Solo el propietario o un administrador puede hacerlo, y el cambio vale para todos los miembros.",
        ],
      },
      { type: "image", src: "/capturas/espacio.webp", alt: "Aula Store abierto con las aplicaciones instaladas y el filtro Instaladas activo", caption: "Aula Store en Administración > Tienda: las aplicaciones del proyecto aparecen como instaladas y se pueden abrir, desinstalar o consultar en Detalles." },
      { type: "note", tone: "info", text: "Instalar o desinstalar una aplicación solo registra su estado en Tienda: no borra paquetes ni datos, y las pizarras de las tareas no se ven afectadas. Al desinstalar, Aula Store pide confirmación." },
      {
        type: "definitions",
        items: [
          { term: "Excalidraw (1.0.0)", text: "Pizarra del espacio de trabajo del proyecto, independiente de la pizarra de cada tarea. Se guarda en el proyecto y se comparte en directo: el alumnado y las cuentas invitadas la ven en modo lectura, y todos ven el puntero de los demás mientras dibujan." },
          { term: "Calculadora (1.0.0)", text: "Básica, Científica, Ecuaciones e Historial, con memoria MC/M+/M−/MR, resultado decimal y exacto y ecuaciones por líneas con variables compartidas. La primera vez que abres Científica o Ecuaciones se descarga el motor de cálculo: verás «Preparando el motor…» y la precarga se adelanta al enfocar el modo." },
          { term: "Tabla periódica (1.0.0)", text: "Los 118 elementos con búsqueda y filtros por categoría y bloque; cada ficha incluye Ficha, Descripción e Historia, y modelo atómico animado." },
          { term: "Programación por bloques (1.0.0)", text: "Editor de bloques con «Guardar», «Cargar», «Ejemplo», «Descargar», «Limpiar» y «Código»: genera el programa en JavaScript o Python, permite ejecutarlo y copiarlo. Se guarda por proyecto en la base de datos; las cuentas invitadas solo pueden consultarlo." },
          { term: "Diagramas (1.0.0)", text: "Escribes el diagrama en texto y ves la vista previa al instante, con plantillas listas. «Guardar» y «Cargar» trabajan por proyecto en la base de datos, y «Exportar SVG» descarga la imagen." },
          { term: "Ajedrez (1.0.0)", text: "Tablero local para dos jugadores o contra un rival aleatorio. Aplica las reglas completas, muestra el turno, el jaque, el jaque mate, las tablas y el historial, y permite mover con clic, arrastre o el formulario de teclado." },
          { term: "Tarjetas de repaso (1.0.0)", text: "Mazos de anverso y reverso compartidos por proyecto. El repaso usa FSRS, ofrece Otra vez, Difícil, Bien y Fácil, y guarda el progreso en este navegador; los mazos se guardan en el proyecto." },
          { term: "Física 2D (1.0.0)", text: "Laboratorio de movimiento con cuatro experimentos: gravedad, colisiones, muelle y péndulo. Reproduce, pausa, reinicia, ajusta la gravedad y arrastra los cuerpos; la escena es efímera y no se guarda." },
          { term: "Geometría interactiva (1.0.0)", text: "Lienzo con puntos, segmentos, rectas y circunferencias; presets de triángulo, circunferencia y rectas, medidas dinámicas y funciones de parábola, seno y recta. La construcción es efímera y no se guarda." },
          { term: "Mapas conceptuales (1.0.0)", text: "Lienzo de nodos y conexiones con zoom y paneo; plantillas de mapa conceptual y mapa mental, guardado por proyecto y modo lectura para invitados." },
          { term: "Presentaciones (1.0.0)", text: "Editor Markdown con vista previa y modo presentación; plantillas de clase, proyecto y documento vacío, guardado por proyecto y exportación HTML." },
          { term: "Moléculas 3D (1.0.0)", text: "Visor molecular con ocho estructuras locales, rotación, zoom, etiquetas y ficha con fórmula; sin red ni recursos externos." },
          { term: "Líneas de tiempo (1.0.0)", text: "Eventos y épocas en un lienzo temporal con zoom y agrupación; plantillas histórica y de proyecto, guardado por proyecto y modo lectura para invitados." },
          { term: "Hoja de cálculo (1.0.0)", text: "Celdas, fórmulas y formato esencial con filas y columnas ampliables; exportación CSV protegida, guardado por proyecto y modo lectura para invitados." },
          { term: "Notas y documentos (1.0.0)", text: "Editor de texto enriquecido con título, listas, citas, código y enlaces; guardado por proyecto, exportación HTML y modo lectura para invitados." },
          { term: "Visor Office (1.0.0)", text: "Abre archivos .docx, .xlsx y .pptx de tu equipo en solo lectura, con zoom y navegación por páginas, hojas o diapositivas. El archivo no se sube, no se modifica y no se guarda en el proyecto." },
          { term: "Aula Documentos (1.0.0)", text: "Documento unificado con texto enriquecido y diagramas Mermaid con plantillas y zoom, plantillas para empezar desde cero, importación desde Notas y documentos, Diagramas y Presentaciones sin duplicar el título, exportación HTML o Markdown, temas de presentación, notas del orador y exportación de la presentación. Se guarda automáticamente por proyecto en app_documents, protege el cierre con cambios pendientes y permite descargar un documento inválido antes de recuperarlo; los invitados solo pueden consultarlo." },
        ],
      },
      { type: "note", tone: "info", text: "El historial de la calculadora se guarda en este navegador, no en el proyecto: no lo ves desde otro equipo y puedes vaciarlo con «Borrar» en el panel del historial. La memoria de la calculadora vive solo mientras la ventana está abierta. Los documentos de Programación por bloques y Diagramas sí se guardan en el proyecto, con el botón «Guardar»." },
    ],
  },
  {
    id: "mochila",
    title: "Mi mochila y Maletín docente",
    lead: "Cada persona organiza sus herramientas instaladas en carpetas propias, por usuario y proyecto. La mochila del alumnado y el maletín del profesorado comparten este escritorio personal, pero conservan su icono y su nombre; no hay tienda ni instalación en él.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre Clase > Mi mochila (alumnado) o Maletín (profesorado). Solo aparecen las aplicaciones instaladas en la instancia y visibles para tu rol.",
          "Pulsa «Organizar» y escribe el nombre de una carpeta junto a cada aplicación. Deja el campo vacío para mantenerla suelta en el escritorio.",
          "Pulsa «Guardar carpetas»: las apps con el mismo nombre se agrupan y la carpeta ocupa el lugar de su primera app en el orden personal.",
          "Abre una carpeta para ver sus aplicaciones y pulsa una de ellas para abrir su ventana. La carpeta «Libros» sigue siendo independiente.",
        ],
      },
      { type: "note", tone: "info", text: "La organización es personal de cada cuenta en el proyecto: no cambia la instalación global ni la ve el resto del profesorado o alumnado. Una carpeta existe mientras tenga aplicaciones; si la vacías, desaparece del escritorio." },
    ],
  },
  {
    id: "mcp",
    title: "Servidor MCP",
    lead: "Aula Kanban también escucha a herramientas de inteligencia artificial (ChatGPT, Codex y otros clientes compatibles con MCP) gracias al plugin de Sites y a un servidor remoto alojado en el propio Site. Tu asistente ve y mueve el mismo tablero que tú.",
    blocks: [
      { type: "paragraph", text: "La vía recomendada es el **plugin de Aula Kanban para Sites**: ChatGPT o Codex usan tu sesión de Sites y no necesitan token. La vía avanzada es el servidor en `/api/mcp` con un token personal. En ambas, cada herramienta obedece los permisos de tu rol en el proyecto: las cuentas invitadas solo pueden consultar, y un alumno solo puede crear o editar sus propias tareas, igual que en la web." },
      {
        type: "steps",
        items: [
          "En ChatGPT o Codex, busca y conecta el plugin «Aula Kanban» creado por Sites. La identidad la pone Sites: no copies ningún token.",
          "Empieza pidiendo un resumen de clase o usa uno de los prompts del servidor; el agente llamará primero a `quien_soy` y elegirá el proyecto contigo.",
          "Prueba `listar_proyectos` y `listar_tareas`: si responden, el plugin está conectado. Si tu cliente no ofrece el plugin, usa la vía avanzada del token.",
          "Vía avanzada: abre Ajustes > Tokens MCP y crea un token con la etiqueta del cliente que vayas a usar (por ejemplo, «Claude»).",
          "Copia el token en ese momento: solo se muestra una vez y no se puede recuperar.",
          "En el cliente MCP, introduce la URL del Site y el token como cabecera `Authorization: Bearer …`, como en el bloque de abajo.",
          "Si el cliente devuelve 401, el token falta, es incorrecto o ha sido revocado; crea otro en Ajustes > Tokens MCP.",
        ],
      },
      {
        type: "code",
        language: "json",
        text: [
          "{",
          '  "mcpServers": {',
          '    "aula-kanban": {',
          '      "url": "https://TU-SITE/api/mcp",',
          '      "headers": { "Authorization": "Bearer TU-TOKEN" }',
          "    }",
          "  }",
          "}",
        ].join("\n"),
      },
      { type: "note", tone: "warning", text: "El token es como una contraseña: quien lo tenga actúa con tus permisos en el proyecto. Revócalo en Ajustes > Tokens MCP en cuanto dejes de usarlo y nunca lo pegues en un chat." },
      ...bloquesCatalogoMcp(),
      { type: "note", tone: "info", text: "Visor Office y Aula Documentos no exponen herramientas MCP de contenido en esta versión: Visor Office trabaja con archivos locales y Aula Documentos guarda su documento en `app_documents`, pero la edición, las importaciones, la exportación y la presentación viven en el navegador. `abrir_app`, `listar_ventanas` y el control de ventanas siguen funcionando con MCP-04." },
      { type: "paragraph", text: "Cada ficha lleva su rol, su actividad, la ayuda de IA, una `revision` para guardar sin pisar cambios de otra sesión y el estado de su cuenta (sin vincular, pendiente o activa). El correo de la cuenta solo lo ven el propietario, la administración, el profesorado y la propia persona." },
      { type: "note", tone: "info", text: "Algunos clientes clásicos solo hablan con procesos locales (stdio). Esos necesitan un puente que reenvíe la URL remota con la cabecera de autorización; los clientes modernos con soporte HTTP remoto se conectan directamente. El plugin y el token personal tienen auditoría y límites propios: 120 peticiones por minuto por cuenta y 30 de escritura en el plugin, y 120 por minuto por token en `/api/mcp`." },
    ],
  },
  {
    id: "oauth",
    title: "Autorización OAuth",
    lead: "La autorización OAuth para clientes externos es experimental y está desactivada en producción mientras se revisa. Para ChatGPT y Codex, usa el plugin creado por Sites.",
    blocks: [
      { type: "paragraph", text: "El servidor de autorización vive en este Site, con su propia base de datos: nada se comparte con otros sitios ni con proveedores externos. Las cuentas son las de siempre (tu sesión de ChatGPT), y los tokens se guardan como hashes con sal, igual que los tokens personales del MCP." },
      {
        type: "definitions",
        items: [
          { term: "mcp:read", text: "Solo lectura: listar proyectos y tareas, y consultar alumnos y profesores." },
          { term: "mcp:write", text: "Lectura y escritura: además de leer, crear, actualizar y eliminar tareas (con las reglas de tu rol, como en la web)." },
          { term: "Token de acceso", text: "Dura 1 hora y se renueva solo con el token de refresco." },
          { term: "Token de refresco", text: "Dura 30 días y rota en cada uso: el anterior se revoca al canjearlo." },
        ],
      },
      {
        type: "steps",
        items: [
          "El cliente descubre el servidor en `/.well-known/oauth-authorization-server` (y el MCP indica el suyo con `/.well-known/oauth-protected-resource/mcp` cuando devuelve 401).",
          "El cliente se registra con `POST /oauth/register` (RFC 7591): su `redirect_uri` y los alcances. El secreto se muestra una sola vez.",
          "El cliente te redirige a `/oauth/authorize` con PKCE (S256, obligatorio). Ves una página de consentimiento con el nombre del cliente, los alcances y el destino, y autorizas con tu sesión.",
          "El cliente canjea el código en `POST /oauth/token` con el verificador PKCE y recibe el par de tokens. A partir de ahí llama al MCP con `Authorization: Bearer …`.",
          "Para cortar un acceso, se revoca en `POST /oauth/revoke` (RFC 7009): el token deja de funcionar al momento.",
        ],
      },
      {
        type: "code",
        language: "json",
        text: [
          "{",
          '  "authorization_url": "https://TU-SITE/oauth/authorize",',
          '  "token_url": "https://TU-SITE/oauth/token",',
          '  "revocation_url": "https://TU-SITE/oauth/revoke",',
          '  "resource": "https://TU-SITE/api/mcp",',
          '  "scopes": "mcp:read mcp:write",',
          '  "discovery": "https://TU-SITE/.well-known/oauth-authorization-server"',
          "}",
        ].join("\n"),
      },
      { type: "note", tone: "info", text: "Los tokens personales del MCP siguen funcionando como antes: la OAuth es opcional por cliente. Un cliente que ya tiene un token personal no necesita migrar." },
      { type: "note", tone: "warning", text: "La página de consentimiento es la única que usa tu sesión de navegador, y mantiene la guarda de mismo origen: nadie puede autorizar desde otra página sin que tú lo apruebes. Si un cliente pide un alcance que no te cuadra, deniega: el cliente recibirá `access_denied`." },
    ],
  },
];
