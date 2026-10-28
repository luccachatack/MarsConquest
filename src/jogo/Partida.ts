import { Board } from './Board';
import {
  AGUARDANDO_PECA,
  ENCERRADA,
  type EscolhaDeMarcador,
  type EstadoDaPartida,
  type FaseDaPartida,
  type OperacoesDaPartida,
} from './EstadoDaPartida';
import type { Feature } from './Feature';
import type { Jogada } from './Jogada';
import { MAX_JOGADORES, MIN_JOGADORES, type Jogador } from './Jogador';
import { TipoDeMarcador, type Marcador } from './Marcador';
import { pontosDaFeature } from './Pontuacao';
import type { Position } from './Position';
import { Terrain } from './Terrain';
import type { Tile } from './Tile';
import type { TileDeck } from './TileDeck';

// Uma construção que acabou de ser pontuada: completada no turno ou, no fim, ainda aberta.
export interface ConstrucaoPontuada {
  readonly feature: Feature;
  readonly pontos: number;
  // Quem tinha a maioria dos marcadores e levou os pontos; vazio se não havia marcador.
  readonly donos: readonly Jogador[];
  // Marcadores que voltaram para os donos (RN07). Na contagem final, ficam no tabuleiro.
  readonly devolvidos: readonly Marcador[];
}

export interface ResultadoDoTurno {
  readonly jogador: Jogador;
  readonly tile: Tile;
  readonly marcador: Marcador | null;
  readonly concluidas: readonly ConstrucaoPontuada[];
  // Peças compradas depois do turno que não cabiam em lugar nenhum (RN13).
  readonly descartadas: readonly Tile[];
  // Só no último turno: as construções abertas com marcador, pontuadas na contagem final (RN09).
  readonly contagemFinal: readonly ConstrucaoPontuada[];
}

export interface Colocacao {
  readonly jogador: Jogador;
  readonly posicao: number;
}

const TIPOS_COM_MARCADOR: ReadonlySet<Terrain> = new Set([Terrain.HABITAT, Terrain.PIPE, Terrain.GREENHOUSE]);

// Uma partida (o Game do plano): jogadores em turnos. Cada turno tem duas etapas,
// colocar a peça e depois, se quiser, um marcador nela; os estados controlam a ordem.
export class Partida {
  private readonly jogadores: readonly Jogador[];
  private readonly baralho: TileDeck;
  private readonly board: Board;
  private estado: EstadoDaPartida = AGUARDANDO_PECA;
  private vez = 0;
  private atual: Tile | undefined;
  private concluidasNoTurno: Feature[] = [];
  private descartadas = 0;

  private readonly operacoes: OperacoesDaPartida = {
    colocarPeca: (jogada) => {
      this.concluidasNoTurno = this.board.colocar(this.atual!, jogada);
    },
    colocarMarcador: (escolha) => this.executarColocacaoDoMarcador(escolha),
    encerrarTurno: (marcador) => this.executarFimDoTurno(marcador),
    acabaramAsPecas: () => this.atual === undefined,
    mudarPara: (estado) => {
      this.estado = estado;
    },
  };

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
    if (!this.atual) this.estado = ENCERRADA;
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

  getFase(): FaseDaPartida {
    return this.estado.fase;
  }

  // A peça do turno: a colocar, ou já colocada esperando o marcador. undefined no fim da partida.
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
    return this.estado === ENCERRADA;
  }

  // Posições onde nenhuma peça que ainda resta encaixa: a peça da vez (se ainda não foi
  // colocada) e as do baralho. As construções que encostam nelas nunca serão completadas.
  posicoesSemEncaixe(): Position[] {
    if (this.estaEncerrada()) return [];
    const definicoes = new Set(this.baralho.getDefinicoesRestantes());
    if (this.atual && !this.atual.estaPosicionado()) definicoes.add(this.atual.getDefinicao());
    return this.board.posicoesSemEncaixe([...definicoes]);
  }

  // Todos os marcadores que estão no tabuleiro agora.
  getMarcadoresNoTabuleiro(): Marcador[] {
    return this.board.getFeatures().flatMap((f) => [...f.getMarcadores()]);
  }

  // Etapa 1: coloca a peça atual. Jogada inválida lança erro sem mudar nada.
  colocarPeca(jogada: Jogada): void {
    this.estado.colocarPeca(this.operacoes, jogada);
  }

  // Regiões da peça recém-colocada que aceitam marcador: habitat, duto ou estufa cuja construção
  // ainda não tem marcador (RN04, RN14). Vazia se o jogador não tem marcadores (RN05).
  regioesParaMarcador(): string[] {
    const tile = this.atual;
    if (!tile || !tile.estaPosicionado() || this.getJogadorDaVez().totalDisponivel() === 0) {
      return [];
    }
    return tile
      .getRegioes()
      .filter((r) => TIPOS_COM_MARCADOR.has(r.tipo) && !this.board.getFeatureDe(tile, r.id)!.estaOcupada())
      .map((r) => r.id);
  }

  // Etapa 2: coloca um marcador numa região da peça e encerra o turno.
  colocarMarcador(escolha: EscolhaDeMarcador): ResultadoDoTurno {
    return this.estado.colocarMarcador(this.operacoes, escolha);
  }

  // Etapa 2, sem marcador: só encerra o turno.
  pularMarcador(): ResultadoDoTurno {
    return this.estado.pularMarcador(this.operacoes);
  }

  // Turno inteiro de uma vez, para a IA e os testes.
  jogar(jogada: Jogada, marcador: EscolhaDeMarcador | null = null): ResultadoDoTurno {
    this.colocarPeca(jogada);
    return marcador ? this.colocarMarcador(marcador) : this.pularMarcador();
  }

  // Do maior para o menor placar. Desempate: mais marcadores na reserva (RN11).
  // Quem empata nos dois divide a posição.
  classificacao(): Colocacao[] {
    const comparar = (a: Jogador, b: Jogador) =>
      b.getPontos() - a.getPontos() || b.totalDisponivel() - a.totalDisponivel();
    const ordenados = [...this.jogadores].sort(comparar);
    return ordenados.map((jogador) => ({
      jogador,
      posicao: 1 + ordenados.findIndex((outro) => comparar(outro, jogador) === 0),
    }));
  }

  private executarColocacaoDoMarcador({ regiaoId, tipo }: EscolhaDeMarcador): Marcador {
    const jogador = this.getJogadorDaVez();
    if (!this.regioesParaMarcador().includes(regiaoId)) {
      throw new Error('Esta região não aceita marcador.');
    }
    if (jogador.disponiveis(tipo) === 0) {
      throw new Error(`${jogador.nome} não tem ${tipo === TipoDeMarcador.CHEFE ? 'o chefe' : 'colonos'} na reserva.`);
    }
    const tile = this.atual!;
    const marcador: Marcador = { dono: jogador, tipo, tile, regiaoId };
    this.board.getFeatureDe(tile, regiaoId)!.adicionarMarcador(marcador);
    jogador.retirarMarcador(tipo);
    return marcador;
  }

  // Pontua o que a peça completou (depois do marcador, que também conta; habitat fechado vale o dobro),
  // devolve os marcadores dessas construções, passa a vez e compra a próxima peça.
  private executarFimDoTurno(marcador: Marcador | null): ResultadoDoTurno {
    const jogador = this.getJogadorDaVez();
    const tile = this.atual!;
    const concluidas = this.concluidasNoTurno.map((feature) => {
      const pontos = pontosDaFeature(feature);
      const donos = feature.donos();
      donos.forEach((d) => d.adicionarPontos(pontos));
      const devolvidos = feature.removerMarcadores();
      devolvidos.forEach((m) => m.dono.devolverMarcador(m.tipo));
      return { feature, pontos, donos, devolvidos };
    });
    this.concluidasNoTurno = [];

    this.vez = (this.vez + 1) % this.jogadores.length;
    const descartadas = this.comprarProxima();
    const contagemFinal = this.atual ? [] : this.executarContagemFinal();
    return { jogador, tile, marcador, concluidas, descartadas, contagemFinal };
  }

  // Fim da partida: cada construção aberta com marcador vale para quem tem a maioria
  // (habitat aberto: 1 por peça, 2 com cristal; duto: 1 por peça). Os marcadores ficam
  // no tabuleiro, então o desempate conta a reserva de antes da contagem final.
  private executarContagemFinal(): ConstrucaoPontuada[] {
    return this.board
      .getFeatures()
      .filter((f) => f.estaOcupada())
      .map((feature) => {
        const pontos = pontosDaFeature(feature);
        const donos = feature.donos();
        donos.forEach((d) => d.adicionarPontos(pontos));
        return { feature, pontos, donos, devolvidos: [] };
      });
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
