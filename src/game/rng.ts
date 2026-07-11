// RNG determinista (mulberry32). Cada operación del reducer crea un Rng con la
// semilla del estado y guarda la semilla siguiente, así el azar es reproducible
// a partir de una partida guardada.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private fn: () => number;

  constructor(seed: number) {
    this.fn = mulberry32(seed);
  }

  next(): number {
    return this.fn();
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** Semilla para persistir en el estado y continuar la secuencia. */
  nextSeed(): number {
    return Math.floor(this.next() * 0xffffffff);
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
