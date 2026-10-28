import Phaser from 'phaser';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../jogo/catalogoDeTiles';
import { Direction } from '../jogo/Direction';
import { pontosDoLado } from '../jogo/PontosDeBorda';
import { Terrain } from '../jogo/Terrain';
import type { Tile } from '../jogo/Tile';
import type { TileDeck } from '../jogo/TileDeck';
import { TileFactory } from '../jogo/TileFactory';
import { criarPeca, desenharPeca } from './desenharPeca';
import { CORES } from './desenharTile';
import {
  CENAS,
  COR_DESTAQUE,
  COR_PAINEL,
  COR_TEXTO,
  COR_TEXTO_FRACO,
  criarBotao,
  criarCabecalho,
  estilo,
  nomeDaPeca,
} from './ui';

const NOMES_TERRENO: Record<Terrain, string> = {
  [Terrain.HABITAT]: 'habitat',
  [Terrain.PIPE]: 'duto',
  [Terrain.SOIL]: 'solo',
  [Terrain.GREENHOUSE]: 'estufa',
};

const SIGLAS_LADO: [Direction, string][] = [
  [Direction.NORTH, 'N'],
  [Direction.EAST, 'L'],
  [Direction.SOUTH, 'S'],
  [Direction.WEST, 'O'],
];

// O ponto do meio basta para saber o terreno do lado.
function descreverLado(tile: Tile, d: Direction): string {
  return NOMES_TERRENO[tile.getTerrenoNoPonto(pontosDoLado(d)[1])];
}

// Posição e tamanho da peça grande no painel do baralho.
const X_ATUAL = 960;
const Y_ATUAL = 110;
const TAMANHO_ATUAL = 200;

// Tela "Peças": mostra o catálogo e o baralho usando só as classes de src/jogo.
export class CenaCatalogo extends Phaser.Scene {
  private baralho!: TileDeck;
  private atual!: Tile;
  private origemAtual = '';
  private desenhoAtual!: Phaser.GameObjects.Container;
  private textoRestantes!: Phaser.GameObjects.Text;
  private textoNome!: Phaser.GameObjects.Text;
  private textoDetalhes!: Phaser.GameObjects.Text;
  private textoComprar!: Phaser.GameObjects.Text;

  constructor() {
    super(CENAS.pecas);
  }

  create(): void {
    criarCabecalho(this, 'Peças', 'Clique numa peça para girá-la.');

    this.criarCatalogo();
    this.criarPainelDoBaralho();
    this.criarLegenda();
    this.novoBaralho();

    this.input.keyboard?.on('keydown-R', () => this.girarAtual());
    this.input.keyboard?.on('keydown-SPACE', () => this.comprar());
  }

  private criarCatalogo(): void {
    const colunas = 6;
    const largura = 135;
    const altura = 150;
    const tamanho = 96;
    const fabrica = new TileFactory();

    CATALOGO_DE_TILES.forEach(({ definicao, quantidade }, i) => {
      const cx = 40 + (i % colunas) * largura;
      const cy = 104 + Math.floor(i / colunas) * altura;
      const x = cx + (largura - tamanho) / 2 - 8;
      const tile = fabrica.criarTile(definicao);

      const destaque = this.add.graphics();
      const desenho = criarPeca(this, tile, x, cy, tamanho);

      const rotulo = this.add.text(x + tamanho / 2, cy + tamanho + 6, `${nomeDaPeca(definicao.id)}  ×${quantidade}`, {
        ...estilo(12, COR_TEXTO_FRACO),
        align: 'center',
        wordWrap: { width: largura - 12 },
      });
      rotulo.setOrigin(0.5, 0);

      const area = this.add.zone(x, cy, tamanho, tamanho).setOrigin(0).setInteractive({ useHandCursor: true });
      area.on('pointerover', () => {
        destaque.clear().lineStyle(3, COR_DESTAQUE, 1).strokeRect(x - 3, cy - 3, tamanho + 6, tamanho + 6);
        rotulo.setColor(COR_TEXTO);
      });
      area.on('pointerout', () => {
        destaque.clear();
        rotulo.setColor(COR_TEXTO_FRACO);
      });
      area.on('pointerdown', () => {
        tile.rotacionar();
        desenho.removeAll(true);
        desenharPeca(this, desenho, tile, x, cy, tamanho);
      });
    });
  }

  private criarPainelDoBaralho(): void {
    const x0 = 880;
    const largura = 360;
    this.add.graphics().fillStyle(COR_PAINEL, 1).fillRoundedRect(x0, 26, largura, 560, 12);

    this.add.text(x0 + 24, 44, 'Baralho', estilo(22, COR_TEXTO, true));
    this.textoRestantes = this.add.text(x0 + 24, 76, '', estilo(15, COR_TEXTO_FRACO));

    this.desenhoAtual = this.add.container(0, 0);
    this.add
      .zone(X_ATUAL, Y_ATUAL, TAMANHO_ATUAL, TAMANHO_ATUAL)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.girarAtual());

    const yTexto = Y_ATUAL + TAMANHO_ATUAL;
    this.textoNome = this.add.text(x0 + 24, yTexto + 16, '', estilo(18, COR_TEXTO, true));
    this.textoDetalhes = this.add.text(x0 + 24, yTexto + 46, '', {
      ...estilo(14, COR_TEXTO_FRACO),
      lineSpacing: 6,
      wordWrap: { width: largura - 48 },
    });

    this.textoComprar = criarBotao(this, x0 + 24, 520, 150, 44, 'Comprar peça', () => this.comprar());
    criarBotao(this, x0 + 186, 520, 150, 44, 'Novo baralho', () => this.novoBaralho());
  }

  private criarLegenda(): void {
    const itens: [number, string][] = [
      [CORES.habitat, 'Habitat'],
      [CORES.duto, 'Duto'],
      [CORES.solo, 'Solo'],
      [CORES.estufa, 'Estufa'],
      [CORES.cristal, 'Cristal'],
    ];
    const g = this.add.graphics();
    itens.forEach(([cor, nome], i) => {
      const x = 880 + (i % 3) * 120;
      const y = 612 + Math.floor(i / 3) * 30;
      g.fillStyle(cor, 1).fillRoundedRect(x, y, 18, 18, 4);
      this.add.text(x + 26, y, nome, estilo(14, COR_TEXTO_FRACO));
    });
    this.add.text(880, 676, 'Teclas: R gira · Espaço compra · Esc volta', estilo(13, COR_TEXTO_FRACO));
  }

  private novoBaralho(): void {
    this.baralho = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL);
    this.mostrar(this.baralho.getTileInicial(), 'Peça inicial');
  }

  private comprar(): void {
    const tile = this.baralho.comprarTile();
    if (tile) {
      this.mostrar(tile, 'Peça comprada');
    }
  }

  private girarAtual(): void {
    this.atual.rotacionar();
    this.mostrar(this.atual);
  }

  private mostrar(tile: Tile, origem?: string): void {
    this.atual = tile;
    if (origem) {
      this.origemAtual = origem;
    }

    this.desenhoAtual.removeAll(true);
    desenharPeca(this, this.desenhoAtual, tile, X_ATUAL, Y_ATUAL, TAMANHO_ATUAL);

    const definicao = tile.getDefinicao();
    this.textoNome.setText(nomeDaPeca(definicao.id));

    const lados = SIGLAS_LADO.map(([d, sigla]) => `${sigla}: ${descreverLado(tile, d)}`).join(' · ');
    const extras = [definicao.temEstufa() && 'estufa', definicao.temCristal() && 'cristal'].filter(Boolean);
    this.textoDetalhes.setText(
      [
        `${this.origemAtual} · ${tile.id} · rotação ${tile.getRotacao() * 90}°`,
        `Lados: ${lados}`,
        `Regiões: ${tile.getRegioes().length}${extras.length ? ` · tem ${extras.join(' e ')}` : ''}`,
      ].join('\n'),
    );

    const restantes = this.baralho.quantidadeRestante();
    this.textoRestantes.setText(restantes === 0 ? 'Baralho vazio' : `Restam ${restantes} peças na pilha`);
    this.textoComprar.setText(restantes === 0 ? 'Acabou' : 'Comprar peça');
  }
}
