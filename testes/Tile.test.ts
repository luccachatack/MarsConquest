import { describe, expect, it } from 'vitest';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Direction } from '../src/jogo/Direction';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';

const { HABITAT, PIPE, SOIL, GREENHOUSE } = Terrain;
const PONTOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Definições pequenas, criadas só para os testes (independentes do catálogo).
const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2], cristal: true },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11], habitatsAdjacentes: ['h1'] },
]);
const soloInteiro = new DefinicaoTile('solo', [
  { id: 's1', tipo: SOIL, pontos: PONTOS },
]);
const dutoLesteOeste = new DefinicaoTile('duto-leste-oeste', [
  { id: 'd1', tipo: PIPE, pontos: [4, 10] },
  { id: 's1', tipo: SOIL, pontos: [11, 0, 1, 2, 3] },
  { id: 's2', tipo: SOIL, pontos: [5, 6, 7, 8, 9] },
]);
const dutoSoLeste = new DefinicaoTile('duto-so-leste', [
  { id: 'd1', tipo: PIPE, pontos: [4] },
  { id: 's1', tipo: SOIL, pontos: [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3] },
]);
const estufa = new DefinicaoTile('estufa', [
  { id: 'e1', tipo: GREENHOUSE, pontos: [] },
  { id: 's1', tipo: SOIL, pontos: PONTOS },
]);

function terrenos(tile: Tile) {
  return PONTOS.map((p) => tile.getTerrenoNoPonto(p));
}

describe('Tile', () => {
  it('peça nova tem rotação 0 e não tem posição', () => {
    const tile = new Tile('t-1', habitatNorte);
    expect(tile.getRotacao()).toBe(0);
    expect(tile.getPosicao()).toBeNull();
    expect(tile.estaPosicionado()).toBe(false);
  });

  it('rotacionar leva o habitat do norte para o leste', () => {
    const tile = new Tile('t-1', habitatNorte);
    tile.rotacionar();
    expect(tile.getRotacao()).toBe(1);
    expect(tile.getTerrenoEm(Direction.EAST)).toBe(HABITAT);
    expect(tile.getTerrenoEm(Direction.NORTH)).toBe(SOIL);
  });

  it('quatro rotações voltam ao estado original', () => {
    const tile = new Tile('t-1', dutoLesteOeste);
    const antes = terrenos(tile);
    for (let i = 0; i < 4; i++) {
      tile.rotacionar();
    }
    expect(tile.getRotacao()).toBe(0);
    expect(terrenos(tile)).toEqual(antes);
  });

  it('definirRotacao aceita 0 a 3 e rejeita o resto', () => {
    const tile = new Tile('t-1', habitatNorte);
    tile.definirRotacao(2);
    expect(tile.getTerrenoEm(Direction.SOUTH)).toBe(HABITAT);
    expect(() => tile.definirRotacao(4)).toThrow(RangeError);
    expect(() => tile.definirRotacao(-1)).toThrow(RangeError);
    expect(() => tile.definirRotacao(1.5)).toThrow(RangeError);
  });

  it('conectaCom compara o terreno dos lados que se encostam', () => {
    // A habitat está ao norte de B; B, girada 2 vezes, tem habitat no sul.
    const b = new Tile('b', habitatNorte);
    b.definirRotacao(2);
    expect(new Tile('a', habitatNorte).conectaCom(b, Direction.NORTH)).toBe(true);

    expect(new Tile('a', habitatNorte).conectaCom(new Tile('c', soloInteiro), Direction.NORTH)).toBe(false);

    const duto1 = new Tile('d-1', dutoLesteOeste);
    const duto2 = new Tile('d-2', dutoLesteOeste);
    expect(duto1.conectaCom(duto2, Direction.EAST)).toBe(true);
  });

  it('conectaCom respeita a direção', () => {
    // A tem duto só no leste (oeste é solo); B tem duto no leste e no oeste.
    // Com B a leste, duto encontra duto; com B a oeste, o solo de A encontra o duto de B.
    const a = new Tile('a', dutoSoLeste);
    const b = new Tile('b', dutoLesteOeste);
    expect(a.conectaCom(b, Direction.EAST)).toBe(true);
    expect(a.conectaCom(b, Direction.WEST)).toBe(false);
  });

  it('uma peça que não encaixa passa a encaixar depois de rotacionada', () => {
    // Ao norte de `nova` há um habitat voltado para o sul; `nova` precisa de habitat no norte.
    const vizinhaNorte = new Tile('v', habitatNorte);
    vizinhaNorte.definirRotacao(2);
    const nova = new Tile('n', habitatNorte);
    nova.definirRotacao(1);
    expect(nova.conectaCom(vizinhaNorte, Direction.NORTH)).toBe(false);
    nova.definirRotacao(0);
    expect(nova.conectaCom(vizinhaNorte, Direction.NORTH)).toBe(true);
  });

  it('conectaCom pode supor outra rotação sem girar a peça', () => {
    const vizinhaNorte = new Tile('v', habitatNorte);
    vizinhaNorte.definirRotacao(2);
    const nova = new Tile('n', habitatNorte);
    nova.definirRotacao(1);
    expect(nova.conectaCom(vizinhaNorte, Direction.NORTH, 0)).toBe(true);
    expect(nova.conectaCom(vizinhaNorte, Direction.NORTH, 3)).toBe(false);
    expect(nova.getRotacao()).toBe(1);
  });

  it('depois de posicionar, a peça não pode mais girar nem mudar de lugar', () => {
    const tile = new Tile('t-1', habitatNorte);
    tile.posicionar(new Position(2, 3));
    expect(tile.estaPosicionado()).toBe(true);
    expect(tile.getPosicao()?.equals(new Position(2, 3))).toBe(true);
    expect(() => tile.rotacionar()).toThrow();
    expect(() => tile.definirRotacao(1)).toThrow();
    expect(() => tile.posicionar(new Position(0, 0))).toThrow();
  });

  it('estufa: temEstufa é verdadeiro e a região central não tem pontos', () => {
    const tile = new Tile('e-1', estufa);
    expect(tile.temEstufa()).toBe(true);
    const regiao = tile.getRegioes().find((r) => r.tipo === GREENHOUSE);
    expect(regiao?.pontos).toEqual([]);
    expect(new Tile('t-1', habitatNorte).temEstufa()).toBe(false);
  });

  it('o cristal se mantém depois da rotação', () => {
    const tile = new Tile('t-1', habitatNorte);
    tile.rotacionar();
    const regiao = tile.getRegiaoNoPonto(4);
    expect(regiao.tipo).toBe(HABITAT);
    expect(regiao.cristal).toBe(true);
    expect(regiao.pontos).toEqual([3, 4, 5]);
  });

  it('Flyweight seguro: girar uma peça não afeta outra da mesma definição nem a definição', () => {
    const a = new Tile('t-1', habitatNorte);
    const b = new Tile('t-2', habitatNorte);
    a.definirRotacao(3);
    expect(b.getRotacao()).toBe(0);
    expect(b.getTerrenoEm(Direction.NORTH)).toBe(HABITAT);
    expect(habitatNorte.regiaoNoPonto(1)?.tipo).toBe(HABITAT);
    expect(a.getDefinicao()).toBe(b.getDefinicao());
  });

  it('getRegioes devolve pontos rotacionados sem alterar a definição', () => {
    const tile = new Tile('t-1', dutoLesteOeste);
    tile.rotacionar();
    const duto = tile.getRegioes().find((r) => r.id === 'd1');
    expect(duto?.pontos).toEqual([7, 1]);
    expect(dutoLesteOeste.regioes.find((r) => r.id === 'd1')?.pontos).toEqual([4, 10]);
  });

  it('a definição é imutável', () => {
    expect(Object.isFrozen(habitatNorte.regioes)).toBe(true);
    expect(Object.isFrozen(habitatNorte.regioes[0].pontos)).toBe(true);
  });
});
