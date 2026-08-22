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

## Sprint 3 — Que el meta cobre ⬜

- ⬜ 3.1 Objetivos de comisión en `computeSeasonEvaluation` + reacción de la comisión en la semana 5.
- ⬜ 3.2 Cerrar el ciclo de la queja de plata (becar apaga 'plata'; `cuota_impaga` anota; cobrar al día suelta 'hechos').
- ⬜ 3.3 Egos que crecen ganando (racha 3+ → protagonistas/mercenarios suben exigencias, reusa `grievance`).
- ⬜ 3.4 Cooldown de eventos en pretemporada + re-sorteo cuando `pickTargets` da null.
- ⬜ 3.5 Ausencia laboral ≠ estado 'lesionado' ("recibió el alta" por horas extra).
- ⬜ 3.6 Hub muestra el partido de playoffs (hoy: "Semifinales · Sin partido esta semana").
- ⬜ 3.7 Textos del mercado: separar "viene de <club>" de la situación ("Trabaja de noche").
- ⬜ 3.8 Excusas del asado sin repetir en la misma lista.

## Sprint 4 — Que se vea como un solo juego ⬜

- ⬜ 4.1 Una cara por jugador (tira del Hub → Avatar SVG hasta tener set ilustrado por seed).
- ⬜ 4.2 Una sola escala de nivel por fila (≈ + estado; estrellas solo con scouting grueso).
- ⬜ 4.3 Purga de emojis de cromo → `Icon.tsx`.
- ⬜ 4.4 Planilla ordenable + rankings completos ("quién juega poco" en 2 clicks).
- ⬜ 4.5 Vocabulario emoción ≠ estado ("masticando bronca" nivel 1 / "molesto" accionable).
- ⬜ 4.6 Pasada CSS de un día (radios 4px, ~8 tamaños, banda de sección por clase, naranja reservado).
- ⬜ 4.7 Cerrar la Puerta 2 de `ART_PIPELINE.md` + marcar `DESIGN.md` superseded.

## Sprint 5 — La apuesta: personas en el mundo ⬜

- ⬜ 5A Identidad estable: ids de persona (no slots), `world.players` persiste entre temporadas, identidad institucional rival congelada (`seedFromString(clubId)`).
- ⬜ 5B El mundo vive: rotación anual 10-20% con noticias de pases, retiros, pirámide de edades, arquetipos de plantel.
- ⬜ 5C Conocimiento por persona + mercado alimentado por el mundo.

## Checklist de salida ("versión jugable sin debilidades")

1. ⬜ Imposible bloquearse: los 2 P0 muertos (✅) + una temporada simulada completa sin excepciones (✅ hoy) — falta re-verificar tras cada sprint.
2. ✅ Notas honestas: media ~6.9, banda 4-6 viva, un 9 significa algo.
3. 🔶 Cero frases repetidas en un mismo partido (✅ en el vivo) — pantallas de informe/asado quedan para el Sprint 3.
4. ⬜ En una partida ganadora típica, al menos un objetivo y un ego generan tensión real en la 2ª mitad.
5. ⬜ En la T2 reconocés rivales por nombre y cara; la T3 no se parece a la T1.
6. ⬜ Una sola cara por jugador; cero emojis de cromo.
7. ✅ `npm run sim` como vara tras cada sprint (objetivos actualizados en `BALANCE.md`, 2ª pasada).
