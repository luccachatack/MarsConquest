import { describe, expect, it } from 'vitest';
import { EstrategiaAleatoria, EstrategiaGulosa, estrategiaPara } from '../src/ia/EstrategiaDeJogo';
import { Board } from '../src/jogo/Board';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { TipoDeMarcador } from '../src/jogo/Marcador';
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

const ana = () => new Jogador('Ana', TipoDeJogador.CPU_DIFICIL, 0);

describe('Estratégias do computador', () => {
  it('a fácil escolhe sempre uma jogada válida e só marca regiões permitidas', () => {
    const board = new Board(new Tile('a', habitatNorte));
    const estrategia = new EstrategiaAleatoria(comSemente(7));
    let marcou = 0;
    for (let i = 0; i < 20; i++) {
      const tile = new Tile(`t${i}`, habitatNorte);
      const { jogada, marcador } = estrategia.decidir(board, tile, ana());
      expect(board.podeColocar(tile, jogada)).toBe(true);
      if (marcador) {
        marcou++;
        expect(marcador.regiaoId).toBe('h1');
      }
    }
    expect(marcou).toBeGreaterThan(0);
  });

  it('a difícil completa a construção quando pode e põe um colono nela para pontuar', () => {
    for (const semente of [1, 2, 3, 4, 5]) {
      const board = new Board(new Tile('a', habitatNorte));
      const tile = new Tile('b', habitatNorte);
      const { jogada, marcador } = new EstrategiaGulosa(comSemente(semente)).decidir(board, tile, ana());
      // Só em cima da inicial, virada para baixo, as duas fecham um habitat.
      expect(jogada.position.equals(new Position(0, -1))).toBe(true);
      expect(jogada.rotacao).toBe(2);
      expect(marcador).toEqual({ regiaoId: 'h1', tipo: TipoDeMarcador.COLONO });
    }
  });

  it('a difícil não fecha construção que só daria pontos a outro jogador', () => {
    const inicial = new Tile('a', habitatNorte);
    const board = new Board(inicial);
    const bia = new Jogador('Bia', TipoDeJogador.HUMANO, 1);
    board
      .getFeatureDe(inicial, 'h1')!
      .adicionarMarcador({ dono: bia, tipo: TipoDeMarcador.COLONO, tile: inicial, regiaoId: 'h1' });
    const tile = new Tile('b', habitatNorte);
    for (const semente of [1, 2, 3]) {
      const { jogada, marcador } = new EstrategiaGulosa(comSemente(semente)).decidir(board, tile, ana());
      expect(jogada.position.equals(new Position(0, -1))).toBe(false);
      if (marcador) {
        // E nunca marca construção que já tem dono (RN04).
        const construcao = board.preverConstrucoes(tile, jogada).find((c) => c.regioesDaPeca.includes(marcador.regiaoId))!;
        expect(construcao.marcadores).toEqual([]);
      }
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
        const { jogada, marcador } = estrategias.get(jogador)!.decidir(partida.getBoard(), partida.getPecaAtual()!, jogador);
        partida.jogar(jogada, marcador);
      }
      for (const j of partida.getJogadores()) {
        if (j.tipo === TipoDeJogador.CPU_FACIL) facil += j.getPontos();
        else dificil += j.getPontos();
      }
    }
    expect(dificil).toBeGreaterThan(facil);
  });
});
