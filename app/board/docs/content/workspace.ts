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
    title: "Mi espacio, Aula Store y las aplicaciones",
    lead: "«Mi espacio» es el escritorio del proyecto: desde ahí se abren las aplicaciones en ventanas. Las aplicaciones se instalan desde Aula Store una sola vez para toda la instancia —las instala el propietario o un administrador— y las usan todos los miembros.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre «Mi espacio» desde el icono de la cabecera. En el escritorio solo aparecen las aplicaciones instaladas.",
          "Haz clic en un icono para abrir la aplicación en una ventana. Si ya estaba abierta, la ventana vuelve al frente.",
          "Arrastra la ventana desde su barra de título y cambia su tamaño desde la esquina inferior derecha.",
          "El semáforo de la ventana cierra, minimiza y amplia. Una ventana minimizada deja su icono en la barra superior: pulsa «Restaurar» para traerla de vuelta; ampliada ocupa la pantalla y el mismo botón la devuelve a su tamaño anterior.",
        ],
      },
      { type: "note", tone: "info", text: "Cerrar una ventana no borra nada: lo guardado sigue en el proyecto y vuelve a aparecer al abrir la aplicación otra vez." },
      { type: "image", src: "/capturas/espacio.webp", alt: "Mi espacio con las cuatro aplicaciones instaladas y el botón de Aula Store", caption: "Mi espacio con Excalidraw, Herramientas de aula, Programación por bloques y Diagramas instaladas." },
      {
        type: "steps",
        items: [
          "Abre «Aula Store» desde el icono de la bolsa, en la parte inferior del escritorio.",
          "Busca en Aula Store o filtra por categoría (Aula, Pizarras, Programación, Diagramas) y por «Instaladas».",
          "Abre la ficha de una aplicación: descripción, características, su versión, el paquete upstream y las ampliaciones que añade Aula Kanban.",
          "Pulsa «Instalar» o «Desinstalar». Solo el propietario o un administrador puede hacerlo, y el cambio vale para todos los miembros.",
        ],
      },
      { type: "note", tone: "info", text: "Instalar o desinstalar una aplicación solo registra su estado en Mi espacio: no borra paquetes ni datos, y las pizarras de las tareas no se ven afectadas. Al desinstalar, Aula Store pide confirmación." },
      {
        type: "definitions",
        items: [
          { term: "Excalidraw (1.0.0)", text: "Pizarra del espacio de trabajo del proyecto, independiente de la pizarra de cada tarea. Se guarda en el proyecto y se comparte en directo: el alumnado y las cuentas invitadas la ven en modo lectura, y todos ven el puntero de los demás mientras dibujan." },
          { term: "Herramientas de aula (1.0.0)", text: "Cuatro pestañas: Calculadora (Básica, Científica, Ecuaciones e Historial, con memoria MC/M+/M−/MR), Ciencias (tabla periódica con pestañas Ficha, Descripción e Historia, y modelo atómico del elemento), Medir (regla para medir en centímetros y pulgadas y transportador que gira con el ratón o las flechas) y Lectura (texto a voz con la voz del sistema). Atajos Alt+1 a Alt+4." },
          { term: "Programación por bloques (1.0.0)", text: "Editor de bloques con «Guardar», «Cargar», «Ejemplo», «Descargar», «Limpiar» y «Código»: genera el programa en JavaScript o Python, permite ejecutarlo y copiarlo. Se guarda por proyecto en la base de datos; las cuentas invitadas solo pueden consultarlo." },
          { term: "Diagramas (1.0.0)", text: "Escribes el diagrama en texto y ves la vista previa al instante, con plantillas listas. «Guardar» y «Cargar» trabajan por proyecto en la base de datos, y «Exportar SVG» descarga la imagen." },
        ],
      },
      { type: "note", tone: "info", text: "El historial de la calculadora se guarda en este navegador, no en el proyecto: no lo ves desde otro equipo y puedes vaciarlo con «Borrar» en el panel del historial. La memoria de la calculadora y las mediciones de la regla viven solo mientras la ventana está abierta. Los documentos de Programación por bloques y Diagramas sí se guardan en el proyecto, con el botón «Guardar»." },
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
