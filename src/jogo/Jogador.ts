import { RESERVA_INICIAL, type TipoDeMarcador } from './Marcador';

export enum TipoDeJogador {
  HUMANO = 'humano',
  CPU_FACIL = 'cpu-facil',
  CPU_DIFICIL = 'cpu-dificil',
}

export const MIN_JOGADORES = 2;
export const MAX_JOGADORES = 5;
export const TAMANHO_MAXIMO_DO_NOME = 16;

export class Jogador {
  readonly nome: string;
  readonly tipo: TipoDeJogador;
  // Cor do jogador na interface (0xRRGGBB). As regras não usam.
  readonly cor: number;
  private pontos = 0;
  private readonly reserva = new Map<TipoDeMarcador, number>(Object.entries(RESERVA_INICIAL) as [TipoDeMarcador, number][]);

  constructor(nome: string, tipo: TipoDeJogador, cor: number) {
    const limpo = nome.trim();
    if (limpo.length === 0 || limpo.length > TAMANHO_MAXIMO_DO_NOME) {
      throw new RangeError(`O nome precisa ter de 1 a ${TAMANHO_MAXIMO_DO_NOME} letras.`);
    }
    this.nome = limpo;
    this.tipo = tipo;
    this.cor = cor;
  }

  ehCpu(): boolean {
    return this.tipo !== TipoDeJogador.HUMANO;
  }

  getPontos(): number {
    return this.pontos;
  }

  adicionarPontos(pontos: number): void {
    if (pontos < 0) {
      throw new RangeError('Pontos não podem ser negativos.');
    }
    this.pontos += pontos;
  }

  // Marcadores na reserva: os que ainda não estão no tabuleiro (RF16).
  disponiveis(tipo: TipoDeMarcador): number {
    return this.reserva.get(tipo)!;
  }

  totalDisponivel(): number {
    return [...this.reserva.values()].reduce((soma, n) => soma + n, 0);
  }

  retirarMarcador(tipo: TipoDeMarcador): void {
    if (this.disponiveis(tipo) === 0) {
      throw new Error(`${this.nome} não tem ${tipo} disponível.`);
    }
    this.reserva.set(tipo, this.disponiveis(tipo) - 1);
  }

  devolverMarcador(tipo: TipoDeMarcador): void {
    if (this.disponiveis(tipo) === RESERVA_INICIAL[tipo]) {
      throw new Error(`A reserva de ${tipo} de ${this.nome} já está cheia.`);
    }
    this.reserva.set(tipo, this.disponiveis(tipo) + 1);
  }
}
