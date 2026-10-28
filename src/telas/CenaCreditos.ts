import Phaser from 'phaser';
import {
  ARQUIVO_DA_CAPA,
  CAPA_DO_MENU,
  CENAS,
  CORES_DOS_JOGADORES,
  COR_ESCURA,
  CREME,
  CREME_FRACO,
  FONTE_TITULO,
  LARANJA,
  criarBotaoMenu,
  desenharArco,
  desenharAvatar,
  desenharFaixaDeColonia,
  desenharFundoDaCapa,
  estilo,
} from './ui';

const EQUIPE = ['Gustavo Henrique', 'Lucca Chatack', 'Paulo Rosa', 'Pedro Sixel', 'Vitor Lemos'];
const FERRAMENTAS = ['TypeScript', 'Phaser 4', 'Vite', 'Vitest'];

const CX = 640;
const CARTAO = { largura: 167, altura: 111, espaco: 15, y: 295 };

function rotuloDeSecao(cena: Phaser.Scene, y: number, texto: string): void {
  cena.add.text(CX, y, texto, estilo(13, LARANJA, true, FONTE_TITULO)).setLetterSpacing(5).setOrigin(0.5);
}

export class CenaCreditos extends Phaser.Scene {
  constructor() {
    super(CENAS.creditos);
  }

  // A capa já vem carregada do menu; carregar de novo não repete o download.
  preload(): void {
    this.load.image(CAPA_DO_MENU, ARQUIVO_DA_CAPA);
  }

  create(): void {
    desenharFundoDaCapa(this);
    criarBotaoMenu(this);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(CENAS.menu));

    this.desenharLogotipo();
    this.desenharEquipe();
    this.desenharFerramentas();

    // Uma fileira de peças encaixadas, numa moldura.
    const tamanho = 64;
    const x = CX - (5 * tamanho) / 2;
    desenharFaixaDeColonia(this, x, 514, tamanho);
    this.add.graphics().lineStyle(1.5, 0x000000, 0.6).strokeRoundedRect(x, 514, 5 * tamanho, tamanho, 3);

    this.add.text(CX, 689, 'Versão 0.1.0', estilo(12, CREME_FRACO, true)).setOrigin(0.5).setAlpha(0.8);
  }

  private desenharLogotipo(): void {
    rotuloDeSecao(this, 45, 'CRÉDITOS');
    this.add
      .text(CX, 92, 'MARS', estilo(72, CREME, true, FONTE_TITULO))
      .setOrigin(0.5)
      .setShadow(0, 3, '#000000', 10, false, true);
    desenharArco(this, [465, 158], [640, 128], [807, 148], 5);
    this.add
      .text(CX + 4, 171, 'CONQUEST', estilo(26, CREME, true, FONTE_TITULO))
      .setLetterSpacing(9)
      .setOrigin(0.5)
      .setShadow(0, 2, '#000000', 6, false, true);

    this.add.text(CX, 210, 'Jogo de colocação de peças baseado no Carcassonne', estilo(15, CREME_FRACO, true)).setOrigin(0.5);
    this.add.text(CX, 233, 'Projeto acadêmico · disciplina de Projeto de Software', estilo(15, CREME_FRACO, true)).setOrigin(0.5);
  }

  private desenharEquipe(): void {
    rotuloDeSecao(this, 275, 'TRIPULAÇÃO');
    const { largura, altura, espaco, y } = CARTAO;
    const x0 = CX - (EQUIPE.length * largura + (EQUIPE.length - 1) * espaco) / 2;
    const g = this.add.graphics();
    EQUIPE.forEach((nome, i) => {
      const x = x0 + i * (largura + espaco);
      g.fillStyle(COR_ESCURA, 0.78).fillRoundedRect(x, y, largura, altura, 10);
      g.lineStyle(1, 0xffffff, 0.12).strokeRoundedRect(x, y, largura, altura, 10);
      desenharAvatar(g, x + largura / 2, y + 42, CORES_DOS_JOGADORES[i], 1, 1.2);
      this.add.text(x + largura / 2, y + 85, nome, estilo(15, CREME, true)).setOrigin(0.5);
    });
  }

  private desenharFerramentas(): void {
    rotuloDeSecao(this, 436, 'FEITO COM');
    const rotulos = FERRAMENTAS.map((nome) => this.add.text(0, 470, nome, estilo(14, CREME, true)).setOrigin(0.5).setDepth(1));
    const larguras = rotulos.map((r) => r.width + 30);
    const espaco = 10;
    let x = CX - (larguras.reduce((a, b) => a + b, 0) + espaco * (rotulos.length - 1)) / 2;
    const g = this.add.graphics();
    rotulos.forEach((rotulo, i) => {
      g.fillStyle(0x1c120e, 0.85).fillRoundedRect(x, 454, larguras[i], 32, 16);
      g.lineStyle(1, 0xffffff, 0.12).strokeRoundedRect(x, 454, larguras[i], 32, 16);
      rotulo.setX(x + larguras[i] / 2);
      x += larguras[i] + espaco;
    });
  }
}
