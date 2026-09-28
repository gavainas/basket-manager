import type { CSSProperties } from 'react';
import { useContext } from 'react';
import type { GameState, Player } from '../game/types';
import { playerNotes } from '../game/humanState';
import { Avatar } from './Avatar';
import { Busto } from './Busto';
import { HumanNoteRow } from './HumanNoteRow';
import { OpenProfileContext, PlayerLink } from './PlayerLink';
import { Tip, TIPS } from './Tip';

/**
 * El plantel como una sola planilla (UI V1 — design/UI_V1_GUIA.md, regla 3).
 *
 * Antes eran nueve columnas (físico, motivación, conducta, social, la nota,
 * el rol, la valoración…) y cada renglón pesaba igual que el de al lado. La
 * pregunta de esta pestaña es «¿quién es cada uno y cómo está?», así que
 * quedan cinco cosas: la cara, quién es, cuánto vale (el único naranja), cómo
 * llega (físico y motivación) y qué espera. Lo que le pasa a cada uno va como
 * una línea debajo del nombre, con la voz del club; la palabra de estado
 * aparece sólo cuando algo anda mal. Conducta y social siguen en
 * «Estadísticas», que es la planilla para comparar.
 *
 * Cada renglón abre la ficha del jugador.
 */
export function RosterList({ state, players }: { state: GameState; players: Player[] }) {
  return (
    <div className="pl-lista v1-planilla" aria-label="El plantel">
      <div className="pl-lista-cab">
        <span />
        <span>Jugador</span>
        <Tip text={TIPS.valoracion}><span className="num">Valor.</span></Tip>
        <Tip text={TIPS.fisico}><span className="num">Físico</span></Tip>
        <Tip text={TIPS.motivacion}><span className="num">Motiv.</span></Tip>
        <span>Espera</span>
      </div>
      {players.map((p, i) => (
        <Renglon key={p.id} state={state} p={p} indice={i} />
      ))}
    </div>
  );
}

/**
 * La palabra que se escribe al lado del nombre: una sola, la peor, y sólo si
 * hay algo que resolver (misma idea que la fila de pie del Tablero).
 */
export function estadoPlantel(p: Player): { cls: 'bad' | 'warn'; label: string } | null {
  if (p.status === 'lesionado') {
    const sem = `${p.injuryWeeks} sem`;
    return { cls: 'bad', label: p.injuryReason === 'laboral' ? `Laburo · ${sem}` : `Lesión · ${sem}` };
  }
  if ((p.suspendedWeeks ?? 0) > 0) return { cls: 'bad', label: 'Suspendido' };
  if (p.status === 'al_borde') return { cls: 'bad', label: 'Al borde' };
  if (p.feeStatus === 'pendiente') return { cls: p.weeksUnpaid >= 2 ? 'bad' : 'warn', label: `Debe ${Math.max(p.weeksUnpaid, 1)} sem` };
  if (p.status === 'molesto') return { cls: 'warn', label: 'Molesto' };
  return null;
}

/** Semáforo de una cifra: los mismos umbrales de siempre (65 / 40). */
function tono(v: number): 'good' | 'warn' | 'bad' {
  return v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
}

function Cifra({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const t = tono(v);
  return (
    <span className={`pl-cifra ${t}`}>
      <b>{v}</b>
      <i aria-hidden="true"><i style={{ width: `${v}%` }} /></i>
    </span>
  );
}

const ROL: Record<Player['expectedRole'], [string, string]> = {
  titular: ['Se ve titular', '~30 min'],
  rotación: ['Rotación', '~18 min'],
  suplente: ['Suplente', '~8 min'],
};

/** La cara redonda de la planilla: el mismo retrato que la fila de pie. */
export function CaraPlantel({ p, size }: { p: Player; size?: 'chica' }) {
  return (
    <span className={`pl-cara${size ? ` ${size}` : ''}`} aria-hidden="true">
      {p.personality ? (
        <Busto seed={p.id} personality={p.personality} gris={p.status === 'lesionado'} />
      ) : (
        <Avatar seed={p.id} age={p.age} size={44} appearance={p.appearance} title={p.name} />
      )}
    </span>
  );
}

function Renglon({ state, p, indice }: { state: GameState; p: Player; indice: number }) {
  const open = useContext(OpenProfileContext);
  const nota = playerNotes(state, p)[0];
  const est = estadoPlantel(p);
  const [rol, minutos] = ROL[p.expectedRole];
  const beca = p.feeStatus === 'beca_total' ? 'Beca total' : p.feeStatus === 'beca_parcial' ? 'Beca parcial' : null;

  return (
    <div
      className={`pl-renglon${est?.cls === 'bad' ? ' alerta' : ''}`}
     
      style={{ '--fila': indice } as CSSProperties}
      onClick={() => open(p.id)}
      title={`Abrir la ficha de ${p.name}`}
    >
      <CaraPlantel p={p} />

      <span className="pl-quien">
        <span className="pl-nombre">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>
          <span className="pl-pos">{p.position} · {p.age}</span>
          {est && <span className={`v1-est ${est.cls}`}>{est.label}</span>}
        </span>
        {nota && (
          <span className="pl-nota">
            <HumanNoteRow note={nota} />
          </span>
        )}
      </span>

      {/* El único naranja de la pantalla: el dato que la planilla existe para
          mostrar. El ≈ recuerda que es una estimación. */}
      <span className="pl-valor"><small>≈</small>{p.visibleRating}</span>
      <span><Cifra value={p.physical} /></span>
      <span><Cifra value={p.motivation} /></span>

      <span className="pl-rol">
        <b>{rol}</b>
        <span>{minutos}{beca && <> · {beca}</>}</span>
      </span>
    </div>
  );
}
