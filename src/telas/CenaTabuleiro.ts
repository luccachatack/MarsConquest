import Phaser from 'phaser';
import { Board } from '../jogo/Board';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../jogo/catalogoDeTiles';
import type { Feature } from '../jogo/Feature';
import { Jogada } from '../jogo/Jogada';
import { Position } from '../jogo/Position';
import { Terrain } from '../jogo/Terrain';
import type { Tile } from '../jogo/Tile';
import type { TileDeck } from '../jogo/TileDeck';
import { TileFactory } from '../jogo/TileFactory';
import { desenharTile } from './desenharTile';
import { CENAS, COR_DESTAQUE, nomeDaPeca } from './ui';

export const TAMANHO_PECA = 96;
// Largura da área do tabuleiro; à direita fica o painel (CenaPainelTabuleiro).
export const LARGURA_TABULEIRO = 900;

const COR_VALIDA = 0x5fd38d;
const COR_DISPONIVEL = 0x5d6878;
const DISTANCIA_PARA_ARRASTAR = 6;

export interface EstadoDoTabuleiro {
  readonly atual: Tile | undefined;
  readonly restantes: number;
  readonly colocadas: number;
  readonly descartadas: number;
  readonly posicoesValidasNaRotacao: number;
  readonly eventos: readonly string[];
}

function descreverConclusao(f: Feature): string {
  const pecas = f.quantidadeDeTiles();
  if (f.tipo === Terrain.HABITAT) {
    const cristais = f.quantidadeDeCristais();
    return `Habitat fechado com ${pecas} peças${cristais ? ` e ${cristais} cristal(is)` : ''}.`;
  }
  return `Duto completo com ${pecas} peças.`;
}

// Modo de teste da fase 2: uma pessoa coloca as peças do baralho, uma por vez.
// Ainda não há jogadores, turnos, marcadores nem pontuação (fases 3 e 4).
export class CenaTabuleiro extends Phaser.Scene {
  private baralho!: TileDeck;
  private board!: Board;
  private atual: Tile | undefined;
  private descartadas = 0;
  private eventos: string[] = [];

  private destaques!: Phaser.GameObjects.Graphics;
  private fantasma!: Phaser.GameObjects.Graphics;
  private ultima!: Phaser.GameObjects.Graphics;
  private inicioDoToque: { x: number; y: number } | null = null;
  private arrastando = false;

  constructor() {
    super(CENAS.tabuleiro);
  }

  create(): void {
    this.descartadas = 0;
    this.eventos = [];
    this.baralho = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL);
    this.board = new Board(this.baralho.getTileInicial());

    const camera = this.cameras.main;
    camera.setViewport(0, 0, LARGURA_TABULEIRO, this.scale.height);
    this.centralizar();

    this.desenharGrade();
    this.desenharPeca(this.baralho.getTileInicial());
    // Camadas: peças (0) < destaques < prévia < contorno da última peça.
    this.destaques = this.add.graphics().setDepth(1);
    this.fantasma = this.add.graphics().setAlpha(0.6).setDepth(2);
    this.ultima = this.add.graphics().setDepth(3);

    this.configurarEntrada();
    this.scene.launch(CENAS.painelTabuleiro);
    this.registrar('A peça inicial está no centro. Coloque a próxima encostada nela.');
    this.proximaPeca();
  }

  // Chamados pelo painel.

  girar(): void {
    if (!this.atual) return;
    this.atual.rotacionar();
    this.fantasma.clear();
    this.atualizar();
  }

  centralizar(): void {
    this.cameras.main.setZoom(1).centerOn(TAMANHO_PECA / 2, TAMANHO_PECA / 2);
  }

  novaPartida(): void {
    this.scene.restart();
  }

  voltarAoMenu(): void {
    this.scene.stop(CENAS.painelTabuleiro);
    this.scene.start(CENAS.menu);
  }

  emitirEstado(): void {
    const atual = this.atual;
    const estado: EstadoDoTabuleiro = {
      atual,
      restantes: this.baralho.quantidadeRestante(),
      colocadas: this.board.quantidadeDeTiles(),
      descartadas: this.descartadas,
      posicoesValidasNaRotacao: atual ? this.posicoesValidasNaRotacao(atual).length : 0,
      eventos: this.eventos,
    };
    this.events.emit('estado', estado);
  }

  // Compra a próxima peça; descarta as que não cabem em lugar nenhum (RN13).
  private proximaPeca(): void {
    this.atual = this.baralho.comprarTile();
    while (this.atual && this.board.jogadasValidas(this.atual).length === 0) {
      this.descartadas++;
      this.registrar(`Peça "${nomeDaPeca(this.atual.getDefinicao().id)}" descartada: não cabe em lugar nenhum.`);
      this.atual = this.baralho.comprarTile();
    }
    if (!this.atual) {
      this.registrar(`Acabaram as peças: ${this.board.quantidadeDeTiles()} colocadas, ${this.descartadas} descartadas.`);
    }
    this.atualizar();
  }

  private colocarEm(posicao: Position): void {
    if (!this.atual) return;
    const jogada = new Jogada(posicao, this.atual.getRotacao());
    if (!this.board.podeColocar(this.atual, jogada)) return;

    const concluidas = this.board.colocar(this.atual, jogada);
    this.desenharPeca(this.atual);
    this.ultima
      .clear()
      .lineStyle(3, COR_DESTAQUE, 1)
      .strokeRect(posicao.x * TAMANHO_PECA, posicao.y * TAMANHO_PECA, TAMANHO_PECA, TAMANHO_PECA);
    this.fantasma.clear();
    for (const f of concluidas) {
      this.registrar(descreverConclusao(f));
    }
    this.proximaPeca();
  }

  private posicoesValidasNaRotacao(tile: Tile): Position[] {
    return this.board
      .posicoesDisponiveis()
      .filter((p) => this.board.podeColocar(tile, new Jogada(p, tile.getRotacao())));
  }

  private atualizar(): void {
    this.destaques.clear();
    if (this.atual) {
      const validas = new Set(this.posicoesValidasNaRotacao(this.atual).map((p) => p.chave()));
      for (const p of this.board.posicoesDisponiveis()) {
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
    this.eventos = [texto, ...this.eventos].slice(0, 5);
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

  // Prévia da peça atual sob o ponteiro, só onde ela encaixa na rotação atual.
  private mostrarFantasma(posicao: Position | null): void {
    this.fantasma.clear();
    if (!posicao || !this.atual) return;
    if (!this.board.podeColocar(this.atual, new Jogada(posicao, this.atual.getRotacao()))) return;
    desenharTile(this.fantasma, this.atual, posicao.x * TAMANHO_PECA, posicao.y * TAMANHO_PECA, TAMANHO_PECA);
  }
}
