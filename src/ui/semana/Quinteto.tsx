// Etapa 3 · Quinteto: el plantel a la izquierda, la pizarra con los cinco
// puestos y el banco al centro, la lectura del partido a la derecha y el pie
// fijo con "Salir a la cancha" (UI V1, lámina 05 cuadro 18).

import type { Player } from '../../game/types';
import { BALANCE } from '../../game/balance';
import { lineupPromiseWarnings } from '../../game/promises';
import { evaluateTeam, isSelectable, PLAN_MIN_BENCH, titularesSinRecambio } from '../../game/match';
import { Icon } from '../Icon';
import { PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { ScoutingCard } from '../ScoutingCard';
import { Tip, TIPS } from '../Tip';
import { rivalDifficulty, rivalStyleInfo, weekLabel } from '../helpers';
import { useEspacio } from '../teclas';
import { Crest } from '../Crest';
import { clubByLegacyId, userFixtureOfWeek } from '../../game/world';
import { absentIds, Cara, POS_ABBR, POSITION_ORDER, shortName, type Props } from './comun';

/** Asigna los titulares a los 5 puestos de la pizarra (primero por posición natural). */
function assignSlots(starters: Player[]): (Player | null)[] {
  const slots: (Player | null)[] = [null, null, null, null, null];
  const remaining = [...starters];
  POSITION_ORDER.forEach((pos, i) => {
    const idx = remaining.findIndex((p) => p.position === pos);
    if (idx >= 0) {
      slots[i] = remaining[idx];
      remaining.splice(idx, 1);
    }
  });
  for (let i = 0; i < 5 && remaining.length > 0; i++) {
    if (!slots[i]) slots[i] = remaining.shift()!;
  }
  return slots;
}

// Disposición simétrica: dos internos abajo, dos perimetrales y el base arriba.
const SLOT_POS = [
  { x: '50%', y: '82%' }, // Base
  { x: '22%', y: '58%' }, // Escolta
  { x: '78%', y: '58%' }, // Alero
  { x: '26%', y: '27%' }, // Ala-Pívot
  { x: '74%', y: '27%' }, // Pívot
];

function CourtLines() {
  return (
    <svg className="court-lines" viewBox="0 0 300 340" preserveAspectRatio="none">
      <rect x="4" y="4" width="292" height="332" rx="10" />
      <rect x="110" y="4" width="80" height="106" />
      <circle cx="150" cy="110" r="34" />
      <line x1="132" y1="18" x2="168" y2="18" />
      <circle cx="150" cy="28" r="6" />
      <path d="M 30 4 L 30 62 A 128 128 0 0 0 270 62 L 270 4" />
      <path d="M 110 336 A 40 40 0 0 1 190 336" />
    </svg>
  );
}

/* La tira de 5 cartas del quinteto se eliminó en la tanda C del marco fijo.
   Mostraba puesto, cara, nombre, altura, una barra de físico y la media de los
   mismos cinco que ya muestra la pizarra justo abajo: era la duplicación más
   cara de la pantalla (unos 180px de los 530 que hay a 720p, y con ella la
   pizarra no entraba). Lo único que aportaba y la pizarra no decía —la altura—
   se mudó a la línea de cada puesto en la cancha. */

export function LineupPanel({ state, dispatch }: Props) {
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1])!;
  const absent = absentIds(state);
  const roster = state.players.filter((p) => !p.leftClub);
  const available = roster.filter((p) => isSelectable(p) && !absent.has(p.id));
  const sorted = [...roster].sort((a, b) => {
    const availA = isSelectable(a) && !absent.has(a.id) ? 0 : 1;
    const availB = isSelectable(b) && !absent.has(b.id) ? 0 : 1;
    return (
      availA - availB ||
      POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
      b.visibleRating - a.visibleRating
    );
  });

  const starters = state.players.filter((p) => state.starters.includes(p.id));
  const count = starters.length;
  // Los que llegan al segundo tiempo cuentan para la planilla pero no pueden
  // arrancar: si por ellos no se llega a 5 titulares, se arranca corto (nunca
  // más el botón muerto sin explicación).
  const lateIds = new Set(state.callUp.filter((c) => c.lateArrival && c.status === 'confirmado').map((c) => c.playerId));
  const startable = available.filter((p) => !lateIds.has(p.id));
  const maxStarters = Math.min(5, startable.length);
  const shortStart = maxStarters < 5 && available.length >= 5;
  const canPlay = count === 5 || (shortStart && count === maxStarters && count > 0);
  const forfeitRisk = available.length < 5;
  /* Espacio va al partido cuando el quinteto está listo. Con el quinteto a
     medio armar no hace nada, igual que el botón apagado; y si hay que
     presentarse igual (forfeit) tampoco: eso se aprieta a propósito. */
  useEspacio(canPlay ? () => dispatch({ type: 'START_MATCH' }) : null);

  const rotationIds = state.rotation.filter(
    (id) => !state.starters.includes(id) && available.some((p) => p.id === id)
  );
  const rotPlayers = rotationIds
    .map((id) => state.players.find((p) => p.id === id)!)
    .filter(Boolean);
  const maxRotation = BALANCE.rotation.maxPlayers;

  const covered = new Set(starters.map((p) => p.position));
  const missing = POSITION_ORDER.filter((pos) => !covered.has(pos));
  const slots = assignSlots(starters);

  // Los que vinieron y se quedan mirando: la pizarra lo dice antes de empezar
  // (T4), y nombra a los que se van a calentar por eso.
  const leftOut = available.filter((p) => !state.starters.includes(p.id) && !rotationIds.includes(p.id));
  const leftOutHot = leftOut.filter(
    (p) => p.personality === 'protagonista' || p.expectedRole === 'titular' || p.grievance?.cause === 'minutos'
  );
  // El plan rota por puesto: el titular sin nadie de su puesto en el banco no
  // descansa. Antes se descubría en el informe ("jugó todo el partido:
  // terminó fundido"); acá se puede arreglar, o aceptarlo sabiendo.
  const sinRecambio = rotationIds.length >= PLAN_MIN_BENCH ? titularesSinRecambio(state.players, state.starters, rotationIds) : [];
  const conRecambioAfuera = sinRecambio.filter((t) => leftOut.some((p) => p.position === t.position));

  // Drag & drop: el id viaja en el dataTransfer; los guards viven en el reducer.
  const dragStart = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const draggedId = (e: React.DragEvent) => e.dataTransfer.getData('text/plain');
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const dropOnSlot = (occupant: Player | null) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = draggedId(e);
    if (!id || occupant?.id === id || state.starters.includes(id)) return;
    if (occupant) dispatch({ type: 'TOGGLE_STARTER', id: occupant.id });
    dispatch({ type: 'TOGGLE_STARTER', id });
  };
  const dropOnBench = (e: React.DragEvent) => {
    e.preventDefault();
    const id = draggedId(e);
    if (!id) return;
    if (state.starters.includes(id)) dispatch({ type: 'TOGGLE_STARTER', id });
    if (!state.rotation.includes(id)) dispatch({ type: 'TOGGLE_ROTATION', id });
  };
  const dropOnList = (e: React.DragEvent) => {
    e.preventDefault();
    const id = draggedId(e);
    if (!id) return;
    if (state.starters.includes(id)) dispatch({ type: 'TOGGLE_STARTER', id });
    else if (state.rotation.includes(id)) dispatch({ type: 'TOGGLE_ROTATION', id });
  };

  const evalTeam = count > 0 ? evaluateTeam(state, state.starters) : null;
  const vibe =
    evalTeam === null
      ? ''
      : evalTeam.strength > rival.strength + 6
        ? 'El quinteto se ve superior al rival.'
        : evalTeam.strength > rival.strength - 6
          ? 'Se viene un partido parejo.'
          : 'El rival parece más fuerte: habrá que correr el doble.';
  const style = rivalStyleInfo(rival.style);
  const diff = rivalDifficulty(rival);
  const rivalClub = clubByLegacyId(state.world, rival.id);
  const fx = userFixtureOfWeek(state.world, state.week);
  const lastMinute = state.callUp.filter((e) => e.lastMinute);
  const titularesOk = count === 5 || (shortStart && count === maxStarters);

  // El plantel agrupado por lo que va a hacer el sábado, como la planilla del
  // DT: los cinco, el banco, los que vinieron y no tienen lugar, los que no están.
  const grupos: { key: string; titulo: string; cuenta?: string; players: Player[] }[] = [
    { key: 'cancha', titulo: 'En cancha', cuenta: `${count}/${shortStart ? maxStarters : 5}`, players: sorted.filter((p) => state.starters.includes(p.id)) },
    { key: 'banco', titulo: 'Banco', cuenta: `${rotationIds.length}/${maxRotation}`, players: sorted.filter((p) => rotationIds.includes(p.id)) },
    { key: 'libres', titulo: 'Sin lugar', players: sorted.filter((p) => isSelectable(p) && !absent.has(p.id) && !state.starters.includes(p.id) && !rotationIds.includes(p.id)) },
    { key: 'fuera', titulo: 'No están', players: sorted.filter((p) => !(isSelectable(p) && !absent.has(p.id))) },
  ];

  const renglon = (p: Player) => {
    const avail = isSelectable(p) && !absent.has(p.id);
    const isStarter = state.starters.includes(p.id);
    const inRotation = rotationIds.includes(p.id);
    const starterFull = count >= 5 && !isStarter;
    const rotationFull = rotationIds.length >= maxRotation && !inRotation;
    const est: { cls: 'good' | 'warn' | 'bad'; label: string } | null = !avail
      ? {
          cls: 'bad',
          label: absent.has(p.id)
            ? 'No vino'
            : p.status === 'lesionado'
              ? p.injuryReason === 'laboral'
                ? `Laburo ${p.injuryWeeks} sem`
                : `Lesión ${p.injuryWeeks} sem`
              : 'No disponible',
        }
      : lateIds.has(p.id)
        ? { cls: 'warn', label: '2° tiempo' }
        : p.status === 'al_borde'
          ? { cls: 'bad', label: 'Al borde' }
          : p.status === 'molesto'
            ? { cls: 'warn', label: 'Molesto' }
            : null;
    return (
      <div
        key={p.id}
        className={`sem-jug${isStarter ? ' titular' : ''}${inRotation ? ' banco' : ''}${!avail ? ' off' : ''}`}
        draggable={avail}
        onDragStart={avail ? dragStart(p.id) : undefined}
      >
        <Cara p={p} size={30} gris={!avail} />
        <div className="sem-jug-quien">
          <div className="sem-jug-nom">
            <PlayerLink id={p.id}>{p.name}</PlayerLink>
          </div>
          <div className="sem-jug-meta">
            <span className="sem-jug-pos">{POS_ABBR[p.position]}</span>
            {est ? (
              <span className={`v1-est ${est.cls}`} title={lateIds.has(p.id) ? 'Sólo puede entrar desde el banco, en el segundo tiempo' : undefined}>
                {est.label}
              </span>
            ) : null}
            <span title="Físico" className={p.physical <= BALANCE.callUp.exhaustedThreshold ? 'warn' : undefined}>
              <Icon name="fisico" size={12} /> {Math.round(p.physical)}
            </span>
            <span title="Motivación">
              <Icon name="animo" size={12} /> {Math.round(p.motivation)}
            </span>
            {p.lastRating !== null && <span title="Nota del último partido">últ. {p.lastRating}</span>}
          </div>
        </div>
        <div className="sem-jug-media" title="Nivel estimado">≈{p.visibleRating}</div>
        <div className="sem-jug-btns">
          <button
            className={`sem-tr t${isStarter ? ' on' : ''}`}
            title={lateIds.has(p.id) ? 'Llega al segundo tiempo: no puede ser titular' : isStarter ? 'Titular · click para sacarlo' : 'Titular'}
            aria-pressed={isStarter}
            disabled={!avail || lateIds.has(p.id) || (starterFull && !isStarter)}
            onClick={() => dispatch({ type: 'TOGGLE_STARTER', id: p.id })}
          >
            T
          </button>
          <button
            className={`sem-tr r${inRotation ? ' on' : ''}`}
            title={inRotation ? 'En el banco · click para sacarlo' : 'Rotación (banco)'}
            aria-pressed={inRotation}
            disabled={!avail || isStarter || rotationFull}
            onClick={() => dispatch({ type: 'TOGGLE_ROTATION', id: p.id })}
          >
            R
          </button>
        </div>
      </div>
    );
  };

  return (
    /* Lámina 05, cuadro 18: el plantel a la izquierda, la cancha al centro y
       la lectura del partido a la derecha; abajo, el pie fijo con «Salir a la
       cancha». La pizarra es LA acción de la pantalla: va en el medio y grande,
       sobre el parquet de la escena. */
    <div className="sem-quinteto sem-flujo">
      <div className="sem-q-cuerpo">
        <aside className="sem-q-plantel v1-planilla" onDragOver={allowDrop} onDrop={dropOnList} aria-label="El plantel">
          <div className="sem-q-plantel-cab">
            <h3>El plantel</h3>
            <button className="small ghost" onClick={() => dispatch({ type: 'AUTO_LINEUP' })} title="El DT arma el quinteto y el banco">
              Sugerir
            </button>
            <button className="small ghost" onClick={() => dispatch({ type: 'CLEAR_LINEUP' })} title="Vaciar quinteto y banco">
              Limpiar
            </button>
          </div>
          {grupos
            .filter((g) => g.players.length > 0 || g.key === 'cancha' || g.key === 'banco')
            .map((g) => (
              <div key={g.key} className={`sem-q-grupo ${g.key}`}>
                <div className="sem-q-grupo-tit">
                  {g.titulo}
                  {g.cuenta && <span>{g.cuenta}</span>}
                </div>
                {g.players.length === 0 ? (
                  <p className="sem-q-vacio">{g.key === 'cancha' ? 'Tocá T para poner titulares.' : 'Tocá R para citar suplentes.'}</p>
                ) : (
                  g.players.map(renglon)
                )}
              </div>
            ))}
        </aside>

        <section className="sem-q-cancha" aria-label="La pizarra">
          <div className="sem-q-cancha-cab v1-hero">
            <span className="v1-eyebrow">Nuestro quinteto</span>
            <span className={`sem-q-cuenta ${titularesOk ? 'good' : 'warn'}`}>
              <Tip text={TIPS.titulares}>
                <span>
                  {count}/{shortStart ? maxStarters : 5} titulares
                </span>
              </Tip>
            </span>
          </div>
          <div className="sem-court">
            <CourtLines />
            {POSITION_ORDER.map((pos, i) => {
              const pl = slots[i];
              const oop = pl ? pl.position !== pos : false;
              return (
                <div
                  key={pos}
                  className={`sem-slot${pl ? ' lleno' : ' libre'}${oop ? ' oop' : ''}`}
                  style={{ left: SLOT_POS[i].x, top: SLOT_POS[i].y }}
                  onClick={pl ? () => dispatch({ type: 'TOGGLE_STARTER', id: pl.id }) : undefined}
                  onDragOver={allowDrop}
                  onDrop={dropOnSlot(pl)}
                  draggable={!!pl}
                  onDragStart={pl ? dragStart(pl.id) : undefined}
                  title={
                    pl
                      ? `${pl.name}${oop ? ` (${pl.position} jugando de ${pos})` : ''} · click para sacarlo`
                      : `Arrastrá un jugador para el puesto de ${pos}`
                  }
                >
                  {pl ? <Cara p={pl} size={64} cls={oop ? 'warn' : ''} /> : <span className="sem-slot-vacio">+</span>}
                  <div className="sem-slot-placa">
                    <b>{pl ? shortName(pl.name) : pos}</b>
                    <span>
                      {pl ? (
                        <>
                          {oop ? <em>es {pl.position}</em> : pos} · ≈{pl.visibleRating} · {(pl.height / 100).toFixed(2)} m
                        </>
                      ) : (
                        'libre'
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sem-q-banco" onDragOver={allowDrop} onDrop={dropOnBench}>
            <Tip text={TIPS.banco}>
              <span className="sem-q-banco-tit">
                Banco <b>{rotPlayers.length}/{maxRotation}</b>
              </span>
            </Tip>
            <div className="sem-q-banco-gente">
              {rotPlayers.map((p) => (
                <button
                  key={p.id}
                  className="sem-suplente"
                  title={`${p.name} (${p.position}) · click para sacarlo`}
                  onClick={() => dispatch({ type: 'TOGGLE_ROTATION', id: p.id })}
                  draggable
                  onDragStart={dragStart(p.id)}
                >
                  <Cara p={p} size={42} />
                  <b>{shortName(p.name)}</b>
                  <span>{POS_ABBR[p.position]}</span>
                </button>
              ))}
              {Array.from({ length: Math.max(0, maxRotation - rotPlayers.length) }).map((_, i) => (
                <span key={`empty-${i}`} className="sem-suplente vacio" aria-hidden="true">
                  <span className="sem-slot-vacio chico">·</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="sem-q-lectura v1-hero" aria-label="El partido">
          <div className="v1-eyebrow">
            <b>{weekLabel(state.week, state.seasonLength).replace('Semana', 'Fecha')}</b>
            {fx?.time ? ` · hoy ${fx.time}` : ' · hoy se juega'}
          </div>
          <div className="sem-q-rival">
            {rivalClub && <Crest seed={rivalClub.id} name={rivalClub.name} colors={rivalClub.colors} founded={rivalClub.founded} size={48} />}
            <div>
              <small>vs</small>
              <RivalLink id={rival.id}>{rival.name}</RivalLink>
            </div>
          </div>
          <p className="v1-frase">
            <b className={diff.cls}>{diff.label}.</b> <span title={style.desc}>{style.label}: {style.desc.toLowerCase()}</span>
          </p>
          {vibe && (
            <p className="v1-frase sem-q-vibe">
              <b>{vibe}</b>
            </p>
          )}

          <div className="sem-q-notas">
            {lastMinute.length > 0 && (
              <p className="v1-frase">
                <b className="bad">
                  <Icon name="alerta" size={14} /> Baja{lastMinute.length > 1 ? 's' : ''} de último momento.
                </b>{' '}
                {lastMinute.map((e, i) => (
                  <span key={e.playerId}>
                    {i > 0 && ' '}
                    <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>: {e.note}
                  </span>
                ))}{' '}
                La lista se largó hace dos días y la vida siguió: se arma con los que están.
              </p>
            )}
            {forfeitRisk && (
              <p className="v1-frase">
                <b className="bad">Sólo hay {available.length} disponibles: no llega a 5.</b> Si jugás así, se pierde por forfeit.
              </p>
            )}
            {shortStart && (
              <p className="v1-frase">
                <b className="warn">Sólo {maxStarters} pueden arrancar.</b>{' '}
                {available
                  .filter((p) => lateIds.has(p.id))
                  .map((p) => p.name)
                  .join(' y ')}{' '}
                llega{available.filter((p) => lateIds.has(p.id)).length > 1 ? 'n' : ''} para el segundo tiempo: se arranca
                corto y entra{available.filter((p) => lateIds.has(p.id)).length > 1 ? 'n' : ''} en el 3er cuarto.
              </p>
            )}
            {count === 5 && missing.length > 0 && (
              <p className="v1-frase">
                <b className="warn">Sin {missing.join(', ').toLowerCase()} natural</b> en el quinteto: alguien juega fuera de puesto.
              </p>
            )}
            {count === 5 && missing.length === 0 && (
              <p className="v1-frase">
                <b className="good">Las cinco posiciones cubiertas.</b>
              </p>
            )}
            {count === 5 && rotationIds.length === 0 && (
              <p className="v1-frase">
                <b className="warn">Sin banco no hay cambios:</b> los cinco juegan los 40 minutos, llegan fundidos al final y
                se desgastan mucho más.
                {available.length > 5 && ` Tenés ${available.length} en la planilla.`}
              </p>
            )}
            {count === 5 && rotationIds.length > 0 && (
              <p className="v1-frase">
                {rotationIds.length >= PLAN_MIN_BENCH ? (
                  <>
                    <b>Con banco, el partido rota solo:</b> frescos en el 2° cuarto, titulares en el 3°, cerradores al final. En
                    el partido lo podés pasar a mano.
                  </>
                ) : (
                  <>
                    <b>Con un solo suplente los cambios son tuyos:</b> el plan rota solo desde dos en el banco.
                  </>
                )}
              </p>
            )}
            {count === 5 && rotationIds.length > 0 && leftOut.length > 0 && (
              <p className="v1-frase">
                <b className="warn">
                  Vas con {count + rotationIds.length} de {available.length}:
                </b>{' '}
                {leftOutHot.length > 0
                  ? `${leftOutHot.map((p) => shortName(p.name)).join(', ')} ${leftOutHot.length > 1 ? 'se van' : 'se va'} a calentar mirando desde afuera.`
                  : `${leftOut.map((p) => shortName(p.name)).join(', ')} ${leftOut.length > 1 ? 'miran' : 'mira'} desde afuera.`}
              </p>
            )}
            {count === 5 && sinRecambio.length > 0 && (
              <p className="v1-frase">
                <b className="warn">
                  {sinRecambio.length === 1
                    ? `Sin ${sinRecambio[0].position.toLowerCase()} de recambio en el banco:`
                    : 'Sin recambio de su puesto en el banco:'}
                </b>{' '}
                {sinRecambio.length === 1
                  ? `el plan no tiene con quién descansar a ${shortName(sinRecambio[0].name)}, que va a jugar casi los 40.`
                  : `el plan no tiene con quién descansar a ${sinRecambio.map((p) => shortName(p.name)).join(', ')}, que van a jugar casi los 40.`}{' '}
                {conRecambioAfuera.length > 0
                  ? `Tenés ${conRecambioAfuera.map((t) => t.position.toLowerCase()).join(' y ')} en la planilla sin lugar en el banco.`
                  : 'Si querés cuidarlo, poné a alguien fuera de puesto en el banco o hacé los cambios a mano.'}
              </p>
            )}
          </div>

          {/* El scouting del rival: primero armás el quinteto, después leés al
              rival. Arranca plegado. */}
          <div className="sem-q-scouting">
            <ScoutingCard state={state} />
          </div>
        </section>
      </div>

      <div className="sem-pie pie-fijo">
        <div className="sem-pie-txt">
          {lineupPromiseWarnings(state).map((w) => (
            <p key={w.playerId} className={`sem-promesa ${w.breaksToday ? 'bad' : 'warn'}`}>
              {w.text}
            </p>
          ))}
          <p className="v1-frase">
            {canPlay ? (
              <>
                Arrastrá jugadores a los puestos o al banco (o usá <b>T</b> y <b>R</b>); click en la pizarra para sacar.{' '}
                <span className="sem-tecla">Espacio</span> también sale.
              </>
            ) : forfeitRisk ? (
              <>No llegan a cinco: presentarse igual es perder por forfeit.</>
            ) : shortStart ? (
              <>Marcá como titulares a los {maxStarters} que pueden arrancar (botón <b>T</b>).</>
            ) : (
              <>Elegí exactamente 5 titulares (botón <b>T</b>) o arrastralos a la pizarra.</>
            )}
          </p>
        </div>
        <button
          className="primary v1-cta"
          disabled={!canPlay && !forfeitRisk}
          onClick={() => dispatch({ type: 'START_MATCH' })}
        >
          {forfeitRisk && !canPlay ? 'Presentarse igual (forfeit) →' : 'Salir a la cancha →'}
        </button>
      </div>
    </div>
  );
}
