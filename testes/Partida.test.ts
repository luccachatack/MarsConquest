import { describe, expect, it } from 'vitest';
import { estrategiaPara } from '../src/ia/EstrategiaDeJogo';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { FaseDaPartida } from '../src/jogo/EstadoDaPartida';
import { Jogada } from '../src/jogo/Jogada';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { RESERVA_INICIAL, TipoDeMarcador } from '../src/jogo/Marcador';
import { Partida } from '../src/jogo/Partida';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileDeck } from '../src/jogo/TileDeck';
import { TileFactory } from '../src/jogo/TileFactory';
import { comSemente } from './aleatorio';

const { HABITAT, SOIL } = Terrain;
const { HUMANO, CPU_FACIL, CPU_DIFICIL } = TipoDeJogador;
const { COLONO, CHEFE } = TipoDeMarcador;
const TODOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const TOTAL_DE_MARCADORES = RESERVA_INICIAL[COLONO] + RESERVA_INICIAL[CHEFE];

const soloPuro = new DefinicaoTile('solo', [{ id: 's1', tipo: SOIL, pontos: TODOS }]);
const cupula = new DefinicaoTile('cupula', [{ id: 'h1', tipo: HABITAT, pontos: TODOS }]);
const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);
const ponte = new DefinicaoTile('ponte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 6, 7, 8] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5] },
  { id: 's2', tipo: SOIL, pontos: [9, 10, 11] },
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

const colono = (regiaoId = 'h1') => ({ regiaoId, tipo: COLONO });
const chefe = (regiaoId = 'h1') => ({ regiaoId, tipo: CHEFE });

// Dois habitats separados, um de cada jogador, que a ponte vai unir no 5º turno.
function partidaComDoisHabitats(marcadorDaAna = colono()): Partida {
  const partida = new Partida(
    jogadores('Ana', 'Bia'),
    baralho(soloPuro, soloPuro, soloPuro, habitatNorte, habitatNorte, ponte),
  );
  partida.jogar(jogada(1, 0));
  partida.jogar(jogada(2, 0));
  partida.jogar(jogada(0, -1, 1), marcadorDaAna);
  partida.jogar(jogada(2, -1, 3), colono());
  return partida;
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

  it('começa com 6 colonos e 1 chefe; retira e devolve dentro desses limites (RN05)', () => {
    const j = new Jogador('Ana', HUMANO, 0);
    expect(j.disponiveis(COLONO)).toBe(6);
    expect(j.disponiveis(CHEFE)).toBe(1);
    expect(() => j.devolverMarcador(CHEFE)).toThrow();
    j.retirarMarcador(CHEFE);
    expect(j.disponiveis(CHEFE)).toBe(0);
    expect(j.totalDisponivel()).toBe(6);
    expect(() => j.retirarMarcador(CHEFE)).toThrow();
    j.devolverMarcador(CHEFE);
    expect(j.totalDisponivel()).toBe(7);
  });
});

describe('Partida: turnos', () => {
  it('aceita de 2 a 5 jogadores, com nomes diferentes', () => {
    expect(() => new Partida(jogadores('Ana'), baralho(soloPuro))).toThrow(RangeError);
    expect(() => new Partida(jogadores('A', 'B', 'C', 'D', 'E', 'F'), baralho(soloPuro))).toThrow(RangeError);
    expect(() => new Partida(jogadores('Ana', 'ana'), baralho(soloPuro))).toThrow();
    expect(() => new Partida(jogadores('A', 'B', 'C', 'D', 'E'), baralho(soloPuro))).not.toThrow();
  });

  it('cada turno tem duas etapas, sempre na ordem: peça e depois marcador (RN03)', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte, soloPuro));
    const [ana, bia] = partida.getJogadores();
    expect(partida.getFase()).toBe(FaseDaPartida.COLOCAR_PECA);
    expect(() => partida.pularMarcador()).toThrow();
    expect(() => partida.colocarMarcador(colono())).toThrow();

    partida.colocarPeca(jogada(0, -1));
    expect(partida.getFase()).toBe(FaseDaPartida.COLOCAR_MARCADOR);
    expect(partida.getJogadorDaVez()).toBe(ana);
    expect(() => partida.colocarPeca(jogada(1, 0))).toThrow();

    partida.pularMarcador();
    expect(partida.getFase()).toBe(FaseDaPartida.COLOCAR_PECA);
    expect(partida.getJogadorDaVez()).toBe(bia);
  });

  it('jogada inválida lança erro e não muda a etapa nem a vez', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(habitatNorte, habitatNorte));
    const ana = partida.getJogadorDaVez();
    const atual = partida.getPecaAtual();
    expect(() => partida.colocarPeca(jogada(5, 5))).toThrow();
    expect(partida.getFase()).toBe(FaseDaPartida.COLOCAR_PECA);
    expect(partida.getJogadorDaVez()).toBe(ana);
    expect(partida.getPecaAtual()).toBe(atual);
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
    partida.jogar(jogada(1, 0));
    expect(partida.estaEncerrada()).toBe(true);
    expect(partida.getFase()).toBe(FaseDaPartida.ENCERRADA);
    expect(partida.getPecaAtual()).toBeUndefined();
    expect(() => partida.colocarPeca(jogada(2, 0))).toThrow('A partida já acabou.');
  });
});

describe('Partida: marcadores', () => {
  it('só aceita marcador em habitat ou duto da peça do turno, em construção sem dono (RN04, RN14)', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte, habitatNorte));
    partida.colocarPeca(jogada(0, -1));
    expect(partida.regioesParaMarcador()).toEqual(['h1']);
    expect(() => partida.colocarMarcador(colono('s1'))).toThrow('Esta região não aceita marcador.');
    partida.colocarMarcador(colono());

    // Bia encosta um habitat no da Ana: a construção já tem dono, então não aceita outro.
    partida.colocarPeca(jogada(0, -2, 2));
    expect(partida.regioesParaMarcador()).toEqual([]);
    expect(() => partida.colocarMarcador(colono())).toThrow();
  });

  it('construção completa: quem tem a maioria pontua e os marcadores voltam (RN07)', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte, habitatNorte));
    const [ana, bia] = partida.getJogadores();
    partida.jogar(jogada(0, -1), colono());
    expect(ana.disponiveis(COLONO)).toBe(5);
    expect(partida.getMarcadoresNoTabuleiro()).toHaveLength(1);

    // Bia fecha o habitat da Ana: 2 peças, 4 pontos, mas para quem tem marcador nele.
    const turno = partida.jogar(jogada(0, -2, 2));
    expect(turno.concluidas).toHaveLength(1);
    expect(turno.concluidas[0]).toMatchObject({ pontos: 4, donos: [ana] });
    expect(turno.concluidas[0].devolvidos).toHaveLength(1);
    expect(ana.getPontos()).toBe(4);
    expect(bia.getPontos()).toBe(0);
    expect(ana.disponiveis(COLONO)).toBe(6);
    expect(partida.getMarcadoresNoTabuleiro()).toEqual([]);
  });

  it('construção completa sem marcador não dá pontos a ninguém', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte, habitatNorte));
    partida.jogar(jogada(0, -1));
    const turno = partida.jogar(jogada(0, -2, 2));
    expect(turno.concluidas[0]).toMatchObject({ pontos: 4, donos: [], devolvidos: [] });
    expect(partida.getJogadores().map((j) => j.getPontos())).toEqual([0, 0]);
  });

  it('o marcador colocado na peça que completa a construção já conta e volta na hora', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte, habitatNorte));
    const [, bia] = partida.getJogadores();
    partida.jogar(jogada(0, -1));
    const turno = partida.jogar(jogada(0, -2, 2), colono());
    expect(turno.marcador).toMatchObject({ dono: bia, tipo: COLONO });
    expect(bia.getPontos()).toBe(4);
    expect(bia.disponiveis(COLONO)).toBe(6);
  });

  it('construções que se juntam somam os marcadores; empate na maioria: todos pontuam', () => {
    const partida = partidaComDoisHabitats();
    const [ana, bia] = partida.getJogadores();
    const turno = partida.jogar(jogada(1, -1, 1));
    expect(turno.concluidas[0].pontos).toBe(6);
    expect(turno.concluidas[0].donos).toEqual(expect.arrayContaining([ana, bia]));
    expect(ana.getPontos()).toBe(6);
    expect(bia.getPontos()).toBe(6);
    expect(ana.totalDisponivel()).toBe(TOTAL_DE_MARCADORES);
    expect(bia.totalDisponivel()).toBe(TOTAL_DE_MARCADORES);
  });

  it('o chefe vale por dois na maioria', () => {
    const partida = partidaComDoisHabitats(chefe());
    const [ana, bia] = partida.getJogadores();
    expect(ana.disponiveis(CHEFE)).toBe(0);
    const turno = partida.jogar(jogada(1, -1, 1));
    expect(turno.concluidas[0].donos).toEqual([ana]);
    expect(ana.getPontos()).toBe(6);
    expect(bia.getPontos()).toBe(0);
    expect(ana.disponiveis(CHEFE)).toBe(1);
    expect(bia.disponiveis(COLONO)).toBe(6);
  });

  it('sem marcador do tipo escolhido na reserva, a colocação é recusada (RN05)', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte, habitatNorte));
    const [ana] = partida.getJogadores();
    ana.retirarMarcador(CHEFE);
    partida.colocarPeca(jogada(0, -1));
    expect(() => partida.colocarMarcador(chefe())).toThrow();
    expect(partida.getFase()).toBe(FaseDaPartida.COLOCAR_MARCADOR);
  });

  it('sem nenhum marcador na reserva, nenhuma região é oferecida', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, habitatNorte));
    const [ana] = partida.getJogadores();
    for (let i = 0; i < RESERVA_INICIAL[COLONO]; i++) ana.retirarMarcador(COLONO);
    ana.retirarMarcador(CHEFE);
    partida.colocarPeca(jogada(0, -1));
    expect(partida.regioesParaMarcador()).toEqual([]);
  });
});

describe('Partida: posições sem encaixe', () => {
  it('considera a peça da vez e as do baralho, e não a peça já colocada', () => {
    // Em cima do habitat inicial só um habitat serve. A peça da vez é um habitat; o baralho, só solo.
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(habitatNorte, habitatNorte, soloPuro, soloPuro));
    expect(partida.posicoesSemEncaixe()).toEqual([]);

    // Ana coloca o habitat ao lado: agora nenhuma peça restante cabe em cima da inicial.
    partida.colocarPeca(jogada(1, 0, 1));
    expect(partida.posicoesSemEncaixe().map((p) => p.chave())).toContain('0,-1');
    partida.pularMarcador();
    expect(partida.posicoesSemEncaixe().map((p) => p.chave())).toContain('0,-1');
  });

  it('no fim da partida não marca nada', () => {
    const partida = new Partida(jogadores('Ana', 'Bia'), baralho(soloPuro, soloPuro));
    partida.jogar(jogada(1, 0));
    expect(partida.posicoesSemEncaixe()).toEqual([]);
  });
});

describe('Partida: classificação', () => {
  it('maior placar primeiro; no empate, mais marcadores na reserva (RN11); se ainda empatar, divide', () => {
    const partida = new Partida(jogadores('Ana', 'Bia', 'Caio', 'Duda'), baralho(soloPuro));
    const [ana, bia, caio, duda] = partida.getJogadores();
    ana.adicionarPontos(3);
    bia.adicionarPontos(7);
    caio.adicionarPontos(3);
    duda.adicionarPontos(3);
    caio.retirarMarcador(COLONO);
    expect(partida.classificacao().map((c) => [c.jogador.nome, c.posicao])).toEqual([
      ['Bia', 1],
      ['Ana', 2],
      ['Duda', 2],
      ['Caio', 4],
    ]);
  });
});

describe('Partida simulada entre computadores', () => {
  for (const semente of [1, 2, 3]) {
    it(`pontos e marcadores ficam consistentes do começo ao fim (semente ${semente})`, () => {
      const aleatorio = comSemente(semente);
      const deck = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL, aleatorio);
      const tipos = [CPU_FACIL, CPU_DIFICIL, CPU_DIFICIL];
      const partida = new Partida(
        tipos.map((tipo, i) => new Jogador(`CPU ${i + 1}`, tipo, i)),
        deck,
      );
      const estrategias = new Map(partida.getJogadores().map((j) => [j, estrategiaPara(j.tipo, aleatorio)]));

      let turnos = 0;
      let pontosDasConstrucoes = 0;
      let marcadoresColocados = 0;
      while (!partida.estaEncerrada()) {
        const jogador = partida.getJogadorDaVez();
        expect(jogador).toBe(partida.getJogadores()[turnos % 3]);
        const { jogada, marcador } = estrategias.get(jogador)!.decidir(partida.getBoard(), partida.getPecaAtual()!, jogador);
        const turno = partida.jogar(jogada, marcador);
        if (turno.marcador) marcadoresColocados++;
        for (const c of turno.concluidas) pontosDasConstrucoes += c.pontos * c.donos.length;

        // RNF07: cada marcador está na reserva ou no tabuleiro, nunca nos dois nem em nenhum.
        for (const j of partida.getJogadores()) {
          const noTabuleiro = partida.getMarcadoresNoTabuleiro().filter((m) => m.dono === j).length;
          expect(j.totalDisponivel() + noTabuleiro).toBe(TOTAL_DE_MARCADORES);
        }
        turnos++;
      }

      const board = partida.getBoard();
      expect(board.quantidadeDeTiles() + partida.quantidadeDeDescartadas()).toBe(60);
      expect(board.getFeatures().filter((f) => f.estaCompleta() && f.estaOcupada())).toEqual([]);
      const distribuidos = partida.getJogadores().reduce((soma, j) => soma + j.getPontos(), 0);
      expect(distribuidos).toBe(pontosDasConstrucoes);
      expect(distribuidos).toBeGreaterThan(0);
      expect(marcadoresColocados).toBeGreaterThan(0);
    });
  }
});
