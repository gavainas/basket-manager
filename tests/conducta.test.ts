import { describe, expect, it } from 'vitest';
import { attemptAbsenceAction } from '../src/game/absences';
import { CUANDO_QUIERE, conductLabel, conductScore, emptyRecord, marketReference, presenciaDe, recordCallUpConduct, recordOf } from '../src/game/conduct';
import { createPreseasonNewGame } from '../src/game/preseason';
import { Rng } from '../src/game/rng';
import type { CallUpEntry, ConductRecord, GameState, Player } from '../src/game/types';
import { watchItems } from '../src/ui/watch';
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

describe('la charla y el compañero también escriben en la ficha', () => {
  it('el detalle cuenta las veces que hubo que ir a buscarlo', () => {
    expect(conductLabel(conFicha({ convocado: 6, presente: 6, convencido: 2 })).detail).toContain('Iba a faltar 2 veces y lo diste vuelta vos.');
    expect(conductLabel(conFicha({ convocado: 6, presente: 6, buscado: 1 })).detail).toContain('Iba a faltar una vez y un compañero lo pasó a buscar.');
    expect(conductLabel(conFicha({ convocado: 6, presente: 6, convencido: 2, buscado: 1 })).detail).toContain(
      'Iba a faltar 3 veces: 2 lo convenciste vos, una lo fue a buscar un compañero.'
    );
  });

  it('el que viene porque lo fuiste a buscar no es "de los que están siempre"', () => {
    const buscado = conductLabel(conFicha({ convocado: 6, presente: 6, convencido: 1, buscado: 1 }));
    expect(buscado.label).toBe('Está, si lo vas a buscar');
    expect(buscado.cls).toBe('warn');
    // Una sola vez no dice nada; dos de seis, sí.
    expect(conductLabel(conFicha({ convocado: 6, presente: 6, convencido: 1 })).label).toBe('De los que están siempre');
    // Dos de doce es una de cada seis: sigue siendo de los que están.
    expect(conductLabel(conFicha({ convocado: 12, presente: 12, convencido: 2 })).label).toBe('De los que están siempre');
    // Con las primeras fechas, la misma señal en gris.
    const primeras = conductLabel(conFicha({ convocado: 4, presente: 4, buscado: 2 }));
    expect(primeras.label).toBe('Viene, si lo vas a buscar');
    expect(primeras.nivel).toBe('primeras');
  });

  it('resolver la ausencia con éxito anota en la ficha: charla o compañero, según cómo', () => {
    let s = partidaNueva(15);
    s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
    expect(s.phase).toBe('callUp');
    const p = s.players.find((x) => !x.leftClub && x.status !== 'lesionado')!;
    // Una ausencia floja armada a mano, para no depender del sorteo.
    const base: GameState = {
      ...s,
      callUp: [{ playerId: p.id, playerName: p.name, status: 'ausente', note: 'Se colgó.', reasonId: 'vago' }],
    };
    const resolver = (actionId: 'convencer' | 'companero') => {
      for (let seed = 1; seed < 200; seed++) {
        const next = attemptAbsenceAction(base, p.id, actionId, new Rng(seed));
        if (next.callUp[0].status === 'confirmado') return next;
      }
      throw new Error(`ninguna semilla dio vuelta la ausencia con ${actionId}`);
    };
    const charla = resolver('convencer');
    expect(recordOf(charla.players.find((x) => x.id === p.id)!).convencido).toBe(1);
    expect(recordOf(charla.players.find((x) => x.id === p.id)!).buscado).toBeUndefined();

    const companero = resolver('companero');
    const r = recordOf(companero.players.find((x) => x.id === p.id)!);
    // Si alguien del grupo fue a buscarlo, cuenta como buscado; si nadie se
    // ofreció y vino igual, fue la charla.
    const fueUnAmigo = /lo pasó a buscar/.test(companero.callUp[0].resolution ?? '');
    expect(fueUnAmigo ? r.buscado : r.convencido).toBe(1);

    // La convocatoria después lo cuenta como presente: vino.
    const conFecha = structuredClone(charla);
    recordCallUpConduct(conFecha);
    expect(recordOf(conFecha.players.find((x) => x.id === p.id)!).presente).toBe(1);
  });
});

describe('el inicio avisa cuando alguien pasa a "aparece cuando quiere"', () => {
  it('la fecha que lo vuelve faltador queda anotada, el aviso dura dos semanas y se apaga si se endereza', () => {
    const s0 = partidaNueva(15);
    const p = s0.players.find((x) => !x.leftClub && x.status !== 'lesionado')!;
    // Cinco fechas con dos faltas: todavía "primeras". La sexta, sin avisar, lo vuelve firme y malo.
    const s: GameState = structuredClone(s0);
    const pl = s.players.find((x) => x.id === p.id)!;
    pl.record = { ...emptyRecord(), convocado: 5, presente: 3, faltoSinAvisar: 2, ultimas: ['p', 'f', 'p', 'f', 'p'] };
    s.callUp = [{ playerId: p.id, playerName: p.name, status: 'ausente', note: 'Se colgó.', reasonId: 'vago' }];
    expect(watchItems(s).some((i) => i.text.includes(p.name) && i.text.includes('cuando quiere'))).toBe(false);

    recordCallUpConduct(s);
    const r = recordOf(pl);
    expect(conductLabel(pl).label).toBe(CUANDO_QUIERE);
    expect(r.cuandoQuiereDesde).toEqual({ season: s.seasonNumber, week: s.week });
    expect(pl.timeline.at(-1)!.text).toMatch(/aparece cuando quiere/);

    // Las dos semanas siguientes el inicio lo dice, en el tile de la plantilla.
    for (const week of [s.week, s.week + 1, s.week + 2]) {
      const aviso = watchItems({ ...s, week }).find((i) => i.text.includes(p.name) && i.text.includes('cuando quiere'));
      expect(aviso, `semana ${week}`).toBeDefined();
      expect(aviso!.tile).toBe('plantilla');
      expect(aviso!.text).toContain('faltó sin avisar 3 de 6 fechas');
    }
    expect(watchItems({ ...s, week: s.week + 3 }).some((i) => i.text.includes(p.name) && i.text.includes('cuando quiere'))).toBe(false);

    // Otra fecha, y el mismo veredicto: no se vuelve a anotar (el aviso no se estira).
    const s2: GameState = structuredClone(s);
    s2.week += 1;
    s2.callUp = [{ playerId: p.id, playerName: p.name, status: 'ausente', note: 'Se colgó.', reasonId: 'vago' }];
    recordCallUpConduct(s2);
    expect(recordOf(s2.players.find((x) => x.id === p.id)!).cuandoQuiereDesde).toEqual(r.cuandoQuiereDesde);

    // Se endereza (tres presentes seguidos): el veredicto se ablanda y el aviso se apaga.
    const s3: GameState = structuredClone(s);
    for (let i = 0; i < 3; i++) {
      s3.week += 1;
      s3.callUp = [{ playerId: p.id, playerName: p.name, status: 'confirmado', note: null }];
      recordCallUpConduct(s3);
    }
    expect(recordOf(s3.players.find((x) => x.id === p.id)!).cuandoQuiereDesde).toBeUndefined();
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
