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

Cada turno es una semana (temporada de 9 semanas):

1. **Revisar** el estado del club (Resumen, Plantilla, Finanzas, Liga).
2. **Decidir**: elegir hasta 2 acciones semanales (entrenar, asado, rifa, sponsor, becar, cobrar cuotas, reclutar…).
3. **Eventos**: la mayoría de las semanas pasa algo que exige una decisión con consecuencias.
4. **Quinteto**: elegir los 5 titulares (cuidando posiciones, físico y egos).
5. **Partido**: simulación con marcador, MVP, claves del resultado y notas de vestuario.
6. **Avanzar**: se cobran cuotas, se pagan gastos, los ánimos evolucionan… y alguno puede irse.

Al final, una evaluación multidimensional: resultado deportivo, salud financiera, retención, prestigio deportivo, prestigio social y momentos memorables. Se puede salir campeón con el vestuario roto, o terminar último con un grupo inolvidable.

**Derrota directa**: caja por debajo de $0 o menos de 5 jugadores.

## Sistemas implementados

- Plantel de 12 jugadores con 8 personalidades (competitivo, social, protagonista, leal, mercenario, cumplidor, veterano, talentoso informal) que afectan su comportamiento.
- **Información imperfecta**: la valoración visible (≈) es una estimación con ruido; el rendimiento real surge de técnica + físico + motivación + confianza + química + posiciones.
- 10 acciones semanales con costos, beneficios y riesgos (máximo 2 por semana).
- 12 eventos aleatorios con decisiones y consecuencias visibles.
- Economía: cuotas, morosos, becas totales/parciales, sponsor, rifas, alquiler de cancha, libro de movimientos.
- Simulación de partidos con explicación del resultado (nivel, físico, motivación, química, posiciones, suerte).
- Liga de 10 equipos con tabla viva (los rivales juegan entre sí).
- Moral, ambiente social, organización y doble prestigio (deportivo/social).
- Jugadores que se molestan, amenazan con irse y abandonan.
- Guardado automático, continuar y reiniciar partida.
- Azar con semilla determinista (reproducible desde un guardado).

## Sistemas pendientes

Ver [ROADMAP.md](ROADMAP.md). Los principales: rotaciones y minutos por jugador, entrenamientos con progresión, mercado de pases, lesiones más profundas, relaciones entre jugadores e historias emergentes.

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
    events.ts      Los 12 eventos con decisiones
    week.ts        Nueva partida, confirmación de acciones, avance semanal
    evaluation.ts  Evaluación de fin de temporada
  data/          Datos iniciales (plantel, rivales, reclutas)
  state/         Reducer del estado global
  persistence/   Guardado en LocalStorage
  ui/            Componentes React (Dashboard, Plantilla, Finanzas, Liga, Semana…)
```

El estado completo del juego es un único objeto JSON; toda la lógica vive en `src/game/` y es independiente de React.
