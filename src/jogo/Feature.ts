import type { Jogador } from './Jogador';
import { donosDaMaioria, type Marcador } from './Marcador';
import type { Terrain } from './Terrain';
import type { Tile } from './Tile';

// Uma região de uma peça que faz parte de uma construção.
export interface ParteDeFeature {
  readonly tile: Tile;
  readonly regiaoId: string;
}

// Construção que pontua: um habitat ou um duto (regiões ligadas entre peças) ou uma estufa
// (uma peça só, completa quando as 8 casas em volta estão ocupadas).
// Information Expert: sabe de quais peças é feita e se está completa.
export class Feature {
  readonly tipo: Terrain;
  private readonly partes: ParteDeFeature[];
  private readonly marcadores: Marcador[] = [];
  // Pontos de borda das partes que ainda não encostam em nenhuma peça; na estufa, casas vazias em volta.
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
  getTilesComCristal(): Tile[] {
    const comCristal = this.partes
      .filter((p) => p.tile.getDefinicao().regioes.find((r) => r.id === p.regiaoId)?.cristal)
      .map((p) => p.tile);
    return [...new Set(comCristal)];
  }

  quantidadeDeCristais(): number {
    return this.getTilesComCristal().length;
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

  getMarcadores(): readonly Marcador[] {
    return this.marcadores;
  }

  // Ocupada: já tem marcador de alguém, então não aceita outro (RN04).
  estaOcupada(): boolean {
    return this.marcadores.length > 0;
  }

  // Quem pontua quando ela fica completa.
  donos(): Jogador[] {
    return donosDaMaioria(this.marcadores);
  }

  adicionarMarcador(marcador: Marcador): void {
    if (this.estaOcupada()) {
      throw new Error('Esta construção já tem marcador.');
    }
    if (!this.contem(marcador.tile, marcador.regiaoId)) {
      throw new Error('O marcador precisa estar numa região desta construção.');
    }
    this.marcadores.push(marcador);
  }

  // Tira todos os marcadores (ao pontuar) e devolve quais eram.
  removerMarcadores(): Marcador[] {
    return this.marcadores.splice(0);
  }

  // Os dois métodos abaixo são usados só pelo Board ao ligar peças.

  // Ao juntar construções, os marcadores das duas passam a disputar a mesma.
  absorver(outra: Feature): void {
    this.partes.push(...outra.partes);
    this.marcadores.push(...outra.marcadores);
    this.bordasAbertas += outra.bordasAbertas;
  }

  fecharBordas(quantidade: number): void {
    this.bordasAbertas -= quantidade;
  }
}
