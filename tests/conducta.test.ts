import { describe, expect, it } from 'vitest';
import { conductLabel, conductScore, emptyRecord, marketReference, presenciaDe, recordOf } from '../src/game/conduct';
import { createPreseasonNewGame } from '../src/game/preseason';
import type { CallUpEntry, ConductRecord, GameState, Player } from '../src/game/types';
import { jugarFecha, partidaNueva, paso } from './jugar';

/** Un jugador de mentira con la ficha que se le pase. */
function conFicha(record: Partial<ConductRecord> | undefined): Player {
  return { record: record ? { ...emptyRecord(), ...record } : undefined } as unknown as Player;
}

const entrada = (extra: Partial<CallUpEntry>): CallUpEntry => ({ playerId: 'x', playerName: 'X', status: 'ausente', note: null, ...extra });

describe('la ficha de conducta (T2)', () => {
  it('sin ficha, el club no sabe nada: recién llega', () => {
    const c = conductLabel(conFicha(undefined));
    expect(c.nivel).toBe('nada');
    expect(c.label).toMatch(/Recién llega/);
    expect(recordOf(conFicha(undefined)).convocado).toBe(0);
    expect(conductScore(conFicha(undefined))).toBe(-1);
  });

  it('con dos fechas todavía no dice nada, con tres empieza a opinar', () => {
    expect(conductLabel(conFicha({ convocado: 2, presente: 2 })).nivel).toBe('nada');
    const tres = conductLabel(conFicha({ convocado: 3, presente: 3 }));
    expect(tres.nivel).toBe('primeras');
    expect(tres.label).toBe('Parece de los que están');
    expect(conductLabel(conFicha({ convocado: 4, presente: 2, faltoSinAvisar: 2 })).label).toBe('Ya faltó 2 veces');
  });

  it('con seis o más fechas el veredicto es firme', () => {
    expect(conductLabel(conFicha({ convocado: 8, presente: 8, ultimas: ['p', 'p', 'p'] })).label).toBe('De los que están siempre');
    expect(conductLabel(conFicha({ convocado: 8, presente: 5, avisoATiempo: 2, faltoSinAvisar: 1 })).label).toBe('Va cuando puede');
    const faltador = conductLabel(conFicha({ convocado: 9, presente: 4, faltoSinAvisar: 5, ultimas: ['f', 'p', 'f'] }));
    expect(faltador.label).toBe('Aparece cuando quiere');
    expect(faltador.cls).toBe('bad');
  });

  it('la primera impresión puede mentir: el que estaba siempre y ahora falla, y el que se endereza', () => {
    const afloja = conductLabel(conFicha({ convocado: 20, presente: 18, faltoSinAvisar: 2, ultimas: ['p', 'p', 'p', 'p', 'p', 'p', 'f', 'p', 'f'] }));
    expect(afloja.label).toBe('De los que están siempre');
    expect(afloja.cls).toBe('warn');
    expect(afloja.detail).toMatch(/Ojo/);
    const endereza = conductLabel(conFicha({ convocado: 9, presente: 5, faltoSinAvisar: 4, ultimas: ['f', 'f', 'p', 'p', 'p'] }));
    expect(endereza.label).toBe('Aparece cuando quiere');
    expect(endereza.detail).toMatch(/enderezándose/);
  });

  it('el detalle cuenta los hechos, no el número', () => {
    const c = conductLabel(conFicha({ convocado: 6, presente: 5, avisoATiempo: 1, cuotaEnFecha: 4, cuotaTarde: 2, asadosInvitado: 2, asadosFue: 1 }));
    expect(c.detail).toContain('Vino a 5 de 6 fechas, avisó 1.');
    expect(c.detail).toContain('Debió la cuota 2 de 6 semanas.');
    expect(c.detail).toContain('Asados: fue a 1 de 2.');
    expect(c.detail).not.toMatch(/\b(commitment|compromiso)\b/i);
  });

  it('cómo se cuenta cada respuesta a la convocatoria', () => {
    expect(presenciaDe(entrada({ status: 'confirmado' }))).toBe('p');
    expect(presenciaDe(entrada({ status: 'confirmado', lateArrival: true }))).toBe('p');
    expect(presenciaDe(entrada({ status: 'lesionado' }))).toBeNull();
    expect(presenciaDe(entrada({ reasonId: 'enfermo' }))).toBe('a');
    expect(presenciaDe(entrada({ reasonId: 'agenda' }))).toBe('a');
    expect(presenciaDe(entrada({ reasonId: 'momento' }))).toBe('a');
    expect(presenciaDe(entrada({ reasonId: 'vago' }))).toBe('f');
    expect(presenciaDe(entrada({ reasonId: 'mecanico' }))).toBe('f');
    expect(presenciaDe(entrada({ lastMinute: true }))).toBe('f');
    // El fundido al que mandaste a descansar vino: es tu decisión, no su falta.
    expect(presenciaDe(entrada({ exhausted: true, resolved: true }))).toBe('p');
  });
});

describe('la ficha se llena jugando', () => {
  let s = partidaNueva(15);
  for (let i = 0; i < 6; i++) s = jugarFecha(s);
  const activos = s.players.filter((p) => !p.leftClub);

  it('después de seis fechas todos los del plantel tienen historial, y las cuentas cierran', () => {
    for (const p of activos) {
      const r = recordOf(p);
      expect(r.convocado, p.name).toBeGreaterThan(0);
      expect(r.presente + r.avisoATiempo + r.faltoSinAvisar).toBe(r.convocado);
      expect(r.ultimas.length).toBe(Math.min(8, r.convocado));
      // Los becados no juegan a la cuota: su ficha no la cuenta.
      if (p.feeStatus === 'pagada' || p.feeStatus === 'pendiente') {
        expect(r.cuotaEnFecha + r.cuotaTarde, p.name).toBeGreaterThan(0);
      }
    }
  });

  it('el club ya opina de los que convocó seis veces, y de alguno no está seguro', () => {
    const firmes = activos.filter((p) => recordOf(p).convocado >= 6);
    expect(firmes.length).toBeGreaterThan(0);
    for (const p of firmes) expect(conductLabel(p).nivel).toBe('firme');
  });

  it('el reducer no toca la ficha cuando no hay partido: se escribe una vez por fecha', () => {
    const antes = recordOf(activos[0]).convocado;
    const s2 = paso(s, { type: 'TOGGLE_ACTION', id: 'training' });
    expect(recordOf(s2.players.find((p) => p.id === activos[0].id)!).convocado).toBe(antes);
  });
});

describe('las referencias al fichar son interesadas', () => {
  const s: GameState = paso(null as unknown as GameState, { type: 'LOAD', state: createPreseasonNewGame(21) });
  const market = s.preseason!.market;

  it('cada fichable tiene una referencia estable y sin número', () => {
    for (const mp of market) {
      const a = marketReference(mp);
      const b = marketReference(mp);
      expect(a).toEqual(b);
      expect(a.quote.length).toBeGreaterThan(10);
      expect(a.quote).not.toMatch(/\d{2}/);
    }
  });

  it('del desconocido nadie habla; de los demás habla alguien con interés', () => {
    const who = new Map(market.map((mp) => [mp.knowledge, marketReference(mp).who]));
    if (who.has('desconocido')) expect(who.get('desconocido')).toBe('Nadie que conozcas');
    if (who.has('muy_conocido')) expect(who.get('muy_conocido')).toBe('Tu gente del plantel');
    if (who.has('referencias')) expect(who.get('referencias')).toBe('Su ex DT');
  });

  it('el amigo miente por lealtad: a un colgado lo pinta mejor de lo que es', () => {
    const colgado = { ...market[0], id: 'mk_test', name: 'Prueba', knowledge: 'muy_conocido' as const, commitment: 45 };
    // El sesgo del amigo es de +8 a +20: nunca lo describe como faltador.
    expect(marketReference(colgado).quote).not.toMatch(/cuando quiere/);
    const desconocido = { ...colgado, knowledge: 'desconocido' as const };
    expect(marketReference(desconocido).quote).toMatch(/apuesta/);
  });
});
