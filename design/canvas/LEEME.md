# Canvas de la Puerta 1 — direcciones de material

Cinco artboards con **la misma pantalla de Plantel y los mismos ocho jugadores**, para
cerrar la Puerta 1 de [ART_PIPELINE.md](../ART_PIPELINE.md) mirando en vez de leyendo.
El canvas tiene dos páginas.

## Página 1 — La propuesta

| Archivo | Qué es |
| --- | --- |
| `Main.dc.html` | **D · La planilla sobre el pizarrón (A + C)** — la propuesta. Gabi eligió A y C, y no compiten: A es **estructura** y C es **materia**, así que se componen. Los renglones, las columnas comparables y la columna del "por qué" de A, hechos con la chapa atornillada, el contraste y los medidores encendidos de C, con un solo naranja en toda la pantalla (la valoración). |
| `Actual.dc.html` | Lo publicado hoy, reproducido con los tokens reales de `src/styles.css`. La referencia contra la que se compara. |

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

## Lo que queda por decidir

Si **todo** el juego va en pizarrón, o si el papel claro se queda para las pantallas de
gestión (Plantilla, Finanzas, Pretemporada) y el pizarrón es la semana y el partido. El
juego ya tiene un color por área en `styles.css`, así que la división por área no sería
una excepción sino una regla más.

## Los retratos

Son los de `public/arte/` (`p-*.webp`), los mismos que usa el juego: el canvas los lleva
embebidos. Gonzalo Viera y Martín Techera comparten cara a propósito — son ocho retratos
para doce jugadores, que es justo el problema abierto de la Puerta 3.

## Volver a armarlo

El `.html` empaquetado (~2,7 MB: el editor de Claude Design más el contenido) **no se
versiona** — está en `.gitignore` y se regenera desde estos archivos con la skill `design`
de Claude Code (`seed-canvas.mjs`, pasando los cinco `--artboard`, los siete `--image` de
`public/arte/` y `--canvas canvas.json`).

Publicado el 2026-09-01. Si Gabi lo editó en el canvas, la versión buena es la del Artifact:
antes de tocar nada acá, hay que extraerla de vuelta (`--extract`) y no pisarla.
