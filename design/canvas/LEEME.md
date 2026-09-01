# Canvas de la Puerta 1 — direcciones de material

Cuatro artboards con **la misma pantalla de Plantel y los mismos ocho jugadores**, para
cerrar la Puerta 1 de [ART_PIPELINE.md](../ART_PIPELINE.md) mirando en vez de leyendo.

| Archivo | Qué es |
| --- | --- |
| `Actual.dc.html` | Lo publicado hoy, reproducido con los tokens reales de `src/styles.css`. La referencia contra la que se comparan las otras tres. |
| `Main.dc.html` | **A · Planilla del club** — papel con grano, una sola hoja con renglones, cifras en columna. |
| `Cartulina.dc.html` | **B · Carpeta de cartulina** — cada jugador es una ficha física: lengüeta, foto pegada, sello y lápiz. |
| `Pizarra.dc.html` | **C · Pizarra del vestuario** — chapa esmaltada sobre pizarrón, medidores segmentados, alto contraste. |
| `canvas.json` | Dónde se apoya cada uno en el lienzo, sus títulos y la nota de arriba. |

Las tres direcciones **no discuten la dirección "club de barrio" ya aprobada**: discuten de
qué material está hecha la interfaz. Lo que se elige acá es lo que después se implementa en
`src/styles.css`.

Los retratos son los de `public/arte/` (`p-*.webp`), los mismos que usa el juego: el canvas
los lleva embebidos. Gonzalo Viera y Martín Techera comparten cara a propósito — son ocho
retratos para doce jugadores, que es justo el problema abierto de la Puerta 3.

## Volver a armarlo

El `.html` empaquetado (~2,7 MB: el editor de Claude Design más el contenido) **no se
versiona** — está en `.gitignore` y se regenera desde estos archivos con la skill `design`
de Claude Code (`seed-canvas.mjs`, pasando los cuatro `--artboard`, los siete `--image` de
`public/arte/` y `--canvas canvas.json`).

Publicado el 2026-09-01. Si Gabi lo editó en el canvas, la versión buena es la del Artifact:
antes de tocar nada acá, hay que extraerla de vuelta (`--extract`) y no pisarla.
