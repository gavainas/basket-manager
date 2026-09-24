import { describe, expect, it } from 'vitest';
import { clubGamesPlayed, clubPosition, clubRecord } from '../src/game/match';
import { jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

/** Una partida nueva llevada hasta el salto inicial de la fecha 1. */
function hastaElPartido(seed = 11) {
  let s = resolverEventos(partidaNueva(seed));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  return paso(s, { type: 'START_MATCH' });
}

describe('el récord y la posición que ve el jugador (T1)', () => {
  it('sin fechas jugadas no hay posición ni récord', () => {
    const s = partidaNueva(11);
    expect(clubGamesPlayed(s)).toBe(0);
    expect(clubRecord(s)).toEqual({ wins: 0, losses: 0, today: null });
  });

  it('antes del primer cuarto el partido de hoy todavía no cuenta', () => {
    const s = hastaElPartido();
    expect(s.phase).toBe('match');
    expect(clubRecord(s).today).toBeNull();
  });

  it('con cuartos jugados el récord trae el marcador en curso, sin sumarlo todavía', () => {
    let s = hastaElPartido();
    s = s.live!.pendingIncident ? paso(s, { type: 'INCIDENT_CHOICE', index: 0 }) : s;
    s = paso(s, { type: 'PLAY_QUARTER' });
    const r = clubRecord(s);
    expect(r.wins + r.losses).toBe(0);
    expect(r.today).not.toBeNull();
    expect(r.today!.finished).toBe(false);
    expect(r.today!.scoreFor + r.today!.scoreAgainst).toBeGreaterThan(0);
  });

  it('con el partido terminado el récord ya cuenta el de hoy, y la tabla recién con el informe', () => {
    let s = jugarPartidoEntero(hastaElPartido());
    expect(s.phase).toBe('match');
    expect(s.live!.finished).toBe(true);

    const antes = clubRecord(s);
    expect(antes.today!.finished).toBe(true);
    expect(antes.wins + antes.losses).toBe(1);
    const gano = antes.today!.scoreFor > antes.today!.scoreAgainst;
    expect(antes.wins).toBe(gano ? 1 : 0);
    // La tabla todavía no se enteró: eso es exactamente lo que la barra tapaba.
    expect(clubGamesPlayed(s)).toBe(0);

    s = paso(s, { type: 'FINISH_MATCH' });
    expect(s.phase).toBe('matchResult');
    expect(s.live).toBeNull();
    const despues = clubRecord(s);
    expect(despues.today).toBeNull();
    expect(despues.wins).toBe(antes.wins);
    expect(despues.losses).toBe(antes.losses);
    expect(clubGamesPlayed(s)).toBe(1);
    expect(s.lastMatch!.won).toBe(gano);
    expect(s.lastMatch!.scoreFor).toBe(antes.today!.scoreFor);
    expect(s.lastMatch!.scoreAgainst).toBe(antes.today!.scoreAgainst);
    expect(clubPosition(s)).toBeGreaterThanOrEqual(1);
    expect(clubPosition(s)).toBeLessThanOrEqual(s.standings.length);
  });

  it('el informe guarda la planilla del rival: quién les anotó suma exactamente su marcador (sep 2026)', () => {
    let s = jugarPartidoEntero(hastaElPartido());
    s = paso(s, { type: 'FINISH_MATCH' });
    const m = s.lastMatch!;
    const rivalBox = m.rivalBox ?? [];
    expect(rivalBox.length).toBeGreaterThanOrEqual(5);

    const quinteto = rivalBox.filter((l) => l.starter);
    expect(quinteto.length).toBe(5);
    expect(rivalBox.reduce((t, l) => t + l.points, 0)).toBe(m.scoreAgainst);
    // Los titulares ordenados por puntos; del banco, el que no entró no suma.
    for (let i = 1; i < quinteto.length; i++) expect(quinteto[i - 1].points).toBeGreaterThanOrEqual(quinteto[i].points);
    for (const l of rivalBox.filter((x) => !x.played)) expect(l.points).toBe(0);
    // Son personas del mundo: cada renglón abre una ficha.
    for (const l of rivalBox) expect(s.world.players.some((p) => p.id === l.playerId)).toBe(true);
    // Y el relato del informe nombra al goleador de ellos, sea titular o no.
    const goleador = [...rivalBox].sort((a, b) => b.points - a.points)[0];
    expect(m.highlights.some((h) => h.includes(goleador.name) && h.includes(`${goleador.points} puntos`))).toBe(true);
  });

  it('el rival también rota: con banco, sus suplentes entran y suman (sep 2026, "sólo hacen puntos los titulares")', () => {
    let entraron = 0;
    let anotaron = 0;
    let conBanco = 0;
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      let s = jugarPartidoEntero(hastaElPartido(seed));
      s = paso(s, { type: 'FINISH_MATCH' });
      const banco = (s.lastMatch!.rivalBox ?? []).filter((l) => !l.starter);
      if (banco.length === 0) continue;
      conBanco++;
      // Entran hasta tres: el resto se queda mirando.
      const jugaron = banco.filter((l) => l.played);
      expect(jugaron.length).toBe(Math.min(3, banco.length));
      entraron += jugaron.length;
      anotaron += jugaron.filter((l) => l.points > 0).length;
    }
    expect(conBanco).toBeGreaterThan(0);
    expect(entraron).toBeGreaterThan(0);
    // Juegan unos seis tramos cada uno: casi siempre alguno la mete.
    expect(anotaron).toBeGreaterThan(entraron / 2);
  });

  it('en playoffs el partido de hoy no suma al récord de la fase regular', () => {
    const base = jugarPartidoEntero(hastaElPartido());
    const enPlayoffs = { ...base, week: base.seasonLength + 1 };
    const r = clubRecord(enPlayoffs);
    expect(r.wins + r.losses).toBe(0);
    expect(r.today!.finished).toBe(true);
  });
});

describe('el informe nombra a los que vinieron y no entraron (sep 2026)', () => {
  it('con más citados que jugadores con minutos, la línea de Minutos dice quiénes se quedaron en el banco', () => {
    let nombrados = 0;
    for (const seed of [7, 11, 21, 33]) {
      let s = jugarPartidoEntero(hastaElPartido(seed));
      const live = s.live!;
      const sinEntrar = s.players.filter((p) => live.squad.includes(p.id) && !(live.minutes[p.id] > 0) && p.status !== 'lesionado');
      s = paso(s, { type: 'FINISH_MATCH' });
      const linea = s.lastMatch!.effects.find((e) => e.startsWith('Minutos: '))!;
      expect(linea).toBeDefined();
      if (sinEntrar.length === 0) {
        expect(linea).not.toMatch(/no entr/);
        continue;
      }
      nombrados += 1;
      expect(linea).toMatch(sinEntrar.length > 1 ? / no entraron\.$/ : / no entró\.$/);
      for (const p of sinEntrar) expect(linea).toContain(p.name);
      // Ningún "A, B, C": el último va con "y".
      if (sinEntrar.length > 1) expect(linea).toMatch(/ y [^,]+ no entraron\.$/);
    }
    expect(nombrados).toBeGreaterThan(0);
  });
});
