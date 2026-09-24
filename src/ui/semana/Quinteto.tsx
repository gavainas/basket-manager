// Etapa 3 · Quinteto: el plantel a la izquierda, la pizarra con los cinco
// puestos y el banco a la derecha, el pie fijo con "Ir al partido".

import type { Player } from '../../game/types';
import { BALANCE } from '../../game/balance';
import { lineupPromiseWarnings } from '../../game/promises';
import { evaluateTeam, isSelectable, PLAN_MIN_BENCH, titularesSinRecambio } from '../../game/match';
import { listaY } from '../../game/nombres';
import { Icon } from '../Icon';
import { PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { ScoutingCard } from '../ScoutingCard';
import { Tip, TIPS } from '../Tip';
import { rivalDifficulty, rivalStyleInfo, weekLabel } from '../helpers';
import { useEspacio } from '../teclas';
import { Avatar } from '../Avatar';
import { absentIds, POS_ABBR, POSITION_ORDER, shortName, type Props } from './comun';

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
  // Con DT contratado, los cambios del partido arrancan en sus manos.
  const dt = state.coach;

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

  return (
    /* Tres franjas de alto fijo (tanda C): arriba cómo llega el partido y el
       quinteto de un vistazo, en el medio la pizarra —que es LA acción de esta
       pantalla y antes quedaba medio escondida abajo del pliegue—, abajo la
       confirmación siempre en el mismo lugar. */
    <div className="quinteto-pantalla">
      <div className="quinteto-cabecera">
      <div className="card">
        <h3>
          {weekLabel(state.week, state.seasonLength)} · vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
          <span className="chip accent" title={style.desc}>
            {style.label}
          </span>
          <Tip text={TIPS.titulares}>
            <span className={`chip ${count === 5 || (shortStart && count === maxStarters) ? 'good' : 'warn'}`}>
              Titulares: {count}/{shortStart ? maxStarters : 5}
            </span>
          </Tip>
          <Tip text={TIPS.banco}>
            <span className={`chip ${rotationIds.length > 0 ? 'good' : 'warn'}`}>
              Banco: {rotationIds.length}/{maxRotation}
            </span>
          </Tip>
          {missing.length > 0 && count === 5 && <span className="chip warn">Sin {listaY(missing.map((m) => m.toLowerCase()))} natural</span>}
          {count === 5 && missing.length === 0 && <span className="chip good">Todas las posiciones cubiertas</span>}
        </div>
        {vibe && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {vibe} <span title={style.desc}>({style.label.replace(/^\S+\s/, '')}: {style.desc.toLowerCase()})</span>
          </p>
        )}
        {count === 5 && rotationIds.length === 0 && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            Sin banco no hay cambios: los cinco juegan los 40 minutos, llegan fundidos al final y se desgastan mucho más.
            {available.length > 5 && ` Tenés ${available.length} en la planilla.`}
          </p>
        )}
        {count === 5 && rotationIds.length > 0 && leftOut.length > 0 && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            Vas con {count + rotationIds.length} y tenés {available.length} en la planilla:{' '}
            {leftOutHot.length > 0
              ? `${listaY(leftOutHot.map((p) => shortName(p.name)))} ${leftOutHot.length > 1 ? 'se van' : 'se va'} a calentar mirando desde afuera.`
              : `${listaY(leftOut.map((p) => shortName(p.name)))} ${leftOut.length > 1 ? 'miran' : 'mira'} desde afuera.`}
          </p>
        )}
        {count === 5 && rotationIds.length > 0 && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {/* Con DT contratado los cambios arrancan en sus manos (match.ts,
                `autoRotation: !!s.coach`) y el plan "rota solo" no corre: la
                pizarra lo decía igual y el informe contaba otra cosa ("Varela
                movió el banco"). Se describe lo que va a pasar de verdad. */}
            {dt
              ? `Los cambios los hace ${dt.name} con su directiva, ${
                  dt.directive === 'repartir'
                    ? '"juegan todos": mete al banco para que todos sumen minutos'
                    : '"a ganar": descansa a los fundidos y mete a los mejores para cerrar'
                }. En el partido los podés tomar vos.`
              : rotationIds.length >= PLAN_MIN_BENCH
                ? 'Con banco, el partido rota solo: frescos en el 2° cuarto, titulares en el 3°, cerradores al final. En el partido lo podés pasar a mano.'
                : 'Con un solo suplente los cambios son tuyos: el plan rota solo desde dos en el banco.'}
          </p>
        )}
        {count === 5 && sinRecambio.length > 0 && dt && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            {/* El DT sí lo descansa (mete al más fresco, o al del puesto si lo
                hay): lo que queda es el hueco. */}
            {sinRecambio.length === 1
              ? `Sin ${sinRecambio[0].position.toLowerCase()} de recambio en el banco: cuando ${shortName(dt.name)} descanse a ${shortName(sinRecambio[0].name)}, el equipo queda sin ${sinRecambio[0].position.toLowerCase()} natural.`
              : `Sin recambio de su puesto en el banco: cuando ${shortName(dt.name)} descanse a ${listaY(sinRecambio.map((p) => shortName(p.name)))}, el equipo queda sin su puesto.`}
          </p>
        )}
        {count === 5 && sinRecambio.length > 0 && !dt && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            {/* Las dos salidas del plan, porque las dos pasan: "Piernas frescas"
                tapa el puesto con el titular si lo alcanza entre los siguientes
                del orden, y si no el cuarto va sin ese puesto (`conCobertura`).
                Antes prometía "va a jugar casi los 40" y en la fecha 1 el único
                base jugó 20' con el equipo sin base los otros 20. */}
            {sinRecambio.length === 1
              ? `Sin ${sinRecambio[0].position.toLowerCase()} de recambio en el banco: el plan no tiene con quién descansar a ${shortName(sinRecambio[0].name)}. O juega casi los 40, o el equipo pasa cuartos sin ${sinRecambio[0].position.toLowerCase()} natural.`
              : `Sin recambio de su puesto en el banco: el plan no tiene con quién descansar a ${listaY(sinRecambio.map((p) => shortName(p.name)))}. O juegan casi los 40, o el equipo pasa cuartos sin su puesto.`}{' '}
            {conRecambioAfuera.length > 0
              ? `Tenés ${listaY(conRecambioAfuera.map((t) => t.position.toLowerCase()))} en la planilla sin lugar en el banco.`
              : `Si querés ${sinRecambio.length === 1 ? 'cuidarlo' : 'cuidarlos'}, poné a alguien fuera de puesto en el banco o hacé los cambios a mano.`}
          </p>
        )}
      </div>

      {state.callUp.some((e) => e.lastMinute) && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--bad)' }}>
            <Icon name="alerta" size={16} /> Baja{state.callUp.filter((e) => e.lastMinute).length > 1 ? 's' : ''} de
            último momento
          </h3>
          {state.callUp
            .filter((e) => e.lastMinute)
            .map((e) => (
              <p key={e.playerId} style={{ margin: '0.25rem 0' }}>
                <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>: {e.note}
              </p>
            ))}
          <p className="muted" style={{ margin: '0.3rem 0 0' }}>
            La lista se largó hace dos días y la vida siguió pasando. No hay margen para gestiones: se arma con los que
            están.
          </p>
        </div>
      )}


      {forfeitRisk && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--bad)' }}>
            Solo hay {available.length} jugadores disponibles: no llega a 5. Si jugás así, se pierde por forfeit.
          </strong>
        </div>
      )}
      {shortStart && (
        <div className="card" style={{ borderColor: 'var(--warn)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--warn)' }}>
            Solo {maxStarters} pueden arrancar:{' '}
            {listaY(available.filter((p) => lateIds.has(p.id)).map((p) => p.name))}{' '}
            llega{available.filter((p) => lateIds.has(p.id)).length > 1 ? 'n' : ''} para el segundo tiempo. Se arranca
            corto y entra{available.filter((p) => lateIds.has(p.id)).length > 1 ? 'n' : ''} en el 3er cuarto.
          </strong>
        </div>
      )}
      </div>

      <div className="lineup-layout">
        <div className="lineup-izq">
        <div className="lineup-list card" onDragOver={allowDrop} onDrop={dropOnList}>
          <div className="lineup-toolbar">
            <h3 style={{ margin: 0 }}>Plantel</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="small" onClick={() => dispatch({ type: 'AUTO_LINEUP' })}>
                Sugerir
              </button>
              <button className="small" onClick={() => dispatch({ type: 'CLEAR_LINEUP' })}>
                Limpiar
              </button>
            </div>
          </div>
          {sorted.map((p) => {
            const avail = isSelectable(p) && !absent.has(p.id);
            const isStarter = state.starters.includes(p.id);
            const inRotation = rotationIds.includes(p.id);
            const starterFull = count >= 5 && !isStarter;
            const rotationFull = rotationIds.length >= maxRotation && !inRotation;
            return (
              <div
                key={p.id}
                className={`lp-row${isStarter ? ' starter' : ''}${inRotation ? ' rot' : ''}${!avail ? ' off' : ''}`}
                draggable={avail}
                onDragStart={avail ? dragStart(p.id) : undefined}
              >
                <span className="lp-pos">{POS_ABBR[p.position]}</span>
                <div className="lp-who">
                  <div className="lp-name">
                    <PlayerLink id={p.id}>{p.name}</PlayerLink>
                    {!avail && (
                      <span className="chip bad" style={{ marginLeft: '0.4rem' }}>
                        {absent.has(p.id)
                          ? 'No vino'
                          : p.status === 'lesionado'
                            ? p.injuryReason === 'laboral'
                              ? `Laburo ${p.injuryWeeks} sem.`
                              : `Lesión ${p.injuryWeeks} sem.`
                            : 'No disponible'}
                      </span>
                    )}
                    {avail && p.status === 'molesto' && (
                      <span className="chip warn" style={{ marginLeft: '0.4rem' }}>
                        Molesto
                      </span>
                    )}
                    {avail && p.status === 'al_borde' && (
                      <span className="chip bad" style={{ marginLeft: '0.4rem' }}>
                        Al borde
                      </span>
                    )}
                    {avail && lateIds.has(p.id) && (
                      <span className="chip warn" style={{ marginLeft: '0.4rem' }} title="Solo puede entrar desde el banco, en el segundo tiempo">
                        <Icon name="reloj" size={11} /> 2do tiempo
                      </span>
                    )}
                  </div>
                  <div className="lp-meta">
                    <span title="Físico">
                      <Icon name="fisico" size={12} /> {Math.round(p.physical)}
                    </span>
                    <span title="Motivación">
                      <Icon name="animo" size={12} /> {Math.round(p.motivation)}
                    </span>
                    {p.lastRating !== null && <span title="Último partido">Últ. {p.lastRating}/10</span>}
                  </div>
                </div>
                <div className="lp-rating">
                  <div className="num">≈{p.visibleRating}</div>
                </div>
                <div className="lp-btns">
                  <button
                    className={`mini${isStarter ? ' on' : ''}`}
                    title={lateIds.has(p.id) ? 'Llega al segundo tiempo: no puede ser titular' : 'Titular'}
                    disabled={!avail || lateIds.has(p.id) || (starterFull && !isStarter)}
                    onClick={() => dispatch({ type: 'TOGGLE_STARTER', id: p.id })}
                  >
                    T
                  </button>
                  <button
                    className={`mini blue${inRotation ? ' on' : ''}`}
                    title="Rotación (banco)"
                    disabled={!avail || isStarter || rotationFull}
                    onClick={() => dispatch({ type: 'TOGGLE_ROTATION', id: p.id })}
                  >
                    R
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {/* El scouting del rival, debajo de la lista: primero armás el quinteto,
            después leés al rival. Scrollea junto con el plantel. */}
        <ScoutingCard state={state} />
        </div>

        <div className="lineup-court card">
          <h3>La pizarra</h3>
          <div className="court">
            <CourtLines />
            {POSITION_ORDER.map((pos, i) => {
              const pl = slots[i];
              const oop = pl ? pl.position !== pos : false;
              return (
                <div
                  key={pos}
                  className={`slot${pl ? ' filled' : ''}`}
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
                  <div className="slot-pos-label">{pos}</div>
                  <div className={`slot-avatar${oop ? ' oop' : ''}${pl ? '' : ' empty'}`}>
                    {pl ? <Avatar seed={pl.id} age={pl.age} appearance={pl.appearance} title={pl.name} personality={pl.personality} /> : '+'}
                  </div>
                  <div className={`slot-name${pl ? '' : ' dim'}`}>{pl ? shortName(pl.name) : 'Libre'}</div>
                  {pl && (
                    <>
                      <div className="slot-sub">
                        ≈{pl.visibleRating} · {(pl.height / 100).toFixed(2)} m
                      </div>
                      {/* El puesto de verdad va en su renglón: pegado a la altura
                          ("≈62 · 1.87 m · es Alero") partía en "… · es" y "Alero"
                          al ancho de la ficha. */}
                      {oop && <div className="slot-sub oop-text">es {pl.position}</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="bench" onDragOver={allowDrop} onDrop={dropOnBench}>
            <span className="bench-label">Banco ({rotPlayers.length}/{maxRotation}):</span>
            {rotPlayers.map((p) => (
              <div
                key={p.id}
                className="bench-slot"
                title={`${p.name} (${p.position}) · click para sacarlo`}
                onClick={() => dispatch({ type: 'TOGGLE_ROTATION', id: p.id })}
                draggable
                onDragStart={dragStart(p.id)}
              >
                <div className="slot-avatar small">
                  <Avatar seed={p.id} age={p.age} appearance={p.appearance} title={p.name} personality={p.personality} />
                </div>
                <div className="slot-name">{shortName(p.name)}</div>
                <div className="slot-sub">{POS_ABBR[p.position]}</div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, maxRotation - rotPlayers.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bench-slot dim">
                <div className="slot-avatar small empty">·</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quinteto-pie pie-fijo">
      {lineupPromiseWarnings(state).map((w) => (
        <p key={w.playerId} style={{ color: w.breaksToday ? 'var(--bad)' : 'var(--warn, #c90)', fontWeight: 600, margin: '0 0 0.35rem' }}>
          {w.text}
        </p>
      ))}

      <div className="confirm-bar">
        <button
          className="primary"
          disabled={!canPlay && !forfeitRisk}
          onClick={() => dispatch({ type: 'START_MATCH' })}
        >
          {forfeitRisk && !canPlay ? 'Presentarse igual (forfeit) →' : 'Ir al partido →'}
        </button>
        {canPlay && (
          <span className="hint">
            <b>Espacio</b> también.
          </span>
        )}
        {!canPlay && !forfeitRisk && (
          <span className="hint">
            {shortStart
              ? `Marcá como titulares a los ${maxStarters} que pueden arrancar (botón T).`
              : 'Elegí exactamente 5 titulares (botón T).'}
          </span>
        )}
        {canPlay && (
          <span className="hint">
            Arrastrá jugadores a los puestos de la cancha o al banco (también sirven los botones T/R). Click en la
            pizarra para sacar.
          </span>
        )}
      </div>
      </div>
    </div>
  );
}
