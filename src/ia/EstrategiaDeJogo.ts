import type { Board, ConstrucaoPrevista } from '../jogo/Board';
import { TODAS_DIRECOES } from '../jogo/Direction';
import type { EscolhaDeMarcador } from '../jogo/EstadoDaPartida';
import type { Jogada } from '../jogo/Jogada';
import { TipoDeJogador, type Jogador } from '../jogo/Jogador';
import { donosDaMaioria, TipoDeMarcador } from '../jogo/Marcador';
import { pontosDaConstrucao, pontosPrevistos } from '../jogo/Pontuacao';
import type { Tile } from '../jogo/Tile';
import type { FuncaoAleatoria } from '../jogo/TileDeck';

export interface DecisaoDoTurno {
  readonly jogada: Jogada;
  readonly marcador: EscolhaDeMarcador | null;
}

// Strategy: como o computador joga o turno, peça e marcador (RF26–RF28).
// Usa só as jogadas e regiões que um humano também poderia escolher (RN10).
export interface EstrategiaDeJogo {
  // A peça tem pelo menos uma jogada válida (as outras a Partida já descartou).
  decidir(board: Board, tile: Tile, jogador: Jogador): DecisaoDoTurno;
}

function sortear<T>(itens: readonly T[], aleatorio: FuncaoAleatoria): T {
  return itens[Math.floor(aleatorio() * itens.length)];
}

function tiposNaReserva(jogador: Jogador): TipoDeMarcador[] {
  return [TipoDeMarcador.COLONO, TipoDeMarcador.CHEFE].filter((t) => jogador.disponiveis(t) > 0);
}

// Regiões da peça que aceitariam marcador se a jogada fosse feita (RN04, RN14).
function regioesLivres(construcoes: readonly ConstrucaoPrevista[]): string[] {
  return construcoes.filter((c) => c.marcadores.length === 0).flatMap((c) => c.regioesDaPeca);
}

// Fácil: jogada sorteada e, em metade das vezes, um marcador numa região sorteada.
export class EstrategiaAleatoria implements EstrategiaDeJogo {
  constructor(private readonly aleatorio: FuncaoAleatoria = Math.random) {}

  decidir(board: Board, tile: Tile, jogador: Jogador): DecisaoDoTurno {
    const jogada = sortear(board.jogadasValidas(tile), this.aleatorio);
    const regioes = regioesLivres(board.preverConstrucoes(tile, jogada));
    const tipos = tiposNaReserva(jogador);
    if (regioes.length === 0 || tipos.length === 0 || this.aleatorio() < 0.5) {
      return { jogada, marcador: null };
    }
    return { jogada, marcador: { regiaoId: sortear(regioes, this.aleatorio), tipo: tipos[0] } };
  }
}

// Quanto "custa" deixar um marcador preso numa construção aberta.
const CUSTO_DO_MARCADOR: Record<TipoDeMarcador, number> = {
  [TipoDeMarcador.COLONO]: 1.5,
  [TipoDeMarcador.CHEFE]: 3,
};
const CUSTO_DA_RESERVA_BAIXA = 2;
// Chance estimada de uma construção aberta ainda fechar: o bônus de fechar (habitat em dobro)
// conta só por essa fração; o valor de aberta já é garantido na contagem final.
const CHANCE_DE_FECHAR = 0.5;
const PESO_DOS_PONTOS_DOS_OUTROS = 0.5;

// Difícil: avalia cada jogada com cada escolha de marcador e fica com a melhor.
// Conta os pontos que ganha agora, desconta os que dá aos outros e aposta em
// construções abertas quando o marcador compensa. No empate, a que encosta em mais peças.
export class EstrategiaGulosa implements EstrategiaDeJogo {
  constructor(private readonly aleatorio: FuncaoAleatoria = Math.random) {}

  decidir(board: Board, tile: Tile, jogador: Jogador): DecisaoDoTurno {
    let melhores: DecisaoDoTurno[] = [];
    let melhorValor = -Infinity;
    const tipos = tiposNaReserva(jogador);

    for (const jogada of board.jogadasValidas(tile)) {
      const construcoes = board.preverConstrucoes(tile, jogada);
      const vizinhas = TODAS_DIRECOES.filter((d) => board.estaOcupada(jogada.position.vizinha(d))).length;
      const opcoes: (EscolhaDeMarcador | null)[] = [null];
      for (const regiaoId of regioesLivres(construcoes)) {
        tipos.forEach((tipo) => opcoes.push({ regiaoId, tipo }));
      }
      for (const marcador of opcoes) {
        const valor = this.avaliar(construcoes, marcador, jogador) + vizinhas * 0.01;
        if (valor > melhorValor + 1e-9) {
          melhorValor = valor;
          melhores = [{ jogada, marcador }];
        } else if (Math.abs(valor - melhorValor) <= 1e-9) {
          melhores.push({ jogada, marcador });
        }
      }
    }
    return sortear(melhores, this.aleatorio);
  }

  private avaliar(construcoes: readonly ConstrucaoPrevista[], escolha: EscolhaDeMarcador | null, eu: Jogador): number {
    // Com o mesmo resultado, guarda o chefe para quando ele fizer diferença.
    let valor = escolha?.tipo === TipoDeMarcador.CHEFE ? -0.1 : 0;
    for (const c of construcoes) {
      const meu = escolha && c.regioesDaPeca.includes(escolha.regiaoId) ? { dono: eu, tipo: escolha.tipo } : null;
      const donos = donosDaMaioria(meu ? [...c.marcadores, meu] : c.marcadores);
      const pontos = pontosPrevistos(c);
      const outros = donos.filter((d) => d !== eu).length;

      if (c.bordasAbertas === 0) {
        // Completa agora: o marcador volta na hora, então não tem custo.
        if (donos.includes(eu)) valor += pontos;
        valor -= PESO_DOS_PONTOS_DOS_OUTROS * pontos * outros;
      } else if (meu) {
        const reservaBaixa = eu.totalDisponivel() <= 2 ? CUSTO_DA_RESERVA_BAIXA : 0;
        const seFechar = pontosDaConstrucao(c.tipo, c.quantidadeDeTiles, c.quantidadeDeCristais, 0);
        valor += pontos + CHANCE_DE_FECHAR * (seFechar - pontos) - CUSTO_DO_MARCADOR[meu.tipo] - reservaBaixa;
      } else if (donos.includes(eu)) {
        valor += 0.5; // aumenta uma construção minha
      } else if (outros > 0) {
        valor -= 0.5; // aumenta a de outro jogador
      }
    }
    return valor;
  }
}

export function estrategiaPara(tipo: TipoDeJogador, aleatorio: FuncaoAleatoria = Math.random): EstrategiaDeJogo {
  if (tipo === TipoDeJogador.CPU_DIFICIL) return new EstrategiaGulosa(aleatorio);
  if (tipo === TipoDeJogador.CPU_FACIL) return new EstrategiaAleatoria(aleatorio);
  throw new Error('Jogador humano não tem estratégia automática.');
}
