# Roadmap

Próximas etapas, en orden aproximado de valor:

## Hecho recientemente
- **Identidad visual etapa 3**: estados humanos con frase contextual junto a cada número (`humanState.ts` + `.human-note` en cards y ficha), "💬 El grupo del club" en el resumen (las reacciones postpartido como chat del vestuario, con retratos y expresión acorde), reacciones visibles tras cada evento (el desenlace muestra a los implicados y queda anotado en su historia), gorra solo en eventos festivos y guiño de planilla en el box score.
- **Identidad visual etapa 2**: retratos en todo el juego (rivales con la camiseta de su club, quinteto y banco de la pizarra, convocatoria, pretemporada y mercado), apariencia persistida en el perfil (save v15: la cara no cambia aunque el generador gane variantes), expresión ligada al estado (molesto/lesionado), más variantes (8 caras, 12 pelos, 8 barbas) y eventos con ícono por familia y participantes con sus retratos.
- **Experiencia viva del partido (4 sistemas)**: notas por rol con frase explicativa (`rating.ts`), estado emocional postpartido (`emotions.ts`), relato con incidencias deportivas y arbitrales con decisiones del manager (`narrative.ts`), scouting progresivo por niveles de conocimiento con modo debug (`scouting.ts`) y decisiones ante ausencias en la convocatoria (`absences.ts` — 5 motivos con acciones, costos y consecuencias sociales).
- **Identidad visual etapa 1**: design system documentado en [`design/DESIGN.md`](design/DESIGN.md) y retratos procedurales de jugadores (SVG determinístico por seed, con edad que sesga canas/calvicie/arrugas; validación en `/#retratos`). Ver [`design/AVATAR_SYSTEM.md`](design/AVATAR_SYSTEM.md).
- **Playoffs**: la fase regular clasifica del 1° al 4° a la Copa de Oro y del 5° al 8° a la Copa de Plata (semis fecha 10, finales fecha 11); títulos, prestigio e hitos.
- **Promesas con consecuencias**: las promesas de pretemporada (titularidad, minutos, competitivo, ambiente) se evalúan en temporada y los jugadores reaccionan.
- **Mundo etapas 1-5**: ligas y divisionales, clubes/equipos separados, planteles rivales completos con perfiles, regla de inscripción (jugador + liga + temporada), calendario con días y horarios, disponibilidad de rivales, convocatorias rivales variables y scouting con incertidumbre.

## Corto plazo
- **Identidad visual etapa 4**: notas de relaciones (con el DT y entre compañeros, usando las afinidades de `relations.ts`), consecuencias diferidas de eventos (se comunican semanas después), retratos en rankings y box scores, y más frases para los `PlayerMood` (hoy se repiten cuando dos jugadores quedan igual) ([`design/SOCIAL_UI.md`](design/SOCIAL_UI.md)).
- **Mundo etapa 6 — expansión del club**: inscribir equipos nuevos (+35, segunda liga) con costos y requisitos; compartir jugadores entre ligas usando la regla de inscripción ya centralizada.
- **Mundo etapa 7 — doble partido y fatiga**: jugadores que juegan dos partidos el mismo día (ligas distintas), llegadas tarde, salidas anticipadas, reprogramaciones; estados descriptivos (fresco/cansado/agotado).
- **Fichajes con disponibilidad**: que el mercado de pretemporada muestre y negocie disponibilidad (días, horarios, interior, liga prioritaria) usando los AvailabilityProfile ya existentes.
- **Más eventos y personalidades**: ampliar el pool de eventos (20+), eventos encadenados y personalidades combinadas.
- **Balance general**: ajustar dificultad económica y deportiva con datos de partidas reales; niveles de dificultad.

## Mediano plazo
- **Mundo etapa 8 — clima liviano**: suspensiones, público, recaudación, problemas de gimnasio (la estructura de fixture ya soporta estados reprogramado/suspendido).
- **Más profundidad táctica**: matchups por posición, ritmo de juego (ya hay cuartos, hombre/zona, estrella/equipo, piernas por jugador y cambios).
- **Lesiones**: gravedad variable, recuperación progresiva, riesgo por sobrecarga de minutos.
- **Relaciones entre jugadores**: influencias (un líder que se va arrastra amigos); las afinidades ya existen.
- **Sponsors y actividades sociales**: contratos con condiciones, peñas, escuela de básquet.

## Largo plazo
- **Ascensos y descensos**: mover equipos entre divisionales al cierre de temporada (CompetitionEntry ya lo modela).
- **Historias emergentes**: narrativa generada a partir de los datos (rachas, rivalidades, ídolos).
- **Versión móvil**: layout optimizado táctil (la base responsive ya existe).
- **Reskin fútbol 5**: el motor (cuotas, ambiente, egos, canchas) es casi idéntico; cambiar posiciones y simulación de partido.

## Diseño

El design system vive en el repo ([`design/DESIGN.md`](design/DESIGN.md)) y tiene un espejo
visual en el proyecto **"Basket Manager UI"** de [claude.ai/design](https://claude.ai/design),
que sirve para explorar y comparar estilos sin tocar el código. `npm run design:sync`
regenera las cards en `design/cards/` desde `src/styles.css`; la subida al proyecto la hace
Claude (pedirle "sincronizá el design system" en una sesión del repo). El repositorio es
siempre la fuente de verdad.
