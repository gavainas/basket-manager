# Prompt — Menú principal / hub de navegación

Referencia de partida: **PC Fútbol / ProManager (1996-1998)**, pantalla de menú principal.
Lo que se toma de ahí no es la estética sino la **estructura**: un hub central con las
opciones repartidas en grupos temáticos por esquina, cada entrada con su ilustración
propia, rail de utilidades a un costado y tira de retratos abajo. Es un tablero físico,
no un árbol de software — lo opuesto al menú lateral de Football Manager.

Estado: exploración de Puerta 1. **Nada de esto está aprobado ni integrado al juego.**

## Prompt (inglés, para Higgsfield)

> El bloque `STYLE` es intercambiable: ver las tres variantes más abajo. El pegado de
> acá abajo trae la variante A.

```
Full-screen 16:9 screenshot of the main navigation hub of a PC management video game
called "Basket Manager". It must look like a real playable game screen: not concept art,
not a photo of a monitor, not a website mockup.

THE GAME: managing an amateur adult basketball club in a Montevideo neighborhood,
Uruguay. Grown men with jobs and families who play in a local league at night. This is
not professional sport: it is about who shows up, who pays the monthly dues, who is
angry about his minutes, and the asado after the game.

LAYOUT: a central hub with menu entries radiating into four thematic corner groups,
inspired by late-1990s Spanish PC sports management games. Dense, generous, physical.
Every entry has its own small illustrated icon panel next to a bold short label.

CENTER: the club identity — a fictional club crest, the club name "ATLETICO LA TEJA",
the line "SEMANA 7 DE 11", the next match "vs. DEPORTIVO SAYAGO - LUNES 20:30", and
"CAJA $1.240". Behind it, an old worn leather basketball resting on a scuffed wooden
gym floor.

FOUR GROUPS, each with its own coloured header band and three entries:
- top left, "LA SEMANA": PASAR LISTA (a clipboard with ticked names), QUINTETO (a
  tactics board with magnets), PARTIDO (a small gym scoreboard).
- top right, "EL PLANTEL": PLANTILLA (a row of player faces), VESTUARIO (metal lockers
  and a wooden bench), FICHAJES (two men shaking hands).
- bottom left, "LA LIGA": TABLA (a printed standings sheet), CALENDARIO (a wall
  calendar), RIVALES (a rival jersey on a hanger).
- bottom right, "LA CAJA": CUOTAS (a cash box with bills), GASTOS (receipts and a
  referee whistle), RIFA (a booklet of raffle tickets).

LEFT VERTICAL RAIL with utility actions: GUARDAR, NOTICIAS, SALIR.
One large prominent action button: "AVANZAR SEMANA".
BOTTOM STRIP: a row of small player portrait thumbnails of the squad — ordinary adult
amateur bodies, ages 20 to 45, varied builds including bellies and bald heads, some in
club singlets, a couple in street clothes.

STYLE: dark navy and charcoal panels with warm orange accents, crisp modern game UI,
dense but very readable, cold gym lighting at night, solid opaque panels.

TEXT: all interface text in Spanish. Keep every label short, one or two words. No
paragraphs of small text and no invented gibberish sentences.

AVOID: real club logos or real team identity; Football Manager clone aesthetics; SaaS
dashboard or corporate analytics design; minimalist mobile app UI; esports or neon
futuristic graphics; fantasy sports website; NBA professional glamour; childish cartoon
style; floating transparent glass panels.
```

## Variantes de estilo (reemplazan el bloque `STYLE:`)

**A — Planilla nocturna** (sobria, continuidad con lo actual):
```
STYLE: dark navy and charcoal panels with warm orange accents, crisp modern game UI,
dense but very readable, cold gym lighting at night, solid opaque panels.
```

**B — Carné de socio** (papelería del club):
```
STYLE: warm paper and beige tones with ink blue and burgundy accents, printed club
forms, rubber stamps, typewriter numerals, corkboard, photocopies and paper clips.
Everything looks physical, printed and handmade rather than digital.
```

**C — Pizarra del vestuario** (caricatura adulta):
```
STYLE: a dark green chalkboard with a thick wooden frame, cream cards held on with
masking tape, thick marker outlines, handwritten chalk annotations, warm orange
accents, expressive caricatured faces with exaggerated proportions. Adult and funny,
never childish.
```

## Notas prácticas

- **Modelo**: `gpt_image_2` maneja mejor el texto de interfaz que `nano_banana`. Aun así
  **el texto va a salir con errores** — es normal en cualquier modelo de imagen. No juzgar
  la dirección por la ortografía: mirar composición, paleta, densidad y clima.
- **Iterar sin perder el layout**: generar una, y después pasarla como imagen de referencia
  con "keep the same layout and the same content, change only the art style and palette".
  Es exactamente lo que funcionó en la serie 1 de julio.
- **Formato**: `16:9` para la versión de escritorio. Para la versión que Gabi juega en el
  celular, pedir `9:16` y cambiar la línea de layout por: *"a single vertical column of
  four thematic groups stacked one under the other, large touch-friendly entries, the club
  identity block pinned at the top and the AVANZAR SEMANA button pinned at the bottom"*.
- **El nombre del club** es un placeholder: en el juego lo elige el jugador. Conviene
  mantener un nombre claramente ficticio y nunca el de un club real.
- Las opciones del menú son las **pantallas que el juego realmente tiene**. Si el modelo
  agrega "Entrenamiento", "Cantera" o "Directiva", es invento suyo: no existen.
