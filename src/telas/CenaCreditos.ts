import Phaser from 'phaser';
import { CENAS, COR_TEXTO, COR_TEXTO_FRACO, COR_TITULO, criarCabecalho, desenharFaixaDeColonia, estilo } from './ui';

const EQUIPE = ['Gustavo Henrique', 'Lucca Chatack', 'Paulo Rosa', 'Pedro Sixel', 'Vitor Lemos'];

export class CenaCreditos extends Phaser.Scene {
  constructor() {
    super(CENAS.creditos);
  }

  create(): void {
    criarCabecalho(this, 'Créditos');
    const cx = 640;

    this.add.text(cx, 130, 'COLÔNIA MARTE', estilo(40, COR_TITULO, true)).setOrigin(0.5);
    this.add.text(cx, 176, 'Jogo original de colocação de peças', estilo(16, COR_TEXTO_FRACO)).setOrigin(0.5);
    this.add.text(cx, 200, 'Projeto acadêmico · disciplina de Projeto de Software', estilo(16, COR_TEXTO_FRACO)).setOrigin(0.5);

    this.add.text(cx, 250, 'Equipe', estilo(20, COR_TEXTO, true)).setOrigin(0.5);
    EQUIPE.forEach((nome, i) => {
      this.add.text(cx, 286 + i * 30, nome, estilo(17, COR_TEXTO)).setOrigin(0.5);
    });

    this.add.text(cx, 456, 'Feito com', estilo(16, COR_TEXTO, true)).setOrigin(0.5);
    this.add.text(cx, 482, 'TypeScript · Phaser 4 · Vite · Vitest', estilo(15, COR_TEXTO_FRACO)).setOrigin(0.5);

    const tamanho = 64;
    desenharFaixaDeColonia(this, cx - (5 * tamanho) / 2, 540, tamanho);

    this.add.text(cx, 690, 'Versão 0.1.0', estilo(12, COR_TEXTO_FRACO)).setOrigin(0.5);
  }
}
