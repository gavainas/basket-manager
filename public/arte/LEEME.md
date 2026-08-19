# Arte de escena

Ilustraciones generadas con Higgsfield (nano_banana_pro) usando `public/portada.webp`
como referencia de estilo, para que todo el juego se vea de la misma familia: 2D de
película animada, paleta cálida saturada, cuerpos variados, club de barrio.

**Estado: arte provisional, no aprobado** (ver `design/ART_PIPELINE.md`). Son propuestas.
Se reemplazan pisando el archivo, sin tocar código.

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

## Retratos de arquetipo (1:1, 640 px)

**Todavía no los usa el juego.** Los retratos del plantel siguen siendo los SVG
procedurales (`design/AVATAR_SYSTEM.md`), que dan una cara distinta para cada jugador sin
límite. Estas seis son la lámina de prueba de la puerta de personajes: sirven para decidir
si la ficha pasa a ilustración, y en ese caso hay que producir el set completo y resolver
cómo se asigna una cara a cada jugador.

| Archivo | Arquetipo (`Personality`) |
| --- | --- |
| `p-veterano.webp` | `veterano` |
| `p-talentoso.webp` | `talentoso_informal` |
| `p-social.webp` | `social` |
| `p-cumplidor.webp` | `cumplidor` |
| `p-competitivo.webp` | `competitivo` |
| `p-protagonista.webp` | `protagonista` |

Faltan `leal` y `mercenario`.
