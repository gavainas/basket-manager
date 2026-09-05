import { useState } from 'react';
import type { GameState, Player } from '../game/types';
import { affinity, coachAffinity, FRIEND_THRESHOLD, groupStanding, RIVALRY_THRESHOLD } from '../game/relations';
import { friendshipsOf } from '../game/friendsAbroad';
import { worldPlayerName } from '../game/world';
import { fragilityHint, fragilityOf } from '../game/injuries';
import { playerNotes } from '../game/humanState';
import { ORIGIN_SITUATIONS } from '../data/market';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { HumanNoteRow } from './HumanNoteRow';
import { PlayerLink } from './PlayerLink';
import { Timeline } from './Timeline';
import { TIPS } from './Tip';
import { feeChip, feeChipAlways, roleLabel, statusChipAlways } from './helpers';
import { Icon } from './Icon';

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

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      <span className="data-value">{children}</span>
    </div>
  );
}

function seasonsAtClub(p: Player, currentSeason: number): string {
  const n = Math.max(1, currentSeason - p.joinedSeason + 1);
  return n === 1 ? 'Primera temporada' : `${n}ª temporada`;
}

function GeneralTab({ state, p }: { state: GameState; p: Player }) {
  const status = statusChipAlways(p);
  const fee = feeChipAlways(p);
  const absentThisWeek = state.callUp.some((c) => c.playerId === p.id && c.status === 'ausente');
  const promises = state.promises.filter((pr) => pr.playerId === p.id && pr.season === state.seasonNumber);
  const notes = playerNotes(state, p);
  return (
    <div>
      <p className="profile-quote">“{p.description}”</p>
      {notes.length > 0 && (
        <div className="human-notes">
          {notes.map((n, i) => (
            <HumanNoteRow key={i} note={n} />
          ))}
        </div>
      )}
      <div className="data-grid">
        <DataRow label="Edad">{p.age} años</DataRow>
        <DataRow label="Posición">{p.position}</DataRow>
        <DataRow label="Altura">{p.height} cm</DataRow>
        <DataRow label="Mano hábil">{p.hand === 'zurda' ? 'Zurda' : 'Derecha'}</DataRow>
        <DataRow label="Profesión">{p.profession}</DataRow>
        <DataRow label={p.previousTeam in ORIGIN_SITUATIONS ? 'Antes de llegar' : 'Club anterior'}>{p.previousTeam}</DataRow>
        <DataRow label="En el club">
          Desde la temporada {p.joinedSeason} · {seasonsAtClub(p, state.seasonNumber)}
        </DataRow>
        <DataRow label="Disponibilidad">
          <span className={`chip ${status.cls}`}>{status.label}</span>
          {absentThisWeek && <span className="chip warn"> Faltó esta semana</span>}
          {p.leftClub && <span className="chip bad"> Se fue del club</span>}
        </DataRow>
        <DataRow label="Cuota">
          <span className={`chip ${fee.cls}`}>{fee.label}</span>
        </DataRow>
        <DataRow label="Rol esperado">{roleLabel(p)}</DataRow>
        {promises.length > 0 && (
          <DataRow label="Promesas">
            {promises.map((pr, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {pr.label.replace(`${p.name}: `, '')}
                {pr.broken ? <span className="chip bad"> rota</span> : ''}
              </span>
            ))}
          </DataRow>
        )}
      </div>
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
    <div>
      <h4 className="profile-subtitle">Atributos</h4>
      <Bar label="Valoración" value={p.visibleRating} hint={TIPS.valoracion} />
      <Bar label="Físico" value={p.physical} hint={TIPS.fisico} />
      <Bar label="Motivación" value={p.motivation} hint={TIPS.motivacion} />
      <Bar label="Compromiso" value={p.commitment} hint={TIPS.compromiso} />
      <Bar label="Afinidad social" value={p.social} hint={TIPS.afinidadSocial} />

      <h4 className="profile-subtitle">Estadísticas con el club</h4>
      <div className="data-grid">
        <DataRow label="Partidos">{played}</DataRow>
        <DataRow label="Minutos">{minutes}&apos;</DataRow>
        <DataRow label="Puntos">{played ? `${points} (${perGame(points)} por partido)` : '—'}</DataRow>
        <DataRow label="Rebotes">{played ? `${rebounds} (${perGame(rebounds)} por partido)` : '—'}</DataRow>
        <DataRow label="Asistencias">{played ? `${assists} (${perGame(assists)} por partido)` : '—'}</DataRow>
        <DataRow label="Nota media">{avgRating}</DataRow>
        <DataRow label="Veces figura">{mvps > 0 ? `×${mvps}` : '—'}</DataRow>
        <DataRow label="Victorias">{winPct !== null ? `${winPct}%` : '—'}</DataRow>
      </div>

      <h4 className="profile-subtitle">Últimos partidos</h4>
      {last.length === 0 ? (
        <p className="muted">Todavía no jugó con el club.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rival</th>
                <th className="num">Min</th>
                <th className="num">Pts</th>
                <th className="num">Reb</th>
                <th className="num">Ast</th>
                <th className="num">Nota</th>
                <th>Res.</th>
              </tr>
            </thead>
            <tbody>
              {last.map((m, i) => (
                <tr key={i}>
                  <td>
                    T{m.season} · S{m.week}
                  </td>
                  <td>
                    {m.rivalName} {m.mvp ? <Icon name="estrella" size={11} /> : ''}
                  </td>
                  <td className="num">{m.minutes}&apos;</td>
                  <td className="num" style={{ fontWeight: 700 }}>{m.points ?? 0}</td>
                  <td className="num">{m.rebounds ?? 0}</td>
                  <td className="num">{m.assists ?? 0}</td>
                  <td className="num">{m.rating}/10</td>
                  <td style={{ color: m.won ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>{m.won ? 'G' : 'P'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 className="profile-subtitle">Evolución y tendencia</h4>
      <div className="data-grid">
        <DataRow label="Tendencia">
          {trend.icon} {trend.text}
        </DataRow>
        <DataRow label="Entrenamientos">
          {p.seasonTrainings} esta temporada
          {p.techniqueGain > 0 ? ' · la técnica viene mejorando' : ''}
        </DataRow>
        <DataRow label="Proyección">{projection}</DataRow>
        <DataRow label="Durabilidad">
          {fragilityHint(fragilityOf(p)).icon} {fragilityHint(fragilityOf(p)).text}
        </DataRow>
      </div>
    </div>
  );
}

function AffinityRow({ value, children }: { value: number; children: React.ReactNode }) {
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

  return (
    <div>
      <div className="data-grid">
        <DataRow label="Amigos">
          {friends.length > 0
            ? friends.map((r, i) => (
                <span key={r.t.id}>
                  {i > 0 && ', '}
                  <PlayerLink id={r.t.id}>{r.t.name}</PlayerLink>
                </span>
              ))
            : 'Se lleva bien con todos, íntimo de ninguno.'}
        </DataRow>
        <DataRow label="⚡ Roces">
          {rivals.length > 0
            ? rivals.map((r, i) => (
                <span key={r.t.id}>
                  {i > 0 && ', '}
                  <PlayerLink id={r.t.id}>{r.t.name}</PlayerLink>
                </span>
              ))
            : 'Sin conflictos a la vista.'}
        </DataRow>
        {abroad.length > 0 && (
          <DataRow label="En otros cuadros">
            {abroad.map((f, i) => (
              <span key={f.friend.id}>
                {i > 0 && ', '}
                {worldPlayerName(f.friend)} ({f.team.name}) — {f.origin}
              </span>
            ))}
          </DataRow>
        )}
      </div>

      <h4 className="profile-subtitle">Afinidad con los compañeros</h4>
      {rows.map((r) => (
        <AffinityRow key={r.t.id} value={r.aff}>
          <PlayerLink id={r.t.id}>{r.t.name}</PlayerLink>
        </AffinityRow>
      ))}

      <h4 className="profile-subtitle">Con el entrenador (vos)</h4>
      <Bar label="Afinidad" value={coach} hint={TIPS.afinidadDt} />
      <p className="muted">
        {coach >= 70
          ? 'Te banca a muerte: es de los tuyos.'
          : coach >= 45
            ? 'Relación correcta: cumple, pero no le regales motivos de queja.'
            : 'La relación está tirante. Minutos y una charla a tiempo pueden salvarla.'}
      </p>
    </div>
  );
}

function SocialTab({ state, p }: { state: GameState; p: Player }) {
  const socialCount = p.timeline.filter((e) => e.kind === 'social').length;
  const absences = p.timeline.filter((e) => e.kind === 'ausencia').length;
  const standing = groupStanding(p, state.players, state.seasonNumber, state.affinityBonus);
  return (
    <div>
      <div className="data-grid">
        <DataRow label="Vida social">
          {socialCount > 0
            ? `Organizó o encabezó ${socialCount} movida${socialCount > 1 ? 's' : ''} del grupo (asados, pizzas, festejos).`
            : 'Por ahora no organizó ninguna movida para el grupo.'}
        </DataRow>
        <DataRow label="Faltazos">
          {absences > 0 ? `${absences} falta${absences > 1 ? 's' : ''} al partido con excusa.` : 'Nunca faltó con excusa.'}
        </DataRow>
      </div>
      <h4 className="profile-subtitle">Cómo está en el grupo</h4>
      <Bar label="Moral" value={p.motivation} hint={TIPS.motivacion} />
      <Bar label="Compromiso" value={p.commitment} hint={TIPS.compromiso} />
      <Bar label="Peso en el vestuario" value={standing} hint={TIPS.pesoVestuario} />
      <p className="muted">
        {standing >= 70
          ? 'Es de los pesados del vestuario: cuando habla, el grupo escucha.'
          : standing >= 45
            ? 'Uno más del grupo: querido, aunque no marca agenda.'
            : 'Todavía se está ganando su lugar en el vestuario.'}
      </p>
    </div>
  );
}

export function PlayerProfile({ state, playerId, onClose }: Props) {
  const [tab, setTab] = useState<ProfileTab>('general');
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return null;
  const status = statusChipAlways(p);

  const fee = feeChip(p);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* La ficha en dos columnas: la persona a la izquierda, sus datos a la
          derecha. El retrato pasa de 58 px a media ficha — es la cara del tipo
          del que estás decidiendo si juega, no un ícono de fila.

          El hueco está pensado para la ilustración de cuerpo entero de la
          maqueta; hasta que exista y se apruebe (Puerta 3 de
          design/ART_PIPELINE.md) lo llena el retrato de arquetipo, que ya está
          aprobado y en uso. Cuando llegue, cambia el contenido de
          `.profile-retrato`, no la grilla. */}
      <div className="profile profile-ficha" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose} title="Cerrar">
          ✕
        </button>

        <aside className="profile-cara">
          <div className="profile-retrato">
            <Avatar
              personality={p.personality}
              seed={p.id}
              age={p.age}
              appearance={p.appearance}
              expressionOverride={
                p.status === 'molesto' || p.status === 'al_borde' ? 2 : p.status === 'lesionado' ? 3 : undefined
              }
              title={p.name}
              size={320}
            />
          </div>

          <div className="profile-cara-pie">
            <div className="profile-cara-pos">
              {p.position} · {p.age} años · {p.height} cm
            </div>
            <div className="profile-name">{p.name}</div>
            <div className="profile-cara-valor">
              <span className="v">
                <small>≈</small>
                {p.visibleRating}
              </span>
              <span className="k">Valoración</span>
            </div>
            <div className="profile-chips">
              <span className={`chip ${status.cls}`}>{status.label}</span>
              {fee && <span className={`chip ${fee.cls}`}>{fee.label}</span>}
              <span className="chip">{roleLabel(p)}</span>
            </div>
          </div>
        </aside>

        <div className="profile-datos">
          <div className="profile-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="profile-body">
            {tab === 'general' && <GeneralTab state={state} p={p} />}
            {tab === 'deportiva' && <DeportivaTab p={p} />}
            {tab === 'relaciones' && <RelacionesTab state={state} p={p} />}
            {tab === 'historia' && (
              <Timeline events={p.timeline} emptyText="Su historia en el club está por escribirse." />
            )}
            {tab === 'social' && <SocialTab state={state} p={p} />}
          </div>
        </div>
      </div>
    </div>
  );
}
