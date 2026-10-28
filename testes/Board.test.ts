import { describe, expect, it } from 'vitest';
import { Board, type ConstrucaoPrevista } from '../src/jogo/Board';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import type { Feature } from '../src/jogo/Feature';
import { TODAS_DIRECOES } from '../src/jogo/Direction';
import { Jogada } from '../src/jogo/Jogada';
import { ladoDoPonto, pontoOposto } from '../src/jogo/PontosDeBorda';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileFactory } from '../src/jogo/TileFactory';
import { comSemente } from './aleatorio';

const { HABITAT, PIPE, SOIL } = Terrain;
const TODOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Definições pequenas, só para os testes (independentes do catálogo).
const soloPuro = new DefinicaoTile('solo', [{ id: 's1', tipo: SOIL, pontos: TODOS }]);
const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);
const habitatNorteCristal = new DefinicaoTile('habitat-norte-cristal', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2], cristal: true },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);
const habitatsOpostos = new DefinicaoTile('habitats-opostos', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 'h2', tipo: HABITAT, pontos: [6, 7, 8] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 9, 10, 11] },
]);
const ponte = new DefinicaoTile('ponte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 6, 7, 8] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5] },
  { id: 's2', tipo: SOIL, pontos: [9, 10, 11] },
]);
const cupula = new DefinicaoTile('cupula', [{ id: 'h1', tipo: HABITAT, pontos: TODOS }]);
const dutoReto = new DefinicaoTile('duto-reto', [
  { id: 'd1', tipo: PIPE, pontos: [4, 10] },
  { id: 's1', tipo: SOIL, pontos: [11, 0, 1, 2, 3] },
  { id: 's2', tipo: SOIL, pontos: [5, 6, 7, 8, 9] },
]);
const dutoCurva = new DefinicaoTile('duto-curva', [
  { id: 'd1', tipo: PIPE, pontos: [7, 10] },
  { id: 's1', tipo: SOIL, pontos: [8, 9] },
  { id: 's2', tipo: SOIL, pontos: [11, 0, 1, 2, 3, 4, 5, 6] },
]);
// Duto que termina nesta peça, saindo pelo leste.
const fimDeDuto = new DefinicaoTile('fim-de-duto', [
  { id: 'd1', tipo: PIPE, pontos: [4] },
  { id: 's1', tipo: SOIL, pontos: [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3] },
]);
// Escotilha ao norte: o duto atravessa o habitat e segue até o sul.
const escotilha = new DefinicaoTile('escotilha', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 2] },
  { id: 'd1', tipo: PIPE, pontos: [1, 7] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6] },
  { id: 's2', tipo: SOIL, pontos: [8, 9, 10, 11] },
]);

let contador = 0;
function peca(definicao: DefinicaoTile, rotacao = 0): Tile {
  const tile = new Tile(`${definicao.id}-${++contador}`, definicao);
  tile.definirRotacao(rotacao);
  return tile;
}

function jogada(x: number, y: number, rotacao = 0): Jogada {
  return new Jogada(new Position(x, y), rotacao);
}

function regiao(tile: Tile, id: string) {
  return tile.getRegioes().find((r) => r.id === id)!;
}

// Confere, recontando do zero, o que o Board mantém de forma incremental.
function conferirInvariantes(board: Board): void {
  for (const tile of board.getTiles()) {
    const posicao = tile.getPosicao()!;
    for (const d of TODAS_DIRECOES) {
      const vizinha = board.getTile(posicao.vizinha(d));
      if (vizinha) {
        expect(tile.conectaCom(vizinha, d), `${tile.id} ↔ ${vizinha.id}`).toBe(true);
      }
    }
    for (const r of tile.getRegioes()) {
      if (r.tipo !== HABITAT && r.tipo !== PIPE) continue;
      const feature = board.getFeatureDe(tile, r.id)!;
      expect(feature.contem(tile, r.id)).toBe(true);
      for (const p of r.pontos) {
        const vizinha = board.getTile(posicao.vizinha(ladoDoPonto(p)));
        if (vizinha) {
          const outra = vizinha.getRegiaoNoPonto(pontoOposto(p));
          expect(board.getFeatureDe(vizinha, outra.id)).toBe(feature);
        }
      }
    }
  }
  for (const feature of board.getFeatures()) {
    let abertas = 0;
    for (const { tile, regiaoId } of feature.getPartes()) {
      for (const p of regiao(tile, regiaoId).pontos) {
        if (!board.estaOcupada(tile.getPosicao()!.vizinha(ladoDoPonto(p)))) abertas++;
      }
    }
    expect(feature.getBordasAbertas()).toBe(abertas);
  }
}

describe('Board: posições e validação', () => {
  it('começa com a peça inicial em (0, 0)', () => {
    const inicial = peca(soloPuro);
    const board = new Board(inicial);
    expect(board.quantidadeDeTiles()).toBe(1);
    expect(board.getTile(new Position(0, 0))).toBe(inicial);
    expect(inicial.getPosicao()?.equals(new Position(0, 0))).toBe(true);
  });

  it('as posições disponíveis são as vazias que encostam em alguma peça', () => {
    const board = new Board(peca(soloPuro));
    const chaves = board.posicoesDisponiveis().map((p) => p.chave()).sort();
    expect(chaves).toEqual(['-1,0', '0,-1', '0,1', '1,0']);

    board.colocar(peca(soloPuro), jogada(1, 0));
    expect(board.posicoesDisponiveis()).toHaveLength(6);
  });

  it('rejeita posição ocupada e posição sem vizinhas', () => {
    const board = new Board(peca(soloPuro));
    expect(board.validarJogada(peca(soloPuro), jogada(0, 0))).toMatch(/ocupada/);
    expect(board.validarJogada(peca(soloPuro), jogada(2, 0))).toMatch(/encostar/);
  });

  it('rejeita lado que não combina e aceita depois de girar', () => {
    // Inicial com habitat no norte; a nova peça fica ao norte dela e precisa de habitat no sul.
    const board = new Board(peca(habitatNorte));
    const nova = peca(habitatNorte);
    expect(board.validarJogada(nova, jogada(0, -1, 0))).toMatch(/sul/);
    expect(board.podeColocar(nova, jogada(0, -1, 2))).toBe(true);
  });

  it('confere todas as vizinhas, não só uma', () => {
    // A posição (1,-1) tem duas vizinhas: habitat a oeste, em (0,-1), e solo ao sul, em (1,0).
    const board = new Board(peca(soloPuro));
    board.colocar(peca(habitatNorte), jogada(0, -1, 1));
    board.colocar(peca(soloPuro), jogada(1, 0));
    // Habitat no oeste e solo no sul: combina com as duas.
    expect(board.podeColocar(peca(habitatNorte), jogada(1, -1, 3))).toBe(true);
    // Só solo: combina com a de baixo, mas não com o habitat a oeste.
    expect(board.validarJogada(peca(soloPuro), jogada(1, -1))).toMatch(/oeste/);
  });

  it('jogada inválida lança erro e não muda o tabuleiro', () => {
    const board = new Board(peca(habitatNorte));
    const nova = peca(habitatNorte);
    expect(() => board.colocar(nova, jogada(0, -1, 0))).toThrow();
    expect(board.quantidadeDeTiles()).toBe(1);
    expect(nova.estaPosicionado()).toBe(false);
    expect(nova.getRotacao()).toBe(0);
  });

  it('colocar aplica a rotação e a posição da jogada', () => {
    const board = new Board(peca(habitatNorte));
    const nova = peca(habitatNorte);
    board.colocar(nova, jogada(0, -1, 2));
    expect(nova.getRotacao()).toBe(2);
    expect(board.getTile(new Position(0, -1))).toBe(nova);
    expect(() => nova.rotacionar()).toThrow();
  });

  it('jogadasValidas lista só jogadas válidas e fica vazia se a peça não cabe (RN13)', () => {
    const board = new Board(peca(soloPuro));
    const jogadas = board.jogadasValidas(peca(habitatNorte));
    expect(jogadas.length).toBeGreaterThan(0);
    for (const j of jogadas) {
      expect(board.podeColocar(peca(habitatNorte), j)).toBe(true);
    }
    // Só há solo no tabuleiro; uma cúpula (habitat nos 4 lados) não encaixa em lugar nenhum.
    expect(board.jogadasValidas(peca(cupula))).toEqual([]);
  });
});

describe('Board: construções (features)', () => {
  it('habitat aberto: uma peça, 3 bordas abertas', () => {
    const inicial = peca(habitatNorte);
    const board = new Board(inicial);
    const habitat = board.getFeatureDe(inicial, 'h1')!;
    expect(habitat.tipo).toBe(HABITAT);
    expect(habitat.quantidadeDeTiles()).toBe(1);
    expect(habitat.getBordasAbertas()).toBe(3);
    expect(habitat.estaCompleta()).toBe(false);
  });

  it('dois habitats que se encostam viram um só, fechado; colocar devolve o habitat concluído', () => {
    const inicial = peca(habitatNorte);
    const board = new Board(inicial);
    const nova = peca(habitatNorte);
    const concluidas = board.colocar(nova, jogada(0, -1, 2));

    const habitat = board.getFeatureDe(inicial, 'h1')!;
    expect(board.getFeatureDe(nova, 'h1')).toBe(habitat);
    expect(habitat.quantidadeDeTiles()).toBe(2);
    expect(habitat.estaCompleta()).toBe(true);
    expect(concluidas).toEqual([habitat]);
    conferirInvariantes(board);
  });

  it('uma peça une dois habitats que estavam separados', () => {
    // Linha de baixo só de solo; em cima, dois habitats voltados um para o outro,
    // com um buraco no meio. A ponte deitada fecha o buraco e une os dois.
    const board = new Board(peca(soloPuro));
    board.colocar(peca(soloPuro), jogada(1, 0));
    board.colocar(peca(soloPuro), jogada(2, 0));
    const esquerda = peca(habitatNorte);
    const direita = peca(habitatNorte);
    board.colocar(esquerda, jogada(0, -1, 1));
    board.colocar(direita, jogada(2, -1, 3));
    expect(board.getFeatureDe(esquerda, 'h1')).not.toBe(board.getFeatureDe(direita, 'h1'));
    expect(board.getFeatures(HABITAT)).toHaveLength(2);

    const meio = peca(ponte);
    const concluidas = board.colocar(meio, jogada(1, -1, 1));

    const habitat = board.getFeatureDe(esquerda, 'h1')!;
    expect(board.getFeatureDe(direita, 'h1')).toBe(habitat);
    expect(board.getFeatureDe(meio, 'h1')).toBe(habitat);
    expect(board.getFeatures(HABITAT)).toHaveLength(1);
    expect(habitat.quantidadeDeTiles()).toBe(3);
    expect(habitat.estaCompleta()).toBe(true);
    expect(concluidas).toEqual([habitat]);
    conferirInvariantes(board);
  });

  it('dois habitats separados na mesma peça continuam separados', () => {
    const inicial = peca(habitatsOpostos);
    const board = new Board(inicial);
    expect(board.getFeatureDe(inicial, 'h1')).not.toBe(board.getFeatureDe(inicial, 'h2'));
    expect(board.getFeatures(HABITAT)).toHaveLength(2);
  });

  it('duto se completa quando as duas pontas terminam', () => {
    const inicio = peca(fimDeDuto);
    const board = new Board(inicio);
    expect(board.colocar(peca(dutoReto), jogada(1, 0))).toEqual([]);
    const duto = board.getFeatureDe(inicio, 'd1')!;
    expect(duto.getBordasAbertas()).toBe(1);

    // Outro fim de duto, girado para sair pelo oeste.
    const concluidas = board.colocar(peca(fimDeDuto), jogada(2, 0, 2));
    expect(concluidas).toEqual([duto]);
    expect(duto.tipo).toBe(PIPE);
    expect(duto.quantidadeDeTiles()).toBe(3);
    expect(duto.estaCompleta()).toBe(true);
    conferirInvariantes(board);
  });

  it('duto em circuito fechado também se completa', () => {
    // Quatro curvas em quadrado: leste-sul, oeste-sul, oeste-norte e norte-leste.
    const board = new Board(peca(dutoCurva, 3));
    board.colocar(peca(dutoCurva), jogada(1, 0, 0));
    board.colocar(peca(dutoCurva), jogada(0, 1, 2));
    const ultima = peca(dutoCurva);
    const concluidas = board.colocar(ultima, jogada(1, 1, 1));

    const duto = board.getFeatureDe(ultima, 'd1')!;
    expect(concluidas).toEqual([duto]);
    expect(duto.quantidadeDeTiles()).toBe(4);
    expect(board.getFeatures(PIPE)).toHaveLength(1);
    conferirInvariantes(board);
  });

  it('conta as peças com cristal do habitat', () => {
    const inicial = peca(habitatNorteCristal);
    const board = new Board(inicial);
    board.colocar(peca(habitatNorte), jogada(0, -1, 2));
    const habitat = board.getFeatureDe(inicial, 'h1')!;
    expect(habitat.quantidadeDeCristais()).toBe(1);
    expect(habitat.quantidadeDeTiles()).toBe(2);
  });

  it('na escotilha, a peça faz parte do habitat e do duto', () => {
    const baixo = peca(escotilha);
    const board = new Board(baixo);
    const cima = peca(escotilha);
    board.colocar(cima, jogada(0, -1, 2));

    const habitat = board.getFeatureDe(baixo, 'h1')!;
    const duto = board.getFeatureDe(baixo, 'd1')!;
    expect(habitat).not.toBe(duto);
    expect(habitat.getTiles()).toEqual(expect.arrayContaining([baixo, cima]));
    expect(duto.getTiles()).toEqual(expect.arrayContaining([baixo, cima]));
    // O habitat fecha entre as duas escotilhas; o duto continua aberto nas pontas.
    expect(habitat.estaCompleta()).toBe(true);
    expect(duto.getBordasAbertas()).toBe(2);
    conferirInvariantes(board);
  });

  it('estufa e solo não formam construções', () => {
    const board = new Board(peca(soloPuro));
    expect(board.getFeatures()).toEqual([]);
  });
});

// Mesmo formato da previsão, para comparar com o que colocar devolve.
function previsaoDe(f: Feature): Pick<ConstrucaoPrevista, 'tipo' | 'quantidadeDeTiles' | 'quantidadeDeCristais'> {
  return { tipo: f.tipo, quantidadeDeTiles: f.quantidadeDeTiles(), quantidadeDeCristais: f.quantidadeDeCristais() };
}

function resumir(construcoes: readonly Pick<ConstrucaoPrevista, 'tipo' | 'quantidadeDeTiles' | 'quantidadeDeCristais'>[]): string[] {
  return construcoes.map((c) => `${c.tipo}:${c.quantidadeDeTiles}:${c.quantidadeDeCristais}`).sort();
}

describe('Board: posições sem encaixe', () => {
  it('marca a posição que nenhuma das peças restantes consegue preencher', () => {
    // Em cima da peça inicial é preciso um habitat virado para baixo; só com solo, nunca.
    const board = new Board(peca(habitatNorte));
    expect(board.posicoesSemEncaixe([soloPuro]).map((p) => p.chave())).toEqual(['0,-1']);
    expect(board.posicoesSemEncaixe([soloPuro, habitatNorte])).toEqual([]);
  });

  it('confere todas as rotações e todas as vizinhas da posição', () => {
    // Buraco entre um habitat (em cima) e solo (embaixo): o habitat-norte girado serve.
    const board = new Board(peca(habitatNorte));
    board.colocar(peca(soloPuro), jogada(1, 0));
    expect(board.posicoesSemEncaixe([habitatNorte]).map((p) => p.chave())).not.toContain('0,-1');
    // Com outro habitat virado para o buraco (pelo leste), só uma peça com habitat em dois lados serviria.
    board.colocar(peca(habitatNorte), jogada(1, -1, 3));
    expect(board.posicoesSemEncaixe([habitatNorte, soloPuro]).map((p) => p.chave())).toContain('0,-1');
  });

  it('sem peças restantes, nenhuma posição tem encaixe', () => {
    const board = new Board(peca(soloPuro));
    expect(board.posicoesSemEncaixe([])).toHaveLength(4);
  });
});

describe('Board: previsão de jogada', () => {
  it('prevê a peça que une dois habitats sem mudar o tabuleiro', () => {
    const board = new Board(peca(soloPuro));
    board.colocar(peca(soloPuro), jogada(1, 0));
    board.colocar(peca(soloPuro), jogada(2, 0));
    board.colocar(peca(habitatNorteCristal), jogada(0, -1, 1));
    board.colocar(peca(habitatNorte), jogada(2, -1, 3));
    const meio = peca(ponte);

    expect(board.preverConclusoes(meio, jogada(1, -1, 1))).toEqual([
      { tipo: HABITAT, quantidadeDeTiles: 3, quantidadeDeCristais: 1, bordasAbertas: 0, marcadores: [], regioesDaPeca: ['h1'] },
    ]);
    expect(meio.estaPosicionado()).toBe(false);
    expect(meio.getRotacao()).toBe(0);
    expect(board.getFeatures(HABITAT)).toHaveLength(2);
    expect(board.getFeatures(HABITAT).every((f) => !f.estaCompleta())).toBe(true);
    conferirInvariantes(board);
  });

  it('prevê o duto em circuito, contando cada peça uma vez', () => {
    const board = new Board(peca(dutoCurva, 3));
    board.colocar(peca(dutoCurva), jogada(1, 0, 0));
    board.colocar(peca(dutoCurva), jogada(0, 1, 2));
    expect(board.preverConclusoes(peca(dutoCurva), jogada(1, 1, 1))).toMatchObject([
      { tipo: PIPE, quantidadeDeTiles: 4, quantidadeDeCristais: 0, regioesDaPeca: ['d1'] },
    ]);
  });

  it('jogada que não completa nada prevê lista vazia; jogada inválida lança erro', () => {
    const board = new Board(peca(fimDeDuto));
    expect(board.preverConclusoes(peca(dutoReto), jogada(1, 0))).toEqual([]);
    // Mas a construção aberta aparece na previsão completa, com a borda que sobra.
    expect(board.preverConstrucoes(peca(dutoReto), jogada(1, 0))).toMatchObject([
      { tipo: PIPE, quantidadeDeTiles: 2, bordasAbertas: 1, regioesDaPeca: ['d1'] },
    ]);
    expect(() => board.preverConclusoes(peca(dutoReto), jogada(1, 0, 1))).toThrow();
  });
});

describe('Board: partida simulada com o catálogo', () => {
  for (const semente of [1, 2, 3]) {
    it(`coloca todas as peças possíveis sem quebrar as regras e a previsão acerta (semente ${semente})`, () => {
      const aleatorio = comSemente(semente);
      const baralho = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL, aleatorio);
      const board = new Board(baralho.getTileInicial());
      let descartadas = 0;

      for (let tile = baralho.comprarTile(); tile; tile = baralho.comprarTile()) {
        const jogadas = board.jogadasValidas(tile);
        if (jogadas.length === 0) {
          descartadas++;
          continue;
        }
        const escolhida = jogadas[Math.floor(aleatorio() * jogadas.length)];
        const previstas = board.preverConclusoes(tile, escolhida);
        const concluidas = board.colocar(tile, escolhida);
        expect(resumir(previstas)).toEqual(resumir(concluidas.map(previsaoDe)));
      }

      expect(board.quantidadeDeTiles() + descartadas).toBe(60);
      expect(board.quantidadeDeTiles()).toBeGreaterThan(50);
      conferirInvariantes(board);
    });
  }
});
