# Sistema visual — dirección "club de barrio"

Sistema extraído de la referencia aprobada del 2026-08-16 (tablero de Club Atlético
Barrio Sur). Reemplaza la dirección cálida (madera y papel) y la dirección AAA oscura,
que quedan registradas como exploraciones descartadas.

**Kit navegable**: [`kit-sistema-visual.html`](kit-sistema-visual.html) — publicado en
<https://claude.ai/code/artifact/a1ef8b7b-cfee-440d-ac98-3bbe1fe62fae>. Está construido
con los tokens de este documento, así que es la referencia viva: si algo no cierra ahí,
no cierra.

> **Estado: candidato a Puerta 2, NO aprobado como arte final.**
> Ver [ART_PIPELINE.md](ART_PIPELINE.md). Mientras no esté aprobado rige la regla de
> desarrollo con arte pendiente: componentes reemplazables, sin variaciones masivas,
> sin propagar a pantallas nuevas salvo prueba controlada.

## De dónde sale

Una referencia generada en Higgsfield, elegida entre varias por comparación directa.
Lo que la hizo ganar:

- El **chrome es neutro** (grafito), así que el personaje y los datos se despegan.
- Cada área del juego tiene **su color**, repetido en la pestaña y en el cabezal del panel.
- El naranja quedó **reservado** para la acción.
- La densidad es de manager: siete columnas en la tabla, leyenda de playoffs y descenso.
- Está en castellano y la ficción es de barrio, no de programa universitario yanqui.

Los valores hex de abajo están sacados a ojo del render: son el punto de partida, se
afinan al pasarlos a `styles.css`.

## Principios

1. **El chrome es neutro; el color es dato.** La interfaz nunca lleva los colores de un
   club, porque en cuanto abrís la ficha de un rival se pelean. El azul de tu camiseta
   vive en la camiseta, el escudo y tu fila en la tabla — nunca en una barra.
2. **El color de sección es señalización, no decoración.** Sirve para que sepas dónde
   estás sin leer. Si un color no responde "¿en qué parte del juego estoy?", sobra.
3. **Un solo color para actuar.** El naranja significa "acá se toca" o "este es el número
   que importa". Si aparece cinco veces, deja de significar.
4. **Densidad con jerarquía.** Mucha información por pantalla — es un manager — pero
   siempre con cabezal, valor grande y subtexto.
5. **Lo que escala con los datos es procedural.** Ver [Reglas de assets](#reglas-de-assets).

## Tokens

Reemplazan el `:root` actual de [`src/styles.css`](../src/styles.css), que es tema oscuro
azul ("partido nocturno") y queda descartado.

| Token | Valor | Uso |
| --- | --- | --- |
| `--chrome` | `#32353a` | Barra superior y barra de recursos |
| `--chrome-alto` | `#3d4147` | Pestaña activa, superficies elevadas del chrome |
| `--lienzo` | `#e2dfd9` | Campo detrás de los paneles |
| `--panel` | `#f6f4f1` | Cuerpo de panel |
| `--panel-alt` | `#eceae6` | Bloque interno, fila alterna |
| `--linea` | `#d2cec8` | Filetes y bordes |
| `--tinta` | `#25282c` | Texto principal |
| `--tinta-media` | `#6a6f76` | Texto secundario |
| `--tinta-suave` | `#9a9fa6` | Etiquetas, texto deshabilitado |
| `--naranja` | `#e07a2a` | **Reservado**: acción y dato clave |
| `--radio` | `4px` | Radio estándar — esta dirección es cuadrada |

El radio de `10px` de la dirección anterior y los `14px` de la cálida no aplican: los
paneles de esta dirección son casi rectos. Es parte de lo que la hace leer como manager
y no como app.

### Semáforo

Separado del acento y de los colores de sección. Vive **dentro** de los datos (chips,
barras, puntos de noticia), nunca en un cabezal.

| Token | Valor | Uso |
| --- | --- | --- |
| `--bien` | `#4a9160` | Positivo |
| `--ojo` | `#c69320` | Alerta |
| `--mal` | `#b8443a` | Negativo |

`--bien` es más claro y más saturado que el verde de sección a propósito: si se parecen,
el jugador lee "sección liga" donde dice "está todo bien".

## Los siete colores de sección

Tintas impresas apagadas, nunca neón. Cada uno aparece en exactamente dos lugares: el
punto de su pestaña en la barra superior y la banda del cabezal de sus paneles.

| Sección | Token | Valor |
| --- | --- | --- |
| Tablero | `--sec-tablero` | `#2f6b4f` verde pino |
| Partidos | `--sec-partidos` | `#2d5c8a` azul |
| Vestuario | `--sec-vestuario` | `#9d3b3b` bordó |
| Plantel | `--sec-plantel` | `#b07f27` mostaza |
| Finanzas | `--sec-finanzas` | `#6a4a86` violeta |
| Scouting | `--sec-scouting` | `#456470` pizarra |
| Ajustes | `--sec-ajustes` | `#565b62` gris |

Siete es el techo. Si aparece un área nueva, entra compartiendo color con la más cercana
o se replantea el mapa entero — no se agrega un octavo.

Las secciones del juego actual se mapean así: Historia y Noticias van con Tablero;
Pretemporada y Mercado van con Plantel; Liga, Calendario y Rivales van con Partidos.

## La regla del naranja

Máximo **dos apariciones por pantalla**:

1. El botón primario (uno solo por pantalla).
2. El dato que la pantalla existe para mostrar.

Todo lo demás usa tinta, color de sección o semáforo. Si necesitás destacar una tercera
cosa, la jerarquía está mal resuelta y el naranja no la va a arreglar.

## Tipografía

| Rol | Familia | Uso |
| --- | --- | --- |
| Display | condensada pesada, mayúsculas | Cabezales, pestañas, cifras grandes, nombres de club |
| Cuerpo | sans humanista | Frases, notas, diálogo del vestuario |
| Datos | cuerpo con `tabular-nums` | Toda columna numérica |

Las etiquetas chicas van en mayúsculas con `letter-spacing` amplio y `--tinta-suave`.

**Pendiente técnico**: la maqueta usa Bahnschrift, que existe en Windows y no en Linux
ni en Mac. Para publicar en Steam hay que empaquetar una condensada real con licencia
(Oswald, Barlow Condensed o similar) y dejar de depender de la fuente del sistema.

## Anatomía de panel

```
┌─────────────────────────────────────┐
│ ▦ CABEZAL              banda color  │  40px, título display mayúscula
├─────────────────────────────────────┤
│                                     │
│   cuerpo --panel                    │  padding 16px
│                                     │
└─────────────────────────────────────┘
```

- Cabezal: fondo del color de la sección, texto `--panel`, ícono a la izquierda.
- Cuerpo: `--panel`, filete `--linea` cuando hay filas.
- Sombra mínima, un solo nivel. Sin biseles, sin degradados.
- Tu fila en una tabla se marca con fondo tenue y el número en `--naranja`.

## Barra superior

Identidad del club a la izquierda — escudo, nombre, año de fundación — y después las
siete secciones, cada una con su punto de color, su ícono y su nombre. La activa lleva
fondo `--chrome-alto` y filete inferior del color de su sección.

## Barra de recursos

Fija abajo, `--chrome`. Módulos separados por filete: ícono, etiqueta chica en
mayúsculas, valor grande tabular, sub-etiqueta. A la derecha el botón de avanzar semana,
que es el único naranja de la barra.

Los módulos son los recursos que mirás siempre: semana, caja del club, cuotas al día,
alquiler del gimnasio, próximo asado.

## El héroe y los arquetipos

El personaje grande de la izquierda **no es un jugador cualquiera: es el arquetipo de tu
figura**. El juego ya tiene ocho personalidades en `types.ts` (`competitivo`, `social`,
`protagonista`, `leal`, `mercenario`, `cumplidor`, `veterano`, `talentoso_informal`), así
que son ocho ilustraciones, no ciento veinte. Y el tipo que te mira desde el tablero
cambia según quién sea el referente del plantel, que es donde aparece la vida.

Reglas de estilo, para que el generador SVG pueda alcanzarlo después:

- Relleno plano, **sin contorno**. Las formas se definen por color.
- Dos tonos de sombra por forma como máximo. Sin degradados, sin textura, sin 3D.
- Cabeza levemente agrandada, caricatura cálida, persona específica.
- Cuerpo entero, de pie, peso en una pierna, mirando apenas fuera de eje.
- Fondo de gimnasio desaturado y desenfocado: el personaje es lo único nítido.

## Reglas de assets

> **Lo que escala con los datos es procedural. Lo que es poco y fijo se genera.**

| Asset | Cantidad | Cómo |
| --- | --- | --- |
| Retratos de jugadores | 120+ y crece | Procedural — ya existe ([AVATAR_SYSTEM.md](AVATAR_SYSTEM.md)) |
| Escudos de club | 30+ y crece | Procedural — ya existe (`game/crest.ts`) |
| Camisetas | por club | Procedural, derivado del color |
| Fondos de gimnasio | 4-6 | Generado |
| Cancha para la pizarra | 1-2 | Generado |
| Héroes por arquetipo | 8 | Generado |
| Ilustraciones de evento | ~6 familias | Generado |
| Key art / portada Steam | 1-2 | Generado |

Ninguna IA te va a dar diez escudos consistentes entre sí, y menos treinta: por eso el
generador de escudos (`game/crest.ts` + `ui/Crest.tsx`) es hermano del de retratos —
seed = id del club, un hash por capa, todo SVG dibujado por código.

Lo que reemplazó: los escudos eran emoji de un bolillero de diez, y tres eran mascotas
(águila, lobo, león) — justo lo que este documento decía no tomar. Las iniciales salen
del **nombre del club**, no del azar: "Atlético El Parque" → EP, y las palabras de
relleno (Club, Atlético, Deportivo, Social, de, la…) no cuentan, porque si contaran media
liga tendría las mismas.

**La restricción que manda el diseño es el tamaño.** El escudo vive en la fila de una
tabla de diez equipos (18px) y en la ficha de un club (96px). A 18px lo único que se lee
es silueta + dos colores + una partición: una pelota con costuras ahí es puré. Así que el
detalle entra por umbral — abajo de 28px solo la silueta, arriba suma medallón, iniciales
y estrellas. Validar en `/#escudos`, que es la pantalla hermana de `/#retratos`.

Dos cosas que solo aparecieron al ver la galería, y que valen como advertencia para
cualquier capa nueva:

1. **El clipPath recorta el campo, no el contenido.** Las figuras y las iniciales se
   desbordaban en el rombo y el círculo. Cada silueta declara ahora su caja segura
   (`SAFE` en `Crest.tsx`) y el contenido se dibuja siempre en coordenadas locales.
2. **Tinta clara sobre partición clara desaparece.** No hay forma de saber de antemano qué
   partición le tocó a cada club, así que la figura va sobre un medallón del color de
   campo y las iniciales llevan contorno con `paint-order: stroke`.

**No pedir assets hasta que el shell exista.** Sin el marco no se conocen las medidas,
las proporciones ni el recorte del héroe.

## Qué NO tomamos de la referencia

La referencia tiene errores que no son parte del sistema:

- **La escala del dinero.** Mostraba $1.245.870 de caja. El juego maneja cuotas de $30
  por semana: la caja va en miles.
- **Marcas reales.** Las zapatillas tenían el swoosh de Nike. Fuera, siempre.
- **`$ $` duplicado** en el módulo de alquiler.
- **Diálogo genérico.** "Buen laburo en la semana, muchachos" es de molde. El motor ya
  escribe mejor que eso ("se me rompió la suela", "laburo hasta las 8"): la UI muestra
  lo que genera `voices.ts`, no frases de relleno.
- **Naranja diluido.** Aparecía cinco veces. Ver [la regla del naranja](#la-regla-del-naranja).
- **Mascotas de escudo.** Un lobo dibujado es de liga universitaria de EEUU. Los clubes
  de barrio van con escudo, franja, estrella e iniciales.

## Estado de implementación

**Paso 3 hecho** (shell): `src/styles.css` cambió de tema oscuro azul a este sistema.
Los nombres de token viejos se conservaron, así que las ~2200 líneas de componentes
siguieron funcionando sin tocarlas: lo único que cambió es a qué apuntan.

Además del cambio de tokens hubo que arreglar a mano lo que asumía fondo oscuro:

- La **pizarra del quinteto** es ahora la única superficie oscura del sistema — una
  cancha pintada de azul, como la del gimnasio. Todo lo que va encima lleva tinta clara
  explícita, porque hereda `--text` y en claro sería ilegible.
- Sombras, scrim del modal y tintes de resultado, recalculados para fondo claro.
- El azul de rotación `#4ea8de`, que `DESIGN.md` marcaba como "candidato a token",
  pasó a ser `--sec-partidos`.

**Pasada de la regla del naranja.** Al verlo corriendo aparecieron cinco naranjas por
pantalla. Lo que se corrigió, y por qué cada uno no era ni acción ni dato clave:

| Antes | Ahora | Razón |
| --- | --- | --- |
| `.chip.accent` naranja | pizarra | Un chip informativo no es una acción |
| `.step.active` naranja | azul de Partidos | El paso en curso es señalización |
| `.watch-card` borde naranja | franja verde Tablero | Es el resumen de la sección |
| Aro de `.avatar` naranja | filete neutro | Doce caras se comen el color de acción |
| `.slot-avatar` naranja | aro claro | Sobre la cancha azul se recorta mejor |
| Camiseta por defecto naranja | azul de cancha | Ídem, multiplicado por plantel |
| Botón de la barra en la semana | secundario | Dos primarios competían en pantalla |

**Mapa de secciones → pestañas.** Liga, Agenda y Rankings comparten el azul de Partidos
porque son la misma área: el color responde "¿qué parte del juego es esta?", no "¿qué
pestaña toqué?". `semana` dejó de ser pestaña — es la acción, y vive en la barra de
recursos.

Pendiente del paso 4: las cards todavía no llevan banda de color (la clase `.card.banda`
ya existe), y el Resumen duplica Semana, Récord y Dinero, que ahora están fijos abajo.

## Cómo volver atrás

Cada paso queda en un commit propio en `claude/basket-manager-mockup-vm5xak`. El arte
anterior no se borra:

- La dirección cálida sigue viva en su artifact y en la maqueta HTML de las 24 pantallas.
- Para volver al tema oscuro azul: `git checkout main -- src/styles.css src/App.tsx
  src/ui/Avatar.tsx`. El motor no se tocó en ningún momento.
- Para empezar el arte de cero además: `git checkout main -- design/` y estos documentos
  desaparecen sin dejar rastro.
