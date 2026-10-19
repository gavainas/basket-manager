# Arte de escena

Ilustraciones generadas con Higgsfield (nano_banana_pro) usando `public/portada.webp`
como referencia de estilo, para que todo el juego se vea de la misma familia: 2D de
película animada, paleta cálida saturada, cuerpos variados, club de barrio.

**Estado: APROBADO como dirección (ago 2026, Puertas 1-2 de `design/ART_PIPELINE.md`).**
Los retratos `p-*.webp` son la foto oficial del jugador en todo el juego (los renderiza
`src/ui/Avatar.tsx` cuando conoce la personalidad). Se reemplazan pisando el archivo,
sin tocar código.

## Cabeceras (16:9, 1600 px de ancho)

Las usa `<Cabecera art="…" />` (`src/ui/Cabecera.tsx`) como banda arriba de una card. Van
de fondo, recortadas con `cover`: si el archivo falta, queda una franja del color de la
sección y la pantalla sigue entera.

| Archivo | Dónde | Qué muestra |
| --- | --- | --- |
| `cab-vestuario.webp` | Plantilla → El vestuario por dentro | El vestuario quince minutos antes del partido |
| `cab-bar.webp` | Pretemporada → Mercado de fichajes | Convenciendo a un jugador en la mesa de un bar |

El encuadre lo decide `.cabecera-arte` en `src/styles.css` (`background-position: center
34%`): la banda muestra una franja, así que al cambiar una ilustración hay que mirar que
las caras no queden cortadas.

## Fondo de pantalla (16:9, 1920 px)

El lienzo de todas las pantallas del juego (no el del menú, que usa `portada.webp`). Va en
un `div` fijo detrás de todo — `.fondo-app` en `src/styles.css` — con un velo oscuro
encima: sin el velo, los paneles claros flotan sobre un piso del mismo valor.

| Archivo | Qué es |
| --- | --- |
| `fondo-cancha.webp` | **En uso.** El parqué gastado visto desde arriba: parejo, sin foco, no compite |
| `fondo-gimnasio.webp` | Alternativa: la cancha desde la tribuna al atardecer. Más carácter, más detalle |

Cada pantalla elige su escena en `ESCENA` / `escenaDe()` de `src/App.tsx`.

### Tanda oct 2026 (Higgsfield, 1360 px, estilo atardecer cálido)

Subidas por Gabi el 19/10/2026. Reemplazan como escena a `fondo-cancha.webp`,
`cab-partido.webp` y `cab-arbitros.webp`, que quedan en el repo sin uso de fondo.

| Archivo | Dónde | Qué muestra |
| --- | --- | --- |
| `fondo-gimnasio-vacio.webp` | Semana → armar el quinteto | El gimnasio vacío desde arriba, banderines y tribunas de madera |
| `fondo-hinchada.webp` | Semana → partido en vivo | La hinchada en la tribuna techada, con un jugador en primer plano |
| `fondo-tribuna-festejo.webp` | Semana → resultado, si se ganó | La tribuna al aire libre al atardecer, festejando |
| `fondo-arbitro.webp` | Liga, Agenda, Rankings | Un hincha discutiéndole al árbitro desde la tribuna |
| `fondo-oficina.webp` | Finanzas, Historia | La oficina del club: escritorio, pizarra táctica, camisetas y trofeos |
| `fondo-fachada.webp` | Club | La fachada del club al atardecer, con la puerta abierta al gimnasio |

`cab-comision.webp` sigue de fondo en el cierre de temporada y en el fin de la partida.

## Retratos de arquetipo (1:1, 512 px, **sin fondo**)

Uno por personalidad del juego, recortados con alfa: el fondo azul lo pone la caja
(`.retrato` en `src/styles.css`), no la ilustración. Cambiar ese azul —o pasarlo al color
del club— es tocar una línea de CSS.

Los usa `<Retrato personality={…} />` (`src/ui/Retrato.tsx`) en **la tira del plantel del
inicio**. El resto del juego —ficha, plantilla, vestuario, convocatoria— sigue con los
retratos SVG procedurales (`design/AVATAR_SYSTEM.md`), que dan una cara distinta por
jugador sin límite.

| Archivo | Arquetipo (`Personality`) |
| --- | --- |
| `p-veterano.webp` | `veterano` |
| `p-talentoso.webp` | `talentoso_informal` |
| `p-social.webp` | `social` |
| `p-cumplidor.webp` | `cumplidor` |
| `p-competitivo.webp` | `competitivo` |
| `p-protagonista.webp` | `protagonista` |
| `p-leal.webp` | `leal` |
| `p-mercenario.webp` | `mercenario` |

**Ocho caras para catorce jugadores**: dos del mismo arquetipo comparten retrato. Se
disimula con `variante` (espeja la ilustración y cambia el tono del azul), que es un
parche, no una solución. La solución es un set con varias caras por arquetipo asignadas
por seed — y ahí conviene revisar si el retrato tiene que salir de la personalidad o de la
apariencia persistida del jugador, que ya existe y ya define edad, pelo y barba.

## Cómo se hicieron

Generadas con `nano_banana_pro` pasando `portada.webp` como `image_references`, recortadas
con el quitafondos del mismo servicio y reencodeadas a WebP. Los PNG de 2k no están en el
repo. Si hay que rehacer una, lo que mantiene la familia es la referencia: sin ella el
estilo se va.
