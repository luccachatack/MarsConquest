import { describe, expect, it } from 'vitest';
import { deslocamento, Direction, oposta, TODAS_DIRECOES } from '../src/jogo/Direction';

describe('Direction', () => {
  it('oposta troca norte com sul e leste com oeste', () => {
    expect(oposta(Direction.NORTH)).toBe(Direction.SOUTH);
    expect(oposta(Direction.SOUTH)).toBe(Direction.NORTH);
    expect(oposta(Direction.EAST)).toBe(Direction.WEST);
    expect(oposta(Direction.WEST)).toBe(Direction.EAST);
  });

  it('deslocamentos opostos se anulam', () => {
    for (const d of TODAS_DIRECOES) {
      const a = deslocamento(d);
      const b = deslocamento(oposta(d));
      expect(a.dx + b.dx).toBe(0);
      expect(a.dy + b.dy).toBe(0);
    }
  });

  it('TODAS_DIRECOES lista as 4 direções em sentido horário', () => {
    expect(TODAS_DIRECOES).toEqual([0, 1, 2, 3]);
  });
});
