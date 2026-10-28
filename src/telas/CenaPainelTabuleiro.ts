import Phaser from 'phaser';
import { FaseDaPartida } from '../jogo/EstadoDaPartida';
import { MAX_JOGADORES, type Jogador } from '../jogo/Jogador';
import { TipoDeMarcador } from '../jogo/Marcador';
import type { Colocacao } from '../jogo/Partida';
import { CenaTabuleiro, LARGURA_TABULEIRO, type EstadoDoTabuleiro } from './CenaTabuleiro';
import { desenharMarcador } from './desenharMarcador';
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
const TAMANHO_PREVIA = 100;
const Y_PLACAR = 84;
const ALTURA_LINHA = 40;
const Y_VEZ = 290;
const Y_PREVIA = 318;
const Y_BOTOES = 428;
const COR_LINHA_DA_VEZ = 0x2c313d;

interface LinhaDoPlacar {
  fundo: Phaser.GameObjects.Graphics;
  nome: Phaser.GameObjects.Text;
  detalhe: Phaser.GameObjects.Text;
  pontos: Phaser.GameObjects.Text;
}

function descreverReserva(j: Jogador): string {
  const colonos = j.disponiveis(TipoDeMarcador.COLONO);
  const chefe = j.disponiveis(TipoDeMarcador.CHEFE) > 0 ? 'chefe' : 'sem chefe';
  return `${colonos} colono${colonos === 1 ? '' : 's'} · ${chefe}`;
}

// Painel fixo à direita do tabuleiro, numa cena por cima: o zoom da câmera do tabuleiro não o afeta.
export class CenaPainelTabuleiro extends Phaser.Scene {
  private tabuleiro!: CenaTabuleiro;
  private estado: EstadoDoTabuleiro | null = null;
  private linhas: LinhaDoPlacar[] = [];
  private textoBaralho!: Phaser.GameObjects.Text;
  private textoVez!: Phaser.GameObjects.Text;
  private previa!: Phaser.GameObjects.Graphics;
  private textoPeca!: Phaser.GameObjects.Text;
  private rotuloA!: Phaser.GameObjects.Text;
  private rotuloB!: Phaser.GameObjects.Text;
  private textoEventos!: Phaser.GameObjects.Text;
  // Objetos da janela de resultado, para poder fechá-la.
  private resultado: Phaser.GameObjects.GameObject[] = [];
  private resultadoJaMostrado = false;

  constructor() {
    super(CENAS.painelTabuleiro);
  }

  create(): void {
    this.tabuleiro = this.scene.get(CENAS.tabuleiro) as CenaTabuleiro;
    this.estado = null;
    this.linhas = [];
    this.resultado = [];
    this.resultadoJaMostrado = false;

    this.add.graphics().fillStyle(COR_PAINEL, 1).fillRect(X0, 0, LARGURA, this.scale.height);
    // Bloqueia cliques no painel de chegarem ao tabuleiro.
    this.add.zone(X0, 0, LARGURA, this.scale.height).setOrigin(0).setInteractive();

    const x = X0 + MARGEM;
    criarBotao(this, x, 16, 100, 32, '← Menu', () => this.tabuleiro.voltarAoMenu(), 14);
    this.textoBaralho = this.add.text(x + LARGURA_UTIL, 32, '', estilo(13, COR_TEXTO_FRACO)).setOrigin(1, 0.5);

    this.add.text(x, 58, 'Placar', estilo(14, COR_TITULO, true));
    for (let i = 0; i < MAX_JOGADORES; i++) {
      const y = Y_PLACAR + i * ALTURA_LINHA;
      this.linhas.push({
        fundo: this.add.graphics(),
        nome: this.add.text(x + 32, y + 12, '', estilo(15, COR_TEXTO, true)).setOrigin(0, 0.5),
        detalhe: this.add.text(x + 32, y + 28, '', estilo(11, COR_TEXTO_FRACO)).setOrigin(0, 0.5),
        pontos: this.add.text(x + LARGURA_UTIL - 12, y + 18, '', estilo(20, COR_TEXTO, true)).setOrigin(1, 0.5),
      });
    }

    this.textoVez = this.add.text(x, Y_VEZ, '', estilo(16, COR_TEXTO, true));
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

    // Os dois botões mudam conforme a etapa: girar/centralizar na peça, chefe/pular no marcador.
    const naEtapaDoMarcador = () => this.estado?.fase === FaseDaPartida.COLOCAR_MARCADOR;
    this.rotuloA = criarBotao(this, x, Y_BOTOES, 160, 36, '', () =>
      naEtapaDoMarcador() ? this.tabuleiro.alternarChefe() : this.tabuleiro.girar(), 14);
    this.rotuloB = criarBotao(this, x + 172, Y_BOTOES, 160, 36, '', () =>
      naEtapaDoMarcador() ? this.tabuleiro.pularMarcador() : this.tabuleiro.centralizar(), 14);

    this.add.text(x, 478, 'Acontecimentos', estilo(14, COR_TITULO, true));
    this.textoEventos = this.add.text(x, 500, '', {
      ...estilo(12, COR_TEXTO_FRACO),
      lineSpacing: 3,
      wordWrap: { width: LARGURA_UTIL },
    });

    criarBotao(this, x, 640, 160, 34, 'Nova partida', () => this.tabuleiro.novaPartida(), 14);
    criarBotao(this, x + 172, 640, 160, 34, 'Jogadores', () => this.tabuleiro.trocarJogadores(), 14);
    this.add.text(x, 690, 'Arraste: mover · Roda: zoom · C: centralizar', estilo(11, COR_TEXTO_FRACO));

    this.tabuleiro.events.on('estado', this.atualizar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tabuleiro.events.off('estado', this.atualizar, this));
    this.tabuleiro.emitirEstado();
  }

  private atualizar(estado: EstadoDoTabuleiro): void {
    this.estado = estado;
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
        [linha.nome, linha.detalhe, linha.pontos].forEach((t) => t.setText(''));
        return;
      }
      const y = Y_PLACAR + i * ALTURA_LINHA;
      const daVez = jogador === estado.jogadorDaVez;
      if (daVez) {
        linha.fundo.fillStyle(COR_LINHA_DA_VEZ, 1).fillRoundedRect(x, y, LARGURA_UTIL, 36, 6);
        linha.fundo.lineStyle(2, jogador.cor, 1).strokeRoundedRect(x, y, LARGURA_UTIL, 36, 6);
      }
      desenharMarcador(linha.fundo, TipoDeMarcador.COLONO, jogador.cor, x + 16, y + 22, 64);
      linha.nome.setText(jogador.nome).setColor(daVez ? COR_TEXTO : '#c9ccd3');
      const tipo = jogador.ehCpu() ? `${NOMES_DOS_TIPOS[jogador.tipo]} · ` : '';
      linha.detalhe.setText(`${tipo}${descreverReserva(jogador)}`);
      linha.pontos.setText(String(jogador.getPontos()));
    });
  }

  private atualizarVez(estado: EstadoDoTabuleiro): void {
    const x = X0 + MARGEM;
    this.previa.clear();
    const jogador = estado.jogadorDaVez;
    const etapaDoMarcador = estado.fase === FaseDaPartida.COLOCAR_MARCADOR && jogador && !jogador.ehCpu();
    this.rotuloA.setText(etapaDoMarcador ? `Chefe: ${estado.usarChefe ? 'sim' : 'não'} (E)` : 'Girar (R)');
    this.rotuloB.setText(etapaDoMarcador ? 'Pular (Espaço)' : 'Centralizar (C)');

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
    if (etapaDoMarcador) {
      const chefe = jogador.disponiveis(TipoDeMarcador.CHEFE) > 0 ? '' : '\nO chefe está no tabuleiro.';
      this.textoPeca.setText(
        `Quer pôr um marcador? Clique ${estado.regioesParaMarcador === 1 ? 'no círculo' : `num dos ${estado.regioesParaMarcador} círculos`}` +
          ` da peça, ou pule.${chefe}`,
      );
      return;
    }
    const lugares = `Cabe em ${estado.posicoesValidas} lugar${estado.posicoesValidas === 1 ? '' : 'es'} (em verde). No mouse, a peça gira sozinha.`;
    const aqui =
      estado.rotacoesNaPosicao > 1
        ? `Aqui encaixa de ${estado.rotacoesNaPosicao} jeitos: R troca.`
        : estado.rotacoesNaPosicao === 1
          ? 'Aqui encaixa de 1 jeito.'
          : '';
    const dica = aqui || lugares;
    this.textoPeca.setText(`${nome}\nrotação ${estado.atual.getRotacao() * 90}°\n\n${dica}`);
  }

  // Janela por cima do tabuleiro com a classificação final.
  private mostrarResultado(classificacao: readonly Colocacao[]): void {
    const antes = new Set(this.children.list);
    const cx = LARGURA_TABULEIRO / 2;
    const largura = 500;
    const altura = 200 + classificacao.length * 40;
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

    const esquerda = cx - largura / 2 + 36;
    const direita = cx + largura / 2 - 36;
    classificacao.forEach(({ jogador, posicao }, i) => {
      const y = topo + 116 + i * 40;
      this.add.text(esquerda, y, `${posicao}º`, estilo(18, COR_TEXTO_FRACO, true)).setOrigin(0, 0.5);
      const marca = this.add.graphics();
      desenharMarcador(marca, TipoDeMarcador.COLONO, jogador.cor, esquerda + 52, y + 5, 80);
      this.add.text(esquerda + 72, y, jogador.nome, estilo(18, COR_TEXTO, true)).setOrigin(0, 0.5);
      this.add.text(direita - 90, y, `${jogador.totalDisponivel()} na reserva`, estilo(12, COR_TEXTO_FRACO)).setOrigin(1, 0.5);
      this.add.text(direita, y, `${jogador.getPontos()} pts`, estilo(18, COR_TEXTO, true)).setOrigin(1, 0.5);
    });
    this.add
      .text(cx, topo + altura - 82, 'Desempate: mais marcadores na reserva.', estilo(11, COR_TEXTO_FRACO))
      .setOrigin(0.5);

    const yBotoes = topo + altura - 58;
    const x = cx - largura / 2 + 30;
    criarBotao(this, x, yBotoes, 140, 38, 'Jogar de novo', () => this.tabuleiro.novaPartida(), 14);
    criarBotao(this, x + 150, yBotoes, 140, 38, 'Jogadores', () => this.tabuleiro.trocarJogadores(), 14);
    criarBotao(this, x + 300, yBotoes, 140, 38, 'Ver tabuleiro', () => this.fecharResultado(), 14);

    this.resultado = this.children.list.filter((o) => !antes.has(o));
  }

  private fecharResultado(): void {
    this.resultado.forEach((o) => o.destroy());
    this.resultado = [];
  }
}
