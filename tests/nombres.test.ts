import { describe, expect, it } from 'vitest';
import { apellido, apellidoEnEquipo, apodoOApellido, cortoEnPlantel, listaY } from '../src/game/nombres';

describe('cómo se nombra a la gente en corto (sep 2026)', () => {
  it('el apellido compuesto va entero: "Da Silva", no "Silva"', () => {
    // La pizarra decía "cuando Silva descanse a Silva" con el DT Agustín Da
    // Silva y nuestro base Facundo Silva.
    expect(apellido('Agustín Da Silva')).toBe('Da Silva');
    expect(apellido('Facundo Silva')).toBe('Silva');
    expect(apellido('"Chino" Rodríguez')).toBe('Rodríguez');
    expect(apellido('"Tato" Da Silva')).toBe('Da Silva');
    expect(apellido('Martín De León')).toBe('De León');
    // Un nombre de una sola palabra no rompe nada.
    expect(apellido('Cacho')).toBe('Cacho');
  });

  it('el apodo manda en la tira; sin apodo, el apellido', () => {
    expect(apodoOApellido('"Chino" Rodríguez')).toBe('Chino');
    expect(apodoOApellido('Agustín Da Silva')).toBe('Da Silva');
  });

  it('la lista lleva "y" antes del último', () => {
    expect(listaY([])).toBe('');
    expect(listaY(['Silva'])).toBe('Silva');
    expect(listaY(['Silva', 'Pereyra'])).toBe('Silva y Pereyra');
    expect(listaY(['Silva', 'Fernández', 'Viera'])).toBe('Silva, Fernández y Viera');
  });

  it('dos del mismo equipo con el mismo apellido llevan la inicial (nov 2026)', () => {
    const alejo = { id: 'a', firstName: 'Alejo', lastName: 'Píriz' };
    const nestor = { id: 'n', firstName: 'Néstor', lastName: 'Píriz' };
    const tomas = { id: 't', firstName: 'Tomás', lastName: 'Duarte' };
    expect(apellidoEnEquipo(alejo, [alejo, nestor, tomas])).toBe('A. Píriz');
    expect(apellidoEnEquipo(nestor, [alejo, nestor, tomas])).toBe('N. Píriz');
    expect(apellidoEnEquipo(tomas, [alejo, nestor, tomas])).toBe('Duarte');
    // Solo, o sin compañero que choque, el apellido alcanza.
    expect(apellidoEnEquipo(alejo, [alejo, tomas])).toBe('Píriz');
    // Si uno de los nuestros se apellida igual, el rival también lleva la inicial.
    const nestorNunez = { id: 'nn', firstName: 'Néstor', lastName: 'Núñez' };
    expect(apellidoEnEquipo(nestorNunez, [nestorNunez, tomas], ['Silva', 'Núñez'])).toBe('N. Núñez');
    expect(apellidoEnEquipo(tomas, [nestorNunez, tomas], ['Silva', 'Núñez'])).toBe('Duarte');
  });
});

describe('los DT que se ofrecen no se apellidan como el plantel (nov 2026)', () => {
  it('en ninguna semilla, y sin repetir apellido entre los tres', async () => {
    const { partidaNueva } = await import('./jugar');
    for (const seed of [1, 2, 3, 4, 5, 11, 21, 4000]) {
      const s = partidaNueva(seed);
      const nuestros = new Set(s.players.map((p) => apellido(p.name)));
      const dts = s.coachMarket.map((c) => apellido(c.name));
      expect(dts.filter((a) => nuestros.has(a)), `semilla ${seed}`).toEqual([]);
      expect(new Set(dts).size, `semilla ${seed}`).toBe(dts.length);
    }
  });
});

describe('dos del plantel con el mismo nombre corto (nov 2026)', () => {
  it('llevan la inicial del nombre; los demás, como siempre', () => {
    const plantel = ['Julián Ramos', 'Richard Ramos', '"Chino" Rodríguez', 'Facundo Silva'];
    expect(cortoEnPlantel('Julián Ramos', plantel)).toBe('J. Ramos');
    expect(cortoEnPlantel('Richard Ramos', plantel)).toBe('R. Ramos');
    expect(cortoEnPlantel('"Chino" Rodríguez', plantel)).toBe('Chino');
    expect(cortoEnPlantel('Facundo Silva', plantel)).toBe('Silva');
    // Dos con el mismo apodo: el apodo con su apellido.
    expect(cortoEnPlantel('"Chino" Rodríguez', [...plantel, '"Chino" Méndez'])).toBe('Chino Rodríguez');
  });
});
