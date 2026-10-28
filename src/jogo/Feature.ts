import type { Terrain } from './Terrain';
import type { Tile } from './Tile';

// Uma região de uma peça que faz parte de uma construção.
export interface ParteDeFeature {
  readonly tile: Tile;
  readonly regiaoId: string;
}

// Construção formada por regiões ligadas entre peças: um habitat ou um duto.
// Information Expert: sabe de quais peças é feita e se está completa.
export class Feature {
  readonly tipo: Terrain;
  private readonly partes: ParteDeFeature[];
  // Pontos de borda das partes que ainda não encostam em nenhuma peça.
  private bordasAbertas: number;

  constructor(tipo: Terrain, parte: ParteDeFeature, bordasAbertas: number) {
    this.tipo = tipo;
    this.partes = [parte];
    this.bordasAbertas = bordasAbertas;
  }

  getPartes(): readonly ParteDeFeature[] {
    return this.partes;
  }

  // Peças distintas: uma peça conta uma vez mesmo com duas regiões na mesma construção.
  getTiles(): Tile[] {
    return [...new Set(this.partes.map((p) => p.tile))];
  }

  quantidadeDeTiles(): number {
    return this.getTiles().length;
  }

  // Peças com cristal numa região desta construção.
  quantidadeDeCristais(): number {
    const comCristal = this.partes
      .filter((p) => p.tile.getDefinicao().regioes.find((r) => r.id === p.regiaoId)?.cristal)
      .map((p) => p.tile);
    return new Set(comCristal).size;
  }

  getBordasAbertas(): number {
    return this.bordasAbertas;
  }

  // Completa quando nenhuma borda ficou aberta: o habitat está fechado, ou as duas pontas
  // do duto terminam (ou ele forma um circuito).
  estaCompleta(): boolean {
    return this.bordasAbertas === 0;
  }

  contem(tile: Tile, regiaoId: string): boolean {
    return this.partes.some((p) => p.tile === tile && p.regiaoId === regiaoId);
  }

  // Os dois métodos abaixo são usados só pelo Board ao ligar peças.

  absorver(outra: Feature): void {
    this.partes.push(...outra.partes);
    this.bordasAbertas += outra.bordasAbertas;
  }

  fecharBordas(quantidade: number): void {
    this.bordasAbertas -= quantidade;
  }
}
