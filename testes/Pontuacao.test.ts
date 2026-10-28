import { describe, expect, it } from 'vitest';
import { Board } from '../src/jogo/Board';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogada } from '../src/jogo/Jogada';
import { pontosDaConstrucao, pontosDaFeature } from '../src/jogo/Pontuacao';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';

const { HABITAT, PIPE, SOIL, GREENHOUSE } = Terrain;

const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);
const habitatNorteCristal = new DefinicaoTile('habitat-norte-cristal', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2], cristal: true },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

describe('Pontuação', () => {
  it('habitat: 2 por peça e 4 por peça com cristal', () => {
    expect(pontosDaConstrucao(HABITAT, 3, 1)).toBe(8);
    expect(pontosDaConstrucao(HABITAT, 2, 0)).toBe(4);
    expect(pontosDaConstrucao(HABITAT, 2, 2)).toBe(8);
  });

  it('duto: 1 por peça', () => {
    expect(pontosDaConstrucao(PIPE, 4, 0)).toBe(4);
  });

  it('solo e estufa não pontuam', () => {
    expect(pontosDaConstrucao(SOIL, 5, 0)).toBe(0);
    expect(pontosDaConstrucao(GREENHOUSE, 1, 0)).toBe(0);
  });

  it('construção aberta vale 0; fechada vale pelas regras', () => {
    const inicial = new Tile('a', habitatNorteCristal);
    const board = new Board(inicial);
    expect(pontosDaFeature(board.getFeatureDe(inicial, 'h1')!)).toBe(0);

    board.colocar(new Tile('b', habitatNorte), new Jogada(new Position(0, -1), 2));
    // Busca de novo: ao ligar, o habitat da peça inicial pode ter sido absorvido pelo da nova.
    expect(pontosDaFeature(board.getFeatureDe(inicial, 'h1')!)).toBe(6);
  });
});
