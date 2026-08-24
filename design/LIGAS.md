# Ligas, divisionales y ascensos

Cómo está armado el mundo competitivo del juego: dónde juega el club, qué
otras puertas tiene y cómo se sube y se baja de categoría.

Código: [`src/data/worldData.ts`](../src/data/worldData.ts) (los datos),
[`src/game/pyramid.ts`](../src/game/pyramid.ts) (la pirámide y los movimientos),
[`src/game/world.ts`](../src/game/world.ts) (cómo se materializa el mundo).
Harness: `npm run sim:ligas`.

## La idea

Un club de barrio no vive en una liga: vive en una **oferta**. Todos los
veranos aparece la misma pregunta —¿dónde nos anotamos este año?— y la
respuesta cambia el año entero: qué día se juega (y por lo tanto quién puede
venir), cuánto sale la ficha, contra quién se juega, y si lo que se hace en la
cancha tiene consecuencia de categoría o no.

Sobre eso se apoya el otro eje: **la categoría es una posición en una
pirámide**, no una etiqueta. Se sube y se baja todos los años, con o sin vos.

## El mundo: 8 divisionales, 75 equipos

| Liga | Divisionales | Día | Ficha | ¿Fía? | ¿Ascensos? | Nivel |
|---|---|---|---|---|---|---|
| **Liga Universitaria** | A · B · C · D | lunes a miércoles | $300 | sí (te conocen) | **sí** | 24-85 según categoría |
| **Liga del Centro** | Primera · Segunda | martes y miércoles, 21:30/23:00 | $450 | no, contado | **sí** | 62-90 |
| **Liga del Comercio** | Única (8 equipos) | domingo 10:00/11:30 | $180 | no, contado | no | 38-58 |
| **Liga de la Plaza** | Única | sábado 17:00/19:00 | gratis | — | no | 28-48 |
| Liga Montevideo · Liga +35 | Única cada una | viernes / jueves | — | — | no | segundo equipo (etapa 6) |

El club arranca en la **Divisional B** de la Universitaria: una categoría
arriba para pelear y dos abajo para tenerles miedo.

Las divisionales rondan los **10 lugares** (8 el Comercio) y uno de ellos puede
ser el del club. Cuando el club se va a otra liga, la liga con categorías **le
guarda el lugar**: esa divisional juega el año con un equipo menos y la puerta
sigue abierta — pero sus rivales siguen subiendo y bajando sin vos, así que la
categoría que te espera puede no ser la que dejaste. Lo que no se mueve nunca
es el total: 74 equipos del mundo más el club, temporada tras temporada.

## Ascensos y descensos

La misma regla para toda liga con categorías, la juegue el club o no:

- **Suben** los 2 finalistas de la Copa de Oro de la divisional de **abajo**.
- **Bajan** los 2 últimos de la tabla regular de la divisional de **arriba**.
- Se resuelve de a **pares de divisionales vecinas**, así cada una termina con
  la misma cantidad de equipos con la que empezó: dos se van, dos llegan.

En la divisional del club, las copas se juegan de verdad (playoffs reales) y
la tabla es la real. En las demás, la tabla se simula de forma determinista
(`divisionStandings`) y las semifinales de su Copa de Oro también: el mundo
sigue jugando aunque nadie lo mire.

Al equipo que se mueve se le corrige el nivel (+2 si sube, -2 si baja, más
deriva) y se lo encaja en la **banda de nivel de su nueva categoría**. Por eso
la A sigue siendo la A diez temporadas después y la D sigue siendo la D: los
equipos se mueven, las categorías no se licúan.

El jugador se entera **tres veces**: en la pantalla de fin de temporada
(`userSeasonFate` canta ascenso o descenso apenas terminan las copas), en las
noticias del verano (quién subió, quién bajó y quién va a ser rival nuestro), y
en la historia del club.

## La identidad viaja con el nombre, no con el id

Los ids (`r3`, `luc7`, `ce2_1`) son **slots de divisional** y se reasignan cada
vez que un equipo se mueve. Lo que no cambia nunca es el **nombre**: de ahí
salen los colores, el escudo, la fundación, el delegado, el DT y el plantel
(`clubIdentity()` y `rosterForClub()` en `world.ts`, Sprint 5). Un equipo que
asciende llega con su gente, su cancha y su historia.

Corolario: **dos clubes no pueden llamarse igual**. Antes la plaza reusaba dos
nombres de la Divisional B, algo inofensivo cuando las dos divisionales nunca
coexistían en el mundo; ahora coexisten todas, y compartir nombre sería
compartir plantel. El harness lo verifica en cada temporada simulada.

## Planteles: solo donde importan

El mundo tiene 75 equipos, pero **generar 900 personas mataría el save**
(LocalStorage, `JSON.stringify` por guardado, `structuredClone` por acción).
Regla: se materializan los planteles de la divisional del club y de sus
**vecinas de categoría** (una arriba, una abajo, en su misma liga) —
`rosterDivisionIds()`. Son las que se pueden scoutear y entre las que se mueven
los ascensos. Las lejanas viven como tabla: nombre, escudo, nivel. Sus
planteles aparecen cuando el club se les acerca, y la ficha lo dice
("juegan demasiado lejos de nuestra categoría").

Con esa regla, un save de la semana 4 pasó de **201 KB a 308 KB** (228 → 348
personas, 20 → 75 clubes): +53% contra los ~5 MB de LocalStorage, 16 veces de
margen. Sin la regla serían ~900 personas y el save arrancaría en 700 KB.

La vida del resto del mundo corre con **su propia tirada de azar**
(`worldRng`): agregar una divisional no puede correr el azar de la temporada
del usuario. Sin eso, sumar equipos al mundo cambiaría la convocatoria del
primer partido.

## El largo del torneo lo pone la liga

`seasonLength = rivals.length`. Nueve rivales, nueve fechas; el Comercio son
siete. De ahí para abajo todo se acomoda solo: el fixture (`scheduleFor`
mantiene la curva "arranca accesible, termina bravo"), la tabla, los playoffs
(1°-4° Copa de Oro, 5°-8° Copa de Plata: el Comercio tiene 8 equipos, justo),
y los objetivos de la comisión — que ahora se recortan al torneo, porque pedir
8 victorias en 7 fechas sería un objetivo imposible de fábrica.

## El calendario de la semana

Cada divisional tiene su día y sus dos horarios; el club juega en el día de la
divisional donde está inscripto.

| Liga | Divisional | Día | Horarios |
|---|---|---|---|
| Universitaria | A | martes | 20:00 / 22:00 |
| Universitaria | **B** (arranque) | **lunes** | 20:00 / 22:00 |
| Universitaria | C | miércoles | 20:00 / 22:00 |
| Universitaria | D | martes | 21:00 / 22:45 |
| Centro | Primera | miércoles | 21:30 / 23:00 |
| Centro | Segunda | martes | 21:30 / 23:00 |
| Comercio | Única | domingo | 10:00 / 11:30 |
| Plaza | Única | sábado | 17:00 / 19:00 |
| Montevideo (2º equipo) | F | viernes | 20:00 / 22:00 |
| +35 (2º equipo) | C | jueves | 20:30 / 22:15 |

**Un jugador, una ficha por LIGA** — la divisional no habilita otra
(`registerPlayer`: la clave es `playerId + leagueId + seasonId`). Jugar en la A
de la Universitaria te deja jugar en la Segunda del Centro, pero **no** en la C
de la Universitaria.

Por eso hoy **no hay choques de días posibles**: el equipo principal juega en
una sola liga a la vez (lunes a miércoles, o el finde), y el segundo equipo
solo puede anotarse en Montevideo (viernes) o +35 (jueves) — las dos ligas que
abren cupo, y que nunca son la del principal. Los días están elegidos para que
las dos agendas no se toquen, y la oferta de inscripción no ofrece la liga
donde el club ya tiene su segundo equipo (si lo hiciera, los dos equipos se
pelearían por las mismas fichas y ninguno podría inscribir a nadie).

Los choques que **van a existir** cuando llegue la etapa 7 (doble partido y
fatiga) ya están dibujados a propósito:

- **martes**: Universitaria A (20:00 / 22:00) contra Centro Segunda (21:30 /
  23:00) — y la D de la Universitaria en el medio (21:00 / 22:45).
- **miércoles**: Universitaria C (20:00 / 22:00) contra Centro Primera (21:30 /
  23:00).

Los horarios están escalonados a propósito: 20:00 y 23:00 el mismo martes es
exactamente el doble partido de la vida real — llegar al segundo con las
piernas de otro. Lo que falta para que eso pase es que un mismo jugador pueda
tener ficha en las dos ligas y que el cansancio cruce entre ellas.

Los `altDays` de cada divisional (reprogramaciones) hoy son decorativos: se
muestran en la ficha de la liga, pero ningún partido se reprograma todavía
(etapa 8).

## Qué se paga y qué se cobra

- **Fiado solo donde te conocen**: tu liga actual y la que te guarda el lugar
  te fían la ficha (deuda que se paga en cuotas durante la temporada). Las
  ligas nuevas cobran contado: si no está la plata, no te anotás.
- **Antecedentes**: la Liga del Centro pide 45 de prestigio deportivo. Con 40
  (el arranque) la opción se ve, dice qué falta, y no se puede elegir. Es el
  primer uso del prestigio como llave.
- **Premio en plata**: el Comercio reparte $400 al campeón, $200 al finalista y
  $100 al que gane la Copa de Plata. Compensa las dos fechas de cuotas que no
  se cobran y le da sentido a un torneo sin ascensos.
- **Prestigio al anotarse**: el Centro suma +4 deportivo (jugar ahí se nota en
  el cartel), el Comercio +2 social (te ven en el barrio), la plaza resta 6
  deportivo y después se derrite semana a semana.

## El finde el laburo no manda

Las agendas del plantel ("solo llega a los partidos de 22:00") valen para los
partidos **entre semana**. Un torneo de sábado a la tarde o domingo de mañana
no le pisa el turno a nadie: `timeMattersOn()` apaga esa penalización el fin de
semana, en las dos capas (plantel propio y planteles del mundo). Es lo que
hace que la plaza y el Comercio sean, de verdad, las ligas donde vienen todos.

## Verificación

`npm run sim:ligas` juega carreras completas (temporadas seguidas con playoffs
y pretemporada) y audita, en cada una:

- que el mundo conserve sus 75 equipos y ninguna divisional pierda o gane
  lugares;
- que no haya nombres repetidos ni personas duplicadas;
- que rivales, fechas, fixture y tabla cierren entre sí;
- que cambiar de liga deje todo consistente (incluidos los lugares guardados).

La caja se rellena a propósito entre temporadas: ese harness mide la pirámide,
no la economía (eso es `npm run sim`).
