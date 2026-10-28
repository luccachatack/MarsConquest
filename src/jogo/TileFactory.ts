import type { DefinicaoTile } from './DefinicaoTile';
import type { EntradaCatalogo } from './EntradaCatalogo';
import { Tile } from './Tile';
import { TileDeck, type FuncaoAleatoria } from './TileDeck';

// Creator: quem tem os dados do catálogo cria as peças e o baralho.
export class TileFactory {
  private readonly contadores = new Map<string, number>();

  // Id de instância "<idDefinicao>-<n>", único entre as peças criadas por esta fábrica.
  criarTile(definicao: DefinicaoTile): Tile {
    const n = (this.contadores.get(definicao.id) ?? 0) + 1;
    this.contadores.set(definicao.id, n);
    return new Tile(`${definicao.id}-${n}`, definicao);
  }

  criarBaralho(
    catalogo: readonly EntradaCatalogo[],
    idInicial: string,
    aleatorio: FuncaoAleatoria = Math.random,
  ): TileDeck {
    const tiles: Tile[] = [];
    for (const { definicao, quantidade } of catalogo) {
      for (let i = 0; i < quantidade; i++) {
        tiles.push(this.criarTile(definicao));
      }
    }

    const indiceInicial = tiles.findIndex((t) => t.getDefinicao().id === idInicial);
    if (indiceInicial === -1) {
      throw new Error(`A peça inicial ${idInicial} não está no catálogo.`);
    }
    const [tileInicial] = tiles.splice(indiceInicial, 1);

    const baralho = new TileDeck(tiles, tileInicial, aleatorio);
    baralho.embaralhar();
    return baralho;
  }
}
