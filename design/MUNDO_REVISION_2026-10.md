# El mundo del juego: revisión y propuesta (octubre 2026)

Pedido de Gabi (19/10): revisar el juego y mejorar "el mundo": humor, parodia, más
equipos, más eventos. Sin parodiar personas reales; clubes con juego de palabras
(del tipo *Deben Nuggets*, *Chucarro Bulls*) sí.

Este documento es la revisión. No toca código. Lo que se decida acá pasa al
roadmap como sesiones concretas.

## Resumen en cinco líneas

1. **El mundo tiene cuerpo pero no cara.** Hay 75 clubes con escudo, colores,
   delegado, DT, plantel y tabla, y ninguno tiene una frase que lo describa. Un
   rival se distingue de otro por el nombre y por cuatro estilos de juego.
2. **El humor ya tiene una voz, y es buena.** Es costumbrista y seco: el detalle
   concreto que delata ("el mecánico es su cuñado", "mandó foto del capó abierto,
   por las dudas"). Vive en las excusas, los momentos del mundo y los sponsors.
   Casi no vive en los nombres ni en las fichas de los clubes.
3. **Los eventos miran para adentro.** De 33 eventos sorteables, 28 son del
   vestuario, la caja o el plantel. El rival de la fecha aparece con nombre en
   dos. La liga, los delegados, los DT rivales y las figuras del mundo no
   aparecen en ninguno.
4. **Los textos del mundo son pocos y se repiten.** Tres frases genéricas de
   previa, tres plantillas de noticias de la fecha, diez nombres de delegado
   para 75 clubes, doce barrios para todos.
5. **Hay un puñado de incoherencias chicas** que rompen la ilusión y se
   arreglan en una tarde (la cancha de "Deportivo La Curva" se llama "Gimnasio
   de Curva"; el mercado nombra ligas que no existen).

## Lo que hay hoy

### Clubes y ligas

| Capa | Cantidad | Dónde | Qué tiene cada uno |
|---|---|---|---|
| Divisionales del mundo | 8 (74 clubes + el nuestro) | `src/data/worldData.ts` | nombre, fuerza, estilo |
| Divisionales del segundo equipo | 2 (14 clubes) | ídem, `EXPANSION_DIVISION_TEAMS` | ídem |
| Identidad derivada del nombre | — | `clubIdentity()` en `src/game/world.ts` | colores (10 pares), fundación, prestigio social, delegado (10 nombres), barrio (12), DT (nombre al azar), carácter del plantel (4), tipo de DT |
| Ficha del rival | — | `src/ui/RivalProfile.tsx` | dificultad, estilo con consejo, tabla, cara a cara, cancha, delegado, DT, plantel |

Los nombres hoy son de tres registros, y el registro ya cuenta algo de la liga:

- **Institucional** (Universitaria A/B/C, mayoría): *Náutico del Cerro*,
  *Círculo Sportivo*, *Defensor del Prado*. Clubes viejos, con sede.
- **De oficina y gremio** (Liga del Centro): *Los Bancarios*, *Escribanía
  Rossi*, *Los Fiscales*, *Turno Noche*. Es la liga con más personalidad por
  nombre.
- **De barrio y comercio** (Comercio, Plaza, Universitaria D): *Ferretería El
  Tornillo*, *Los de Siempre*, *La Esquina del Tanque*, *Los Últimos de
  Filipinas*, *El Resto del Mundo*. Acá ya asoma el humor.

Lo que **no hay**: ni un nombre con juego de palabras sobre el básquet grande
(NBA, Euroliga, la selección). El registro que pide Gabi no existe todavía, y
tiene un lugar natural donde entrar (ver propuesta).

Una sola referencia a un club real: *Peñarol de la Mesa 5* (Liga +35). Es un
chiste de veteranos y funciona, pero es el único nombre registrado del mundo.

### Eventos y momentos

| Sistema | Cantidad | Archivo |
|---|---|---|
| Eventos de la semana (sorteables) | 33 | `src/game/events.ts` |
| Eventos encadenados o forzados | 7 (cena ×2, racha, préstamo, bronca, dos pruebas) | ídem |
| Eventos de pretemporada | 8 | `src/game/preseasonEvents.ts` |
| Momentos del mundo | 6 (Selección, paro, finde largo, recital, Mundialito, temporal) | `src/game/moments.ts` |
| Previa que se pica | 3 frases genéricas + 5 por contexto + la apuesta del delegado | `src/game/banter.ts` |
| Noticias de la fecha | 3 plantillas (batacazo, paliza, figura) | `src/game/leagueLife.ts` |
| Árbitros | 6, con fama y efecto en el partido | ídem |
| Sponsors | 6, con condición y frase | `src/game/sponsors.ts` |
| Amigos en otros cuadros | 4 orígenes, 7 mensajes | `src/game/friendsAbroad.ts` |
| Noticias del verano | 3 plantillas (retiro, pase, ex del club) | `src/game/world.ts` |

De los 33 eventos sorteables, los que tocan el mundo de afuera: la oferta del
almacén, la nota del barrio, la racha que el barrio se entera, el torneo
relámpago, el reclamo al árbitro, la cancha vendida dos veces, el rival que
tienta a tu figura (sin decir cuál rival) y el sobrino del vecino. Ocho. El
resto es plantel, caja y vestuario, que está muy bien, pero es el mismo juego
jueguen contra quien jueguen.

Lo que ya funciona como mundo y conviene copiar:

- **El del almacén** es un personaje recurrente (la racha, la factura de la
  racha). Tiene voz, tiene diario doblado bajo el brazo, se acuerda de lo que
  dijiste. Es el modelo: un NPC con nombre y manía que vuelve.
- **Los momentos del mundo** golpean a los dos equipos y se anuncian antes. Es
  la mejor idea del mundo vivo: la ciudad juega.
- **Los árbitros** con fama que cambia el partido. Seis nombres que el jugador
  aprende a temer.
- **La apuesta del asado** con el delegado rival: el único momento en que un
  club rival te habla como institución.

## Problemas concretos (se arreglan en una sesión corta)

1. **La cancha se nombra con la última palabra del club.**
   `Gimnasio de ${name.split(' ').slice(-1)[0]}` da "Gimnasio de Curva"
   (Deportivo La Curva), "Gimnasio de Vecinal" (Unión Vecinal), "Gimnasio de
   Tornillo", "Gimnasio de Chico" (Malvín Chico) y "Gimnasio de 5" (Peñarol de
   la Mesa 5). Hace falta un nombre de cancha por club, escrito a mano, o una
   regla que respete artículos y apellidos. Es la línea que más se ve en la
   ficha del rival.
2. **Diez delegados para 75 clubes.** En la Divisional B sola hay nueve
   rivales y diez nombres: el Ruso Techera es delegado de dos o tres clubes a
   la vez, y encima "Techera" es el apellido de nuestro escolta y de la
   inmobiliaria sponsor. Pool de 40 como mínimo, con apodo y manía.
3. **El barrio del club no mira el nombre.** *Deportivo Capurro* puede tener
   la cancha en Pocitos y *Unión Sayago* en La Teja, porque el barrio sale del
   hash del nombre. Los clubes con barrio en el nombre tienen que vivir ahí.
4. **El mercado nombra ligas que no existen.** Los fichables vienen de "Liga
   del Oeste", "Liga del Sur", "Liga del Norte", "Liga de Empleados" y
   "Universitario". El mundo tiene seis ligas y ninguna es esa. O existen
   (como ligas lejanas, sólo tabla) o se renombran a las que sí.
5. **"Se mudó de otra provincia."** El juego es de Montevideo: ómnibus,
   championes, Paysandú, Edinson. Uruguay tiene departamentos. Lo mismo
   "remisero" en las profesiones (en Uruguay es taxista o chofer de
   aplicación). Son dos palabras, pero son las que un jugador uruguayo ve.
6. **Los rivales hablan todos igual.** La previa sortea la figura del rival y
   le pone tres frases genéricas. Un club "veterano" y uno "juvenil" tiran el
   mismo "¿este año van a traer banco o siguen jugando seis?".

## Propuesta

### A. Cada club con cara: nombre, cancha, blurb y dos rasgos

La unidad de contenido es **el club**, no la liga. Para los 88 clubes (74 del
mundo + 14 del segundo equipo), escribir a mano:

- **Nombre de la cancha** ("El Galpón de Capurro", "Gimnasio Municipal N° 3",
  "la cancha de atrás de la parroquia").
- **Un blurb de una o dos frases**, en la voz del juego: lo que se sabe de ese
  club en la liga. *"Náutico del Cerro: el único gimnasio de la liga con agua
  caliente, y lo saben. Vienen de traje al sorteo del fixture."* *"Los Últimos
  de Filipinas: once años en la D y ni una queja. Celebran el descenso que no
  pasó como si fuera un título."*
- **Dos rasgos** de una lista cerrada, que se vean en la ficha y que alguna
  mecánica pueda leer después: `cancha_chica`, `tribuna_brava`, `delegado_pesado`,
  `siempre_seis`, `agua_fria`, `planilla_tarde`, `pagan_dt`, `tienen_cantina`,
  `juegan_de_traje`, `vestuario_compartido`… Al principio son texto; en una
  segunda sesión el rasgo `tribuna_brava` suma localía y `siempre_seis` baja
  la convocatoria rival. Es el molde de los árbitros: fama primero, efecto
  después.

Dónde vive: un archivo nuevo `src/data/clubLore.ts` indexado por nombre (la
identidad del club ya viaja con el nombre, no con el id; ver
[`LIGAS.md`](LIGAS.md)). `clubIdentity()` lo lee y la ficha lo muestra. Sin
migración de save: se deriva al mirar.

### B. El registro de humor, liga por liga

Hoy el humor es costumbrista y seco. Lo que pide Gabi (*Deben Nuggets*,
*Chucarro Bulls*) es otro registro: el juego de palabras. Los dos conviven en
la vida real, pero no en cualquier lado: **los nombres de chiste los ponen los
equipos de amigos, no los clubes con sede**. Esa es la regla que propongo:

| Liga | Registro | Ejemplos (a confirmar con Gabi) |
|---|---|---|
| Universitaria A y B | institucional, serio | los de hoy |
| Universitaria C y D | barrio, con alguno de chiste viejo | *Los Últimos de Filipinas* se queda |
| Liga del Centro | oficina y gremio, humor de oficina | *Turno Noche*, *Los Peritos* se quedan; sumar *Recursos Humanos Basket*, *Mesa de Entrada* |
| Liga del Comercio | comercio del barrio | *Ferretería El Tornillo* se queda; sumar *Rotisería Los Pibes*, *Veterinaria Dr. Tapia* |
| Liga de la Plaza | **el juego de palabras entra acá** | *Deben Nuggets*, *Chucarro Bulls*, *Los Lakers de la Teja*, *Toronto Raptores* (todos pibes de 19), *Mala Fe Mavericks*, *Spurs del Cordón*, *Cleveland Caballeros* (juegan de camisa), *Tres Cruces Clippers* |
| Liga +35 | humor de veterano | *Peñarol de la Mesa 5* y *El Resto del Mundo* se quedan; sumar *Los Meniscos*, *Rodilla Izquierda FC*, *Ibuprofeno 600* |
| Liga Montevideo F | barrio joven, memes | *La Teja Basket* se queda; sumar *Equipo Sin Nombre (Provisorio)*, *Los del Grupo de Antes* |

Con eso, **el nombre te dice en qué liga juega el club** sin mirar la tabla, y
el chiste tiene contexto: *Chucarro Bulls* en la A sería raro; en la plaza, un
sábado a las cinco, es exactamente lo que hay.

Sobre Steam: deformar nombres de franquicias es parodia reconocible y el riesgo
es bajo, pero no cero. Regla práctica: el chiste va en el nombre, nunca en el
escudo ni en los colores (nada de un toro rojo ni el violeta y oro). Ningún
nombre de persona real, como pidió Gabi.

### C. Eventos que miran al mundo

Doce eventos nuevos donde el otro lado tiene nombre. Todos usan lo que el
mundo ya sabe (delegado, DT, figura, cancha, barrio, árbitro de la fecha,
rasgos de A). Ordenados por cuánto aportan:

1. **El delegado rival pide cambiar el día.** "Tenemos el gimnasio ocupado el
   lunes, ¿jugamos el miércoles?" Aceptar: te cambia la agenda de la semana
   (el que no puede los miércoles se cae). Negar: la liga te lo anota y el
   delegado se lo acuerda (afecta la apuesta del asado y la previa).
2. **Se les inundó el gimnasio.** El rival pide jugar de local en tu cancha.
   Vos ponés la cancha y cobrás la gorra; ellos juegan "de visitante en casa
   ajena". Lee el rasgo `agua_fria` o el momento `tormenta`.
3. **El DT rival quiere ver entrenar a tu base.** Oferta de pase a mitad de
   temporada con el nombre del club y del DT. Variante de `oferta_rival` que
   hoy dice "un club rival".
4. **La asamblea de la liga.** Una vez por temporada: se vota cambiar el
   horario de la divisional, subir la ficha o sancionar al club que juega con
   seis. Tu voto cuenta uno entre diez, y se ve quién votó qué (los delegados
   que ya conocés).
5. **Un equipo se desafilia a mitad de torneo.** Pasa en las ligas amateur
   todos los años. Te quedás sin rival una fecha (walkover) y la tabla se
   rearma. Sólo en las divisionales de abajo y en la plaza.
6. **El clásico del barrio.** Dos clubes del mismo barrio se cruzan (hoy
   ninguno lo sabe). Previa más caliente, más público, más gorra, el del
   almacén del otro lado.
7. **El árbitro de la fecha es conocido.** Barreto, el protagonista, le silbó
   una técnica a tu capitán hace dos fechas. ¿Lo hablás con el delegado de la
   liga, lo dejás, o le pedís a tu capitán que se calle? Lee `leagueLife`.
8. **La figura rival se quedó sin equipo.** El verano del mundo ya genera
   libres; esto es la versión de mitad de temporada: el que te clavó 28 se
   peleó con su DT y un amigo de afuera te avisa primero.
9. **El sponsor quiere que juegue el hijo.** La inmobiliaria pone plata y el
   hijo del dueño "juega más o menos". Lee el sponsor activo.
10. **La página del barrio arma el ranking de canchas.** La tuya sale última
    por el vestuario. Arreglar cuesta; dejarlo, el rival lo usa en la previa.
11. **El rival te presta un jugador.** Llegás con cinco y el delegado de
    enfrente te ofrece uno de los suyos "para que se juegue". Humor y
    reglamento: la liga lo permite en la plaza, no en la Universitaria.
12. **La cantina rival.** Después del partido de visitante, el tercer tiempo
    en la cantina de ellos: se paga, se charla, se entera uno de cosas
    (scouting gratis o un pase que se está cocinando).

Y **cuatro momentos del mundo** más (hoy son seis): *parciales en la facultad*
(la Universitaria se vacía de pibes), *clásico del fútbol el mismo día*, *corte
de luz en la zona* (se juega con las luces de emergencia o se pasa), *Día de la
Madre* (nadie de más de 30 llega antes de las nueve).

### D. Más voces del mundo

Las piezas que hoy se repiten, con un pool a la altura:

- **Previa que se pica**: de 3 frases genéricas a 25, en cuatro voces según
  el carácter del club rival (juvenil, veterano, estrella, parejo) y leyendo
  los rasgos de A ("Traigan abrigo, en nuestra cancha no hay calefacción. No
  es chiste").
- **Noticias de la fecha**: de 3 plantillas a 12. Sumar: el que jugó con
  seis, el delegado que protestó la planilla, el DT que renunció, el club que
  estrenó camisetas, la figura que se lesionó (y el mundo lo sabe: afecta el
  scouting).
- **Delegados**: de 10 a 40 nombres con apodo y una manía de una línea, que la
  apuesta del asado y la previa puedan usar ("el que siempre pide cambiar el
  horario", "la que trae la planilla en carpeta de tres anillos").
- **Noticias del verano**: de 3 plantillas a 10. Que un pase tenga motivo ("se
  peleó con el DT", "se fue adonde le pagan la ficha", "volvió al club donde
  empezó").
- **Personajes recurrentes del club con nombre**: el del almacén ya existe. El
  tesorero, el canchero y los tres de la comisión aparecen en los eventos sin
  nombre. Darles nombre y una manía cada uno los convierte en mundo.

### E. Más equipos

Los tests y `npm run sim:ligas` calculan el total desde `DIVISION_SEEDS`, así
que agregar equipos no rompe nada mientras cada divisional mantenga sus
lugares. Dos formas de que el mundo sea más grande sin agrandar el save (los
planteles se materializan sólo en las divisionales vecinas):

- **Ligas lejanas que hoy se nombran y no existen**: Liga del Oeste, Liga del
  Sur, Liga de Empleados (arregla el problema 4). Viven como tabla, con
  nombre, escudo y nivel; sus jugadores aparecen en el mercado "viniendo de"
  ahí. Unos 30 clubes más en el mapa a costo cero de save.
- **Una tercera divisional en la Liga del Centro** y **una segunda en la
  Plaza**, para que las ligas de entrada tengan a dónde subir o bajar.

## Qué va primero

Propuesta de orden, por relación esfuerzo/efecto:

1. **Sesión 1, los arreglos (una tarde). Hecha el 19/10, ver el changelog:** canchas con nombre, un delegado único por club,
   barrio coherente con el nombre, ligas del mercado, "departamento" y
   "taxista". Es lo que hoy delata al mundo.
2. **Sesión 2, la cara de los clubes (A + B). Hecha el 19/10, ver el changelog:** `clubLore.ts` con cancha,
   blurb y rasgos para los 88 clubes, con el registro por liga y la tanda de
   nombres de juego de palabras para la Plaza, +35 y Montevideo F. La ficha
   del rival y la del club los muestran. **Esta es la sesión donde más se nota
   el modelo:** 88 blurbs en una voz consistente.
3. **Sesión 3, los eventos (C):** los doce eventos y los cuatro momentos.
   Cada uno con su línea en el fuzz si introduce un patrón de texto nuevo.
4. **Sesión 4, las voces (D):** previa, noticias, verano, personajes del club.
5. **Después, más equipos (E)**, cuando lo de arriba haga que valga la pena
   tener más clubes que conocer.

Lo que decide Gabi antes de la sesión 2: la lista de nombres de juego de
palabras (los de arriba son muestra del registro, no la lista) y si los
rasgos de los clubes tienen efecto mecánico desde el principio o primero son
texto.
