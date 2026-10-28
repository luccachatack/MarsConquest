import Phaser from 'phaser';
import { CENAS, COR_TEXTO_FRACO, COR_TITULO, criarBotao, desenharFaixaDeColonia, estilo } from './ui';

const LARGURA = 1280;
const ALTURA = 720;

export class CenaMenu extends Phaser.Scene {
  private aviso!: Phaser.GameObjects.Text;

  constructor() {
    super(CENAS.menu);
  }

  create(): void {
    this.desenharCeu();
    this.desenharPlaneta();
    desenharFaixaDeColonia(this, 60, 600, 64);

    this.add.text(LARGURA / 2, 150, 'COLÔNIA MARTE', estilo(64, COR_TITULO, true)).setOrigin(0.5);
    this.add
      .text(LARGURA / 2, 214, 'Construa uma base em Marte, peça por peça.', estilo(18, COR_TEXTO_FRACO))
      .setOrigin(0.5);

    const largura = 300;
    const x = (LARGURA - largura) / 2;
    const opcoes: [string, () => void][] = [
      ['Jogar', () => this.mostrarAviso()],
      ['Peças', () => this.scene.start(CENAS.pecas)],
      ['Regras', () => this.scene.start(CENAS.regras)],
      ['Créditos', () => this.scene.start(CENAS.creditos)],
    ];
    opcoes.forEach(([texto, acao], i) => criarBotao(this, x, 270 + i * 72, largura, 56, texto, acao, 20));

    this.aviso = this.add
      .text(LARGURA / 2, 568, 'O modo de jogo ainda está em construção.', estilo(15, COR_TITULO))
      .setOrigin(0.5)
      .setAlpha(0);

    this.add.text(LARGURA - 24, ALTURA - 20, 'v0.1.0 · Projeto de Software', estilo(12, COR_TEXTO_FRACO)).setOrigin(1, 1);
  }

  private mostrarAviso(): void {
    this.tweens.killTweensOf(this.aviso);
    this.aviso.setAlpha(1);
    this.tweens.add({ targets: this.aviso, alpha: 0, delay: 1800, duration: 600 });
  }

  // Estrelas em posições fixas (gerador com semente), para o fundo não mudar a cada visita.
  private desenharCeu(): void {
    let semente = 20261027;
    const aleatorio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    const g = this.add.graphics();
    for (let i = 0; i < 140; i++) {
      g.fillStyle(0xffffff, 0.25 + aleatorio() * 0.6);
      g.fillCircle(aleatorio() * LARGURA, aleatorio() * ALTURA, aleatorio() < 0.9 ? 1 : 2);
    }
  }

  private desenharPlaneta(): void {
    const g = this.add.graphics();
    const [cx, cy, r] = [1150, 720, 330];
    g.fillStyle(0xd9703f, 0.12).fillCircle(cx, cy, r + 26);
    g.fillStyle(0xb4492a, 1).fillCircle(cx, cy, r);
    g.fillStyle(0x9c3c22, 1);
    g.fillCircle(cx - 160, cy - 200, 34);
    g.fillCircle(cx - 40, cy - 250, 18);
    g.fillCircle(cx - 230, cy - 90, 22);
    g.fillCircle(cx + 40, cy - 150, 46);
    g.fillCircle(cx - 110, cy - 60, 14);
  }
}
