import Phaser from 'phaser';
import { MAX_JOGADORES } from '../jogo/Jogador';
import type { Colocacao } from '../jogo/Partida';
import { CenaTabuleiro, LARGURA_TABULEIRO, type EstadoDoTabuleiro } from './CenaTabuleiro';
import { desenharTile } from './desenharTile';
import {
  CENAS,
  COR_PAINEL,
  COR_TEXTO,
  COR_TEXTO_FRACO,
  COR_TITULO,
  NOMES_DOS_TIPOS,
  corCss,
  criarBotao,
  estilo,
  nomeDaPeca,
} from './ui';

const X0 = LARGURA_TABULEIRO;
const LARGURA = 1280 - LARGURA_TABULEIRO;
const MARGEM = 24;
const LARGURA_UTIL = LARGURA - 2 * MARGEM;
const TAMANHO_PREVIA = 110;
const Y_PLACAR = 86;
const ALTURA_LINHA = 34;
const Y_PREVIA = 294;
const COR_LINHA_DA_VEZ = 0x2c313d;

interface LinhaDoPlacar {
  fundo: Phaser.GameObjects.Graphics;
  nome: Phaser.GameObjects.Text;
  tipo: Phaser.GameObjects.Text;
  pontos: Phaser.GameObjects.Text;
}

// Painel fixo à direita do tabuleiro, numa cena por cima: o zoom da câmera do tabuleiro não o afeta.
export class CenaPainelTabuleiro extends Phaser.Scene {
  private tabuleiro!: CenaTabuleiro;
  private linhas: LinhaDoPlacar[] = [];
  private textoBaralho!: Phaser.GameObjects.Text;
  private textoVez!: Phaser.GameObjects.Text;
  private previa!: Phaser.GameObjects.Graphics;
  private textoPeca!: Phaser.GameObjects.Text;
  private textoEventos!: Phaser.GameObjects.Text;
  // Objetos da janela de resultado, para poder fechá-la.
  private resultado: Phaser.GameObjects.GameObject[] = [];
  private resultadoJaMostrado = false;

  constructor() {
    super(CENAS.painelTabuleiro);
  }

  create(): void {
    this.tabuleiro = this.scene.get(CENAS.tabuleiro) as CenaTabuleiro;
    this.linhas = [];
    this.resultado = [];
    this.resultadoJaMostrado = false;

    this.add.graphics().fillStyle(COR_PAINEL, 1).fillRect(X0, 0, LARGURA, this.scale.height);
    // Bloqueia cliques no painel de chegarem ao tabuleiro.
    this.add.zone(X0, 0, LARGURA, this.scale.height).setOrigin(0).setInteractive();

    const x = X0 + MARGEM;
    criarBotao(this, x, 16, 100, 32, '← Menu', () => this.tabuleiro.voltarAoMenu(), 14);
    this.textoBaralho = this.add.text(x + LARGURA_UTIL, 32, '', estilo(13, COR_TEXTO_FRACO)).setOrigin(1, 0.5);

    this.add.text(x, 60, 'Placar', estilo(14, COR_TITULO, true));
    for (let i = 0; i < MAX_JOGADORES; i++) {
      const y = Y_PLACAR + i * ALTURA_LINHA;
      this.linhas.push({
        fundo: this.add.graphics(),
        nome: this.add.text(x + 32, y + 15, '', estilo(15, COR_TEXTO, true)).setOrigin(0, 0.5),
        tipo: this.add.text(0, y + 16, '', estilo(11, COR_TEXTO_FRACO)).setOrigin(0, 0.5),
        pontos: this.add.text(x + LARGURA_UTIL - 12, y + 15, '', estilo(18, COR_TEXTO, true)).setOrigin(1, 0.5),
      });
    }

    this.textoVez = this.add.text(x, 264, '', estilo(16, COR_TEXTO, true));
    this.previa = this.add.graphics();
    this.add
      .zone(x, Y_PREVIA, TAMANHO_PREVIA, TAMANHO_PREVIA)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tabuleiro.girar());
    this.textoPeca = this.add.text(x + TAMANHO_PREVIA + 16, Y_PREVIA, '', {
      ...estilo(13, COR_TEXTO_FRACO),
      lineSpacing: 4,
      wordWrap: { width: LARGURA_UTIL - TAMANHO_PREVIA - 16 },
    });

    criarBotao(this, x, 418, 160, 36, 'Girar (R)', () => this.tabuleiro.girar(), 14);
    criarBotao(this, x + 172, 418, 160, 36, 'Centralizar (C)', () => this.tabuleiro.centralizar(), 14);

    this.add.text(x, 468, 'Acontecimentos', estilo(14, COR_TITULO, true));
    this.textoEventos = this.add.text(x, 490, '', {
      ...estilo(12, COR_TEXTO_FRACO),
      lineSpacing: 4,
      wordWrap: { width: LARGURA_UTIL },
    });

    criarBotao(this, x, 640, 160, 34, 'Nova partida', () => this.tabuleiro.novaPartida(), 14);
    criarBotao(this, x + 172, 640, 160, 34, 'Jogadores', () => this.tabuleiro.trocarJogadores(), 14);
    this.add.text(x, 690, 'Arraste: mover · Roda: zoom · Botão direito: girar', estilo(11, COR_TEXTO_FRACO));

    this.tabuleiro.events.on('estado', this.atualizar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tabuleiro.events.off('estado', this.atualizar, this));
    this.tabuleiro.emitirEstado();
  }

  private atualizar(estado: EstadoDoTabuleiro): void {
    this.textoBaralho.setText(`Baralho: ${estado.restantes} · Descartadas: ${estado.descartadas}`);
    this.atualizarPlacar(estado);
    this.atualizarVez(estado);
    this.textoEventos.setText(estado.eventos.map((e) => `• ${e}`).join('\n'));

    if (estado.classificacao && !this.resultadoJaMostrado) {
      this.resultadoJaMostrado = true;
      this.mostrarResultado(estado.classificacao);
    }
  }

  private atualizarPlacar(estado: EstadoDoTabuleiro): void {
    const x = X0 + MARGEM;
    this.linhas.forEach((linha, i) => {
      const jogador = estado.jogadores[i];
      linha.fundo.clear();
      if (!jogador) {
        [linha.nome, linha.tipo, linha.pontos].forEach((t) => t.setText(''));
        return;
      }
      const y = Y_PLACAR + i * ALTURA_LINHA;
      const daVez = jogador === estado.jogadorDaVez;
      if (daVez) {
        linha.fundo.fillStyle(COR_LINHA_DA_VEZ, 1).fillRoundedRect(x, y, LARGURA_UTIL, 30, 6);
        linha.fundo.lineStyle(2, jogador.cor, 1).strokeRoundedRect(x, y, LARGURA_UTIL, 30, 6);
      }
      linha.fundo.fillStyle(jogador.cor, 1).fillCircle(x + 16, y + 15, 7);
      linha.nome.setText(jogador.nome).setColor(daVez ? COR_TEXTO : '#c9ccd3');
      linha.tipo.setText(jogador.ehCpu() ? NOMES_DOS_TIPOS[jogador.tipo] : '').setX(linha.nome.x + linha.nome.width + 8);
      linha.pontos.setText(String(jogador.getPontos()));
    });
  }

  private atualizarVez(estado: EstadoDoTabuleiro): void {
    const x = X0 + MARGEM;
    this.previa.clear();
    const jogador = estado.jogadorDaVez;
    if (!jogador || !estado.atual) {
      this.textoVez.setText('Fim da partida').setColor(COR_TITULO);
      this.textoPeca.setText('Acabaram as peças.\nUse Nova partida para jogar de novo.');
      return;
    }

    this.textoVez.setText(`Vez de ${jogador.nome}`).setColor(corCss(jogador.cor));
    desenharTile(this.previa, estado.atual, x, Y_PREVIA, TAMANHO_PREVIA);
    const nome = nomeDaPeca(estado.atual.getDefinicao().id);
    if (jogador.ehCpu()) {
      this.textoPeca.setText(`${nome}\n\nO computador está escolhendo onde colocar…`);
      return;
    }
    const dica =
      estado.posicoesValidasNaRotacao === 0
        ? 'Não encaixa nesta rotação: gire a peça.'
        : `Encaixa em ${estado.posicoesValidasNaRotacao} lugar(es) nesta rotação.`;
    this.textoPeca.setText(`${nome}\nrotação ${estado.atual.getRotacao() * 90}°\n\n${dica}`);
  }

  // Janela por cima do tabuleiro com a classificação final.
  private mostrarResultado(classificacao: readonly Colocacao[]): void {
    const antes = new Set(this.children.list);
    const cx = LARGURA_TABULEIRO / 2;
    const largura = 460;
    const altura = 190 + classificacao.length * 40;
    const topo = 360 - altura / 2;

    this.add.graphics().fillStyle(0x0b0c10, 0.6).fillRect(0, 0, LARGURA_TABULEIRO, this.scale.height);
    this.add.zone(0, 0, LARGURA_TABULEIRO, this.scale.height).setOrigin(0).setInteractive();
    this.add
      .graphics()
      .fillStyle(COR_PAINEL, 1)
      .fillRoundedRect(cx - largura / 2, topo, largura, altura, 14)
      .lineStyle(2, 0xffb454, 1)
      .strokeRoundedRect(cx - largura / 2, topo, largura, altura, 14);

    const vencedores = classificacao.filter((c) => c.posicao === 1).map((c) => c.jogador.nome);
    const titulo = vencedores.length > 1 ? `Empate: ${vencedores.join(' e ')}!` : `${vencedores[0]} venceu!`;
    this.add.text(cx, topo + 34, 'Fim da partida', estilo(15, COR_TEXTO_FRACO)).setOrigin(0.5);
    this.add.text(cx, topo + 66, titulo, estilo(26, COR_TITULO, true)).setOrigin(0.5);

    classificacao.forEach(({ jogador, posicao }, i) => {
      const y = topo + 116 + i * 40;
      const esquerda = cx - largura / 2 + 40;
      this.add.text(esquerda, y, `${posicao}º`, estilo(18, COR_TEXTO_FRACO, true)).setOrigin(0, 0.5);
      this.add.graphics().fillStyle(jogador.cor, 1).fillCircle(esquerda + 52, y, 8);
      this.add.text(esquerda + 70, y, jogador.nome, estilo(18, COR_TEXTO, true)).setOrigin(0, 0.5);
      this.add
        .text(cx + largura / 2 - 40, y, `${jogador.getPontos()} pts`, estilo(18, COR_TEXTO, true))
        .setOrigin(1, 0.5);
    });

    const yBotoes = topo + altura - 58;
    const esquerda = cx - largura / 2 + 20;
    criarBotao(this, esquerda, yBotoes, 134, 38, 'Jogar de novo', () => this.tabuleiro.novaPartida(), 14);
    criarBotao(this, esquerda + 143, yBotoes, 134, 38, 'Jogadores', () => this.tabuleiro.trocarJogadores(), 14);
    criarBotao(this, esquerda + 286, yBotoes, 134, 38, 'Ver tabuleiro', () => this.fecharResultado(), 14);

    this.resultado = this.children.list.filter((o) => !antes.has(o));
  }

  private fecharResultado(): void {
    this.resultado.forEach((o) => o.destroy());
    this.resultado = [];
  }
}
