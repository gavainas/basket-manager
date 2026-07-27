# Balance de jugabilidad

Cómo está balanceado el juego, qué se ajustó en la 1ª pasada (julio 2026) y
cómo probar cualquier cambio con datos antes de tocar números.

**Regla de oro**: todos los números viven en [`src/game/balance.ts`](../src/game/balance.ts).
La lógica de `src/game/` es pura (sin React ni browser), así que se puede
simular desde Node.

## Cómo probar el balance

```
npm run sim          # 80 temporadas por estrategia (~1 min)
npm run sim -- 30    # menos corridas, más rápido
```

El harness ([`scripts/sim-balance.cjs`](../scripts/sim-balance.cjs)) compila
`src/game` + `src/data` y juega temporadas completas de fase regular con tres
estrategias de referencia, **sin acciones del manager** (mide el piso):

- `presionRotate`: presión a toda cancha + rotar piernas frescas (la ex-dominante).
- `zonaEquipo`: zona pasiva sin tocar el banco.
- `mixta`: hombre temprano, zona al final, cerradores en el último cuarto.

Reporta: % de victorias, remontadas (concretadas / oportunidades), lesiones en
partido por temporada, distribución de ausencias por semana y por jugador, caja
final, quiebras, **abandonos por temporada** y **cuántos quedan con bronca viva
al cierre** (con el motivo). Flujo de trabajo: tocar `balance.ts` → `npm run sim`
→ mirar si los objetivos de abajo se sostienen.

Las dos últimas métricas son el termómetro del estado emocional (`mood.ts`):
como el harness juega **sin acciones del manager**, nadie atiende una sola
queja en toda la temporada. Es el techo de bronca posible, no lo esperable en
una partida jugada de verdad.

## Objetivos de balance (qué mirar en el reporte)

| Métrica | Objetivo | Última corrida |
|---|---|---|
| Presión vs otras tácticas | La mejor, pero no dominante (55-60%) | 59.8% vs 53.2% (mixta) vs 41.9% (zona) |
| Remontadas propias (9+ abajo) | Raras pero reales (~5%) | 4/89 |
| Nos remontan (9+ arriba) | Ninguna ventaja sellada (~7-10%) | 13/217 |
| Lesiones en partido / temporada | 1-2 | 1.4 |
| Semanas sin ausencias | ~1/3 (que "vinieron todos" sea noticia) | 35% |
| Top faltador vs resto | Tato ~2/temp, resto ~0.7 (no siempre el mismo) | ✓ |
| Caja final sin recaudar | Deriva leve, con riesgo real de quiebre | ~$385 y ~10% de quiebras |
| Abandonos / temporada (sin gestión) | Castigar ignorar al plantel, no ser una masacre | 0.00 rotando · 1.63 sin tocar el banco |

## Sistemas de la 1ª pasada

### Partido en vivo (`liveMatch` en balance.ts, lógica en `match.ts`)

- **Rachas** (`rachaChance` 15%/cuarto por equipo): parciales de +3..7 puntos con
  nota en el relato. Cola gorda que genera y borra ventajas — es lo que hace
  posibles las remontadas de verdad.
- **Empuje del que va abajo** (`comebackDeficit`/`comebackFactor`/`comebackMaxPoints`):
  perdiendo por 9+ al arrancar un cuarto, hasta +3 puntos de empuje proporcional
  al déficit; el que va cómodo sufre el efecto inverso.
- **La presión es una apuesta** (`presionBreakBase` + fuerza del rival + estilo
  corredor): aún con piernas, el rival puede romperla ese cuarto (multiplicador
  1.1 en vez de 0.84). Contra rivales fuertes la rompe ~1 de cada 3 cuartos.
- **El rival se adapta** (`aggressiveAdapt`): cada cuarto previo de defensa
  agresiva (hombre/presión) le enseña a salir (+3% acumulativo).
- Más azar: `luckPerQuarter` 3→5 y `rivalDayVariance` ±10% por cuarto.

### Lesiones (`src/game/injuries.ts`)

- **Fragilidad** (0-100): rasgo fijo derivado del id del jugador + edad
  (`fragilityOf`). No se guarda en el save: se deriva siempre igual, así que no
  hubo migración. La ficha (pestaña Deportiva → "Durabilidad") da la pista:
  🪨 cuerpo noble / ✔️ confiable / ⚠️ se resiente / 🩹 de cristal.
- **En pleno partido** (`matchInjuryBase` 0.6%/cuarto, escalado por fragilidad,
  ×1.8 con piernas <35, ×1.25 defendiendo agresivo): sale de la cancha con
  cambio forzado, queda 1-3 semanas afuera (los frágiles, más), parte en el
  informe y noticia.
- **En el entrenamiento**: el lesionado se sortea pesado por fragilidad
  (`pickByFragility`), ya no parejo.
- **Jugando en otro lado** (convocatoria): base 2% para todos + extra por poco
  compromiso, todo escalado por fragilidad. Nadie está exento.

### Ausencias (`callup.ts` + `absences.ts`)

- **Imprevistos de la vida** (`lifeChance` 5%/semana, parejo para todo el
  plantel): enfermedad, viaje o guardia laboral, con excusas propias. Enfermo y
  viaje no tienen acción posible (solo aceptar); la guardia admite "que venga
  al segundo tiempo".
- Las **excusas flojas** siguen dependiendo del compromiso (los de <60 fallan
  más, el talentoso informal suma extra), pero ya no son la única fuente.
- `maxOut` 2→3: existen las semanas negras de 3 bajas (~7% de las semanas).

### Estado emocional unificado (`src/game/mood.ts`)

La queja activa (causa + nivel 1-3 + reincidencia) escala sola si el motivo se
repite. Los números salieron de medir, no de intuición:

- **Umbrales de escalada** (`HITS_TO_LEVEL2` 3, `HITS_TO_LEVEL3` 6): con 2 y 4
  el plantel al que nunca le das minutos perdía **2.39 jugadores por temporada**
  (contra 0.39 antes del sistema) y arrastraba la economía: la caja de `zona`
  caía de $350 a $231 y las quiebras subían de 8 a 17 sobre 80 temporadas.
  Con 3 y 6, los abandonos quedan en 1.63 y las quiebras vuelven a 7.
- **Golpe de motivación por nivel** (`LEVEL_HIT` 0 / 0 / -4 / -6): el nivel 1 no
  toca ningún número a propósito — una molestia es una anotación en la ficha,
  no un castigo. Recién cuando se hace costumbre pesa en el ánimo, y siempre
  va **encima** de lo que ya descuenta el banco cada fecha.
- **Irse con la bronca al tope**: un jugador con motivación alta pero queja
  nivel 3 puede irse igual, con menos probabilidad (15% por semana estando al
  borde, contra el 30% del que además está desmotivado).

El gradiente resultante es el que se buscaba: rotando el banco no se va nadie
(0.00/temp), sin tocarlo nunca se va gente en serio (1.63/temp) — y eso último
midiéndolo sin que el manager hable una sola vez con nadie.

### Economía (`economy` en balance.ts, lógica en `economy.ts`)

- Alquiler $140→165 y árbitros $60→80: los gastos fijos ya no se cubren solos
  con las cuotas.
- **Imprevistos** (`mishapChance` 25%/semana, $30-90): multas de la liga,
  reflectores quemados, plomero. Con noticia y asiento en el libro.
- Rifa: cuesta $30 y rinde $30-170 (antes $25 → $60-190). Sigue siendo negocio,
  pero ya no es plata gratis.

## Pendiente (ver ROADMAP)

- Niveles de dificultad seleccionables (fácil/normal/difícil) como presets
  sobre `balance.ts`.
- Afinar con datos de partidas reales de Gabi (el harness mide el piso sin
  gestión; una partida jugada bien debería estar cómodamente arriba de eso).
- Lesiones: recuperación progresiva y gravedad más fina.
