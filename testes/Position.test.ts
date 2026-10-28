import { describe, expect, it } from 'vitest';
import { Direction } from '../src/jogo/Direction';
import { Position } from '../src/jogo/Position';

describe('Position', () => {
  it('vizinha soma o deslocamento da direção (y cresce para baixo)', () => {
    const origem = new Position(0, 0);
    expect(origem.vizinha(Direction.NORTH).equals(new Position(0, -1))).toBe(true);
    expect(origem.vizinha(Direction.EAST).equals(new Position(1, 0))).toBe(true);
    expect(origem.vizinha(Direction.SOUTH).equals(new Position(0, 1))).toBe(true);
    expect(origem.vizinha(Direction.WEST).equals(new Position(-1, 0))).toBe(true);
  });

  it('objetos diferentes com as mesmas coordenadas são iguais e têm a mesma chave', () => {
    const a = new Position(3, -2);
    const b = new Position(3, -2);
    expect(a).not.toBe(b);
    expect(a.equals(b)).toBe(true);
    expect(a.chave()).toBe(b.chave());
  });

  it('posições diferentes têm chaves diferentes', () => {
    expect(new Position(1, 12).chave()).not.toBe(new Position(11, 2).chave());
    expect(new Position(0, 1).chave()).not.toBe(new Position(1, 0).chave());
    expect(new Position(1, 12).equals(new Position(11, 2))).toBe(false);
  });
});
