# Auditoría integral — Basket Manager (agosto 2026)

**Metodología.** Equipo multidisciplinario simulado (game design, UX, UI, arte, systems design, database/content, QA, jugador nuevo, jugador hardcore de FM, dirección). Trabajo realizado: **una temporada completa jugada de verdad** en el navegador (pretemporada T1 → 9 fechas → playoffs → título de Copa de Plata → pretemporada T2), un **stress test** de 3 semanas en Difícil con manejo hostil, **cuatro auditorías de código en profundidad** (partido/postpartido, sistemas sociales/economía/meta, mundo/base de datos, UI/CSS/arte), `npm run sim` (40 temporadas × 3 estrategias), **análisis cuantitativo del mundo generado** (1.824 jugadores medidos en 8 seeds, 5 temporadas simuladas para medir persistencia y tamaño de save), y ~40 capturas de pantalla. **No se modificó nada del juego.** Todos los ejemplos citados ocurrieron de verdad en la partida de prueba.

**Nota de alcance (corregida):** la auditoría se hizo sobre el estado actual del juego (Hub-menú, tema claro "club de barrio", escudos, arte, iconos), que **es lo mismo que está publicado en GitHub Pages** — verificado: `origin/main` y la rama auditada apuntan al mismo commit (`e99d67e`). Una versión anterior de este informe afirmaba que lo publicado era el tema oscuro viejo; ese hallazgo salió de una referencia local de `main` desactualizada en el entorno de auditoría y **era incorrecto**. Todo lo demás del informe aplica tal cual: lo auditado es lo que se juega.

---

## 1. Executive Summary

**Fortalezas**

1. **La fantasía está lograda y es única.** En 11 fechas el juego me contó: un base con promesa de titularidad que acumuló 3 técnicas por protestón, se comió una suspensión mirando desde la tribuna, se lesionó "en el trabajo" y faltó a la final por vómitos. Eso no lo tiene ningún otro juego del género.
2. **El ciclo emocional unificado funciona.** Los P0 del informe de testing anterior están genuinamente implementados (verificado en código y en juego): la queja activa escala con semanas ("van 5 semanas con lo mismo"), la charla la baja, los minutos la apagan, y el arco cierra ("Ya no me quedan muchas de estas. Me la voy a guardar." — el Chino, eufórico, tras 5 semanas de bronca y una charla).
3. **La promesa como arco completo existe**: aviso graduado en la pizarra ("sería la primera y se viene la charla"), tolerancia por personalidad, rencor en la renegociación T+1.
4. **La pretemporada es el mejor subsistema del juego**: triage con 3 gestiones, mercado con información imperfecta de 5 niveles, agendas que cruzan con tu día de partido ("⛔ No puede los lunes — justo nuestro día"), elección de liga con trade-off real, cierre con promesas/fortalezas/riesgos.
5. **La escritura es el mejor activo.** Voces por arquetipo que se distinguen tapando el nombre, excusas con carácter, árbitros con fama que modulan el partido, "no era la copa grande, pero es una vuelta olímpica igual".
6. **La disciplina de balance es de estudio serio**: harness reproducible, objetivos documentados, números medidos (verifiqué: presión 57.1%, abandonos 0.00 rotando / 1.68 sin rotar — igual que lo documentado).
7. **El Hub nuevo es la mejor pantalla del juego**: navegación por menú con avisos colgados del tile que los resuelve, y la tira del plantel con retratos ilustrados con carácter (el gordo, el viejo, el flaco).
8. **Escudos procedurales de calidad excepcional** (disciplina por tamaño, iniciales derivadas del nombre, estrellas por antigüedad): el patrón oro del proyecto.
9. La **portada del asado** y las cabeceras de escena (vestuario, bar) comunican BÁSQUET+AMATEUR+HUMOR con precisión: hay una dirección de arte candidata real, no un placeholder.

**Problemas principales**

10. **El mundo no tiene personas.** Los 228 jugadores rivales se regeneran enteros cada temporada (medido: 228/228 reemplazados, 0 personas persisten); los ids son slots por equipo y la cara se deriva del slot → la misma cara con otro nombre cada año. Sin personas no hay memoria, ni rivalidad con jugadores, ni scouting acumulable, ni mercado alimentado por el mundo. Es el techo estructural del juego.
11. **Las notas del partido están infladas** (Monte Carlo sobre la fórmula real: media 8.2 para titulares; notas 1-4: 0.0%). Consecuencias en cadena: "decepcionado" casi nunca dispara, la confianza es un trinquete que sube toda la temporada, y un 9 no significa nada.
12. **Dos bugs de alineación pueden bloquear el partido** (verificados en código): descansar a un fundido titular puede forzar un forfeit con banco de sobra, y con exactamente 5 disponibles + llegadas al 2do tiempo el botón de jugar queda deshabilitado para siempre.
13. **Los objetivos de la comisión son decorativos**: se muestran y se tildan, pero la evaluación final no los incluye, no hay premio, castigo ni reacción de la comisión. Prometen y no pagan.
14. **El jugador tiene dos caras**: retrato ilustrado en la tira del Hub, SVG procedural en la ficha/pizarra/eventos. Abrís la ficha del que acabás de clickear y es otra persona.
15. **Repetición narrativa en el partido en vivo**: las notas tácticas son un string fijo por condición ("La pelota se mueve sola…" salió 3 veces en el mismo partido, en varios partidos), y las "claves del resultado" pueden contradecir el resultado (perdimos por 13 y las tres claves eran elogios).
16. **Ganar sin rotar no duele a corto plazo**: en Difícil, jugando con 5 los 40 minutos y sin tocar ninguna acción, salí 3-0. El castigo (broncas, lesiones, abandonos) existe pero llega a un horizonte que una partida corta no ve; y la motivación satura ganando (Techera 🔥99 en la fecha 3).
17. **UX de datos agregados incompleta**: quién falta más, quién juega poco y quién debe se responde solo por los rankings top-5 o leyendo cards una por una; no hay tabla ordenable.

**Estado general**

18. El juego ya **genera historias reales** (conté 4 memorables en una temporada, sin inventar ninguna) y el core loop semanal tiene tensión legible. La base sistémica post-informe-anterior está sólida: el problema ya no es de conexión, es de **persistencia del mundo, calibración y presentación**.
19. **La dirección visual ya está en producción pero formalmente sigue "provisional"** (la Puerta 2 de ART_PIPELINE nunca se cerró): eso frena la expansión de arte (eventos ilustrados, set de retratos) que es justo lo que las pantallas piden.
20. Veredicto de dirección: **prototipo avanzado con alma de juego bueno**; para "10 horas y recomendarlo a un amigo" faltan sobre todo memoria entre temporadas (personas persistentes) y terminar de aplicar la identidad visual que ya existe.

---

## 2. Scorecard

| Dimensión | Nota | Por qué |
|---|---:|---|
| Fantasía del juego | **9** | Única en el género y sostenida por sistemas, no solo por textos: agendas laborales, técnicas, asados, cuotas. La panza todavía no existe (ni como dato ni como dibujo). |
| Core loop | **7** | Lista→quinteto→partido→informe es claro y tiene anticipación (árbitro anunciado, avisos). Pierde: acciones semanales rala tras la fecha 4, castigo tardío al sobreuso. |
| Game Design | **7** | Los sistemas se hablan entre sí (queja↔informe↔radar↔eventos). Contras: objetivos sin dientes, economía sin decisiones en la 2ª mitad, suplementario sin decisión. |
| Profundidad de jugadores | **7** | Los 12+fichados propios: bio, voz, queja, historial, relaciones — muy arriba. Los 228 del mundo: un número y una etiqueta. Promedio engañoso: 9 y 3. |
| Sistemas sociales | **7** | Mood/promesas/asado excelentes. El mapa social es póster: los grupos nunca actúan y la afinidad no pisa la cancha. |
| Partido | **7** | Decisiones reales entre cuartos (presión-apuesta, piernas, incidencias). La táctica pesa menos que la varianza (10 pts de fuerza ≈ 5.5 pts; el azar mueve ±20). Sin localía pese a tener fixture L/V. |
| Postpartido | **7.5** | Planilla con REB/AST (9 asistencias = buena nota, verificado: Silva 11 AST → 9/10), emociones con voz, consecuencias. Lo hunde la inflación de notas y claves incoherentes. |
| Narrativa | **6.5** | Previa con árbitro/rivalidad 🔥 y épica etiquetada, pero strings fijos repetidos en vivo, el relato del informe se trunca en el Q2, y hay frases incoherentes ("de saco y corbata" dicho por el MVP que jugó 30'). |
| Base de datos | **4** | Mundo regenerado por temporada, ids de slot, distribuciones uniformes (edad plana 19-38: rivales "corredores" con cinco de 35), ~12 nombres duplicados por mundo, atributos decorativos (altura, profesión, mano). |
| UX | **7** | "Qué mirar hoy" colgado de los tiles es de lo mejor del género. Faltan: orden/filtro en tablas, rankings completos (top-5 no responde "quién juega poco"), vocabulario emoción≠estado ("Molesto" en el informe / "no hay molestos" en la acción). |
| UI | **7** | Hub y Planilla agrupada muy bien; jerarquía tile/valor/subtexto consistente. Contras: WeekView columna mobile en un juego de PC, tres escalas de nivel conviviendo (≈67 + ★★★★ + 💪🔥), 32 tamaños de fuente, radios mezclados. |
| Dirección de arte | **6.5** | Existe una dirección real (portada, cabeceras, parquet, grafito+naranja), ya en producción y correcta. Formalmente sigue "provisional" (Puerta 2 de ART_PIPELINE sin cerrar), con doble identidad de retratos y 95% de pantallas sin un pixel ilustrado. |
| Identidad visual | **6** | Escudos+Oswald+planilla ya leen "manager de barrio". La diluyen ~75 emojis de cromo y la monotonía de cards blancas dentro de las vistas. |
| Humor | **8.5** | El mejor activo. "Días como hoy son los que le explican a mi mujer por qué juego." Enemigo: repetición (la excusa "quedé muerto del laburo" ×2 en la misma lista de asado). |
| Mundo amateur | **8** | Guardias, sistemas caídos, picados en otros clubes que lesionan, Uber al que trabaja, árbitros con nombre. Falta: profesión→mecánica, cuerpo/panza, multi-equipo humano. |
| Replayability | **5** | La temporada corta ayuda y la T2 hereda plantel/promesas/rencores. Pero el mundo se resetea (rivales amnésicos), una sola liga jugable en serio y objetivos sin variedad real. |
| Claridad | **7.5** | Fases numeradas, hints por fase, frases junto a los números. Contras puntuales: "recibe el alta" por una ausencia laboral, "Semifinales · Sin partido esta semana" con la semi programada. |
| Polish | **6** | El flujo aguantó una temporada completa sin trabarse (gran señal), pero la lista de incoherencias narrativas y textos rotos ("Viene de Trabaja de noche") es larga para un playtest externo. |
| Potencial comercial | **6** | Pitch diferenciado y captable en una imagen (la portada). Para Steam faltan: terminar de aplicar la identidad, memoria entre temporadas, ~10h de contenido con variedad, y decisiones de producto (idioma/localización, nombre). |

---

## 3. Problemas críticos

### P0 — Bloqueante
| # | Problema | Evidencia |
|---|---|---|
| P0-1 | **Forfeit con banco disponible**: descansar a un fundido que era titular sugerido lo vuelve 'ausente' pero no lo saca de `state.starters`; nada re-sugiere y el partido arranca con 4 → forfeit. | `callup.ts:171-176`, `gameReducer.ts:193-196`, `match.ts:351-353` |
| P0-2 | **Soft-lock por "llega al 2do tiempo"**: con exactamente 5 disponibles de los cuales alguno es llegada tardía, no se pueden completar 5 titulares y el botón queda deshabilitado para siempre (los late no pueden ser titulares pero sí cuentan como disponibles). | `WeekView.tsx:594-608,863`, `gameReducer.ts:205-206` |

### P1 — Crítico
1. **Mundo sin personas persistentes** (regeneración anual total + ids por slot + cara pegada al slot). Medido: T1→T2 228/228 reemplazados. Bloquea el ítem del ROADMAP "el conocimiento es de la persona". — `world.ts:241`, `preseason.ts:1014-1015`
2. **Inflación de notas**: `perMin` toca el cap 0.78 casi siempre porque toda la producción se reparte entre 5; media 8.2, banda 1-5 muerta, trinquete de confianza (`lastRating>=7 → +5`). — `rating.ts:35-54`, `match.ts:1026`
3. **Objetivos de comisión sin consecuencias**: no entran en `computeSeasonEvaluation`, nadie los cobra. — `objectives.ts`, `evaluation.ts`
4. **Claves del resultado que contradicen el resultado** (derrota por 13 con 3 claves positivas — pasó 2 veces en 11 fechas). — `match.ts:130-160`
5. **Repetición de strings fijos en el relato en vivo** ("La pelota se mueve sola…" ×3 por partido; "Técnica por protestar" idéntica 2 veces el mismo partido). — `match.ts:693-734`
6. **Doble identidad de retrato** (ilustrado en Hub / SVG en ficha). — `Retrato.tsx` vs `Avatar.tsx`
7. **Motivación satura ganando** (🔥99 en fecha 3; +5 por victoria vs decay -1; el clima ya tiene equilibrio, la motivación no). — `match.ts:1089`, `balance.ts:139`
8. **Sobreexplotar el quinteto no duele a corto plazo** (3-0 en Difícil con 5 jugadores, 40' cada uno, cero acciones). El castigo existe pero a 6+ semanas.
9. **Becar a un caliente por plata no le apaga la queja**: la vuelve a prender a la semana ("caliente por la plata"… el becado). — `actions.ts:263-289` + `week.ts:215`

### P2 — Importante (antes de un playtest externo)
1. Relato del informe truncado: corta en el 2do cuarto y pierde la racha y el parcial del 4to. (Visto en todos los informes de la partida.)
2. Ausencia laboral con estado 'lesionado': "Techera recibe el alta la próxima semana" por un tema de trabajo. — `events.ts:358-359`
3. Hub en playoffs: "SEMIFINALES · Sin partido esta semana" con la semi programada (dos veces: semis y final).
4. Textos rotos del mercado: "Viene de **Trabaja de noche**", "Viene de **Retirado hace un año**", "Viene de **Volvió de estudiar afuera**" (persisten en T2). — `market.ts` (campo origen usado como club)
5. Frase incoherente del frustrado: "Perdimos y yo de saco y corbata" dicho por el MVP que jugó 30' (4 veces en la temporada). El filtro jugó/no-jugó existe para otras emociones pero no acá. — `emotions.ts`
6. Excusas del asado repetidas en la misma lista ("quedé muerto del laburo, perdón" ×2 juntas, dos asados seguidos). — `asado.ts`
7. Pretemporada sin cooldown de eventos (el bug "la figura pide beca ×2" del informe anterior sigue reproducible ahí). — `preseasonEvents.ts:310-324`
8. Un lesionado en el mismo partido puede reingresar por el cambio de la incidencia de técnica (no chequea `isSelectable`). — `narrative.ts:186-190`
9. "El calentón" es determinista: siempre el mismo jugador acumula todas las técnicas (primer competitivo/protagonista del quinteto). En mi partida Silva se comió 3 y la suspensión; verosímil, pero el sistema no elige, le toca. — `narrative.ts:116-118`
10. El rival que "llega corto" casi no lo paga: su convocatoria es solo un multiplicador 0.85-1.06 sobre `strength`; me ganó un rival narrado con 5 en planilla. — `world.ts:576-616`, `match.ts:739`
11. Semanas mudas por mismatch canFire/pickTargets en `ausencia_clave` y `mudanza` (el evento se descarta y esa semana no pasa nada). — `events.ts:1287-1290`
12. Timeline de la ficha con spam de la misma escalada (3 entradas de la misma bronca en la misma semana) y gramática ("los minutos le calienta"). — `PlayerProfile`/`mood.ts`
13. `groupStanding` contradice la bio: el fundador del club, 34 años, afinidad 87 → "Peso en el vestuario 42: todavía se está ganando su lugar". — `socialMap.ts`
14. Identidad institucional rival volátil entre temporadas: `founded`, prestigios y DT se re-sortean (hasta las estrellas del escudo pueden cambiar). — `world.ts:317-330`
15. Caja negativa en pretemporada sin game over (el chequeo vive solo en `advanceWeek`). — `preseason.ts:78-82`, `week.ts:308`
16. Save de versión desconocida devuelve `null` en silencio: un deploy que olvide la migración borra la partida sin aviso. — `storage.ts:227`
17. Emoji-soup: ~75 emojis de cromo conviviendo con un set propio de 26 iconos que declara "nada de emoji acá". — `Icon.tsx:3-4` vs. WeekView/Rankings/Timeline/EventModal

### P3 — Polish
"NUNEZ" sin tilde en la tira del Hub · "Vas 1° de 10" con récord 0-0 en la fecha 1 · chip del relato que muestra "Zona" jugando presión (`WeekView.tsx:1278`) · sidebar "Semana Semifinales **de 9**" · radios 4/8/10/12px mezclados · 32 tamaños tipográficos · ~20 `marginBottom` inline · `AvatarGallery` con la paleta del tema muerto · foco visible solo en tiles del Hub · el MVP se decide por `perf×√min` y puede no ser el que la planilla muestra como mejor · noticias de playoffs con `week` sin clamp · sponsor que termina sin aviso destacado · apodos de la galería a revisar para audiencia internacional de Steam ("Negro Ale").

---

## 4. TOP 10 problemas (por impacto hoy)

1. **El mundo se tira a la basura cada temporada** — sin personas persistentes no hay memoria, rivalidades con nombres, scouting acumulable ni mercado orgánico. Es el techo de la replayability (nota 5) y de la fantasía FM.
2. **Notas infladas** — aplana el postpartido entero: emociones que no disparan, confianza-trinquete, un 10/10 que sale 9% de las veces.
3. **Los dos bloqueos de alineación** (P0-1/P0-2) — la peor experiencia posible (perder por UI) al alcance de cualquier partida con fundidos o plantel justo.
4. **Objetivos decorativos** — la mitad del meta promete y no paga; en mi partida cumplí los 3 sin pensarlos y la evaluación ni los mencionó.
5. **La economía deja de generar decisiones en la segunda mitad** — con la caja holgada, la plata sobrante no compra nada estratégico y las acciones semanales pierden interés (fecha 5+).
6. **Doble cara por jugador** — rompe la identificación en el punto exacto donde el juego la construye (la ficha).
7. **Repetición + incoherencia narrativa en el partido** — strings fijos por cuarto, claves que contradicen el marcador, "saco y corbata" del que jugó: erosiona la confianza en el mejor activo (la escritura).
8. **El castigo social llega tarde** — 3-0 hostil en Difícil; motivación saturada ganando; el jugador aprende que rotar es opcional.
9. **El mapa social no juega** — grupos, íntimos y "no se bancan" son de solo lectura: cero eventos los consumen, cero efecto en cancha.
10. **Datos agregados inaccesibles** — faltas/minutos/deudas requieren memoria o rankings top-5; no hay una tabla ordenable en todo el juego.

## 5. TOP 10 oportunidades (máximo efecto / menor costo)

1. **Recalibrar `computeRating`** (1 archivo, medible con el Monte Carlo ya hecho): pendiente más baja, banda 3-6 viva, media ~6.5. Destraba emociones y frena el trinquete.
2. **Arreglar los 2 bloqueos de alineación** + `isSelectable` en el cambio por técnica: una tarde.
3. **Objetivos con dientes** (~1 día): meterlos en la evaluación final + una reacción de la comisión a mitad de temporada. `objectiveStatus` ya se computa; falta que alguien cobre.
4. **Una sola cara por jugador** (una línea de swap): volver al SVG en la tira del Hub hasta que exista el set ilustrado por seed.
5. **Pools de 2-3 variantes para las notas tácticas del vivo + dedupe por partido** (patrón `usedIncidents` ya existe) y **claves filtradas por resultado** (perdiste → la primera clave explica la derrota).
6. **Persistir a las personas del mundo** (id propio + guardar `world.players` + rotación anual 10-20% con noticias): costo medio, desbloquea medio ROADMAP.
7. **Profesión→ausencias + agenda para el plantel fundador** (~30 líneas): el enfermero tiene guardias, el remisero llega tarde. Convierte un campo decorativo en la mecánica más amateur del juego.
8. **Egos que crecen ganando** (reusar `grievance`): con racha de 3+, protagonistas/mercenarios suben exigencias. Ataca la saturación y la falta de presión descendente.
9. **Cerrar el ciclo de la queja de plata** (2 horas): becar apaga 'plata', `cuota_impaga` anota de verdad, cobro al día suelta 'hechos'.
10. **Cerrar la Puerta 2 y actualizar `DESIGN.md`** (una decisión + una tarde de docs): la dirección visual ya está en producción; formalizarla desbloquea la expansión de arte (eventos ilustrados, set de retratos) y elimina la doble fuente de verdad del design system.

## 6. Sistemas que NO tocaría

- **La pretemporada entera** (continuidad, negociaciones, deadline, cierre). Solo agregarle el cooldown de eventos.
- **`mood.ts`** (queja activa con escalada/decaimiento/reincidencia): el corazón nuevo del juego. Cerrarle entradas/salidas, no rehacerlo.
- **Promesas** (`promises.ts`): el arco completo funciona; completar la charla previa para las promesas `competitivo`/`ambiente`.
- **Ausencias/convocatoria** (`absences.ts`/`callup.ts`): el mejor loop semanal. Como mucho fusionar "convencer" e "importancia".
- **El asado** (`asado.ts`): ya es mecánica con RSVP, tiers y sociedades. Solo el label del costo y las excusas repetidas.
- **Escudos** (`crest.ts`): patrón oro; usarlo de vara para todo lo demás.
- **Evaluación final multidimensional + momentos memorables**: correcta; integrarle objetivos/promesas/ascenso, no rediseñarla.
- **"Qué mirar hoy" colgado de los tiles** (`watch.ts` + Hub): mejor idea de UX del proyecto.
- **El harness de balance y su disciplina** (`sim-balance.cjs` + BALANCE.md): mantener el ritual "tocar balance.ts → sim → comparar".
- **Voces por arquetipo** (`voices.ts`): extender pools, no tocar la mecánica.
- **Retratos SVG — la arquitectura** (determinismo, append-only, sesgo por edad): conservar; lo que se decide es la dirección de arte encima.

## 7. Qué eliminaría

- **El suplementario como fase sin decisión** (hoy: moneda pura sin reb/ast). O gana una decisión (a quién le das el último tiro) o se resuelve en una línea.
- **Los ~6 eventos sin decisión real** (donación, sponsor local, periodista, clínica, festejo, cumpleaños): degradarlos a noticias/decisiones de 1 click baratas y liberar el bolillero para eventos con trade-off.
- **La triple contada del postpartido** (summary + claves + highlights dicen lo mismo tres veces): fundir summary y claves en un párrafo generado.
- **Una de las tres escalas de nivel visibles por fila** (≈, estrellas, 💪🔥): dejar ≈ + estado; las estrellas solo donde el scouting es grueso.
- **`DESIGN.md` como está** (documenta el tema muerto y contradice a `SISTEMA_VISUAL.md`): marcar superseded o reescribir. Dos fuentes de verdad es peor que una desactualizada.
- **El chip "Prestigio" del WorldPlayer y `secondaryPositions`** mientras no hagan nada: o se usan o confunden al que lee la ficha rival.

## 8. Qué falta (para cumplir la fantasía)

1. **Personas en el mundo** (el pívot rival que te mató el año pasado tiene que seguir existiendo).
2. **Cuerpo**: peso/forma como dato y como dibujo. La fantasía dice "jugadores con panza" y hoy no hay ni campo ni silueta.
3. **Vida propia del plantel fundador**: agenda, profesión con turnos, hijos como estado (hoy "el nene con fiebre" es un sorteo, no una familia).
4. **Localía** (el fixture ya tiene L/V; el árbitro "casero" no tiene efecto): partido de visitante como experiencia distinta.
5. **Presión descendente al que gana**: egos, rivales que se refuerzan, la fama de "club que promete".
6. **Un sumidero económico estratégico** (mejora del gimnasio, equipamiento con efecto real): hoy la plata sobrante no compra nada interesante.
7. **Crisis intermedia antes del game over** (ultimátum de la comisión, venta forzada, gorra de emergencia): hoy se pasa de "todo bien" a pantalla final en un click.
8. **Bronca por sustitución/cierre** (el que cerraba y lo sacaste; `clutchConfidence` ya existe numéricamente).
9. **Multi-equipo humano** (jugadores que juegan en dos ligas o en contra tuya — ya está bien diseñado en el ROADMAP; la infraestructura de fichas existe).
10. **Onboarding mínimo**: una primera pantalla que diga quién sos y qué se espera de tu primera semana (hoy el jugador nuevo aterriza en la pretemporada con 30 decisiones a la vista; buena información, cero jerarquía temporal).

## 9. Arte

**Conservar**
- Portada del asado (es key art de Steam ya), cabeceras de escena (vestuario con el gag de la camiseta, bar), fondo de cancha con velo, tokens del tema claro (crema/grafito/naranja), Oswald como display, escudos completos, los 26 iconos de línea.

**Modificar**
- **Retratos: decidir la identidad única** (corto plazo: SVG en todos lados; largo: set ilustrado derivado de seed). Ampliar el SVG con contextura de cuello/hombros/papada (3 valores cambian todo), largo de pelo trasero, color de ojos, 2º modelo de lentes, y algún vínculo apariencia↔personalidad.
- Los 8 retratos ilustrados de arquetipo: suben de genéricos a personajes con 1 pasada de dirección (el "veterano" hoy podría ser gerente de banco).
- Purga de emojis de cromo → `Icon.tsx` (dos tardes, mecánico). El emoji como contenido del chat del grupo puede quedarse.

**Rehacer**
- Nada estructural. (Esto es una buena noticia: el problema de arte es de decisión y cobertura, no de calidad.)

**Falta crear**
- **Ilustración por familia de evento para el EventModal** (~6 familias ya presupuestadas en `SISTEMA_VISUAL.md`): la mitad social del juego hoy es un pop-up administrativo. Máximo retorno.
- Ambientación del partido en vivo (el tablón, la noche, público sugerido detrás del scoreboard).
- Cabecera de escena para la ficha de jugador.
- Set de expresiones/cuerpos si se aprueba la dirección ilustrada.

**Pregunta central ("¿lo reconozco sin el logo?")**: en el menú, sí — la portada es inconfundible. Dentro del juego, a medias: el Hub sí; una card blanca de WeekView, todavía no.

## 10. UI/UX

**Conservar**
- Hub-menú con avisos en los tiles + tira del plantel con semáforos.
- Planilla con agrupación por rol esperado ("SE VEN TITULARES (7) · MEDIA ≈69").
- Footer de recursos fijo (semana/caja/cuotas/récord) — "los números que mirás siempre, siempre en el mismo lugar".
- La ficha de jugador de 5 tabs (General/Deportiva/Relaciones/Historia/Social): cumple casi todo el checklist del TEST 11.
- Los pasos numerados del flujo semanal (1·Semana … 5·Informe).
- Estados humanos junto a los números (la regla de oro de DESIGN.md, bien aplicada).

**Mejorar**
- **WeekView para PC**: hoy es una columna mobile con tablas de 460px flotando en 1200px. El partido en vivo merece los dos tercios vacíos (relato a un lado, planilla al otro).
- **Una sola escala de nivel por fila** (ver §7).
- **Rankings completos y tablas ordenables**: "MÁS IMPUNTUAL" y "MÁS MINUTOS" existen (bien), pero top-5 no responde "quién juega poco"; la Planilla necesita sort por columna.
- Vocabulario emoción vs. estado: que el informe no diga "Molesto por sus minutos" si el juego después contesta "no hay jugadores molestos" (usar otra etiqueta para el nivel 1: "masticando bronca").
- Consistencia CSS de un día: radios a 4px, escala tipográfica de ~8 pasos, clase de espaciado de cards, banda de sección robusta (clase explícita, no `:first-child`), naranja reservado (los ratings por fila lo rompen ×14).
- Timeline de ficha: colapsar entradas repetidas de la misma queja.
- El resumen del último partido accesible después de avanzar (hoy: solo Historia/acontecimientos; tarea G del test costó más clicks de los que debería).

**Rediseñar**
- Solo el guión de pantalla del partido en vivo (layout, no sistemas). Nada más pide rediseño: pide terminar de aplicar el criterio ya declarado.

## 11. Database Health Report

**Estructura.** Cuatro modelos de persona sin base común (`Player` 40+ campos / `MarketPlayer` / `WorldPlayer` / `Rival` de 2 campos), conversión con pérdida (`marketToPlayer` tira reputaciones y regenera profesión/mano al azar), y sin puente mundo→plantel. El club existe 2 veces y el equipo rival 3 (`Rival`/`WorldClub`/`Team` unidos por `legacyRivalId`).

**Volumen.** ~55 personas escritas a mano (plantel 12 + mercado 32 + reclutas 10) contra 228 generadas por partida (12×19 equipos). Nombres: pool 45×45; **9-15 duplicados por mundo** (medido en 8 seeds; hay un "Bruno Acosta" rival siendo Bruno Acosta de tu plantel). El contador de reclutas es variable de módulo, no estado del save (no determinista tras F5).

**Distribuciones (medidas, 1.824 jugadores).** Todo uniforme: edad plana 19-38 (sin pirámide), compromiso plano 35-95, personalidades 12.5% cada una, plantilla posicional idéntica en todos los equipos (2-2-3-2-2+1), jerarquía de fuerza rígida (el equipo N siempre es el N-ésimo, media estable entre seeds). El 72.9% tiene "algo raro" — cuando 7 de cada 10 son distinguibles, nadie es memorable.

**Persistencia.** El mundo se regenera entero por temporada: 228/228 ids repetidos con 0 personas iguales (medido T1→T5). La cara persiste pegada al slot → misma cara, otro nombre. `founded`/prestigios/DT rivales re-sorteados por año. El scouting es por equipo (`rivalId` en el historial), no por persona.

**Datos faltantes.** Peso no existe en ningún modelo. Altura/mano/profesión son decorativos (cero uso en simulación). El plantel inicial no tiene agenda (solo los fichados). `secondaryPositions` y `prestige` del mundo, sin uso.

**Redundancias.** Tres escalas de nivel en UI para el mismo dato; `visibleRating` vs `technique` bien resuelto (ruido de scouting), pero las estrellas son una tercera vista del mismo número.

**Riesgos de escala.** Save actual: 164 KB al arrancar (91% es `world` — 92 KB players + 35 KB registrations), +4-5 KB/temporada. Contra ~5 MB de LocalStorage hay 20× de margen; a ~5.000 jugadores persistentes el save ronda 2.5-3 MB y **LocalStorage muere primero**, seguido por `JSON.stringify` por guardado y `structuredClone(state)` en cada acción. Búsquedas lineales (`world.players.find`, `teamRoster` filtra todas las registrations por consulta) escalan mal antes que eso. Con 2.025 combinaciones de nombre, a 1.000 jugadores habría ~200 duplicados.

**Las 5 mejoras DB por impacto/costo**: (1) personas persistentes con id propio + rotación anual parcial; (2) congelar identidad institucional rival (`seedFromString(clubId)`, una tarde); (3) agenda+profesión para el plantel fundador; (4) curvas en vez de uniformes + 2-3 arquetipos de plantel por club; (5) apellidos compuestos/apodos + unicidad global por save.

## 12. Roadmap recomendado (no implementar aún)

**Fase 1 — Fundamentos (1-2 semanas de trabajo)**
Bugs P0 de alineación · recalibrar notas · claves coherentes con el resultado · pools anti-repetición del vivo · textos rotos del mercado · becar apaga 'plata' · cooldown de eventos de pretemporada · ausencia laboral ≠ lesión · hub de playoffs · relato del informe completo · **cerrar la Puerta 2 y actualizar DESIGN.md** (la dirección ya está en producción; formalizarla desbloquea la expansión de arte).

**Fase 2 — Consolidar core loop**
Objetivos con dientes (evaluación + reacción de comisión a mitad de temporada) · egos que crecen ganando · castigo más temprano y legible del sobreuso (que el fundido rinda visiblemente peor YA) · sumidero económico estratégico · crisis intermedia pre-game-over · una decisión para el suplementario.

**Fase 3 — Profundizar jugadores y relaciones**
Personas persistentes del mundo + conocimiento por persona + mercado alimentado por el mundo · profesión→vida (agenda del plantel fundador) · grupos que actúan (1-2 eventos que consuman el mapa social + química de parejas en cancha) · bronca por sustitución/cierre · memoria institucional rival (fundación/DT congelados, historial contra vos).

**Fase 4 — Arte y presentación**
Identidad única de retrato (decisión + set) · EventModal ilustrado por familia · partido en vivo ambientado y con layout PC · purga de emojis → iconos · pasada CSS de consistencia · key art y página de Steam (la portada ya es el 80%).

**Fase 5 — Contenido y polish**
Más eventos con trade-off y cadenas de 3+ · más ligas en la oferta de inscripción · multi-equipo humano · localía + árbitro casero · noticias más ricas / feed conversacional · modo carrera "club desde cero" · localización si Steam lo pide.

---

## Anexo A — Bitácora de tests (evidencia)

**TEST 1 — Primera experiencia.** El menú comunica la fantasía en una imagen (la portada del asado) y un párrafo. La dificultad "Faltas y lesiones" antes de empezar ya cuenta de qué va el juego: bien. Al entrar (pretemporada) hay mucha información de golpe sin jerarquía temporal (inscripción + 12 confirmaciones + 16 fichables + 3 gestiones), pero toda legible y con tono. Nada de tutorial; el jugador aprende jugando y los textos enseñan ("Elegir liga es elegir tu día de partido"). Sé dónde clickear casi siempre; el objetivo inmediato (inscribirse, confirmar 8) está en chips arriba. Los retratos y bios generan curiosidad genuina por el plantel. Problema documentado: sin un "quién sos vos" ni una primera meta guiada; y "Vas 1° de 10" con 0-0 en la primera visita a la tabla.

**TEST 2 — Core loop real.** El loop que existe: Hub (leer avisos de los tiles) → decidir hasta 2 acciones → pasar lista (gestionar bajas) → quinteto en pizarra → partido por cuartos con tácticas/cambios/incidencias → informe (planilla, claves, vestuario, consecuencias) → avanzar (evento semanal) → Hub. Está claro, tiene anticipación (rival + árbitro + avisos) y decisiones con consecuencia visible. Se corta: las acciones pierden interés cuando la caja sobra (fecha 5+), el evento semanal es lo único nuevo entre partidos, y la fase de "revisar" no tiene nada nuevo que mirar si no hubo drama.

**TEST 5 — Objetivos.** Coexisten hoy: 3 objetivos de comisión (plata/asados/ambiente en mi partida — bien elegidos, hasta en tensión potencial caja-vs-asados), promesas individuales, playoffs dobles (Oro/Plata), ascenso, evaluación 6D con momentos memorables. El problema no es variedad sino consecuencia (ver P1-3). El título de Plata se sintió un logro real ("no era la copa grande…").

**TEST 7 — ¿Personas? (muestra jugada).** Silva: "base pibe con promesa de titularidad, 3 técnicas y una suspensión; faltó a la final por vómitos" — persona. Tato: "el más talentoso cuando aparece; debe 11 cuotas, se lesiona en picados ajenos y el grupo lo caga a pedos" — persona. Chino: "fundador de 34, kinesiólogo, masticó bronca 5 semanas y cerró eufórico" — persona. Núñez: "el que organiza los asados, juega porque están sus amigos" — persona. Cardozo: "el ex federado que te recuerda que en otros clubes no pagaba cuota" — persona. Batista/Acosta: más finitos pero con rol social. **Los 228 rivales: "buen jugador · 35 años" — no personas.** El sistema ya sabe qué datos hacen memorable a alguien (bio + vida + queja + historial); falta dárselos al mundo.

**TEST 8 — Equipos.** Reconocibles por nombre y estilo (con consejo táctico útil en la previa), delegado y DT con nombre, cancha con barrio. No reconocibles por personas ni por historia (plantel y fundación cambian por temporada). La rivalidad emergente sí existe y funciona (🔥 revancha contra Bohemios y Ferro en playoffs, con recompensa "nos sacamos la espina").

**TEST 10 — Tareas UX (clicks medidos desde el Hub).** A "mejor pívot": Plantilla→Planilla, comparar a ojo (sin sort) — 2 clicks + lectura, aceptable. B "quién falta más": Rankings→"Más impuntual" — 2 clicks, existe pero top-3 y sin detalle de motivos. C "quién está enojado": el Hub te lo dice sin clicks (tile Vestuario) — excelente. D "cambiar quinteto": solo en fase de quinteto — correcto pero no explorable fuera de la semana. E "quién juega poco": Rankings "Más minutos" muestra el top; el fondo hay que inferirlo — mala. F "fichar a mitad de temporada": solo la acción Reclutar ($70 a ciegas) — el mercado es de pretemporada (decisión de diseño defendible, no comunicada). G "por qué perdimos el último partido": tras avanzar, solo la línea de acontecimientos — floja. H "quién es amigo de quién": VestuarioCard + tab Relaciones con números — muy bien. I "quién juega en otro equipo": ficha (agenda) + conflictos del Calendario — bien para fichados, invisible para el resto (no tienen agenda). J "qué hago antes del próximo partido": el Hub entero es esa respuesta — la mejor del juego.

**TEST 15 — QA funcional.** Una temporada completa + playoffs + cambio de temporada + partida nueva en Difícil **sin un solo cuelgue ni pérdida de save** (autosave verificado en cada paso; aviso propio si el storage falla). Los bugs encontrados son de coherencia y datos (lista completa en §3), no de estabilidad. Un 404 menor en consola al cargar. Los dos P0 de alineación salieron del análisis de código (no me tocaron en la partida, pero son alcanzables por cualquiera).

**TEST 16 — Stress.** 3 semanas en Difícil, 5 jugadores 40', cero acciones, opciones duras: el juego reacciona (broncas acumulándose, fundidos narrados, lesión por jugar fundido, evento de cuotas con el moroso) pero **gané las 3** y la tabla me puso 2°. El sim confirma que a 9 fechas el costo llega (abandonos 1.68/temporada sin rotar); el problema es el delay, no la ausencia de castigo.

**TEST 17 — Historias emergentes (reales, no inventadas).**
1. *La temporada de Facundo Silva*: promesa de titularidad → técnica en la fecha 1 → segunda en la 2 (con reincidencia narrada) → tercera contra La Terminal → suspensión mirando desde la tribuna → vuelve, lesión "en el trabajo" → vomita la noche previa a la final y se la pierde → MVP de la semi con 8 asistencias → en T2 pide titularidad de nuevo.
2. *La bronca del Chino*: 5 semanas masticando minutos con frases que escalaron de "lo dejo ahí, nomás" a "me estás usando de bulto" → charla ("te va a mirar la pizarra el sábado") → minutos → "Estas ya no me tocan tan seguido. Por eso esta me la llevo puesta."
3. *La Plata con revancha doble*: 6° en la regular, semi 🔥 contra Bohemios (nos había ganado 63-67) 77-60, final 🔥 contra Ferro (ídem) 77-56, con "Colo" Ferreira — un pibe que cayó a probarse en la fecha 8 — lesionándose en la final que ganamos. El asadazo de la semana 2 quedó como "momento memorable" del cierre.
4. *Tato Fernández, el talento imposible*: ≈79, debe 11 semanas de cuota, faltó a 5 partidos (una vez por un picado en otro club del que volvió rengo), el grupo lo cargó dos veces ("para el picado nunca falta")… y fue MVP de la final. En T2 "está dudando".

Veredicto: **la profundidad sistémica ya genera historias contables.** Lo que falta es que el mundo las recuerde (rivales, temporadas) y que más sistemas produzcan las suyas (grupos, economía).

---

## Anexo B — Respuesta del Game Director

**"Si Basket Manager fuera tu juego, ¿qué harías ahora mismo para convertirlo en un juego que alguien juegue 10 horas y recomiende?"**

Diez horas son ~4 temporadas. Hoy el juego sostiene una temporada excelente y media buena; la tercera se parece demasiado a la primera porque el mundo no recuerda nada. Con el equipo haría exactamente esto, en orden:

1. **Semana 1 — sacar la vergüenza.** Los dos bugs de alineación, la recalibración de notas, claves coherentes, pools anti-repetición, los 6 textos rotos. Y cerrar formalmente la Puerta 2: la dirección visual ya está en producción; aprobarla desbloquea la expansión de arte. Nada de esto es diseño nuevo; es cobrar lo ya construido.
2. **Semanas 2-3 — que las promesas del meta paguen.** Objetivos de comisión en la evaluación + una reacción a mitad de temporada; egos que suben ganando; el fundido que rinde peor *hoy*, no en 6 semanas. Con eso, la segunda mitad de una buena temporada deja de jugarse sola — que es exactamente donde hoy se muere la tensión.
3. **Semanas 4-6 — la apuesta estructural: personas en el mundo.** Id propio, el mundo persiste, rota 10-20% por año con noticias de pases. De ahí salen gratis: el rival con nombre que te volvió a ganar, el scouting que se acumula, el mercado alimentado por el mundo, y la T3 distinta de la T1. Es la única pieza cara de esta lista y es la que convierte 3 horas en 10.
4. **En paralelo (arte) — una cara por jugador y eventos ilustrados.** Decidir la dirección de retratos (la candidata ilustrada es buena), unificar, y ponerle escena a los eventos sociales. El juego ya suena a club de barrio; que también se vea así en el 95% de las pantallas que hoy son cards blancas.
5. **Lo que NO haría ahora**: bandeja de WhatsApp completa, más ligas, modo carrera, reskin fútbol 5, más eventos por volumen. Todo eso amplifica; primero que el núcleo recuerde y cobre.

La prueba de fuego que usaría: *que un playtester cuente, sin que se lo pidan, la historia de un jugador con nombre y apellido.* En mi partida ya pasó (Silva, el Chino, Tato). Cuando también pueda contar la historia de un **rival**, el juego está listo para que lo recomienden.

---
*Auditoría de solo lectura: ningún archivo del juego fue modificado. Los file:line citados salen de las cuatro pasadas de código; los ejemplos de juego, de la partida real (seed de la sesión, dificultad Media, T1 completa + T2 pretemporada + stress Difícil).*
