import { describe, expect, it } from 'vitest';
import { Direction, TODAS_DIRECOES } from '../src/jogo/Direction';
import {
  desrotacionarPonto,
  ladoDoPonto,
  pontoOposto,
  pontosDoLado,
  rotacionarPonto,
} from '../src/jogo/PontosDeBorda';

const PONTOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe('PontosDeBorda', () => {
  it('rotação 0 não muda nenhum ponto', () => {
    for (const p of PONTOS) {
      expect(rotacionarPonto(p, 0)).toBe(p);
    }
  });

  it('uma rotação leva o ponto 3 posições adiante', () => {
    expect(rotacionarPonto(0, 1)).toBe(3);
    expect(rotacionarPonto(1, 1)).toBe(4);
    expect(rotacionarPonto(11, 1)).toBe(2);
  });

  it('quatro rotações devolvem o ponto original', () => {
    for (const p of PONTOS) {
      let atual = p;
      for (let i = 0; i < 4; i++) {
        atual = rotacionarPonto(atual, 1);
      }
      expect(atual).toBe(p);
    }
  });

  it('desrotacionar desfaz a rotação', () => {
    for (const p of PONTOS) {
      for (let r = 0; r < 4; r++) {
        expect(desrotacionarPonto(rotacionarPonto(p, r), r)).toBe(p);
      }
    }
  });

  it('pontoOposto liga os pontos que se tocam entre peças vizinhas', () => {
    const pares: [number, number][] = [[1, 7], [4, 10], [0, 8], [2, 6], [3, 11], [5, 9]];
    for (const [a, b] of pares) {
      expect(pontoOposto(a)).toBe(b);
      expect(pontoOposto(b)).toBe(a);
    }
  });

  it('pontoOposto aplicado duas vezes devolve o ponto', () => {
    for (const p of PONTOS) {
      expect(pontoOposto(pontoOposto(p))).toBe(p);
    }
  });

  it('pontosDoLado segue a numeração em sentido horário', () => {
    expect(pontosDoLado(Direction.NORTH)).toEqual([0, 1, 2]);
    expect(pontosDoLado(Direction.WEST)).toEqual([9, 10, 11]);
  });

  it('ladoDoPonto é coerente com pontosDoLado', () => {
    for (const d of TODAS_DIRECOES) {
      for (const p of pontosDoLado(d)) {
        expect(ladoDoPonto(p)).toBe(d);
      }
    }
  });

  it('rejeita pontos fora de 0 a 11', () => {
    expect(() => rotacionarPonto(12, 0)).toThrow(RangeError);
    expect(() => pontoOposto(-1)).toThrow(RangeError);
  });
});
