import { describe, expect, it } from 'vitest';
import { EstrategiaAleatoria, EstrategiaGulosa, estrategiaPara } from '../src/ia/EstrategiaDeJogo';
import { Board } from '../src/jogo/Board';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { Partida } from '../src/jogo/Partida';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileFactory } from '../src/jogo/TileFactory';
import { comSemente } from './aleatorio';

const { HABITAT, SOIL } = Terrain;

const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

describe('Estratégias do computador', () => {
  it('a fácil escolhe sempre uma jogada válida', () => {
    const board = new Board(new Tile('a', habitatNorte));
    const estrategia = new EstrategiaAleatoria(comSemente(7));
    for (let i = 0; i < 20; i++) {
      const tile = new Tile(`t${i}`, habitatNorte);
      expect(board.podeColocar(tile, estrategia.escolherJogada(board, tile))).toBe(true);
    }
  });

  it('a difícil completa a construção quando pode', () => {
    for (const semente of [1, 2, 3, 4, 5]) {
      const board = new Board(new Tile('a', habitatNorte));
      const tile = new Tile('b', habitatNorte);
      const escolhida = new EstrategiaGulosa(comSemente(semente)).escolherJogada(board, tile);
      // Só em cima da inicial, virada para baixo, as duas fecham um habitat.
      expect(escolhida.position.equals(new Position(0, -1))).toBe(true);
      expect(escolhida.rotacao).toBe(2);
    }
  });

  it('humano não tem estratégia; cada nível de CPU tem a sua', () => {
    expect(() => estrategiaPara(TipoDeJogador.HUMANO)).toThrow();
    expect(estrategiaPara(TipoDeJogador.CPU_FACIL)).toBeInstanceOf(EstrategiaAleatoria);
    expect(estrategiaPara(TipoDeJogador.CPU_DIFICIL)).toBeInstanceOf(EstrategiaGulosa);
  });

  it('em 20 partidas, a difícil faz mais pontos que a fácil', () => {
    let facil = 0;
    let dificil = 0;
    for (let semente = 1; semente <= 20; semente++) {
      const aleatorio = comSemente(semente);
      // Alterna quem começa, para a ordem não favorecer ninguém.
      const tipos =
        semente % 2 ? [TipoDeJogador.CPU_FACIL, TipoDeJogador.CPU_DIFICIL] : [TipoDeJogador.CPU_DIFICIL, TipoDeJogador.CPU_FACIL];
      const partida = new Partida(
        tipos.map((tipo, i) => new Jogador(`CPU ${i + 1}`, tipo, i)),
        new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL, aleatorio),
      );
      const estrategias = new Map(partida.getJogadores().map((j) => [j, estrategiaPara(j.tipo, aleatorio)]));
      while (!partida.estaEncerrada()) {
        const jogador = partida.getJogadorDaVez();
        partida.jogar(estrategias.get(jogador)!.escolherJogada(partida.getBoard(), partida.getPecaAtual()!));
      }
      for (const j of partida.getJogadores()) {
        if (j.tipo === TipoDeJogador.CPU_FACIL) facil += j.getPontos();
        else dificil += j.getPontos();
      }
    }
    expect(dificil).toBeGreaterThan(facil);
  });
});
