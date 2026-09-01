# Canvas de la Puerta 1 — direcciones de material

Seis artboards con **la misma pantalla de Plantel y los mismos ocho jugadores**, para
cerrar la Puerta 1 de [ART_PIPELINE.md](../ART_PIPELINE.md) mirando en vez de leyendo.
El canvas tiene dos páginas.

**La paleta no se toca.** El papel claro está aprobado (Puerta 2, ago 2026) y lo que se
elige acá es otra cosa: cómo se ordena la información y de qué está hecha la superficie.
Que el boceto C fuera oscuro era un detalle del boceto, no lo que lo hacía bueno.

## Página 1 — La propuesta

| Archivo | Qué es |
| --- | --- |
| `Main.dc.html` | **D · La planilla del club (A + C)** — la propuesta, en la paleta aprobada. Gabi eligió A y C, y no compiten: A es **estructura** y C es **relieve**, así que se componen. Los renglones, las columnas comparables y la columna del "por qué" de A, sobre una chapa esmaltada color hueso con bisel y tornillos, medidores segmentados y un solo naranja en toda la pantalla (la valoración). El cabezal es la banda de sección `--sec-plantel` que el juego ya usa. |
| `Actual.dc.html` | Lo publicado hoy, reproducido con los tokens reales de `src/styles.css`. La referencia contra la que se compara. |
| `DPizarron.dc.html` | **D en pizarrón** — exactamente la misma UI con la paleta oscura. No es una propuesta: está para que se vea que la paleta es un eje aparte del que se eligió. Es, eso sí, la que mejor quedaría en las capturas de Steam, si alguna vez se decide reabrirla. |

## Página 2 — Las tres direcciones

| Archivo | Qué es |
| --- | --- |
| `Planilla.dc.html` | **A · Planilla del club** — papel con grano, una sola hoja con renglones, cifras en columna. **Elegida.** |
| `Pizarra.dc.html` | **C · Pizarra del vestuario** — chapa esmaltada sobre pizarrón, medidores segmentados, alto contraste. **Elegida.** |
| `Cartulina.dc.html` | **B · Carpeta de cartulina** — cada jugador es una ficha física: lengüeta, foto pegada, sello y lápiz. Archivada. |

`canvas.json` define las dos páginas, dónde se apoya cada artboard, sus títulos y las notas.

Ninguna dirección discute la dirección "club de barrio" ya aprobada: discuten **de qué
material está hecha la interfaz**. Lo que se elige acá es lo que después se implementa en
`src/styles.css`.

## Los retratos

Son los de `public/arte/` (`p-*.webp`), los mismos que usa el juego: el canvas los lleva
embebidos. Gonzalo Viera y Martín Techera comparten cara a propósito — son ocho retratos
para doce jugadores, que es justo el problema abierto de la Puerta 3.

## Volver a armarlo

El `.html` empaquetado (~2,7 MB: el editor de Claude Design más el contenido) **no se
versiona** — está en `.gitignore` y se regenera desde estos archivos con la skill `design`
de Claude Code (`seed-canvas.mjs`, pasando los seis `--artboard`, los siete `--image` de
`public/arte/` y `--canvas canvas.json`).

Publicado el 2026-09-01. Si Gabi lo editó en el canvas, la versión buena es la del Artifact:
antes de tocar nada acá, hay que extraerla de vuelta (`--extract`) y no pisarla.
