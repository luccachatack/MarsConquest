import type { Board } from '../jogo/Board';
import type { Jogada } from '../jogo/Jogada';
import { TipoDeJogador } from '../jogo/Jogador';
import { pontosPrevistos } from '../jogo/Pontuacao';
import type { Tile } from '../jogo/Tile';
import type { FuncaoAleatoria } from '../jogo/TileDeck';
import { TODAS_DIRECOES } from '../jogo/Direction';

// Strategy: como o computador escolhe onde colocar a peça.
export interface EstrategiaDeJogo {
  // A peça tem pelo menos uma jogada válida (as outras a Partida já descartou).
  escolherJogada(board: Board, tile: Tile): Jogada;
}

function sortear<T>(itens: readonly T[], aleatorio: FuncaoAleatoria): T {
  return itens[Math.floor(aleatorio() * itens.length)];
}

// Fácil: qualquer jogada válida.
export class EstrategiaAleatoria implements EstrategiaDeJogo {
  constructor(private readonly aleatorio: FuncaoAleatoria = Math.random) {}

  escolherJogada(board: Board, tile: Tile): Jogada {
    return sortear(board.jogadasValidas(tile), this.aleatorio);
  }
}

// Difícil: a jogada que dá mais pontos agora. No empate, a que encosta em mais peças,
// porque deixa menos lados abertos e facilita fechar construções depois.
export class EstrategiaGulosa implements EstrategiaDeJogo {
  constructor(private readonly aleatorio: FuncaoAleatoria = Math.random) {}

  escolherJogada(board: Board, tile: Tile): Jogada {
    let melhores: Jogada[] = [];
    let melhorValor = -Infinity;
    for (const jogada of board.jogadasValidas(tile)) {
      const pontos = board.preverConclusoes(tile, jogada).reduce((soma, c) => soma + pontosPrevistos(c), 0);
      const vizinhas = TODAS_DIRECOES.filter((d) => board.estaOcupada(jogada.position.vizinha(d))).length;
      const valor = pontos * 10 + vizinhas;
      if (valor > melhorValor) {
        melhorValor = valor;
        melhores = [jogada];
      } else if (valor === melhorValor) {
        melhores.push(jogada);
      }
    }
    return sortear(melhores, this.aleatorio);
  }
}

export function estrategiaPara(tipo: TipoDeJogador, aleatorio: FuncaoAleatoria = Math.random): EstrategiaDeJogo {
  if (tipo === TipoDeJogador.CPU_DIFICIL) return new EstrategiaGulosa(aleatorio);
  if (tipo === TipoDeJogador.CPU_FACIL) return new EstrategiaAleatoria(aleatorio);
  throw new Error('Jogador humano não tem estratégia automática.');
}
