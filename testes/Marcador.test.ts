import { describe, expect, it } from 'vitest';
import { Board } from '../src/jogo/Board';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogada } from '../src/jogo/Jogada';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { donosDaMaioria, TipoDeMarcador } from '../src/jogo/Marcador';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';

const { HABITAT, SOIL } = Terrain;
const { COLONO, CHEFE } = TipoDeMarcador;

const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);
const soloPuro = new DefinicaoTile('solo', [{ id: 's1', tipo: SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }]);
const ponte = new DefinicaoTile('ponte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 6, 7, 8] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5] },
  { id: 's2', tipo: SOIL, pontos: [9, 10, 11] },
]);

const ana = new Jogador('Ana', TipoDeJogador.HUMANO, 0);
const bia = new Jogador('Bia', TipoDeJogador.HUMANO, 1);

function jogada(x: number, y: number, rotacao = 0): Jogada {
  return new Jogada(new Position(x, y), rotacao);
}

describe('Maioria dos marcadores', () => {
  it('sem marcadores, ninguém; com um só dono, ele', () => {
    expect(donosDaMaioria([])).toEqual([]);
    expect(donosDaMaioria([{ dono: ana, tipo: COLONO }])).toEqual([ana]);
  });

  it('mais força vence; empate, todos; o chefe vale 2', () => {
    const colonoDa = (dono: Jogador) => ({ dono, tipo: COLONO });
    expect(donosDaMaioria([colonoDa(ana), colonoDa(bia), colonoDa(bia)])).toEqual([bia]);
    expect(donosDaMaioria([colonoDa(ana), colonoDa(bia)])).toEqual([ana, bia]);
    expect(donosDaMaioria([{ dono: ana, tipo: CHEFE }, colonoDa(bia)])).toEqual([ana]);
    expect(donosDaMaioria([{ dono: ana, tipo: CHEFE }, colonoDa(bia), colonoDa(bia)])).toEqual([ana, bia]);
  });
});

describe('Marcadores nas construções', () => {
  it('uma construção aceita um marcador só se estiver livre e numa região dela', () => {
    const inicial = new Tile('a', habitatNorte);
    const board = new Board(inicial);
    const habitat = board.getFeatureDe(inicial, 'h1')!;
    expect(() => habitat.adicionarMarcador({ dono: ana, tipo: COLONO, tile: inicial, regiaoId: 's1' })).toThrow();
    habitat.adicionarMarcador({ dono: ana, tipo: COLONO, tile: inicial, regiaoId: 'h1' });
    expect(habitat.estaOcupada()).toBe(true);
    expect(() => habitat.adicionarMarcador({ dono: bia, tipo: COLONO, tile: inicial, regiaoId: 'h1' })).toThrow();
  });

  it('ao juntar construções, os marcadores das duas passam para a construção unida', () => {
    const board = new Board(new Tile('s0', soloPuro));
    board.colocar(new Tile('s1', soloPuro), jogada(1, 0));
    board.colocar(new Tile('s2', soloPuro), jogada(2, 0));
    const esquerda = new Tile('e', habitatNorte);
    const direita = new Tile('d', habitatNorte);
    board.colocar(esquerda, jogada(0, -1, 1));
    board.colocar(direita, jogada(2, -1, 3));
    board.getFeatureDe(esquerda, 'h1')!.adicionarMarcador({ dono: ana, tipo: COLONO, tile: esquerda, regiaoId: 'h1' });
    board.getFeatureDe(direita, 'h1')!.adicionarMarcador({ dono: bia, tipo: CHEFE, tile: direita, regiaoId: 'h1' });

    const meio = new Tile('m', ponte);
    // A previsão já mostra os dois marcadores na construção que vai se formar.
    const [prevista] = board.preverConclusoes(meio, jogada(1, -1, 1));
    expect(prevista.marcadores.map((m) => m.dono)).toEqual(expect.arrayContaining([ana, bia]));

    board.colocar(meio, jogada(1, -1, 1));
    const unida = board.getFeatureDe(meio, 'h1')!;
    expect(unida.getMarcadores()).toHaveLength(2);
    expect(unida.donos()).toEqual([bia]);
    expect(unida.removerMarcadores()).toHaveLength(2);
    expect(unida.estaOcupada()).toBe(false);
  });
});
