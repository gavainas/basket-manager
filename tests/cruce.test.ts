import { describe, expect, it } from 'vitest';
import { lecturaDelCruce } from '../src/game/playoffs';
import type { GameState, PlayoffTie } from '../src/game/types';
import { partidaNueva } from './jugar';

/** Una partida con los cruces del club armados a mano. */
function conCruces(ties: Partial<PlayoffTie>[]): GameState {
  const s = partidaNueva(3);
  s.playoffs = {
    qualified: true,
    userCup: ties[0]?.cup ?? 'plata',
    champions: {},
    ties: ties.map((t, i) => ({ id: `t${i}`, cup: 'plata', round: 'semifinal', week: s.seasonLength + 1, homeId: 'club', awayId: 'r1', isUserMatch: true, ...t })),
  };
  return s;
}

describe('el informe dice qué se jugaba el partido de playoffs (nov 2026)', () => {
  it('ganar la final es "¡Campeones!" con la copa, no una victoria más', () => {
    const s = conCruces([{ cup: 'plata', round: 'final', week: 12 }]);
    expect(lecturaDelCruce(s, 12, true)).toEqual({ etapa: 'Final · Copa de Plata', veredicto: '¡Campeones!', linea: '¡Campeones de la Copa de Plata!' });
  });

  it('perder la final de Oro es subcampeón; la de Plata, la copa que se escapó', () => {
    expect(lecturaDelCruce(conCruces([{ cup: 'oro', round: 'final', week: 12 }]), 12, false)?.linea).toMatch(/^Subcampeones/);
    const plata = lecturaDelCruce(conCruces([{ cup: 'plata', round: 'final', week: 12 }]), 12, false)!;
    expect(plata.linea).not.toMatch(/Subcampeones/);
    expect(plata.veredicto).toBeUndefined();
  });

  it('la semifinal dice si vamos a la final o quedamos afuera', () => {
    const s = conCruces([{ cup: 'oro', round: 'semifinal', week: 11 }]);
    expect(lecturaDelCruce(s, 11, true)?.linea).toBe('A la final de la Copa de Oro.');
    expect(lecturaDelCruce(s, 11, false)?.linea).toBe('Afuera en la semifinal de la Copa de Oro.');
  });

  it('en fase regular, o en un cruce que no es nuestro, no dice nada', () => {
    const s = conCruces([{ cup: 'oro', round: 'semifinal', week: 11, isUserMatch: false }]);
    expect(lecturaDelCruce(s, 11, true)).toBeNull();
    expect(lecturaDelCruce(s, 3, true)).toBeNull();
  });
});

describe('el vestuario de la final habla de la copa (nov 2026)', () => {
  it('jugando temporadas enteras, cada final del club deja la copa en la primera línea del vestuario', async () => {
    const { jugarFecha } = await import('./jugar');
    let finales = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let s = partidaNueva(seed);
      let guard = 0;
      while (s.phase !== 'seasonEnd' && s.phase !== 'gameOver' && ++guard < 40) {
        s = jugarFecha(s);
        const m = s.lastMatch;
        if (m && m.week === s.seasonLength + 2 && !m.forfeit && m.lockerRoom.length > 0) {
          finales++;
          expect(m.lockerRoom[0]).toMatch(m.won ? /^Campeones de la Copa de (Oro|Plata)/ : /medallas de finalista/);
        }
      }
      if (finales >= 2) break;
    }
    expect(finales).toBeGreaterThan(0);
  });
});
