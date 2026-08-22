# Plan de acción — de la auditoría a una versión jugable sin debilidades

Sale de [`AUDITORIA_INTEGRAL_2026-08.md`](AUDITORIA_INTEGRAL_2026-08.md). Cinco sprints
ordenados por dependencia: primero que nada se rompa, después que los números digan la
verdad, después que el meta cobre, después que se vea como un solo juego, y al final la
apuesta grande (memoria del mundo). **Regla innegociable**: después de cada sprint,
`npm run sim` (y ahora `npm run sim:notas`) tienen que sostener los objetivos de
[`BALANCE.md`](BALANCE.md).

Estado: ✅ hecho · ⬜ pendiente

## Sprint 0 — Red de seguridad

- ✅ 0.2 Save de versión desconocida → aviso en el menú, nunca borrado silencioso (`storage.ts` `saveStatus()`, aviso en `App.tsx`).
- ✅ 0.3 `npm run sim:notas`: harness de distribución de la nota del partido por franja de minutos (`scripts/sim-notas.cjs`). Baseline medido antes de recalibrar: media de titulares 8.21, notas 1-5: 1.1%, notas 9-10: 42.1%.

## Sprint 1 — Que nadie pierda por la UI ✅

- ✅ 1.1 **Forfeit trampa**: `sanitizeLineup()` repara titulares/rotación tras cualquier cambio de disponibilidad (descansar a un fundido, gestión de ausencia, evento) y se aplica en el reducer (`CALLUP_ACTION`, `CALLUP_EXHAUSTED`, `PROCEED_TO_LINEUP`, `START_MATCH`). El forfeit ahora es solo no juntar 5 en la planilla (`startLiveMatch` mira los presentes, no los titulares).
- ✅ 1.2 **Soft-lock de llegadas tardías**: con 5 disponibles y alguno que "llega al 2do tiempo" ya no queda el botón muerto: se arranca corto (aviso en la pizarra + chip 🕘), el que llega tarde entra recién en el 3er cuarto (`lateIds` en el partido en vivo, `canEnterCourt()` en cambios/presets/DT/lesiones) y la cancha se completa sola apenas se puede.
- ✅ 1.3 El cambio forzado por técnica chequea que el que entra esté sano y habilitado (`narrative.ts`): un lesionado del mismo partido ya no puede reingresar.
- ✅ 1.4 **Caja en rojo en pretemporada**: aviso en la cabecera (`PreseasonView`) y, al cerrar, la comisión tapa el rojo con el costo de favores de siempre (`closePreseason`): nunca más entrar a la fecha 1 ya quebrado sin saberlo.
- ✅ Bonus: los que llegan al 2do tiempo ya no se sugieren como titulares (`confirmActions`/`resolveEvent` usan `noStartIds`), y el chip de táctica del relato ya no muestra "Zona" cuando se jugó presión.

## Sprint 2 — Que el partido diga la verdad ✅

- ✅ 2.1 **Nota recalibrada** (`BALANCE.rating` + `rating.ts`): tope por minuto 0.78→1.0, base 3.0→2.4, pendiente 7.2→5.6. Medido con `sim:notas` (20 temporadas): media de titulares **8.21 → 6.87**, notas 1-5 **1.1% → 17.5%**, notas 9-10 **42.1% → 8.2%**, el 10 queda como partido de leyenda. El 9 vuelve a significar algo.
- ✅ 2.2 **Confianza sin trinquete**: los titulares descuentan con nota ≤4 (antes ≤3, inalcanzable); el banco se mide con la vara de su rol (6+ suma).
- ✅ 2.3 **Claves coherentes con el resultado**: cada clave declara qué explica (`pro`/`contra`) y se filtran por resultado — nunca más una derrota por 13 con tres elogios.
- ✅ 2.4 **Relato sin eco**: pools de 2-3 variantes + `freshLiveNote()` (ninguna nota de color se repite en el mismo partido; si el pool se agota, el relato calla). Cubre química, defensa, posiciones sin cubrir, momentum, rachas y las técnicas (que además ya no le tocan siempre al mismo calentón: se sortea entre los que están en cancha).
- ✅ 2.5 **Frases coherentes con los minutos**: el frustrado que jugó ya no dice "de saco y corbata" (las voces por arquetipo quedan para el que quedó afuera).
- ✅ 2.6 **Informe completo**: el relato del informe ya no se corta en el 2do cuarto (cap de 6 líneas eliminado; el dedupe se mantiene).
- ✅ 2.7 **Techo blando del ánimo** (`moraleSoftcapSpan`/`MinFactor`): ganar seguido ya no clava al plantel en 🔥99; las derrotas pegan enteras.

**Validación del sprint**: `npm run build` limpio · `sim:notas` en objetivo · `npm run sim`
(ver nota de la 2ª pasada en `BALANCE.md`: el win% del piso baja unos puntos al morir el
trinquete de confianza; los objetivos se actualizan ahí con el porqué).

## Sprint 3 — Que el meta cobre ✅

- ✅ 3.1 **Objetivos con dientes**: `settleObjectives()` al pasar a seasonEnd (cumplido: +2 prestigio social +1 deportivo con noticia; fallado: −3/−1, noticia y asiento en la historia del club; línea extra si salen 3/3), `midSeasonObjectiveCheck()` en la semana 5 (la comisión pasa por el entrenamiento y dice cómo viene cada encargo), dimensión "Objetivos de la comisión" en `computeSeasonEvaluation`, y aviso en el radar de inicio (tile Objetivos) desde la semana 3 cuando alguno viene flojo.
- ✅ 3.2 **Ciclo de la queja de plata cerrado**: becar (acción o evento `cuota_impaga` opción beca) apaga la queja 'plata' con hechos; exigir el pago y que se ofenda ahora anota queja de 'trato'; y una red de seguridad semanal en `advanceWeek` apaga 'plata' si el jugador ya quedó becado por cualquier camino.
- ✅ 3.3 **Egos que crecen ganando**: con racha de 3 victorias, un protagonista con <20 minutos en el último partido (chance 50%) o un mercenario que paga cuota completa (30%) levanta la mano — reusa `bumpGrievance` ('minutos'/'plata') con noticia propia; máximo uno por semana. Verificado con test dirigido: 14/30 y 9/30 disparos.
- ✅ 3.4 **Eventos que no se repiten ni se pierden**: la pretemporada registra `preseason.eventLog` y no repite la misma escena en la misma pretemporada (si se agota el pool, se relaja); y `rollEvent`/`rollPreseasonEvent` re-sortean entre los demás eventos cuando el elegido no tiene a quién tocarle (antes la semana quedaba muda). `ausencia_clave` y `mudanza` además tienen fallback de target.
- ✅ 3.5 **Ausencia laboral ≠ lesión**: `injuryReason: 'fisica' | 'laboral'` en el jugador; `ausencia_clave` marca 'laboral' y toda la UI lo cuenta distinto (chip "Laburo (X sem.)", 💼 en la lista, "Sigue a full con el laburo", ficha, Hub y radar), y el alta dice "arregló el tema del trabajo" en vez de "recibió el alta". El ranking de Enfermería no lo cuenta como lesión.
- ✅ 3.6 **Hub muestra el partido de playoffs**: `nextRivalId` lee `schedule[semana-1]` sin el tope de fase regular (advancePlayoffs escribe ahí el rival de semis/final), así el centro del Hub muestra el cruce en vez de "Sin partido esta semana".
- ✅ 3.7 **Origen del mercado bien contado**: `ORIGIN_SITUATIONS` + `originSentence()`/`arrivalLine()` en `market.ts` separan clubes ("Viene de Cilindro Viejo") de situaciones ("Trabaja de noche y juega cuando el laburo lo deja."). Aplicado en las cartas y el perfil del mercado, el modal de negociación, la descripción y timeline del fichado, el log de pretemporada y la ficha ("Antes de llegar" en vez de "Club anterior").
- ✅ 3.8 **Excusas del asado sin eco**: pools de 3 variantes para el confirmado que se cae y el dudoso que no llega, con dedupe dentro de la misma noche.

**Validación del sprint**: `npm run build` limpio · suite funcional de 13 chequeos sobre la
lógica compilada (origen, alta laboral, visita semana 5, cobro al cierre 3/3, dimensión en
la evaluación, egos 14/30 y 9/30) · `sim:notas` estable (media 6.91 · 1-5: 15.0% · 9-10:
8.2%) · `npm run sim -- 120` sin cambios de balance (presión 52.4% / mixta 50.3% / zona
42.6%, abandonos 0.00/0.88/1.76) · smoke test en navegador sin errores de consola y con
los textos nuevos del mercado a la vista.

## Sprint 4 — Que se vea como un solo juego ⬜

- ⬜ 4.1 Una cara por jugador (tira del Hub → Avatar SVG hasta tener set ilustrado por seed).
- ⬜ 4.2 Una sola escala de nivel por fila (≈ + estado; estrellas solo con scouting grueso).
- ⬜ 4.3 Purga de emojis de cromo → `Icon.tsx`.
- ⬜ 4.4 Planilla ordenable + rankings completos ("quién juega poco" en 2 clicks).
- ⬜ 4.5 Vocabulario emoción ≠ estado ("masticando bronca" nivel 1 / "molesto" accionable).
- ⬜ 4.6 Pasada CSS de un día (radios 4px, ~8 tamaños, banda de sección por clase, naranja reservado).
- ⬜ 4.7 Cerrar la Puerta 2 de `ART_PIPELINE.md` + marcar `DESIGN.md` superseded.

## Sprint 5 — La apuesta: personas en el mundo ✅

- ✅ **5A Identidad estable**: los jugadores del mundo tienen id de persona de por vida (`wp_n<seq>`, contador que nunca se reusa) y `clubName` como vínculo persistente — la clave estable es el NOMBRE del club, porque los slots (`r1`/`o1`) se reasignan con los ascensos. `world.players` persiste entre temporadas: `buildWorld` hereda el pool y solo registra/completa (medido: **91% de caras repetidas** por plantel en la T2). La identidad institucional está congelada con `seedFromString(nombre)` (`clubIdentity()`): colores, fundación, delegado, barrio del gimnasio, DT y carácter del plantel no cambian de temporada a temporada ni dependen del slot. Saves viejos: el primer verano rescata el club de cada persona desde su ficha (93% anclados en el test; en un save real los ids matchean exacto).
- ✅ **5B El mundo vive** (`evolveWorldOffseason`, corre en `startPreseason` antes del mercado): todos envejecen con curva de nivel por edad (los pibes crecen, los de 34+ caen), retiros por edad/nivel (con noticia si el nombre pesa), **pases entre clubes** con noticia ("Pase del verano: X deja Y y jugará en Z"), agentes libres, y los **ex jugadores del club del usuario emigran al mundo** ("X apareció con la camiseta de Z. El básquet es un pañuelo") — te los volvés a cruzar. La renovación entra por juveniles (82% de ≤24 medido), la pirámide de edades queda sana (media ~28, rango 18-39) y cada club tiene **arquetipo de plantel** (juvenil / veterano / estrella / parejo, parte de su identidad congelada). Rotación anual resultante: ~15-20% del pool cambia de camiseta o se va.
- ✅ **5C Conocimiento por persona + mercado real**: `timesFaced` cuenta cuántas veces cada persona pisó la cancha contra vos y **persiste entre temporadas** (88 conocidos tras una temporada). El scouting achica el ruido por familiaridad (3+ cruces = lo conocés exacto, juegue donde juegue), y el perfil muestra "Lo enfrentaste N veces" y "En el equipo desde la temporada X". El **mercado se alimenta del mundo**: hasta 6 agentes libres reales por pretemporada, con club de origen verdadero (clickeable si es rival), conocimiento según cuánto lo enfrentaste y su agenda real de siempre; ficharlo lo saca del pool (el mundo no duplica personas) y el mercado ya no ofrece nombres que ya están en tu plantel.
- ✅ **Balance re-anclado**: los planteles con arquetipos son más parejos y se degradan menos cuando les falta gente — el multiplicador de convocatoria rival subió +1.1% en promedio y el piso de victorias caía ~2-4 pts sin que nadie lo decidiera. `BALANCE.world.rivalModRecenter` (0.989) lo devuelve a la media con la que se calibró todo (validado con corridas de 240 temporadas).

## Checklist de salida ("versión jugable sin debilidades")

1. ⬜ Imposible bloquearse: los 2 P0 muertos (✅) + una temporada simulada completa sin excepciones (✅ hoy) — falta re-verificar tras cada sprint.
2. ✅ Notas honestas: media ~6.9, banda 4-6 viva, un 9 significa algo.
3. ✅ Cero frases repetidas en un mismo partido (vivo, Sprint 2) ni en un mismo asado (Sprint 3).
4. 🔶 Objetivos y egos con dientes (✅ mecánica del Sprint 3) — falta confirmarlo en una partida jugada de verdad: que la tensión se sienta, no solo que exista.
5. ✅ En la T2 reconocés rivales por nombre y cara (91% de caras repetidas, identidad de club congelada); la T3 no se parece a la T1 (rotación 15-20% con noticias). Falta que Gabi lo sienta jugando.
6. ⬜ Una sola cara por jugador; cero emojis de cromo.
7. ✅ `npm run sim` como vara tras cada sprint (objetivos actualizados en `BALANCE.md`, 2ª pasada).
