import { describe, expect, it } from 'vitest';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import type { Tile } from '../src/jogo/Tile';
import type { TileDeck } from '../src/jogo/TileDeck';
import { TileFactory } from '../src/jogo/TileFactory';
import { comSemente } from './aleatorio';

function comprarTodas(baralho: TileDeck): Tile[] {
  const tiles: Tile[] = [];
  for (let tile = baralho.comprarTile(); tile; tile = baralho.comprarTile()) {
    tiles.push(tile);
  }
  return tiles;
}

function criarBaralho(): TileDeck {
  return new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL, comSemente(1));
}

describe('TileFactory', () => {
  it('o baralho tem 59 peças na pilha e 1 inicial', () => {
    const baralho = criarBaralho();
    expect(baralho.quantidadeRestante()).toBe(59);
    expect(baralho.getTileInicial()).toBeDefined();
  });

  it('ids de instância são todos únicos', () => {
    const baralho = criarBaralho();
    const ids = [baralho.getTileInicial(), ...comprarTodas(baralho)].map((t) => t.id);
    expect(ids).toHaveLength(60);
    expect(new Set(ids).size).toBe(60);
  });

  it('a quantidade de peças por definição bate com o catálogo', () => {
    const baralho = criarBaralho();
    const contagem = new Map<string, number>();
    for (const t of [baralho.getTileInicial(), ...comprarTodas(baralho)]) {
      const id = t.getDefinicao().id;
      contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    for (const { definicao, quantidade } of CATALOGO_DE_TILES) {
      expect(contagem.get(definicao.id), definicao.id).toBe(quantidade);
    }
  });

  it('a peça inicial é do tipo ID_TILE_INICIAL', () => {
    expect(criarBaralho().getTileInicial().getDefinicao().id).toBe(ID_TILE_INICIAL);
  });

  it('peças da mesma definição compartilham o mesmo objeto de definição', () => {
    const fabrica = new TileFactory();
    const definicao = CATALOGO_DE_TILES[0].definicao;
    const a = fabrica.criarTile(definicao);
    const b = fabrica.criarTile(definicao);
    expect(a.getDefinicao()).toBe(b.getDefinicao());
    expect(a.id).toBe(`${definicao.id}-1`);
    expect(b.id).toBe(`${definicao.id}-2`);
  });

  it('lança erro se a peça inicial não estiver no catálogo', () => {
    expect(() => new TileFactory().criarBaralho(CATALOGO_DE_TILES, 'nao-existe')).toThrow();
  });
});
