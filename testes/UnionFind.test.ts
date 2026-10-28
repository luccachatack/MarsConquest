import { describe, expect, it } from 'vitest';
import { UnionFind } from '../src/jogo/UnionFind';

describe('UnionFind', () => {
  it('cada elemento novo forma um conjunto sozinho', () => {
    const uf = new UnionFind();
    uf.adicionar('a');
    uf.adicionar('b');
    expect(uf.encontrar('a')).toBe('a');
    expect(uf.encontrar('b')).toBe('b');
  });

  it('unir junta os conjuntos; unir de novo devolve null', () => {
    const uf = new UnionFind();
    uf.adicionar('a');
    uf.adicionar('b');
    const uniao = uf.unir('a', 'b');
    expect(uniao).not.toBeNull();
    expect(uf.encontrar('a')).toBe(uf.encontrar('b'));
    expect(uf.unir('b', 'a')).toBeNull();
  });

  it('a união é transitiva', () => {
    const uf = new UnionFind();
    for (const x of ['a', 'b', 'c', 'd']) uf.adicionar(x);
    uf.unir('a', 'b');
    uf.unir('c', 'd');
    expect(uf.encontrar('a')).not.toBe(uf.encontrar('d'));
    uf.unir('b', 'c');
    expect(uf.encontrar('a')).toBe(uf.encontrar('d'));
  });

  it('o conjunto maior absorve o menor', () => {
    const uf = new UnionFind();
    for (const x of ['a', 'b', 'c']) uf.adicionar(x);
    uf.unir('a', 'b');
    const raizMaior = uf.encontrar('a');
    expect(uf.unir('c', 'a')).toEqual({ raiz: raizMaior, absorvida: 'c' });
  });

  it('adicionar de novo não desfaz a união e elemento desconhecido lança erro', () => {
    const uf = new UnionFind();
    uf.adicionar('a');
    uf.adicionar('b');
    uf.unir('a', 'b');
    uf.adicionar('a');
    expect(uf.encontrar('a')).toBe(uf.encontrar('b'));
    expect(uf.contem('z')).toBe(false);
    expect(() => uf.encontrar('z')).toThrow();
  });
});
