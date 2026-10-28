import type { DefinicaoTile } from './DefinicaoTile';
import type { Direction } from './Direction';
import {
  desrotacionarPonto,
  pontoDoMeio,
  pontoOposto,
  pontosDoLado,
  rotacionarPonto,
} from './PontosDeBorda';
import type { Position } from './Position';
import type { Regiao } from './Regiao';
import type { Terrain } from './Terrain';

// Uma peça concreta: compartilha a definição e guarda só o próprio estado (rotação e posição).
export class Tile {
  readonly id: string;
  private readonly definicao: DefinicaoTile;
  private rotacao = 0;
  private posicao: Position | null = null;

  constructor(id: string, definicao: DefinicaoTile) {
    this.id = id;
    this.definicao = definicao;
  }

  getDefinicao(): DefinicaoTile {
    return this.definicao;
  }

  getRotacao(): number {
    return this.rotacao;
  }

  rotacionar(): void {
    this.garantirQueNaoEstaPosicionado();
    this.rotacao = (this.rotacao + 1) % 4;
  }

  definirRotacao(r: number): void {
    this.garantirQueNaoEstaPosicionado();
    if (!Number.isInteger(r) || r < 0 || r > 3) {
      throw new RangeError(`Rotação inválida: ${r}. Use um inteiro de 0 a 3.`);
    }
    this.rotacao = r;
  }

  // Cópias das regiões com os pontos na rotação atual; a definição não é alterada.
  getRegioes(): Regiao[] {
    return this.definicao.regioes.map((r) => this.rotacionarRegiao(r));
  }

  getRegiaoNoPonto(p: number): Regiao {
    return this.rotacionarRegiao(this.regiaoOriginalNoPonto(p));
  }

  getTerrenoNoPonto(p: number): Terrain {
    return this.regiaoOriginalNoPonto(p).tipo;
  }

  getTerrenoEm(d: Direction): Terrain {
    return this.getTerrenoNoPonto(pontoDoMeio(d));
  }

  // `outra` está do lado d desta peça. Compara os 3 pontos do lado, não só o do meio,
  // para que um erro no catálogo não passe despercebido.
  conectaCom(outra: Tile, d: Direction): boolean {
    return pontosDoLado(d).every(
      (p) => this.getTerrenoNoPonto(p) === outra.getTerrenoNoPonto(pontoOposto(p)),
    );
  }

  temEstufa(): boolean {
    return this.definicao.temEstufa();
  }

  // Peça no tabuleiro não muda mais (RNF03).
  posicionar(p: Position): void {
    this.garantirQueNaoEstaPosicionado();
    this.posicao = p;
  }

  getPosicao(): Position | null {
    return this.posicao;
  }

  estaPosicionado(): boolean {
    return this.posicao !== null;
  }

  private regiaoOriginalNoPonto(p: number): Regiao {
    const original = desrotacionarPonto(p, this.rotacao);
    const regiao = this.definicao.regiaoNoPonto(original);
    if (!regiao) {
      throw new Error(`A definição ${this.definicao.id} não tem região no ponto ${original}.`);
    }
    return regiao;
  }

  private rotacionarRegiao(r: Regiao): Regiao {
    return { ...r, pontos: r.pontos.map((p) => rotacionarPonto(p, this.rotacao)) };
  }

  private garantirQueNaoEstaPosicionado(): void {
    if (this.posicao !== null) {
      throw new Error(`A peça ${this.id} já está no tabuleiro e não pode mudar.`);
    }
  }
}
