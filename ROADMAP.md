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
**marco fijo** (el juego entra en la ventana sin scrollear como página, y en el celular
vuelve a ser página), la **dirección D** (relieve y planilla) y **las cinco animaciones**.
De **T5** (el salto de arte) está hecho lo que era código: el brief de la lámina, escrito y
reproducible; lo que falta son aprobaciones de Gabi. El motor tiene build limpio, 61 tests
que recorren temporadas enteras por el reducer y un harness de balance con los números en
objetivo.

## Las próximas cinco cosas

1. **Economía con arco** (1 sesión). La caja quiebra sola en 8-15% de las temporadas
   simuladas sin gestión: el sponsor como contrato con condiciones (cumplí X y renueva),
   la rifa con historia, y la dificultad seleccionable extendida a la economía. *Sale
   cuando:* en 60 temporadas simuladas sin gestión los game over por caja bajan a la mitad,
   y con gestión mínima (un sponsor) desaparecen.

2. **Lo que queda de T2 y T3, juntos** (media sesión). Que la charla y "mandá a un
   compañero a buscarlo" también escriban en la ficha de conducta, que "Qué mirar hoy"
   avise cuando alguien pasa a "aparece cuando quiere", y en la Carrera, que la libreta
   siga viva en la temporada (el que dijo que no en la pretemporada puede volver a
   aparecer en un evento) y que el modo tenga su propia entrada en `sim` para medir
   cuántas carreras llegan a inscribirse sin gestión.

3. **T5 · El salto de arte** (gobernado por
   [`design/ART_PIPELINE.md`](design/ART_PIPELINE.md); depende de Gabi, no de código). El
   brief está en [`design/arte/BRIEFS/`](design/arte/BRIEFS/LEEME.md): el retrato deja de
   ser un archivo y pasa a ser una receta de capas (base × expresión × pelo × barba ×
   camiseta) compuestas en runtime por la `appearance` del jugador, en dos pasos para no
   gastar de más (prueba de registro ≈12 créditos, lámina de 12 caras ≈60). *Sale cuando:*
   dos jugadores del mismo arquetipo en la misma pantalla no se ven iguales.

4. **Llevar la dirección D al resto del juego** (1 sesión). La planilla y el relieve a la
   pretemporada, el mercado, la convocatoria y la liga, para que no convivan dos anatomías
   de lista en el mismo juego.

5. **Programación** (1 sesión). Partir `WeekView.tsx` (~1.900 líneas) en sus cinco etapas,
   ESLint con `react-hooks`, code-splitting (715 kB en un chunk).

**Orden:** la economía primero (es el game over que más se repite sin gestión), después los
restos, y el arte cuando Gabi diga.

## Decisiones que están en la cancha de Gabi

- **El brief de la lámina** (Puerta 3,
  [`design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md`](design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md)):
  leerlo y decir si va la **prueba de registro** (1 base, 3 pelos, 2 barbas, ≈12 créditos).
  Hasta entonces no se genera nada.
- **`npm run check:pantallas`**: el Playwright que mide las 22 pantallas en tres
  resoluciones existe pero no está en el repo porque suma una dependencia de desarrollo
  (ver [`design/PLAN_MARCO_FIJO.md`](design/PLAN_MARCO_FIJO.md)). Con el visto bueno entra
  al CI en cinco minutos.
- **Registrar la maqueta del tablero como aprobación** en `ART_PIPELINE.md`, con fecha,
  alcance y qué queda fuera.
- Decidido: **el héroe de cuerpo entero se agrega cuando haya más arte**; el hueco que lo
  espera es la ficha del jugador.

## Después, sin orden fijo

- **Multi-liga humana y etapa 7 (doble partido y fatiga).** Un jugador puede jugar dos
  ligas, o jugar en contra tuya en la otra; el cansancio y los horarios cruzan entre
  ligas; partidos del segundo equipo jugables; el conocimiento de la persona cruza ligas.
- **Lo que queda del informe de testing**: DT que respete fatiga y posiciones y cuyos
  sesgos se lean como estilo; memoria entre temporadas completa (títulos y agravios, no
  sólo la promesa rota); frenar la saturación de los diales sociales ganando.
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
