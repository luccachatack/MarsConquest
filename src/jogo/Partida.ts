import { Board } from './Board';
import type { Feature } from './Feature';
import type { Jogada } from './Jogada';
import { MAX_JOGADORES, MIN_JOGADORES, type Jogador } from './Jogador';
import { pontosDaFeature } from './Pontuacao';
import type { Tile } from './Tile';
import type { TileDeck } from './TileDeck';

export interface ConstrucaoConcluida {
  readonly feature: Feature;
  readonly pontos: number;
}

export interface ResultadoDaJogada {
  readonly jogador: Jogador;
  readonly tile: Tile;
  readonly concluidas: readonly ConstrucaoConcluida[];
  readonly pontos: number;
  // Peças compradas depois da jogada que não cabiam em lugar nenhum (RN13).
  readonly descartadas: readonly Tile[];
}

export interface Colocacao {
  readonly jogador: Jogador;
  readonly posicao: number;
}

// Uma partida: jogadores em turnos, cada um coloca a peça comprada.
// Regra provisória até existirem marcadores: quem completa a construção ganha os pontos dela.
export class Partida {
  private readonly jogadores: readonly Jogador[];
  private readonly baralho: TileDeck;
  private readonly board: Board;
  private vez = 0;
  private atual: Tile | undefined;
  private descartadas = 0;

  constructor(jogadores: readonly Jogador[], baralho: TileDeck) {
    if (jogadores.length < MIN_JOGADORES || jogadores.length > MAX_JOGADORES) {
      throw new RangeError(`Uma partida tem de ${MIN_JOGADORES} a ${MAX_JOGADORES} jogadores.`);
    }
    const nomes = new Set(jogadores.map((j) => j.nome.toLocaleLowerCase()));
    if (nomes.size !== jogadores.length) {
      throw new Error('Dois jogadores não podem ter o mesmo nome.');
    }
    this.jogadores = [...jogadores];
    this.baralho = baralho;
    this.board = new Board(baralho.getTileInicial());
    this.comprarProxima();
  }

  getBoard(): Board {
    return this.board;
  }

  getJogadores(): readonly Jogador[] {
    return this.jogadores;
  }

  getJogadorDaVez(): Jogador {
    return this.jogadores[this.vez];
  }

  // A peça que o jogador da vez deve colocar; undefined quando a partida acabou.
  getPecaAtual(): Tile | undefined {
    return this.atual;
  }

  quantidadeRestante(): number {
    return this.baralho.quantidadeRestante();
  }

  quantidadeDeDescartadas(): number {
    return this.descartadas;
  }

  estaEncerrada(): boolean {
    return this.atual === undefined;
  }

  // Coloca a peça atual pelo jogador da vez, dá a ele os pontos do que completou
  // e passa a vez. Jogada inválida lança erro sem mudar nada.
  jogar(jogada: Jogada): ResultadoDaJogada {
    const tile = this.atual;
    if (!tile) {
      throw new Error('A partida já acabou.');
    }
    const jogador = this.getJogadorDaVez();
    const concluidas = this.board.colocar(tile, jogada).map((feature) => ({ feature, pontos: pontosDaFeature(feature) }));
    const pontos = concluidas.reduce((soma, c) => soma + c.pontos, 0);
    jogador.adicionarPontos(pontos);

    this.vez = (this.vez + 1) % this.jogadores.length;
    const descartadas = this.comprarProxima();
    return { jogador, tile, concluidas, pontos, descartadas };
  }

  // Do maior para o menor placar; empatados dividem a posição.
  classificacao(): Colocacao[] {
    const ordenados = [...this.jogadores].sort((a, b) => b.getPontos() - a.getPontos());
    return ordenados.map((jogador) => ({
      jogador,
      posicao: 1 + ordenados.findIndex((outro) => outro.getPontos() === jogador.getPontos()),
    }));
  }

  // Compra até achar uma peça que cabe; as que não cabem são descartadas (RN13).
  private comprarProxima(): Tile[] {
    const descartadas: Tile[] = [];
    this.atual = this.baralho.comprarTile();
    while (this.atual && this.board.jogadasValidas(this.atual).length === 0) {
      descartadas.push(this.atual);
      this.atual = this.baralho.comprarTile();
    }
    this.descartadas += descartadas.length;
    return descartadas;
  }
}
