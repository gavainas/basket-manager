import { useContext } from 'react';
import type { GameState, Player } from '../game/types';
import { BALANCE } from '../game/balance';
import { rivalryWith } from '../game/leagueLife';
import { activePlayers, clubPosition } from '../game/match';
import { CAUSE_SHORT } from '../game/mood';
import { clubByLegacyId, USER_CLUB_ID, userFixtureOfWeek } from '../game/world';
import { ClubLink } from './ClubLink';
import { Crest } from './Crest';
import { Icon, type IconName } from './Icon';
import { OpenProfileContext } from './PlayerLink';
import { Retrato } from './Retrato';
import { RivalLink } from './RivalLink';
import { StyleChip } from './StyleChip';
import { NavigateTabContext, type AppFocus, type AppTab } from './nav';
import { watchByTile, type TileId, type WatchItem } from './watch';
import { avgMotivation, formatDateLong, formatMoney, rivalDifficulty, weekLabel } from './helpers';

/**
 * El inicio: un menú, no un tablero.
 *
 * La referencia que eligió Gabi (ago 2026) es un panel de club con cuatro
 * bloques de accesos, el escudo y el partido de la semana en el medio, y el
 * plantel entero abajo. Lo importante no es que sea más lindo: es que la
 * primera pantalla vuelve a ser una *decisión* ("¿a dónde entro?") en vez de un
 * informe que se lee y se abandona.
 *
 * Por eso "Qué mirar hoy" dejó de ser una lista acá: cada urgencia se cuelga del
 * tile que la resuelve (ver watch.ts). El menú se enciende solo y entrar al menú
 * es leer el aviso.
 */

interface Tile {
  id: TileId;
  label: string;
  icon: IconName;
  tab: AppTab;
  focus?: AppFocus;
  /** Lo que dice el tile cuando no hay nada urgente que contar. */
  hint: string;
}

interface Block {
  title: string;
  sec: string;
  icon: IconName;
  tiles: Tile[];
}

function blocks(state: GameState): Block[] {
  const phase = state.phase;
  const active = activePlayers(state.players);
  const alDia = active.filter((p) => p.weeksUnpaid === 0).length;

  return [
    {
      title: 'La semana',
      sec: 'sec-partidos',
      icon: 'semana',
      tiles: [
        {
          id: 'lista',
          label: 'Pasar lista',
          icon: 'inscripcion',
          tab: 'semana',
          hint:
            phase === 'planning'
              ? 'Primero las decisiones de la semana'
              : phase === 'callUp'
                ? 'Ahora: mirá quién confirmó'
                : 'Lista cerrada',
        },
        {
          id: 'quinteto',
          label: 'El quinteto',
          icon: 'cancha',
          tab: 'semana',
          hint:
            phase === 'lineup'
              ? 'Ahora: armá la pizarra'
              : phase === 'match' || phase === 'matchResult'
                ? 'Ya está en cancha'
                : 'Después de pasar lista',
        },
        {
          id: 'partido',
          label: 'El partido',
          icon: 'liga',
          tab: 'semana',
          hint:
            phase === 'match'
              ? 'Ahora: se juega'
              : phase === 'matchResult'
                ? 'Mirá cómo quedó'
                : 'Al final de la semana',
        },
      ],
    },
    {
      title: 'La liga',
      sec: 'sec-partidos',
      icon: 'liga',
      tiles: [
        { id: 'tabla', label: 'Tabla', icon: 'liga', tab: 'liga', hint: `Vas ${clubPosition(state)}° de ${state.standings.length}` },
        { id: 'calendario', label: 'Calendario', icon: 'agenda', tab: 'agenda', hint: 'Fechas, canchas y horarios' },
        { id: 'rankings', label: 'Rankings', icon: 'rankings', tab: 'rankings', hint: 'Quién anota y quién rinde' },
      ],
    },
    {
      title: 'El plantel',
      sec: 'sec-plantel',
      icon: 'plantel',
      tiles: [
        { id: 'plantilla', label: 'Plantilla', icon: 'plantel', tab: 'plantilla', hint: `${active.length} jugadores activos` },
        {
          id: 'vestuario',
          label: 'Vestuario',
          icon: 'vestuario',
          tab: 'plantilla',
          focus: 'vestuario',
          hint: 'Cómo está el grupo por dentro',
        },
        {
          id: 'cuerpo',
          label: 'Cuerpo técnico',
          icon: 'destacado',
          tab: 'plantilla',
          focus: 'cuerpo-tecnico',
          hint: state.coach ? state.coach.name : 'Sin entrenador: dirigís vos',
        },
      ],
    },
    {
      title: 'La caja',
      sec: 'sec-finanzas',
      icon: 'finanzas',
      tiles: [
        {
          id: 'cuotas',
          label: 'Cuotas',
          icon: 'plata',
          tab: 'finanzas',
          focus: 'cuotas',
          hint: `${alDia} de ${active.length} al día`,
        },
        { id: 'gastos', label: 'Gastos', icon: 'caja', tab: 'finanzas', focus: 'gastos', hint: 'Qué entra y qué sale' },
        {
          id: 'objetivos',
          label: 'La comisión',
          icon: 'inscripcion',
          tab: 'club',
          focus: 'objetivos',
          hint: `${state.objectives.length} objetivos de temporada`,
        },
      ],
    },
  ];
}

/** El texto que el tile pone al frente: la urgencia le gana al dato de rutina. */
function tileNote(tile: Tile, items: WatchItem[] | undefined): { text: string; cls: string } {
  if (!items || items.length === 0) return { text: tile.hint, cls: '' };
  const extra = items.length > 1 ? ` (+${items.length - 1})` : '';
  return { text: items[0].text + extra, cls: items[0].cls };
}

function MenuBlock({ block, watch }: { block: Block; watch: Map<TileId, WatchItem[]> }) {
  const navigate = useContext(NavigateTabContext);

  return (
    <section className={`hub-block ${block.sec}`}>
      <h3 className="hub-block-title">
        <Icon name={block.icon} size={17} />
        {block.title}
      </h3>
      <div className="hub-tiles">
        {block.tiles.map((t) => {
          const items = watch.get(t.id);
          const note = tileNote(t, items);
          return (
            <button
              key={t.id}
              className={`hub-tile ${note.cls}`}
              onClick={() => navigate(t.tab, t.focus)}
              title={note.text}
            >
              <span className="hub-tile-ico">
                <Icon name={t.icon} size={22} />
              </span>
              <span className="hub-tile-body">
                <span className="hub-tile-label">{t.label}</span>
                <span className="hub-tile-note">{note.text}</span>
              </span>
              {note.cls && <span className={`hub-tile-dot ${note.cls}`} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

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
        {active.map((p, i) => {
          const signals = playerSignals(p);
          // Cuántos del mismo arquetipo vienen antes: el segundo veterano de la
          // fila no puede ser idéntico al primero.
          const repetido = active.slice(0, i).filter((x) => x.personality === p.personality).length;
          return (
            <button
              key={p.id}
              className="hub-jugador"
              onClick={() => open(p.id)}
              title={`${p.name} — ${signals.map((s) => s.label).join(' · ')}`}
            >
              <Retrato personality={p.personality} title={p.name} variante={repetido} />
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

const PHASE_ACTION: Record<string, string> = {
  planning: 'Decidir la semana',
  callUp: 'Pasar lista',
  lineup: 'Armar el quinteto',
  match: 'Dirigir el partido',
  matchResult: 'Ver el resultado',
};

export function Hub({ state }: { state: GameState }) {
  const navigate = useContext(NavigateTabContext);
  const watch = watchByTile(state);
  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);
  const row = state.standings.find((r) => r.teamId === 'club')!;

  // Tras el partido (matchResult) la semana aún no avanzó: el "próximo" es el que sigue.
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  // En playoffs el rival de semis/final también vive en schedule (lo escribe
  // advancePlayoffs), así que el Hub muestra ese cruce en vez de "sin partido".
  const nextRivalId = state.schedule[upcomingWeek - 1] ?? null;
  const nextRival = nextRivalId ? state.rivals.find((r) => r.id === nextRivalId)! : null;
  const rivalClub = nextRivalId ? clubByLegacyId(state.world, nextRivalId) : undefined;
  const fixture = userFixtureOfWeek(state.world, upcomingWeek);
  // "lunes 20:30 h": el día alcanza — la fecha completa vive en el calendario.
  const dia = fixture ? formatDateLong(fixture.date).split(' ')[0] : '';
  const cuando = fixture ? `${dia[0].toUpperCase()}${dia.slice(1)} ${fixture.time} h` : null;
  const revancha = nextRival ? rivalryWith(state, nextRival.id) : null;

  return (
    <div className="hub">
      <div className="hub-grid">
        <div className="hub-col">
          {blocks(state)
            .slice(0, 2)
            .map((b) => (
              <MenuBlock key={b.title} block={b} watch={watch} />
            ))}
        </div>

        <div className="hub-centro">
          <div className="hub-escudo">
            {userClub && (
              <Crest
                seed={userClub.id}
                name={userClub.name}
                colors={userClub.colors}
                founded={userClub.founded}
                size={132}
              />
            )}
          </div>
          <h2 className="hub-club">
            <ClubLink id={USER_CLUB_ID}>{state.club.name}</ClubLink>
          </h2>
          <div className="hub-semana">
            {state.week <= state.seasonLength
              ? `Semana ${Math.min(state.week, state.seasonLength)} de ${state.seasonLength}`
              : weekLabel(state.week, state.seasonLength)}
          </div>

          <div className="hub-rival">
            {nextRival ? (
              <>
                <div className="hub-rival-linea">
                  {rivalClub && (
                    <Crest
                      seed={rivalClub.id}
                      name={rivalClub.name}
                      colors={rivalClub.colors}
                      founded={rivalClub.founded}
                      size={30}
                    />
                  )}
                  <span className="hub-rival-nombre">
                    vs <RivalLink id={nextRival.id}>{nextRival.name}</RivalLink>
                  </span>
                </div>
                {cuando && <div className="hub-rival-cuando">{cuando}</div>}
                <div className="hub-rival-chips">
                  <span className={`chip ${rivalDifficulty(nextRival).cls}`}>{rivalDifficulty(nextRival).label}</span>
                  <StyleChip style={nextRival.style} />
                  {revancha && <span className="chip bad">Revancha</span>}
                </div>
              </>
            ) : (
              <div className="hub-rival-cuando">Sin partido esta semana</div>
            )}
          </div>

          <div className="hub-caja">
            <span className="hub-caja-k">Caja del club</span>
            <span className={`hub-caja-v ${state.club.money < 0 ? 'bad' : ''}`}>{formatMoney(state.club.money)}</span>
          </div>

          <div className="hub-cifras">
            <div>
              <span className="k">Posición</span>
              <span className="v">{clubPosition(state)}°</span>
            </div>
            <div>
              <span className="k">Récord</span>
              <span className="v">
                {row.wins}-{row.losses}
              </span>
            </div>
            <div>
              <span className="k">Moral</span>
              <span className="v">{avgMotivation(state.players)}</span>
            </div>
          </div>

          <button className="hub-avanzar" onClick={() => navigate('semana')}>
            » {PHASE_ACTION[state.phase] ?? 'Avanzar semana'}
          </button>

          <div className="hub-secundarios">
            <button onClick={() => navigate('club', 'noticias')}>
              <Icon name="chat" size={15} /> Noticias
            </button>
            <button onClick={() => navigate('club', 'grupo')}>
              <Icon name="tablero" size={15} /> El club
            </button>
            <button onClick={() => navigate('historia')}>
              <Icon name="historia" size={15} /> Historia
            </button>
          </div>
        </div>

        <div className="hub-col">
          {blocks(state)
            .slice(2)
            .map((b) => (
              <MenuBlock key={b.title} block={b} watch={watch} />
            ))}
        </div>
      </div>

      <PlantelStrip state={state} />
    </div>
  );
}
