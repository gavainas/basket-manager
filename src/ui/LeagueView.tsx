import { useContext, useState } from 'react';
import { BALANCE } from '../game/balance';
import {
  checkExpansion,
  eligibleForLeague,
  expansionLeagues,
  SECOND_TEAM_ID,
  secondTeamPosition,
} from '../game/secondTeam';
import type { CupTier, GameState, League } from '../game/types';
import { divisionStandings, rosterDivisionIds, USER_TEAM_ID, userFixtureOfWeek } from '../game/world';
import { leaguePromotes, MOVE_COUNT } from '../game/pyramid';
import { WORLD_DIVISION_IDS } from '../data/worldData';
import type { GameAction } from '../state/gameReducer';
import { ClubLink } from './ClubLink';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { LeagueLink } from './LeagueLink';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';
import { CalendarView } from './CalendarView';
import { RankingsView } from './RankingsView';
import { EscudoLegacy, Planilla } from './bloqueD';
import { formatDateLong, rivalStyleInfo, weekLabel } from './helpers';
import './liga.css';

/** Nombre de un equipo por id clásico: rivales abren su ficha, el club lleva a la plantilla. */
function LegacyTeamName({ state, id }: { state: GameState; id: string }) {
  const navigate = useContext(NavigateTabContext);
  if (id === 'club') {
    return (
      <span className="plink" role="button" onClick={() => navigate('plantilla')}>
        <strong>{state.club.name}</strong>
      </span>
    );
  }
  const rival = state.rivals.find((r) => r.id === id);
  return rival ? <RivalLink id={id}>{rival.name}</RivalLink> : <span>{id}</span>;
}

/** Las dos copas de la divisional, dentro de la Liga: una planilla, dos columnas. */
function LlavePlayoffs({ state }: { state: GameState }) {
  const P = state.playoffs;
  if (!P) return null;
  return (
    <Planilla titulo="Los playoffs" nota="Copa de Oro y Copa de Plata" className="lg-playoffs">
      <div className="lg-copas">
        {(['oro', 'plata'] as CupTier[]).map((cup) => {
          const ties = P.ties.filter((t) => t.cup === cup);
          const champ = P.champions[cup];
          return (
            <div key={cup} className={`lg-copa ${cup}`}>
              <h4 className="lg-copa-tit">
                {cup === 'oro' ? 'Copa de Oro' : 'Copa de Plata'}
                {champ && (
                  <span className="lg-campeon">
                    Campeón: <LegacyTeamName state={state} id={champ} />
                  </span>
                )}
              </h4>
              {ties.map((t) => (
                <div className="lg-cruce" key={t.id}>
                  <span className="lg-cruce-ronda">{t.round === 'semifinal' ? 'Semi' : 'Final'}</span>
                  <span className="lg-cruce-eq">
                    <EscudoLegacy state={state} id={t.homeId} size={18} />
                    <LegacyTeamName state={state} id={t.homeId} />
                  </span>
                  <span className="lg-cruce-res">{t.scoreHome !== undefined ? `${t.scoreHome}–${t.scoreAway}` : 'vs'}</span>
                  <span className="lg-cruce-eq">
                    <EscudoLegacy state={state} id={t.awayId} size={18} />
                    <LegacyTeamName state={state} id={t.awayId} />
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Planilla>
  );
}

/** Panel de inscripción del segundo equipo: requisitos, fichas y confirmación. */
function ExpansionPanel({
  state,
  league,
  dispatch,
  onClose,
}: {
  state: GameState;
  league: League;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}) {
  const E = BALANCE.expansion;
  const check = checkExpansion(state, league.id);
  const eligible = state.players.filter((p) => eligibleForLeague(p, league));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligible.map((p) => p.id)));
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const planning = state.phase === 'planning';
  const canConfirm = check.ok && planning && selected.size >= E.minPlayers;
  const semanal = E.weeklyUpkeep - E.canteenIncome;

  /* Inscribir es gastar de un click la ficha entera —$250, la caja completa
     de una partida recién empezada— por un equipo que no se puede dar de baja
     en toda la temporada, mientras que despedir al DT o cerrar la pretemporada
     preguntan. El diálogo dice lo que va a pasar con la caja y con los
     viernes; en rojo si la caja queda por debajo de lo que la semana se lleva. */
  const pedirConfirmacion = () => {
    const queda = state.club.money - check.fee;
    const nombre = league.minAge ? `${state.club.name} +35` : `${state.club.name} "B"`;
    const dia = check.gameDay ? ` los ${check.gameDay}` : '';
    const justa = queda < BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly;
    setConfirmReq({
      title: `¿Inscribir a ${nombre} en ${league.name}?`,
      message:
        `Se pagan $${check.fee} ahora y la caja queda en $${queda}${justa ? ' (menos de lo que se lleva una semana de cancha y árbitros)' : ''}. ` +
        `Después, el equipo cuesta ~$${semanal} por semana entre cancha, árbitros y cantina, y juega${dia} toda la temporada con ${selected.size} fichas. ` +
        'Una vez inscripto no se puede dar de baja hasta el verano.',
      confirmLabel: `Inscribir por $${check.fee}`,
      danger: justa,
      icon: 'liga',
      onConfirm: () => {
        dispatch({ type: 'REGISTER_SECOND_TEAM', leagueId: league.id, playerIds: [...selected] });
        onClose();
      },
    });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Planilla titulo={`Inscribir un equipo en ${league.name}`} nota={`$${check.fee} por temporada`} className="lg-inscribir">
      <p className="lg-inscribir-txt">
        La inscripción cuesta <b>${check.fee}</b> y después son <b>~${semanal} por semana</b> entre cancha, árbitros y
        cantina. Hacen falta <b>{E.minPlayers} fichas</b> como mínimo{league.minAge ? `, todas de jugadores de ${league.minAge}+` : ''}
        {check.divisionName ? `, y se juega los ${check.gameDay} (${check.divisionName})` : ''}. La ficha de esta liga es
        independiente de la Universitaria: los mismos jugadores pueden jugar en las dos.
      </p>
      {!check.ok && <p className="lg-inscribir-txt lg-no">{check.reason}</p>}
      {check.ok && !planning && <p className="lg-inscribir-txt">Las inscripciones se confirman en la semana de planificación.</p>}

      {eligible.length > 0 && (
        <>
          <h4 className="bd-sub">
            Fichas · {selected.size} de {eligible.length} elegidos · mínimo {E.minPlayers}
          </h4>
          <div className="lg-fichas">
            {eligible.map((p) => (
              <label key={p.id} className={`lg-ficha${selected.has(p.id) ? ' on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  title={selected.has(p.id) ? 'Sacar la ficha' : 'Darle ficha'}
                />
                <PlayerLink id={p.id}>{p.name}</PlayerLink>
                <span className="lg-ficha-sub">
                  {p.age} años · ≈{p.visibleRating}
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      <div className="lg-inscribir-acciones">
        <button
          className="bd-boton"
          disabled={!canConfirm}
          title={canConfirm ? `Se paga la inscripción de $${check.fee}` : (check.reason ?? 'Elegí al menos las fichas mínimas en semana de planificación')}
          onClick={pedirConfirmacion}
        >
          Inscribir por ${check.fee}…
        </button>
        <button className="ghost small" onClick={onClose}>
          Cancelar
        </button>
      </div>
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </Planilla>
  );
}

/** Tabla y estado del torneo del segundo equipo. */
function SecondTeamCard({ state }: { state: GameState }) {
  const st = state.secondTeam;
  const navigate = useContext(NavigateTabContext);
  if (!st) return null;
  const league = state.world.leagues.find((l) => l.id === st.leagueId);
  const division = state.world.divisions.find((d) => d.id === st.divisionId);
  const sorted = [...st.table].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
  const roster = state.players.filter((p) => st.playerIds.includes(p.id) && !p.leftClub);
  const totalRounds = st.table.length - 1;

  return (
    <Planilla
      titulo={`${st.name} · ${league?.name ?? ''}${division ? ` ${division.name}` : ''}`}
      nota={st.finished ? `Torneo terminado: ${secondTeamPosition(st)}°` : `Fecha ${st.round} de ${totalRounds}`}
      className="lg-segundo"
    >
      <div className="lg-segundo-cuerpo">
        <table className="bd-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th className="num">G</th>
              <th className="num">P</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.teamId} className={row.teamId === SECOND_TEAM_ID ? 'bd-nos' : ''}>
                <td className={`num ${i < 3 ? 'warn' : 'dim'}`}>{i + 1}</td>
                <td>
                  {row.teamId === SECOND_TEAM_ID ? (
                    <span className="plink" role="button" onClick={() => navigate('plantilla')}>
                      <strong>{row.name}</strong>
                    </span>
                  ) : (
                    <ClubLink id={row.clubId}>{row.name}</ClubLink>
                  )}
                </td>
                <td className="num">{row.wins}</td>
                <td className="num">{row.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="lg-segundo-txt">
          {st.lastResult && <p className="v1-frase">{st.lastResult}</p>}
          <p className="v1-frase">
            <b>{roster.length} fichas:</b>{' '}
            {roster.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ' · '}
                <PlayerLink id={p.id}>{p.name}</PlayerLink>
              </span>
            ))}
          </p>
          <p className="v1-frase">
            Juegan los {division?.gameDay}: suma ritmo y ánimo a los relegados del primero, pero desgasta — y alguno
            puede volver tocado. Podio al cierre = prestigio para el club.
          </p>
        </div>
      </div>
    </Planilla>
  );
}

export type LigaTab = 'tabla' | 'calendario' | 'rankings' | 'piramide' | 'ligas';

/* UI V1: Calendario y Rankings pasan a ser pestañas de la Liga. Antes eran
   pantallas sueltas a las que sólo se llegaba por los atajos del Tablero, y el
   Tablero aprobado no tiene atajos (repetían la barra de arriba). */
const LIGA_TABS: { id: LigaTab; label: string; hint: string }[] = [
  { id: 'tabla', label: 'Tabla y fixture', hint: 'Cómo viene la divisional y contra quién jugamos' },
  { id: 'calendario', label: 'Calendario', hint: 'Las fechas de la temporada, día por día' },
  { id: 'rankings', label: 'Rankings', hint: 'Los mejores de la liga y del club' },
  { id: 'piramide', label: 'La pirámide', hint: 'Las divisionales de arriba y de abajo' },
  { id: 'ligas', label: 'Las ligas', hint: 'El mapa de ligas y el segundo equipo del club' },
];

/** El estilo del rival escrito en gris al lado del nombre: dato, no chip. */
function Estilo({ state, id }: { state: GameState; id: string }) {
  const rival = state.rivals.find((r) => r.id === id);
  if (!rival) return null;
  const info = rivalStyleInfo(rival.style);
  return (
    <span className="lg-estilo" title={info.desc}>
      <Icon name={info.icon} size={12} />
      {info.label}
    </span>
  );
}

/**
 * La Liga (UI V1). La pregunta de la pantalla es «¿dónde estamos y contra
 * quién sigue?»: eso es el héroe, sobre la escena de los árbitros, sin caja.
 * La tabla es la planilla protagonista (cinta y título a mano) y el fixture es
 * la segunda hoja, debajo del héroe. Las otras pestañas (calendario, rankings,
 * pirámide y ligas) son otras preguntas y tienen su propio héroe.
 */
export function LeagueView({ state, dispatch, inicial = 'tabla' }: { state: GameState; dispatch: (action: GameAction) => void; inicial?: LigaTab }) {
  const [tab, setTab] = useState<LigaTab>(inicial);
  const [expandLeague, setExpandLeague] = useState<string | null>(null);
  // Qué otra divisional de la pirámide se está mirando (null = la primera).
  const [pyramidTab, setPyramidTab] = useState<string | null>(null);
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
  const teamName = (id: string) => <LegacyTeamName state={state} id={id} />;

  const world = state.world;
  const userEntry = world.entries.find((e) => e.teamId === USER_TEAM_ID && e.status === 'activa');
  const userDivision = world.divisions.find((d) => d.id === userEntry?.divisionId);
  const userLeague = world.leagues.find((l) => l.id === userEntry?.leagueId);
  // La pirámide de nuestra liga: todas sus divisionales, de la más alta a la
  // más baja. La nuestra tiene tabla real; las otras, tabla simulada.
  const pyramid = world.divisions
    .filter((d) => d.leagueId === userLeague?.id && WORLD_DIVISION_IDS.includes(d.id))
    .sort((a, b) => a.level - b.level);
  const ourLevel = userDivision?.level ?? 0;
  const divisionAbove = pyramid.find((d) => d.level === ourLevel - 1);
  const divisionBelow = pyramid.find((d) => d.level === ourLevel + 1);
  const promotes = userLeague ? leaguePromotes(userLeague.id) : false;
  const scoutable = rosterDivisionIds(state.divisionId);
  // Ligas que aceptan un SEGUNDO equipo del club (las otras se juegan con el
  // equipo principal, y eso se decide en la inscripción de la pretemporada).
  const expansible = expansionLeagues(state).map((l) => l.id);
  const otherDivisions = pyramid.filter((d) => d.id !== userDivision?.id);
  const shownDivision = otherDivisions.find((d) => d.id === pyramidTab) ?? otherDivisions[0];
  const otherRows = shownDivision ? divisionStandings(world, shownDivision.id, state.week, state.seasonNumber) : [];

  // El héroe: dónde estamos y contra quién sigue (la misma cuenta que el Tablero).
  const nTeams = sorted.length;
  const ourIdx = sorted.findIndex((r) => r.teamId === 'club');
  const ours = ourIdx >= 0 ? sorted[ourIdx] : null;
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  const nextId = state.schedule[upcomingWeek - 1];
  const nextRival = state.rivals.find((r) => r.id === nextId);
  const nextIdx = sorted.findIndex((r) => r.teamId === nextId);
  const nextFx = userFixtureOfWeek(world, upcomingWeek);
  const nextVenue = world.venues.find((v) => v.id === nextFx?.venueId);
  const bajan = promotes && !!divisionBelow;
  const zona = (i: number): 'oro' | 'plata' | 'fuera' => (i < 4 ? 'oro' : i < 8 ? 'plata' : 'fuera');
  const enDescenso = (i: number) => bajan && i >= nTeams - MOVE_COUNT;
  const fechaLabel =
    state.week <= state.seasonLength ? `Fecha ${state.week} de ${state.seasonLength}` : weekLabel(state.week, state.seasonLength);

  const tabs = (
    <nav className="lg-tabs" aria-label="La liga">
      {LIGA_TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} title={t.hint} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="liga liga-pantalla">
      {tabs}

      {tab === 'calendario' && <CalendarView state={state} />}
      {tab === 'rankings' && <RankingsView state={state} />}

      {/* En los playoffs, la llave es lo primero que se mira: va arriba, a todo el ancho. */}
      {tab === 'tabla' && <LlavePlayoffs state={state} />}

      {tab === 'tabla' && (
        <div className="lg-tabla-pantalla">
          <section className="lg-hero v1-hero" aria-label="Dónde estamos">
            <div className="v1-eyebrow">
              {userLeague?.name ?? 'La liga'}
              {userDivision && <> · <b>{userDivision.name}</b></>} · {fechaLabel}
            </div>
            {ours ? (
              <div className="lg-puesto">
                <div className={`v1-cifra lg-puesto-num ${zona(ourIdx)}${enDescenso(ourIdx) ? ' descenso' : ''}`}>
                  {ourIdx + 1}°<small>de {nTeams} en la tabla</small>
                </div>
                <div className="lg-puesto-txt">
                  <div className="lg-record">
                    {ours.wins}-{ours.losses}
                    <span>
                      {' '}· dif. {ours.pointsFor - ours.pointsAgainst > 0 ? '+' : ''}
                      {ours.pointsFor - ours.pointsAgainst}
                    </span>
                  </div>
                  <p className="lg-zona">
                    {enDescenso(ourIdx) ? (
                      <><b className="bad">En zona de descenso.</b> Hoy bajaríamos a la {divisionBelow?.name}.</>
                    ) : zona(ourIdx) === 'oro' ? (
                      <><b className="good">Adentro de la Copa de Oro.</b> Así terminaría hoy la fase regular.</>
                    ) : zona(ourIdx) === 'plata' ? (
                      <><b className="warn">En zona de Copa de Plata.</b> A {Math.max(0, ourIdx - 3)} {ourIdx - 3 === 1 ? 'lugar' : 'lugares'} de la de Oro.</>
                    ) : (
                      <><b className="bad">Afuera de las copas.</b> Hoy nos iríamos a casa.</>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="v1-titulo">La tabla arranca con la primera fecha</h2>
            )}

            {nextRival && nextId !== 'club' && (
              <div className="lg-sigue">
                <div className="lg-sigue-lab">Lo que sigue</div>
                <div className="lg-sigue-eq">
                  <EscudoLegacy state={state} id={nextId} size={58} />
                  <div>
                    <div className="lg-sigue-nom">
                      <RivalLink id={nextId}>{nextRival.name}</RivalLink>
                    </div>
                    <div className="lg-sigue-sub">
                      {nextIdx >= 0 && <><b>{nextIdx + 1}°</b> · {sorted[nextIdx].wins}-{sorted[nextIdx].losses} · </>}
                      {rivalStyleInfo(nextRival.style).label}
                    </div>
                  </div>
                </div>
                <p className="lg-sigue-cuando">
                  {nextFx ? `${cap(formatDateLong(nextFx.date))} · ${nextFx.time}` : 'Fecha por confirmar'}
                  {nextVenue && <span> · {nextVenue.name}{nextFx ? (nextFx.homeTeamId === USER_TEAM_ID ? ', de local' : ', de visitante') : ''}</span>}
                </p>
              </div>
            )}
          </section>

          <Planilla mano titulo="La tabla" nota={userDivision ? `${userLeague?.name ?? ''} · ${userDivision.name}` : undefined} className="lg-tabla">
            <table className="bd-tabla">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Equipo</th>
                  <th className="num">PJ</th>
                  <th className="num">G</th>
                  <th className="num">P</th>
                  <th className="num">Dif</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.teamId} className={`lg-z-${zona(i)}${enDescenso(i) ? ' lg-z-baja' : ''}${row.teamId === 'club' ? ' bd-nos' : ''}`}>
                    <td className="num lg-pos">{i + 1}</td>
                    <td>
                      <span className="bd-equipo">
                        <EscudoLegacy state={state} id={row.teamId} size={20} />
                        {teamName(row.teamId)}
                        <Estilo state={state} id={row.teamId} />
                      </span>
                    </td>
                    <td className="num dim">{row.wins + row.losses}</td>
                    <td className="num">{row.wins}</td>
                    <td className="num">{row.losses}</td>
                    <td className="num">
                      {row.pointsFor - row.pointsAgainst > 0 ? '+' : ''}
                      {row.pointsFor - row.pointsAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bd-nota lg-reglas">
              <span className="lg-ley oro">1°–4° Copa de Oro</span>
              <span className="lg-ley plata">5°–8° Copa de Plata</span>
              {state.standings.length > 8 && <span className="lg-ley fuera">los últimos dos se van a casa</span>}
              {/* Con ocho equipos (la Liga del Comercio) juegan todos las copas: nadie se va a casa. */}
              {state.standings.length <= 8 && ' Juegan todos.'}
              {promotes && divisionAbove && (
                <> Los <b>{MOVE_COUNT} finalistas de la Copa de Oro ascienden</b> a la {divisionAbove.name}.</>
              )}
              {promotes && divisionBelow && (
                <> Los <b>{MOVE_COUNT} últimos descienden</b> a la {divisionBelow.name}.</>
              )}
              {promotes && !divisionBelow && ' Abajo no hay nada: de acá no se baja.'}
              {promotes && !divisionAbove && ' Es la categoría más alta de la liga: no hay a dónde subir.'}
              {!promotes && ' En esta liga no hay ascensos ni descensos.'}
            </p>
          </Planilla>

          <div className="lg-col-fixture">
            <Planilla titulo="El fixture" nota={`${state.schedule.length} fechas`} className="lg-fixture">
              <table className="bd-tabla">
                <tbody>
                  {state.schedule.map((rivalId, i) => {
                    const week = i + 1;
                    const match = state.history.find((m) => m.week === week);
                    const fx = userFixtureOfWeek(world, week);
                    return (
                      <tr key={week} className={week === state.week ? 'bd-nos' : ''}>
                        {/* En una liga de 9 fechas, la fila 10 es la semifinal, no la "semana 10". */}
                        <td className="num dim lg-fx-fecha">
                          {week <= state.seasonLength ? week : week === state.seasonLength + 1 ? 'Semis' : 'Final'}
                        </td>
                        <td>
                          <span className="bd-equipo">
                            <EscudoLegacy state={state} id={rivalId} size={18} />
                            {teamName(rivalId)}
                            {fx && <span className="lg-lv">{fx.homeTeamId === USER_TEAM_ID ? 'L' : 'V'}</span>}
                          </span>
                        </td>
                        <td className="num">
                          {match ? (
                            <span className={match.won ? 'good' : 'bad'}>
                              {match.won ? 'G' : 'P'} {match.scoreFor}-{match.scoreAgainst}
                            </span>
                          ) : week === state.week ? (
                            <span className="lg-hoy">Esta semana</span>
                          ) : (
                            <span className="dim">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Planilla>
          </div>
        </div>
      )}

      {tab === 'piramide' && shownDivision && otherRows.length > 0 && (
        <div className="lg-piramide">
          <section className="lg-hero v1-hero" aria-label="La pirámide">
            <div className="v1-eyebrow">La pirámide · <b>{userLeague?.name}</b></div>
            <h2 className="v1-titulo">Jugamos en la {userDivision?.name}</h2>
            <p className="v1-frase lg-piramide-frase">
              {promotes
                ? <>De la {pyramid[0]?.name} a la {pyramid[pyramid.length - 1]?.name}: todos los años <b>{MOVE_COUNT} suben</b> y <b>{MOVE_COUNT} bajan</b> entre categorías vecinas.</>
                : 'Las divisionales de la liga.'}
            </p>
            {/* La escalera: la de arriba es la más angosta. Un escalón por
                divisional, en orden; se toca para ver su tabla. */}
            <div className="lg-escalera">
              {pyramid.map((d, i) => {
                const nuestra = d.id === userDivision?.id;
                const activa = !nuestra && d.id === shownDivision.id;
                const ancho = pyramid.length > 1 ? 52 + (48 * i) / (pyramid.length - 1) : 100;
                return (
                  <button
                    key={d.id}
                    className={`lg-escalon${nuestra ? ' nuestra' : ''}${activa ? ' on' : ''}`}
                    style={{ width: `${ancho}%` }}
                    disabled={nuestra}
                    onClick={() => setPyramidTab(d.id)}
                    title={nuestra ? 'Es nuestra divisional: su tabla está en «Tabla y fixture»' : `Ver la tabla de la ${d.name}`}
                  >
                    <span className="lg-escalon-nom">{d.name}</span>
                    <span className="lg-escalon-sub">
                      {nuestra ? 'Acá jugamos' : d.level < ourLevel ? 'Arriba nuestro' : 'Abajo nuestro'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <Planilla titulo={`La tabla de la ${shownDivision.name}`} nota={userLeague?.name} className="lg-piramide-tabla">
            <table className="bd-tabla">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Equipo</th>
                  <th className="num">G</th>
                  <th className="num">P</th>
                  <th className="num">Dif</th>
                </tr>
              </thead>
              <tbody>
                {otherRows.map((row, i) => {
                  const team = world.teams.find((t) => t.id === row.teamId);
                  const club = world.clubs.find((c) => c.id === team?.clubId);
                  const sube = promotes && i < MOVE_COUNT && shownDivision.level > 1;
                  const baja = promotes && i >= otherRows.length - MOVE_COUNT && !!pyramid.find((d) => d.level === shownDivision.level + 1);
                  return (
                    <tr key={row.teamId}>
                      <td className={`num ${sube ? 'good' : baja ? 'bad' : 'dim'}`}>{i + 1}</td>
                      <td>
                        <span className="bd-equipo">
                          {club && <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={20} />}
                          {club ? <ClubLink id={club.id}>{row.name}</ClubLink> : row.name}
                        </span>
                      </td>
                      <td className="num">{row.wins}</td>
                      <td className="num">{row.losses}</td>
                      <td className="num">
                        {row.pointsFor - row.pointsAgainst > 0 ? '+' : ''}
                        {row.pointsFor - row.pointsAgainst}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="bd-nota">
              {shownDivision.level === ourLevel - 1 && `Los ${MOVE_COUNT} últimos de acá bajan a nuestra divisional; de la nuestra suben los ${MOVE_COUNT} finalistas de la Copa de Oro. `}
              {shownDivision.level === ourLevel + 1 && `Los ${MOVE_COUNT} finalistas de la Copa de Oro de acá suben a nuestra divisional; nuestros ${MOVE_COUNT} últimos se vienen para acá. `}
              {scoutable.includes(shownDivision.id)
                ? 'Tocá un nombre para ver su plantel: a estos los tenemos scouteados.'
                : 'Está demasiado lejos de nuestra categoría: sabemos quiénes son, no cómo juegan. Sus planteles aparecen cuando el club se les acerca.'}
            </p>
          </Planilla>
        </div>
      )}

      {tab === 'ligas' && userLeague && userDivision && (
        <div className="lg-ligas">
          <section className="lg-hero v1-hero" aria-label="Las ligas">
            <div className="v1-eyebrow">El mapa de ligas · <b>{world.leagues.length} ligas</b></div>
            <h2 className="v1-titulo">Jugamos en la {userLeague.name}</h2>
            <p className="v1-frase lg-ligas-frase">
              <b>{userDivision.name}</b>, los {userDivision.gameDay} a las {userDivision.gameTimes.join(' o ')}.
              {state.secondTeam ? (
                <> Y el club tiene un segundo equipo: <b>{state.secondTeam.name}</b>.</>
              ) : expansible.length > 0 ? (
                <> Hay {expansible.length === 1 ? 'una liga que acepta' : `${expansible.length} ligas que aceptan`} un segundo equipo del club.</>
              ) : null}
            </p>
          </section>

          <Planilla titulo="Las ligas" nota="dónde se juega" className="lg-ligas-lista">
            {world.leagues.map((l) => {
              const divisions = world.divisions.filter((d) => d.leagueId === l.id);
              const isOurs = l.id === userLeague.id;
              const segundo = state.secondTeam?.leagueId === l.id ? state.secondTeam : null;
              const fila = segundo?.table.find((r) => r.teamId === SECOND_TEAM_ID);
              return (
                <div className={`lg-liga v1-renglon${isOurs ? ' nuestra' : ''}`} key={l.id}>
                  <span className="lg-liga-nom">
                    <LeagueLink id={l.id}>{l.name}</LeagueLink>
                  </span>
                  <span className="lg-liga-txt">
                    {isOurs ? (
                      <>
                        <b>Jugamos en {userDivision.name}</b> · los {userDivision.gameDay} a las {userDivision.gameTimes.join(' o ')}
                      </>
                    ) : segundo ? (
                      <>
                        <b>{segundo.name}</b> · {fila?.wins ?? 0}-{fila?.losses ?? 0}
                        {segundo.finished ? ' · torneo terminado' : ''}
                      </>
                    ) : (
                      <>
                        {divisions.length} divisional{divisions.length !== 1 ? 'es' : ''}
                        {l.minAge ? ` · desde ${l.minAge} años` : ''}
                        {expansible.includes(l.id)
                          ? ' · el club todavía no tiene equipo acá'
                          : ' · el equipo principal se puede anotar acá en la próxima pretemporada'}
                      </>
                    )}
                  </span>
                  {/* Segundo equipo: solo en las ligas que abren cupo. En
                      las demás, la puerta es la inscripción del principal. */}
                  <span className="lg-liga-accion">
                    {!isOurs && !segundo && expansible.includes(l.id) && (
                      <button className="bd-boton" onClick={() => setExpandLeague(l.id)}>
                        Inscribir equipo…
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </Planilla>

          {expandLeague &&
            (() => {
              const l = world.leagues.find((x) => x.id === expandLeague);
              return l ? (
                <ExpansionPanel state={state} league={l} dispatch={dispatch} onClose={() => setExpandLeague(null)} />
              ) : null;
            })()}

          <SecondTeamCard state={state} />
        </div>
      )}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
