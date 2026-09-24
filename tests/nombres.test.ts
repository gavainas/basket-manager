import { describe, expect, it } from 'vitest';
import { apellido, apodoOApellido, listaY } from '../src/game/nombres';

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
});
