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

2. **Llevar la dirección D al resto del juego** (1 sesión, empezada). La planilla y el
   relieve a la pretemporada, el mercado, la convocatoria y la liga, para que no convivan
   dos anatomías de lista en el mismo juego. *Hecho (sep 2026):* el mercado, la libreta y el
   plantel de la pretemporada son una planilla, y las tablas de la Liga llevan la hoja de la
   planilla (ver el changelog). *Falta, y es decisión de Gabi:* la convocatoria. Sus filas
   son historia y gestiones ("se cayó a última hora: el nene con fiebre", tres botones),
   no cifras; la placa con tornillos le sumaría materia pero no columnas. Si se quiere
   igual, es una sesión corta.

3. **Programación** (1 sesión). ESLint con `react-hooks` (suma una dependencia de
   desarrollo: decisión de Gabi, como el Playwright de `check:pantallas`). *`WeekView.tsx`
   ya está partido* (20/9): cada etapa vive en `src/ui/semana/` (La semana, Convocatoria,
   Quinteto, Informe; el partido en vivo ya tenía su archivo) y `WeekView.tsx` sólo elige
   cuál mostrar. *El code-splitting está* (sep 2026): el juego, React y las galerías de
   desarrollo son tres archivos, así que un deploy nuevo no vuelve a bajar React. Lo que
   queda ahí es partir el chunk del juego (627 kB), que pide separar el reducer para que la
   pretemporada no viaje con el partido.

4. **Decidido por Gabi el 22/9, pendiente de hacer** (dos sesiones cortas, sin más
   preguntas):
   - ~~**La Carrera no quiebra en el primer rojo.**~~ *Hecho (23/9, ver el changelog):* el
     primer rojo es un aviso de la comisión y la quiebra llega con el segundo seguido, en
     los dos modos; el radar distingue los dos pasos. Medido: las quiebras sin gestión
     bajan de 3 a 1 en 160 temporadas.
   - ~~**"Sentar a los dos que no se bancan"**~~ *Hecho (23/9, ver el changelog):* la acción
     sienta a la pareja con roce con la chance de la mediación; si sale bien el roce deja
     de serlo, si sale mal alguno se pudre. El radar del roce lleva a La semana.

   Con eso el punto 4 está cerrado.

Lo que quedaba de T2 y T3 salió (sep 2026, ver el changelog): la charla y el compañero
escriben en la ficha, el inicio avisa al que pasa a "aparece cuando quiere", la libreta
sigue viva en la temporada y la Carrera tiene su `npm run sim:carrera`.

**Orden:** el punto 4 salió (23/9); lo que sigue es la dirección D (la convocatoria, si
Gabi la quiere), y el arte cuando Gabi diga.

## Decisiones que están en la cancha de Gabi

- **¿La pretemporada de la Carrera tiene que apretar?** `npm run sim:carrera` mide que
  pidiendo favores al azar se llega a inscribirse el 90% de las veces, y con cabeza (el
  íntimo primero, después los que ya tienen a su amigo adentro) el 100%, con 11 de
  plantel. Se puede perder, pero al jugador atento no se le escapa ninguna. Si eso está
  bien (la primera pretemporada como tutorial de la red), no se toca; si tiene que
  apretar, las perillas están en `BALANCE.carrera` (ver
  [`design/BALANCE.md`](design/BALANCE.md#el-modo-carrera-septiembre-2026-lo-que-quedaba-de-t3)).

- ~~**¿Hay tope de plantel?**~~ **Decidido (22/9): no hay tope, por ahora.** Se deja que el
  pase y la bronca por minutos lo regulen. (Contexto: aceptando todas las negociaciones se
  cierra con 21 fichas, y con 21 la tira del tablero se desborda: si algún día molesta, es
  un tope de 14 o 15 con "el plantel está cerrado" en el mercado y la libreta.)

- ~~**¿La Carrera tiene que quebrar en la fecha 2?**~~ **Decidido (22/9): no puede quebrar en
  el primer aviso.** El primer rojo es aviso de la comisión y la quiebra recién con el
  segundo. Está en el punto 4 de "Las próximas cosas".

- **El brief de la lámina** (Puerta 3,
  [`design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md`](design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md)):
  leerlo y decir si va la **prueba de registro** (1 base, 3 pelos, 2 barbas, ≈12 créditos).
  Hasta entonces no se genera nada.
- **La convocatoria, ¿pasa a la planilla?** (sep 2026, lo único que quedó del punto 2). El
  mercado, la libreta, el plantel de la pretemporada y las tablas de la Liga ya son la
  placa de la dirección D. La convocatoria no: sus filas son **historia y gestiones** ("se
  cayó a última hora: el nene con fiebre", y tres botones para resolverlo), no cifras
  comparables de arriba abajo. La placa le sumaría materia pero no columnas. Si igual la
  querés uniforme, es una sesión corta.
- **ESLint con `react-hooks`** (lo que queda del punto 3, ahora que `WeekView.tsx` está partido):
  suma una dependencia de desarrollo, igual que el Playwright de acá abajo. Hoy hay una
  red parcial —`npm run build` corre `tsc` y los 115 tests pasan por el reducer—, pero
  nadie chequea las dependencias de los efectos. *(De paso: el 15/9 apareció uno de esos
  bugs de hooks —dos `return` condicionales antes de la mitad de los hooks de `App`— y se
  corrigió con el code-splitting.)*
- **`npm run check:pantallas`**: el Playwright que recorre las 22 pantallas en tres
  resoluciones existe pero no está en el repo porque suma una dependencia de desarrollo
  (ver [`design/PLAN_MARCO_FIJO.md`](design/PLAN_MARCO_FIJO.md)). Con la regla nueva lo
  que tiene que chequear cambió: que ningún panel scrollee por dentro (salvo el relato) y
  que el pie de acción esté a la vista en toda pantalla. Con el visto bueno entra al CI
  en cinco minutos.
- **Registrar la maqueta del tablero como aprobación** en `ART_PIPELINE.md`, con fecha,
  alcance y qué queda fuera.
- **El banco que cubre los puestos y el profe** (sep 2026, ver
  [`design/BALANCE.md`](design/BALANCE.md#el-banco-sugerido-cubre-los-puestos-septiembre-2026-10ª-pasada)):
  "Sugerir" arma el banco con un recambio por puesto y con el plan por defecto los
  tramos con un hueco bajan de 26% a 15%, sin mover las victorias. La excepción es el
  DT honorario con "juegan todos" (-3 de victorias, +3 de huecos, dentro del ruido pero
  las dos para el mismo lado): un banco elegido por cobertura es un poco más flojo y él
  lo juega entero, y cuando no lee la pizarra mete al frío sin mirar el puesto.
  **Decidido (22/9): se deja así.** El profe con "juegan todos" no mira nada, hace
  cualquier cosa y todos juegan minutos; es malo, y ese es su estilo. No se toca.
- ~~**"Sentar a los dos que no se bancan" como acción de la semana**~~ **Decidido (22/9):
  va.** Está en el punto 4 de "Las próximas cosas".
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
- **Más voces por arquetipo** en los mensajes de amigos de afuera y las respuestas a
  eventos. Regla: voz donde el contraste se lee, no por completar la matriz. *En el
  vestuario ya está* (sep 2026): a las cinco emociones que tenían pool se sumaron la figura
  del partido y el que se comió la noche; lo que queda ahí —contento, conforme,
  indiferente— es donde el contraste no se lee y el genérico alcanza.
- **Más eventos**: cadenas de 3+ eslabones y más eventos que dependan del historial del
  club. Ligas que cobren por fecha o aparezcan y desaparezcan según el año. *Los dos
  primeros del historial ya están* (sep 2026): la comisión pide explicaciones con tres
  derrotas al hilo, y con tres victorias el barrio se entera y, si te agrandás en la nota,
  te la cobra tres fechas después mirando lo que pasó desde entonces (`fromWeek` en los
  eventos encadenados: el molde para un eslabón que juzga el historial). Esa cadena ya es
  de largo abierto (se redobla mientras el club gane). *La de tres eslabones con decisiones
  distintas ya está* (23/9): la cena del club (quién la lleva → qué hacer con las tarjetas →
  cómo cerrar la noche), con lo decidido viajando en `payload`; los números son de
  primera mano y están en `CENA` (`events.ts`) por si a Gabi le parecen fuertes o flojos.
- **Mediano plazo**: clima liviano (suspensiones, público, recaudación), más profundidad
  táctica (matchups, ritmo), lesiones con recuperación progresiva, influencias entre
  jugadores (un líder que se va arrastra amigos), sponsors y actividades sociales.
- **Largo plazo**: historias emergentes desde los datos, versión móvil, reskin fútbol 5.
- **Programación, lo que no entra en la sesión de arriba**: que cada migración de save
  nueva llegue con su test en `tests/guardado.test.ts`. *Desde sep 2026 hay un fuzz*
  (`npm run fuzz`, en el CI) que juega partidas eligiendo al azar y vigila que ninguna
  decisión rompa el guardado ni los textos; cuando aparezca un patrón de texto nuevo que
  valga la pena vigilar, la lista está en `scripts/fuzz.cjs`. *Desde el 24/9 también
  vigila que ningún rival se llame igual que uno de los nuestros* (y con eso encontró
  al dúo de la pretemporada que quedaba duplicado en el mundo, ver el changelog).

## Diseño

El design system vive en el repo ([`design/SISTEMA_VISUAL.md`](design/SISTEMA_VISUAL.md))
y tiene un espejo visual en el proyecto **"Basket Manager UI"** de
[claude.ai/design](https://claude.ai/design), que sirve para explorar y comparar estilos
sin tocar el código. `npm run design:sync` regenera las cards en `design/cards/` desde
`src/styles.css`; la subida al proyecto la hace Claude (pedirle "sincronizá el design
system" en una sesión del repo). El repositorio es siempre la fuente de verdad.
