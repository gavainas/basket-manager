import { useContext } from 'react';
import type { GameState, PreseasonSummaryEntry } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { FilaDePie, type PersonaDePie } from './Busto';
import { OpenProfileContext, PlayerLink } from './PlayerLink';
import { formatMoney } from './helpers';
import './cierre.css';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/** Nombre de la lista de cierre: abre la ficha si tenemos el id del jugador. */
function NameLink({ entry }: { entry: PreseasonSummaryEntry }) {
  return entry.id ? <PlayerLink id={entry.id}>{entry.label}</PlayerLink> : <>{entry.label}</>;
}

/** "Nacho Pereyra (está dudando)" → ["Nacho Pereyra", "está dudando"]. */
function partir(label: string): [string, string | null] {
  const m = label.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? [m[1], m[2]] : [label, null];
}

/** En la fila de pie entra el apodo si lo tiene, y si no el apellido. */
function shortName(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

const POS_ABBR: Record<string, string> = {
  Base: 'BAS',
  Escolta: 'ESC',
  Alero: 'ALE',
  'Ala-Pívot': 'ALA',
  Pívot: 'PIV',
};

/**
 * El cierre de la pretemporada (UI V1): un momento, no un informe. Pasa en el
 * bar. Arriba y sin caja, el resultado —plantel inscripto o, en la Carrera, no
 * hubo temporada— y lo que costó contado en una frase; a la derecha, la
 * planilla con cinta de cómo arranca el grupo (lo que tiene a favor, lo que
 * preocupa y lo que se prometió); abajo, la lista de buena fe hecha personas:
 * los que juegan de pie sobre el parquet, los nuevos marcados, y los que no
 * siguieron en gris al final. El único botón naranja está en el pie fijo.
 */
export function PreseasonEndScreen({ state, dispatch }: Props) {
  const open = useContext(OpenProfileContext);
  const summary = state.preseason?.summary;
  if (!summary) return null;

  const byId = new Map(state.players.map((p) => [p.id, p]));
  const signed = new Set(summary.signed.map((e) => e.id));
  const emergency = new Set(summary.emergency.map((e) => e.id));

  const persona = (e: PreseasonSummaryEntry, fuera: boolean): PersonaDePie => {
    const p = e.id ? byId.get(e.id) : undefined;
    const [nombre, porque] = partir(e.label);
    const id = e.id || e.label;
    return {
      id,
      nombre: shortName(p?.name ?? nombre),
      personality: p?.personality,
      sub: p ? (POS_ABBR[p.position] ?? p.position.slice(0, 3).toUpperCase()) : undefined,
      estado: fuera
        ? { cls: 'bad', label: 'No siguió' }
        : emergency.has(e.id)
          ? { cls: 'warn', label: 'De emergencia' }
          : signed.has(e.id)
            ? { cls: 'good', label: 'Nuevo' }
            : null,
      fuera,
      title: fuera && porque ? `${nombre}: ${porque}` : e.label,
      onClick: e.id && p ? () => open(e.id) : undefined,
    };
  };
  // La lista de buena fe incluye a los de emergencia; si alguno no estuviera, se suma.
  const enLista = [...summary.roster, ...summary.emergency.filter((e) => !summary.roster.some((r) => r.id === e.id))];
  const personas: PersonaDePie[] = [...enLista.map((e) => persona(e, false)), ...summary.lost.map((e) => persona(e, true))];

  const perdida = state.phase === 'gameOver';
  const n = summary.roster.length;

  return (
    <div className={`cierre cierre-pretemporada${perdida ? ' perdida' : ''}`}>
      <div className="cierre-scroll">
        <div className="cierre-grid">
          <section className="cierre-hero v1-hero" aria-label="El cierre de la pretemporada">
            <div className="v1-eyebrow">
              Se cerró la lista · <b>Temporada {state.seasonNumber}</b> · {state.club.name}
            </div>
            <h1 className={`cierre-titulo${perdida ? ' bad' : ''}`}>{perdida ? 'No hubo temporada' : 'Plantel inscripto'}</h1>
            <p className="cierre-bajada">
              {perdida
                ? state.gameOverReason
                : state.mode === 'carrera' && state.seasonNumber === 1
                  ? `${state.club.name} existe: la lista quedó cerrada y el club está inscripto en la liga.`
                  : 'La lista quedó cerrada y el club está inscripto en la liga.'}
            </p>

            <div className="cierre-cifras">
              <div className="v1-cifra">
                {n}
                <small>{perdida ? `${n === 1 ? 'dijo' : 'dijeron'} que sí` : n === 1 ? 'jugador en la lista' : 'jugadores en la lista'}</small>
              </div>
              {!perdida && (
                <div className={`v1-cifra${state.club.money < 0 ? ' bad' : ''}`}>
                  {formatMoney(state.club.money)}
                  <small>quedan en caja</small>
                </div>
              )}
            </div>

            {!perdida && (
              <p className="v1-frase cierre-frase">
                La pretemporada costó <b>{formatMoney(summary.moneySpent)}</b>. Las cuotas traen{' '}
                <b className={summary.projectedWeeklyFees >= summary.projectedWeeklyCosts ? 'good' : 'warn'}>
                  ${summary.projectedWeeklyFees}
                </b>{' '}
                por semana contra <b>${summary.projectedWeeklyCosts}</b> de gastos
                {summary.scholarships > 0 && (
                  <>
                    , con <b>{summary.scholarships}</b> {summary.scholarships === 1 ? 'beca otorgada' : 'becas otorgadas'}
                  </>
                )}
                .{' '}
                {summary.lost.length === 0
                  ? 'Nadie se fue: el grupo entero sigue.'
                  : `${summary.lost.length === 1 ? 'Uno no siguió' : `${summary.lost.length} no siguieron`}.`}
                {summary.emergency.length > 0 && (
                  <>
                    {' '}
                    De emergencia:{' '}
                    {summary.emergency.map((e, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <NameLink entry={e} />
                      </span>
                    ))}
                    .
                  </>
                )}
              </p>
            )}

            {!perdida && summary.consequences.length > 0 && (
              <div className="cierre-costo">
                <span className="cierre-costo-k">Lo que costó el cierre</span>
                {summary.consequences.map((c, i) => (
                  <p key={i}>{c}</p>
                ))}
              </div>
            )}
          </section>

          <aside className="cierre-planilla v1-planilla" aria-label={perdida ? 'Lo que pasó' : 'Cómo arrancamos'}>
            <i className="v1-cinta a" />
            <i className="v1-cinta b" />
            <h2 className="v1-mano">
              {perdida ? (
                <>
                  Lo que pasó <span>en cuatro semanas</span>
                </>
              ) : (
                <>
                  Cómo arrancamos <span>la temporada {state.seasonNumber}</span>
                </>
              )}
            </h2>
            {perdida ? (
              <ul className="cierre-renglones">
                {summary.consequences.map((c, i) => (
                  <li key={i} className="bad">
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <h3 className="cierre-sub">A favor</h3>
                {summary.strengths.length === 0 ? (
                  <p className="cierre-nada">Pocas certezas: habrá que demostrarlo en la cancha.</p>
                ) : (
                  <ul className="cierre-renglones">
                    {summary.strengths.map((s, i) => (
                      <li key={i} className="good">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="cierre-sub">Ojo con</h3>
                {summary.risks.length === 0 ? (
                  <p className="cierre-nada">No se ven riesgos graves. Eso también da un poco de miedo.</p>
                ) : (
                  <ul className="cierre-renglones">
                    {summary.risks.map((r, i) => (
                      <li key={i} className="warn">
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                {summary.promises.length > 0 && (
                  <>
                    <h3 className="cierre-sub">Lo que prometimos</h3>
                    <ul className="cierre-renglones">
                      {summary.promises.map((p, i) => (
                        <li key={i} className="promesa">
                          {p}
                        </li>
                      ))}
                    </ul>
                    <p className="cierre-nada">Ojo: los jugadores se acuerdan de lo que se les prometió.</p>
                  </>
                )}
              </>
            )}
          </aside>

          <section className="cierre-gente" aria-label={perdida ? 'Los que dijeron que sí' : 'La lista de buena fe'}>
            <h2 className="cierre-gente-t">
              {perdida ? 'Los que dijeron que sí' : `La lista de buena fe (${enLista.length})`}
            </h2>
            {personas.length === 0 ? (
              <p className="v1-frase">Nadie. Ni tu amigo de toda la vida llegó a firmar.</p>
            ) : (
              <FilaDePie personas={personas} compacta={personas.length > 12} />
            )}
          </section>
        </div>
      </div>

      <footer className="cierre-pie">
        <div className="cierre-pie-in">
          <p className="cierre-pie-frase">
            {perdida
              ? 'Con menos de los que pide la liga no hay club: la partida termina acá.'
              : `La temporada ${state.seasonNumber} arranca con la primera fecha.`}
          </p>
          {perdida ? (
            <button className="primary v1-cta" onClick={() => dispatch({ type: 'QUIT_TO_MENU' })}>
              Volver al menú y fundarlo de nuevo
            </button>
          ) : (
            <button className="primary v1-cta" onClick={() => dispatch({ type: 'START_SEASON' })}>
              Comenzar la temporada {state.seasonNumber} →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
