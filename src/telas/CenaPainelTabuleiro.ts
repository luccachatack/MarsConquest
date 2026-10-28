import Phaser from 'phaser';
import { CenaTabuleiro, LARGURA_TABULEIRO, type EstadoDoTabuleiro } from './CenaTabuleiro';
import { desenharTile } from './desenharTile';
import { CENAS, COR_PAINEL, COR_TEXTO, COR_TEXTO_FRACO, COR_TITULO, criarBotao, estilo, nomeDaPeca } from './ui';

const X0 = LARGURA_TABULEIRO;
const LARGURA = 1280 - LARGURA_TABULEIRO;
const TAMANHO_PREVIA = 150;

// Painel fixo à direita do tabuleiro, numa cena por cima: o zoom da câmera do tabuleiro não o afeta.
export class CenaPainelTabuleiro extends Phaser.Scene {
  private tabuleiro!: CenaTabuleiro;
  private previa!: Phaser.GameObjects.Graphics;
  private textoPeca!: Phaser.GameObjects.Text;
  private textoContagem!: Phaser.GameObjects.Text;
  private textoEventos!: Phaser.GameObjects.Text;

  constructor() {
    super(CENAS.painelTabuleiro);
  }

  create(): void {
    this.tabuleiro = this.scene.get(CENAS.tabuleiro) as CenaTabuleiro;

    this.add.graphics().fillStyle(COR_PAINEL, 1).fillRect(X0, 0, LARGURA, this.scale.height);
    // Bloqueia cliques no painel de chegarem ao tabuleiro.
    this.add.zone(X0, 0, LARGURA, this.scale.height).setOrigin(0).setInteractive();

    const x = X0 + 24;
    criarBotao(this, x, 20, 100, 34, '← Menu', () => this.tabuleiro.voltarAoMenu(), 14);
    this.add.text(x, 70, 'Partida de teste', estilo(22, COR_TEXTO, true));
    this.add.text(x, 100, 'Só colocação de peças: sem jogadores e sem pontos.', {
      ...estilo(13, COR_TEXTO_FRACO),
      wordWrap: { width: LARGURA - 48 },
    });

    this.add.text(x, 140, 'Peça atual', estilo(14, COR_TITULO, true));
    this.previa = this.add.graphics();
    this.add
      .zone(x, 164, TAMANHO_PREVIA, TAMANHO_PREVIA)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tabuleiro.girar());
    this.textoPeca = this.add.text(x + TAMANHO_PREVIA + 16, 164, '', {
      ...estilo(13, COR_TEXTO_FRACO),
      lineSpacing: 4,
      wordWrap: { width: LARGURA - TAMANHO_PREVIA - 56 },
    });

    criarBotao(this, x, 330, 160, 40, 'Girar (R)', () => this.tabuleiro.girar());
    criarBotao(this, x + 172, 330, 160, 40, 'Centralizar (C)', () => this.tabuleiro.centralizar());

    this.textoContagem = this.add.text(x, 390, '', { ...estilo(14, COR_TEXTO), lineSpacing: 4 });

    this.add.text(x, 470, 'Acontecimentos', estilo(14, COR_TITULO, true));
    this.textoEventos = this.add.text(x, 494, '', {
      ...estilo(13, COR_TEXTO_FRACO),
      lineSpacing: 6,
      wordWrap: { width: LARGURA - 48 },
    });

    criarBotao(this, x, 646, 160, 36, 'Nova partida', () => this.tabuleiro.novaPartida(), 14);
    this.add.text(x + 172, 648, 'Arraste: mover\nRoda: zoom · Botão direito: girar', {
      ...estilo(11, COR_TEXTO_FRACO),
      lineSpacing: 2,
    });

    this.tabuleiro.events.on('estado', this.atualizar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tabuleiro.events.off('estado', this.atualizar, this));
    this.tabuleiro.emitirEstado();
  }

  private atualizar(estado: EstadoDoTabuleiro): void {
    const x = X0 + 24;
    this.previa.clear();
    if (estado.atual) {
      desenharTile(this.previa, estado.atual, x, 164, TAMANHO_PREVIA);
      const dica =
        estado.posicoesValidasNaRotacao === 0
          ? 'Não encaixa nesta rotação: gire a peça.'
          : `Encaixa em ${estado.posicoesValidasNaRotacao} lugar(es) nesta rotação.`;
      this.textoPeca.setText(
        `${nomeDaPeca(estado.atual.getDefinicao().id)}\nrotação ${estado.atual.getRotacao() * 90}°\n\n${dica}`,
      );
    } else {
      this.textoPeca.setText('Sem peças.\nComece uma nova partida.');
    }

    this.textoContagem.setText(
      `No baralho: ${estado.restantes}\nNo tabuleiro: ${estado.colocadas}\nDescartadas: ${estado.descartadas}`,
    );
    this.textoEventos.setText(estado.eventos.map((e) => `• ${e}`).join('\n'));
  }
}
