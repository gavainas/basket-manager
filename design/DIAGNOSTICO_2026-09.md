# Diagnóstico y plan de acción — septiembre 2026

Sale de **jugar una partida entera** (pretemporada de 4 semanas, inscripción, fecha 1 con
partido e informe) más una revisión del código, los documentos y el harness de balance.
Todo lo que dice "medido" acá está medido, no opinado.

Responde a tres pedidos de Gabi:

1. "Sigo medio entreverado algunas cosas."
2. "Empezar sin jugadores y tener que fichar amigos" + "el compromiso debería estar oculto
   y descubrirse a medida que los jugadores van o no van al partido".
3. "El arte lo noto muy prototipo y no le encontramos la vuelta al proceso."

---

## 1. Status: dónde está el juego

### Lo que está sólido y no hay que tocar

- **El menú de inicio y las cabeceras ilustradas.** La portada del asado, el vestuario y el
  bar del fichaje tienen carácter propio. Eso ya es el juego.
- **La elección de liga.** Cuatro opciones comparables por día, ficha, nivel, fechas,
  ascensos y premio, con el veredicto de agenda del plantel. Es la mejor pantalla del juego:
  una decisión real, con toda la información al lado.
- **El informe del partido.** Planilla, relato por cuarto, claves del resultado,
  consecuencias y "cómo quedó cada uno" con voz por arquetipo. Se lee como una crónica.
- **El Hub como navegación.** Entrar al menú es leer el aviso; los tiles llevan a lo que
  prometen.
- **La liga viva.** Árbitro con nombre y fama, tabla, fixture, pirámide de 4 divisionales
  navegable, planteles rivales scouteados.
- **El motor.** `npm run build` limpio, `npm run sim` corre y los números están en objetivo
  (49.6% / 43.6% / 51.8% de victorias por estrategia, 0 forfeits).

El juego **no** está flojo de contenido. Está flojo de **coherencia, de foco y de acabado**.

### Lo que está flojo, con evidencia

**1. La pretemporada se puede ganar sin jugarla.**
Avancé las 4 semanas apretando "Semana siguiente" sin contactar a un solo fichable.
Terminé con **11 jugadores**, todas las posiciones cubiertas, las cuotas cubriendo los
gastos y el veredicto de cierre diciendo *"✓ El quinteto de arriba tiene nivel para pelear
la liga"*. Los eventos regalaron tres jugadores gratis ("uno trae a otro", "vienen juntos o
no viene ninguno", "un viejo conocido quiere volver"). Mientras tanto el mercado —que es el
juego de la pretemporada— se vaciaba solo: **16 → 13 fichables** por "arregló con otro
club", sin que yo hiciera nada. Con 3 gestiones por semana contra 16 fichables, la presión
no empuja a decidir: empuja a mirar.

**2. Juegan cinco y el resto mira.**
Partido 1: cinco jugadores con **40'**, el banco entero con **0'**. Consecuencia inmediata
en el informe de la fecha 1: dos jugadores *"masticando bronca por sus minutos"*. En la
simulación de 60 temporadas por estrategia, **el 100% de las broncas registradas son de
'minutos'** (162 en mixta, 98 en zona, 12 en presión). El sistema social entero —que tiene
cinco causas: minutos, promesa, plata, trato, grupo— colapsa a una sola palanca, y esa
palanca la mueve un default que el jugador nunca eligió.

**3. Cuatro respuestas distintas a "¿cuántos somos?".**
En la misma partida, en la misma semana: la barra de recursos dice **12/13 jugadores**, la
pantalla El club dice **Jugadores activos: 8**, la Plantilla lista **8 filas** más un
"SE FUERON DEL CLUB: 4", y la convocatoria dice **"✓ Vinieron todos"** con **9 nombres**.
Esto es, literalmente, el "estoy entreverado".

**4. La planilla tiene cuatro números sin encabezado.**
`RosterList.tsx:110-113` pinta físico, motivación, compromiso y social como cuatro cifras
seguidas. No hay fila de títulos. Hay que adivinar cuál es cuál.

**5. Lo pegajoso tapa lo importante.**
En la pantalla de partido el marcador sticky corta a la mitad las filas de "En cancha" y
"Banco" (ver `shots/14-cuarto4`). La barra de recursos fija tapa el pie de casi todas las
pantallas: en el Quinteto, la pizarra táctica queda medio escondida abajo.

**6. La barra de recursos miente.**
Con el partido terminado 66-53 seguía diciendo **RÉCORD 0-0** y *"Dirigí el partido cuarto
a cuarto"*. Y el Hub muestra **POSICIÓN 1°** antes de jugar una sola fecha.

**7. Ocho caras para el mundo entero.**
`public/arte/` tiene 8 retratos de arquetipo. En el Hub a 1920 px hay **12 jugadores con
~7 caras**, con dos pares idénticos uno al lado del otro. En el mercado, cuatro fichables
seguidos con la misma cara. Esto es lo que se lee como "prototipo", más que la paleta o los
paneles.

**8. A 1920×1080 sobra un tercio de pantalla.**
`--ancho-app: 1360px` y **todas** las media queries del CSS son `max-width` (mobile-down).
Para un juego que apunta a Steam, en un monitor normal se ve como una web centrada con
madera a los costados.

**9. Nada se mueve.**
10 apariciones de `transition` / `@keyframes` / `animation` en **3.800 líneas** de CSS. Los
cambios de pantalla son cortes secos. No hay `prefers-reduced-motion`.

**10. 28.000 líneas sin una sola prueba.**
No hay `npm test`, no hay ESLint, no hay CI de calidad. Las "suites de 26 / 27 chequeos"
que menciona el ROADMAP fueron scripts descartables: no quedaron en el repo, así que no
protegen nada. `WeekView.tsx` tiene 1.873 líneas, `match.ts` 1.733, `events.ts` 1.337. El
bundle sale en un solo chunk de 682 kB.

**11. `ART_PIPELINE.md` se contradice consigo mismo.**
Arriba: *"Puertas 1 y 2: CERRADAS. La dirección elegida es la que ya está en producción."*
Abajo, en "Estado de aprobación actual": *"El estilo general actual de la interfaz no está
aprobado como dirección final"* y *"el juego publicado sigue con el tema oscuro azul"* —
que además es falso hace meses. **El documento que gobierna el arte tiene dos verdades.**
Eso, y no la falta de talento, es "el proceso desordenado".

**12. El ROADMAP es un changelog de 40 KB.**
Una sola entrada de "hecho" mide 3.000 caracteres. Sirve para recordar qué pasó, no para
decidir qué sigue. Falta la página que diga las próximas cinco cosas.

**13. La economía quiebra sola.**
En 60 temporadas simuladas sin acciones del manager hay **5 a 9 GameOvers por caja** según
la estrategia (8-15%). La rifa y el sponsor son botones, no arcos.

---

## 2. Los tres pedidos, convertidos en diseño

### A. Empezar sin plantel: el club como red de contactos

Hoy la partida arranca con doce jugadores puestos y una pretemporada que se puede saltear.
La fantasía que pide Gabi es la contraria: **no tenés equipo, tenés amigos.**

La pieza que falta no es "un mercado más chico". Es cambiar **el catálogo por la agenda**:

- Semana 0: sos vos, una pelota y una libreta con **6 a 8 contactos reales** — el del
  laburo, el primo, el que jugaba con vos antes de la rodilla, el pibe del edificio. Cada
  uno con un *por qué vendría* y un *qué te va a pedir*. Nada de "nivel 69".
- Fichar es **pedir un favor**, no pagar un pase. El primer sí es el fácil (tu íntimo). El
  segundo ya pregunta *"¿quién más va?"*. De ahí en más el club se vende solo o no se vende.
- **Bola de nieve**: cada firmado abre 1 a 3 contactos suyos. El plantel se arma por red
  social, no por lista ordenable. Ahí el asado de la primera semana pasa a ser reclutamiento.
- La restricción es real y dura: **necesitás 8 para inscribirte y tenés 4 semanas.** Con 7
  no hay temporada. Hoy esa amenaza no existe porque los eventos regalan gente.
- El catálogo de 16 fichables **no desaparece: se gana**. Aparece en la temporada 2, cuando
  el club ya tiene cartel y hay gente que no conocés que quiere venir. Eso también le da
  sentido a la progresión de prestigio, que hoy casi no se siente.

El modo actual ("club en marcha") queda como opción. Y la intro que Gabi ya escribió en el
ROADMAP —te comés los cruzados, quedás afuera, armás tu club— es el marco natural.

**Arreglo aparte, aplicable ya:** aunque el modo nuevo tarde, los eventos que regalan
jugadores deberían dispararse **solo si te falta gente**, y el mercado no debería vaciarse
solo mientras el jugador no hace nada. Hoy castiga mirar y premia esperar.

### B. El compromiso deja de ser un número y pasa a ser una reputación

Hoy `commitment` se muestra crudo en cinco lugares (`RosterList`, `RosterSheet`,
`PlayerProfile` ×2, `WeekView`, `WorldPlayerProfile`). Sacarlo es fácil y no rompe el
motor: el modelo lo sigue usando igual en `callup.ts:64` (riesgo de ausencia),
`economy.ts:61` (paga o no la cuota), `actions.ts` (entrena o no) y en los eventos.

Lo que hay que **agregar** es la ficha de conducta: lo que el club efectivamente vio.

```
p.record = { convocado, presente, avisóATiempo, faltóSinAvisar,
             cuotaEnFecha, cuotaTarde, asadosInvitado, asadosFue }
```

Y sobre eso, una **etiqueta observada** con el mismo patrón que ya usa `scouting.ts` para
los rivales: ruido alto al principio, que baja con evidencia.

| Evidencia | Lo que dice la ficha |
|---|---|
| 0-2 fechas | "Recién llega: no sabemos de qué palo es" |
| 3-5 fechas | "Parece de los que están" / "Ya faltó dos veces" |
| 6+ fechas | "De los que están siempre" / "Va cuando puede" / "Aparece cuando quiere" |

Tres reglas que le dan el sabor:

1. **La primera impresión puede mentir.** El que arranca cumpliendo puede aflojar en junio.
   Eso es el juego: si la etiqueta fuera exacta a las tres fechas, es el número con otra ropa.
2. **Las referencias son interesadas.** Al fichar no ves conducta: ves lo que dice quien lo
   trajo. El amigo miente por lealtad ("es buena gente, paga cuota, eso seguro"). El ex DT
   exagera para sacárselo de encima.
3. **El asado, la charla y "mandá a un amigo a buscarlo" pasan a ser herramientas de
   información**, no solo de humor. Ir a buscar data tiene precio en gestiones.

Compatible con saves viejos: `p.record` opcional; sin historial, la etiqueta arranca en
"no sabemos" y se llena jugando.

### C. El arte: falta la fábrica, no otra puerta

El pipeline está bien escrito. El problema es que mezcla dos cosas y se contradice en la
tercera:

- **La dirección** (paleta, tipografía, tono) está aprobada y funciona.
- **La producción** no tiene línea de montaje: cada asset se generó a mano, en una sesión,
  con un prompt que ya nadie tiene.
- **El registro** dice dos cosas opuestas sobre el mismo estado.

Tres movimientos concretos:

1. **El retrato deja de ser un archivo y pasa a ser una receta.** Hoy son 8 `.webp` fijos.
   El objetivo es un sistema de capas por seed —base ilustrada × piel × pelo × barba ×
   contextura × camiseta × expresión— generadas una vez y compuestas en runtime. Con 6
   bases × 5 pieles × 8 pelos × 4 barbas ya hay cientos de caras del mismo mundo. El
   generador SVG que quedó "de respaldo" ya resuelve la parte de composición estable por
   seed: lo que falta es que las capas sean dibujadas, no vectoriales.
2. **La Puerta 3 cambia de enunciado**: no es "aprobar una lámina de 12 dibujos", es
   **aprobar una lámina de 12 caras armadas con el sistema de capas**. Si el sistema no da
   12 creíbles, no va a dar 200. Aprobar 12 dibujos sueltos otra vez es repetir el problema
   que ya tenemos con los 8.
3. **Cada pedido de arte deja rastro reproducible**: `design/arte/BRIEFS/` con el prompt
   exacto, la referencia usada, qué se pidió, qué salió y si se aprobó. Hoy ese conocimiento
   muere con la sesión que lo generó — por eso "no le encontramos la vuelta al proceso".

Y limpieza documental: **una sola verdad**. `ART_PIPELINE.md` se queda con las puertas y el
registro de aprobaciones; se borra el bloque "Estado de aprobación actual" que contradice
todo lo de arriba. La declaración de identidad y las reglas van a `ART_BIBLE.md` cuando la
Puerta 3 cierre.

---

## 3. Sugerencias por eje

### Gameplay

- **Rotación de verdad.** Los presets ("2da unidad", "Frescos") existen pero el default deja
  a cinco 40 minutos. Que el preset rote por cuarto, que la pizarra avise antes de empezar
  ("vas con 5 y tenés 9 en la planilla: alguno se va a calentar") y que el **DT contratado
  rote solo** — recién ahí contratar DT tiene una razón de peso.
- **Que 40' se paguen la semana que viene.** El físico ya existe; falta que el desgaste
  cruce la fecha y obligue a rotar por cansancio, no por culpa.
- **Más causas vivas de bronca.** Hoy es 100% minutos. Plata, trato y grupo casi no
  disparan: hay que bajarles el umbral o darles su propio gatillo semanal.
- **La planilla del rival en el informe.** Hoy no se ve quién les anotó. Es una línea de
  código y le da cara a la liga.
- **Economía con arco.** El sponsor y la rifa son botones de un click. Que el sponsor sea un
  contrato con condiciones (cumplí X y renueva) convierte la caja en una historia.

### UI

- Un solo conteo de plantel en todas las pantallas, con un nombre elegido: **"En el plantel"
  (los que están) / "Inscriptos" (los que pueden jugar esta liga)**. Hoy hay cuatro.
- Encabezados en la planilla. Cuatro cifras sin título no son datos: son ruido.
- **"Plantilla" abre con el panel de contratar DT** y el plantel queda abajo del pliegue. Dar
  vuelta el orden: primero lo que la pantalla promete.
- El panel "Cómo llega el club a la inscripción" se repite entero en las tres pestañas de
  pretemporada. Es cabecera, no contenido: una línea, no 160 px.
- **Aprovechar el ancho.** A 1920 sobra un tercio de pantalla vertical y hay 560 px de
  madera a los costados. Para Steam: subir `--ancho-app` y agregar la primera media query
  `min-width` del proyecto, para que en pantalla grande entre más juego, no más fondo.

### UX y navegación

- **Atajos de teclado.** Es un juego de PC: `1-5` para los pasos de la semana, `Espacio`
  para avanzar el cuarto, `Esc` para volver al Hub, `Enter` para confirmar el modal.
- **Un solo botón de "siguiente".** Hoy conviven "Armar el quinteto →" y "» AVANZAR SEMANA"
  en la misma pantalla y hacen cosas distintas. Uno tiene que ser claramente el camino.
- Las cards de acciones semanales **no son `<button>`**: no hay foco, no hay teclado, no hay
  estado presionado. Son divs clickeables.
- Cuando el botón de cuarto queda deshabilitado por una incidencia sin resolver, el motivo
  está en letra chica abajo. Debería estar en el botón.

### Transiciones y animaciones (lo que más rinde por hora de trabajo)

Cinco animaciones cambian la percepción del juego más que cincuenta assets:

1. El marcador que **sube número a número** al cerrar el cuarto.
2. Las filas de la planilla que **entran escalonadas** (40 ms de diferencia).
3. **Fundido de 120 ms** entre pantallas en vez del corte seco.
4. La barra segmentada que **se llena** cuando cambia, en vez de saltar.
5. El modal que **entra con escala**, no que aparece.

Con `prefers-reduced-motion: reduce` respetado desde el principio.

### Programación

- **Vitest + los chequeos que ya se hicieron a mano.** Las suites de 26 y 27 chequeos que
  menciona el ROADMAP existieron y se tiraron. Versionarlas es media sesión y es la única
  red que hoy no existe.
- **CI**: build + tests + `npm run sim` en cada push. Hoy el único guardián es acordarse.
- **Partir `WeekView.tsx`** (1.873 líneas) en las cinco etapas que ya es conceptualmente.
- **ESLint** con `react-hooks` — en un archivo de 1.900 líneas los efectos se escapan solos.
- **Code-splitting**: 682 kB en un chunk. La pretemporada y el partido no necesitan cargarse
  juntos.
- **Migraciones de save testeadas.** El roadmap repite "sin migración" como virtud; con
  saves v15 en la calle, la migración va a llegar y conviene que llegue con test.

---

## 4. Plan de acción

Cinco tandas, ordenadas por dependencia. Cada una es una sesión o dos, y cada una termina
commiteada y pusheada por separado para poder pedir volver a cualquier punto.

### T0 — Ordenar la mesa (media sesión)

- `ROADMAP.md` se parte en dos: **`ROADMAP.md`** de una página con las próximas 5 cosas, y
  **`CHANGELOG.md`** con todo lo hecho (que es lo que hoy ocupa 40 KB).
- Borrar el bloque contradictorio "Estado de aprobación actual" de `ART_PIPELINE.md`.
- Vitest + CI (build, tests, sim).

*Criterio de salida:* alguien que abre el repo sabe en 2 minutos qué sigue.

### T1 — Que el juego no se contradiga (1 sesión)

Los seis arreglos medidos arriba: un solo conteo de plantel, encabezados en la planilla,
sticky que no tapa, barra de recursos honesta durante y después del partido, "posición" sin
partidos jugados, y el panel de inscripción convertido en cabecera.

*Criterio de salida:* jugar una fecha entera sin encontrar dos pantallas que digan cosas
distintas del mismo dato.

### T2 — El compromiso se descubre (1-2 sesiones)

Ficha de conducta + etiqueta observada + referencias interesadas al fichar. El número sale
de la UI; el motor no cambia.

*Criterio de salida:* a la fecha 3 no sabés quién es cumplidor, y a la fecha 8 lo sabés
porque lo viste.

### T3 — El club desde cero (2-3 sesiones)

Modo carrera con agenda de contactos, fichar como pedir un favor, bola de nieve de
referidos, y el corte real de los 8 en 4 semanas. El catálogo de mercado se gana en la T2.

*Criterio de salida:* se puede perder la pretemporada. Hoy es imposible.

### T4 — Que jugar con cinco deje de ser el default (1 sesión)

Rotación en los presets, aviso en la pizarra, DT que rota solo, desgaste que cruza la fecha,
y bajar el monopolio de la bronca por minutos.

*Criterio de salida:* en 60 temporadas simuladas, las causas de bronca dejan de ser 100%
'minutos'.

### T5 — El salto de arte (en paralelo, gobernado por el pipeline)

Sistema de capas por seed → lámina de 12 caras armadas con el sistema (Puerta 3) → vertical
slice → art bible. Nada se genera en masa antes de que Gabi apruebe la lámina.

En paralelo, las cinco animaciones de la lista: son baratas y son la mitad de la sensación
de "esto ya no es un prototipo".

*Criterio de salida:* dos jugadores del mismo arquetipo en la misma pantalla no se ven
iguales.

---

## 5. Orden recomendado y por qué

**T0 → T1 → T2 → T3**, con **T5 corriendo en paralelo** desde el principio (porque depende
de aprobaciones de Gabi, no de código) y **T4 en cualquier hueco**.

T2 va antes que T3 a propósito: el compromiso oculto cambia **cómo se fichan amigos** (sin
número, fichar es confiar en una referencia). Si el modo carrera se construye primero, se
construye dos veces.
