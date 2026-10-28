import { describe, expect, it } from 'vitest';
import { Board } from '../src/jogo/Board';
import { DefinicaoTile } from '../src/jogo/DefinicaoTile';
import { Jogada } from '../src/jogo/Jogada';
import { Jogador, TipoDeJogador } from '../src/jogo/Jogador';
import { TipoDeMarcador } from '../src/jogo/Marcador';
import { Partida } from '../src/jogo/Partida';
import { PONTOS_POR_HABITAT_FECHADO_NO_CAMPO } from '../src/jogo/Pontuacao';
import { Position } from '../src/jogo/Position';
import { Terrain } from '../src/jogo/Terrain';
import { Tile } from '../src/jogo/Tile';
import { TileDeck } from '../src/jogo/TileDeck';

const { HABITAT, SOIL } = Terrain;
const { COLONO, CHEFE } = TipoDeMarcador;
const TODOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const P = PONTOS_POR_HABITAT_FECHADO_NO_CAMPO;

const soloPuro = new DefinicaoTile('solo', [{ id: 's1', tipo: SOIL, pontos: TODOS }]);
// Habitat ao norte; o solo do resto da peça encosta nele.
const habitatNorte = new DefinicaoTile('habitat-norte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11], habitatsAdjacentes: ['h1'] },
]);
// Corredor de habitat norte–sul, com um campo de cada lado.
const ponte = new DefinicaoTile('ponte', [
  { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 6, 7, 8] },
  { id: 's1', tipo: SOIL, pontos: [3, 4, 5], habitatsAdjacentes: ['h1'] },
  { id: 's2', tipo: SOIL, pontos: [9, 10, 11], habitatsAdjacentes: ['h1'] },
]);

let contador = 0;
const peca = (d: DefinicaoTile) => new Tile(`${d.id}-${++contador}`, d);
// A primeira peça comprada é a primeira da lista.
const baralho = (inicial: DefinicaoTile, ...ordem: DefinicaoTile[]) => new TileDeck(ordem.map(peca).reverse(), peca(inicial));
const jogadores = () => [new Jogador('Ana', TipoDeJogador.HUMANO, 0), new Jogador('Bia', TipoDeJogador.HUMANO, 1)];
const jogada = (x: number, y: number, rotacao = 0) => new Jogada(new Position(x, y), rotacao);

function campoDaContagem(partida: Partida, turno: ReturnType<Partida['jogar']>) {
  expect(partida.estaEncerrada()).toBe(true);
  return turno.contagemFinal.filter((c) => c.feature.tipo === SOIL);
}

describe('Campo: colono deitado no solo', () => {
  it('o solo aceita marcador, e o campo ocupado não aceita outro', () => {
    const partida = new Partida(jogadores(), baralho(soloPuro, habitatNorte, soloPuro, soloPuro));
    partida.colocarPeca(jogada(1, 0));
    expect(partida.regioesParaMarcador()).toContain('s1');
    partida.colocarMarcador({ regiaoId: 's1', tipo: COLONO });

    // Bia encosta solo no campo da Ana: ele já tem dono.
    partida.colocarPeca(jogada(-1, 0));
    expect(partida.regioesParaMarcador()).toEqual([]);
  });

  it('o marcador no campo não volta durante a partida', () => {
    const partida = new Partida(jogadores(), baralho(soloPuro, habitatNorte, soloPuro, soloPuro));
    const [ana] = partida.getJogadores();
    partida.jogar(jogada(1, 0), { regiaoId: 's1', tipo: COLONO });
    partida.jogar(jogada(-1, 0));
    expect(ana.disponiveis(COLONO)).toBe(5);
    expect(partida.getMarcadoresNoTabuleiro()).toHaveLength(1);
  });
});

describe('Campo: contagem final', () => {
  it('habitat aberto não conta para o campo', () => {
    const partida = new Partida(jogadores(), baralho(soloPuro, habitatNorte));
    const [ana] = partida.getJogadores();
    const turno = partida.jogar(jogada(1, 0), { regiaoId: 's1', tipo: COLONO });
    const [campo] = campoDaContagem(partida, turno);
    expect(campo).toMatchObject({ pontos: 0, donos: [ana] });
    expect(ana.getPontos()).toBe(0);
  });

  it('vale 2 por habitat fechado em volta: 1 habitat', () => {
    const partida = new Partida(jogadores(), baralho(soloPuro, habitatNorte, habitatNorte));
    const [ana] = partida.getJogadores();
    partida.jogar(jogada(1, 0), { regiaoId: 's1', tipo: COLONO });
    // Bia fecha o habitat da peça da Ana encostando outro habitat virado para baixo.
    const turno = partida.jogar(jogada(1, -1, 2));
    expect(turno.concluidas.map((c) => c.feature.tipo)).toEqual([HABITAT]);
    expect(campoDaContagem(partida, turno)[0]).toMatchObject({ pontos: P, donos: [ana] });
    expect(ana.getPontos()).toBe(P);
  });

  it('com 2 habitats fechados em volta, vale o dobro', () => {
    const partida = new Partida(jogadores(), baralho(soloPuro, habitatNorte, habitatNorte, habitatNorte, habitatNorte));
    const [ana] = partida.getJogadores();
    partida.jogar(jogada(1, 0), { regiaoId: 's1', tipo: COLONO });
    partida.jogar(jogada(-1, 0));
    partida.jogar(jogada(1, -1, 2));
    const turno = partida.jogar(jogada(-1, -1, 2));
    expect(campoDaContagem(partida, turno)[0]).toMatchObject({ pontos: 2 * P, donos: [ana] });
  });

  it('um habitat que encosta no campo por duas peças conta uma vez só', () => {
    // A ponte (0,0) e o habitat ao sul dela (0,1) formam um habitat só, fechado no fim por
    // um habitat virado para baixo ao norte. O campo do leste encosta nele pela ponte e pela peça de baixo.
    const partida = new Partida(jogadores(), baralho(ponte, habitatNorte, soloPuro, soloPuro, habitatNorte));
    const [ana] = partida.getJogadores();
    partida.jogar(jogada(0, 1), { regiaoId: 's1', tipo: COLONO });
    partida.jogar(jogada(1, 1));
    partida.jogar(jogada(1, 0));
    const turno = partida.jogar(jogada(0, -1, 2));
    const [campo] = campoDaContagem(partida, turno);
    expect(campo.feature.quantidadeDeTiles()).toBe(4);
    expect(campo).toMatchObject({ pontos: P, donos: [ana] });
  });

  // Dois campos, um de cada lado da ponte, que se juntam por baixo dela; no fim, o habitat
  // da ponte é fechado ao norte.
  function campoDisputado(tipoDaAna: TipoDeMarcador) {
    const partida = new Partida(jogadores(), baralho(ponte, soloPuro, soloPuro, habitatNorte, soloPuro, soloPuro, habitatNorte));
    partida.jogar(jogada(1, 0), { regiaoId: 's1', tipo: tipoDaAna });
    partida.jogar(jogada(-1, 0), { regiaoId: 's1', tipo: COLONO });
    partida.jogar(jogada(0, 1));
    partida.jogar(jogada(1, 1));
    partida.jogar(jogada(-1, 1));
    const turno = partida.jogar(jogada(0, -1, 2));
    return { partida, turno };
  }

  it('na disputa, o chefe (força 2) leva o campo', () => {
    const { partida, turno } = campoDisputado(CHEFE);
    const [ana, bia] = partida.getJogadores();
    const campos = campoDaContagem(partida, turno);
    expect(campos).toHaveLength(1);
    expect(campos[0]).toMatchObject({ pontos: P, donos: [ana] });
    expect(bia.getPontos()).toBe(0);
  });

  it('no empate, os dois levam os pontos do campo', () => {
    const { partida, turno } = campoDisputado(COLONO);
    const [ana, bia] = partida.getJogadores();
    expect(campoDaContagem(partida, turno)[0].donos).toEqual([ana, bia]);
    expect(ana.getPontos()).toBe(P);
    expect(bia.getPontos()).toBe(P);
  });
});

describe('Campo: previsão para a IA', () => {
  it('conta os habitats em volta do campo e quais estariam fechados', () => {
    const board = new Board(peca(habitatNorte));
    const campoDe = (t: Tile, j: Jogada) => board.preverConstrucoes(t, j).filter((c) => c.tipo === SOIL);

    // Solo ao lado: o campo cresce e o habitat da inicial continua aberto.
    expect(campoDe(peca(soloPuro), jogada(1, 0))).toMatchObject([
      { quantidadeDeTiles: 2, habitatsEmVolta: 1, habitatsFechadosEmVolta: 0 },
    ]);
    // Habitat virado para baixo em cima: fecha o habitat. A previsão só traz o campo da peça nova
    // (o da inicial não encosta nela), e ele já conta o habitat que fechou.
    expect(campoDe(peca(habitatNorte), jogada(0, -1, 2))).toMatchObject([
      { quantidadeDeTiles: 1, habitatsEmVolta: 1, habitatsFechadosEmVolta: 1 },
    ]);
  });
});
