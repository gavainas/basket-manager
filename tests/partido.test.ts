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

  it('en playoffs el partido de hoy no suma al récord de la fase regular', () => {
    const base = jugarPartidoEntero(hastaElPartido());
    const enPlayoffs = { ...base, week: base.seasonLength + 1 };
    const r = clubRecord(enPlayoffs);
    expect(r.wins + r.losses).toBe(0);
    expect(r.today!.finished).toBe(true);
  });
});
