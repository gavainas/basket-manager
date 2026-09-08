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
(el juego no se contradice) y **T2** (el compromiso se descubre: el número salió de la UI
y en su lugar está la ficha de conducta), además del **marco fijo** (el juego entra en la
ventana sin scrollear como página, y en el celular vuelve a ser página), y la **dirección
D** (relieve y planilla). El motor tiene build limpio, 40 tests que recorren temporadas
enteras por el reducer y un harness de balance con los números en objetivo.

## Las próximas cinco cosas

1. **T3 · El club desde cero** (2-3 sesiones). Modo carrera: no tenés equipo, tenés una
   libreta con 6 a 8 contactos; fichar es pedir un favor; cada firmado abre 1 a 3 contactos
   suyos; necesitás 8 en 4 semanas o no hay temporada. El catálogo de 16 fichables se gana
   en la temporada 2. El modo actual queda como "club en marcha". *Sale cuando:* se puede
   perder la pretemporada. T2 ya está: fichar amigos es confiar en una referencia
   interesada (`marketReference` en `conduct.ts`), así que el modo carrera se construye
   sobre eso. Arreglo aplicable ya: los eventos que regalan jugadores sólo si te falta
   gente, y el mercado no se vacía solo mientras no hacés nada.
2. **T4 · Que jugar con cinco deje de ser el default** (1 sesión). Los presets rotan por
   cuarto, la pizarra avisa antes de empezar ("vas con 5 y tenés 9 en la planilla"), el DT
   contratado rota solo, el desgaste de 40' se paga la semana siguiente, y las otras causas
   de bronca (plata, trato, grupo) consiguen su gatillo. *Sale cuando:* en 60 temporadas
   simuladas las broncas dejan de ser 100% 'minutos'.
3. **Las cinco animaciones** (media sesión). El marcador que sube número a número, las
   filas de la planilla que entran escalonadas, fundido de 120 ms entre pantallas, la
   barra segmentada que se llena, el modal que entra con escala. Con
   `prefers-reduced-motion` respetado. Es la mitad de la sensación de "esto ya no es un
   prototipo" y cuesta menos que un asset.
4. **T5 · El salto de arte** (en paralelo, gobernado por
   [`design/ART_PIPELINE.md`](design/ART_PIPELINE.md)). El retrato deja de ser un archivo
   y pasa a ser una receta: capas por seed (base × piel × pelo × barba × camiseta ×
   expresión) compuestas en runtime. La Puerta 3 cambia de enunciado: se aprueba una lámina
   de 12 caras **armadas con el sistema**, no 12 dibujos sueltos. Cada pedido de arte deja
   rastro en `design/arte/BRIEFS/`. *Sale cuando:* dos jugadores del mismo arquetipo en la
   misma pantalla no se ven iguales. Depende de aprobaciones de Gabi, no de código.

5. **Economía con arco** (1 sesión). La caja quiebra sola en 8-15% de las temporadas
   simuladas sin gestión: el sponsor como contrato con condiciones (cumplí X y renueva),
   la rifa con historia, y la dificultad seleccionable extendida a la economía. *Sale
   cuando:* en 60 temporadas simuladas sin gestión los game over por caja bajan a la mitad,
   y con gestión mínima (un sponsor) desaparecen.

**Orden:** T3 primero, con T4 en cualquier hueco y las animaciones y el arte en paralelo.
La conducta ya se escribe con la convocatoria, la cuota y el asado; cuando entre T3, la
libreta de contactos usa las mismas referencias interesadas del mercado.

## Decisiones que están en la cancha de Gabi

- **`npm run check:pantallas`**: el Playwright que mide las 22 pantallas en tres
  resoluciones existe pero no está en el repo porque suma una dependencia de desarrollo
  (ver [`design/PLAN_MARCO_FIJO.md`](design/PLAN_MARCO_FIJO.md)). Con el visto bueno entra
  al CI en cinco minutos.
- **Registrar la maqueta del tablero como aprobación** en `ART_PIPELINE.md`, con fecha,
  alcance y qué queda fuera.
- **La lámina de 12 caras** (Puerta 3): nada se genera en masa antes de aprobarla.
- Decidido: **el héroe de cuerpo entero se agrega cuando haya más arte**; el hueco que lo
  espera es la ficha del jugador.

## Después, sin orden fijo

- **Lo que queda de T2**: que la charla y "mandá a un compañero a buscarlo" también
  escriban en la ficha de conducta (hoy escriben la convocatoria, la cuota y el asado), y
  que la ficha se lea en "Qué mirar hoy" cuando alguien pasa a "aparece cuando quiere".
- **Multi-liga humana y etapa 7 (doble partido y fatiga).** Un jugador puede jugar dos
  ligas, o jugar en contra tuya en la otra; el cansancio y los horarios cruzan entre
  ligas; partidos del segundo equipo jugables; el conocimiento de la persona cruza ligas.
- **Lo que queda del informe de testing**: DT que respete fatiga y posiciones y cuyos
  sesgos se lean como estilo; memoria entre temporadas completa (títulos y agravios, no
  sólo la promesa rota); frenar la saturación de los diales sociales ganando.
- **Más voces por arquetipo** en las emociones con pool único, los mensajes de amigos de
  afuera y las respuestas a eventos. Regla: voz donde el contraste se lee, no por completar
  la matriz.
- **Llevar la dirección D al resto del juego**: la planilla y el relieve a pretemporada,
  mercado, convocatoria y liga, para que no convivan dos anatomías.
- **Más eventos**: cadenas de 3+ eslabones y eventos que dependan del historial del club.
  Ligas que cobren por fecha o aparezcan y desaparezcan según el año.
- **Mediano plazo**: clima liviano (suspensiones, público, recaudación), más profundidad
  táctica (matchups, ritmo), lesiones con recuperación progresiva, influencias entre
  jugadores (un líder que se va arrastra amigos), sponsors y actividades sociales.
- **Largo plazo**: historias emergentes desde los datos, versión móvil, reskin fútbol 5.
- **Programación**: partir `WeekView.tsx` (1.873 líneas) en sus cinco etapas, ESLint con
  `react-hooks`, code-splitting (685 kB en un chunk), y que cada migración de save nueva
  llegue con su test en `tests/guardado.test.ts`.

## Diseño

El design system vive en el repo ([`design/SISTEMA_VISUAL.md`](design/SISTEMA_VISUAL.md))
y tiene un espejo visual en el proyecto **"Basket Manager UI"** de
[claude.ai/design](https://claude.ai/design), que sirve para explorar y comparar estilos
sin tocar el código. `npm run design:sync` regenera las cards en `design/cards/` desde
`src/styles.css`; la subida al proyecto la hace Claude (pedirle "sincronizá el design
system" en una sesión del repo). El repositorio es siempre la fuente de verdad.
