# Basket Manager V1.0 — auditoría y plan de cierre

> Abierto el 15/10/2026 sobre la rama `claude/nice-archimedes-pbfs6i`. Esa rama tiene 18
> commits que todavía no están en `main` (textos, historia, segundo equipo; ver
> `git log origin/main..HEAD`). **Este documento no cambia el juego**: es el diagnóstico y el
> plan para cerrar la V1.0. Lo que haya que hacer sale en etapas, cada una en su rama y
> con su propia verificación.
>
> Roles para esta fase (pedido de Gabi del 15/10): **Claude** termina el juego en lo
> funcional, lo estabiliza y prepara la arquitectura para recibir assets. **La dirección de
> arte y la producción de assets las hace Gabi con ChatGPT.** Este plan no toma
> decisiones de estilo: dice qué falta, en qué formato, dónde va y cómo se integra.

## Cómo leer las marcas de evidencia

Para no afirmar que algo funciona cuando sólo se leyó el código:

| Marca | Significa |
|---|---|
| **[TEST]** | Lo cubre un test de `tests/` que pasó hoy |
| **[SIM]** | Lo mide un harness de `scripts/` que corrió hoy |
| **[JUGADO]** | Se vio funcionar en una partida real en el navegador (Chromium headless, 15/10) |
| **[RUN]** | Se comprobó corriendo el reducer real con un script ad hoc (no quedó en el repo) |
| **[CÓDIGO]** | Sólo se leyó el código. **No es prueba de que funcione** |
| **[CAPTURA]** | Se vio en las capturas del 28/9 (`design/capturas/2026-09-28-ui-v1/`) |

---

## 0. Punto de partida (medido el 15/10/2026)

| Chequeo | Resultado |
|---|---|
| `npm run build` | ✅ verde. Aviso: el chunk del juego pesa **702 kB** (225 kB gzip) |
| `npm test` | ✅ **215/215** en 22 archivos (14,5 s) |
| `npm run fuzz` | ✅ 296 fechas jugadas, 0 problemas del motor, 0 textos rotos sobre 7.692 |
| `npm run sim` (80 temp. × 8 estrategias) | Corre limpio. Contra los objetivos de `BALANCE.md`, ver §2.7 |
| `npm run sim:carrera` | 0% sin gestión · 95% pidiendo a todos · 100% con cabeza |
| `npm run sim:ligas` | Sin problemas: el mundo cierra en 12 carreras × 8 temporadas |
| `npm run sim:notas` | Media 6,82 · notas 1–5: 18,7% · 9–10: 6,7% (en objetivo) |
| `npm audit` | 11 vulnerabilidades (2 críticas) en dependencias de desarrollo (Vite/Vitest/esbuild). No viajan al juego, pero hay que revisarlas antes de un build de Steam |
| Partida real en navegador | 2 carreras, temporada 1 completa + inicio de la T2, 0 errores de consola. Ver §1.3 |

---

## 1. Diagnóstico

### 1.1 En una frase

El juego **ya es un juego**: se puede fundar un club, armar el plantel, jugar una temporada
completa con playoffs, ascender o descender y seguir. El motor es sólido y está muy
testeado. Lo que lo separa de una V1.0 no es contenido: son **bugs de bordes del ciclo**
(empezar de cero, el cambio de temporada, la quiebra), **coherencia entre lo que el juego
muestra y lo que el motor calcula**, **agencia fina dentro del partido**, una **progresión
entre temporadas que nadie mide**, y **arte**: hoy ninguna pantalla tiene escena propia,
hay 8 caras para todo el mundo y los jugadores no visten la camiseta del club.

### 1.2 Estado por sistema

Leyenda: 🟢 listo para V1 salvo detalles · 🟡 funciona, con huecos que hay que cerrar · 🔴 bloquea la V1.

| Sistema | Estado | Qué está verificado | Lo que lo separa de la V1 |
|---|---|---|---|
| Creación del club (Carrera) | 🟡 | [TEST] `carrera.test.ts` (14 casos) · [SIM] `sim:carrera` | "Empezar de cero" no vuelve a la Carrera (bug P0). Escudo no elegible (misma silueta en todas las carreras). Año de fundación fijo en 2025. Nombre sin validar |
| Pretemporada y cambio de temporada | 🟡 | [TEST] `pretemporada.test.ts` (17) · `mundo.test.ts` · [SIM] `sim:ligas` | El sponsor y los eventos agendados se pierden al cruzar el verano [RUN]. La quiebra se esquiva al fin de temporada; los aportes de la comisión no tienen tope |
| Fichajes / mercado | 🟡 | Indirecto: `pretemporada`, `conducta`, `carrera` | **No se puede dar de baja a un jugador.** Tope de plantel incoherente (15 en temporada, ninguno en pretemporada). Pool de 10 nombres para reclutas. Sin tests directos de negociación, segundo equipo, scouting |
| Plantilla (ánimo, promesas, conducta, lesiones) | 🟢 | [TEST] `conducta` (16), `vestuario` (11), `voces`, `textos` · [SIM] abandonos y broncas | La promesa "sin entrenar" no tiene efecto. Sin tests unitarios de promesas y lesiones |
| Economía | 🟢 | [TEST] `economia.test.ts` (20) · [SIM] caja y quiebras en objetivo | Cerrar la regla de quiebra entre temporada y pretemporada (ver arriba) |
| Entrenamiento / la semana | 🟡 | [TEST] parcial (`relojSemana`, `rotacion`) | El entrenamiento casi no se nota: +técnica oculta y lenta; descansar le gana en lo físico. Ninguna sim ni test mide su efecto |
| Convocatoria / quinteto | 🟢 | [TEST] `temporada`, `rotacion`, `incidencias` | El pronóstico del quinteto usa un modelo viejo distinto del motor (`evaluateTeam` vs `fuerzas`). Las bajas por "momento del mundo" no cuentan para el tope |
| Tácticas | 🟢 | [TEST] `defensaRival`, `tramos`, `partidoVivo` · [SIM] gradiente táctico | Mixta se pasa del objetivo (+8 a +12 sobre zona). No hay táctica previa al salto inicial |
| Partido | 🟡 | [TEST] `tramos`, `incidencias`, `relato`, `revisionPartido` · [SIM] | **El "día" de cada jugador no entra en la fuerza** (`match.ts:1311`): "cerradores" y sacar al que no tiene la mano no mueven el marcador. Bug de `manualBreak`. Minuto pedido casi cosmético. Remontadas por debajo del objetivo. Alargue de una tirada. Sin decisiones en el 4° cuarto |
| Resultados / informe | 🟡 | [TEST] `partido.test.ts`, `temporada.test.ts` | Las claves "nivel a favor/en contra" y el batacazo comparan otra cosa que el motor: el texto puede contradecir el resultado |
| Liga, playoffs, pirámide | 🟡 | [TEST] `mundo`, `pretemporada` · [SIM] `sim:ligas` | Sin desempate por enfrentamiento directo (empate total favorece al usuario). Evaluación de fin de temporada con "10 equipos" fijo. Fuerza rival desacoplada de sus jugadores |
| Progresión entre temporadas | 🔴 | Ningún test de envejecimiento, evolución ni retiros propios. **Ninguna sim pasa de la temporada 1** | Nadie sabe si el balance aguanta en la temporada 5. La valoración visible salta ±7 cada verano sin causa. **El juego no tiene meta ni final** |
| Guardado | 🟡 | [TEST] `guardado.test.ts` (6) · [RUN] migración v23→v24 | Una sola ranura, sin exportar/importar ni respaldo. 16 migraciones viejas sin test. Mensaje "versión vieja" también para saves futuros o rotos. Para Steam: localStorage no sirve (ver §5) |
| Opciones / plataforma | 🔴 | — | No hay menú de ajustes, pantalla completa, audio ni tutorial (más allá de la intro de la Carrera y los tooltips) |

Además de lo que marca la tabla, la partida en navegador del §1.3 vio funcionar [JUGADO] la
fundación, la pretemporada de la Carrera, el ciclo semanal completo, el partido en vivo con
todas sus interacciones, el cierre de temporada, la pretemporada de la T2 y la recarga en
medio de un partido. El detalle con archivo y línea de cada punto está en el §2.

### 1.3 Lo que se jugó de verdad en el navegador

Dos carreras jugadas haciendo clic en la interfaz (Playwright sobre Chromium, dev server,
1440×900 y 1280×720), con decisiones casi siempre por defecto y sin acciones de semana.
**0 errores, 0 warnings y 0 errores de página en consola en toda la sesión.**

| Paso | Resultado |
|---|---|
| Portada vacía → Nueva partida → intro de 3 escenas → acta de fundación (nombre, colores) | ✅ [JUGADO] |
| Pretemporada de la Carrera: de 7 contactos a 12 confirmados, inscripción en la Liga Universitaria de fiado | ✅ [JUGADO] (Medio y Fácil) |
| La semana → Convocatoria → Quinteto → Partido en vivo → Informe | ✅ [JUGADO]: reloj, pedir minuto, saltar cuarto, incidencias con elección, cambio de táctica, cambio preparado, simular |
| Temporada 1 completa (9 fechas) con eventos semanales y playoffs | ✅ [JUGADO] |
| Todas las pestañas: Tablero, Partidos, Liga (5 subpestañas), Plantel (4), Finanzas, El club, Historia, ficha (5 pestañas), perfil rival | ✅ [JUGADO], sin scroll horizontal a 1440 ni a 1280 |
| Cierre ("Mala campaña", descenso) → pretemporada T2 (renovaciones, mercado, cambio de liga) → temporada 2 | ✅ [JUGADO] |
| Recargar en la convocatoria y **en medio de un partido en vivo** y continuar | ✅ [JUGADO]: vuelve a la misma fase y al mismo minuto |
| Temporada 2 completa | ⛔ No alcanzado: quiebra en la fecha 2 (el bot nunca hizo rifas ni buscó sponsor; final legítimo) |
| Club en marcha, contratar DT, ascenso, playoffs propios | ⛔ No alcanzado |

**Lo que apareció jugando** (todo confirmado después en el código):

- 🔴 **No se puede fichar a un jugador con pase libre si la caja está en negativo**, y el texto
  se contradice: "No te alcanza la caja… (necesitás $0)" (`preseason.ts:1016`, `money < cost` con cost 0).
- Frase rota en el cierre: "Los dan ganar en la hora…" (`evaluation.ts:36`).
- Nombres en minúscula en textos generados ("primo de rodrigo", "el cuñado de waldemar").
- **Tres cifras distintas de cuotas al día en la misma semana**: pie "10/13", Finanzas "8 de 13
  al día · 2 con beca", la cuenta de la semana "9 jugadores al día". Fiado "$80 por semana" en
  el cierre y "$73" en el Tablero. Formato "$-17" en vez de "-$17"; "arrancaste con $0" cuando fueron $200.
- **Apellidos repetidos en el plantel** (dos Perdomo, dos García…) en pantallas que muestran
  sólo el apellido: un aviso de cuota apuntaba a un García y Finanzas mostraba al otro.
- 4 de los 10 pares de colores de la fundación se llaman "Colores" (`CareerSetup.tsx:34`
  nombra 6; `CLUB_COLORS` tiene 10).
- **Choque de colores**: fundado verde y blanco, el primer rival es verde y blanco y en el
  marcador los escudos casi no se distinguen.
- **El mundo es idéntico entre carreras**: mismo rival en la fecha 1, mismo árbitro, misma
  primera incidencia. Hay que confirmar si la semilla del mundo es fija (rejugabilidad).
- Después de un game over, "Continuar partida" sigue resaltado y lleva otra vez a la pantalla final.
- La sugerencia del quinteto deja en el banco a quien se le prometió la titularidad (lo avisa, pero no lo respeta).
- En la negociación, tocar el nombre abre la ficha encima del modal y lo bloquea.
- A 1280×720: nombres cortados en el partido; en el Quinteto el panel derecho y "Sin lugar" quedan tapados por el pie.
- Los numeritos de atajo se pisan con las etiquetas del nav ("PARTIDOS²").
- El guardado crece ~12 KB por semana (311 KB al empezar, 374 KB en la semana 6).

---

## 2. Auditoría por sistema (detalle)

### 2.1 Creación del club — Modo Carrera

- **Implementado** [CÓDIGO]: `createCareerNewGame` (`src/game/preseason.ts:579-674`): club sin
  plantel, caja $200 + extra de dificultad, libreta de 6–8 contactos (`carrera.ts:261-274`),
  bola de nieve al firmar (`carrera.ts:281-302`), chance del favor (`carrera.ts:308-318`),
  corte de los ocho sin emergencia (`preseason.ts:1380-1403`). UI: tres escenas + acta de
  fundación con nombre (40 caracteres) y 10 pares de colores, 4 sin nombre (`CareerSetup.tsx:34`).
- **Verificado**: [TEST] `carrera.test.ts`, 14 casos. [SIM] `sim:carrera`: la Carrera se
  puede perder y ganar. [JUGADO] fundación e inscripción en Medio y Fácil.
- **Problemas**:
  - 🔴 **"Empezar de cero" no funda un club**: `SeasonEndScreen.tsx:53` despacha
    `{ type: 'NEW_GAME' }` sin modo ni dificultad, y eso crea Atlético El Parque en partida
    directa y Medio (`week.ts:28`). Quien quebró en la Carrera difícil aparece en otro modo.
  - El escudo sale de la semilla fija `'cl_user'` (`world.ts:27`, `crest.ts:119-136`):
    todas las Carreras tienen la misma silueta, partición y figura; cambian iniciales y colores.
  - Año de fundación fijo en 2025 (`world.ts:517`, `CareerSetup.tsx:137`), también para el club "en marcha".
  - El nombre no se valida contra los rivales.
- **Para V1**: P0-01, P0-10, P1-07.

### 2.2 Pretemporada y cambio de temporada

- **Implementado** [CÓDIGO]: `startPreseason` (`preseason.ts:680-887`) envejece y hace
  evolucionar al plantel, liquida el fiado, cobra premios, aplica ascensos y descensos y mueve
  al mundo; semanas con mantenimiento (`:1261-1309`); cierre con emergencia, liga, recargo,
  aporte de la comisión (`:1350-1546`).
- **Verificado**: [TEST] `pretemporada.test.ts` (17), `mundo.test.ts` (4). [SIM] `sim:ligas`.
- **Problemas**:
  - 🔴 [RUN] **El contrato de sponsor y los eventos agendados se pierden sin aviso al pasar
    de temporada**: `startPreseason` arma el estado como literal y descarta `sponsor`,
    `scheduledEvents`, `eventLog`, `delayed`, `semanasEnRojo`, `libretaPendiente`,
    `asadoHistory`, `ultimaRifa`. Comprobado en 3 de 3 semillas.
  - 🔴 [CÓDIGO] **La quiebra se esquiva en el verano**: si la última fecha cierra en rojo
    (primer aviso), igual se pasa a `seasonEnd`; el contador se resetea y el aporte de la
    comisión en `closePreseason` (`:1510-1518`) tapa cualquier rojo, sin tope.
  - Sin tope de plantel en pretemporada (`signMarketPlayer`, `:1009`), con tope 15 en temporada (`actions.ts:410`).

### 2.3 Fichajes y plantel

- **Implementado** [CÓDIGO]: mercado de 16 fichables, negociación con exigencias y una
  contraoferta (`preseason.ts:966-1242`), agentes libres del mundo, "Reclutar" en temporada
  ($70, 30% de fallo), amigo a prueba, libreta pendiente, segundo equipo (`secondTeam.ts`),
  scouting, amigos en otros clubes. No hay sueldos: es amateur, el jugador paga cuota.
- **Verificado**: sólo indirecto. **Sin test directo**: `secondTeam.ts`, `scouting.ts`,
  `friendsAbroad.ts`, contraoferta y "priorizar agenda" (el fuzz los recorre al azar).
- **Problemas**:
  - 🔴 **No existe acción para liberar a un jugador** (`gameReducer.ts:43-89`). Con "formar
    tu plantel" como pilar de la V1, es un hueco.
  - Reclutas: 10 nombres (`recruits.ts:8-19`) y varias búsquedas por nombre en vez de id
    (`carrera.ts:314,355`, `events.ts:1074`, `preseason.ts:1530`). Hoy no se vio una
    colisión [RUN], pero en carreras largas es un riesgo real.
  - La promesa `sin_entrenar` no tiene efecto (`promises.ts:14,77`).

### 2.4 Economía

- **Implementado** [CÓDIGO]: `applyWeeklyEconomy` (`economy.ts:99-229`), sponsor como contrato
  (`sponsors.ts`), asado, rifa, objetivos de la comisión, quiebra en dos pasos (`week.ts:517-543`).
- **Verificado**: [TEST] `economia.test.ts` (20). [SIM] caja final $458–518 sin recaudar, 3
  quiebras en 640 temporadas sin gestión, 0 con sponsor. **En objetivo.**
- **Detalles**: comentario de `morosoPagaMaxSemanas` desactualizado (`balance.ts:31`); el modo
  sponsor viejo (`economy.ts:135-143`) es compatibilidad de saves.

### 2.5 La semana y el entrenamiento

- **Implementado** [CÓDIGO]: 10 acciones, máximo 2 por semana (`actions.ts:61-425`);
  `advanceWeek` (`week.ts:260-582`). Entrenar cuesta $30, +4 de físico, 8% de lesión, y una
  chance oculta de +1 de técnica (30% en jóvenes comprometidos).
- **Problemas**:
  - El efecto del entrenamiento **no se ve**: unos +2,7 de técnica por temporada para un
    joven que entrena siempre, sin feedback. Descansar (+10 físico, gratis) le gana en lo físico.
  - `sim-balance.cjs:150` nunca entrena: **el efecto no está medido**.
  - `TOGGLE_ACTION` no valida (`gameReducer.ts:157`); el error aparece recién al confirmar.

### 2.6 Convocatoria, quinteto y tácticas

- **Implementado** [CÓDIGO]: `rollCallUp` (`callup.ts:29-178`) con tope de bajas por
  dificultad, bajas de último momento, el fundido; quinteto y banco sugeridos por puesto;
  defensas zona/hombre/presión, ataques equipo/estrella/correr, referencia del ataque,
  unidades, defensa del rival que cambia una vez por cuarto.
- **Verificado**: [TEST] `temporada`, `rotacion`, `defensaRival`, `tramos`, `partidoVivo`.
  [SIM] leer al rival vale +0,7 a +1,4 puntos (tope acordado: 3–4).
- **Problemas**:
  - El **pronóstico del quinteto** ("superior / parejo / más fuerte", `Quinteto.tsx:160`) usa
    `evaluateTeam().strength` (`match.ts:181-236`), un modelo que el motor por tramos ya no
    usa. `overloadThreshold`, `minutesPerSub` y `overloadPenaltyPerMin` sólo alimentan ese pronóstico.
  - Las bajas por "momento del mundo" no cuentan para el tope: en Medio pueden faltar 6 [SIM].

### 2.7 El partido

- **Implementado** [CÓDIGO]: 4 cuartos × 5 tramos (`match.ts:1730-1953`), suerte y rachas por
  cuarto, empuje del que va abajo, desgaste y lesiones, presión del rival en el cierre,
  incidencias con decisión al cerrar los cuartos 1–3 (`narrative.ts:180-498`), 2 minutos
  pedidos, plan de cambios, piloto del DT, relato jugada a jugada determinista (`relato.ts`).
- **Verificado**: [TEST] `tramos`, `incidencias` (9), `relato`, `revisionPartido`, `voces`, `textos`.
  [SIM] la forma de jugar mueve resultados: mixta 60% · presión 56% · zona 52% · cinco fijos 40%.
- **Problemas** (todos [CÓDIGO] salvo indicación):
  1. 🔴 **El "día" de cada jugador** (`live.perfs`, 0,78–1,22, `match.ts:600`) **no entra en la
     fuerza del equipo**: `fuerzas()` promedia `playerEffective()` sin él (`match.ts:1311`).
     Sólo reparte los puntos, pesa en la nota y en la referencia. Las "unidades cerradoras"
     (ordenadas por el día, `match.ts:818`) y sacar al que no tiene la mano no cambian el
     marcador. El juego sugiere una agencia que no existe.
  2. 🔴 Un cambio **a mitad de cuarto** marca `manualBreak` (`match.ts:716`) y cancela la
     rotación programada del cuarto siguiente (`match.ts:756`).
  3. El minuto pedido vale ~0,2 puntos (rival ×0,92 un solo tramo).
  4. Remontadas: dos umbrales (−9 y −10) y el déficit se mide sólo al cierre de cada cuarto
     (`match.ts:2041`). El empuje rinde ≤3 puntos por cuarto contra ±5 de suerte.
  5. El alargue son dos tiradas (`match.ts:1653`), sin decisiones. No hay decisiones en el 4° cuarto.
  6. `BALANCE.match.randomPoints` no se usa; `rivalPideMinuto: false` deja código muerto.
  7. El simulador anula las incidencias (`sim-balance.cjs:177`): su peso en el balance no está medido.
- **Balance contra `design/BALANCE.md`** [SIM, 80 temp. por estrategia, 15/10]:

  | Objetivo | Hoy | |
  |---|---|---|
  | Agresiva +7–10 sobre zona | presión +3,9 · mixta +7,9 | ✅ (con 20 temp. mixta da +12: ruido alto) |
  | Leer al rival ≤ 3–4 | +0,7 | ✅ |
  | Remontadas propias ~5% | 27/1.125 ≈ **2,4%** | ❌ |
  | Nos remontan ~7–10% | 56/1.196 ≈ **4,7%** | ❌ |
  | Lesiones 1–2 / temp. | 0,99–1,45 | ✅ |
  | Semanas sin ausencias ~1/3 | ~25–29% | 🟡 |
  | Caja y quiebras | $458–518 · 3/640 · 0 con sponsor | ✅ |
  | Tramos con un puesto sin cubrir ~11–15% | **18,8%** plan por defecto · 40% con el profe | ❌ |
  | Nota del partido | media 6,82 · 1–5: 18,7% · 9–10: 6,7% | ✅ |

### 2.8 Resultados e informe

- **Implementado** [CÓDIGO]: `finishLiveMatch` (`match.ts:1976-2457`): notas, figura, moral,
  prestigio, claves, vestuario, planillas, emociones. `concludeMatch` actualiza la tabla.
- **Problema**: la clave "nivel a favor / en contra" (`match.ts:256`) y el batacazo
  (`match.ts:2033`) comparan técnica de titulares contra `rival.strength`, no lo que compara el
  motor. El texto puede contradecir el resultado.

### 2.9 Liga, playoffs, pirámide y mundo

- **Implementado** [CÓDIGO]: 8 divisionales y 75 equipos, tabla por victorias y diferencia,
  Copa de Oro (1–4) y de Plata (5–8), ascenso de los finalistas de Oro y descenso de los dos
  últimos, verano del mundo con edad, retiros y pases.
- **Verificado**: [TEST] `mundo.test.ts`; [SIM] `sim:ligas`. **Sin test específico de
  desempates ni de playoffs.**
- **Problemas**:
  - Sin desempate por enfrentamiento directo; con empate total queda primero el club
    (`week.ts:56`): sesgo a favor del usuario.
  - `computeSeasonEvaluation` asume 10 equipos (`evaluation.ts:62,177`); en la liga del
    Comercio (8) el último suma +7,8 deportivo.
  - `buildPlayoffs` asume ≥ 8 equipos (`playoffs.ts:70`); hoy se cumple siempre.
  - `rival.strength` no depende de sus jugadores: un ex nuestro que firma con un rival no lo
    refuerza. La "persona en el mundo" no pesa en la fuerza (P2: decisión de diseño).

### 2.10 Progresión entre temporadas

- **Implementado** [CÓDIGO]: edad +1, técnica por franja de edad, bonus por entrenar ≥3
  veces, físico según edad, retiros (`preseason.ts:164-219, 680-747`), memoria que cruza el
  verano (rencor, bronca, título).
- **Verificado**: [TEST] sólo la memoria y los ascensos. **Nada sobre envejecimiento, evolución ni retiros.**
- **Problemas**:
  - 🔴 **Ninguna simulación juega más de una temporada con el plantel propio.** No se sabe si
    en la temporada 5 el club arrasa o se desarma.
  - `visibleRating` se resortea ±7 cada verano (`preseason.ts:726`): la valoración salta sin causa.
  - **No hay condición de fin ni meta de largo plazo.** Sólo derrotas (quiebra, <5 jugadores,
    no inscribirse).

### 2.11 Guardado

- **Implementado** [CÓDIGO]: una clave de localStorage, `SAVE_VERSION = 24`, 22 escalones de
  migración (`storage.ts:45-271`); save futuro, v1 o roto → `null` → "incompatible"; escritura
  con `try/catch` y aviso "No se pudo guardar"; autoguardado en cada cambio de estado.
- **Verificado**: [TEST] `guardado.test.ts` (6): vacío, ida y vuelta, futuro incompatible,
  JSON roto, campo opcional ausente, v21→v24. [RUN] v23 con `heldDivision` migra bien;
  tamaño 375–420 KB por temporada.
- **Problemas**: una sola ranura, sin respaldo antes de migrar ni exportar/importar;
  "La partida guardada es de una versión vieja" (`Portada.tsx:131`) también para un save
  futuro o roto; `Portada` corre 2 `loadGame()` completos por render (`:73-75`); `hasSave()`
  es código muerto; el fuzz no pasa el estado por `loadGame`.

---

## 3. Auditoría de UI y arte

### 3.1 La base visual

La UI V1 (28/9) es la que queda como base, y no se rediseña. Una precisión de nombres para
que ChatGPT y Claude hablen de lo mismo: lo que hoy está en el juego es la **Paleta A**:
planillas **azul noche translúcidas** con texto y filetes claros (gris perla) sobre escenas
ilustradas (`src/styles.css:13-164`). Los paneles gris perla opacos (`#dfe5e9`) fueron una
etapa anterior y ya no están en el CSS. **"La UI gris perla" en este plan = la UI V1 tal
como está hoy.** Si la intención es volver a paneles claros, es una decisión (D-08).

### 3.2 Consistencia del sistema visual [CÓDIGO]

- **Bien**: tokens en un solo `:root` (73 variables), tres voces tipográficas empaquetadas
  (Barlow Condensed, Barlow, Caveat), set propio de 42 íconos SVG (`Icon.tsx`), piezas
  compartidas en `v1.css` y `Busto.tsx`, las siete reglas de `UI_V1_GUIA.md` respetadas en
  las 22 pantallas [CAPTURA].
- **Deuda** (nada bloquea, todo suma fricción al integrar arte):
  - 15 hojas CSS (7.330 líneas). 128 colores hex escritos a mano en las hojas por pantalla;
    el parquet de la cancha está dos veces con tonos distintos (`partido.css:221`, `semana.css:482`).
  - Selectores duplicados o pisados en `styles.css` (`.card`, `.modal-backdrop`, `.modal`, `.profile`).
  - **Seis implementaciones de "la cara redonda"** (`Cara` ×2, `Carita`, `CaraPlantel`,
    `CaraDt`, más tres clases). Cuando lleguen retratos nuevos hay que tocar seis lugares.
  - Tres media queries de mobile que ya no corresponden al objetivo PC.
  - El motor escribe textos con emojis (📰 🚑 🟥 …, ~46) y la UI **detecta el tipo de línea
    por el emoji inicial** (`PartidoVivo.tsx:129,326,803`). Frágil y contrario a la Art Bible.
  - [CAPTURA] En el partido a 1440×900 la columna izquierda queda cortada por la barra de
    táctica (`05b-partido-q2`): la fila "Referencia" no se ve sin scroll.
  - [CAPTURA] Los números de atajo de teclado se pisan con las etiquetas del nav ("TABLERO¹").

### 3.3 Retratos de jugadores

- **Hoy**: 8 retratos por arquetipo (`public/arte/p-*.webp`, 512×512 con alfa) para todo el
  plantel y todo el mundo, rivales incluidos. Las "variantes" (espejo y tono de fondo) dan
  como mucho 16 caras. Se usan en Busto (Tablero, Convocatoria, Informe, Partido, Rankings,
  Historia, Pretemporada, Eventos, Ficha en escala L) y en Avatar.
- [CAPTURA] En el Tablero hay pares idénticos lado a lado (Núñez/Batista, Techera/Viera,
  Chino/Flaco). La edad no coincide con la cara: un jugador de 23 puede verse veterano.
- En la ficha el retrato de 512 px se muestra a ~400 px: en un monitor 1440p o 4K se va a ver blando.
- El **SVG procedural** (`Avatar.tsx:109-412`) usa la `appearance` persistida del jugador (piel,
  pelo, barba, cara, edad). Ya existe el dato para elegir una cara coherente: lo que falta es arte.
- **Sin retrato**: DT de afuera (`CoachCard.tsx:32`), delegado rival, comisión, árbitros.

### 3.4 Escudos, camisetas e identidad de club

- **Escudos**: procedurales (`crest.ts` + `Crest.tsx`), 5 siluetas × 6 particiones × 5
  figuras, iniciales y estrellas. Funcionan bien en todos los tamaños [CAPTURA]. **No hace
  falta arte**: falta que el jugador pueda elegir o rerolear el suyo (P1-07).
- **Colores**: el usuario elige 1 de 10 pares sólo en la Carrera (todos apagados, sin
  selector libre); los rivales sacan 1 de los mismos 10 **al azar con reemplazo**
  (`world.ts:242`): se repiten dentro de una liga y pueden coincidir con los del usuario
  [JUGADO: verde y blanco contra verde y blanco en la fecha 1].
- **Dónde se ve el color del club** [CÓDIGO]: el escudo, un aro de 3 px en las fichas de la
  cancha del partido (`partido.css:251-254`), el punto del relato y un ícono de camiseta en
  dos modales. El cromo de la UI nunca lleva colores de club (regla en `styles.css:28`).
- 🔴 **Los jugadores no visten la camiseta del club.** Cada retrato trae su ropa pintada (buzo
  bordó, musculosa amarilla, remera verde…). Dos clubes con colores opuestos se ven iguales en
  todas las pantallas salvo el escudo. Es la diferencia visual más grande entre "un club que
  fundé" y "un club cualquiera", y **depende de arte**: el retrato tiene que separar la camiseta
  en una capa que el código pueda teñir (§5).
- [CAPTURA] El aro rival casi no se distingue con colores claros o parecidos al nuestro.

### 3.5 Escenas e ilustraciones

| Asset en el repo | px | KB | Uso hoy |
|---|---|---|---|
| `public/portada.webp` | 2048×2048 | 252 | Portada (la única pantalla con arte compuesto a medida) |
| `public/arte/portada-menu-central/*.webp` (3) | 640×~640 | 47–108 | Accesos de la portada |
| `public/arte/fondo-gimnasio.webp` | 1920×1072 | 93 | Tablero (espejado), La semana, Carrera escena 3 |
| `public/arte/fondo-cancha.webp` | 1920×1072 | 88 | Quinteto |
| `public/arte/cab-partido.webp` | 1280×714 | 75 | Partido en vivo |
| `public/arte/cab-derrota.webp` | 1280×714 | 68 | Informe tras perder, Carrera escena 1 |
| `public/arte/cab-comision.webp` | 1280×714 | 85 | Finanzas, El club, Historia, cierres, quiebra |
| `public/arte/cab-arbitros.webp` | 1280×714 | 82 | Liga, Calendario, Rankings |
| `public/arte/cab-bar.webp` | 1600×893 | 158 | Pretemporada, fin de pretemporada, Carrera escena 2 |
| `src/assets/vestuario-bg.webp` | 1279×720 | 87 | Plantel, Vestuario, CT, Convocatoria, Informe tras ganar |
| `public/arte/cab-vestuario.webp` | 1600×893 | 221 | **Sin uso** (no se borra: es arte aprobado) |
| `public/arte/p-*.webp` (8) | 512×512 | 23–33 | Retratos |
| `public/arte/portada-menu-central/*.png` (4) | ~1250–1670 | **7,7 MB** | **Sin uso, pero se publican en `dist/`** |

- **Ninguna pantalla de la temporada tiene arte pensado para ella**: 9 escenas son 8 imágenes
  reasignadas (`ESCENA`, `App.tsx:113-175`). 5 de 9 miden 1280×714, menos que la pantalla
  objetivo; ninguna cumple el 1920×1080 del registro.
- Todo el arte existente es anterior a la Art Bible (personajes más caricaturescos). Qué queda
  aprobado y qué se reemplaza lo decide Gabi con ChatGPT; **acá no se reemplaza nada**.

### 3.6 La experiencia visual del partido [CÓDIGO + CAPTURA]

Marcador grande con escudos y parciales, cancha en CSS con las 10 caras quietas en posiciones
fijas por puesto (sin pelota ni movimiento; sólo un pulso en el que anota), relato jugada a
jugada con reloj (15 s reales por cuarto), planillas a los costados, táctica y "Jugar el
cuarto" abajo, `cab-partido` velado de fondo. La composición es la referencia aprobada del 9/9.
**Es legible y es el centro de la presentación, pero visualmente es estático.** Lo que más lo
levantaría sin cambiar la composición: escena propia (`bg-partido`), camisetas del club en las
caras, animación del marcador y de la jugada que se relata (P1/P2, §4).

### 3.7 Pantallas sin arte propio, placeholders y documentos

- **Sin arte propio**: todas salvo la portada (ver tabla de §6.2).
- **Placeholders declarados en el código**: escenas "provisionales" (`App.tsx:91,104`), logo
  como texto (`Portada.tsx:106`), DT sin retrato (`CoachCard.tsx:21`), SVG de respaldo
  (`Avatar.tsx:7`), canchas en CSS (Quinteto y Partido), escudo vacío gris (`bloqueD.tsx:74`).
- **`UI_V2_PENDIENTES.md`**: ningún ítem está hecho todavía (el código lo confirma).
  Animaciones: sólo la entrada del relato y el pulso de "anotó".
- **`ART_PIPELINE.md`**: Puertas 3–6 abiertas, brief de la lámina por capas `PENDIENTE`.
  Desactualizado en dos puntos: el Tablero figura como "implementación pendiente" y ya está;
  no registra la UI V1 como aprobada.
- **`ASSET_REGISTRY.md`** y **`public/arte/LEEME.md`**: desactualizados (citan `Cabecera.tsx`,
  `Retrato.tsx` y `FONDO`, que ya no existen; `cab-vestuario` figura en uso). Se corrigen en la Etapa 0.

---

## 4. Alcance de la V1.0

**Definición**: el jugador empieza desde cero, funda un club con identidad propia, arma el
plantel, juega una temporada completa con el partido como momento central, entiende por qué
le fue como le fue, y puede seguir jugando temporadas sin que el juego se rompa ni se vuelva
trivial. Todo con arte V1 definitivo en las pantallas principales.

### 4.1 Obligatorio para V1.0

1. Ciclo completo sin callejones: fundar → pretemporada → temporada → playoffs → cierre →
   pretemporada siguiente → **5 temporadas seguidas** sin errores, en los dos modos y las tres dificultades.
2. Las decisiones tienen consecuencias que el juego **muestra** y que el motor **cumple**:
   pronóstico, claves del informe y unidades del partido dicen lo mismo que el motor calcula.
3. Gestión de plantel básica completa: fichar, **liberar**, tope de plantel único.
4. El partido: el día de cada jugador cuenta, los cambios no rompen el plan, el minuto
   pedido se nota, y el informe explica el resultado.
5. Progresión entre temporadas medida y visible (quién mejoró, quién se retiró).
6. Guardado robusto: respaldo antes de migrar, mensaje correcto, export/import o equivalente.
7. Identidad del club: elegir escudo (entre variantes generadas) y colores; **los jugadores
   visten los colores del club** (depende del arte de retratos por capas).
8. Arte V1 de las pantallas centrales: Tablero, Partido, Informe (victoria/derrota),
   retratos con variedad suficiente para que un plantel no tenga caras repetidas, y logo.
9. Opciones mínimas: pantalla completa, volver al menú, borrar partida (ya existe), y si hay
   audio, volumen.
10. Documentación al día: README, ROADMAP, CHANGELOG y este plan reflejan el estado real.

### 4.2 Mejora deseable para V1.0

- Decisiones en el 4° cuarto (última posesión, falta intencional) y alargue jugable.
- Táctica previa al salto inicial.
- Entrenamiento con foco elegible (tiro, defensa, físico) y su efecto en la ficha.
- Una meta de largo plazo (subir a la Divisional A, títulos, la "carrera del manager") con su pantalla.
- Escenas propias para Liga, Finanzas, El club, Historia, Pretemporada, La semana, Quinteto.
- Retratos para DT, delegados y comisión.
- Animaciones del Art Bible §15 (titular/banco, marcador en vivo, paso adelante en la fila).
- Atajos de teclado para eventos y pretemporada; tutorial liviano o ayuda contextual.
- Varias ranuras de guardado.
- Unificar las seis "caras" en un componente y limpiar `styles.css`.

### 4.3 Para versiones futuras (fuera de V1.0)

- Multi-liga humana, doble partido y fatiga cruzada (etapa 7 del roadmap).
- Fuerza rival construida desde sus jugadores; mercado entre clubes del mundo.
- Atributos múltiples por jugador y potencial.
- Clima, público, recaudación por partido; lesiones con recuperación progresiva.
- Más cadenas de eventos y voces por arquetipo (seguir sumando, pero no bloquea).
- Cuerpo entero del héroe en la ficha.
- Versión móvil, reskin fútbol 5, Paleta B.
- **Empaquetado Steam** (Electron/Tauri, guardado en archivo, Steam Cloud, logros): ver D-01.
  La V1.0 deja la arquitectura lista (capa de guardado abstracta), pero el build de Steam es
  su propia etapa.

---

## 5. Arquitectura para integrar assets

Hoy el mapa de arte está repartido en cuatro lugares (`ESCENA`/`escenaDe` en `App.tsx`,
`ARCHIVO` en `Avatar.tsx`, `ESCENAS` en `CareerSetup.tsx`, literales en `Portada.tsx`), con
dos mecanismos de carga (`public/` + `BASE_URL` y un `import` para `vestuario-bg`), sin
fallback ni chequeo de existencia. Cambiar una escena exige editar código.

**Propuesta (Etapa 4, sin cambiar lo que se ve):**

1. **Un manifiesto único**, `src/arte/manifiesto.ts`: cada entrada con `id`, archivo,
   tipo (`escena` | `retrato` | `capa` | `logo` | `icono` | `ilustracion`), encuadre
   (`background-position`), velo, si se espeja, y estado (`provisional` | `aprobado`).
   `ESCENA`, `ARCHIVO`, `ESCENAS` y la portada pasan a leer de ahí. **Cambiar una escena =
   soltar el archivo y cambiar una línea del manifiesto.**
2. **Una sola convención de carpetas y nombres** (ver §6.1). Todo el arte del juego en
   `public/arte/`; `vestuario-bg` se copia ahí y el import queda como alias.
3. **Fallback explícito**: si un archivo nuevo falta o no decodifica, se usa el provisional
   del manifiesto. Un test (`tests/arte.test.ts`) recorre el manifiesto y verifica que cada
   archivo existe, pesa menos que su tope y tiene las dimensiones declaradas.
4. **Resolución alta**: escenas servidas con `image-set()` (1920 y 2560) para monitores 1440p+.
5. **Retratos compuestos por capas**: `Busto` y `Avatar` aceptan una receta (base × pelo × barba
   × expresión × **camiseta**). La camiseta es una **máscara en escala de grises** que el código
   tiñe con el color del club (CSS `mask-image` + color de fondo, o `<canvas>` si hace falta
   sombreado). Mientras no haya capas, el componente sigue mostrando el `p-*.webp` actual.
   Elegir la cara sale de la `appearance` persistida (edad, pelo, barba), que ya existe.
6. **Componente único de cara** (`<Cara>` en `Busto.tsx`) que reemplaza las seis
   implementaciones: cuando lleguen los retratos nuevos, cambian en un solo lugar.
7. **Fuera de `dist/`** los PNG fuente (7,7 MB) que hoy se publican sin uso: se mueven a
   `design/arte/fuentes/`. No se borra nada.
8. **Capa de guardado abstracta** (`storage.ts` con un adaptador): hoy localStorage; mañana
   archivo + Steam Cloud sin tocar el resto del juego.

---

## 6. Inventario de assets (para trabajar en paralelo con ChatGPT)

### 6.1 Reglas técnicas para todo asset nuevo

| Tipo | Entrega a Claude (master) | Lo que sirve el juego | Formato | Peso máx. servido | Transparencia |
|---|---|---|---|---|---|
| Escena de pantalla | 3840×2160 PNG (mínimo 2560×1440) | 2560×1440 y 1920×1080 | WebP q≈85 | 400 KB (2560) · 250 KB (1920) | No |
| Retrato por capas (cada capa) | 1024×1024 PNG | 1024 y 512 | WebP con alfa | 60 KB por capa | Sí |
| Retrato entero (si no se va a capas) | 1024×1024 PNG | 1024 y 512 | WebP con alfa | 80 KB | Sí |
| Máscara de camiseta | 1024×1024 PNG escala de grises | 512 | PNG o WebP | 30 KB | Sí |
| Logo | SVG vectorial + PNG 2048 px de ancho | SVG | SVG | 50 KB | Sí |
| Ilustración de evento / trofeo | 1024×1024 PNG | 512 | WebP con alfa | 80 KB | Sí |
| Ícono de app | 1024×1024 PNG | .ico 256/48/32/16 + PNG | ICO/PNG | — | Sí |

- **Nombres**: `bg-<pantalla>-v<NN>.webp` para escenas (`bg-tablero-v01.webp`),
  `rt-<capa>-<variante>-v<NN>.webp` para capas de retrato (`rt-base-03-v01.webp`,
  `rt-pelo-rulos-v01.webp`, `rt-camiseta-mascara-v01.webp`), `logo-v<NN>.svg`,
  `ev-<evento>-v<NN>.webp`. Una versión nueva **suma** `v02`; no pisa la `v01`.
- **Composición de escenas**: 16:9; nada importante a menos del 8% de los bordes (en 1366 se
  recorta por los costados); la UI tapa una barra superior de ≈55 px y un pie de ≈68 px;
  **sin UI dibujada en la imagen**. Cada ficha de abajo dice qué zona queda libre.
- **Retratos por capas**: todas las capas en el **mismo lienzo y el mismo registro**
  (cabeza y hombros en la misma posición), encuadre de hombros para arriba con margen para
  que el busto se recorte en la fila de pie; la camiseta como capa separada, con la máscara
  marcando qué parte se tiñe con el color principal y cuál con el secundario (dos canales o
  dos máscaras).
- **Entrada al repo**: siempre por git local (Claude). Claude verifica integridad, que Chromium
  lo decodifique, dimensiones y peso; integra; saca capturas a 1440×900, 1366×768 y 2560×1440;
  y actualiza `ASSET_REGISTRY.md` a `integrated`. El estado `approved` lo pone Gabi.
- **Estilo, paleta, tono**: no se definen acá. Los fija Gabi con ChatGPT (Art Bible).

### 6.2 Lista priorizada

**P0 — sin esto no hay V1.0**

| id | Qué | Dónde se usa (pantalla · componente) | Dimensiones / formato | Zona libre para la UI | Cómo se integra |
|---|---|---|---|---|---|
| `rt-*` (lámina por capas) o `retratos-v02` | Retratos con variedad: edades, contexturas, pelo, barba, tonos de piel; **la camiseta separada como máscara tintable**. Mínimo para no repetir caras en un plantel de 15: ~6 bases × 6 pelos × 4 barbas, o 24+ retratos enteros | Todo el juego: `Busto`/`FilaDePie` (Tablero, Convocatoria, Informe, Partido, Rankings, Historia, Pretemporada, Eventos), `Avatar` (planillas), ficha (escala L) | 1024×1024, WebP con alfa, mismo registro | — | Receta por `appearance` del jugador; Etapa 4 punto 5. Brief existente: `design/arte/BRIEFS/2026-09-08-puerta3-lamina-por-capas.md` |
| `bg-tablero-v01` | Escena del Tablero | Tablero · `ESCENA.tablero` | 2560×1440 WebP | Izquierda (héroe y CTA) y franja inferior (fila de pie sobre la línea del piso) tranquilas; arriba-derecha lleva el panel "Esta semana" | Manifiesto; reemplaza `fondo-gimnasio` espejado |
| `bg-partido-v01` | Escena del partido en vivo | Partido · `ESCENA.partido` | 2560×1440 WebP | Casi toda tapada: marcador arriba al centro, planillas a los costados, cancha y relato al centro. Se ve entre módulos y arriba | Reemplaza `cab-partido` |
| `bg-postpartido-victoria-v01` / `-derrota-v01` | Informe según resultado | Informe · `escenaDe` | 2560×1440 WebP, **mismo encuadre las dos** | Mitad derecha (resultado, figura) y franja inferior (vestuario, CTA) | Reemplaza `vestuario-bg` / `cab-derrota` en el Informe |
| `logo-v01` | Logo del juego | Portada (`Portada.tsx:107`), cabecera de la ventana, tienda | SVG + PNG 2048 | — | Reemplaza el título en texto |

**P1 — deseable para V1.0, en este orden**

| id | Qué | Dónde | Dimensiones | Zona libre | Reemplaza |
|---|---|---|---|---|---|
| `bg-previa-v01` | Gimnasio antes del partido | La semana / Convocatoria | 2560×1440 | Franja central (próximo partido) y tercio inferior | Gimnasio velado |
| `bg-quinteto-v01` | Pizarra / vestuario antes de salir | Quinteto | 2560×1440 | Centro (cancha táctica), columna izquierda (lista) | `fondo-cancha` |
| `bg-pretemporada-v01` | Sede o bar del fichaje | Pretemporada y su cierre | 2560×1440 | Héroe arriba-izquierda; el resto tapado por planillas | `cab-bar` |
| `bg-liga-v01` | Cartelera del club con fixture | Liga, Calendario, Rankings | 2560×1440 | Casi toda tapada (densidad primero); se ve en márgenes | `cab-arbitros` |
| `bg-club-v01` / `bg-finanzas-v01` / `bg-historia-v01` | Sede/cantina · mesa de la comisión · vitrina | El club · Finanzas · Historia | 2560×1440 | Franja superior 20–30% visible (patrón del Vestuario) | `cab-comision` |
| `bg-fin-temporada-v01` (+ variante campeón) | Cierre de temporada | `SeasonEndScreen` | 2560×1440 | Igual que el Informe | `cab-comision` |
| `rt-dt-*` | 3–5 retratos de DT, delegado, comisión | Cuerpo técnico, previa, eventos | Mismo sistema que los jugadores | — | SVG de respaldo |
| `app-icon-v01` | Ícono de la app | Ventana, barra de tareas, Steam | 1024 PNG → ICO | — | `favicon.svg` |

**P2 — si sobra tiempo, o V1.x**

| id | Qué | Dónde |
|---|---|---|
| `ev-*` | 3 ilustraciones de evento representativas (Puerta del pipeline: aprobar 3 antes de escalar) | `EventModal` |
| `tr-*` | Copa de Oro, Copa de Plata, ascenso, como objetos | Historia, fin de temporada |
| `bg-carrera-1..3-v01` | Las tres escenas de la intro de la Carrera | `CareerSetup` (hoy reusa `cab-derrota`, `cab-bar`, `fondo-gimnasio`) |
| `cancha-v01` | Parquet de cancha como textura (hoy gradiente CSS) | Partido y Quinteto |
| Cuerpo entero | Héroe en la ficha (`FichaDePie`) | Ficha del jugador |

**Tienda de Steam** (sólo si D-01 dice que la V1.0 sale en Steam; las medidas hay que
reconfirmarlas en la documentación de Steamworks al momento de subir): header capsule
920×430, small capsule 462×174, main capsule 1232×706, vertical capsule 748×896, library
capsule 600×900, library hero 3840×1240, library logo 1280×720 (PNG con alfa), page background
1438×810, 5+ capturas 1920×1080. Las capturas las genera Claude desde el juego.

---

## 7. Backlog

Formato: **id · título** — prioridad · depende de · criterio de aceptación · tests.
P0 = bloquea la V1.0 · P1 = deseable para V1.0 · P2 = si sobra tiempo.

### Estabilidad y ciclo

| id | Tarea | Prio | Depende | Criterio de aceptación objetivo | Tests |
|---|---|---|---|---|---|
| P0-01 | "Empezar de cero" lleva a Nueva partida (elige modo y dificultad) en vez de crear Atlético El Parque | P0 | — | Desde `SeasonEndScreen` en Carrera/Difícil se llega a la pantalla de Nueva partida; no se crea un estado sin elección | Test del reducer: `NEW_GAME` sin parámetros no se despacha desde la UI (o recibe modo y dificultad); recorrido e2e |
| P0-02 | Sponsor, eventos agendados y demás estado vivo cruzan el verano (o se cierran con noticia) | P0 | — | Un sponsor con semanas pendientes sigue en la pretemporada o aparece una noticia que lo liquida; ningún campo de la lista §2.2 se pierde en silencio | Test en `pretemporada.test.ts` por campo; el fuzz compara claves antes y después de `NEW_SEASON` |
| P0-03 | Quiebra coherente en el cierre: rojo en la última fecha cuenta, aportes de la comisión con tope por carrera | P0 | D-04 | Con la caja en rojo dos semanas seguidas, incluida la del cierre, hay quiebra; la comisión no tapa más de N veces | Tests en `economia.test.ts`; `npm run sim` sin cambios fuera de ±1 quiebra |
| P0-04 | Liberar jugador (acción del plantel con costo social) y tope de plantel único | P0 | D-05 | Se puede dar de baja en pretemporada y temporada; el mercado, la libreta y "Reclutar" respetan el mismo tope | Tests del reducer; fuzz incluye liberar |
| P0-05 | Desempate por enfrentamiento directo y evaluación con el tamaño real de la liga | P0 | — | Empate total no favorece al club; el último de una liga de 8 no suma deportivo | Tests unitarios de `tableOf`/`seedingOrder` y `computeSeasonEvaluation` con 8 y 10 equipos |
| P0-06 | Guardado: respaldo antes de migrar o pisar, mensaje viejo / futuro / roto, export e import a archivo | P0 | — | Al migrar queda `…-backup`; la portada distingue los tres casos; se puede exportar un `.json` y volver a cargarlo | `guardado.test.ts`: los tres mensajes, respaldo, ida y vuelta por export; fuzz pasa cada estado por `loadGame` |
| P0-07 | Tests de migraciones viejas (v2→v20) con saves de muestra, o decidir cortar soporte | P0 | D-06 | Cada save de muestra migra hasta la versión actual y juega una fecha | `guardado.test.ts` |
| P0-08 | Harness de 10 temporadas con el plantel propio (`sim:carreralarga`) en CI | P0 | — | Reporta por temporada: victorias, técnica media del plantel, caja, divisional; corre en CI en corto | El harness mismo, con umbrales que fallan el CI |
| P0-09 | Recorrido e2e en navegador (Playwright) en CI: fundar, 1 temporada, cierre, temporada 2 | P0 | D-02 | Corre en <5 min, sin errores de consola, captura cada pantalla a 1440×900 y 1366×768 | El recorrido mismo |
| P0-10 | Reclutas sin colisión de nombres (pool generado) y búsquedas por id | P1 | — | 20 temporadas de fuzz sin nombres repetidos en el plantel activo | Invariante nuevo en el fuzz |
| P0-24 | Fichar con pase libre no exige caja positiva | P0 | — | Con caja negativa y costo 0 el fichaje se cierra; el texto nunca dice "necesitás $0" | Test en `pretemporada.test.ts`; patrón "$0)" en el fuzz |
| P0-25 | Una sola cifra de cuotas al día (pie, Finanzas, cuenta de la semana) y un solo monto de fiado | P0 | — | Las tres pantallas muestran el mismo número en la misma semana, con la misma definición (becados aparte) | Test que compara los tres cálculos |
| P0-26 | Textos: frase rota del cierre, nombres propios en minúscula, "$-17" → "-$17", "arrancaste con $0" | P0 | — | Ningún caso en 20 partidas de fuzz | Patrones nuevos en `scripts/fuzz.cjs` |
| P0-27 | Después de un game over la portada no ofrece "Continuar" como acción principal | P0 | — | El CTA de la portada es "Nueva partida" con un save terminado | e2e |
| P1-15 | Apellidos sin repetir dentro del plantel, o nombre corto desambiguado ("R. García") donde se muestra sólo el apellido | P1 | — | Ningún plantel con dos apellidos iguales mostrados igual | Invariante en el fuzz |
| P1-16 | Sin choque de colores: ningún rival de la liga del usuario con su mismo par; aro rival legible | P1 | P1-09 | Ningún partido con los dos escudos del mismo par | Test en `mundo.test.ts` |
| P1-17 | Mundo distinto entre carreras (semilla por partida) | P1 | — | Dos carreras nuevas no comparten rival de la fecha 1, árbitro e incidencia | Test con dos semillas |
| P1-18 | La sugerencia del quinteto respeta las promesas de titularidad | P1 | — | Con promesa vigente y el jugador disponible, la sugerencia lo pone de titular | Test en `rotacion.test.ts` |
| P1-19 | 1280×720: nombres del partido y pie del Quinteto sin tapar contenido; modal de negociación no queda bloqueado por la ficha | P1 | — | e2e a 1280×720 sin elementos ocultos | e2e |
| P1-20 | Los 10 pares de colores con nombre; evaluar selector libre | P1 | — | Ningún tooltip "Colores" | — |

### Partido y consecuencias

| id | Tarea | Prio | Depende | Criterio de aceptación objetivo | Tests |
|---|---|---|---|---|---|
| P0-11 | El "día" de cada jugador entra en la fuerza del equipo (o deja de mostrarse como accionable) | P0 | D-03 | Con todo igual, un quinteto con el día alto anota más que uno con el día bajo (medido en 1.000 tramos); las unidades "cerradoras" cambian el resultado esperado | Test en `tramos.test.ts`; `npm run sim` vuelve a objetivo |
| P0-12 | `manualBreak` sólo se activa con cambios hechos en el descanso | P0 | — | Un cambio en el tramo 3 no cancela la unidad programada del cuarto siguiente | Test en `rotacion.test.ts` |
| P0-13 | Pronóstico del quinteto y claves del informe con el mismo modelo que el motor | P0 | P0-11 | El pronóstico "superior" gana ≥ 60% de las veces en sim; ninguna clave dice "nivel a favor" cuando el motor tuvo el ataque en contra | Test que compara pronóstico y `fuerzas()`; tabla en `sim` |
| P0-14 | El minuto pedido con efecto legible | P1 | — | Efecto medible (≥1 punto esperado) y escrito en el relato | Test en `tramos.test.ts` |
| P0-15 | Remontadas en objetivo (~5% propias, 7–10% en contra): un umbral, déficit medido por tramo | P1 | P0-11 | `npm run sim` en banda en 80 temp. | Sim |
| P1-01 | Decisiones del 4° cuarto (última posesión, falta para parar el reloj) | P1 | P0-11 | Aparecen en partidos a ≤ 6 puntos en los últimos 2 minutos | Tests de incidencias |
| P1-02 | Alargue jugado por tramos | P1 | — | Puede haber más de un alargue; usa piernas, faltas y lesiones | Tests de tramos |
| P1-03 | Táctica previa al salto inicial | P1 | — | La defensa y el ataque se eligen en el Quinteto y se respetan en el Q1 | Test del reducer |
| P1-04 | Incidencias y acciones de la semana medidas en el simulador | P1 | P0-08 | `sim` reporta con y sin incidencias | Sim |

### Gestión y progresión

| id | Tarea | Prio | Depende | Criterio | Tests |
|---|---|---|---|---|---|
| P0-16 | Progresión visible: resumen del verano (quién mejoró, quién declinó, retiros) y la valoración visible deja de saltar sin causa | P0 | P0-08 | La pretemporada muestra los cambios de técnica; `visibleRating` sólo se mueve con la técnica real o con el conocimiento | Tests de `startPreseason`: envejecimiento, evolución, retiros |
| P0-17 | El entrenamiento muestra su efecto (en la semana y en la ficha) | P0 | — | Después de entrenar, la ficha anota "+1 técnica (entrenamiento)" cuando sube; el informe semanal lo dice | Test de la mejora de técnica |
| P1-05 | Entrenamiento con foco (tiro / defensa / físico) | P1 | P0-17, D-07 | El foco cambia lo que se entrena y se ve en el partido | Tests + sim |
| P1-06 | Meta de largo plazo y su pantalla | P1 | D-07 | El juego registra hitos (ascensos, títulos, temporadas) y los muestra; la decisión sobre "final" está tomada | Tests de hitos |
| P1-07 | Identidad del club: escudo elegible (reroll de variantes), más colores, nombre validado, año de fundación coherente | P1 | — | En la fundación se ven ≥ 6 escudos para elegir; no se puede repetir el nombre de un rival | Tests de `crest.ts` y de la Carrera |
| P1-08 | Promesa `sin_entrenar` con efecto | P1 | — | Si el jugador entrena con esa promesa, cuenta como rota | Test en `conducta` o nuevo `promesas.test.ts` |
| P1-09 | Colores de rivales sin repetir dentro de una liga | P1 | — | Ninguna liga tiene dos clubes con el mismo par | Test en `mundo.test.ts` |
| P2-01 | Fuerza rival construida desde sus jugadores | P2 | — | — | — |

### Arquitectura de assets y UI

| id | Tarea | Prio | Depende | Criterio | Tests |
|---|---|---|---|---|---|
| P0-18 | Manifiesto único de arte + fallback + test de existencia | P0 | — | Las pantallas se ven igual que hoy (capturas comparadas); `tests/arte.test.ts` falla si falta un archivo o se pasa de peso | `arte.test.ts` |
| P0-19 | Componente único de cara (reemplaza las seis) | P0 | — | Capturas iguales a las de hoy en las 22 pantallas | Recorrido e2e |
| P0-20 | Retrato por capas con camiseta tintable (preparado con capas de prueba hechas en código, sin arte nuevo) | P0 | P0-19 | Con una máscara de prueba, los bustos de dos clubes con colores distintos se ven distintos; sin capas sigue el `p-*.webp` | Test de la receta por `appearance`; capturas |
| P0-21 | PNG fuente fuera de `public/` | P0 | — | `dist/` pesa ~7,7 MB menos; nada se borra del repo | Build |
| P0-22 | Opciones mínimas: pantalla completa, volver al menú, y la base para audio | P0 | D-01 | Un menú de opciones accesible desde el juego y la portada | e2e |
| P1-10 | Escenas en `image-set()` 1920/2560 | P1 | P0-18 | En 2560×1440 se sirve la de 2560 | Captura a 2560 |
| P1-11 | Partido: corte de la columna izquierda a 1440×900, aro rival legible con colores claros | P1 | — | Sin elementos ocultos a 1440×900 y 1366×768 | e2e con chequeo de recorte |
| P1-12 | Emojis fuera de los textos del motor: el tipo de línea viaja como dato | P1 | — | Ningún texto del motor empieza con emoji; la UI no detecta por emoji | Invariante nuevo en el fuzz |
| P1-13 | Partir el chunk del juego (702 kB) | P1 | — | Chunk inicial < 500 kB | Build |
| P1-14 | Atajos de teclado en eventos y pretemporada; animaciones del Art Bible §15 | P1 | — | — | e2e |
| P2-02 | Consolidar `styles.css` y los hex sueltos en tokens | P2 | — | — | Capturas iguales |

### Documentación

| id | Tarea | Prio | Criterio |
|---|---|---|---|
| P0-23 | README, ROADMAP (cifras de tests viejas: "61", "115"), `ASSET_REGISTRY.md`, `public/arte/LEEME.md`, `ART_PIPELINE.md` (Tablero ya implementado, UI V1 aprobada) | P0 | Ningún documento contradice el código; el ROADMAP apunta a este plan |

---

## 8. Etapas

Cada etapa sale en su rama, se prueba sola, y termina con build + tests + sims + fuzz en
verde y capturas a 1440×900 y 1366×768. Nada va a `main` sin el OK de Gabi.

| Etapa | Contenido | Cómo se prueba | Arte que necesita |
|---|---|---|---|
| **0 · Red de seguridad** | P0-08 (sim de 10 temporadas), P0-09 (e2e, si D-02), P0-07 (migraciones), P0-23 (docs) | Las herramientas nuevas corren en CI y dan la línea de base | Nada |
| **1 · El ciclo no se rompe** | P0-01, P0-02, P0-03, P0-05, P0-06, P0-10, P0-24 a P0-27 | e2e: fundar → 3 temporadas → empezar de cero; tests nuevos | Nada |
| **2 · El partido dice la verdad** | P0-11, P0-12, P0-13, P0-14, P0-15 | `sim` antes/después en la misma tabla; tests de tramos | Nada |
| **3 · La gestión se ve** | P0-04, P0-16, P0-17, P1-07, P1-08, P1-09, P1-15 a P1-18, P1-20 | sim de 10 temporadas en banda; e2e de liberar y de fundar con escudo elegido | Nada |
| **4 · Listo para recibir arte** | P0-18, P0-19, P0-20, P0-21, P0-22, P1-10 | Capturas idénticas a las de hoy (no cambia lo que se ve); `arte.test.ts` | Capas de prueba hechas en código |
| **5 · Arte V1** (en paralelo desde que arranca la Etapa 4) | Integración de P0 de §6.2, después P1 | Capturas a 1440, 1366 y 2560; Gabi aprueba cada lote | Lo de §6.2 |
| **6 · Profundidad deseable** | P1-01 a P1-06, P1-11 a P1-14, P1-19 | Tests y sim | Lo P1 restante |
| **7 · Release candidate** | Partida completa a mano en los dos modos y tres dificultades, 5 temporadas; corrección de lo que aparezca; `npm audit`; versión 1.0.0 en `package.json` | Checklist de §9 | — |

**Orden recomendado**: 0 → 1 → 2 → 3 → 4, con el arte (Etapa 5) empezando en paralelo en
cuanto Gabi y ChatGPT definan el estilo de los retratos; la 6 se recorta según el tiempo.
Las etapas 1, 2 y 3 son independientes entre sí salvo P0-13 → P0-11, y se pueden reordenar.

---

## 9. Criterios de salida de la V1.0 (checklist final)

- [ ] `npm run build`, `npm test`, `npm run sim`, `sim:carrera`, `sim:ligas`, `sim:notas`, `fuzz` y el e2e en verde en CI.
- [ ] Sim de 10 temporadas: ninguna temporada con victorias fuera de 25–75% de media; quiebras < 5% sin gestión; el plantel no se desarma ni se vuelve imbatible.
- [ ] Todos los objetivos de `BALANCE.md` en banda o con una decisión registrada.
- [ ] Partida a mano, Carrera en Difícil: fundar, inscribirse, 1 temporada completa, playoffs, 4 temporadas más. Sin errores de consola. Lo mismo en Club en marcha / Fácil.
- [ ] Recargar en cada fase (pretemporada, semana, en vivo, informe, cierre) y continuar.
- [ ] Un save de la versión publicada hoy (v24) carga en la V1.0.
- [ ] Ninguna pantalla principal con escena prestada (Tablero, Partido, Informe); ningún plantel de 15 con dos caras iguales; los jugadores visten los colores del club.
- [ ] Ningún documento del repo contradice el estado del juego.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La progresión entre temporadas no aguanta (el club arrasa o se desarma en la T4+) | Alto: rompe "seguir jugando" | P0-08 primero; ajustar con números de `balance.ts`, no con sistemas nuevos |
| Meter el "día" en la fuerza mueve todo el balance | Medio | Hacerlo con sim antes/después y perillas; D-03 permite elegir "sacarlo de la UI" |
| El arte por capas generado por IA no calza entre capas | Alto para el punto 7 del alcance | La prueba de registro del brief (≈12 créditos) antes de producir; plan B: retratos enteros + máscara de camiseta por retrato |
| El arte llega tarde | Medio | Las etapas 0–4 no dependen del arte; la Etapa 4 deja todo listo para soltar archivos |
| Saves de jugadores actuales | Medio | Respaldo antes de migrar (P0-06), migración con test por cada versión nueva (regla del CLAUDE.md) |
| Alcance que crece (seguir sumando eventos, voces, sistemas) | Alto | Este plan como límite: lo que no está en §4.1–4.2 va a §4.3 |
| Steam pide guardado en archivo y ventana nativa | Alto si la V1.0 es Steam | D-01; la capa de guardado abstracta (Etapa 4) evita reescribir |
| Vulnerabilidades en dependencias de desarrollo | Bajo (no viajan al juego) | Actualizar Vite/Vitest en la Etapa 7 con build y tests |

---

## 11. Decisiones que necesitan a Gabi

| id | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D-01 | ¿La V1.0 es la versión web completa o ya el build de Steam? | (a) V1.0 web, Steam como V1.1 con su propia etapa · (b) Steam dentro de la V1.0 | **(a)**: cerrar el juego primero; la arquitectura queda lista |
| D-02 | Playwright como dependencia de desarrollo para el e2e en CI | Sí / No | **Sí**: es la única forma de afirmar "jugado" sin pedírtelo cada vez |
| D-03 | El "día" de cada jugador | (a) entra en la fuerza · (b) se saca de la UI como accionable | **(a)**, con sim antes/después |
| D-04 | Tope de aportes de la comisión | 1 por temporada · 2 por carrera · otro | 1 por temporada, y el segundo rojo seguido quiebra también en el cierre |
| D-05 | Tope de plantel | 14 · 15 · sin tope | **15**, el mismo que ya usa "Reclutar" |
| D-06 | Soporte de saves viejos | Todas las versiones · desde v20 | Desde v20 (lo publicado desde sep), con respaldo y mensaje claro para los anteriores |
| D-07 | Meta de largo plazo | Sin final (sandbox con hitos) · final por objetivo (Divisional A / título) · despido del manager | Sandbox con hitos visibles para la V1.0; despido y final como V1.x |
| D-08 | Qué es "la UI gris perla" | La UI V1 actual (Paleta A, azul noche con texto gris perla) · volver a paneles claros | La UI V1 actual, sin rediseño |
| D-09 | Retratos: capas o retratos enteros con máscara de camiseta | Capas (brief de la Puerta 3) · enteros + máscara | Decide arte; el código soporta las dos (P0-20) |
| D-10 | Qué arte existente queda como definitivo y cuál se reemplaza | Por asset | Decide arte; Claude no reemplaza nada sin aprobación |
| D-11 | Audio en la V1.0 | Sin audio · ambiente y efectos mínimos | Mínimo (ambiente de gimnasio, silbato, bocina, público) si D-01 es Steam |
