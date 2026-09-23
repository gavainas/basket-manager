import { describe, expect, it } from 'vitest';
import { getEvent } from '../src/game/events';
import { Rng } from '../src/game/rng';
import type { GameState, MatchResult } from '../src/game/types';
import { jugarFecha, partidaNueva, paso } from './jugar';
import { watchItems } from '../src/ui/watch';

/** Un partido terminado, con lo justo para el historial. */
function partido(week: number, won: boolean): MatchResult {
  return {
    week,
    rivalId: 'r1',
    rivalName: 'Unión Vecinal',
    scoreFor: won ? 70 : 60,
    scoreAgainst: won ? 60 : 70,
    quarters: [],
    highlights: [],
    won,
    forfeit: false,
    mvpId: null,
    mvpName: null,
    summary: '',
    reasons: [],
    lockerRoom: [],
    effects: [],
    box: [],
  };
}

/** Una partida en curso con el historial que le pongas. */
function conHistorial(resultados: boolean[], week = resultados.length + 1): GameState {
  const s = partidaNueva(4);
  return { ...s, week, history: resultados.map((won, i) => partido(i + 1, won)) };
}

const comision = getEvent('comision_aprieta');

describe('la comisión pide explicaciones (sep 2026)', () => {
  it('aparece recién con tres derrotas seguidas, y no antes', () => {
    expect(comision.canFire(conHistorial([]))).toBe(false);
    expect(comision.canFire(conHistorial([false, false]))).toBe(false);
    expect(comision.canFire(conHistorial([false, false, false]))).toBe(true);
    // Una victoria en el medio corta la racha.
    expect(comision.canFire(conHistorial([false, true, false, false]))).toBe(false);
    // Y la última ganada también.
    expect(comision.canFire(conHistorial([false, false, false, true]))).toBe(false);
  });

  it('en playoffs no aparece: ahí se habla de otra cosa', () => {
    const s = conHistorial([false, false, false]);
    expect(comision.canFire({ ...s, week: s.seasonLength + 1 })).toBe(false);
  });

  it('el texto les pone los marcadores de las tres fechas en la cara', () => {
    const s = conHistorial([true, false, false, false]);
    const texto = comision.text(s, { defId: 'comision_aprieta' });
    expect(texto).toContain('60-70');
    expect(texto).not.toContain('70-60'); // la ganada no cuenta
  });

  it('dar la cara ordena el club; bancar al plantel lo levanta y cuesta crédito', () => {
    const base = conHistorial([false, false, false]);
    const rng = new Rng(1);

    const plan = structuredClone(base);
    comision.resolve(plan, { defId: 'comision_aprieta' }, 0, rng);
    expect(plan.club.organization).toBeGreaterThan(base.club.organization);

    const banca = structuredClone(base);
    const moralAntes = banca.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    comision.resolve(banca, { defId: 'comision_aprieta' }, 1, rng);
    const moralDespues = banca.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    expect(moralDespues.some((m, i) => m > moralAntes[i])).toBe(true);
    expect(banca.club.socialClimate).toBeGreaterThan(base.club.socialClimate);
    expect(banca.club.sportPrestige).toBeLessThan(base.club.sportPrestige);
  });

  it('cargarle el muerto al plantel se paga en el vestuario, y queda escrito', () => {
    const s = conHistorial([false, false, false]);
    const antes = s.club.socialClimate;
    const leales = s.players.filter((p) => !p.leftClub && (p.personality === 'leal' || p.personality === 'cumplidor'));
    const moralAntes = leales.map((p) => p.motivation);

    comision.resolve(s, { defId: 'comision_aprieta' }, 2, new Rng(1));

    expect(s.club.socialClimate).toBeLessThan(antes);
    const moralDespues = s.players
      .filter((p) => !p.leftClub && (p.personality === 'leal' || p.personality === 'cumplidor'))
      .map((p) => p.motivation);
    expect(moralDespues.every((m, i) => m <= moralAntes[i])).toBe(true);
    // Se entera el barrio (noticia) y queda en la historia del club.
    expect(s.news[0].text).toContain('no está a la altura');
    expect(s.clubTimeline.some((e) => e.text.includes('le cargó la racha al plantel'))).toBe(true);
  });
});

const racha = getEvent('racha_barrio');
const factura = getEvent('racha_factura');
const ev = (defId: string) => ({ defId });

describe('el barrio se enteró de la racha (sep 2026, el segundo evento que mira el historial)', () => {
  it('aparece con tres victorias seguidas, una sola vez por racha', () => {
    expect(racha.canFire(conHistorial([]))).toBe(false);
    expect(racha.canFire(conHistorial([true, true]))).toBe(false);
    expect(racha.canFire(conHistorial([true, true, true]))).toBe(true);
    expect(racha.canFire(conHistorial([false, true, true, true]))).toBe(true);
    // La cuarta seguida no lo vuelve a disparar: la racha ya se contó.
    expect(racha.canFire(conHistorial([true, true, true, true]))).toBe(false);
    // Una derrota en el medio la corta.
    expect(racha.canFire(conHistorial([true, false, true, true]))).toBe(false);
  });

  it('en playoffs no aparece, ni con una promesa todavía abierta', () => {
    const s = conHistorial([true, true, true]);
    expect(racha.canFire({ ...s, week: s.seasonLength + 1 })).toBe(false);
    expect(racha.canFire({ ...s, scheduledEvents: [{ defId: 'racha_factura', season: s.seasonNumber, week: s.week + 2 }] })).toBe(false);
  });

  it('el texto trae los tres marcadores', () => {
    const s = conHistorial([false, true, true, true]);
    const texto = racha.text(s, ev('racha_barrio'));
    expect(texto).toContain('70-60, 70-60, 70-60');
    expect(texto).not.toContain('60-70');
  });

  it('abrir la cancha deja plata en el libro y prestigio social, y desordena; bajar la espuma ordena', () => {
    const base = conHistorial([true, true, true]);
    const rng = new Rng(1);

    const cancha = structuredClone(base);
    racha.resolve(cancha, ev('racha_barrio'), 0, rng);
    expect(cancha.club.money).toBeGreaterThan(base.club.money);
    expect(cancha.ledger[cancha.ledger.length - 1].amount).toBe(cancha.club.money - base.club.money);
    expect(cancha.club.socialPrestige).toBeGreaterThan(base.club.socialPrestige);
    expect(cancha.club.organization).toBeLessThan(base.club.organization);
    expect(cancha.scheduledEvents ?? []).toHaveLength(0);

    const espuma = structuredClone(base);
    racha.resolve(espuma, ev('racha_barrio'), 1, rng);
    expect(espuma.club.organization).toBeGreaterThan(base.club.organization);
    expect(espuma.club.money).toBe(base.club.money);
  });

  it('agrandarse levanta al plantel y deja la promesa agendada para tres semanas después', () => {
    const s = conHistorial([true, true, true]);
    const moralAntes = s.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    racha.resolve(s, ev('racha_barrio'), 2, new Rng(1));
    const moralDespues = s.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    expect(moralDespues.some((m, i) => m > moralAntes[i])).toBe(true);
    expect(s.scheduledEvents).toEqual([{ defId: 'racha_factura', season: s.seasonNumber, week: s.week + 3, fromWeek: s.week }]);
    expect(s.news[0].text).toContain('pelea arriba');
  });

  it('cerca del cierre, la factura cae a más tardar en las semifinales', () => {
    // Racha en la semana 8 de 9: el barrio cobra en la semana 10 (semis), con dos fechas jugadas.
    const s = conHistorial([false, false, false, false, false, true, true, true], 8);
    expect(s.seasonLength).toBe(9);
    racha.resolve(s, ev('racha_barrio'), 2, new Rng(1));
    expect(s.scheduledEvents).toEqual([{ defId: 'racha_factura', season: s.seasonNumber, week: 10, fromWeek: 8 }]);
  });

  it('el barrio cobra la promesa mirando las fechas que siguieron a la nota, no las de la racha', () => {
    const cobra = { defId: 'racha_factura', fromWeek: 4 };
    // Cumplida: dos de tres desde la nota (semanas 4, 5 y 6). Agradecer cierra la cadena con prestigio social.
    const bien = conHistorial([true, true, true, true, false, true], 7);
    expect(factura.options(bien, cobra)[0].label).toContain('agradecer');
    expect(factura.text(bien, cobra)).toContain('2 de 3');
    const antes = bien.club.socialPrestige;
    factura.resolve(bien, cobra, 0, new Rng(1));
    expect(bien.club.socialPrestige).toBeGreaterThan(antes);
    expect(bien.scheduledEvents ?? []).toHaveLength(0);

    // Cumplida y redoblada: la cadena sigue tres semanas más, contando desde hoy.
    const redobla = conHistorial([true, true, true, true, false, true], 7);
    factura.resolve(redobla, cobra, 1, new Rng(1));
    expect(redobla.scheduledEvents).toEqual([{ defId: 'racha_factura', season: redobla.seasonNumber, week: 10, fromWeek: 7 }]);

    // Incumplida: una de tres desde la nota (la racha de antes no cuenta). Hacerse el distraído se paga en imagen y en el vestuario.
    const mal = conHistorial([true, true, true, false, false, true], 7);
    expect(factura.options(mal, cobra)[0].label).toContain('Dar la cara');
    expect(factura.text(mal, cobra)).toContain('1 de 3');
    const social = mal.club.socialPrestige;
    const clima = mal.club.socialClimate;
    factura.resolve(mal, cobra, 1, new Rng(1));
    expect(mal.club.socialPrestige).toBeLessThan(social);
    expect(mal.club.socialClimate).toBeLessThan(clima);
    expect(mal.news[0].tone).toBe('bad');

    // Dar la cara cuesta menos imagen que esconderse.
    const cara = conHistorial([true, true, true, false, false, true], 7);
    factura.resolve(cara, cobra, 0, new Rng(1));
    expect(cara.club.socialPrestige).toBeGreaterThan(mal.club.socialPrestige);

    // En las semifinales ya no hay dónde cobrar otra: no se ofrece redoblar.
    const semis = conHistorial([true, true, true, true, true, true, true, true, true], 10);
    expect(factura.options(semis, { defId: 'racha_factura', fromWeek: 8 }).map((o) => o.label)).toEqual(['Pasar por el almacén a agradecer']);
  });

  it('el radar recuerda la promesa abierta: cuándo se cobra y cómo viene la cuenta', () => {
    const s = conHistorial([true, true, true, false], 5);
    const sin = watchItems(s).filter((i) => i.text.includes('peleamos arriba'));
    expect(sin).toHaveLength(0);
    const con = { ...s, scheduledEvents: [{ defId: 'racha_factura', season: s.seasonNumber, week: 7, fromWeek: 4 }] };
    const items = watchItems(con).filter((i) => i.text.includes('peleamos arriba'));
    expect(items).toHaveLength(1);
    expect(items[0].text).toContain('en 2 fechas');
    expect(items[0].text).toContain('vas 0-1');
    expect(items[0].cls).toBe('warn');
    expect(items[0].tile).toBe('noticias');
    // Ganando desde la nota, el aviso es bueno y dice "esta semana" cuando llega el día.
    const bien = { ...conHistorial([false, true, true, true], 7), scheduledEvents: [{ defId: 'racha_factura', season: s.seasonNumber, week: 7, fromWeek: 2 }] };
    const item = watchItems(bien).find((i) => i.text.includes('peleamos arriba'))!;
    expect(item.cls).toBe('good');
    expect(item.text).toContain('esta semana');
    expect(item.text).toContain('vas 3-0');
  });
});

describe('la cena del club (sep 2026): tres eslabones, una decisión distinta en cada uno', () => {
  const propuesta = getEvent('cena_propuesta');
  const tarjetas = getEvent('cena_tarjetas');
  const noche = getEvent('cena_noche');
  /** Una partida en la semana 3 con la caja corta: el tesorero trae la idea. */
  const conCajaCorta = (money = 150): GameState => {
    const s = partidaNueva(4);
    return { ...s, week: 3, club: { ...s.club, money }, pendingEvent: null, scheduledEvents: [] };
  };

  it('el tesorero la propone con la caja corta, a tiempo para que entren los tres eslabones, y una sola vez por temporada', () => {
    const s = conCajaCorta();
    expect(propuesta.canFire(s)).toBe(true);
    expect(propuesta.canFire({ ...s, club: { ...s.club, money: 900 } })).toBe(false);
    expect(propuesta.canFire({ ...s, week: 1 })).toBe(false);
    // Con menos de cuatro semanas por delante no llega la noche.
    expect(propuesta.canFire({ ...s, week: s.seasonLength - 3 })).toBe(false);
    expect(propuesta.canFire({ ...s, week: s.seasonLength - 4 })).toBe(true);
    // Con una cena en marcha, o una ya hecha (o dejada pasar) esta temporada, no vuelve.
    expect(propuesta.canFire({ ...s, scheduledEvents: [{ defId: 'cena_tarjetas', season: s.seasonNumber, week: 5 }] })).toBe(false);
    const hecha = { ...s, clubTimeline: [...s.clubTimeline, { season: s.seasonNumber, week: 2, kind: 'hito' as const, text: 'La cena show del club: 40 personas y $200 para la caja.' }] };
    expect(propuesta.canFire(hecha)).toBe(false);
    const otraTemporada = { ...hecha, seasonNumber: s.seasonNumber + 1 };
    expect(propuesta.canFire(otraTemporada)).toBe(true);
    // El organizador natural es el más social del plantel.
    const t = propuesta.pickTargets!(s, new Rng(1))!;
    const org = s.players.find((p) => p.id === t.playerId)!;
    expect(org.personality === 'social' || s.players.every((p) => p.leftClub || p.social <= org.social)).toBe(true);
  });

  it('eslabón 1: llevarla vos o dársela al más social agenda las tarjetas en dos semanas con quién la lleva; dejarla pasar no gasta y queda en la historia', () => {
    const base = conCajaCorta();
    const org = propuesta.pickTargets!(base, new Rng(1))!.playerId!;
    const activo = { defId: 'cena_propuesta', playerId: org };

    const vos: GameState = structuredClone(base);
    propuesta.resolve(vos, activo, 0, new Rng(1));
    expect(vos.club.money).toBe(150 - 50);
    expect(vos.scheduledEvents).toEqual([{ defId: 'cena_tarjetas', season: vos.seasonNumber, week: 5, fromWeek: 3, payload: { manager: 1 } }]);
    expect(vos.club.organization).toBe(base.club.organization + 3);

    const social: GameState = structuredClone(base);
    propuesta.resolve(social, activo, 1, new Rng(1));
    expect(social.club.money).toBe(150 - 50);
    expect(social.scheduledEvents).toEqual([{ defId: 'cena_tarjetas', season: social.seasonNumber, week: 5, playerId: org, fromWeek: 3, payload: { manager: 0 } }]);
    expect(social.players.find((p) => p.id === org)!.timeline.at(-1)!.text).toMatch(/cena show/);

    const no: GameState = structuredClone(base);
    propuesta.resolve(no, activo, 2, new Rng(1));
    expect(no.club.money).toBe(150);
    expect(no.scheduledEvents).toEqual([]);
    expect(no.clubTimeline.at(-1)!.text).toMatch(/cena show/);
    expect(propuesta.canFire(no)).toBe(false);
  });

  it('eslabón 2: cada salida deja otras tarjetas y otro precio en el payload, y agenda la noche en dos semanas', () => {
    const base = { ...conCajaCorta(), week: 5 };
    const org = propuesta.pickTargets!(base, new Rng(1))!.playerId!;
    const texto = tarjetas.text(base, { defId: 'cena_tarjetas', playerId: org, fromWeek: 3, payload: { manager: 0 } });
    expect(texto).toMatch(/van \d+ tarjetas vendidas/);
    expect(texto).toContain(base.players.find((p) => p.id === org)!.name);
    expect(tarjetas.text(base, { defId: 'cena_tarjetas', fromWeek: 3, payload: { manager: 1 } })).toMatch(/Las vendiste vos/);

    const resultados = [0, 1, 2].map((opt) => {
      const s: GameState = structuredClone(base);
      tarjetas.resolve(s, { defId: 'cena_tarjetas', playerId: org, fromWeek: 3, payload: { manager: 0 } }, opt, new Rng(1));
      expect(s.scheduledEvents).toHaveLength(1);
      const e = s.scheduledEvents![0];
      expect(e.defId).toBe('cena_noche');
      expect(e.week).toBe(7);
      expect(e.playerId).toBe(org);
      expect(e.payload!.manager).toBe(0);
      return { s, vendidas: e.payload!.vendidas, precio: e.payload!.precio };
    });
    // Bajar la tarjeta: más vendidas y menos precio. El club de enfrente: más vendidas al mismo precio, y el ambiente lo paga.
    expect(resultados[0].vendidas).toBeGreaterThan(resultados[2].vendidas);
    expect(resultados[0].precio).toBeLessThan(resultados[2].precio);
    expect(resultados[1].vendidas).toBeGreaterThan(resultados[2].vendidas);
    expect(resultados[1].precio).toBe(resultados[2].precio);
    expect(resultados[1].s.club.socialClimate).toBe(base.club.socialClimate - 3);
    expect(resultados[2].s.club.organization).toBe(base.club.organization + 2);
  });

  it('eslabón 3: la noche deja plata en la caja según lo decidido antes, y cada cierre cuesta distinto', () => {
    const base = { ...conCajaCorta(), week: 7, club: { ...conCajaCorta().club, organization: 60, socialClimate: 70 } };
    const org = propuesta.pickTargets!(base, new Rng(1))!.playerId!;
    // Setenta tarjetas (la venta al club de enfrente con buen cartel): el salón se llena.
    const activo = { defId: 'cena_noche', playerId: org, fromWeek: 3, payload: { manager: 0, vendidas: 70, precio: 8 } };
    expect(noche.text(base, activo)).toMatch(/de las 70 tarjetas sentadas a \$8/);
    expect(noche.text(base, activo)).toMatch(/El salón, lleno/);
    const cierres = [0, 1, 2].map((opt) => {
      const s: GameState = structuredClone(base);
      const r = noche.resolve(s, activo, opt, new Rng(3));
      const entrada = s.ledger.at(-1)!;
      expect(entrada.concept).toMatch(/Cena show del club \(\d+ personas\)/);
      expect(s.club.money).toBe(base.club.money + entrada.amount);
      expect(s.clubTimeline.at(-1)!.text).toMatch(/cena show del club/i);
      expect(s.scheduledEvents).toEqual([]);
      return { s, neto: entrada.amount, r };
    });
    // Con 70 tarjetas a $8 y el club ordenado, la noche deja plata de verdad.
    expect(cierres[0].neto).toBeGreaterThan(300);
    // La última ronda cuesta $30 y deja el ambiente y un momento memorable; la gorra junta más y el grupo lo nota.
    expect(cierres[1].neto).toBe(cierres[0].neto - 30);
    expect(cierres[1].s.club.socialClimate).toBe(base.club.socialClimate + 6);
    expect(cierres[1].s.memorableMoments.some((m) => /cena show/.test(m))).toBe(true);
    expect(cierres[2].neto).toBeGreaterThan(cierres[0].neto);
    expect(cierres[2].s.club.socialClimate).toBe(base.club.socialClimate - 3);
    // Sin papelón (el ambiente está bien), el organizador se lleva su parte.
    expect(cierres[0].s.players.find((p) => p.id === org)!.motivation).toBe(base.players.find((p) => p.id === org)!.motivation + 4);
    // Y después de la noche, el tesorero no la vuelve a proponer esta temporada.
    expect(propuesta.canFire({ ...cierres[0].s, week: 4, club: { ...cierres[0].s.club, money: 100 } })).toBe(false);
  });

  it('eslabón 3: con el grupo espeso, la noche del organizador puede terminar en papelón (en alguna semilla), y con buen clima nunca', () => {
    const base = { ...conCajaCorta(), week: 7 };
    const org = propuesta.pickTargets!(base, new Rng(1))!.playerId!;
    const activo = { defId: 'cena_noche', playerId: org, fromWeek: 3, payload: { manager: 0, vendidas: 50, precio: 8 } };
    let papelones = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s: GameState = structuredClone({ ...base, club: { ...base.club, socialClimate: 40 } });
      const r = noche.resolve(s, activo, 0, new Rng(seed));
      if (/se apagó la parrilla/.test(r)) {
        papelones += 1;
        expect(s.players.find((p) => p.id === org)!.grievance?.cause).toBe('grupo');
        expect(s.news[0].tone).toBe('bad');
      }
    }
    expect(papelones).toBeGreaterThan(0);
    expect(papelones).toBeLessThan(30);
    for (let seed = 1; seed <= 10; seed++) {
      const s: GameState = structuredClone({ ...base, club: { ...base.club, socialClimate: 70 } });
      expect(noche.resolve(s, activo, 0, new Rng(seed))).not.toMatch(/se apagó la parrilla/);
    }
  });

  it('por el reducer: la cadena entera viaja con su payload de una semana a la otra', () => {
    let s = conCajaCorta();
    const org = propuesta.pickTargets!(s, new Rng(1))!.playerId!;
    s = { ...s, pendingEvent: { defId: 'cena_propuesta', playerId: org } };
    s = paso(s, { type: 'RESOLVE_EVENT', optionIndex: 1 });
    s = paso(s, { type: 'DISMISS_EVENT_OUTCOME' });
    expect(s.scheduledEvents![0].defId).toBe('cena_tarjetas');
    // Dos fechas después llega el segundo eslabón, con el organizador y lo decidido.
    s = jugarFecha(s);
    s = jugarFecha({ ...s, pendingEvent: null });
    expect(s.pendingEvent?.defId).toBe('cena_tarjetas');
    expect(s.pendingEvent?.playerId).toBe(org);
    expect(s.pendingEvent?.payload).toEqual({ manager: 0 });
    s = paso(s, { type: 'RESOLVE_EVENT', optionIndex: 0 });
    s = paso(s, { type: 'DISMISS_EVENT_OUTCOME' });
    expect(s.scheduledEvents![0].defId).toBe('cena_noche');
    expect(s.scheduledEvents![0].payload!.vendidas).toBeGreaterThan(0);
    s = jugarFecha(s);
    s = jugarFecha({ ...s, pendingEvent: null });
    expect(s.pendingEvent?.defId).toBe('cena_noche');
    const caja = s.club.money;
    s = paso(s, { type: 'RESOLVE_EVENT', optionIndex: 0 });
    expect(s.club.money).toBeGreaterThan(caja);
    expect(s.clubTimeline.at(-1)!.text).toMatch(/cena show del club/i);
  });
});

describe('el radar recuerda la cena del club en marcha (sep 2026)', () => {
  it('dice cuál es el próximo eslabón, cuándo cae, quién la lleva y lo vendido', () => {
    const s = partidaNueva(4);
    const org = s.players.find((p) => !p.leftClub)!;
    expect(watchItems({ ...s, week: 4 }).some((i) => /cena show/.test(i.text))).toBe(false);
    const tarjetas = { ...s, week: 4, scheduledEvents: [{ defId: 'cena_tarjetas', season: s.seasonNumber, week: 5, playerId: org.id, fromWeek: 3, payload: { manager: 0 } }] };
    const a = watchItems(tarjetas).find((i) => /cena show/.test(i.text))!;
    expect(a.text).toContain(`la lleva ${org.name}`);
    expect(a.text).toContain('la fecha que viene');
    expect(a.tile).toBe('noticias');
    const noche = { ...s, week: 5, scheduledEvents: [{ defId: 'cena_noche', season: s.seasonNumber, week: 7, fromWeek: 3, payload: { manager: 1, vendidas: 41, precio: 8 } }] };
    const b = watchItems(noche).find((i) => /cena show/.test(i.text))!;
    expect(b.text).toContain('en 2 fechas');
    expect(b.text).toContain('la llevás vos');
    expect(b.text).toContain('41 tarjetas vendidas');
    // De otra temporada, no cuenta.
    expect(watchItems({ ...noche, seasonNumber: s.seasonNumber + 1 }).some((i) => /cena show/.test(i.text))).toBe(false);
  });
});
