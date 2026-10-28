import type { Tile } from './Tile';

// Devolve um número em [0, 1), como Math.random. Injetada para testes repetíveis (RNF06).
export type FuncaoAleatoria = () => number;

export class TileDeck {
  private readonly pilha: Tile[];
  private readonly tileInicial: Tile;
  private readonly aleatorio: FuncaoAleatoria;

  constructor(pilha: readonly Tile[], tileInicial: Tile, aleatorio: FuncaoAleatoria = Math.random) {
    this.pilha = [...pilha];
    this.tileInicial = tileInicial;
    this.aleatorio = aleatorio;
  }

  // Fisher–Yates: todas as ordens têm a mesma chance, ao contrário de sort(() => Math.random() − 0.5).
  embaralhar(): void {
    for (let i = this.pilha.length - 1; i > 0; i--) {
      const j = Math.floor(this.aleatorio() * (i + 1));
      [this.pilha[i], this.pilha[j]] = [this.pilha[j], this.pilha[i]];
    }
  }

  // O topo é o fim do array. undefined obriga quem chama a tratar a pilha vazia.
  comprarTile(): Tile | undefined {
    return this.pilha.pop();
  }

  estaVazio(): boolean {
    return this.pilha.length === 0;
  }

  quantidadeRestante(): number {
    return this.pilha.length;
  }

  getTileInicial(): Tile {
    return this.tileInicial;
  }
}
