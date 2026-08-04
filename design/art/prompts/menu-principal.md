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

## v2 — Ajuste de Gabi: más alegre y con humor (ago 2026)

La v1 dio el layout correcto pero salió **oscura y sin gracia**: paleta nocturna
(culpa del bloque `STYLE` original, que pedía *charcoal* y *cold gym lighting at night*)
y once retratos fotorrealistas de señores serios que parecen la misma persona.

Dos correcciones: **paleta soleada** y **el humor en el contenido**, no en el layout.

### Ruta recomendada: re-estilar sin perder el layout

Pasar la imagen generada como referencia y pedir solo el cambio de piel:

```
Keep the exact same layout, the same four thematic groups, the same menu entries, the
same left rail, the same central club block and the same bottom strip of player
portraits. Change only the palette, the lighting and the character art.

PALETTE: bright, sunny and cheerful. Warm cream and bone white panels, sky blue, grass
green, basketball orange, tomato red and mustard yellow accents, a honey coloured
wooden floor. Warm afternoon daylight pouring in through the gym windows. Saturated,
high contrast, clean and readable. Remove all the dark navy, all the charcoal and all
the moody cinematic lighting.

CHARACTERS: replace every photorealistic face with warm adult caricature illustration.
Exaggerated noses, chins, bellies, ears and bald heads. Big expressive grins. Wildly
different body types and ages from 20 to 45, so that no two men look alike. Affectionate
and funny, never grotesque, never mean spirited, never childish.

HUMOR, in the small details:
- the PASAR LISTA clipboard: half the names ticked, the rest with handwritten excuses
  scribbled beside them - "LABURO", "LA SUEGRA", "ME DUELE TODO".
- the QUINTETO board: a tactics diagram drawn over and erased far too many times.
- the PARTIDO scoreboard: 68-69 with two seconds left on the clock.
- the VESTUARIO: a lonely sock on the bench, flip flops on the floor, one locker
  hanging half open.
- the FICHAJES handshake: it happens over a bar table with two beers on it.
- the TABLA standings sheet: a coffee ring stain on the paper.
- the CUOTAS cash box: coins, a few crumpled bills and a scribbled IOU note.
- the RIFA: raffle tickets and the prize, a wicker basket of food.
- the bottom strip of portraits: the captain with a huge belly and a headband, a bald
  veteran wearing a knee brace, a very tall skinny kid drowning in an oversized singlet,
  one man still in his work shirt with the tie loosened, one holding a mate gourd, one
  wearing sunglasses with an obvious hangover.

The interface itself stays clean, orderly and easy to read. The jokes live in the
illustrations and the small details, never in the layout.
```

### Si se genera de cero

Sobre el prompt de la v1, reemplazar el bloque `STYLE:` por este y **agregar** las
secciones `HUMOR` y `CHARACTERS` de arriba:

```
STYLE: bright, sunny and cheerful. Warm cream and bone white panels, sky blue, grass
green, basketball orange, tomato red and mustard yellow accents, a honey coloured
wooden floor, warm afternoon daylight through the gym windows. Saturated and high
contrast, but always clean and readable. Warm adult caricature illustration for every
person, in the spirit of an affectionate sports cartoon.
```

Y en el bloque `AVOID`, quitar *"childish cartoon style"* (ahora sí queremos caricatura)
y agregar: `grotesque or ugly caricature; mean spirited humor; wacky cluttered interface;
funny at the cost of readability.`

### La regla del humor

> Los personajes se caricaturizan; **la interfaz no**.

Si todo grita, no hay chiste y además el juego se vuelve ilegible. El humor entra por
las ilustraciones y los detalles chiquitos (las excusas en la planilla, la media sola
en el vestuario, el vale por dos cuotas en la caja de lata) mientras las cards, los
datos y la jerarquía siguen siendo sobrios. Eso es lo que hace que la broma se sostenga
en la fecha 40 en vez de cansar en la 3.

## v3 — "parece un juego de niños": contención y desgaste (ago 2026)

La v2 acertó el clima (soleado, de tarde) pero cayó en registro infantil. **No es por el
brillo.** Cuatro causas concretas:

1. **Cuatro hues saturados como código de categoría** (azul / rojo / verde / naranja en
   fila). Es el tell más fuerte: las apps para chicos codifican todo con primarios.
2. **Cero valores oscuros** en toda la imagen. Sin un ancla oscura la composición flota.
3. **Todo nuevo y liso.** Un club de barrio tiene cosas gastadas; el desgaste es lo que
   lee como adulto.
4. **Tipografía redondeada y blanda**, con sombras suaves.

### Prompt de corrección (pasando la v2 como referencia)

```
Keep the exact same layout, the same four thematic groups, the same menu entries, the
same left rail and the same central club block. Change only the palette, the materials
and the typography. Bring back the bottom strip of eleven player portrait thumbnails.

The current version reads as a children's game. Fix it through restraint and wear, not
through darkness.

PALETTE: keep the sunny warm mood but mute every hue. Replace the bright primary blues,
greens, reds and yellows with faded printed tones: dusty slate blue, brick terracotta,
olive moss green, ochre mustard, burnt orange. Card surfaces in warm oat and bone, never
pure white. Add a dark value anchor: a deep ink charcoal frame around the whole screen
and behind the left rail, so the warm cards sit against something solid. Wood floor in
scuffed honey and walnut. The colours should look like faded printed cardboard and old
painted club signage, never like plastic toys.

CATEGORY HEADERS: stop colour coding the four groups with four saturated hues. Give all
four the same dark ink header band, distinguished only by a small muted colour tab and
by the icon.

MATERIALS AND WEAR: everything is used, not new. Scuffed varnish on the floor, chipped
paint, worn corners on the cards, a strip of masking tape, faint paper grain, a coffee
ring, slightly bent photographs. Real directional late afternoon light with actual
shadows and contrast, not flat even brightness.

TYPOGRAPHY: heavy condensed sans serif, slightly compressed, industrial and printed. No
rounded bubbly letterforms, no soft glow, no outlined cartoon text.

CHARACTERS: the faces in PLANTILLA, FICHAJES and in the bottom strip must be warm adult
caricature illustration, not photographs. Weathered adult men from 20 to 45, all clearly
different from one another.

REMOVE: the crest in the top right corner, it belongs to a real club. Keep only the
fictional ATLETICO LA TEJA crest in the centre. Remove the loose floating words over the
QUINTETO panel: the handwritten excuses belong written on the PASAR LISTA clipboard and
nowhere else.

Keep it cheerful and sunny, but grown up: a real neighbourhood club on a Sunday
afternoon, worn by use, not a toy.
```

### La regla del registro adulto

> Lo adulto no lo da la oscuridad: lo dan **el ancla de valor** y **el desgaste**.

Una pantalla soleada y clarísima puede leerse perfectamente adulta si (a) los colores
están apagados —impresos, no plásticos—, (b) hay algo genuinamente oscuro sosteniendo la
composición, y (c) las cosas parecen usadas. Un afiche viejo de club es alegre y no tiene
nada de infantil. El error de la v2 fue confundir *alegre* con *saturado*.

**Dial de vuelta**: si queda demasiado sobrio, cambiar `faded printed tones` por
`warm printed tones with one saturated accent`.

### Errores de generación que esta pasada también corrige

- **Escudo real**: apareció el del Sporting de Gijón arriba a la derecha, filtrado desde
  la referencia de PC Fútbol. Vigilar siempre: no va identidad de clubes reales.
- La **tira de retratos** de abajo desapareció entre la v1 y la v2.
- Las **excusas** quedaron flotando sobre el panel de QUINTETO en vez de escritas en la
  planilla de PASAR LISTA.
- Las caras de PLANTILLA y FICHAJES siguieron fotorrealistas pese al pedido de caricatura.

## v4 — Prompt limpio: cortar la contaminación de la referencia (ago 2026)

La v3 (generada en **Grok Imagine**) ganó lo que buscábamos en materiales: papel
envejecido en los íconos, madera gastada, marco oscuro que ancla, cards color avena. La
paleta dejó de ser plástica. **Ese hallazgo se conserva.**

Pero apareció el problema grande: **la captura de PC Fútbol se metió dentro de la imagen**.
Se ven el escudo del Oviedo a la izquierda y el del Sporting a la derecha, con los menús
verdes de PC Fútbol asomando por ambos costados — el modelo trató la referencia como
decorado de fondo. Y peor, **le contaminó el vocabulario**: donde iba FICHAJES quedó
"VER RIVAL", donde iba TABLA quedó "FICHAR", donde iba RIFA quedó "ESTADIO".

**Causa raíz**: seguir pasando la captura de PC Fútbol como imagen de referencia. Su
estructura ya está descrita en palabras en el prompt; la imagen no aporta y contamina.

**Regla**: nunca más pasar la captura de PC Fútbol. Si se quiere conservar el layout, se
pasa **únicamente la última imagen generada del propio juego**, o ninguna.

### Prompt limpio (sin ninguna imagen de referencia)

```
Full-screen 16:9 screenshot of the main navigation hub of a management video game called
"Basket Manager". The screenshot fills the entire frame edge to edge, flat and straight
on. It is not a device, not a floating mockup in a room, not shown in perspective, and no
other screen, window or game is visible anywhere in the image.

THE GAME: managing an amateur adult basketball club in a Montevideo neighbourhood,
Uruguay. Grown men with jobs and families who play in a local league at night. Basketball
only: no football pitches and no football imagery anywhere.

LAYOUT: a central club block, menu entries grouped into four thematic corner blocks, a
narrow vertical utility rail on the left, and a strip of player portraits along the
bottom edge.

CENTER: a fictional club crest, "ATLETICO LA TEJA", "SEMANA 7 DE 11", "vs. DEPORTIVO
SAYAGO - LUNES 20:30" and "CAJA $1.240", over an old worn leather basketball resting on a
scuffed wooden gym floor.

THE FOUR GROUPS AND THEIR TWELVE ENTRIES. These twelve words are the only menu labels
allowed in the image:
- "LA SEMANA": PASAR LISTA, QUINTETO, PARTIDO
- "EL PLANTEL": PLANTILLA, VESTUARIO, FICHAJES
- "LA LIGA": TABLA, CALENDARIO, RIVALES
- "LA CAJA": CUOTAS, GASTOS, RIFA
Each entry is a bold label beside a small illustrated icon panel: a clipboard with ticked
names and handwritten excuses, a tactics board, a gym scoreboard reading 68-69, a row of
teammates, metal lockers with a lonely sock, a handshake over a bar table with two beers,
a printed standings sheet with a coffee ring, a wall calendar, a rival singlet on a
hanger, a tin cash box with coins and an IOU note, receipts and a referee whistle, a
booklet of raffle tickets.

FORBIDDEN WORDS: this is not a football game. Never write VER RIVAL, ALINEACION, TACTICAS,
ESTADIO, EMPLEADOS, CLASIFICACION, DECISIONES, GOLES or FICHAR anywhere in the image.

LEFT RAIL: GUARDAR, NOTICIAS, SALIR, plus one large burnt orange button: AVANZAR SEMANA.

BOTTOM STRIP: eleven small player portraits, each with a number and a position beneath it.
Warm adult caricature illustration, never photographs: exaggerated noses, chins, bellies,
ears and bald heads, ages 20 to 45, wildly different builds so that no two men look alike.
The captain with a big belly and a headband, a bald veteran in a knee brace, a very tall
skinny kid drowning in an oversized singlet, one man still in his work shirt, one holding
a mate gourd, one in sunglasses with an obvious hangover. Affectionate and funny, never
grotesque, never mean spirited, never childish.

PALETTE: sunny and warm but muted. Faded printed tones: dusty slate blue, brick terracotta,
olive moss green, ochre mustard, burnt orange. Card surfaces in warm oat and bone, never
pure white. A deep ink charcoal frame around the screen and behind the left rail as a dark
anchor. Scuffed honey and walnut wood. Colours like faded printed cardboard and old painted
club signage, never like plastic toys.

CATEGORY HEADERS: all four groups share the same dark ink header band, distinguished only
by a small muted colour tab and by the icon. Do not colour code the four groups with four
saturated hues.

MATERIALS: everything is used. Scuffed varnish, chipped paint, worn card corners, masking
tape, faint paper grain, slightly bent photographs. Directional late afternoon light with
real shadows.

TYPOGRAPHY: heavy condensed sans serif, industrial and printed. No rounded bubbly
letterforms, no glow, no outlined cartoon text.

CRESTS: only the fictional ATLETICO LA TEJA crest, once, in the centre. No other crest
anywhere, and never a real club's crest.

AVOID: any second screen or window; perspective or 3D mockup framing; Football Manager
clone aesthetics; SaaS dashboard design; mobile app minimalism; esports neon; NBA glamour;
grotesque caricature; a cluttered interface that is hard to read.
```

### Modelo

Volver a **`gpt_image_2`**. Grok Imagine rindió peor justo en lo que más importa acá: el
texto de interfaz salió mucho más roto, y trató la imagen de referencia como decorado
("poné esto en la escena") en vez de como guía de estilo.

### Cuándo dejar de generar

Lo que la Puerta 1 necesita es decidir una **dirección** — paleta, materiales, estilo de
personajes, clima. La v3 ya la está diciendo: papel gastado + madera + tonos apagados
funciona. Que las etiquetas digan "BASTOS" o "RIU1TAS" no cambia esa decisión, y **ningún
modelo de imagen va a dar texto de interfaz perfecto**.

Cuando la dirección cierre, el paso que rinde es implementarla **en código con los datos
reales del juego**: ahí el texto es perfecto por construcción, se prueba en el celular y a
los tamaños que importan (que es donde estos estilos se rompen). Eso es exactamente la
Puerta 4/5 del pipeline.

## v5 — Sacar el lavado sepia: el desgaste va en los objetos, no en la UI (ago 2026)

La v4 resolvió casi todo: **cero contaminación de PC Fútbol**, las 12 etiquetas correctas,
volvió la tira de once retratos con caras distintas y con carácter, y los íconos quedaron
con gracia (la planilla con tildes y cruces, el 68-62, el talonario de rifa, la mancha de
café). **La estructura está cerrada.**

Lo que falló: **un lavado beige / tostado / sepia parejo sobre toda la imagen**. Gabi lo
leyó al toque: *"parece gastado y con IA"*. Tiene razón, y el error fue del prompt: pedir
`worn`, `aged` y `faint paper grain` a nivel global. Los modelos de imagen traducen eso a
un **filtro sepia uniforme**, que es una de las firmas de IA más reconocibles que existen.

### La regla

> El desgaste va **adentro de los objetos dibujados**, nunca sobre la interfaz.

La planilla puede estar ajada; la card que la contiene, no. El contraste entre una UI
limpia y contemporánea y unos objetos usados viviendo adentro de los íconos es exactamente
la identidad que ya declara `DESIGN.md`: *profesional en usabilidad, amateur en
personalidad*. Cuando el desgaste se derrama sobre el chrome, se pierden las dos cosas.

### Prompt de corrección (pasando la v4 como referencia)

```
Keep the exact same layout, the same panels, the same icons, the same portraits and the
same typography. Change only the colours and the surface treatment.

The current version has a uniform beige, tan and sepia wash over the entire image. It
reads as an artificially aged AI picture. Remove it completely.

INTERFACE SURFACES: the interface itself is clean, flat and modern. Solid colour panels
with crisp edges. No paper texture, no grain, no stains, no scuffing, no torn corners, no
sepia, no parchment, no beige, no tan, no cream, and no aged or vintage treatment anywhere
on the interface.

Card panels: clean off white with a slight cool grey cast, like freshly printed card.
Shell, frame and left rail: deep slate navy, almost black. Group header bands: the same
deep navy for all four. Accents: one confident burnt orange and one mid petrol blue.
Labels and numbers: near black on the light panels, bone white on the dark ones.

THE ONLY WARM ELEMENTS: the honey amber wooden gym floor in the centre, and the objects
drawn inside the icon panels. Those objects may still look used and lived in - the
scuffed clipboard, the dented tin cash box, the printed standings sheet with its coffee
ring - but their wear stays inside the illustration and never spreads onto the interface
around them.

Keep everything else exactly as it is.
```

**Dial**: si queda demasiado frío, agrandar el piso de madera antes que volver a teñir las
cards.

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
