import { describe, expect, it } from 'vitest';
import { estrategiaPara } from '../src/ia/EstrategiaDeJogo';
import { Board } from '../src/jogo/Board';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogada } from '../src/jogo/Jogada';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { Partida } from '../src/jogo/Partida';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileFactory } from '../src/jogo/TileFactory';
import { comSemente } from './aleatorio';

const { HABITAT, SOIL } = Terrain;
const TODOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const soloPuro = new DefinicaoTile('solo', [{ id: 's1', tipo: SOIL, pontos: TODOS }]);
const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

const chaves = (posicoes: readonly Position[]) => posicoes.map((p) => p.chave()).sort();

describe('Prévia das posições sem encaixe', () => {
  it('mostra o lugar que a peça deixaria sem encaixe, sem mudar o tabuleiro', () => {
    const board = new Board(new Tile('inicial', soloPuro));
    const tile = new Tile('nova', habitatNorte);
    // O habitat fica virado para o norte em (0,-1): em (0,-2), só uma peça com habitat ao sul caberia.
    const jogada = new Jogada(new Position(0, -1), 0);
    expect(chaves(board.posicoesSemEncaixe([soloPuro]))).toEqual([]);
    expect(chaves(board.posicoesSemEncaixeDepoisDe(tile, jogada, [soloPuro]))).toEqual(['0,-2']);
    // Nada mudou: a peça não foi posicionada nem girada, e o tabuleiro segue com uma peça só.
    expect(tile.estaPosicionado()).toBe(false);
    expect(board.quantidadeDeTiles()).toBe(1);

    board.colocar(tile, jogada);
    expect(chaves(board.posicoesSemEncaixe([soloPuro]))).toEqual(['0,-2']);
  });

  it('usa a rotação da jogada, não a da peça', () => {
    const board = new Board(new Tile('inicial', soloPuro));
    const tile = new Tile('nova', habitatNorte);
    // Virado para o sul em (0,-1), o habitat encostaria no solo da inicial: a jogada é inválida.
    expect(() => board.posicoesSemEncaixeDepoisDe(tile, new Jogada(new Position(0, -1), 2), [soloPuro])).toThrow();
    // Virado para o leste em (0,-1), o lugar sem encaixe passa a ser (1,-1).
    expect(chaves(board.posicoesSemEncaixeDepoisDe(tile, new Jogada(new Position(0, -1), 1), [soloPuro]))).toEqual(['1,-1']);
  });

  for (const semente of [1, 2, 3]) {
    it(`numa partida inteira, a prévia é igual ao que aparece depois de colocar (semente ${semente})`, () => {
      const aleatorio = comSemente(semente);
      const partida = new Partida(
        [new Jogador('A', TipoDeJogador.CPU_DIFICIL, 0), new Jogador('B', TipoDeJogador.CPU_FACIL, 1)],
        new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL, aleatorio),
      );
      const estrategias = new Map(partida.getJogadores().map((j) => [j, estrategiaPara(j.tipo, aleatorio)]));
      let turnos = 0;
      while (!partida.estaEncerrada()) {
        const jogador = partida.getJogadorDaVez();
        const { jogada, marcador } = estrategias.get(jogador)!.decidir(partida.getBoard(), partida.getPecaAtual()!, jogador);
        const previa = chaves(partida.posicoesSemEncaixeSeColocar(jogada));
        partida.colocarPeca(jogada);
        expect(chaves(partida.posicoesSemEncaixe()), `turno ${turnos}`).toEqual(previa);
        if (marcador) partida.colocarMarcador(marcador);
        else partida.pularMarcador();
        turnos++;
      }
      expect(turnos).toBeGreaterThan(50);
    });
  }
});
