import Phaser from 'phaser';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../jogo/catalogoDeTiles';
import { Tile } from '../jogo/Tile';
import { ARTE_DAS_PECAS, CHAVE_DAS_PECAS, desenharPeca } from './desenharPeca';
import { CORES } from './desenharTile';
import {
  CENAS,
  COR_ESCURA,
  COR_LARANJA,
  CREME,
  CREME_FRACO,
  criarTituloDaTela,
  desenharFundoPontilhado,
  estilo,
} from './ui';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWX';

// Nome e detalhe de cada peça no cartão.
const NOMES: Record<string, [string, string]> = {
  'estufa-duto': ['Estufa', 'com duto'],
  estufa: ['Estufa', 'isolada'],
  cupula: ['Cúpula', 'com cristal'],
  'habitat-lado-duto-reto': ['Habitat', 'duto reto'],
  'habitat-lado': ['Habitat', 'um lado'],
  'habitat-ponte-cristal': ['Habitat ponte', 'com cristal'],
  'habitat-ponte': ['Habitat ponte', 'sem cristal'],
  'habitats-opostos': ['Dois habitats', 'lados opostos'],
  'habitats-vizinhos': ['Dois habitats', 'lados vizinhos'],
  'habitat-lado-curva-leste': ['Habitat', 'duto em curva a leste'],
  'habitat-lado-curva-oeste': ['Habitat', 'duto em curva a oeste'],
  'habitat-lado-juncao': ['Habitat', 'junção'],
  'habitat-canto-cristal': ['Habitat de canto', 'com cristal'],
  'habitat-canto': ['Habitat de canto', 'sem cristal'],
  'habitat-canto-duto-cristal': ['Habitat de canto', 'cristal · duto'],
  'habitat-canto-duto': ['Habitat de canto', 'com duto'],
  'habitat-tres-lados-cristal': ['Habitat 3 lados', 'com cristal'],
  'habitat-tres-lados': ['Habitat 3 lados', 'sem cristal'],
  'habitat-tres-lados-duto-cristal': ['Habitat 3 lados', 'cristal · duto'],
  'habitat-tres-lados-duto': ['Habitat 3 lados', 'com duto'],
  'duto-reto': ['Duto reto', 'solo'],
  'duto-curva': ['Duto curva', 'solo'],
  'juncao-tres': ['Junção', '3 saídas'],
  'juncao-quatro': ['Junção', '4 saídas'],
};

// [título, detalhe, quadro da folha, recorte (x, y, lado) dentro do quadro, cor sem a folha]
const LEGENDA: [string, string, number, [number, number, number], number][] = [
  ['Habitat', 'no Carcassonne: cidade', 4, [64, 0, 128], CORES.habitat],
  ['Cristal', 'no Carcassonne: brasão', 2, [160, 20, 64], CORES.cristal],
  ['Duto', 'no Carcassonne: estrada', 22, [0, 80, 96], CORES.duto],
  ['Junção', 'termina os dutos', 22, [96, 96, 64], CORES.duto],
  ['Estufa', 'no Carcassonne: mosteiro', 1, [48, 48, 160], CORES.estufa],
  ['Solo', 'no Carcassonne: campo', 4, [128, 128, 128], CORES.solo],
];

const GRADE = { x: 40, y: 118, colunas: 8, largura: 141, altura: 168, espaco: 10 };
const TAMANHO_DA_PECA = 100;

// Tela "Peças": os 24 tipos do catálogo como na folha de arte. Clicar numa peça gira a peça.
export class CenaCatalogo extends Phaser.Scene {
  constructor() {
    super(CENAS.pecas);
  }

  create(): void {
    desenharFundoPontilhado(this);
    criarTituloDaTela(this, 'Peças do tabuleiro');

    const total = CATALOGO_DE_TILES.reduce((soma, e) => soma + e.quantidade, 0);
    this.add
      .text(
        1240,
        34,
        `${CATALOGO_DE_TILES.length} tipos e ${total} peças, no mesmo esquema do Carcassonne. A letra é o código do tipo, ` +
          'e o número, quantas cópias vão no baralho. Clique numa peça para girá-la.',
        { ...estilo(13, CREME_FRACO, true), align: 'right', lineSpacing: 5, wordWrap: { width: 560 } },
      )
      .setOrigin(1, 0);

    const ordenadas = [...CATALOGO_DE_TILES].sort((a, b) => ARTE_DAS_PECAS[a.definicao.id].quadro - ARTE_DAS_PECAS[b.definicao.id].quadro);
    ordenadas.forEach((entrada, i) => this.criarCartao(entrada.definicao.id, entrada.quantidade, i));
    this.criarLegenda();
  }

  private criarCartao(id: string, quantidade: number, i: number): void {
    const { colunas, largura, altura, espaco } = GRADE;
    const x = GRADE.x + (i % colunas) * (largura + espaco);
    const y = GRADE.y + Math.floor(i / colunas) * (altura + espaco);
    const inicial = id === ID_TILE_INICIAL;
    const arte = ARTE_DAS_PECAS[id];

    const fundo = this.add.graphics();
    const pintar = (sobre: boolean) => {
      fundo.clear().fillStyle(COR_ESCURA, sobre ? 0.9 : 0.7).fillRoundedRect(x, y, largura, altura, 10);
      fundo.lineStyle(1, sobre ? COR_LARANJA : 0xffffff, sobre ? 0.7 : 0.08).strokeRoundedRect(x, y, largura, altura, 10);
    };
    pintar(false);

    // Girada para mostrar o quadro como está na folha.
    const definicao = CATALOGO_DE_TILES.find((e) => e.definicao.id === id)!.definicao;
    const tile = new Tile(`catalogo-${id}`, definicao);
    tile.definirRotacao((4 - arte.giro) % 4);
    const xPeca = x + (largura - TAMANHO_DA_PECA) / 2;
    const yPeca = y + 22;
    const desenho = this.add.container(0, 0);
    desenharPeca(this, desenho, tile, xPeca, yPeca, TAMANHO_DA_PECA);

    this.add.graphics().fillStyle(0x1b100c, 0.92).fillRoundedRect(x + 8, y + 8, 20, 19, 5);
    this.add.text(x + 18, y + 17.5, LETRAS[arte.quadro], estilo(12, CREME, true)).setOrigin(0.5);
    this.add.text(x + largura - 9, y + 13, `×${quantidade}`, estilo(12, CREME_FRACO, true)).setOrigin(1, 0.5);

    const [nome, detalhe] = NOMES[id] ?? [id, ''];
    this.add.text(x + largura / 2, y + 137, nome, estilo(13, CREME, true)).setOrigin(0.5);
    this.add
      .text(x + largura / 2, y + 155, inicial ? `${detalhe} · inicial` : detalhe, estilo(11, CREME_FRACO))
      .setOrigin(0.5);

    this.add
      .zone(x, y, largura, altura)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => pintar(true))
      .on('pointerout', () => pintar(false))
      .on('pointerdown', () => {
        tile.rotacionar();
        desenho.removeAll(true);
        desenharPeca(this, desenho, tile, xPeca, yPeca, TAMANHO_DA_PECA);
      });
  }

  private criarLegenda(): void {
    const [x0, y0, largura, altura] = [40, 654, 1200, 54];
    this.add
      .graphics()
      .fillStyle(0x24160f, 0.85)
      .fillRoundedRect(x0, y0, largura, altura, 12)
      .lineStyle(1, 0xffffff, 0.08)
      .strokeRoundedRect(x0, y0, largura, altura, 12);

    const passo = largura / LEGENDA.length;
    LEGENDA.forEach(([titulo, detalhe, quadro, [cx, cy, lado], cor], i) => {
      const x = x0 + 18 + i * passo;
      const y = y0 + 9;
      const icone = 36;
      if (this.textures.exists(CHAVE_DAS_PECAS)) {
        const escala = icone / lado;
        this.add.image(x - cx * escala, y - cy * escala, CHAVE_DAS_PECAS, quadro).setOrigin(0).setScale(escala).setCrop(cx, cy, lado, lado);
      } else {
        this.add.graphics().fillStyle(cor, 1).fillRect(x, y, icone, icone);
      }
      this.add.graphics().lineStyle(1, 0x000000, 0.5).strokeRect(x, y, icone, icone);
      this.add.text(x + 48, y + 9, titulo, estilo(13, CREME, true)).setOrigin(0, 0.5);
      this.add.text(x + 48, y + 27, detalhe, estilo(11, CREME_FRACO)).setOrigin(0, 0.5);
    });
  }
}
