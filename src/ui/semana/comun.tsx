// Lo que comparten las etapas de la semana (sep 2026, punto 3 del roadmap:
// `WeekView.tsx` partido en sus etapas). Acá viven los pasos de arriba, la tira
// de días y los helpers chicos que usan dos o más etapas; cada etapa vive en
// su archivo (LaSemana, Convocatoria, Quinteto, Informe) y el partido en vivo
// en `PartidoVivo.tsx`. `WeekView.tsx` sólo elige cuál mostrar.

import type { GameState, Position, WeekDay } from '../../game/types';
import type { GameAction } from '../../state/gameReducer';
import { weekTimeline } from '../../game/weekTimeline';
import { userGameDay } from '../../game/moments';
import { userFixtureOfWeek } from '../../game/world';
import { Icon, type IconName } from '../Icon';

export const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
export const POS_ABBR: Record<Position, string> = {
  Base: 'BA',
  Escolta: 'ES',
  Alero: 'AL',
  'Ala-Pívot': 'AP',
  Pívot: 'PI',
};

export interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/**
 * Ícono de cada acción del club. Vive acá y no en `game/actions.ts` porque cómo
 * se dibuja una acción es presentación, y la lógica del juego no depende de
 * React (ver CLAUDE.md). Antes eran emoji hardcodeados en el archivo de lógica,
 * que además es justo lo que `Icon.tsx` pide no hacer.
 */
const ACTION_ICON: Record<string, IconName> = {
  training: 'gimnasio',
  asado: 'asado',
  raffle: 'rifa',
  sponsor: 'comercio',
  talk: 'chat',
  mediate: 'vestuario',
  collect: 'plata',
  scholarship: 'beca',
  jerseys: 'camiseta',
  rest: 'descanso',
  recruit: 'lupa',
};

/** Si aparece una acción nueva sin ícono, cae en uno neutro en vez de romper. */
export function actionIcon(id: string): IconName {
  return ACTION_ICON[id] ?? 'inscripcion';
}

export function shortName(name: string): string {
  const parts = name.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  return parts[parts.length - 1];
}

export function absentIds(state: GameState): Set<string> {
  return new Set(state.callUp.filter((c) => c.status === 'ausente').map((c) => c.playerId));
}

export function Steps({ phase }: { phase: GameState['phase'] }) {
  const steps = [
    { key: 'planning', label: '1 · La semana' },
    { key: 'callUp', label: '2 · Convocatoria' },
    { key: 'lineup', label: '3 · Quinteto' },
    { key: 'match', label: '4 · Partido' },
    { key: 'matchResult', label: '5 · Informe' },
  ];
  const order = steps.map((s) => s.key);
  const current = order.indexOf(phase);
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <span key={s.key} className={`step ${i === current ? 'active' : i < current ? 'done' : ''}`}>
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ---------- El calendario de la semana ----------

const WEEK_DAYS: WeekDay[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_ABBR: Record<WeekDay, string> = {
  lunes: 'LUN',
  martes: 'MAR',
  miércoles: 'MIÉ',
  jueves: 'JUE',
  viernes: 'VIE',
  sábado: 'SÁB',
  domingo: 'DOM',
};

/** "14/9" desde la fecha ISO del fixture. */
function shortDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}

/**
 * La semana como tira de días, contada hacia el partido: se planifica a 3
 * días, la lista se larga a 2, y el día de la fecha se arma el quinteto y se
 * juega. Los momentos del mundo y el asado caen en su día: verlos venir es
 * poder planificar.
 */
export function SemanaStrip({ state }: { state: GameState }) {
  const gameDay = userGameDay(state);
  const fx = userFixtureOfWeek(state.world, state.week);
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1]);
  const gi = WEEK_DAYS.indexOf(gameDay);
  // Offset de cada fase respecto del partido (0 = día de la fecha).
  const { todayOffset, callUpOffset, callUpLabel, asadoOffset, asadoLabel } = weekTimeline(state);
  // La tira muestra 7 días terminando uno después del partido: una cuenta regresiva.
  const offsets = [-5, -4, -3, -2, -1, 0, 1];
  const momentOffset = state.weekMoment
    ? ((WEEK_DAYS.indexOf(state.weekMoment.day) - gi + 7 + 5) % 7) - 5
    : null;
  const date = shortDate(fx?.date);

  return (
    <div className="semana-strip">
      {offsets.map((off) => {
        const day = WEEK_DAYS[(gi + off + 14) % 7];
        const isToday = off === todayOffset;
        const isMatch = off === 0;
        const marks: { icon: IconName; text: string }[] = [];
        if (isMatch && rival) marks.push({ icon: 'pelota', text: `vs ${rival.name}${fx?.time ? ` · ${fx.time}` : ''}` });
        if (momentOffset === off && state.weekMoment) marks.push({ icon: 'destacado', text: state.weekMoment.title });
        if (asadoOffset === off) marks.push({ icon: 'asado' as IconName, text: asadoLabel });
        if (off === callUpOffset) marks.push({ icon: 'plantel', text: callUpLabel });
        return (
          <div key={off} className={`dia-cell${isToday ? ' dia-hoy' : ''}${isMatch ? ' dia-partido' : ''}`}>
            <div className="dia-nombre">
              {DAY_ABBR[day]}
              {isMatch && date ? <span className="dia-fecha"> {date}</span> : null}
            </div>
            {isToday && <div className="dia-tag">HOY</div>}
            {marks.map((m, i) => (
              <div key={i} className="dia-marca" title={m.text}>
                <Icon name={m.icon} size={12} /> <span>{m.text}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
