import Phaser from 'phaser';
import { estrategiaPara, type EstrategiaDeJogo } from '../ia/EstrategiaDeJogo';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../jogo/catalogoDeTiles';
import type { Feature } from '../jogo/Feature';
import { Jogada } from '../jogo/Jogada';
import { Jogador } from '../jogo/Jogador';
import { Partida, type Colocacao, type ResultadoDaJogada } from '../jogo/Partida';
import { Position } from '../jogo/Position';
import { Terrain } from '../jogo/Terrain';
import type { Tile } from '../jogo/Tile';
import { TileFactory } from '../jogo/TileFactory';
import type { DadosDaPartida } from './CenaPreparacao';
import { desenharTile } from './desenharTile';
import { CENAS, corCss, estilo, nomeDaPeca } from './ui';

export const TAMANHO_PECA = 96;
// Largura da área do tabuleiro; à direita fica o painel (CenaPainelTabuleiro).
export const LARGURA_TABULEIRO = 900;

const COR_VALIDA = 0x5fd38d;
const COR_DISPONIVEL = 0x5d6878;
const DISTANCIA_PARA_ARRASTAR = 6;
// Pausa antes da jogada do computador, para dar tempo de ver o que acontece.
const ESPERA_DA_CPU_MS = 700;
const MAXIMO_DE_EVENTOS = 5;

export interface EstadoDoTabuleiro {
  readonly jogadores: readonly Jogador[];
  // undefined quando a partida acabou.
  readonly jogadorDaVez: Jogador | undefined;
  readonly atual: Tile | undefined;
  readonly restantes: number;
  readonly colocadas: number;
  readonly descartadas: number;
  readonly posicoesValidasNaRotacao: number;
  readonly eventos: readonly string[];
  // Preenchida só no fim da partida.
  readonly classificacao: readonly Colocacao[] | null;
}

function descreverConclusao(f: Feature, pontos: number, jogador: Jogador): string {
  const pecas = f.quantidadeDeTiles();
  if (f.tipo === Terrain.HABITAT) {
    const cristais = f.quantidadeDeCristais();
    return `${jogador.nome} fechou um habitat de ${pecas} peças${cristais ? ` com ${cristais} cristal(is)` : ''}: +${pontos}.`;
  }
  return `${jogador.nome} completou um duto de ${pecas} peças: +${pontos}.`;
}

// Partida de verdade: jogadores humanos e CPUs se revezam colocando peças.
export class CenaTabuleiro extends Phaser.Scene {
  private dados!: DadosDaPartida;
  private partida!: Partida;
  private estrategias = new Map<Jogador, EstrategiaDeJogo>();
  private eventos: string[] = [];

  private destaques!: Phaser.GameObjects.Graphics;
  private fantasma!: Phaser.GameObjects.Graphics;
  private ultima!: Phaser.GameObjects.Graphics;
  private inicioDoToque: { x: number; y: number } | null = null;
  private arrastando = false;

  constructor() {
    super(CENAS.tabuleiro);
  }

  init(dados: DadosDaPartida): void {
    this.dados = dados;
  }

  create(): void {
    const jogadores = this.dados.jogadores.map((j) => new Jogador(j.nome, j.tipo, j.cor));
    const baralho = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL);
    this.partida = new Partida(jogadores, baralho);
    this.estrategias = new Map(jogadores.filter((j) => j.ehCpu()).map((j) => [j, estrategiaPara(j.tipo)]));
    this.eventos = [];

    const camera = this.cameras.main;
    camera.setViewport(0, 0, LARGURA_TABULEIRO, this.scale.height);
    this.centralizar();

    this.desenharGrade();
    this.desenharPeca(baralho.getTileInicial());
    // Camadas: peças (0) < destaques < prévia < contorno da última peça < textos de pontos.
    this.destaques = this.add.graphics().setDepth(1);
    this.fantasma = this.add.graphics().setAlpha(0.6).setDepth(2);
    this.ultima = this.add.graphics().setDepth(3);

    this.configurarEntrada();
    this.scene.launch(CENAS.painelTabuleiro);
    this.registrar(`A peça inicial está no centro. ${this.partida.getJogadorDaVez().nome} começa.`);
    this.registrarDescartes(this.partida.quantidadeDeDescartadas());
    this.iniciarTurno();
  }

  // Chamados pelo painel.

  girar(): void {
    const atual = this.partida.getPecaAtual();
    if (!atual || !this.vezDeHumano()) return;
    atual.rotacionar();
    this.fantasma.clear();
    this.atualizar();
  }

  centralizar(): void {
    this.cameras.main.setZoom(1).centerOn(TAMANHO_PECA / 2, TAMANHO_PECA / 2);
  }

  // Mesmos jogadores, baralho novo.
  novaPartida(): void {
    this.scene.restart(this.dados);
  }

  trocarJogadores(): void {
    this.scene.stop(CENAS.painelTabuleiro);
    this.scene.start(CENAS.preparacao);
  }

  voltarAoMenu(): void {
    this.scene.stop(CENAS.painelTabuleiro);
    this.scene.start(CENAS.menu);
  }

  emitirEstado(): void {
    const atual = this.partida.getPecaAtual();
    const encerrada = this.partida.estaEncerrada();
    const estado: EstadoDoTabuleiro = {
      jogadores: this.partida.getJogadores(),
      jogadorDaVez: encerrada ? undefined : this.partida.getJogadorDaVez(),
      atual,
      restantes: this.partida.quantidadeRestante(),
      colocadas: this.partida.getBoard().quantidadeDeTiles(),
      descartadas: this.partida.quantidadeDeDescartadas(),
      posicoesValidasNaRotacao: atual ? this.posicoesValidasNaRotacao(atual).length : 0,
      eventos: this.eventos,
      classificacao: encerrada ? this.partida.classificacao() : null,
    };
    this.events.emit('estado', estado);
  }

  private vezDeHumano(): boolean {
    return !this.partida.estaEncerrada() && !this.partida.getJogadorDaVez().ehCpu();
  }

  private iniciarTurno(): void {
    this.atualizar();
    if (this.partida.estaEncerrada() || this.vezDeHumano()) return;
    this.time.delayedCall(ESPERA_DA_CPU_MS, () => {
      const jogador = this.partida.getJogadorDaVez();
      const jogada = this.estrategias.get(jogador)!.escolherJogada(this.partida.getBoard(), this.partida.getPecaAtual()!);
      this.jogar(jogada);
    });
  }

  private colocarEm(posicao: Position): void {
    const atual = this.partida.getPecaAtual();
    if (!atual || !this.vezDeHumano()) return;
    const jogada = new Jogada(posicao, atual.getRotacao());
    if (!this.partida.getBoard().podeColocar(atual, jogada)) return;
    this.jogar(jogada);
  }

  private jogar(jogada: Jogada): void {
    const resultado = this.partida.jogar(jogada);
    this.desenharPeca(resultado.tile);
    const p = jogada.position;
    this.ultima
      .clear()
      .lineStyle(4, resultado.jogador.cor, 1)
      .strokeRect(p.x * TAMANHO_PECA, p.y * TAMANHO_PECA, TAMANHO_PECA, TAMANHO_PECA);
    this.fantasma.clear();
    this.mostrarPontos(resultado);
    this.registrarDescartes(resultado.descartadas.length);
    if (this.partida.estaEncerrada()) {
      const [primeiro] = this.partida.classificacao();
      this.registrar(`Fim da partida! ${primeiro.jogador.nome} terminou em 1º lugar.`);
    }
    this.iniciarTurno();
  }

  // Registra cada construção completada e mostra "+N" subindo sobre ela.
  private mostrarPontos(resultado: ResultadoDaJogada): void {
    for (const { feature, pontos } of resultado.concluidas) {
      this.registrar(descreverConclusao(feature, pontos, resultado.jogador));
      const posicoes = feature.getTiles().map((t) => t.getPosicao()!);
      const cx = (posicoes.reduce((s, q) => s + q.x, 0) / posicoes.length + 0.5) * TAMANHO_PECA;
      const cy = (posicoes.reduce((s, q) => s + q.y, 0) / posicoes.length + 0.5) * TAMANHO_PECA;
      const texto = this.add
        .text(cx, cy, `+${pontos}`, { ...estilo(30, corCss(resultado.jogador.cor), true), stroke: '#14161c', strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(4);
      this.tweens.add({ targets: texto, y: cy - 60, alpha: 0, duration: 1600, ease: 'Cubic.easeIn', onComplete: () => texto.destroy() });
    }
  }

  private registrarDescartes(quantidade: number): void {
    if (quantidade > 0) {
      this.registrar(`${quantidade} peça(s) descartada(s): não cabiam em lugar nenhum.`);
    }
  }

  private posicoesValidasNaRotacao(tile: Tile): Position[] {
    const board = this.partida.getBoard();
    return board.posicoesDisponiveis().filter((p) => board.podeColocar(tile, new Jogada(p, tile.getRotacao())));
  }

  private atualizar(): void {
    this.destaques.clear();
    const atual = this.partida.getPecaAtual();
    // Na vez da CPU, os destaques somem: não é o humano quem escolhe.
    if (atual && this.vezDeHumano()) {
      const validas = new Set(this.posicoesValidasNaRotacao(atual).map((p) => p.chave()));
      for (const p of this.partida.getBoard().posicoesDisponiveis()) {
        const [x, y] = [p.x * TAMANHO_PECA, p.y * TAMANHO_PECA];
        if (validas.has(p.chave())) {
          this.destaques.fillStyle(COR_VALIDA, 0.18).fillRect(x, y, TAMANHO_PECA, TAMANHO_PECA);
          this.destaques.lineStyle(2, COR_VALIDA, 0.9).strokeRect(x + 2, y + 2, TAMANHO_PECA - 4, TAMANHO_PECA - 4);
        } else {
          this.destaques.lineStyle(1, COR_DISPONIVEL, 0.6).strokeRect(x + 4, y + 4, TAMANHO_PECA - 8, TAMANHO_PECA - 8);
        }
      }
    }
    this.emitirEstado();
  }

  private registrar(texto: string): void {
    this.eventos = [texto, ...this.eventos].slice(0, MAXIMO_DE_EVENTOS);
  }

  private desenharPeca(tile: Tile): void {
    const p = tile.getPosicao()!;
    desenharTile(this.add.graphics(), tile, p.x * TAMANHO_PECA, p.y * TAMANHO_PECA, TAMANHO_PECA);
  }

  // Pontos discretos marcando a grade, numa área grande em volta do centro.
  private desenharGrade(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.08);
    for (let gx = -40; gx <= 40; gx++) {
      for (let gy = -40; gy <= 40; gy++) {
        g.fillCircle(gx * TAMANHO_PECA, gy * TAMANHO_PECA, 1.5);
      }
    }
  }

  private posicaoSobPonteiro(ponteiro: Phaser.Input.Pointer): Position {
    const mundo = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
    return new Position(Math.floor(mundo.x / TAMANHO_PECA), Math.floor(mundo.y / TAMANHO_PECA));
  }

  // Clique coloca, arrastar move a câmera, roda do mouse dá zoom, botão direito gira.
  private configurarEntrada(): void {
    this.input.mouse?.disableContextMenu();
    const naAreaDoTabuleiro = (p: Phaser.Input.Pointer) => p.x < LARGURA_TABULEIRO;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!naAreaDoTabuleiro(p)) return;
      if (p.rightButtonDown()) {
        this.girar();
        return;
      }
      this.inicioDoToque = { x: p.x, y: p.y };
      this.arrastando = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const camera = this.cameras.main;
      if (p.isDown && this.inicioDoToque) {
        const distancia = Phaser.Math.Distance.Between(p.x, p.y, this.inicioDoToque.x, this.inicioDoToque.y);
        if (distancia > DISTANCIA_PARA_ARRASTAR) this.arrastando = true;
        if (this.arrastando) {
          camera.scrollX -= (p.x - p.prevPosition.x) / camera.zoom;
          camera.scrollY -= (p.y - p.prevPosition.y) / camera.zoom;
          this.fantasma.clear();
        }
        return;
      }
      this.mostrarFantasma(naAreaDoTabuleiro(p) ? this.posicaoSobPonteiro(p) : null);
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.inicioDoToque && !this.arrastando && naAreaDoTabuleiro(p)) {
        this.colocarEm(this.posicaoSobPonteiro(p));
      }
      this.inicioDoToque = null;
      this.arrastando = false;
    });

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _objetos: unknown, _dx: number, dy: number) => {
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * (dy > 0 ? 0.9 : 1.1), 0.35, 2));
    });

    this.input.keyboard?.on('keydown-R', () => this.girar());
    this.input.keyboard?.on('keydown-C', () => this.centralizar());
    this.input.keyboard?.on('keydown-ESC', () => this.voltarAoMenu());
  }

  // Prévia da peça atual sob o ponteiro, só na vez de um humano e onde ela encaixa.
  private mostrarFantasma(posicao: Position | null): void {
    this.fantasma.clear();
    const atual = this.partida.getPecaAtual();
    if (!posicao || !atual || !this.vezDeHumano()) return;
    if (!this.partida.getBoard().podeColocar(atual, new Jogada(posicao, atual.getRotacao()))) return;
    desenharTile(this.fantasma, atual, posicao.x * TAMANHO_PECA, posicao.y * TAMANHO_PECA, TAMANHO_PECA);
  }
}
