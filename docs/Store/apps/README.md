# Aplicaciones nativas de Aula Store

Lista viva de las aplicaciones nativas de Aula Kanban: qué está integrado, qué es
candidato y qué se ha descartado, con la licencia y la versión comprobadas en npm.

Última verificación: **2026-11-18**.

## Índice

| Documento | Contenido |
|---|---|
| [`integradas.md`](integradas.md) | Apps integradas, versiones y transición de datos |
| [`candidatas-aula-evaluacion.md`](candidatas-aula-evaluacion.md) | Evaluación y repaso |
| [`candidatas-stem-ciencias.md`](candidatas-stem-ciencias.md) | Ciencia, matemáticas y sonido |
| [`candidatas-diagramas-documentos.md`](candidatas-diagramas-documentos.md) | Diagramas, documentos y productividad |
| [`candidatas-geografia-ajedrez.md`](candidatas-geografia-ajedrez.md) | Geografía; Ajedrez ya está integrado |
| [`descartadas.md`](descartadas.md) | Aparcadas, mencionadas y descartadas |

Las apps ya integradas se documentan solo en [`integradas.md`](integradas.md) y
no se repiten en las tablas de candidatas.

## Qué es una aplicación nativa

Una app nativa es una **librería que corre entera en el cliente**: se instala como
dependencia npm, se carga en un chunk aparte y se abre como ventana dentro de
*Tienda*. No tiene backend propio ni proceso en el servidor.

Requisitos para entrar en el catálogo:

- Licencia permisiva y compatible: **MIT, Apache-2.0, BSD, ISC**. Se descartan
  AGPL/GPL fuerte, SSPL, MPL cuando obliga a más de lo razonable, y licencias
  comerciales con clave o marca de agua.
- **Sin servidor propio**: todo el estado de trabajo vive en el navegador.
- **Carga diferida**: `lazy(() => import(...))` en un componente cliente; nunca en
  el bundle inicial del tablero.
- **Sin CDN de terceros** en producción: workers, fuentes, sonidos y assets se
  sirven desde el propio Site.
- Tamaño razonable para un chunk bajo demanda (orientativo: menos de ~1,5 MB gzip).
- Si necesita datos externos (teselas de mapa, catálogos), se documenta la
  dependencia de red y su atribución.

### Persistencia

La tabla `instance_apps` guarda solo el estado **instalada / no instalada de la
instancia**; lo gestionan el propietario y los administradores.

Para guardar trabajo hay una persistencia común, sin tabla ni endpoint por app:

1. **Sin persistencia** (abrir, trabajar, exportar y cerrar): la opción barata.
2. **`localStorage`**: progreso por navegador, no compartido entre el equipo.
3. **`app_documents`**: un estado JSON por proyecto y app, con permisos de
   edición y borrado. La interfaz usa `useAppDocument(projectId, appId)` y el
   servidor `/api/app-documents?project=…&app=…`. No hace falta migración nueva
   para una app que solo guarde un documento.

Los documentos de Blockly y Mermaid se guardan en `app_documents`, igual que
los de las futuras apps que usen este modelo.

## Cómo se integra una app

1. Carpeta propia en `app/board/apps/<id>/` con su componente y estilos.
2. Ficha en `NATIVE_APPS` de `lib/native-apps.ts` (data pura, también para el
   servidor): nombre, categorías (familias de uso) y subcategoría, portada,
   características y tamaño de ventana. La taxonomía cerrada está en
   `lib/native-apps.ts` (`STORE_TOP_CATEGORIES` y `STORE_SUBCATEGORIES`);
   una app puede pertenecer a varias categorías principales.
3. Registro en `app/board/apps/registry.tsx`: icono y componente lazy. El test
   `registry.test.ts` avisa si falta algo o si los ids no coinciden con la API.
4. Si guarda un documento, usa `useAppDocument` y añade su estado a esa tabla;
   no crees una tabla ni una ruta nuevas salvo que el dato no sea un documento
   JSON por proyecto.
5. Avisos de licencia en `THIRD-PARTY-NOTICES.md` (Apache-2.0 y BSD obligan a
   conservar el aviso de copyright).
6. Test de la tarjeta y de la ventana, y actualizar esta lista.

## Versiones

Cada aplicación y la propia tienda tienen versiones independientes:

| Nivel | Fuente | Dónde se ve |
|---|---|---|
| Site | `package.json` | Cabecera de Aula Kanban |
| Aula Store | `AULA_STORE_VERSION` en `lib/native-apps.ts` | Cabecera de Aula Store |
| App | `NativeAppMeta.appVersion` | Ficha de la app |
| Upstream | `NativeAppMeta.upstream` (opcional) y `extras` | Ficha de la app |

La versión de la app empieza en `1.0.0` y describe **nuestra integración**, no la
librería original. La versión upstream se toma del paquete instalado;
`lib/native-apps.test.ts` comprueba que coincide con `package-lock.json`.

Política de incremento:

- **Parche:** corrección, texto o estilo sin nueva capacidad.
- **Menor:** nueva capacidad o actualización upstream con cambio visible.
- **Mayor:** cambio incompatible de almacenamiento, API o contrato.

Aula Store usa la misma política para su propia versión. La versión del Site se
gestiona aparte con el flujo de publicación y no se incrementa al cambiar una app.
La tabla de versiones por app está en [`integradas.md#versiones-por-app`](integradas.md#versiones-por-app).

## Estado del catálogo

Las diecisiete apps actuales (Ajedrez **STORE-06**, Física 2D **STORE-07**, Geometría
interactiva **STORE-08**, Tarjetas de repaso **STORE-09**, Mapas conceptuales
**STORE-10**, Presentaciones **STORE-11**, Moléculas 3D **STORE-12**, Líneas de
tiempo **STORE-13**, Hoja de cálculo **STORE-14**, Notas y documentos
**STORE-15**, Visor Office **STORE-16** y Aula Documentos **STORE-17**, además de
las cinco iniciales) ya están integradas.

En el backlog quedan **ADOC-09 a ADOC-11**, la recuperación del cálculo
automático de Hoja de cálculo y **DEV-01** (evaluación de pnpm, fuera del catálogo
de apps). ADOC-01 a ADOC-08 y UI-10 están completados. El resto de candidatas
sigue documentado por categorías, sin entrada hasta que se prioricen.

## Cómo reverificar una licencia

```sh
node -e "fetch('https://registry.npmjs.org/<paquete>/latest').then(r=>r.json()).then(m=>console.log(m.name,m.version,m.license))"
```

Para paquetes con scope, la URL lleva `@scope%2Fnombre`. Comprobar también el
repositorio de origen: la licencia del paquete publicado manda, pero un README
puede contradecirla.
