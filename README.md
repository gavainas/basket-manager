# 🏀 Básquet Manager Amateur

Prototipo web jugable de un juego de gestión de un club de básquet **amateur**. Sos el manager: no alcanza con ganar partidos — el club necesita jugadores motivados que paguen la cuota, buen ambiente, organización y una caja que nunca llegue a cero.

**▶ Jugar online: https://gavainas.github.io/basket-manager/**

(Se deploya automáticamente a GitHub Pages con cada push a `main`.)

## Cómo instalarlo y ejecutarlo

```bash
npm install
npm run dev      # abre en http://localhost:5173
npm run build    # verifica TypeScript y genera dist/
```

Sin backend, sin login, sin APIs externas. La partida se guarda automáticamente en LocalStorage.

## El ciclo del juego

**Pretemporada (4 semanas)**: antes de cada temporada hay que armar el plantel. Los jugadores del año anterior confirman, dudan, no responden, piden condiciones o se retiran. Hay un mercado de fichables con información imperfecta (según cuánto los conozcas), negociaciones con exigencias (becas, titularidad, pases), promesas que quedan registradas, y una fecha límite: al cierre se paga la inscripción, y si no llegás con jugadores o plata, hay consecuencias.

Después, cada turno es una semana (temporada de 9 semanas):

1. **Revisar** el estado del club (Resumen, Plantilla, Finanzas, Liga).
2. **Decidir**: elegir hasta 2 acciones semanales (entrenar, asado, rifa, sponsor, becar, cobrar cuotas, reclutar…).
3. **Eventos**: la mayoría de las semanas pasa algo que exige una decisión con consecuencias.
4. **Quinteto y rotación**: elegir los 5 titulares y hasta 5 de rotación (cuidando posiciones, físico, minutos y egos).
5. **Partido**: simulación con marcador, MVP, claves del resultado y notas de vestuario.
6. **Avanzar**: se cobran cuotas, se pagan gastos, los ánimos evolucionan… y alguno puede irse.

Al final, una evaluación multidimensional: resultado deportivo, salud financiera, retención, prestigio deportivo, prestigio social y momentos memorables. Se puede salir campeón con el vestuario roto, o terminar último con un grupo inolvidable.

**Derrota directa**: caja por debajo de $0 o menos de 5 jugadores.

## Sistemas implementados

- **Pretemporada y fichajes**: continuidad del plantel entre temporadas, mercado de ~30 fichables con conocimiento incompleto (5 niveles, del "muy conocido" al "desconocido"), negociación con exigencias y contraofertas, promesas registradas, becas, fecha límite de inscripción con jugadores de emergencia y aporte extraordinario si no llegás.
- Plantel de 12 jugadores con 8 personalidades (competitivo, social, protagonista, leal, mercenario, cumplidor, veterano, talentoso informal) que afectan su comportamiento.
- **Información imperfecta**: la valoración visible (≈) es una estimación con ruido; el rendimiento real surge de técnica + físico + motivación + confianza + química + posiciones.
- **Rotaciones y minutos**: además del quinteto se elige la rotación (hasta 5); la fuerza del equipo, el desgaste físico y el descontento por minutos dependen de cuántos juegan y cuánto. Sin rotación, los titulares se funden.
- **Entrenamientos con progresión**: la asistencia depende del compromiso, los jóvenes crecen entrenando, los que entrenan toda la temporada evolucionan mejor en el verano y los veteranos que entrenan casi no declinan.
- 10 acciones semanales con costos, beneficios y riesgos (máximo 2 por semana).
- 19 eventos aleatorios con decisiones y consecuencias visibles.
- Economía: cuotas, morosos, becas totales/parciales, sponsor, rifas, alquiler de cancha, libro de movimientos.
- Simulación de partidos con explicación del resultado (nivel, físico, motivación, química, posiciones, suerte).
- Liga de 10 equipos con tabla viva (los rivales juegan entre sí).
- Moral, ambiente social, organización y doble prestigio (deportivo/social).
- Jugadores que se molestan, amenazan con irse y abandonan.
- Guardado automático, continuar y reiniciar partida.
- Azar con semilla determinista (reproducible desde un guardado).

## Sistemas pendientes

Ver [ROADMAP.md](ROADMAP.md). Los principales: más eventos y personalidades, mercado de pases, lesiones más profundas, relaciones entre jugadores e historias emergentes.

## Estructura del proyecto

```
src/
  game/          Motor del juego (sin UI)
    types.ts       Tipos del estado (serializable a JSON)
    balance.ts     TODOS los números de balance, centralizados
    rng.ts         RNG determinista (mulberry32)
    match.ts       Simulación de partidos y evaluación de quintetos
    economy.ts     Cuotas, gastos fijos, sponsor, morosidad
    actions.ts     Las 10 acciones semanales
    events.ts      Los 19 eventos con decisiones
    week.ts        Nueva partida, confirmación de acciones, avance semanal
    preseason.ts   Pretemporada: continuidad, negociaciones, cierre
    preseasonEvents.ts  Eventos de pretemporada
    evaluation.ts  Evaluación de fin de temporada
  data/          Datos iniciales (plantel, rivales, reclutas, mercado de fichables)
  state/         Reducer del estado global
  persistence/   Guardado en LocalStorage
  ui/            Componentes React (Dashboard, Plantilla, Finanzas, Liga, Semana…)
```

El estado completo del juego es un único objeto JSON; toda la lógica vive en `src/game/` y es independiente de React.
