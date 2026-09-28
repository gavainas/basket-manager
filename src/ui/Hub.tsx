import { useContext, useState } from 'react';
import type { GameState, Player, Position } from '../game/types';
import { BALANCE } from '../game/balance';
import { activePlayers } from '../game/match';
import { CAUSE_SHORT } from '../game/mood';
import { clubByLegacyId, USER_CLUB_ID, USER_TEAM_ID, userFixtureOfWeek } from '../game/world';
import { weekTimeline } from '../game/weekTimeline';
import { Crest } from './Crest';
import { Busto, FilaDePie, type PersonaDePie } from './Busto';
import { OpenProfileContext } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext, type AppFocus, type AppTab } from './nav';
import { watchItems, type TileId, type WatchItem } from './watch';
import { formatDateLong, rivalDifficulty, rivalStyleInfo, weekLabel } from './helpers';
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

/**
 * Lo que el tablero cuenta en la card del último partido cuando todavía no
 * hay ninguno esta temporada. En la temporada 1 es la promesa ("la historia
 * empieza en la cancha"); de la 2 en adelante el club ya tiene pasado, y
 * decirle "después del primer partido vas a ver el resultado" a un campeón
 * recién ascendido era contradecir el palmarés de al lado. Se cuenta la
 * temporada pasada: en qué categoría, cómo terminó y si subió o bajó.
 */
export function temporadaPasada(state: GameState): { titulo: string; sub: string; record: string; detalle: string } | null {
  const ps = state.pastSeasons[state.pastSeasons.length - 1];
  if (!ps) return null;
  const categoria = ps.division ? ps.division.replace(/^.* · /, '') : '';
  const movida = ps.moved ? (ps.moved.kind === 'ascenso' ? ` Subimos a la ${ps.moved.to}.` : ` Bajamos a la ${ps.moved.to}.`) : '';
  return {
    titulo: ps.outcome,
    sub: `Temporada ${ps.season}${categoria ? ` · ${categoria}` : ''}`,
    record: ps.record,
    detalle: `${ps.position}° de la tabla, récord ${ps.record}.${movida}`,
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
/** Cómo se llama el lugar al que lleva cada aviso, dicho al final de la frase. */
const DESTINO: Record<TileId, string> = {
  lista: 'La semana', quinteto: 'Quinteto', partido: 'El partido', tabla: 'La liga',
  calendario: 'Calendario', rankings: 'Rankings', plantilla: 'Plantel', vestuario: 'Vestuario',
  cuerpo: 'Cuerpo técnico', cuotas: 'Cuotas', gastos: 'Gastos', objetivos: 'La comisión',
  noticias: 'Noticias', historia: 'Historia',
};
const ACTIONS: Record<string, [string, string]> = {
  planning: ['Preparar el partido', 'Decidí la semana y después confirmá quién viene.'],
  callUp: ['Resolver la convocatoria', 'Revisá las ausencias antes de armar el quinteto.'],
  lineup: ['Armar el quinteto', 'Elegí los cinco, el banco y el plan de juego.'],
  match: ['Volver al partido', 'Los cambios y las decisiones se hacen desde la cancha.'],
  matchResult: ['Ver el informe y seguir', 'Revisá lo que dejó el partido antes de avanzar.'],
};
const POS_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

/**
 * Un aviso del radar partido en título y bajada: lo que pasa, en negrita, y el
 * porqué o el qué hacer abajo. Los textos de `watch.ts` son una sola frase con
 * dos puntos o un punto en el medio; se corta ahí. Si no hay corte, va entero.
 */
function partirAviso(text: string): [string, string] {
  const dos = text.indexOf(': ');
  if (dos > 12 && dos < 90) return [text.slice(0, dos), text.slice(dos + 2)];
  const punto = text.indexOf('. ');
  if (punto > 12 && punto < 90) return [text.slice(0, punto), text.slice(punto + 2)];
  return [text, ''];
}

/** Días que faltan para el partido, contados desde el día en que va la semana. */
function diasParaElPartido(state: GameState): number {
  return Math.max(0, -weekTimeline(state).todayOffset);
}

/** El nombre de la categoría del club: «Liga Universitaria · Divisional B». */
function categoria(state: GameState): string {
  const entry = state.world.entries.find((e) => e.teamId === USER_TEAM_ID && e.status === 'activa');
  const division = state.world.divisions.find((d) => d.id === entry?.divisionId);
  const league = state.world.leagues.find((l) => l.id === entry?.leagueId);
  return [league?.name, division?.name].filter(Boolean).join(' · ');
}

/** Puesto en la tabla y récord de un equipo (la tabla de la liga, no la del mundo). */
function enLaTabla(state: GameState, teamId: string): { pos: number; record: string } | null {
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
  const i = sorted.findIndex((r) => r.teamId === teamId);
  if (i < 0) return null;
  return { pos: i + 1, record: `${sorted[i].wins}-${sorted[i].losses}` };
}

/**
 * El Tablero (UI V1, aprobado por Gabi el 28/9 — design/propuestas/
 * tablero-rediseno/, v4). Lunes en el club: faltan unos días para el partido,
 * ¿llegamos bien? Tres capas de lectura, en este orden:
 *
 * 1. El partido, sin caja, grande, sobre el gimnasio: los dos escudos, cuántos
 *    días faltan, dónde, la clave del rival y el único botón naranja.
 * 2. «Esta semana»: la planilla pegada con cinta, con hasta tres problemas,
 *    cada uno con la cara de quien lo tiene y a dónde ir a resolverlo.
 * 3. El plantel de pie sobre el parquet, ordenado por puesto, con el problema
 *    escrito debajo del que lo tiene. Los que no están, al final y en gris.
 *
 * Lo demás (el último partido, la tabla, la comisión) es una frase. No hay
 * atajos: repetían la barra de arriba. Tampoco se muestran los grupos del
 * vestuario: se descubren entrando al Vestuario y cambian durante el juego.
 */
export function Hub({ state }: { state: GameState }) {
  const navigate = useContext(NavigateTabContext);
  const open = useContext(OpenProfileContext);
  const { reloj } = useContext(MatchClockContext);
  const [todos, setTodos] = useState(false);
  const readiness = hubReadiness(state);
  const warnings = watchItems(state);
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  const rival = state.rivals.find(r => r.id === state.schedule[upcomingWeek - 1]);
  const rivalClub = rival ? clubByLegacyId(state.world, rival.id) : undefined;
  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);
  const fixture = userFixtureOfWeek(state.world, upcomingWeek);
  const venue = state.world.venues.find(v => v.id === fixture?.venueId);
  const score = state.phase === 'match' && state.live ? visibleScore(state, state.live, reloj) : null;
  // El resultado del encuentro en curso permanece oculto hasta salir del vivo.
  const previous = state.phase === 'match'
    ? [...state.history].reverse().find(m => m.week < state.week)
    : state.lastMatch;
  const pasada = temporadaPasada(state);
  const action = ACTIONS[state.phase] ?? ['Continuar la temporada', 'Seguí con el próximo paso del club.'];
  const nuestro = enLaTabla(state, 'club');
  const suyo = rival ? enLaTabla(state, rival.id) : null;
  const liga = categoria(state);
  const dias = diasParaElPartido(state);
  const jugado = state.phase === 'matchResult' ? state.lastMatch : null;
  const byId = new Map(state.players.map((p) => [p.id, p]));

  // «Esta semana»: los avisos malos y los de alerta primero (ya vienen
  // ordenados), tres a la vista y el resto a un click.
  const visibles = todos ? warnings : warnings.slice(0, 3);
  const aviso = (item: WatchItem, i: number) => {
    const [titulo, bajada] = partirAviso(item.text);
    const caras = (item.who ?? []).map((id) => byId.get(id)).filter((p): p is Player => !!p).slice(0, 2);
    return (
      <button key={`${item.tile}-${i}`} className={`tablero-aviso ${item.cls}`} onClick={() => navigate(...ROUTES[item.tile])}>
        <span className="tablero-aviso-nro">{i + 1}</span>
        <span className={`tablero-aviso-cara n${caras.length}`} aria-hidden="true">
          {caras.length === 0 ? <span className="tablero-aviso-ico">{item.kind === 'plata' ? '$' : '!'}</span>
            : caras.map((p) => <span key={p.id} className="tablero-cara"><Busto seed={p.id} personality={p.personality} /></span>)}
        </span>
        <span className="tablero-aviso-txt">
          <b>{titulo}</b>
          <span>{bajada} <em>{DESTINO[item.tile]} →</em></span>
        </span>
      </button>
    );
  };

  // El plantel de pie: por puesto, los que no están al final.
  const personas: PersonaDePie[] = [...activePlayers(state.players)]
    .sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position))
    .map((p) => {
      const est = estadoDe(p, state);
      return {
        id: p.id,
        nombre: shortName(p.name),
        personality: p.personality,
        sub: POS_ABBR[p.position] ?? p.position.slice(0, 3).toUpperCase(),
        estado: est.label ? { cls: est.cls, label: est.label } : null,
        fuera: est.fuera,
        title: `${p.name} — ${playerSignals(p).map((s) => s.label).join(' · ')}`,
        onClick: () => open(p.id),
      };
    });
  const figura = (jugado ?? previous)?.mvpName;
  if (figura) {
    const f = personas.find((p) => byId.get(p.id)?.name === figura);
    if (f && !f.estado && !f.fuera) f.estado = { cls: 'good', label: 'Figura' };
  }

  const escudo = (club: typeof userClub, size: number) =>
    club ? <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={size} /> : null;

  return (
    <div className="tablero pantalla">
      <section className="tablero-hero v1-hero" aria-label="El partido">
        <div className="v1-eyebrow">
          {score ? 'Partido en curso' : jugado ? 'El partido de hoy' : 'La próxima fecha'}
          {' · '}<b>{weekLabel(jugado ? state.week : upcomingWeek, state.seasonLength).replace('Semana', 'Fecha')}</b>
          {liga && <> · {liga}</>}
        </div>
        {jugado ? (
          <div className="tablero-versus">
            <div className="tablero-equipo">{escudo(userClub, 84)}<div><div className="tablero-nombre">{state.club.name}</div></div></div>
            <div className={`tablero-marcador ${jugado.scoreFor > jugado.scoreAgainst ? 'good' : 'bad'}`}>{jugado.scoreFor} – {jugado.scoreAgainst}</div>
            <div className="tablero-equipo">{escudo(clubByLegacyId(state.world, jugado.rivalId), 84)}<div><div className="tablero-nombre">{jugado.rivalName}</div></div></div>
          </div>
        ) : rival ? (
          <div className="tablero-versus">
            <div className="tablero-equipo">
              {escudo(userClub, 84)}
              <div>
                <div className="tablero-nombre">{state.club.name}</div>
                {nuestro && <div className="tablero-sub"><b>{nuestro.pos}°</b> · {nuestro.record}</div>}
              </div>
            </div>
            {score ? <div className="tablero-marcador">{score.f} – {score.a}</div> : <div className="tablero-vs">VS</div>}
            <div className="tablero-equipo">
              {escudo(rivalClub, 84)}
              <div>
                <div className="tablero-nombre"><RivalLink id={rival.id}>{rival.name}</RivalLink></div>
                {suyo && <div className="tablero-sub"><b>{suyo.pos}°</b> · {suyo.record}</div>}
              </div>
            </div>
          </div>
        ) : (
          <h2 className="v1-titulo">{state.phase === 'matchResult' ? 'Esperando el próximo cruce' : 'Sin partido programado'}</h2>
        )}

        {rival && !jugado && !score && (
          <>
            <div className="tablero-meta">
              <div className="v1-cifra">{dias === 0 ? 'HOY' : dias === 1 ? '1 DÍA' : `${dias} DÍAS`}<small>{dias === 0 ? 'se juega' : 'para el partido'}</small></div>
              <div className="tablero-cuando">
                {fixture ? `${cap(formatDateLong(fixture.date))} · ${fixture.time}` : 'Fecha y horario por confirmar'}
                <span>
                  {venue ? `${venue.name} · ${venue.neighborhood}` : 'Cancha por confirmar'}
                  {' · '}
                  <b>{readiness.confirmed ?? readiness.available}</b> {readiness.confirmed === null ? 'disponibles · sin confirmar' : readiness.confirmed === 1 ? 'confirmado' : 'confirmados'}
                </span>
              </div>
            </div>
            <p className="tablero-clave">
              <b>{rivalDifficulty(rival).label}.</b> {rivalStyleInfo(rival.style).label}: {rivalStyleInfo(rival.style).desc.split(':')[0].toLowerCase()}.
            </p>
          </>
        )}
        {jugado && (
          <p className="tablero-clave">
            {jugado.summary}
            {jugado.mvpName && <> Figura: <strong>{jugado.mvpName}</strong>.</>}
          </p>
        )}

        <div className="tablero-cta">
          <button className="primary v1-cta" onClick={() => navigate('semana')}>{action[0]} →</button>
        </div>

        <p className="v1-frase tablero-contexto">
          {jugado ? (
            rival ? <>Lo que sigue: <b>{rival.name}</b>{fixture ? `, ${formatDateLong(fixture.date)}` : ''}.</> : <>Cerrá el informe para conocer el siguiente paso de la temporada.</>
          ) : previous ? (
            <>Venimos de {previous.scoreFor > previous.scoreAgainst ? 'ganarle' : 'perder'} <b className={previous.scoreFor > previous.scoreAgainst ? 'good' : 'bad'}>{previous.scoreFor}–{previous.scoreAgainst}</b> {previous.scoreFor > previous.scoreAgainst ? 'a' : 'con'} {previous.rivalName}{nuestro && <> · <b>{nuestro.pos}°</b> en la tabla</>}{objetivoFrase(state)}</>
          ) : pasada ? (
            <>La temporada pasada (<span>{pasada.sub}</span>): <b>{pasada.titulo}</b> {pasada.detalle}</>
          ) : (
            <><b>La historia empieza en la cancha</b>: después del primer partido acá vas a ver cómo venimos.{objetivoFrase(state)}</>
          )}
        </p>
      </section>

      <aside className="tablero-semana v1-planilla" aria-label="Esta semana">
        <i className="v1-cinta a" /><i className="v1-cinta b" />
        <h3 className="v1-mano">Esta semana <span>{state.phase === 'matchResult' ? 'lo que dejó el partido' : dias === 0 ? 'hoy se juega' : 'antes del partido'}</span></h3>
        {warnings.length === 0 ? (
          <p className="tablero-tranquila">Semana tranquila: nadie con problemas a la vista. Buen momento para entrenar o hacer un asado.</p>
        ) : (
          <div className="tablero-avisos">{visibles.map(aviso)}</div>
        )}
        {warnings.length > 3 && (
          <button className="tablero-mas" onClick={() => setTodos(!todos)}>
            {todos ? 'Ver menos' : warnings.length === 4 ? '+ 1 aviso más' : `+ ${warnings.length - 3} avisos más`}
          </button>
        )}
      </aside>

      <section className="tablero-plantel" aria-label="El plantel">
        <FilaDePie personas={personas} />
      </section>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** El encargo de la comisión que más importa, dicho como frase. */
function objetivoFrase(state: GameState) {
  const o = state.objectives[0];
  if (!o) return null;
  return <> · la comisión pide <b>{o.label.charAt(0).toLowerCase() + o.label.slice(1)}</b></>;
}

/** Lo que se escribe debajo de cada jugador en la fila: una sola cosa, la peor. */
function estadoDe(p: Player, state: GameState): { cls: 'good' | 'warn' | 'bad'; label: string | null; fuera: boolean } {
  if (p.status === 'lesionado') {
    return { cls: 'bad', label: p.injuryReason === 'laboral' ? 'Laburo' : `Lesión · ${p.injuryWeeks} sem`, fuera: true };
  }
  if ((p.suspendedWeeks ?? 0) > 0) return { cls: 'bad', label: 'Suspendido', fuera: true };
  const called = ['callUp', 'lineup', 'match'].includes(state.phase);
  if (called) {
    const c = state.callUp.find((x) => x.playerId === p.id);
    if (c && c.status !== 'confirmado') return { cls: 'bad', label: 'No viene', fuera: true };
  }
  const g = p.grievance;
  if (p.status === 'al_borde' || (g && g.level >= 3)) return { cls: 'bad', label: 'Al borde', fuera: false };
  if (p.physical <= BALANCE.callUp.exhaustedThreshold) return { cls: 'warn', label: 'Fundido', fuera: false };
  if (p.status === 'molesto' || (g && g.level >= 2)) return { cls: 'warn', label: g ? 'Con bronca' : 'Molesto', fuera: false };
  if (p.weeksUnpaid >= 2) return { cls: 'warn', label: 'Debe cuota', fuera: false };
  return { cls: 'good', label: null, fuera: false };
}
