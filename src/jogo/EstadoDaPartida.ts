import type { Jogada } from './Jogada';
import type { Marcador, TipoDeMarcador } from './Marcador';
import type { ResultadoDoTurno } from './Partida';

export enum FaseDaPartida {
  COLOCAR_PECA = 'colocar-peca',
  COLOCAR_MARCADOR = 'colocar-marcador',
  ENCERRADA = 'encerrada',
}

export interface EscolhaDeMarcador {
  readonly regiaoId: string;
  readonly tipo: TipoDeMarcador;
}

// O que os estados podem pedir à Partida. Ela entrega isso só aos estados,
// para que ninguém de fora pule uma etapa do turno (RN03).
export interface OperacoesDaPartida {
  colocarPeca(jogada: Jogada): void;
  colocarMarcador(escolha: EscolhaDeMarcador): Marcador;
  encerrarTurno(marcador: Marcador | null): ResultadoDoTurno;
  acabaramAsPecas(): boolean;
  mudarPara(estado: EstadoDaPartida): void;
}

// State: cada etapa do turno aceita só as ações que fazem sentido nela.
export abstract class EstadoDaPartida {
  abstract readonly fase: FaseDaPartida;

  colocarPeca(_op: OperacoesDaPartida, _jogada: Jogada): void {
    throw this.proibido('colocar a peça');
  }

  colocarMarcador(_op: OperacoesDaPartida, _escolha: EscolhaDeMarcador): ResultadoDoTurno {
    throw this.proibido('colocar um marcador');
  }

  pularMarcador(_op: OperacoesDaPartida): ResultadoDoTurno {
    throw this.proibido('pular o marcador');
  }

  protected proibido(acao: string): Error {
    return new Error(`Não dá para ${acao} agora (${this.fase}).`);
  }
}

class AguardandoPeca extends EstadoDaPartida {
  readonly fase = FaseDaPartida.COLOCAR_PECA;

  override colocarPeca(op: OperacoesDaPartida, jogada: Jogada): void {
    op.colocarPeca(jogada);
    op.mudarPara(AGUARDANDO_MARCADOR);
  }
}

class AguardandoMarcador extends EstadoDaPartida {
  readonly fase = FaseDaPartida.COLOCAR_MARCADOR;

  override colocarMarcador(op: OperacoesDaPartida, escolha: EscolhaDeMarcador): ResultadoDoTurno {
    return this.encerrar(op, op.colocarMarcador(escolha));
  }

  override pularMarcador(op: OperacoesDaPartida): ResultadoDoTurno {
    return this.encerrar(op, null);
  }

  private encerrar(op: OperacoesDaPartida, marcador: Marcador | null): ResultadoDoTurno {
    const resultado = op.encerrarTurno(marcador);
    op.mudarPara(op.acabaramAsPecas() ? ENCERRADA : AGUARDANDO_PECA);
    return resultado;
  }
}

class Encerrada extends EstadoDaPartida {
  readonly fase = FaseDaPartida.ENCERRADA;

  protected override proibido(): Error {
    return new Error('A partida já acabou.');
  }
}

// Os estados não guardam dados, então uma instância de cada basta.
export const AGUARDANDO_PECA: EstadoDaPartida = new AguardandoPeca();
export const AGUARDANDO_MARCADOR: EstadoDaPartida = new AguardandoMarcador();
export const ENCERRADA: EstadoDaPartida = new Encerrada();
