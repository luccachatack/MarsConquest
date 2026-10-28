import { describe, expect, it } from 'vitest';
import { estrategiaPara } from '../src/ia/EstrategiaDeJogo';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogada } from '../src/jogo/Jogada';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { Partida } from '../src/jogo/Partida';
import { pontosDaFeature } from '../src/jogo/Pontuacao';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileDeck } from '../src/jogo/TileDeck';
import { TileFactory } from '../src/jogo/TileFactory';
import { comSemente } from './aleatorio';

const { HABITAT, SOIL } = Terrain;
const { HUMANO, CPU_FACIL, CPU_DIFICIL } = TipoDeJogador;
const TODOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const soloPuro = new DefinicaoTile('solo', [{ id: 's1', tipo: SOIL, pontos: TODOS }]);
const cupula = new DefinicaoTile('cupula', [{ id: 'h1', tipo: HABITAT, pontos: TODOS }]);
const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

let contador = 0;
function peca(definicao: DefinicaoTile): Tile {
  return new Tile(`${definicao.id}-${++contador}`, definicao);
}

// A primeira peça comprada é a primeira da lista.
function baralho(inicial: DefinicaoTile, ...ordem: DefinicaoTile[]): TileDeck {
  return new TileDeck(ordem.map(peca).reverse(), peca(inicial));
}

function jogadores(...nomes: string[]): Jogador[] {
  return nomes.map((nome, i) => new Jogador(nome, HUMANO, i));
}

function jogada(x: number, y: number, rotacao = 0): Jogada {
  return new Jogada(new Position(x, y), rotacao);
}

describe('Jogador', () => {
  it('guarda o nome sem espaços nas pontas e começa com 0 pontos', () => {
    const j = new Jogador('  Ana ', CPU_FACIL, 0xff0000);
    expect(j.nome).toBe('Ana');
    expect(j.getPontos()).toBe(0);
    expect(j.ehCpu()).toBe(true);
    expect(new Jogador('Bia', HUMANO, 0).ehCpu()).toBe(false);
  });

  it('rejeita nome vazio, nome longo demais e pontos negativos', () => {
    expect(() => new Jogador('   ', HUMANO, 0)).toThrow(RangeError);
    expect(() => new Jogador('x'.repeat(17), HUMANO, 0)).toThrow(RangeError);
    expect(() => new Jogador('Ana', HUMANO, 0).adicionarPontos(-1)).toThrow(RangeError);
  });
});

describe('Partida', () => {
  it('aceita de 2 a 5 jogadores, com nomes diferentes', () => {
    expect(() => new Partida(jogadores('Ana'), baralho(soloPuro))).toThrow(RangeError);
    expect(() => new Partida(jogadores('A', 'B', 'C', 'D', 'E', 'F'), baralho(soloPuro))).toThrow(RangeError);
    expect(() => new Partida(jogadores('Ana', 'ana'), baralho(soloPuro))).toThrow();
    expect(() => new Partida(jogadores('A', 'B', 'C', 'D', 'E'), baralho(soloPuro))).not.toThrow();
  });

  it('alterna a vez e dá os pontos a quem completa a construção', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(habitatNorte, soloPuro, habitatNorte));
    const [ana, bia] = partida.getJogadores();
    expect(partida.getJogadorDaVez()).toBe(ana);

    const primeira = partida.jogar(jogada(1, 0));
    expect(primeira).toMatchObject({ jogador: ana, pontos: 0, concluidas: [], descartadas: [] });
    expect(partida.getJogadorDaVez()).toBe(bia);

    // Bia fecha o habitat da peça inicial: 2 peças, 4 pontos.
    const segunda = partida.jogar(jogada(0, -1, 2));
    expect(segunda.jogador).toBe(bia);
    expect(segunda.pontos).toBe(4);
    expect(segunda.concluidas).toHaveLength(1);
    expect(segunda.concluidas[0].pontos).toBe(4);
    expect(bia.getPontos()).toBe(4);
    expect(ana.getPontos()).toBe(0);
    expect(partida.getJogadorDaVez()).toBe(ana);
  });

  it('jogada inválida lança erro e não passa a vez', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(habitatNorte, habitatNorte));
    const ana = partida.getJogadorDaVez();
    const peca = partida.getPecaAtual();
    expect(() => partida.jogar(jogada(5, 5))).toThrow();
    expect(partida.getJogadorDaVez()).toBe(ana);
    expect(partida.getPecaAtual()).toBe(peca);
  });

  it('descarta as peças que não cabem em lugar nenhum (RN13)', () => {
    // Em volta de uma peça só de solo, a cúpula (só habitat) nunca encaixa.
    const noInicio = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, cupula, soloPuro));
    expect(noInicio.quantidadeDeDescartadas()).toBe(1);
    expect(noInicio.getPecaAtual()!.getDefinicao()).toBe(soloPuro);

    const depois = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, soloPuro, cupula));
    const resultado = depois.jogar(jogada(1, 0));
    expect(resultado.descartadas.map((t) => t.getDefinicao())).toEqual([cupula]);
    expect(depois.quantidadeDeDescartadas()).toBe(1);
  });

  it('acaba quando o baralho termina e não aceita mais jogadas', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, soloPuro));
    expect(partida.estaEncerrada()).toBe(false);
    partida.jogar(jogada(1, 0));
    expect(partida.estaEncerrada()).toBe(true);
    expect(partida.getPecaAtual()).toBeUndefined();
    expect(() => partida.jogar(jogada(2, 0))).toThrow('A partida já acabou.');
  });

  it('classificação: maior placar primeiro, empatados dividem a posição', () => {
    const partida = new Partida(jogadores('Ana', 'Bia', 'Caio'), baralho(soloPuro));
    const [ana, bia, caio] = partida.getJogadores();
    ana.adicionarPontos(3);
    bia.adicionarPontos(7);
    caio.adicionarPontos(3);
    expect(partida.classificacao().map((c) => [c.jogador.nome, c.posicao])).toEqual([
      ['Bia', 1],
      ['Ana', 2],
      ['Caio', 2],
    ]);
  });
});

describe('Partida simulada entre computadores', () => {
  for (const semente of [1, 2, 3]) {
    it(`todos os pontos dados vêm das construções completas (semente ${semente})`, () => {
      const aleatorio = comSemente(semente);
      const deck = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL, aleatorio);
      const tipos = [CPU_FACIL, CPU_DIFICIL, CPU_DIFICIL];
      const partida = new Partida(
        tipos.map((tipo, i) => new Jogador(`CPU ${i + 1}`, tipo, i)),
        deck,
      );
      const estrategias = new Map(partida.getJogadores().map((j) => [j, estrategiaPara(j.tipo, aleatorio)]));

      let turnos = 0;
      while (!partida.estaEncerrada()) {
        const jogador = partida.getJogadorDaVez();
        expect(jogador).toBe(partida.getJogadores()[turnos % 3]);
        partida.jogar(estrategias.get(jogador)!.escolherJogada(partida.getBoard(), partida.getPecaAtual()!));
        turnos++;
      }

      const board = partida.getBoard();
      expect(board.quantidadeDeTiles() + partida.quantidadeDeDescartadas()).toBe(60);
      const distribuidos = partida.getJogadores().reduce((soma, j) => soma + j.getPontos(), 0);
      const dasConstrucoes = board.getFeatures().reduce((soma, f) => soma + pontosDaFeature(f), 0);
      expect(distribuidos).toBe(dasConstrucoes);
      expect(distribuidos).toBeGreaterThan(0);
    });
  }
});
