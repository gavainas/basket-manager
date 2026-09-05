// La planilla del partido, con la forma de las planillas reales de la liga:
// escudo y colores arriba, el marcador grande, y las cinco columnas que la
// gente mira — Pts, Triples, Asists, Tapones, Rebotes — con su fila de totales.
//
// Los colores del club van SOLO en el escudo y en el cabezal de su bloque
// (design/SISTEMA_VISUAL.md: "el chrome es neutro; el color es dato"). Las
// columnas y los números se quedan en tinta: si dos clubes con camisetas
// parecidas se cruzan, la planilla tiene que seguir leyéndose.

import { Crest } from './Crest';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { WorldPlayerLink } from './WorldPlayerLink';
import type { BoxScoreLine, GameState, MatchResult, RivalBoxLine } from '../game/types';

interface FilaPlanilla {
  key: string;
  nombre: React.ReactNode;
  puntos: number;
  triples: number;
  asistencias: number;
  tapones: number;
  rebotes: number;
  destacado?: boolean;
}

function Totales({ filas }: { filas: FilaPlanilla[] }) {
  const suma = (f: (x: FilaPlanilla) => number) => filas.reduce((t, x) => t + f(x), 0);
  return (
    <tr className="planilla-total">
      <td>Total:</td>
      <td className="num">{suma((x) => x.puntos)}</td>
      <td className="num">{suma((x) => x.triples)}</td>
      <td className="num">{suma((x) => x.asistencias)}</td>
      <td className="num">{suma((x) => x.tapones)}</td>
      <td className="num">{suma((x) => x.rebotes)}</td>
    </tr>
  );
}

function Bloque({
  nombre,
  puntos,
  crestSeed,
  colors,
  founded,
  filas,
  gano,
}: {
  nombre: string;
  puntos: number;
  crestSeed: string;
  colors?: [string, string];
  founded?: number;
  filas: FilaPlanilla[];
  gano: boolean;
}) {
  return (
    <div className="planilla-equipo">
      <div className="planilla-cabezal" style={colors ? { borderBottomColor: colors[0] } : undefined}>
        <Crest seed={crestSeed} name={nombre} colors={colors} founded={founded} size={38} />
        <div className={`planilla-marcador num ${gano ? 'gano' : ''}`}>{puntos}</div>
        <div className="planilla-club">{nombre}</div>
      </div>
      <div className="table-wrap">
        <table className="planilla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th className="num">Pts</th>
              <th className="num">Triples</th>
              <th className="num">Asists</th>
              <th className="num">Tapones</th>
              <th className="num">Rebotes</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.key}>
                <td>
                  {f.nombre} {f.destacado ? <Icon name="estrella" size={11} /> : ''}
                </td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {f.puntos}
                </td>
                <td className="num">{f.triples}</td>
                <td className="num">{f.asistencias}</td>
                <td className="num">{f.tapones}</td>
                <td className="num">{f.rebotes}</td>
              </tr>
            ))}
            <Totales filas={filas} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BoxScoreSheet({ state, match }: { state: GameState; match: MatchResult }) {
  const box: BoxScoreLine[] = match.box ?? [];
  const rivalBox: RivalBoxLine[] = match.rivalBox ?? [];
  if (box.length === 0) return null;

  const userClub = state.world.clubs.find((c) => c.isUser);
  const rivalTeam = state.world.teams.find((t) => t.legacyRivalId === match.rivalId);
  const rivalClub = rivalTeam ? state.world.clubs.find((c) => c.id === rivalTeam.clubId) : undefined;

  const filasPropias: FilaPlanilla[] = box.map((l) => ({
    key: l.playerId,
    nombre: <PlayerLink id={l.playerId}>{l.name}</PlayerLink>,
    puntos: l.points,
    triples: l.triples,
    asistencias: l.assists,
    tapones: l.blocks,
    rebotes: l.rebounds,
    destacado: l.mvp,
  }));

  const filasRival: FilaPlanilla[] = rivalBox.map((l) => ({
    key: l.playerId,
    nombre: <WorldPlayerLink id={l.playerId}>{l.name}</WorldPlayerLink>,
    puntos: l.points,
    triples: l.triples,
    asistencias: l.assists,
    tapones: l.blocks,
    rebotes: l.rebounds,
  }));

  return (
    <div className="card planilla-hoja" style={{ marginTop: '1rem' }}>
      <h3>Planilla del partido</h3>
      <div className="planilla-dos">
        <Bloque
          nombre={state.club.name}
          puntos={match.scoreFor}
          crestSeed={userClub?.id ?? 'club'}
          colors={userClub?.colors}
          founded={userClub?.founded}
          filas={filasPropias}
          gano={match.won}
        />
        {filasRival.length > 0 ? (
          <Bloque
            nombre={match.rivalName}
            puntos={match.scoreAgainst}
            crestSeed={rivalClub?.id ?? match.rivalId}
            colors={rivalClub?.colors}
            founded={rivalClub?.founded}
            filas={filasRival}
            gano={!match.won}
          />
        ) : (
          // Los equipos de divisionales lejanas no tienen plantel generado: de
          // ellos sólo sabemos el marcador, y decirlo es mejor que un hueco.
          <div className="planilla-equipo">
            <div className="planilla-cabezal">
              <Crest
                seed={rivalClub?.id ?? match.rivalId}
                name={match.rivalName}
                colors={rivalClub?.colors}
                founded={rivalClub?.founded}
                size={38}
              />
              <div className={`planilla-marcador num ${!match.won ? 'gano' : ''}`}>{match.scoreAgainst}</div>
              <div className="planilla-club">{match.rivalName}</div>
            </div>
            <p className="muted" style={{ padding: '0.9rem', margin: 0, fontSize: '0.88rem' }}>
              De este equipo no llevamos planilla: nadie del club anotó quién metió qué.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
