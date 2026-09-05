# Canvas del informe del partido — tres repartos de la pantalla

Tres artboards con **la misma pantalla de informe y el mismo partido** (Atlético El
Parque 66 – 67 Los Cardales, semana 6), para elegir mirando en vez de leyendo cómo se
reparte el espacio entre el marcador, la planilla y el color.

Publicado en <https://claude.ai/code/artifact/1b793226-9805-4442-bba3-17b0f22b0df6>.

## El problema que se está resolviendo

La pantalla publicada hoy reparte así sus 800px útiles:

| Zona | Alto | Qué tiene |
| --- | --- | --- |
| Cabecera (marcador + cuartos) | **306px (38%)** | casi todo aire |
| Planilla | 246px visibles | de **556px** de contenido |
| Relato / Ánimos | 246px | |

La planilla —lo que el informe existe para mostrar— es el panel más chico y muestra
menos de la mitad de su contenido: el rival no entra sin scrollear. Pasó porque la
planilla de dos equipos se metió en un tercio de pantalla para no romper el marco fijo
(`.informe-pantalla`, grilla de tres filas: cabecera / cuerpo elástico / barra).

## Las tres

| Archivo | Qué propone | Su costo |
| --- | --- | --- |
| `Main.dc.html` | **A · La planilla manda.** El marcador se comprime a una tira de ~90px (escudos, números, cuartos y resumen en una línea) y la planilla de los dos equipos se lleva el centro. | Relato y ánimos quedan a tres o cuatro renglones visibles. |
| `OpcionB.dc.html` | **B · Los números a un lado, el color al otro.** Columna ancha con marcador, cuartos y las dos planillas; columna angosta con relato y ánimos. | Con planteles largos hay que scrollear la columna izquierda, y el relato queda con mucho aire. |
| `OpcionC.dc.html` | **C · Como la planilla de la liga.** La pantalla *es* la planilla, con el marcador integrado en el cabezal de cada equipo. Cuartos, relato y ánimos en una franja fina abajo. | Con 7 jugadores por equipo queda un hueco grande en el medio, y el marcador pierde el golpe de vista. |

En las tres desaparece el marcador grande centrado de hoy: pasa a ser una tira o un
número dentro del cabezal de cada equipo.

## Reglas que se respetaron

- **Los tokens son los de `src/styles.css`**, no aproximaciones: `#32353a` chrome,
  `#f6f4f1` panel, `#d2cec8` filete, `#2d5c8a` la banda de Partidos, `#e07a2a` el
  naranja reservado (una sola aparición por pantalla: el botón de avanzar), radio 4px,
  el grano y el relieve de las cards, Oswald para cabezales.
- **El color del club vive en el escudo y en el cabezal de su bloque**, nunca en las
  columnas (`SISTEMA_VISUAL.md`: "el chrome es neutro; el color es dato").
- **Las tres entran en 1440×900 sin scroll de página**: el marco fijo no se negocia.

## Regenerar

Los `.dc.html` y `canvas.json` son la fuente; el `.html` armado está gitignorado
(2.5 MB) y se rearma con el helper de la skill `design`.
