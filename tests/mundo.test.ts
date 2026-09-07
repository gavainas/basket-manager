import { describe, expect, it } from 'vitest';
import { DIVISION_SEEDS, DIVISIONS, WORLD_DIVISION_IDS } from '../src/data/worldData';
import { closePreseason, inscriptionOffer, startPreseason, startSeasonFromPreseason } from '../src/game/preseason';
import type { GameState } from '../src/game/types';
import { jugarTemporada, partidaNueva } from './jugar';

/** Total de equipos del mundo (todas las divisionales) + el club del usuario. */
const TOTAL_TEAMS = WORLD_DIVISION_IDS.reduce((n, id) => n + DIVISION_SEEDS[id].length, 0) + 1;

/**
 * Invariantes del mundo, portadas del harness `npm run sim:ligas`: tienen que
 * valer en cualquier momento de cualquier partida.
 */
function auditarMundo(s: GameState, label: string): string[] {
  const problems: string[] = [];
  const check = (cond: boolean, msg: string) => {
    if (!cond) problems.push(`${label}: ${msg}`);
  };
  const divisions = s.worldDivisions ?? {};
  const total = Object.values(divisions).reduce((n, teams) => n + teams.length, 0) + s.rivals.length + 1;
  check(total === TOTAL_TEAMS, `el mundo tiene ${total} equipos y deberían ser ${TOTAL_TEAMS}`);
  check(!divisions[s.divisionId], `la divisional del club (${s.divisionId}) también figura en el mundo`);
  for (const id of WORLD_DIVISION_IDS) {
    if (id === s.divisionId) continue;
    check(Array.isArray(divisions[id]), `falta la divisional ${id} en el mundo`);
  }
  const names = new Map<string, string>();
  const addName = (name: string, where: string) => {
    if (names.has(name)) problems.push(`${label}: "${name}" aparece en ${names.get(name)} y en ${where}`);
    names.set(name, where);
  };
  addName(s.club.name, 'el club del usuario');
  for (const r of s.rivals) addName(r.name, s.divisionId);
  for (const [id, teams] of Object.entries(divisions)) {
    check(new Set(teams.map((t) => t.id)).size === teams.length, `${id} tiene ids repetidos`);
    for (const t of teams) addName(t.name, id);
  }
  check(s.seasonLength === s.rivals.length, `${s.rivals.length} rivales pero ${s.seasonLength} fechas`);
  check(s.schedule.length === s.seasonLength, `el fixture tiene ${s.schedule.length} fechas y la temporada ${s.seasonLength}`);
  const rivalIds = new Set(s.rivals.map((r) => r.id));
  for (const id of s.schedule) check(rivalIds.has(id), `el fixture juega contra ${id}, que no está en la liga`);
  check(s.standings.length === s.rivals.length + 1, `la tabla tiene ${s.standings.length} filas y la divisional ${s.rivals.length + 1} equipos`);
  const people = new Set<string>();
  for (const p of s.world.players ?? []) {
    if (people.has(p.id)) problems.push(`${label}: la persona ${p.id} está dos veces en el mundo`);
    people.add(p.id);
  }
  return problems;
}

/** La caja se rellena a propósito: acá se mide la pirámide, no la economía. */
const financiar = (s: GameState): GameState => ({ ...s, club: { ...s.club, money: Math.max(s.club.money, 3000) } });

describe('el mundo y la pirámide', () => {
  it('la partida nueva arranca con el mundo completo y consistente', () => {
    const s = partidaNueva(4000);
    expect(auditarMundo(s, 'inicio')).toEqual([]);
    expect(DIVISIONS.find((d) => d.id === s.divisionId)).toBeDefined();
    expect(s.world.clubs.length).toBeGreaterThan(0);
    expect(s.world.players.length).toBeGreaterThan(0);
  });

  it('tres temporadas seguidas quedándose en su liga: el mundo cierra en cada arranque', () => {
    let s = partidaNueva(4000);
    const problems: string[] = [];
    for (let n = 0; n < 3; n++) {
      s = jugarTemporada(financiar(s));
      expect(s.phase).toBe('seasonEnd');
      s = startSeasonFromPreseason(closePreseason(startPreseason(s)));
      problems.push(...auditarMundo(s, `arranque de la temporada ${s.seasonNumber}`));
    }
    expect(problems).toEqual([]);
    expect(s.seasonNumber).toBe(4);
  });

  it('cambiar de liga cada verano deja fechas, tabla y fixture consistentes', () => {
    let s = partidaNueva(9000);
    const problems: string[] = [];
    const visitadas = new Set<string>();
    for (let n = 0; n < 3; n++) {
      s = jugarTemporada(financiar(s));
      s = startPreseason(s);
      const options = inscriptionOffer(s).filter((o) => !o.locked);
      const chosen = options[(n + 1) % options.length].divisionId;
      s = { ...s, preseason: { ...s.preseason!, chosenDivisionId: chosen } };
      s = startSeasonFromPreseason(closePreseason(s));
      expect(s.divisionId).toBe(chosen);
      visitadas.add(chosen);
      problems.push(...auditarMundo(s, `temporada ${s.seasonNumber} en ${chosen}`));
    }
    expect(problems).toEqual([]);
    expect(visitadas.size).toBeGreaterThanOrEqual(2);
  });
});
