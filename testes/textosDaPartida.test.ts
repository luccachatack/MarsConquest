import { describe, expect, it } from 'vitest';
import { contadoresDoBaralho, situacaoDaEscolha, ultimosAcontecimentos } from '../src/telas/textosDaPartida';

describe('contador do baralho', () => {
  it('sem descartes, mostra só as peças do baralho', () => {
    expect(contadoresDoBaralho(70, 0)).toEqual([{ numero: 70, rotulo: 'no baralho' }]);
  });

  it('com um descarte, mostra o descarte ao lado, no singular', () => {
    expect(contadoresDoBaralho(50, 1)).toEqual([
      { numero: 50, rotulo: 'no baralho' },
      { numero: 1, rotulo: 'descartada' },
    ]);
  });

  it('com vários descartes, usa o plural', () => {
    expect(contadoresDoBaralho(12, 3)[1]).toEqual({ numero: 3, rotulo: 'descartadas' });
  });

  it('baralho vazio continua mostrando o zero', () => {
    expect(contadoresDoBaralho(0, 2)[0]).toEqual({ numero: 0, rotulo: 'no baralho' });
  });
});

describe('últimos acontecimentos', () => {
  const eventos = ['a', 'b', 'c', 'd'];

  it('pega os mais recentes, do mais antigo ao mais novo', () => {
    expect(ultimosAcontecimentos(eventos, 3)).toEqual(['b', 'c', 'd']);
  });

  it('com menos eventos que o pedido, devolve todos', () => {
    expect(ultimosAcontecimentos(['a'], 3)).toEqual(['a']);
  });

  it('com quantidade zero, não devolve nada', () => {
    expect(ultimosAcontecimentos(eventos, 0)).toEqual([]);
  });
});

describe('peça escolhida antes de confirmar', () => {
  it('com vários jeitos, convida a girar', () => {
    expect(situacaoDaEscolha(3)).toBe('Encaixa de 3 jeitos aqui: gire ou confirme.');
  });

  it('com um jeito só, não fala em girar', () => {
    expect(situacaoDaEscolha(1)).toBe('Só encaixa assim aqui: confirme ou volte.');
  });
});
