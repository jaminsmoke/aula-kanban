# Aparcadas, mencionadas y descartadas

## Aparcadas

| App | Paquete | Licencia | Motivo |
|---|---|---|---|
| Python en el navegador | `pyodide` 314.0.7 | MPL-2.0 | Permitida, pero 10-30 MB en la primera carga |
| Cuadernos marimo | `marimo` (Python) | Apache-2.0 | No es npm ni cliente puro: necesita kernel Python |
| Notas colaborativas | `@blocksuite/editor` 0.10.0 | MPL-2.0 | Pensada para colaboración con backend |

## Paquetes mencionados en la conversación

| Nombre | Qué se dijo | Qué hay realmente |
|---|---|---|
| `@itkdm/open-lab-components` | 210+ componentes interactivos STEM | Existe. MIT, 0.1.1 (febrero 2026), 3 MB, sin dependencias, repositorio público con 10 estrellas. Son **fragmentos HTML/CSS/JS**, no componentes React: necesitan `iframe` aislado. Candidata con reservas por madurez |
| `@smst/edu-tools` | Herramientas educativas en React | Existe. MIT, 2.2.1 (octubre 2025), 2,27 MB, con subrutas por herramienta. Se usó para regla y transportador y se retiró en APP-02: la calculadora y la tabla periódica son código propio. El repositorio declarado en `package.json` devuelve 404 |
| `marimo-learn` | Widgets de evaluación en Python o bundle npm | Existe **solo en PyPI** (0.14.0, MIT): widgets para cuadernos marimo, requiere `marimo` y `anywidget`. **No hay bundle npm** ni versión cliente pura, así que no encaja como app nativa. Su repositorio enlazado también devuelve 404. Se cubre con `ts-fsrs` + UI propia |
| `eXeLearning` | Editor de recursos open source | Existe, **AGPL-3.0** y aplicación de escritorio (repositorio activo, actualizado en noviembre de 2026). No se puede incrustar: solo se pueden **importar sus exportaciones** HTML/SCORM como contenido. El contenido exportado lleva la licencia que elija el autor (por defecto CC BY-SA) |

## Descartadas

| Paquete | Licencia | Motivo |
|---|---|---|
| `tldraw` 5.6.0 | Licencia tldraw | En producción exige clave o marca de agua; el SDK no es open source |
| `scratch-vm` / `scratch-gui` | AGPL-3.0 | Copyleft de red: obligaría a abrir todo el sitio |
| `@react-pdf-viewer/core` | Comercial | Licencia propia de pago |
| `@blocksuite/editor` | MPL-2.0 | Enfoque colaborativo con backend propio |
| GeoGebra | API de terceros | No hay paquete npm real; uso restringido |
| Desmos | Propietario | Sin licencia reutilizable |
| PhET | CC BY, sin npm | Solo iframe con su CDN |
| Handsontable | Comercial | Hoja de cálculo de pago |
| AG Grid (Enterprise) | Comercial | La versión MIT no cubre lo interesante |
| `x-spreadsheet` | Sin metadatos | Sin mantenimiento fiable |
