# Canvas de la pretemporada — cómo se muestran las ligas y los fichables

Ocho artboards para decidir **mirando** dos cosas que Gabi señaló en sep 2026 ("no me
gusta el display de cómo aparecen las ligas y los jugadores"), con los **datos reales de
una partida** y los tokens exactos de `src/styles.css`.

No se discute la dirección: papel claro, Oswald, relieve y naranja reservado a la acción
siguen aprobados (Puerta 2 de [ART_PIPELINE.md](../ART_PIPELINE.md)). Lo que se elige acá
es **cómo se ordena la información** en dos listas.

## Página 1 — Elegir liga

> **Decidido y hecho (sep 2026).** Gabi: *"La D quedó bien. Los escudos después los
> inventamos, ahora poné placeholder."* D está implementada en `ui/PreseasonView.tsx` +
> el bloque `.liga-tabla` de `styles.css`, con `LeagueCrest.tsx` como **placeholder
> declarado** (ver abajo). D2 queda archivada: era D con más color y nadie la pidió.

**Ronda 2 (sep 2026).** Gabi: *"quedaron mejor. Creo que la A y la C son muy parecidas. La B
me gusta la diferencia de colores. Capaz se puede hacer algo combinado y luego agregar
logos de esas ligas."* Tenía razón: A y C son las dos una tabla y lo único que cambia es
cuánta prosa sobrevive. De ahí salieron **D** y **D2**, que se llevan la estructura de C y
el color de B, y la hoja de escudos.

| Archivo | Qué es |
| --- | --- |
| `Main.dc.html` | **D · La fila con color y escudo.** La propuesta. La estructura de C —datos en columnas alineadas, para comparar sin leer— más la identidad de B: cada liga con su color como lomo de 6 px y su escudo a 44 px. |
| `LigaD2.dc.html` | **D2 · El día pintado entero.** La misma fila, con el bloque del día pintado del color de la liga, como el cabezal de un afiche. Es D con más color; están al lado para elegir cuánto. |
| `Escudos.dc.html` | **La hoja de escudos**, a 96 / 44 / 18 px. El chico es el que manda: es el que va en la fila de una tabla. |
| `LigaB.dc.html` | **B · La cartelera del club.** Cada liga es un afiche con **el día enorme**. **De acá sale el color.** La de más carácter, la peor para comparar la ficha. |
| `LigaC.dc.html` | **C · La fila comparable.** **De acá sale la estructura.** Una fila por liga con los datos en columna y una sola línea de prosa que conserva la voz. |
| `LigaA.dc.html` | **A · La tabla pura.** La hermana fría de C: filas de 36 px, cero prosa. Archivada. |
| `LigaActual.dc.html` | **Hoy.** Cuatro cards con un párrafo de cinco líneas y 4-6 chips iguales donde `$300` pesa lo mismo que `9 fechas`. Para elegir hay que leer las cuatro y comparar de memoria; los cuatro botones son contornos naranjas idénticos, así que ninguno es *la* acción. |

### Los escudos de liga: dos cosas que hay que saber antes de implementar

1. **`League` no tiene ni colores ni escudo.** En `game/types.ts` sólo tiene `id`, `name`,
   `kind`, `divisionCount` y `rules`. El color que se ve en B, D y D2 **está inventado en
   el mockup**: para que exista hacen falta tres campos nuevos (dos colores y una silueta).
2. **La propuesta es que sean procedurales**, con el mismo generador que ya hace los
   escudos de club (`game/crest.ts` + `ui/Crest.tsx`), pero con su propio juego de siluetas
   para que un escudo de liga no se confunda con el de un club. Es la regla del sistema
   —"lo que escala con los datos es procedural"— y el roadmap quiere ligas que aparezcan y
   desaparezcan según el año: así sumar una liga es sumar una fila de datos, no encargar un
   dibujo.

Los colores del mockup (azul institucional para la Universitaria, grafito y dorado para la
nocturna del Centro, verde para el Comercio, ladrillo para la Plaza, pizarra para
Montevideo, violeta para la +35) están elegidos **lejos del naranja de acción** a propósito.

### Cómo quedó implementado

1. **`League` ahora sí tiene identidad.** `abbr` y `colors: { base, alt }` en
   `game/types.ts`, cargados para las seis ligas en `data/worldData.ts` con los colores de
   arriba. `abbr` se **declara** y no se deriva del nombre: "Liga del Centro" y "Liga del
   Comercio" colapsarían las dos en "LC".
2. **`ui/LeagueCrest.tsx` es el placeholder**, y lo dice en su propio encabezado. Dibuja
   silueta + color + iniciales, con cinco siluetas a propósito distintas de las de club.
   Se reemplaza sin tocar ninguna pantalla: la firma `<LeagueCrest league={l} size={44} />`
   no cambia cuando el escudo de verdad exista. **El generador procedural de la propuesta 2
   sigue sin aprobar** — es lo que hay que decidir cuando toque Puerta 3.
3. **Dos trampas que aparecieron al implementar**, por si vuelven:
   - `state.world.leagues` **está vacío durante la pretemporada** (`world.ts` lo llena
     recién al construir el mundo de la temporada), así que la fila lee de `LEAGUES` de
     `data/worldData.ts`. Además la celda del escudo se dibuja siempre, aunque la liga no
     aparezca: en una grilla de diez columnas, un hijo que falta corre todo lo demás una
     columna y la fila se rompe entera sin avisar.
   - En el piso de diseño (1280x720) las ligas no entraban y se veían tres. Elegir liga es
     comparar, y una comparación que hay que scrollear no es una comparación: hay una
     media query **por alto** (`max-height: 800px`) que apaga la frase y la bajada. Se
     dispara por alto y no por ancho porque en un 1920x800 pasa exactamente lo mismo.

## Página 2 — Los fichables

**Ronda 2 (sep 2026).** Gabi: *"la opción A y la opción C me gustan. Me gustaría que
inventes una nueva opción D que vaya más con la experiencia del juego."* De ahí sale **D**.

**Ronda 3 (sep 2026).** Gabi: *"opción D me gustó. Quiero algo entre la A y la D. Lo que
tiene es que agregar algún filtro de grado de conocimiento; qué días de partido puede —
porque si puede los lunes y te anotás en otra liga que juega los jueves y no puede los
jueves, no tiene sentido ese dato (al menos en un principio): tendría que decir 'no puedo X
día'. Después también si paga o no paga."* De ahí sale **E**, que es la propuesta.

| Archivo | Qué es |
| --- | --- |
| `MercadoE.dc.html` | **E · La libreta, en planilla.** La propuesta. Ver abajo. |
| `MercadoD.dc.html` | **D · La libreta del delegado.** De acá sale la cabeza de E. |
| `MercadoA.dc.html` | **A · La planilla del ojeador.** De acá sale el cuerpo de E. |
| `MercadoC.dc.html` | **C · Lista y ficha grande.** Te gustó en la ronda 2. |
| `MercadoActual.dc.html` | **Hoy.** El nivel aparece de tres formas en la misma fila (`71–85`, `≈69`, `★★★★☆`), las cards quedan de alturas desparejas según cuántos chips le toquen a cada uno, `Exigencias: ? (contactalo)` se repite dieciséis veces y hay dieciséis botones a ancho completo. Entran 5 de 16. |
| `MercadoB.dc.html` | **B · La ficha de altura fija.** Grilla de cards que **todas miden 196 px**, así que la escalera desaparece. No la eligió. Archivada. |

### E · La libreta, en planilla — la propuesta

De **D** se queda la cabeza (los grupos por cómo llegó el nombre, la referencia con cara,
las llamadas como fichas que se gastan, la presión de "faltan 4"). De **A** se queda el
cuerpo: **una planilla a todo el ancho**, sin segunda columna fija. La ficha grande no se
pierde — **se abre en la fila**. A 1080p entran 10 de 16 con una ficha abierta; hoy entran 5.

Los tres pedidos de la ronda 3:

1. **Filtro por cuánto sabés**, arriba, con **las mismas tres palabras que los grupos** de la
   planilla: *Los viste jugar / Te los pasaron / De oídas*. Filtrar y leer son la misma
   operación, así que el filtro no agrega vocabulario. Al lado sigue el de puesto, que ya existe.

2. **"No puede" en vez de "¿puede los lunes?"** — la observación de Gabi es un error de diseño
   de D, no un detalle. La columna dice el día que el jugador tiene tomado **sin cruzarlo con
   ninguna liga**: sirve antes de elegir dónde jugás, que es cuando mirás esta pantalla. Al
   firmar, el día que choque con el partido se pone rojo: **el cruce pasa a ser un resaltado
   encima del dato, no el dato**.
   El dato ya existe (`agenda.blockedDays`) y es **raro a propósito**: `genAvailability()` da
   un día bloqueado al **20%**, y como mucho uno (`rng.chance(0.2) ? [rng.pick(...)] : []`).
   Por eso merece columna: casi todos muestran "—" y los pocos que no saltan solos.

3. **Cuota: paga / media / no paga.** También existe (`feeAttitude`) y también es raro: de los
   32 del pool de `data/market.ts`, sólo **4 no piensan pagar** — y son los caros. Marcos
   Brítez es el caso: ≈76, el mejor del mercado, $130 de pase **y** no paga cuota.

La regla de las dos columnas nuevas es la misma y ya está en el juego (`playerFeeLabel()`, que
devuelve `null` para la cuota normal): **lo normal se calla, la excepción grita.**

**Ojo con los "?":** `agendaKnown()` es `contacted || muy_conocido`, y la cuota se sabe si
además es `conocido`. Las dos columnas arrancan medio llenas de `?` — y está bien: *es* la
razón de gastar una llamada.

**En contra:** nueve columnas es mucho; abajo de 1400 px hay que empezar a tirar (físico
primero, después el sello). Y agrupar por conocimiento sigue impidiendo ordenar por nivel de
punta a punta.

### Un problema que no es de esta pantalla (medido, sep 2026)

El mercado de hoy, con las 16 cards:

| Resolución | Cuerpo visible | Contenido | Cards enteras |
| --- | --- | --- | --- |
| 1920×1080 | 702 px | 1468 px | **5 de 16** |
| 1280×720 | **320 px** | 1875 px | **0 de 16** |

La `.pretemporada-cabecera` (panel de estado + las tres pestañas) se come **225 px de 545** en
el piso de diseño. Elijamos la maqueta que elijamos, **eso hay que arreglarlo aparte** — con
la misma media query por alto que ya se usó en la tabla de ligas.

### D · La libreta del delegado

A y C contestan bien *"cómo acomodo dieciséis jugadores en pantalla"*. Pero en la
pretemporada el jugador no elige entre dieciséis: tiene **tres gestiones y cuatro semanas**,
y la pregunta real es **"¿a quién llamo esta semana?"**. Ni A ni C la hacen. D sí, con cuatro
cambios que salen del juego y no del layout:

1. **Los nombres se agrupan por cómo llegaron a la libreta**, no por nivel: *Los que ya
   viste jugar* / *Te los pasó alguien del club* / *De oídas*. Ese sistema **ya existe en el
   código** (`knowledgeSource` en `MarketPlayer`), pero hoy es una línea de texto perdida al
   final de cada card. Acá es la estructura de la pantalla, y el gradiente de conocimiento se
   lee de un vistazo en vez de repetirse dieciséis veces como chip.
2. **La columna que decide es "¿puede los lunes?"**, no el nivel. `agendaFit()` ya cruza la
   agenda contra el día de partido de la liga elegida, y hoy es un chip más entre seis. En un
   club amateur el mejor jugador que no puede el día del partido vale cero. Ojo con el detalle
   de mecánica: `agendaKnown()` es `contacted || muy_conocido`, así que esa columna arranca
   casi toda en `?` — **es la razón de gastar la llamada**, y por eso merece columna propia.
3. **Las tres gestiones son fichas que se gastan**, y al lado la presión que hoy no está en
   ninguna pantalla: *faltan 4 para poder inscribirte, quedan 3 semanas*.
4. **La referencia tiene cara y es interesada.** Quien pasó el nombre aparece con su retrato
   y su frase, y abajo la letra chica: *"te lo trajo él: va a hablar bien igual"*. Es la
   regla 2 de [B. El compromiso deja de ser un número](../DIAGNOSTICO_2026-09.md) hecha
   pantalla: al fichar no ves conducta, ves lo que dice quien lo trajo.

La ficha de la derecha es la de C con un bloque más — **"En su puesto tenés"** —: un `71–85`
solo no dice nada; contra tu único escolta de `≈62` dice todo.

**En contra:** es la más lejos de lo que hay hoy, y agrupar por conocimiento significa que
**no se puede ordenar por nivel de punta a punta** (el orden vive dentro de cada grupo).

`canvas.json` define las dos páginas, dónde se apoya cada artboard, sus títulos y las notas
con el a favor y el en contra de cada tratamiento.

## Los retratos

Son los de `public/arte/` (`p-*.webp`), los mismos que usa el juego: el canvas los lleva
embebidos y **no se copian a esta carpeta**. Se repiten a propósito entre fichables — son
ocho retratos para dieciséis nombres, que es el problema abierto de la Puerta 3.

## Volver a armarlo

El `.html` empaquetado (el editor de Claude Design más el contenido) **no se versiona**:
está en `.gitignore` y se regenera desde estos archivos con la skill `design` de Claude
Code, pasando los once `--artboard`, los seis `--image` de `../../public/arte/` y
`--canvas canvas.json`.

Publicado el 2026-09-05:
<https://claude.ai/code/artifact/06cfc3a0-29ff-4897-baff-8e2766f21fe9>

Si Gabi lo editó en el canvas, la versión buena es la del Artifact: antes de tocar nada
acá, hay que extraerla de vuelta (`--extract`) y no pisarla.
