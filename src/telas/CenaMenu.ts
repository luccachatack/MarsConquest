import Phaser from 'phaser';
import { carregarArteDasPecas } from './desenharPeca';
import { ARQUIVO_DA_CAPA, CAPA_DO_MENU as CAPA, CENAS, estilo } from './ui';

const LARGURA = 1280;
const ALTURA = 720;

// Botões já desenhados na arte da capa, em pixels da imagem original (1649 × 954).
const BOTOES: { x0: number; y0: number; x1: number; y1: number; cena: string }[] = [
  { x0: 632, y0: 390, x1: 1019, y1: 481, cena: CENAS.preparacao },
  { x0: 632, y0: 497, x1: 1019, y1: 588, cena: CENAS.pecas },
  { x0: 632, y0: 602, x1: 1019, y1: 692, cena: CENAS.regras },
  { x0: 632, y0: 706, x1: 1019, y1: 796, cena: CENAS.creditos },
];
const AUMENTO_AO_PASSAR = 1.06;

// Menu principal: a arte da capa ocupa a tela toda, e os botões pintados nela são clicáveis.
export class CenaMenu extends Phaser.Scene {
  constructor() {
    super(CENAS.menu);
  }

  preload(): void {
    this.load.image(CAPA, ARQUIVO_DA_CAPA);
    // A arte das peças fica carregada para o jogo todo: todas as telas passam pelo menu.
    carregarArteDasPecas(this);
  }

  create(): void {
    const capa = this.add.image(LARGURA / 2, ALTURA / 2, CAPA);
    // Cobre a tela inteira: a imagem é um pouco mais alta que 16:9, então sobra um pouco em cima e embaixo.
    const escala = Math.max(LARGURA / capa.width, ALTURA / capa.height);
    capa.setScale(escala);
    const naTela = (x: number, y: number) => ({
      x: LARGURA / 2 + (x - capa.width / 2) * escala,
      y: ALTURA / 2 + (y - capa.height / 2) * escala,
    });

    for (const { x0, y0, x1, y1, cena } of BOTOES) {
      const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
      const centro = naTela(cx, cy);
      // Uma cópia só do pedaço do botão, por cima da capa, para ele poder crescer sozinho.
      const botao = this.add
        .image(centro.x, centro.y, CAPA)
        .setCrop(x0, y0, x1 - x0, y1 - y0)
        .setOrigin(cx / capa.width, cy / capa.height)
        .setScale(escala);
      const brilho = this.add.graphics().setVisible(false);
      const [largura, altura] = [(x1 - x0) * escala, (y1 - y0) * escala];
      brilho
        .lineStyle(3, 0xffd9a0, 0.9)
        .strokeRoundedRect(centro.x - (largura * AUMENTO_AO_PASSAR) / 2, centro.y - (altura * AUMENTO_AO_PASSAR) / 2,
          largura * AUMENTO_AO_PASSAR, altura * AUMENTO_AO_PASSAR, 10);

      const crescer = (fator: number) =>
        this.tweens.add({ targets: botao, scale: escala * fator, duration: 120, ease: 'Quad.easeOut' });
      this.add
        .zone(centro.x, centro.y, largura, altura)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          crescer(AUMENTO_AO_PASSAR);
          brilho.setVisible(true);
        })
        .on('pointerout', () => {
          crescer(1);
          brilho.setVisible(false);
        })
        .on('pointerdown', () => crescer(0.97))
        .on('pointerup', () => this.scene.start(cena));
    }

    this.criarBotaoSlides();

    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start(CENAS.preparacao));
    this.input.keyboard?.on('keydown-S', () => this.scene.start(CENAS.slides));
    this.add
      .text(LARGURA - 16, ALTURA - 12, 'v0.1.0 · Projeto de Software', { ...estilo(12, '#f3e3cf'), stroke: '#2a1a12', strokeThickness: 3 })
      .setOrigin(1, 1)
      .setAlpha(0.8);
  }

  // O botão SLIDES não está pintado na capa: é desenhado no mesmo estilo, no canto inferior esquerdo.
  private criarBotaoSlides(): void {
    const [cx, cy, largura, altura] = [108, 643, 124, 48];
    const fundo = this.add
      .graphics()
      .fillStyle(0x000000, 0.35)
      .fillRoundedRect(-largura / 2 + 2, -altura / 2 + 4, largura, altura, 9)
      .fillStyle(0x3b2a22, 0.95)
      .fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 9)
      .lineStyle(1.5, 0x6e5444, 1)
      .strokeRoundedRect(-largura / 2, -altura / 2, largura, altura, 9);
    // Ícone: um quadro de apresentação no cavalete.
    const icone = this.add
      .graphics()
      .lineStyle(2, 0xf3e3cf, 1)
      .strokeRoundedRect(-45, -11, 22, 14, 2)
      .lineBetween(-34, 3, -34, 9)
      .lineBetween(-39, 12, -34, 9)
      .lineBetween(-29, 12, -34, 9);
    const texto = this.add.text(-14, 0, 'SLIDES', estilo(17, '#f3e3cf', true)).setLetterSpacing(2).setOrigin(0, 0.5);
    const brilho = this.add
      .graphics()
      .lineStyle(3, 0xffd9a0, 0.9)
      .strokeRoundedRect((-largura * AUMENTO_AO_PASSAR) / 2, (-altura * AUMENTO_AO_PASSAR) / 2,
        largura * AUMENTO_AO_PASSAR, altura * AUMENTO_AO_PASSAR, 10)
      .setVisible(false);
    const botao = this.add.container(cx, cy, [fundo, icone, texto, brilho]);

    const crescer = (fator: number) => this.tweens.add({ targets: botao, scale: fator, duration: 120, ease: 'Quad.easeOut' });
    this.add
      .zone(cx, cy, largura, altura)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        crescer(AUMENTO_AO_PASSAR);
        brilho.setVisible(true);
      })
      .on('pointerout', () => {
        crescer(1);
        brilho.setVisible(false);
      })
      .on('pointerdown', () => crescer(0.97))
      .on('pointerup', () => this.scene.start(CENAS.slides));
  }
}
