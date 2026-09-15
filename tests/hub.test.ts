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
});
