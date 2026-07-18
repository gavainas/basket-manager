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
final y quiebras. Flujo de trabajo: tocar `balance.ts` → `npm run sim` → mirar
si los objetivos de abajo se sostienen.

## Objetivos de balance (qué mirar en el reporte)

| Métrica | Objetivo | Última corrida |
|---|---|---|
| Presión vs otras tácticas | La mejor, pero no dominante (55-60%) | 57% vs 52% (mixta) vs 45% (zona) |
| Remontadas propias (9+ abajo) | Raras pero reales (~5%) | 5/90 |
| Nos remontan (9+ arriba) | Ninguna ventaja sellada (~7-10%) | 14/203 |
| Lesiones en partido / temporada | 1-2 | 1.4 |
| Semanas sin ausencias | ~1/3 (que "vinieron todos" sea noticia) | 35% |
| Top faltador vs resto | Tato ~2/temp, resto ~0.7 (no siempre el mismo) | ✓ |
| Caja final sin recaudar | Deriva leve, con riesgo real de quiebre | ~$370 y ~10% de quiebras |

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
