# Roadmap

Una página: **qué sigue y en qué orden**. Lo hecho vive en [`CHANGELOG.md`](CHANGELOG.md);
el estado del juego medido y el plan de acción completo, en
[`design/DIAGNOSTICO_2026-09.md`](design/DIAGNOSTICO_2026-09.md).

## Dónde estamos (sep 2026)

El juego no está flojo de contenido: tiene liga viva con pirámide de 8 divisionales, mundo
con personas persistentes, pretemporada con mercado y elección de liga, partido cuarto a
cuarto con informe, vestuario con voces por arquetipo y una economía con cuotas, sponsor y
fiado. Está flojo de **coherencia, foco y acabado**, y eso es lo que ordena esta lista.

Del plan de septiembre ya están cerradas **T0** (esta página, los tests y el CI), **T1**
(el juego no se contradice), **T2** (el compromiso se descubre: el número salió de la UI
y en su lugar está la ficha de conducta), **T3** (el modo Carrera: el club desde cero,
con la intro en tres escenas, la libreta de contactos, el favor, la bola de nieve y el
corte de los ocho) y **T4** (jugar con cinco dejó de ser el default: el partido rota solo
si hay banco, la pizarra avisa, y las broncas ya no son sólo por minutos), además del
**marco fijo** (las dos barras y el botón de seguir quietos; el contenido scrollea como un
solo bloque y ningún panel por dentro, desde que Gabi lo jugó en la notebook), la
**dirección D** (relieve y planilla) y **las cinco animaciones**.
De **T5** (el salto de arte) está hecho lo que era código: el brief de la lámina, escrito y
reproducible; lo que falta son aprobaciones de Gabi. El motor tiene build limpio, 61 tests
que recorren temporadas enteras por el reducer y un harness de balance con los números en
objetivo.

## Las próximas cosas

La **economía con arco** salió (sep 2026, ver el changelog): el sponsor es un contrato con
condiciones, la rifa tiene historia, la dificultad también es de caja, y sin gestión el
club quiebra la mitad de las veces que antes. Lo que sigue:

1. **T5 · El salto de arte** (gobernado por
   [`design/ART_PIPELINE.md`](design/ART_PIPELINE.md); depende de Gabi, no de código). El
   brief está en [`design/arte/BRIEFS/`](design/arte/BRIEFS/LEEME.md): el retrato deja de
   ser un archivo y pasa a ser una receta de capas (base × expresión × pelo × barba ×
   camiseta) compuestas en runtime por la `appearance` del jugador, en dos pasos para no
   gastar de más (prueba de registro ≈12 créditos, lámina de 12 caras ≈60). *Sale cuando:*
   dos jugadores del mismo arquetipo en la misma pantalla no se ven iguales.

2. **Llevar la dirección D al resto del juego** (1 sesión). La planilla y el relieve a la
   pretemporada, el mercado, la convocatoria y la liga, para que no convivan dos anatomías
   de lista en el mismo juego.

3. **Programación** (1 sesión). Partir `WeekView.tsx` (~1.400 líneas) en sus cinco etapas,
   ESLint con `react-hooks`, code-splitting (755 kB en un chunk).

Lo que quedaba de T2 y T3 salió (sep 2026, ver el changelog): la charla y el compañero
escriben en la ficha, el inicio avisa al que pasa a "aparece cuando quiere", la libreta
sigue viva en la temporada y la Carrera tiene su `npm run sim:carrera`.

**Orden:** la dirección D primero, y el arte cuando Gabi diga.

## Decisiones que están en la cancha de Gabi

- **¿La pretemporada de la Carrera tiene que apretar?** `npm run sim:carrera` mide que
  pidiendo favores al azar se llega a inscribirse el 90% de las veces, y con cabeza (el
  íntimo primero, después los que ya tienen a su amigo adentro) el 100%, con 11 de
  plantel. Se puede perder, pero al jugador atento no se le escapa ninguna. Si eso está
  bien (la primera pretemporada como tutorial de la red), no se toca; si tiene que
  apretar, las perillas están en `BALANCE.carrera` (ver
  [`design/BALANCE.md`](design/BALANCE.md#el-modo-carrera-septiembre-2026-lo-que-quedaba-de-t3)).

- **¿Hay tope de plantel?** En la pretemporada del club en marcha, aceptando todas las
  negociaciones se cierra con **21 fichas** (12 fichajes en 4 semanas, medido por la
  interfaz): no hay tope ni en el motor ni en la UI, y el único freno es el pase. Con 21
  la tira del tablero se desborda y la bronca por minutos se dispara sola. ¿Tope de 14 o
  15 (con "el plantel está cerrado" en el mercado y la libreta), o se deja y que la bronca
  lo regule?

- **¿La Carrera tiene que quebrar en la fecha 2?** Jugada por la interfaz sin gestionar la
  caja: se inscribe con 10, paga la ficha entera y arranca con **$8**; con cuotas de $240
  contra gastos de $245 cierra la fecha 1 con $3 y la fecha 2 con **$-2: "Fracaso
  financiero"**, game over. El radar avisa en rojo desde la fecha 1 y dice qué hacer (rifa,
  sponsor, gorra), así que el jugador atento se salva; el que no mira, pierde el club por
  dos pesos en la segunda semana. ¿Está bien así (la Carrera aprieta de verdad), o el
  primer rojo tendría que ser un aviso de la comisión y recién el segundo, la quiebra?

- **El brief de la lámina** (Puerta 3,
  [`design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md`](design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md)):
  leerlo y decir si va la **prueba de registro** (1 base, 3 pelos, 2 barbas, ≈12 créditos).
  Hasta entonces no se genera nada.
- **`npm run check:pantallas`**: el Playwright que recorre las 22 pantallas en tres
  resoluciones existe pero no está en el repo porque suma una dependencia de desarrollo
  (ver [`design/PLAN_MARCO_FIJO.md`](design/PLAN_MARCO_FIJO.md)). Con la regla nueva lo
  que tiene que chequear cambió: que ningún panel scrollee por dentro (salvo el relato) y
  que el pie de acción esté a la vista en toda pantalla. Con el visto bueno entra al CI
  en cinco minutos.
- **Registrar la maqueta del tablero como aprobación** en `ART_PIPELINE.md`, con fecha,
  alcance y qué queda fuera.
- Decidido: **el héroe de cuerpo entero se agrega cuando haya más arte**; el hueco que lo
  espera es la ficha del jugador.

## Después, sin orden fijo

- **Multi-liga humana y etapa 7 (doble partido y fatiga).** Un jugador puede jugar dos
  ligas, o jugar en contra tuya en la otra; el cansancio y los horarios cruzan entre
  ligas; partidos del segundo equipo jugables; el conocimiento de la persona cruza ligas.
- **Lo que quedaba del informe de testing salió en sep 2026** (ver el changelog): el DT que
  respeta fatiga y posiciones con sesgos que se leen como estilo, el freno a la saturación
  del clima con un asado por semana, y la memoria entre temporadas completa (el título y la
  bronca cruzan el verano, no sólo la promesa rota). Lo que queda de ese informe son ideas
  de diseño más grandes: objetivos de comisión que compitan entre sí, un objetivo personal
  elegido por el jugador, y el feed conversacional en tres hilos.
- **Más voces por arquetipo** en las emociones con pool único, los mensajes de amigos de
  afuera y las respuestas a eventos. Regla: voz donde el contraste se lee, no por completar
  la matriz.
- **Más eventos**: cadenas de 3+ eslabones y eventos que dependan del historial del club.
  Ligas que cobren por fecha o aparezcan y desaparezcan según el año.
- **Mediano plazo**: clima liviano (suspensiones, público, recaudación), más profundidad
  táctica (matchups, ritmo), lesiones con recuperación progresiva, influencias entre
  jugadores (un líder que se va arrastra amigos), sponsors y actividades sociales.
- **Largo plazo**: historias emergentes desde los datos, versión móvil, reskin fútbol 5.
- **Programación, lo que no entra en la sesión de arriba**: que cada migración de save
  nueva llegue con su test en `tests/guardado.test.ts`.

## Diseño

El design system vive en el repo ([`design/SISTEMA_VISUAL.md`](design/SISTEMA_VISUAL.md))
y tiene un espejo visual en el proyecto **"Basket Manager UI"** de
[claude.ai/design](https://claude.ai/design), que sirve para explorar y comparar estilos
sin tocar el código. `npm run design:sync` regenera las cards en `design/cards/` desde
`src/styles.css`; la subida al proyecto la hace Claude (pedirle "sincronizá el design
system" en una sesión del repo). El repositorio es siempre la fuente de verdad.
