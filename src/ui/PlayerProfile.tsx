import { useState, type ReactNode } from 'react';
import type { GameState, Player } from '../game/types';
import { affinity, coachAffinity, FRIEND_THRESHOLD, groupStanding, RIVALRY_THRESHOLD } from '../game/relations';
import { friendshipsOf } from '../game/friendsAbroad';
import { buildSocialMap } from '../game/socialMap';
import { worldPlayerName } from '../game/world';
import { fragilityHint, fragilityOf } from '../game/injuries';
import { playerNotes } from '../game/humanState';
import { ORIGIN_SITUATIONS } from '../data/market';
import { Bar } from './Bar';
import { ConductaFicha } from './Conducta';
import { Carita, Ficha, FichaDePie, Renglon, Seccion } from './Ficha';
import { HumanNoteRow } from './HumanNoteRow';
import { PlayerLink } from './PlayerLink';
import { Timeline } from './Timeline';
import { Tip, TIPS } from './Tip';
import { feeChip, feeChipAlways, roleLabel, statusChip, statusChipAlways } from './helpers';
import { Icon } from './Icon';
import { useTeclasModal } from './teclas';

type ProfileTab = 'general' | 'deportiva' | 'relaciones' | 'historia' | 'social';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'deportiva', label: 'Deportiva' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'historia', label: 'Historia' },
  { id: 'social', label: 'Social' },
];

interface Props {
  state: GameState;
  playerId: string;
  onClose: () => void;
}

function seasonsAtClub(p: Player, currentSeason: number): string {
  const n = Math.max(1, currentSeason - p.joinedSeason + 1);
  return n === 1 ? 'Primera temporada' : `${n}ª temporada`;
}

/** Un estado en la planilla: escrito liso si es el normal, marcado si es la excepción. */
function Estado({ chip, normal }: { chip: { cls: string; label: string }; normal: boolean }) {
  return normal ? <>{chip.label}</> : <span className={`v1-est ${chip.cls}`}>{chip.label}</span>;
}

function GeneralTab({ state, p, verHistoria }: { state: GameState; p: Player; verHistoria: () => void }) {
  const status = statusChipAlways(p);
  const fee = feeChipAlways(p);
  const promises = state.promises.filter((pr) => pr.playerId === p.id && pr.season === state.seasonNumber);
  const notes = playerNotes(state, p);
  return (
    <>
      {notes.length > 0 && (
        <Seccion titulo="Cómo viene">
          <div className="human-notes ficha-notas">
            {notes.map((n, i) => (
              <HumanNoteRow key={i} note={n} />
            ))}
          </div>
        </Seccion>
      )}
      <Seccion titulo="La ficha">
        <div className="data-grid">
          <Renglon label="Mano hábil">{p.hand === 'zurda' ? 'Zurda' : 'Derecha'}</Renglon>
          <Renglon label="Profesión">{p.profession}</Renglon>
          <Renglon label={p.previousTeam in ORIGIN_SITUATIONS ? 'Antes de llegar' : 'Club anterior'}>{p.previousTeam}</Renglon>
          <Renglon label="En el club">
            Desde la temporada {p.joinedSeason} · {seasonsAtClub(p, state.seasonNumber)}
          </Renglon>
          <Renglon label="Rol esperado">{roleLabel(p)}</Renglon>
          <Renglon label="Disponibilidad">
            <Estado chip={status} normal={!statusChip(p)} />
          </Renglon>
          <Renglon label="Cuota">
            <Estado chip={fee} normal={!feeChip(p)} />
          </Renglon>
          {promises.length > 0 && (
            <Renglon label="Promesas">
              {promises.map((pr, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {pr.label.replace(`${p.name}: `, '')}
                  {pr.broken && <> <span className="v1-est bad">Rota</span></>}
                </span>
              ))}
            </Renglon>
          )}
        </div>
      </Seccion>
      {p.timeline.length > 0 && (
        <Seccion
          titulo="Lo último"
          extra={
            p.timeline.length > 3 ? (
              <button className="ficha-mas" onClick={verHistoria}>
                Toda su historia →
              </button>
            ) : undefined
          }
        >
          <Timeline events={p.timeline.slice(-3)} />
        </Seccion>
      )}
    </>
  );
}

/** Una cifra de la planilla: el número en display y qué es, abajo. */
function Cifra({ v, k, sub }: { v: ReactNode; k: string; sub?: string }) {
  return (
    <div className="ficha-dato">
      <b>{v}</b>
      <span>{k}</span>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function DeportivaTab({ p }: { p: Player }) {
  const log = p.matchLog;
  const played = log.length;
  const minutes = log.reduce((t, m) => t + m.minutes, 0);
  const avgRating = played ? (log.reduce((t, m) => t + m.rating, 0) / played).toFixed(1) : '—';
  const mvps = log.filter((m) => m.mvp).length;
  const winPct = played ? Math.round((log.filter((m) => m.won).length / played) * 100) : null;
  const points = log.reduce((t, m) => t + (m.points ?? 0), 0);
  const rebounds = log.reduce((t, m) => t + (m.rebounds ?? 0), 0);
  const assists = log.reduce((t, m) => t + (m.assists ?? 0), 0);
  const perGame = (v: number) => (played ? (v / played).toFixed(1) : '—');

  const last = [...log].slice(-5).reverse();
  const recent = log.slice(-3);
  const previous = log.slice(-6, -3);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const trend =
    recent.length < 2 || previous.length === 0
      ? { icon: '—', text: 'Todavía sin datos suficientes para marcar una tendencia.' }
      : avg(recent.map((m) => m.rating)) > avg(previous.map((m) => m.rating)) + 0.5
        ? { icon: '▲', text: 'En alza: sus últimas notas vienen mejorando.' }
        : avg(recent.map((m) => m.rating)) < avg(previous.map((m) => m.rating)) - 0.5
          ? { icon: '▼', text: 'En baja: sus últimos partidos estuvieron flojos.' }
          : { icon: '—', text: 'Estable: rinde parejo partido a partido.' };
  const projection =
    p.age <= 25
      ? 'En edad de crecer: entrenando puede dar un salto.'
      : p.age <= 30
        ? 'En su pico: es lo que ves.'
        : 'Veterano: el físico va a ir cediendo, la cabeza lo compensa.';

  return (
    <>
      <Seccion titulo="Cómo está">
        <Bar label="Valoración" value={p.visibleRating} hint={TIPS.valoracion} />
        <Bar label="Físico" value={p.physical} hint={TIPS.fisico} />
        <Bar label="Motivación" value={p.motivation} hint={TIPS.motivacion} />
        <Bar label="Afinidad social" value={p.social} hint={TIPS.afinidadSocial} />
      </Seccion>

      {/* El compromiso no se ve: se descubre. Lo que hay es la ficha de
          conducta, que se llena con las fechas (T2). */}
      <Seccion titulo="Conducta">
        <ConductaFicha p={p} />
      </Seccion>

      <Seccion titulo="Con el club" extra={played ? `${played} ${played === 1 ? 'partido' : 'partidos'} · ${minutes}'` : undefined}>
        {played === 0 ? (
          <p className="ficha-nada">Todavía no jugó con el club.</p>
        ) : (
          <div className="ficha-datos">
            <Cifra v={perGame(points)} k="Puntos" sub={`${points} en total`} />
            <Cifra v={perGame(rebounds)} k="Rebotes" sub={`${rebounds} en total`} />
            <Cifra v={perGame(assists)} k="Asistencias" sub={`${assists} en total`} />
            <Cifra v={avgRating} k="Nota media" />
            <Cifra v={mvps > 0 ? `×${mvps}` : '—'} k="Figura" />
            <Cifra v={winPct !== null ? `${winPct}%` : '—'} k="Victorias" />
          </div>
        )}
      </Seccion>

      {last.length > 0 && (
        <Seccion titulo="Últimos partidos">
          <table className="ficha-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rival</th>
                <th className="num">Min</th>
                <th className="num">Pts</th>
                <th className="num">Reb</th>
                <th className="num">Ast</th>
                <th className="num">Nota</th>
                <th className="num">Res.</th>
              </tr>
            </thead>
            <tbody>
              {last.map((m, i) => (
                <tr key={i}>
                  <td className="dim">
                    T{m.season} · S{m.week}
                  </td>
                  <td>
                    {m.rivalName} {m.mvp ? <Icon name="estrella" size={11} /> : ''}
                  </td>
                  <td className="num">{m.minutes}&apos;</td>
                  <td className="num fuerte">{m.points ?? 0}</td>
                  <td className="num">{m.rebounds ?? 0}</td>
                  <td className="num">{m.assists ?? 0}</td>
                  <td className="num">{m.rating}/10</td>
                  <td className={`num fuerte ${m.won ? 'good' : 'bad'}`}>{m.won ? 'G' : 'P'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Seccion>
      )}

      <Seccion titulo="Evolución y tendencia">
        <div className="data-grid">
          <Renglon label="Tendencia">
            {trend.icon} {trend.text}
          </Renglon>
          <Renglon label="Entrenamientos">
            {p.seasonTrainings} esta temporada
            {p.techniqueGain > 0 ? ' · la técnica viene mejorando' : ''}
          </Renglon>
          <Renglon label="Proyección">{projection}</Renglon>
          <Renglon label="Durabilidad">
            {fragilityHint(fragilityOf(p)).icon} {fragilityHint(fragilityOf(p)).text}
          </Renglon>
        </div>
      </Seccion>
    </>
  );
}

function AffinityRow({ value, children }: { value: number; children: ReactNode }) {
  const cls = value >= 65 ? 'good' : value >= 40 ? 'warn' : 'bad';
  return (
    <div className="aff-row">
      <span className="aff-name">{children}</span>
      <div className="legs-mini">
        <div className={`fill ${cls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="aff-value">{value}</span>
    </div>
  );
}

function RelacionesTab({ state, p }: { state: GameState; p: Player }) {
  const teammates = state.players.filter((t) => !t.leftClub && t.id !== p.id);
  const abroad = friendshipsOf(state, p.id);
  const rows = teammates
    .map((t) => ({ t, aff: affinity(p, t, state.affinityBonus) }))
    .sort((a, b) => b.aff - a.aff);
  const friends = rows.filter((r) => r.aff >= FRIEND_THRESHOLD);
  const rivals = rows.filter((r) => r.aff <= RIVALRY_THRESHOLD);
  const coach = coachAffinity(p);
  // Su lugar en el mapa del vestuario, con las mismas palabras que la pestaña
  // Vestuario: la mesa de la que es, o con quién se junta si no tiene mesa.
  const map = buildSocialMap(state);
  const mesa = map.groups.find((g) => g.members.some((m) => m.id === p.id));
  const suelto = map.sueltos.find((e) => e.p.id === p.id);
  const solo = map.loners.find((e) => e.p.id === p.id);

  return (
    <>
      <Seccion titulo="En el vestuario">
        <p className="ficha-frase">
          {mesa ? (
            <>
              De la mesa de <strong>{mesa.label}</strong>, con{' '}
              {mesa.members
                .filter((m) => m.id !== p.id)
                .map((m, i, arr) => (
                  <span key={m.id}>
                    {i > 0 && (i === arr.length - 1 ? ' y ' : ', ')}
                    <PlayerLink id={m.id}>{m.name}</PlayerLink>
                  </span>
                ))}
              .
            </>
          ) : suelto ? (
            <>
              Sin mesa fija. {suelto.text.slice(0, suelto.text.indexOf(suelto.closest.name))}
              <PlayerLink id={suelto.closest.id}>{suelto.closest.name}</PlayerLink>
              {suelto.text.slice(suelto.text.indexOf(suelto.closest.name) + suelto.closest.name.length)}
            </>
          ) : (
            solo?.text ?? 'Va por la suya.'
          )}
        </p>
        <div className="data-grid">
          <Renglon label="Amigos">
            {friends.length > 0
              ? friends.map((r, i) => (
                  <span key={r.t.id}>
                    {i > 0 && ', '}
                    <PlayerLink id={r.t.id}>{r.t.name}</PlayerLink>
                  </span>
                ))
              : 'Se lleva bien con todos, íntimo de ninguno.'}
          </Renglon>
          <Renglon label="Roces">
            {rivals.length > 0
              ? rivals.map((r, i) => (
                  <span key={r.t.id}>
                    {i > 0 && ', '}
                    <PlayerLink id={r.t.id}>{r.t.name}</PlayerLink>
                  </span>
                ))
              : 'Sin conflictos a la vista.'}
          </Renglon>
          {abroad.length > 0 && (
            <Renglon label="En otros cuadros">
              {abroad.map((f, i) => (
                <span key={f.friend.id}>
                  {i > 0 && ', '}
                  {worldPlayerName(f.friend)} ({f.team.name}) — {f.origin}
                </span>
              ))}
            </Renglon>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Con vos, el entrenador">
        <Bar label="Afinidad" value={coach} hint={TIPS.afinidadDt} />
        <p className="ficha-nota">
          {coach >= 70
            ? 'Te banca a muerte: es de los tuyos.'
            : coach >= 45
              ? 'Relación correcta: cumple, pero no le regales motivos de queja.'
              : 'La relación está tirante. Minutos y una charla a tiempo pueden salvarla.'}
        </p>
      </Seccion>

      <Seccion titulo="Afinidad con los compañeros">
        <div className="ficha-afinidad">
          {rows.map((r) => (
            <AffinityRow key={r.t.id} value={r.aff}>
              <Carita seed={r.t.id} personality={r.t.personality} />
              <PlayerLink id={r.t.id}>{r.t.name}</PlayerLink>
            </AffinityRow>
          ))}
        </div>
      </Seccion>
    </>
  );
}

function SocialTab({ state, p }: { state: GameState; p: Player }) {
  const socialCount = p.timeline.filter((e) => e.kind === 'social').length;
  const absences = p.timeline.filter((e) => e.kind === 'ausencia').length;
  const standing = groupStanding(p, state.players, state.seasonNumber, state.affinityBonus);
  return (
    <>
      <Seccion titulo="Cómo está en el grupo">
        <Bar label="Moral" value={p.motivation} hint={TIPS.motivacion} />
        <Bar label="Peso en el vestuario" value={standing} hint={TIPS.pesoVestuario} />
        <p className="ficha-nota">
          {standing >= 70
            ? 'Es de los pesados del vestuario: cuando habla, el grupo escucha.'
            : standing >= 45
              ? 'Uno más del grupo: querido, aunque no marca agenda.'
              : 'Todavía se está ganando su lugar en el vestuario.'}
        </p>
      </Seccion>
      <Seccion titulo="Afuera de la cancha">
        <div className="data-grid">
          <Renglon label="Vida social">
            {socialCount > 0
              ? `Organizó o encabezó ${socialCount} movida${socialCount > 1 ? 's' : ''} del grupo (asados, pizzas, festejos).`
              : 'Por ahora no organizó ninguna movida para el grupo.'}
          </Renglon>
          <Renglon label="Ausencias">
            {absences > 0
              ? `${absences} ausencia${absences > 1 ? 's' : ''} a fechas, con o sin aviso (la conducta cuenta sólo las sin avisar).`
              : 'Nunca faltó a una fecha.'}
          </Renglon>
        </div>
      </Seccion>
      <Seccion titulo="Conducta">
        <ConductaFicha p={p} />
      </Seccion>
    </>
  );
}

export function PlayerProfile({ state, playerId, onClose }: Props) {
  const [tab, setTab] = useState<ProfileTab>('general');
  useTeclasModal({ onClose });
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return null;

  // El estado se escribe sólo si es la excepción (regla 4 de la UI V1): un
  // jugador disponible y al día no lleva ninguna etiqueta.
  const status = statusChip(p);
  const fee = feeChip(p);
  const absentThisWeek = state.callUp.some((c) => c.playerId === p.id && c.status === 'ausente');
  const estados = [
    p.leftClub ? { cls: 'bad', label: 'Se fue del club' } : null,
    status,
    absentThisWeek ? { cls: 'warn', label: 'Faltó esta semana' } : null,
    fee,
  ].filter((e): e is { cls: string; label: string } => !!e);

  /* La ficha, como si hubiera nacido junto al Tablero: la persona primero,
     de pie y grande (escala L), sin marco, directo sobre el velo; el nombre en
     voz display y la línea que lo define. Los datos van en UNA planilla a la
     derecha, en renglones punteados, con las pestañas arriba.

     El busto es el retrato de arquetipo aprobado (el mismo de la fila del
     Tablero y de la lista); cuando llegue la ilustración de cuerpo entero
     (Puerta 3 de design/ART_PIPELINE.md) cambia el contenido de
     `FichaDePie`, no la composición. */
  const heroe = (
    <>
      <div className="ficha-heroe-texto">
        <div className="v1-eyebrow">
          {p.position} · <b>{p.age} años</b> · {p.height} cm
        </div>
        <h2 className="ficha-nombre">{p.name}</h2>
        <p className="ficha-linea">“{p.description}”</p>
        <div className="ficha-valor">
          <span className="ficha-cifra">
            <small>≈</small>
            {p.visibleRating}
          </span>
          <span className="ficha-cifra-k">
            <Tip text={TIPS.valoracion}>Valoración</Tip>
            <span>{roleLabel(p)}</span>
          </span>
        </div>
        {estados.length > 0 && (
          <div className="ficha-estados">
            {estados.map((e) => (
              <span key={e.label} className={`v1-est ${e.cls}`}>
                {e.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <FichaDePie seed={p.id} personality={p.personality} gris={!!p.leftClub} />
    </>
  );

  const pestanas = (
    <nav className="ficha-pestanas" role="tablist" aria-label="Secciones de la ficha">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          className={tab === t.id ? 'on' : ''}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );

  return (
    <Ficha onClose={onClose} label={p.name} heroe={heroe} pestanas={pestanas} clase="ficha-jugador">
      {tab === 'general' && <GeneralTab state={state} p={p} verHistoria={() => setTab('historia')} />}
      {tab === 'deportiva' && <DeportivaTab p={p} />}
      {tab === 'relaciones' && <RelacionesTab state={state} p={p} />}
      {tab === 'historia' && (
        <Seccion titulo="Su historia en el club">
          <Timeline events={p.timeline} emptyText="Su historia en el club está por escribirse." />
        </Seccion>
      )}
      {tab === 'social' && <SocialTab state={state} p={p} />}
    </Ficha>
  );
}
