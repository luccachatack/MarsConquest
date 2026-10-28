import { describe, expect, it } from 'vitest';
import { Jogada } from '../src/jogo/Jogada';
import { Position } from '../src/jogo/Position';

describe('Jogada', () => {
  it('guarda posição e rotação e compara por valor', () => {
    const a = new Jogada(new Position(1, 2), 3);
    expect(a.position.equals(new Position(1, 2))).toBe(true);
    expect(a.rotacao).toBe(3);
    expect(a.equals(new Jogada(new Position(1, 2), 3))).toBe(true);
    expect(a.equals(new Jogada(new Position(1, 2), 0))).toBe(false);
  });

  it('rejeita rotação fora de 0 a 3', () => {
    expect(() => new Jogada(new Position(0, 0), 4)).toThrow(RangeError);
    expect(() => new Jogada(new Position(0, 0), -1)).toThrow(RangeError);
  });
});
