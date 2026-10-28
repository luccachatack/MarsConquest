import { describe, expect, it } from 'vitest';
import { Board } from '../src/jogo/Board';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogada } from '../src/jogo/Jogada';
import { pontosDaConstrucao, pontosDaFeature } from '../src/jogo/Pontuacao';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';

const { HABITAT, PIPE, SOIL, GREENHOUSE } = Terrain;
const ABERTA = 1;
const COMPLETA = 0;

const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);
const habitatNorteCristal = new DefinicaoTile('habitat-norte-cristal', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2], cristal: true },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

describe('Pontuação', () => {
  it('habitat aberto: 1 por peça e 2 por peça com cristal', () => {
    expect(pontosDaConstrucao(HABITAT, 3, 1, ABERTA)).toBe(4);
    expect(pontosDaConstrucao(HABITAT, 2, 0, ABERTA)).toBe(2);
    expect(pontosDaConstrucao(HABITAT, 2, 2, ABERTA)).toBe(4);
  });

  it('habitat fechado vale o dobro', () => {
    expect(pontosDaConstrucao(HABITAT, 3, 1, COMPLETA)).toBe(8);
    expect(pontosDaConstrucao(HABITAT, 2, 0, COMPLETA)).toBe(4);
  });

  it('duto: 1 por peça, completo ou não', () => {
    expect(pontosDaConstrucao(PIPE, 4, 0, COMPLETA)).toBe(4);
    expect(pontosDaConstrucao(PIPE, 4, 0, ABERTA)).toBe(4);
  });

  it('estufa: 1 por ela e 1 por peça em volta; cercada, 9', () => {
    expect(pontosDaConstrucao(GREENHOUSE, 1, 0, 0)).toBe(9);
    expect(pontosDaConstrucao(GREENHOUSE, 1, 0, 8)).toBe(1);
    expect(pontosDaConstrucao(GREENHOUSE, 1, 0, 5)).toBe(4);
  });

  it('solo não pontua', () => {
    expect(pontosDaConstrucao(SOIL, 5, 0, COMPLETA)).toBe(0);
  });

  it('a construção vale como aberta até fechar, e depois o dobro', () => {
    const inicial = new Tile('a', habitatNorteCristal);
    const board = new Board(inicial);
    expect(pontosDaFeature(board.getFeatureDe(inicial, 'h1')!)).toBe(2);

    board.colocar(new Tile('b', habitatNorte), new Jogada(new Position(0, -1), 2));
    // Busca de novo: ao ligar, o habitat da peça inicial pode ter sido absorvido pelo da nova.
    expect(pontosDaFeature(board.getFeatureDe(inicial, 'h1')!)).toBe(6);
  });
});
