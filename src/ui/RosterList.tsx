import type { GameState, Player } from '../game/types';
import { playerNotes } from '../game/humanState';
import { Avatar } from './Avatar';
import { HumanNoteRow } from './HumanNoteRow';
import { PlayerLink } from './PlayerLink';
import { Tip, TIPS } from './Tip';
import { feeChip, roleLabel, statusChip } from './helpers';

/**
 * El plantel como una sola planilla con renglones (dirección D, aprobada sep
 * 2026 — ver design/SISTEMA_VISUAL.md).
 *
 * Antes era una card por jugador: doce rectángulos idénticos con cuatro barras
 * cada uno, donde nada era más importante que nada y para comparar el físico de
 * dos jugadores había que mirar dos cajas distintas. Acá las cifras quedan en
 * columna y se leen de arriba abajo, que es lo que hace un manager; el "por qué"
 * de cada uno tiene su propia columna, así que la parte humana no se pierde; y
 * entran ocho jugadores donde antes entraban cuatro.
 *
 * La planilla densa y ordenable de `RosterSheet` sigue existiendo, con más
 * columnas (minutos, faltas, último partido): son dos preguntas distintas.
 */
export function RosterList({ state, players }: { state: GameState; players: Player[] }) {
  return (
    <div className="planilla">
      {/* Los tornillos: lo que hace que la placa pese. Van en el DOM y no en un
          gradiente para no pelearse con el grano de `.card`. */}
      <span className="tornillo tornillo-si" />
      <span className="tornillo tornillo-sd" />
      <span className="tornillo tornillo-ii" />
      <span className="tornillo tornillo-id" />

      <div className="planilla-cab">
        <span />
        <span>Jugador</span>
        <Tip text={TIPS.fisico}><span className="num">Físico</span></Tip>
        <Tip text={TIPS.motivacion}><span className="num">Motiv.</span></Tip>
        <Tip text={TIPS.compromiso}><span className="num">Compr.</span></Tip>
        <Tip text={TIPS.afinidadSocial}><span className="num">Social</span></Tip>
        <span>En el vestuario</span>
        <span>Rol previsto</span>
        <Tip text={TIPS.valoracion}><span className="num">Valor.</span></Tip>
      </div>

      {players.map((p) => (
        <Fila key={p.id} state={state} p={p} />
      ))}
    </div>
  );
}

/** Semáforo de una cifra: el mismo umbral que usaban las barras. */
function cifraCls(v: number): string {
  return v >= 65 ? '' : v >= 40 ? 'ojo' : 'mal';
}

/** Cinco bloques, como el medidor segmentado de las barras. */
function Medidor({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const cls = v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
  return (
    <span className="mini-medidor">
      <i className={cls} style={{ width: `${v}%` }} />
    </span>
  );
}

function Cifra({ value }: { value: number }) {
  return (
    <span className="planilla-cifra">
      <b className={cifraCls(value)}>{Math.round(value)}</b>
      <Medidor value={value} />
    </span>
  );
}

function Fila({ state, p }: { state: GameState; p: Player }) {
  const nota = playerNotes(state, p)[0];
  const status = statusChip(p);
  const fee = feeChip(p);
  // La fila se tiñe sólo cuando hay algo que resolver: si se tiñen todas, no se
  // tiñe ninguna.
  const alerta = status?.cls === 'bad' || fee?.cls === 'bad';

  return (
    <div className={`planilla-fila${alerta ? ' alerta' : ''}`}>
      <span className="planilla-foto">
        <Avatar
          seed={p.id}
          age={p.age}
          appearance={p.appearance}
          expressionOverride={
            p.status === 'molesto' || p.status === 'al_borde' ? 2 : p.status === 'lesionado' ? 3 : undefined
          }
          title={p.name}
          personality={p.personality}
        />
      </span>

      <span className="planilla-quien">
        <span className="planilla-nombre">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>
          <span className="planilla-pos">
            {p.position} · {p.age}
          </span>
        </span>
        <span className="planilla-dicho">{p.description}</span>
      </span>

      <Cifra value={p.physical} />
      <Cifra value={p.motivation} />
      <Cifra value={p.commitment} />
      <Cifra value={p.social} />

      <span className="planilla-nota">{nota ? <HumanNoteRow note={nota} /> : <span className="planilla-nada">—</span>}</span>

      <span className="planilla-rol">
        {roleLabel(p)}
        {status && <span className={`chip ${status.cls}`}>{status.label}</span>}
        {fee && <span className={`chip ${fee.cls}`}>{fee.label}</span>}
      </span>

      {/* El único naranja de la pantalla: el dato que la pantalla existe para
          mostrar (ver la regla del naranja en design/SISTEMA_VISUAL.md). */}
      <span className="planilla-valor"><small>≈</small>{p.visibleRating}</span>
    </div>
  );
}
