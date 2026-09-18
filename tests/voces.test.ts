import { describe, expect, it } from 'vitest';
import { buildMoods, type EmotionContext } from '../src/game/emotions';
import type { Personality, Player } from '../src/game/types';
import { partidaNueva } from './jugar';

const ARQUETIPOS: Personality[] = [
  'competitivo',
  'social',
  'protagonista',
  'leal',
  'mercenario',
  'cumplidor',
  'veterano',
  'talentoso_informal',
];

/** El mismo jugador, con los ocho arquetipos: sólo cambia cómo habla. */
function ochoVoces(ctx: EmotionContext): { personality: Personality; label: string; text: string }[] {
  const base = partidaNueva(3).players[0];
  return ARQUETIPOS.map((personality) => {
    const p: Player = { ...base, personality };
    // Una llamada por arquetipo: `used` no se comparte, así que si dos dicen lo
    // mismo es porque comparten la frase, no porque el anti-repetición los movió.
    const [mood] = buildMoods([p], () => ctx, 0);
    return { personality, label: mood.label, text: mood.text };
  });
}

describe('las voces por arquetipo (sep 2026)', () => {
  it('la figura del partido habla distinto según quién sea', () => {
    // MVP, ganando y con buena nota: la emoción es "orgulloso".
    const voces = ochoVoces({
      won: true,
      margin: 10,
      minutes: 30,
      rating: 8,
      mvp: true,
      inSquad: true,
      promisedMinutes: false,
      bigGame: false,
    });
    expect(voces.every((v) => v.label === 'Orgulloso')).toBe(true);
    expect(new Set(voces.map((v) => v.text)).size).toBe(ARQUETIPOS.length);
    // Y cada una suena a su arquetipo, no a la frase de molde.
    // Cada frase sale del pool de su arquetipo (cuál de las dos la elige la semilla).
    const de = (k: Personality) => voces.find((v) => v.personality === k)!.text;
    expect(de('protagonista')).toMatch(/Cuando la pido|cuando el partido pesa/);
    expect(de('cumplidor')).toMatch(/nada más|con eso me alcanza/);
    expect(de('talentoso_informal')).toMatch(/planilla|no sé/);
  });

  it('el que se comió la noche también: la culpa se administra distinto', () => {
    // Perdió, jugó y le fue mal: la emoción es "decepcionado".
    const voces = ochoVoces({
      won: false,
      margin: 12,
      minutes: 28,
      rating: 4,
      mvp: false,
      inSquad: true,
      promisedMinutes: false,
      bigGame: false,
    });
    expect(voces.every((v) => v.label === 'Decepcionado consigo')).toBe(true);
    expect(new Set(voces.map((v) => v.text)).size).toBe(ARQUETIPOS.length);
    // Cada frase sale del pool de su arquetipo (cuál de las dos la elige la semilla).
    const de = (k: Personality) => voces.find((v) => v.personality === k)!.text;
    expect(de('competitivo')).toMatch(/perdono|el video y la llave/);
    expect(de('mercenario')).toMatch(/no me voy a matar|la ficha para esto/i);
    expect(de('cumplidor')).toMatch(/No hay excusa|primero en el gimnasio/);
  });

  it('la misma semilla dice siempre lo mismo: la frase no cambia al volver a mirar', () => {
    const ctx: EmotionContext = {
      won: true,
      margin: 10,
      minutes: 30,
      rating: 8,
      mvp: true,
      inSquad: true,
      promisedMinutes: false,
      bigGame: false,
    };
    expect(ochoVoces(ctx).map((v) => v.text)).toEqual(ochoVoces(ctx).map((v) => v.text));
  });

  it('en la misma pantalla nadie repite la frase de otro', () => {
    // Doce jugadores del mismo arquetipo en la misma situación: el pool propio
    // tiene dos frases, así que el resto cae en el genérico sin repetirse.
    const base = partidaNueva(5).players;
    const doce = base.slice(0, 12).map((p) => ({ ...p, personality: 'veterano' as Personality }));
    const moods = buildMoods(doce, () => ({
      won: true,
      margin: 10,
      minutes: 30,
      rating: 8,
      mvp: true,
      inSquad: true,
      promisedMinutes: false,
      bigGame: false,
    }));
    const dichas = moods.map((m) => m.text);
    // 2 del arquetipo + 7 genéricas = 9 distintas antes de tener que repetir.
    expect(new Set(dichas.slice(0, 9)).size).toBe(9);
  });
});
