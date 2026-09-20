import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hub, hubReadiness } from '../src/ui/Hub';
import { partidaNueva, paso, resolverEventos } from './jugar';

describe('tablero A', () => {
  it('no confunde sanos con confirmados ni arrastra la convocatoria anterior', () => {
    let s = resolverEventos(partidaNueva(11));
    expect(hubReadiness(s).confirmed).toBeNull();
    s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
    expect(hubReadiness(s).confirmed).toBe(s.callUp.filter(p => p.status === 'confirmado').length);
    s.phase = 'matchResult';
    expect(hubReadiness(s).confirmed).toBeNull();
  });
  it('con la lista pasada, "de baja" cuenta a los que no vienen, no sólo a lesionados y suspendidos', () => {
    let s = resolverEventos(partidaNueva(11));
    const plantel = s.players.filter((p) => !p.leftClub).length;
    s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
    // Que haya al menos un ausente para que la cuenta signifique algo.
    const e = s.callUp.find((c) => c.status === 'confirmado')!;
    e.status = 'ausente';
    const r = hubReadiness(s);
    const confirmados = s.callUp.filter((c) => c.status === 'confirmado').length;
    expect(r.confirmed).toBe(confirmados);
    expect(r.unavailable).toBe(plantel - confirmados);
    expect(r.confirmed! + r.unavailable).toBe(plantel);
  });
  it('descuenta bajas y suspensiones de la disponibilidad', () => {
    const s = partidaNueva(11);
    const p = s.players.find(p => !p.leftClub && p.status !== 'lesionado')!;
    const before = hubReadiness(s).available;
    p.suspendedWeeks = 1;
    expect(hubReadiness(s).available).toBe(before - 1);
  });
  it('muestra rival y preparación al debut, y resuelve calendarios sin próximo cruce', () => {
    const s = resolverEventos(partidaNueva(11));
    const html = renderToStaticMarkup(createElement(Hub, { state: s }));
    expect(html).toContain('Preparar el partido');
    expect(html).toContain('disponibles · sin confirmar');
    expect(html).toContain('La historia empieza en la cancha');
    s.schedule = [];
    expect(renderToStaticMarkup(createElement(Hub, { state: s }))).toContain('Sin partido programado');
  });
  it('de la temporada 2 en adelante, sin partidos jugados, cuenta la temporada pasada en vez de "la historia empieza"', () => {
    const s = resolverEventos(partidaNueva(11));
    s.seasonNumber = 2;
    s.lastMatch = null;
    s.pastSeasons = [
      {
        season: 1,
        record: '8-1',
        position: 1,
        outcome: '¡Campeones de la Copa de Oro!',
        money: 1256,
        division: 'Liga Universitaria · Divisional B',
        moved: { kind: 'ascenso', to: 'Divisional A' },
      },
    ];
    const html = renderToStaticMarkup(createElement(Hub, { state: s }));
    expect(html).toContain('La temporada pasada');
    expect(html).toContain('Temporada 1 · Divisional B');
    expect(html).toContain('¡Campeones de la Copa de Oro!');
    expect(html).toContain('Subimos a la Divisional A.');
    expect(html).not.toContain('La historia empieza en la cancha');
    // Un save viejo sin categoría ni movimiento tampoco inventa nada.
    s.pastSeasons = [{ season: 1, record: '4-5', position: 6, outcome: 'Temporada para el olvido', money: 80 }];
    const viejo = renderToStaticMarkup(createElement(Hub, { state: s }));
    expect(viejo).toContain('Temporada 1</span>');
    expect(viejo).not.toContain('Subimos');
    expect(viejo).not.toContain('Bajamos');
  });
});
