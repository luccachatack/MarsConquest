import { describe, expect, it } from 'vitest';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileDeck, type FuncaoAleatoria } from '../src/jogo/TileDeck';
import { comSemente } from './aleatorio';

const solo = new DefinicaoTile('solo', [
  { id: 's1', tipo: Terrain.SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

function criarTiles(n: number): Tile[] {
  return Array.from({ length: n }, (_, i) => new Tile(`solo-${i + 1}`, solo));
}

function criarBaralho(n: number, aleatorio?: FuncaoAleatoria): TileDeck {
  return new TileDeck(criarTiles(n), new Tile('inicial', solo), aleatorio);
}

function idsCompradas(baralho: TileDeck): string[] {
  const ids: string[] = [];
  for (let tile = baralho.comprarTile(); tile; tile = baralho.comprarTile()) {
    ids.push(tile.id);
  }
  return ids;
}

describe('TileDeck', () => {
  it('comprarTile reduz a quantidade restante em 1', () => {
    const baralho = criarBaralho(3);
    expect(baralho.quantidadeRestante()).toBe(3);
    baralho.comprarTile();
    expect(baralho.quantidadeRestante()).toBe(2);
  });

  it('com a pilha vazia, comprarTile devolve undefined', () => {
    const baralho = criarBaralho(1);
    expect(baralho.estaVazio()).toBe(false);
    expect(baralho.comprarTile()).toBeDefined();
    expect(baralho.estaVazio()).toBe(true);
    expect(baralho.comprarTile()).toBeUndefined();
  });

  it('embaralhar mantém exatamente as mesmas peças e muda a ordem', () => {
    const original = idsCompradas(criarBaralho(20));
    const baralho = criarBaralho(20, comSemente(42));
    baralho.embaralhar();
    const embaralhado = idsCompradas(baralho);
    expect([...embaralhado].sort()).toEqual([...original].sort());
    expect(embaralhado).not.toEqual(original);
  });

  it('com a mesma função aleatória, duas execuções dão a mesma ordem', () => {
    const a = criarBaralho(20, comSemente(7));
    const b = criarBaralho(20, comSemente(7));
    a.embaralhar();
    b.embaralhar();
    expect(idsCompradas(a)).toEqual(idsCompradas(b));
  });

  it('embaralhar segue Fisher–Yates com a função injetada', () => {
    // aleatorio() = 0 sempre troca pilha[i] com pilha[0]:
    // [1,2,3] → i=2: [3,2,1] → i=1: [2,3,1]. O fim do array é o topo, comprado primeiro.
    const baralho = new TileDeck(criarTiles(3), new Tile('inicial', solo), () => 0);
    baralho.embaralhar();
    expect(idsCompradas(baralho)).toEqual(['solo-1', 'solo-3', 'solo-2']);
  });

  it('a peça inicial nunca sai de comprarTile', () => {
    const baralho = criarBaralho(10, comSemente(3));
    baralho.embaralhar();
    const inicial = baralho.getTileInicial();
    expect(idsCompradas(baralho)).not.toContain(inicial.id);
    expect(baralho.getTileInicial()).toBe(inicial);
  });
});
