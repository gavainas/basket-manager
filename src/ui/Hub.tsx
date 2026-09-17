import { useContext } from 'react';
import type { GameState, Player } from '../game/types';
import { BALANCE } from '../game/balance';
import { activePlayers } from '../game/match';
import { CAUSE_SHORT } from '../game/mood';
import { clubByLegacyId, userFixtureOfWeek } from '../game/world';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { OpenProfileContext } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { StyleChip } from './StyleChip';
import { NavigateTabContext, type AppFocus, type AppTab } from './nav';
import { watchItems, type TileId } from './watch';
import { formatDateLong, rivalDifficulty, weekLabel } from './helpers';
import { MatchClockContext, visibleScore } from './matchPresentation';
import './Hub.css';

/** Los tres semáforos de la tira: ánimo, cuota y físico. */
function playerSignals(p: Player): { cls: string; label: string }[] {
  const g = p.grievance;
  const animo =
    p.status === 'al_borde' || (g && g.level >= 3)
      ? { cls: 'bad', label: g ? `Bronca por ${CAUSE_SHORT[g.cause]}` : 'Al borde de irse' }
      : p.status === 'molesto' || (g && g.level >= 1) || p.motivation < 45
        ? { cls: 'warn', label: g ? `Masticando ${CAUSE_SHORT[g.cause]}` : 'Con la moral baja' }
        : { cls: 'good', label: 'De buen ánimo' };

  const cuota =
    p.weeksUnpaid >= 2
      ? { cls: 'bad', label: `Debe ${p.weeksUnpaid} semanas de cuota` }
      : p.feeStatus === 'pendiente'
        ? { cls: 'warn', label: 'Cuota pendiente' }
        : { cls: 'good', label: 'Cuota al día' };

  const fisico =
    p.status === 'lesionado'
      ? p.injuryReason === 'laboral'
        ? { cls: 'bad', label: `Complicado con el laburo (${p.injuryWeeks} ${p.injuryWeeks === 1 ? 'semana' : 'semanas'})` }
        : { cls: 'bad', label: `Lesionado (${p.injuryWeeks} ${p.injuryWeeks === 1 ? 'semana' : 'semanas'})` }
      : (p.suspendedWeeks ?? 0) > 0
        ? { cls: 'bad', label: 'Suspendido' }
        : p.physical <= BALANCE.callUp.exhaustedThreshold
          ? { cls: 'warn', label: 'Viene fundido' }
          : { cls: 'good', label: 'Entero' };

  return [animo, cuota, fisico];
}

const POS_ABBR: Record<string, string> = {
  Base: 'BAS',
  Escolta: 'ESC',
  Alero: 'ALE',
  'Ala-Pívot': 'ALA',
  Pívot: 'PIV',
};

/** En la tira entra el apodo si lo tiene, y si no el apellido. */
function shortName(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

function PlantelStrip({ state }: { state: GameState }) {
  const open = useContext(OpenProfileContext);
  const active = activePlayers(state.players);

  return (
    <section className="hub-plantel">
      <h3 className="hub-block-title">
        <Icon name="plantel" size={17} />
        El plantel
        <span className="hub-plantel-leyenda">ánimo · cuota · físico</span>
      </h3>
      <div className="hub-plantel-row">
        {active.map((p) => {
          const signals = playerSignals(p);
          return (
            <button
              key={p.id}
              className="hub-jugador"
              onClick={() => open(p.id)}
              title={`${p.name} — ${signals.map((s) => s.label).join(' · ')}`}
            >
              {/* La foto oficial: el retrato ilustrado por arquetipo, la misma
                  en la tira, la ficha, la pizarra y los eventos. */}
              <Avatar seed={p.id} age={p.age} appearance={p.appearance} size={62} title={p.name} personality={p.personality} />
              <span className="hub-jug-pos">{POS_ABBR[p.position] ?? p.position.slice(0, 3).toUpperCase()}</span>
              <span className="hub-jug-nombre">{shortName(p.name)}</span>
              <span className="hub-jug-estado">
                {signals.map((s, i) => (
                  <span key={i} className={`hub-punto ${s.cls}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** La próxima fecha organiza el tablero; consultar nunca avanza la simulación. */
export function hubReadiness(state: GameState) {
  const players = activePlayers(state.players);
  const fit = players.filter(p => p.status !== 'lesionado' && !(p.suspendedWeeks && p.suspendedWeeks > 0));
  const called = ['callUp', 'lineup', 'match'].includes(state.phase);
  /* Con la lista pasada, "de baja" son todos los que no van a estar —los que
     no vienen, los lesionados y los suspendidos—, el mismo número que la
     convocatoria llama "bajas". Antes contaba sólo lesionados y suspendidos y
     el tablero decía "6 confirmados · 0 de baja" con seis que no venían. */
  const confirmedIds = called
    ? new Set(state.callUp.filter(p => p.status === 'confirmado').map(p => p.playerId))
    : null;
  const counted = confirmedIds ? fit.filter(p => confirmedIds.has(p.id)) : fit;
  return {
    available: fit.length,
    confirmed: confirmedIds ? confirmedIds.size : null,
    late: called ? state.callUp.filter(p => p.status === 'confirmado' && p.lateArrival).length : 0,
    tired: counted.filter(p => p.physical <= BALANCE.callUp.exhaustedThreshold).length,
    unavailable: players.length - (confirmedIds ? confirmedIds.size : fit.length),
  };
}

const ROUTES: Record<TileId, [AppTab, AppFocus?]> = {
  lista: ['semana'], quinteto: ['semana'], partido: ['semana'],
  tabla: ['liga'], calendario: ['agenda'], rankings: ['rankings'],
  plantilla: ['plantilla'], vestuario: ['plantilla', 'vestuario'],
  cuerpo: ['plantilla', 'cuerpo-tecnico'], cuotas: ['finanzas', 'cuotas'],
  gastos: ['finanzas', 'gastos'], objetivos: ['club', 'objetivos'],
  noticias: ['club', 'noticias'], historia: ['historia'],
};
const ACTIONS: Record<string, [string, string]> = {
  planning: ['Preparar el partido', 'Decidí la semana y después confirmá quién viene.'],
  callUp: ['Resolver la convocatoria', 'Revisá las ausencias antes de armar el quinteto.'],
  lineup: ['Armar el quinteto', 'Elegí los cinco, el banco y el plan de juego.'],
  match: ['Volver al partido', 'Los cambios y las decisiones se hacen desde la cancha.'],
  matchResult: ['Ver el informe y seguir', 'Revisá lo que dejó el partido antes de avanzar.'],
};

export function Hub({ state }: { state: GameState }) {
  const navigate = useContext(NavigateTabContext);
  const { reloj } = useContext(MatchClockContext);
  const readiness = hubReadiness(state);
  const warnings = watchItems(state);
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  const rival = state.rivals.find(r => r.id === state.schedule[upcomingWeek - 1]);
  const rivalClub = rival ? clubByLegacyId(state.world, rival.id) : undefined;
  const fixture = userFixtureOfWeek(state.world, upcomingWeek);
  const venue = state.world.venues.find(v => v.id === fixture?.venueId);
  const score = state.phase === 'match' && state.live ? visibleScore(state, state.live, reloj) : null;
  // El resultado del encuentro en curso permanece oculto hasta salir del vivo.
  const previous = state.phase === 'match'
    ? [...state.history].reverse().find(m => m.week < state.week)
    : state.lastMatch;
  const action = ACTIONS[state.phase] ?? ['Continuar la temporada', 'Seguí con el próximo paso del club.'];
  const warningButton = (item: typeof warnings[number], i: number) => (
    <button key={`${item.tile}-${i}`} className={`hub-a-alert ${item.cls}`} onClick={() => navigate(...ROUTES[item.tile])}>
      <span>{item.text}</span><span aria-hidden="true">→</span>
    </button>
  );

  return (
    <div className="hub-a pantalla">
      <header className="hub-a-heading">
        <div><span className="hub-a-eyebrow">El tablero del club</span><h2>{state.club.name}</h2></div>
        <span>{weekLabel(state.week, state.seasonLength)} · Temporada {state.seasonNumber}</span>
      </header>
      <div className="hub-a-layout">
        {/* Con el partido en curso la card suma el marcador grande: la clase deja
            que el CSS guarde la cancha y los chips en ventanas bajas (Hub.css). */}
        <section className={`hub-a-match${score ? ' en-juego' : ''}`} aria-label="El partido">
          <div className="hub-a-match-body">
            <div className="hub-a-match-info">
              <span className="hub-a-eyebrow">{score ? 'Partido en curso' : 'La próxima fecha'}</span>
              {rival ? <>
                {/* El escudo va al lado del nombre, no arriba: apilados, con un
                    rival de nombre largo la columna no entraba a 768 y los chips
                    y el link al calendario quedaban recortados (Hub.css). */}
                <div className="hub-a-match-head">
                  {rivalClub && <Crest seed={rivalClub.id} name={rivalClub.name} colors={rivalClub.colors} founded={rivalClub.founded} size={64} />}
                  <h3><span className="hub-a-versus">vs</span> <RivalLink id={rival.id}>{rival.name}</RivalLink></h3>
                </div>
                {score && <strong className="hub-a-score">{score.f} – {score.a}</strong>}
                <p>{fixture ? `${formatDateLong(fixture.date)} · ${fixture.time} h` : 'Fecha y horario por confirmar'}</p>
                <p className="muted">{venue ? `${venue.name} · ${venue.neighborhood}` : 'Cancha por confirmar'}</p>
                <div className="hub-a-chips"><span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span><StyleChip style={rival.style} /></div>
              </> : <><h3>{state.phase === 'matchResult' ? 'Esperando el próximo cruce' : 'Sin partido programado'}</h3><p>{state.phase === 'matchResult' ? 'Cerrá el informe para conocer el siguiente paso de la temporada.' : 'Consultá el calendario y continuá la temporada.'}</p></>}
              <button className="hub-a-link" onClick={() => navigate('agenda')}>Ver calendario →</button>
            </div>
            <div className="hub-a-scene" aria-hidden="true" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}arte/cab-vestuario.webp)` }} />
          </div>
          <div className="hub-a-prepare"><div><strong>{score ? 'El equipo te espera en la cancha' : 'Llegar bien también se juega'}</strong><p>{action[1]}</p></div><button className="primary" onClick={() => navigate('semana')}>{action[0]} →</button></div>
        </section>
        <aside className="hub-a-side">
          <section className="hub-a-card">
            <h3 className="hub-a-band">¿Cómo llegamos?</h3>
            <div className="hub-a-readiness">
              <button onClick={() => navigate(readiness.confirmed === null ? 'plantilla' : 'semana')}><strong>{readiness.confirmed ?? readiness.available}</strong><span>{readiness.confirmed === null ? 'disponibles · sin confirmar' : 'confirmados'}</span></button>
              <button onClick={() => navigate('plantilla')}><strong>{readiness.unavailable}</strong><span>de baja</span></button>
              <button onClick={() => navigate('plantilla')}><strong>{readiness.tired}</strong><span>fundidos</span></button>
            </div>
            {readiness.late > 0 && <p className="hub-a-note">{readiness.late} de los confirmados llegan para el segundo tiempo.</p>}
            {state.phase === 'matchResult' && <p className="hub-a-note">Estado al cierre del partido; la próxima convocatoria todavía no está hecha.</p>}
            <div className="hub-a-alerts">{warnings.length ? warnings.slice(0, 2).map(warningButton) : <p className="hub-a-note">Sin avisos pendientes. Revisá el plantel y prepará el encuentro.</p>}
              {warnings.length > 2 && <details><summary>Ver otros {warnings.length - 2} avisos</summary>{warnings.slice(2).map(warningButton)}</details>}
            </div>
            <button className="hub-a-link" onClick={() => navigate('plantilla', 'vestuario')}>Entrar al vestuario →</button>
          </section>
          <section className="hub-a-card hub-a-previous">
            <h3 className="hub-a-band">Lo que dejó el último partido</h3>
            {previous ? <div className="hub-a-result"><span>Semana {previous.week} · vs {previous.rivalName}</span><strong className="hub-a-score">{previous.scoreFor} – {previous.scoreAgainst}</strong><p>{previous.summary}</p>{previous.mvpName && <p className="muted">Figura: {previous.mvpName}</p>}
              <details><summary>Leer informe del partido</summary><ul>{previous.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>{previous.effects.map((e, i) => <p key={i}>{e}</p>)}{previous.lockerRoom.map((e, i) => <p key={i}>{e}</p>)}</details>
            </div> : <div className="hub-a-result"><strong>La historia empieza en la cancha</strong><p>Después del primer partido vas a ver el resultado, la figura y lo que dejó en el equipo.</p></div>}
          </section>
        </aside>
      </div>
      <PlantelStrip state={state} />
      <nav className="hub-a-shortcuts" aria-label="Consultas del club">
        <button onClick={() => navigate('plantilla', 'cuerpo-tecnico')}>Cuerpo técnico</button><button onClick={() => navigate('liga')}>Tabla</button><button onClick={() => navigate('rankings')}>Rankings</button><button onClick={() => navigate('finanzas', 'cuotas')}>Cuotas</button><button onClick={() => navigate('finanzas', 'gastos')}>Gastos</button><button onClick={() => navigate('club', 'objetivos')}>La comisión</button><button onClick={() => navigate('club', 'noticias')}>Noticias</button>
      </nav>
    </div>
  );
}
