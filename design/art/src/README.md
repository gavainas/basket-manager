# Fuente del banco de pruebas (Puerta 2)

`../puerta2-tipografia-iconos.html` es **archivo generado**: sale de `menu.template.html`
con las fuentes empotradas como data URIs.

Se hace así porque el juego se publica en GitHub Pages y **no puede depender de un CDN de
fuentes**; empotrarlas prueba de verdad lo que va a pasar en producción.

## Regenerar

1. Bajar los woff2 (subset latin) de Google Fonts a una carpeta `fonts/`, con estos nombres:
   `archivo-400`, `archivo-600`, `archivo-700`, `archivoblack-400`, `bebas-400`,
   `barlow-400`, `barlow-600`, `barlow-700`, `anton-400`, `plex-400`, `plex-600`,
   `plex-700`, `caveat-600`.
2. Ajustar las rutas de `build.py` y correrlo: reemplaza el marcador `/*FONTS*/` del
   template por los `@font-face` y escribe el HTML final.

Las fuentes no se commitean acá: cuando la tipografía se decida, entran al proyecto de
verdad en `public/fonts/` — **solo las elegidas**, no las trece.

## Fuentes usadas (todas licencia libre)

| Par | Display | Texto y datos |
| --- | --- | --- |
| Planilla | Archivo Black | Archivo |
| Cancha | Bebas Neue | Barlow |
| Imprenta | Anton | IBM Plex Sans |

Caveat se usa en los tres, solo para la voz manuscrita (las excusas, las notas del
vestuario). Nunca para datos.

## Nota técnica: por qué los íconos van con variables CSS

El CSS del documento **no alcanza el contenido clonado por `<use>`** — vive en un shadow
tree y los selectores de afuera no lo matchean. Las **custom properties sí se heredan**
hacia adentro. Por eso cada forma del ícono lleva
`style="fill:var(--af);stroke:var(--as);…"` y los tres modos (Objeto / Silueta / Línea)
solo redefinen esas variables en un contenedor. Es lo que permite tener un solo juego de
geometría y tres acabados.
