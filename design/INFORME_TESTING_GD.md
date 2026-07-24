# Informe de testing de game design — Basket Manager

**Metodología**: partida completa en dificultad Media con pretemporada (T1 entera: 4 semanas de pretemporada, 9 fechas, playoffs, cierre de temporada y arranque de T2), siguiendo el recorrido del brief §4 — rotación competitiva y repartida, ausencias aceptadas e intervenidas, una promesa rota a propósito, beca a la figura, prioridad social sobre deportiva. Pasada corta adicional en Difícil (3 fechas). Complemento: `npm run sim` y lectura de código solo para explicar causas. Los ejemplos citados son todos de la partida real.

---

## 1. Resumen ejecutivo

**El juego ya transmite la fantasía de dirigir personas — a ráfagas.** En una temporada me pasó todo esto: el Griego (histórico del club) volvió, pagó su cuota, jugó una temporada y se retiró; un club federado se llevó a mi DT justo antes de la semifinal (riesgo que el juego me había anunciado al contratarlo); la "sociedad" veterano-pibe que armé en un evento de la semana 4 terminó siendo el único "momento memorable" del cierre de temporada; y Círculo Sportivo me ganó tres veces, incluida la final. Eso es una historia contable, y responde afirmativamente la pregunta central del brief.

**El problema no es de contenido ni de sistemas: es de conexión.** El juego tiene tres sistemas de emociones que no se hablan entre sí (las emociones postpartido, el estado accionable "jugador molesto" y las promesas), y ahí se corta la cadena decisión → consecuencia → decisión que el brief pide. Los tres ejemplos más claros de la partida:

1. Seba Cardozo salió "molesto por sus minutos" del partido 1; a la semana siguiente, la acción "Hablar con un jugador molesto" decía **"⛔ No hay jugadores molestos"**.
2. **Rompí la promesa de titularidad de Facundo Silva y no pasó nada**: ni aviso al armar el quinteto, ni reclamo después, ni memoria en la renegociación de T2. El estado pasó a "rota" en un panel, en silencio.
3. Las broncas por minutos no escalan: el Chino se quejó tres fechas seguidas con la misma frase y la misma intensidad.

**El segundo problema es la repetición de plantillas**, que es mortal justo porque el tono humorístico es el mejor activo del juego: el mismo evento dos semanas seguidas con protagonistas incoherentes ("La figura pide beca" para el 4° y el 5° del plantel), la misma frase de vestuario 3-4 veces en una pantalla, y frases de jugadores que no estuvieron ("Entré, defendí y ayudé" con 0 minutos; "Lemos se fue del vestuario sin saludar" dos veces… estando ausente).

**La hipótesis del brief sobre la condición de victoria está parcialmente desactualizada**: ya hay objetivos de comisión no deportivos (plantel 10+, ambiente social, caja), evaluación final multidimensional (incluida la métrica "momentos memorables") y un cierre de "subcampeones" que se sintió un logro. El gap real no es agregar formas de éxito sino hacer que las existentes tensionen: hoy, si ganás partidos, todo lo social se cumple solo y satura (terminé con moral 99 y ambiente 99 sin esfuerzo).

**Recomendación central**: antes de sumar amplitud (bandeja WhatsApp completa, fichajes irregulares, noticias), consolidar el ciclo emocional: un solo estado de humor por jugador, visible en "Qué mirar hoy", accionable, con escalada y con memoria. Con eso, el 80% del contenido que ya existe empieza a rendir el doble.

---

## 2. Qué funciona hoy (no rehacer)

1. **La pretemporada entera.** Gestiones limitadas (3/semana) fuerzan triage real; las negociaciones de 3 opciones con contraoferta de un solo uso tienen tensión; el cierre (promesas registradas + fortalezas + riesgos, "los jugadores se acuerdan") es el mejor "cierre que abre historias" del juego.
2. **La disponibilidad como incertidumbre central.** Excusas con carácter ("cayó la esposa con la lista del súper y el nene con fiebre"; "'Se me complicó', mandó por WhatsApp a las 18:55"), opciones de intervención que crecen con la dificultad (llega al 2do tiempo / convencerlo / mandar a un compañero), agendas de fichados que pesan de verdad (Roldán llegó al 2do tiempo por su martes bloqueado), y rivales que también sufren (Ferro llegó con 6; su figura "solo llega a los de 22:00"). El criterio del §6 se cumple.
3. **El partido por cuartos con decisiones.** Tácticas legibles con hints de scouting que importan, presets de cambios, incidencias con 3 respuestas y consecuencia narrada ("el plantel valoró que defendieras al grupo, pero los jueces tomaron nota" → "cobran distinto en cada aro"), técnicas con riesgo de expulsión, rachas y remontadas (nos hicieron 24-13 el último cuarto de la semi), y el relato que nota la composición ("con este quinteto falta un base natural y se nota").
4. **El informe postpartido como generador de historias.** Claves + consecuencias + minutos/desgaste/"fundido" + vestuario individual. De ahí salieron todos mis ganchos semanales.
5. **El sistema de DT.** Candidatos con personalidad y trade-offs reales, directivas (A ganar / Juegan todos), "pisar sus decisiones a mano", y el riesgo anunciado que se cumple (Ferreira poached antes de la semi) — el mejor evento de la temporada.
6. **Objetivos de comisión + evaluación final multidimensional.** "Momentos memorables: 1 — Mala" como nota de cierre es una idea excelente (el juego se autoevalúa como generador de anécdotas).
7. **Progresión y mortalidad entre temporadas.** Silva 65→80, Batista 54→45, dos veteranos retirados (el regreso del Griego duró exactamente una temporada: agridulce perfecto).
8. **Las fichas y la plantilla.** Bios con voz ("el que organiza los asados", "el más talentoso, cuando aparece"), relaciones con amistades emergentes (mi mediación Silva-Acosta terminó en amistad 71 y "la pelea quedó oficialmente enterrada" una semana después — DelayedNote funcionando), expectativas de rol (~30 min), promesas anotadas.
9. **La economía temprana.** La caja al límite en pretemporada + rifa/sponsor/gorra con texto y consecuencia ("1 sigue debiendo y quedó masticando bronca") aprietan de verdad las primeras 3 semanas.

---

## 3. Tres principales problemas del ciclo semanal

### Problema 1 — Tres sistemas de emoción que no se hablan (el más grave)
Emociones postpartido (`emotions.ts`), estado accionable "jugador molesto" (acciones del club) y promesas (`promises.ts`) son islas:
- Seba "molesto por sus minutos" en el informe → "⛔ No hay jugadores molestos" a la semana siguiente. Pasó 3 veces con 3 jugadores distintos.
- La promesa de Silva se rompió **sin momento de ruptura**: sin aviso al alinear, sin reclamo, sin evento; el estado cambió a "rota" en un panel. En la T2 confirmó "sin condiciones", como si nada.
- La bronca por minutos no escala ni deja rastro: misma frase, misma intensidad, fecha tras fecha.

**Consecuencia de diseño**: el jugador aprende que las emociones son decorativas, y deja de leerlas. Es la señal de alerta n°6 y n°3 del brief (§8), confirmadas.

### Problema 2 — Repetición e incoherencia de plantillas
- "La figura pide beca" dos semanas seguidas, con Techera (4° del plantel) y Facundo (5°, recién confirmado feliz con promesa). Sin cooldown, sin filtro de elegibilidad, sin consultar el arco del personaje.
- Frases de vestuario duplicadas 3-4 veces en la misma pantalla ("Hoy entraba todo…" ×4).
- Frases incoherentes con los hechos: Batista "Entré, defendí y ayudé" con 0 minutos (2 veces); "Lemos se fue del vestuario sin saludar: quería ser titular" estando **ausente** (2 veces, y una con el grupo burlándose de su ausencia en la línea siguiente).
- Excusas idénticas ("le tocó cubrir la guardia" ×2 para Cardozo) y la misma incidencia arbitral con texto idéntico 3 partidos de 4.
- Las 3 técnicas de Silva fueron el mismo texto, sin meta-narrativa de reincidencia ("otra vez vos, Facundo").

### Problema 3 — Resoluciones silenciosas y radar incompleto
- "Intentar convencerlo" y "Mandar a un compañero a buscarlo" convierten la baja en ✓ **sin desenlace, sin costo, sin riesgo visible**. Palancas gratis que se sienten huecas — comparar con lo bien que están resueltas las negociaciones de pretemporada.
- "Qué mirar hoy" solo ve plata (deudas, caja). No avisa: fatiga acumulada (Viera terminó "fundido" 4 veces), promesas en riesgo, jugadores calientes, ni que estás por alinear un quinteto que rompe una promesa.
- El DT ignora fatiga y cobertura de posiciones (dejó al equipo sin base dos cuartos seguidos, molió a Viera 40' cuatro partidos). Sus errores no se leen como estilo sino como ruido.
- Ganando, los diales sociales saturan (moral 99, ambiente 99): la segunda mitad de la temporada perdió toda tensión social. No hay presión descendente.

---

## 4. Objetivos alternativos y estructura de victoria/fracaso

**Lo que ya está (y el brief subestima)**: objetivos de comisión no deportivos, evaluación final en 6 dimensiones, subcampeonato que se siente logro ("Llegar a la final ya fue un logro… El año que viene es revancha"), ascenso por llegar a la final.

**Los gaps reales:**
1. **No tensionan**: mis 3 objetivos se cumplieron solos ganando partidos. Nunca tuve que elegir entre un objetivo y otro.
2. **"Momentos memorables" es opaco**: me encantó que exista y me calificara "Mala", pero no sé qué acciones lo alimentan. Es la métrica más alineada con la fantasía y la menos comunicada.
3. **El ascenso ni se menciona en el cierre** — gané el ascenso y me enteré por la tabla.
4. **El fracaso está poco testeado por diseño**: con victoria constante nunca vi qué pasa al incumplir un objetivo de comisión.

**Propuesta de estructura** (respuesta a §12):
- Mantener 2-3 objetivos de comisión, pero elegidos para **competir entre sí** (ej.: "cerrá con $450" + "retené a la figura que pide beca" — plata vs. retención).
- Sumar **1 objetivo personal** elegido por el jugador al armar la partida (desarrollar al pibe / ganar el clásico / que jueguen todos), que la evaluación final trate con el mismo peso que salir campeón.
- Objetivos **emergentes a mitad de temporada** (la comisión reacciona: "vamos 1° — ahora quieren la final"), que es donde el brief pide "surgir dinámicamente".
- La evaluación final ya es el vehículo correcto: agregarle promesas (cumplidas/rotas), ascenso/descenso y el detalle de cómo generar momentos memorables.

---

## 5. Bandeja de WhatsApp

**Recomendación: no construir la bandeja completa todavía.** Dos razones:

1. **Las piezas ya existen desplegadas en superficies que funcionan**: "Qué mirar hoy" (avisos priorizados clickeables), "El grupo del club" (chat postpartido con retratos), eventos con diálogo y desenlace, "Últimos acontecimientos" (timeline). El costo de moverlas a una bandeja es alto y el beneficio marginal mientras persista el problema 2 (voces de molde): **una bandeja amplifica la repetición** — 14 jugadores escribiendo con 3 plantillas se nota más en formato chat que en cards.
2. **Conflicto con la decisión de UI reciente** (semana estilo PC Fútbol, "el camino directo es pasar lista e ir al partido"): una bandeja que exige atención empuja en la dirección contraria. La bandeja correcta para este juego cuenta lo que ya pasó/pasa, no agrega una obligación diaria.

**Qué sí haría ahora** (la versión mínima que valida la idea):
- Consolidar "grupo del club" + acontecimientos + reacciones de eventos en **un feed conversacional único con 3 hilos**: Individuales (reclamos, promesas, excusas), Grupo (clima, cargadas, confirmaciones de asado), Comisión (objetivos, multas, calendario). Reutiliza el 90% del contenido existente.
- Regla editorial dura: **mensaje que no requiere decisión ni cambia tu semana → no genera badge**. Ambientación se lee si querés; lo accionable te busca.
- Antes de eso, resolver voces (ver §6 abajo): sin voces distintas, la bandeja fracasa en su propia prueba ("¿los jugadores suenan diferentes?" — hoy: no).

**Respuestas a las preguntas del brief §5.3**: la separación de 4 canales propuesta es correcta como estructura de hilos, no como 4 bandejas; rumores/contactos puede esperar a P2 (noticias); la info de estado puro (tablas, stats, finanzas) debe quedarse en sus pantallas.

---

## 6. Memoria, afinidades y grupos internos

**Base sólida ya construida**: afinidades numéricas par a par, amistades/roces con notas en ficha, relación con el DT, promesas registradas y evaluadas, DelayedNotes (consecuencias que aparecen semanas después), personalidades que alimentan eventos combinados (choque de galones Morales-Lemos → sociedad → momento memorable). **Este es el sistema con mejor relación esfuerzo-hecho/valor-pendiente del juego.**

**La versión mínima viable de memoria que falta (en orden):**
1. **Memoria de agravios con escalada**: 2ª vez que lo dejás afuera ≠ 1ª vez. Tres niveles bastan (comentario → reclamo formal con decisión → consecuencia: compromiso/asistencia/irse), con decaimiento si lo atendés.
2. **El momento de ruptura de promesa como evento**, con las tres capas: aviso al alinear ("estás por romper la promesa de Silva"), reclamo en el postpartido, memoria en la renegociación siguiente ("el año pasado me prometiste y no cumpliste": exige más o se va).
3. **Memoria entre temporadas** de lo grande (promesas rotas, títulos, la final perdida) — hoy la T2 arranca amnésica.
4. **Visibilidad de grupos**: con las afinidades existentes ya se pueden derivar camarillas (amigos de amigos). Una línea en el Resumen alcanza: "Los veteranos (Chino, Flaco, Griego) están calientes por los minutos". No hace falta grafo visible; hace falta que el juego **nombre** los grupos cuando actúan.

**Sobre visibilidad** (pregunta del brief): parcialmente visible como ahora (números en ficha + frases en superficie) es el balance correcto; el problema actual no es opacidad sino que las relaciones **no producen eventos** — se mueven solas y en silencio.

---

## 7. Árbitros, sanciones, humor y noticias

**Árbitros/sanciones**: la incidencia con 3 respuestas y consecuencia real dentro del partido funciona (protesté → "los jueces tomaron nota" → "cobran distinto en cada aro"). Las técnicas con riesgo de expulsión generan la mejor decisión bajo presión del partido. Lo que falta:
- **Reincidencia**: Silva acumuló 3 técnicas idénticas sin que el mundo lo note. Técnicas acumuladas → fama de conflictivo → suspensión de una fecha sería la primera sanción con cola semanal real.
- **Árbitros con nombre y fama**, anunciados antes del partido ("dirige el Bigote Suárez, técnico y casero"): convierte la preparación en decisión (¿alineo al caliente?) con datos que ya existen. No hace falta que persistan entre temporadas al principio.

**Humor**: es el mejor activo del juego — el meme que desactiva la pelea del grupo, la camiseta 7 perdida tras comprar el juego nuevo, "un partidito tranquilo con los primos", el Griego. El tono nunca rompió la inmersión en mi partida. Su único enemigo es la repetición (problema 2): el mismo chiste dos veces deja de ser chiste. Frecuencia actual (≈1 evento social/semana + color en partido) es correcta.

**Noticias**: hoy la liga existe en tablas y en las bajas del rival de turno; los otros 8 equipos no generan historias. La implementación mínima que recomiendo (usa solo datos ya simulados): 2-3 líneas por fecha en los acontecimientos — goleada/sorpresa, racha, figura de la fecha; y detectar **rivalidades emergentes**: Círculo Sportivo me ganó tres veces incluida la final y el juego nunca lo nombró. Esa detección (3+ cruces con historia) vale más que diez noticias genéricas.

---

## 8. Recomendaciones priorizadas

### P0 — Consolidar (antes de sumar nada)
1. **Unificar el estado emocional por jugador** (una sola fuente: humor + queja activa) que alimente informe postpartido, "Qué mirar hoy", la acción "hablar con molesto" y los eventos. Con escalada por reincidencia y decaimiento.
2. **La promesa como arco con momento de ruptura** (aviso al alinear → reclamo → memoria T+1).
3. **Anti-repetición**: cooldown por evento (≥4 semanas), filtro de elegibilidad de protagonista (que "la figura" sea la figura), no repetir frase en la misma pantalla, y filtro jugó/estuvo para frases de vestuario. Es corrección de sistemas, no contenido nuevo.
4. **Desenlace y costo para toda intervención sobre ausencias** (convencer/mandar compañero deben poder salir mal y contar qué pasó).
5. **"Qué mirar hoy" completo**: fatiga, promesas en riesgo, molestos, novedades del DT. Es la mejor palanca del ciclo semanal y ya tiene el formato correcto.

### P1 — Profundizar
6. Reincidencia arbitral y reputación de conflictivos (técnicas → suspensión → fama).
7. **Asado con asistencia**: lista de quién vino/faltó según relación, humor y momento (el modelo del punto clave del brief), con consecuencias por los ausentes. Hoy es un botón de +ambiente — la señal de alerta n°4 del brief, confirmada.
8. **Voces por arquetipo**: particionar el pool de frases por personalidad (competitivo/social/mercenario/veterano). No es escribir más contenido sino repartir el existente y duplicar donde falte.
9. DT que respete fatiga y posiciones; sus sesgos como estilo legible ("Ferreira quema a los titulares; Torres reparte").
10. Memoria entre temporadas (promesas, títulos, agravios graves) en la renegociación.

### P2 — Dar vida
11. Noticias mínimas de liga (2-3/fecha, desde datos existentes) + detección de rivalidades emergentes.
12. Árbitro con nombre/fama anunciado en la previa.
13. Feed conversacional unificado (la semilla de WhatsApp, tras las voces de P1).

### P3 — Postergar
14. Bandeja WhatsApp completa como UI principal.
15. **Fichajes irregulares/riesgo reglamentario (§5.5): extensión de alto valor, todavía no.** El tema es oro puro para el tono, pero necesita comisión y árbitros con entidad previa (P1-P2) para que la multa/denuncia signifique algo. Reevaluar después de P1.
16. Minijuegos, infraestructura, sistemas administrativos.

---

## 9. Vertical slice: tres semanas conectadas

Diseñado sobre sistemas existentes + P0 (lo único nuevo que asume: estado emocional unificado, ruptura de promesa como evento, árbitro con nombre).

**Semana 1 — La ausencia que abre la puerta**
- *Mensaje inicial*: Viera (pívot titular) avisa a las 18:55: "se me complicó" (sin detalles). Opciones: aceptar / convencer (puede fallar, cuesta afinidad si presionás) / mandar a un compañero (sale bien solo si tiene un amigo en el plantel).
- *Decisión de convocatoria*: Roldán (suplente) cubre; te pide "si ando bien, la semana que viene arranco yo" → promesa opcional de rotación.
- *Partido*: Roldán 9/10, nota del relato "se ganó el puesto".
- *Variables*: humor Roldán ↑, expectativa de rol Roldán: suplente → rotación; humor Viera neutro (avisó).
- *Consecuencia visible*: informe postpartido: "Roldán pide pista"; "Qué mirar hoy" de la semana 2: "Viera vuelve — ¿quién arranca de 5?".
- *Gancho*: dos jugadores para un puesto, con promesa fresca de por medio.

**Semana 2 — La memoria del conflicto y el asado**
- *Evento inicial*: el grupo se pica por el puesto (evento con los DOS protagonistas correctos: Viera y Roldán). Decisiones: respaldar al titular / al suplente / "que lo definan entrenando" (resultado según compromiso de cada uno).
- *Acción social*: asado. **Lista de asistencia**: viene el 80%… pero el perdedor de tu decisión anterior no aparece ("tenía un tema"). El organizador natural (Núñez, bio "el que organiza los asados") lo nota en el grupo.
- *Partido*: el que jugó menos rinde según su humor (visible en la pista de la ficha).
- *Variables*: ambiente ↑ por asado pero afinidad del relegado ↓; si fue al asado, se recompone a mitad.
- *Consecuencia visible*: chat del grupo postasado con quién estuvo; timeline "faltó al asado" en la ficha del ausente.
- *Gancho*: aviso de la comisión: "la próxima fecha dirige Suárez, estricto con las protestas" + tu base acumula 2 técnicas.

**Semana 3 — El árbitro anunciado y el objetivo no deportivo**
- *Previa*: con Suárez anunciado y Silva (2 técnicas) caliente por los minutos, decisión de alineación: ¿lo arriesgás? El juego te muestra el riesgo al armar el quinteto (aviso tipo promesa).
- *Partido*: si juega y protesta → 3ª técnica = expulsión + una fecha de suspensión (primera sanción con cola semanal). Si lo protegés, reclamo de minutos que alimenta su arco.
- *Cierre*: evaluación del objetivo de comisión "que jueguen todos" o "ambiente ≥ X" en el Resumen: la suspensión/el enojo lo pone "en riesgo" — el objetivo no deportivo entra en conflicto real con ganar.
- *Gancho a semana 4*: el suspendido mira desde afuera el partido que define la clasificación — y el grupo opina.

---

## 10. Riesgos

1. **Repetición** — el enemigo n°1 del tono. Cualquier contenido nuevo sin sistema anti-repetición empeora el problema. (Por eso anti-repetición es P0, no pulido.)
2. **Exceso de texto** — si todo se vuelve mensaje, el camino directo al partido (decisión de UI correcta) muere. Regla: lo accionable te busca; la ambientación se deja encontrar.
3. **Opacidad** — relaciones que mueven números invisibles. La solución existente es buena (frase junto al número); mantenerla como estándar en todo lo nuevo.
4. **Complejidad del DT** — directivas + pisado manual + fatiga puede volverse ruido. Su sesgo debe ser una frase legible, no un parámetro.
5. **Saturación social ganando** — sin presión descendente (fama de "club que promete y no cumple", egos que crecen con las victorias, rivales que se refuerzan contra el puntero), la segunda mitad de una buena temporada se juega sola.

## Apéndice técnico (fuera de alcance, bloquea)
- Los `confirm()` nativos ("volver al menú", "pisar partida") colgaron el panel del navegador en el que testeé; en móvil son feos y fáciles de tocar mal. Reemplazar por modal propio.
- El harness `npm run sim` compara tácticas pero **no tiene métrica del juego social** (la señal de alerta n°1 del brief — "poner siempre a los mejores" — hoy no es medible). Agregar estrategias de rotación social al sim sería la forma barata de vigilar ese balance.
- Dato del sim actual: zona 44% de victorias vs presión 53%/mixta 54% — la zona quedó débil como estrategia global (aunque correcta situacionalmente, que es lo que el scouting enseña).

---

## 11. Preguntas abiertas para el director de juego

1. **¿La bandeja WhatsApp alimenta al Resumen o lo reemplaza?** (Mi recomendación: lo alimenta; el Resumen sigue siendo el hub.)
2. **¿Los objetivos de temporada los elige el jugador, la comisión, o mixto?** (Recomiendo: comisión 2 + jugador 1 + 1 emergente a mitad de temporada.)
3. **¿Ganar siempre debe tener costo social?** Hoy ganar maxea todo lo social. ¿Egos que crecen con las victorias? ¿La figura que pide más porque sos puntero?
4. **¿El asado puede salir mal?** Hoy es determinístico-bueno. Un asado con lluvia, poca gente o pelea vale más historias que diez asados perfectos.
5. **¿Cuál es el tope de consecuencia de una promesa rota?** ¿Enfriamiento (afinidad/compromiso) o puede irse del club a mitad de temporada? Define cuánto miedo da romperla.
6. **¿"Momentos memorables" se comunica?** ¿El jugador debe saber qué los genera, o descubrirlo? (Yo lo dejaría descubrible pero con más de 1 fuente — hoy parece salir solo de sociedades.)

---

### La historia que contaría de esta partida (§13)

"Armé el club con una promesa a cada punta — beca a la figura, titularidad al pibe. El histórico del club volvió a los 37, pagó su cuota religiosamente, jugó un año y se retiró. Contraté a un DT joven que leía bien el juego; un club federado me lo robó la semana de la semifinal. Llegamos a la final contra el único equipo que nos había ganado… y nos ganó de nuevo, por tres. Subcampeones, ascendidos, y la comisión conforme. Lo único que el juego me reprochó: una sola jugada memorable en todo el año. Tiene razón."

La prueba se considera exitosa según el criterio del brief: hay cadena de decisiones y consecuencias de varias semanas, jugadores recordables por lo que hicieron, y más de una forma de éxito. Lo que la rompe a intervalos regulares son las costuras entre sistemas — y por eso el P0 es conexión, no contenido.
