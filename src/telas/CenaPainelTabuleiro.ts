import Phaser from 'phaser';
import { FaseDaPartida } from '../jogo/EstadoDaPartida';
import { MAX_JOGADORES, type Jogador } from '../jogo/Jogador';
import { RESERVA_INICIAL, TipoDeMarcador } from '../jogo/Marcador';
import type { Colocacao } from '../jogo/Partida';
import type { CenaTabuleiro, EstadoDoTabuleiro } from './CenaTabuleiro';
import { desenharMarcador } from './desenharMarcador';
import { desenharPeca } from './desenharPeca';
import { contadoresDoBaralho, situacaoDaEscolha, ultimosAcontecimentos } from './textosDaPartida';
import {
  CENAS,
  COR_ESCURA,
  CREME,
  CREME_FRACO,
  FONTE,
  FONTE_TITULO,
  LARANJA,
  corCss,
  desenharAvatar,
  estilo,
  nomeDaPeca,
} from './ui';

const LARGURA = 1280;
const ALTURA = 720;
const COR_PAINEL = 0x24160f;
const CREME_APAGADO = '#a8968a';

const LADO_DO_BOTAO_DO_TOPO = 52;
const PLACAR = { y: 18, altura: 58, larguraMaxima: 210, espaco: 10, larguraDaFaixa: 980 };
const BARALHO = { direita: 1260, y: 10, altura: 60 };
const EVENTOS = { x: 20, base: 700, largura: 340, mostrados: 3, alturaMaxima: 112 };
const VEZ = { x: 960, y: 474, largura: 300, altura: 226, peca: 112 };

interface Retangulo {
  readonly x: number;
  readonly y: number;
  readonly l: number;
  readonly a: number;
}

type TipoDeBotao = 'principal' | 'secundario' | 'ativo' | 'desligado';

interface ConfiguracaoDoBotao {
  readonly texto: string;
  readonly tecla?: string;
  readonly tipo: TipoDeBotao;
  readonly acao: () => void;
}

interface Botao {
  // null esconde o botão.
  configurar(c: ConfiguracaoDoBotao | null): void;
  readonly objetos: Phaser.GameObjects.GameObject[];
}

interface CartaoDoPlacar {
  readonly g: Phaser.GameObjects.Graphics;
  readonly nome: Phaser.GameObjects.Text;
  readonly pontos: Phaser.GameObjects.Text;
}

type Janela = 'opcoes' | 'confirmar' | 'log' | 'resultado';

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Corta o texto com "…" até caber na largura.
function caber(texto: Phaser.GameObjects.Text, largura: number): void {
  const original = texto.text;
  for (let n = original.length; texto.width > largura && n > 1; n--) texto.setText(`${original.slice(0, n - 1)}…`);
}

// Botão retangular com (x, y) no canto superior esquerdo; o texto e a ação mudam com configurar.
function criarBotao(cena: Phaser.Scene, x: number, y: number, largura: number, altura: number): Botao {
  const fundo = cena.add.graphics();
  const rotulo = cena.add.text(0, y + altura / 2, '', estilo(15, CREME, true)).setOrigin(0, 0.5);
  const tecla = cena.add.text(0, y + altura / 2 + 1, '', estilo(12, CREME, true)).setOrigin(0, 0.5).setAlpha(0.6);
  const zona = cena.add.zone(x, y, largura, altura).setOrigin(0).setInteractive({ useHandCursor: true });
  let atual: ConfiguracaoDoBotao | null = null;
  let sobre = false;

  const pintar = () => {
    fundo.clear();
    if (!atual) return;
    const cores: Record<TipoDeBotao, [number, number, number]> = {
      principal: [sobre ? 0xdf6a3e : 0xd0592f, 0xe8834f, 0x8e3a1d],
      secundario: [sobre ? 0x4a362b : 0x3a2a22, 0x6e5444, 0x1c120e],
      ativo: [sobre ? 0x82492f : 0x6e3d27, 0xe8834f, 0x3a1d10],
      desligado: [0x2a1d17, 0x3d2c23, 0x1c120e],
    };
    const [cor, borda, sombra] = cores[atual.tipo];
    fundo.fillStyle(sombra, 1).fillRoundedRect(x, y + 3, largura, altura, 8);
    fundo.fillStyle(cor, 1).fillRoundedRect(x, y, largura, altura, 8);
    fundo.lineStyle(1.2, borda, 0.9).strokeRoundedRect(x, y, largura, altura, 8);
  };

  zona
    .on('pointerover', () => {
      sobre = atual?.tipo !== 'desligado';
      pintar();
    })
    .on('pointerout', () => {
      sobre = false;
      pintar();
    })
    .on('pointerup', () => {
      if (atual && atual.tipo !== 'desligado') atual.acao();
    });

  return {
    objetos: [fundo, rotulo, tecla, zona],
    configurar(c) {
      atual = c;
      const visivel = c !== null;
      [fundo, rotulo, tecla].forEach((o) => o.setVisible(visivel));
      zona.setVisible(visivel);
      if (zona.input) zona.input.enabled = visivel;
      if (!c) return;
      rotulo.setText(c.texto).setAlpha(c.tipo === 'desligado' ? 0.45 : 1);
      tecla.setText(c.tecla ?? '');
      const espaco = c.tecla ? 8 : 0;
      const total = rotulo.width + espaco + tecla.width;
      rotulo.setX(x + (largura - total) / 2);
      tecla.setX(rotulo.x + rotulo.width + espaco);
      pintar();
    },
  };
}

// Por cima do tabuleiro, que ocupa a tela toda: placar, baralho, acontecimentos, a vez e as janelas.
// A câmera do tabuleiro não mexe nestes painéis, que ficam numa cena própria.
export class CenaPainelTabuleiro extends Phaser.Scene {
  private tabuleiro!: CenaTabuleiro;
  private estado: EstadoDoTabuleiro | null = null;
  // Onde um clique é do painel e não do tabuleiro.
  private areas = new Map<string, Retangulo>();
  private janela: Janela | null = null;
  private objetosDaJanela: Phaser.GameObjects.GameObject[] = [];
  private resultadoJaMostrado = false;

  private cartoes: CartaoDoPlacar[] = [];
  private baralho!: Phaser.GameObjects.Container;
  private chaveDoBaralho = '';
  private eventos!: Phaser.GameObjects.Container;
  private zonaDosEventos: Phaser.GameObjects.Zone | null = null;
  private quantidadeDeEventos = -1;
  private eventosNoLog = 0;

  // Botão de mostrar os campos (abaixo do ≡) e a legenda que aparece ao lado quando ligado.
  private pintarBotaoDosCampos: (sobre: boolean) => void = () => undefined;
  private legendaDosCampos!: Phaser.GameObjects.Container;
  private mostrandoCampos = false;

  private pontoDaVez!: Phaser.GameObjects.Graphics;
  private tituloDaVez!: Phaser.GameObjects.Text;
  private previa!: Phaser.GameObjects.Container;
  private nomeDaPeca!: Phaser.GameObjects.Text;
  private detalheDaPeca!: Phaser.GameObjects.Text;
  private situacao!: Phaser.GameObjects.Text;
  private botaoLargo!: Botao;
  private botaoEsquerdo!: Botao;
  private botaoDireito!: Botao;
  // Com a peça sobre a casa escolhida: girar (quadrado), voltar e confirmar.
  private botaoGirarPequeno!: Botao;
  private botaoVoltar!: Botao;
  private botaoConfirmar!: Botao;

  constructor() {
    super(CENAS.painelTabuleiro);
  }

  // Chamado pelo tabuleiro antes de cada clique, rodada da roda do mouse ou tecla.
  // Sem posição (teclado), só as janelas bloqueiam.
  bloqueia(x?: number, y?: number): boolean {
    if (this.janela) return true;
    if (x === undefined || y === undefined) return false;
    return [...this.areas.values()].some((r) => x >= r.x && x <= r.x + r.l && y >= r.y && y <= r.y + r.a);
  }

  create(): void {
    this.tabuleiro = this.scene.get(CENAS.tabuleiro) as CenaTabuleiro;
    this.estado = null;
    this.areas = new Map();
    this.janela = null;
    this.objetosDaJanela = [];
    this.resultadoJaMostrado = false;
    this.cartoes = [];
    this.chaveDoBaralho = '';
    this.zonaDosEventos = null;
    this.quantidadeDeEventos = -1;
    this.mostrandoCampos = false;

    this.criarBotoesDoTopo();
    for (let i = 0; i < MAX_JOGADORES; i++) {
      this.cartoes.push({
        g: this.add.graphics(),
        nome: this.add.text(0, 0, '', estilo(15, CREME, true)).setOrigin(0, 0.5),
        pontos: this.add.text(0, 0, '', estilo(22, CREME, true)).setOrigin(1, 0.5),
      });
    }
    this.baralho = this.add.container(0, 0);
    this.eventos = this.add.container(0, 0);
    this.criarPainelDaVez();

    this.input.keyboard?.on('keydown-ESC', () => this.teclaEsc());
    this.tabuleiro.events.on('estado', this.atualizar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tabuleiro.events.off('estado', this.atualizar, this));
    this.tabuleiro.emitirEstado();
  }

  private painel(x: number, y: number, largura: number, altura: number, g = this.add.graphics()): Phaser.GameObjects.Graphics {
    return g
      .fillStyle(0x000000, 0.3)
      .fillRoundedRect(x + 2, y + 5, largura, altura, 12)
      .fillStyle(COR_PAINEL, 0.92)
      .fillRoundedRect(x, y, largura, altura, 12)
      .lineStyle(1, 0xffffff, 0.1)
      .strokeRoundedRect(x, y, largura, altura, 12);
  }

  // Canto superior esquerdo: opções (≡) e, ao lado, centralizar a câmera.
  private criarBotoesDoTopo(): void {
    const quadrado = (x: number, chave: string, icone: (g: Phaser.GameObjects.Graphics, cx: number, cy: number) => void, acao: () => void) => {
      const [y, lado] = [18, LADO_DO_BOTAO_DO_TOPO];
      const g = this.add.graphics();
      const pintar = (sobre: boolean) => {
        g.clear().fillStyle(0x000000, 0.3).fillRoundedRect(x + 1, y + 4, lado, lado, 10);
        g.fillStyle(sobre ? 0x3a2a22 : COR_ESCURA, 0.95).fillRoundedRect(x, y, lado, lado, 10);
        g.lineStyle(1.2, 0xc98a63, sobre ? 0.9 : 0.4).strokeRoundedRect(x, y, lado, lado, 10);
        icone(g, x + lado / 2, y + lado / 2);
      };
      pintar(false);
      this.add
        .zone(x, y, lado, lado)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => pintar(true))
        .on('pointerout', () => pintar(false))
        .on('pointerup', acao);
      this.areas.set(chave, { x, y, l: lado, a: lado });
    };

    quadrado(20, 'opcoes', (g, cx, cy) => {
      g.lineStyle(2.2, 0xf6ead8, 1);
      for (const d of [-6, 0, 6]) g.lineBetween(cx - 9, cy + d, cx + 9, cy + d);
    }, () => this.abrirOpcoes());
    quadrado(82, 'centralizar', (g, cx, cy) => {
      g.lineStyle(2, 0xf6ead8, 1).strokeCircle(cx, cy, 6);
      g.lineBetween(cx, cy - 12, cx, cy - 8).lineBetween(cx, cy + 8, cx, cy + 12);
      g.lineBetween(cx - 12, cy, cx - 8, cy).lineBetween(cx + 8, cy, cx + 12, cy);
      g.fillStyle(0xf6ead8, 1).fillCircle(cx, cy, 1.8);
    }, () => this.tabuleiro.centralizar());
    this.criarBotaoDosCampos();
  }

  // Liga e desliga a pintura dos campos (tecla V). Aceso enquanto os campos estão à mostra.
  private criarBotaoDosCampos(): void {
    const [x, y, lado] = [20, 80, LADO_DO_BOTAO_DO_TOPO];
    const g = this.add.graphics();
    this.pintarBotaoDosCampos = (sobre: boolean) => {
      const ligado = this.mostrandoCampos;
      g.clear().fillStyle(0x000000, 0.3).fillRoundedRect(x + 1, y + 4, lado, lado, 10);
      g.fillStyle(ligado ? 0x6e3d27 : sobre ? 0x3a2a22 : COR_ESCURA, 0.95).fillRoundedRect(x, y, lado, lado, 10);
      g.lineStyle(1.2, ligado ? 0xe8834f : 0xc98a63, ligado || sobre ? 0.95 : 0.4).strokeRoundedRect(x, y, lado, lado, 10);
      // Ícone: duas camadas de mapa, a de cima pintada quando ligado.
      const [cx, cy] = [x + lado / 2, y + lado / 2];
      const losango = (dy: number) => [
        new Phaser.Math.Vector2(cx, cy - 7 + dy), new Phaser.Math.Vector2(cx + 12, cy + dy),
        new Phaser.Math.Vector2(cx, cy + 7 + dy), new Phaser.Math.Vector2(cx - 12, cy + dy),
      ];
      g.lineStyle(2, 0xf6ead8, 1).strokePoints(losango(5), true);
      if (ligado) g.fillStyle(0xe8834f, 1).fillPoints(losango(-3), true);
      g.lineStyle(2, 0xf6ead8, 1).strokePoints(losango(-3), true);
    };
    this.pintarBotaoDosCampos(false);
    this.add
      .zone(x, y, lado, lado)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.pintarBotaoDosCampos(true))
      .on('pointerout', () => this.pintarBotaoDosCampos(false))
      .on('pointerup', () => this.tabuleiro.alternarCampos());
    this.areas.set('campos', { x, y, l: lado, a: lado });

    const texto = this.add
      .text(x + lado + 22, y + lado / 2, 'Campos na cor de quem domina · listras: empate · claro: sem dono  (V)', estilo(12, CREME, true))
      .setOrigin(0, 0.5);
    const fundo = this.painel(x + lado + 10, y + 8, texto.width + 24, lado - 16);
    this.legendaDosCampos = this.add.container(0, 0, [fundo, texto]).setVisible(false);
  }

  private atualizar(estado: EstadoDoTabuleiro): void {
    this.estado = estado;
    if (estado.mostrandoCampos !== this.mostrandoCampos) {
      this.mostrandoCampos = estado.mostrandoCampos;
      this.pintarBotaoDosCampos(false);
      this.legendaDosCampos.setVisible(this.mostrandoCampos);
    }
    this.atualizarPlacar(estado);
    this.atualizarBaralho(estado);
    this.atualizarEventos(estado);
    this.atualizarVez(estado);
    if (this.janela === 'log' && estado.eventos.length !== this.eventosNoLog) this.abrirLog();

    if (estado.classificacao && !this.resultadoJaMostrado) {
      this.resultadoJaMostrado = true;
      this.mostrarResultado(estado.classificacao);
    }
  }

  // Um cartão por jogador no topo: avatar, nome, reserva (colonos pequenos, chefe grande) e pontos.
  private atualizarPlacar(estado: EstadoDoTabuleiro): void {
    const n = estado.jogadores.length;
    const { y, altura, espaco } = PLACAR;
    const largura = Math.min(PLACAR.larguraMaxima, (PLACAR.larguraDaFaixa - (n - 1) * espaco) / n);
    const x0 = LARGURA / 2 - (n * largura + (n - 1) * espaco) / 2;
    this.areas.set('placar', { x: x0, y, l: n * largura + (n - 1) * espaco, a: altura + 4 });

    this.cartoes.forEach((cartao, i) => {
      const jogador = estado.jogadores[i];
      cartao.g.clear();
      cartao.nome.setVisible(!!jogador);
      cartao.pontos.setVisible(!!jogador);
      if (!jogador) return;

      const x = x0 + i * (largura + espaco);
      const daVez = jogador === estado.jogadorDaVez;
      const g = cartao.g;
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 1, y + 4, largura, altura, 10);
      g.fillStyle(daVez ? 0x2e1d15 : COR_ESCURA, 0.95).fillRoundedRect(x, y, largura, altura, 10);
      if (daVez) {
        g.lineStyle(1.5, jogador.cor, 1).strokeRoundedRect(x, y, largura, altura, 10);
        g.fillStyle(jogador.cor, 1).fillRoundedRect(x + 12, y + altura - 4, largura - 24, 3, 1.5);
      } else {
        g.lineStyle(1, 0xffffff, 0.1).strokeRoundedRect(x, y, largura, altura, 10);
      }
      desenharAvatar(g, x + 28, y + altura / 2, jogador.cor, 1, 0.85);
      this.desenharReserva(g, jogador, x + 54, y + 38);

      cartao.pontos.setPosition(x + largura - 14, y + altura / 2).setText(String(jogador.getPontos()));
      cartao.nome.setPosition(x + 52, y + 20).setText(jogador.nome).setColor(daVez ? CREME : CREME_FRACO);
      caber(cartao.nome, largura - 52 - cartao.pontos.width - 22);
    });
  }

  private desenharReserva(g: Phaser.GameObjects.Graphics, jogador: Jogador, x: number, y: number): void {
    const colonos = RESERVA_INICIAL[TipoDeMarcador.COLONO];
    for (let k = 0; k < colonos; k++) {
      g.fillStyle(jogador.cor, k < jogador.disponiveis(TipoDeMarcador.COLONO) ? 1 : 0.22).fillCircle(x + k * 9, y, 3.2);
    }
    const temChefe = jogador.disponiveis(TipoDeMarcador.CHEFE) > 0;
    const xChefe = x + colonos * 9 + 6;
    g.fillStyle(jogador.cor, temChefe ? 1 : 0.22).fillCircle(xChefe, y, 5.5);
    g.lineStyle(1.5, 0xffffff, temChefe ? 0.9 : 0.25).strokeCircle(xChefe, y, 5.5);
  }

  // Canto superior direito: peças no baralho e, só depois do primeiro descarte, as descartadas ao lado.
  private atualizarBaralho(estado: EstadoDoTabuleiro): void {
    const chave = `${estado.restantes}/${estado.descartadas}`;
    if (chave === this.chaveDoBaralho) return;
    this.chaveDoBaralho = chave;
    this.baralho.removeAll(true);

    const { y, altura } = BARALHO;
    const meio = y + altura / 2;
    const fundo = this.add.graphics();
    const icone = this.add.graphics();
    this.baralho.add([fundo, icone]);

    let x = 46;
    contadoresDoBaralho(estado.restantes, estado.descartadas).forEach((c, i) => {
      const descarte = i > 0;
      if (descarte) {
        fundo.lineStyle(1, 0xffffff, 0.12).lineBetween(x + 2, meio - 16, x + 2, meio + 16);
        x += 16;
      }
      const numero = this.add.text(x, meio, String(c.numero), estilo(22, descarte ? '#ff9b85' : CREME, true)).setOrigin(0, 0.5);
      const rotulo = this.add
        .text(numero.x + numero.width + 6, meio + 1, c.rotulo.replace(' ', '\n'), { ...estilo(11, CREME_FRACO, true), lineSpacing: -2 })
        .setOrigin(0, 0.5);
      this.baralho.add([numero, rotulo]);
      x = rotulo.x + rotulo.width + 14;
    });

    // Monta da esquerda para a direita e depois encosta o conjunto na margem direita.
    const largura = x;
    const deslocamento = BARALHO.direita - largura;
    this.baralho.setX(deslocamento);
    this.painel(0, y, largura, altura, fundo);
    icone.fillStyle(0x8e3a1d, 1).fillRoundedRect(17, meio - 9, 14, 18, 3);
    icone.fillStyle(0xd9643a, 1).fillRoundedRect(21, meio - 12, 14, 18, 3);
    this.areas.set('baralho', { x: deslocamento, y, l: largura, a: altura });
  }

  // Canto inferior esquerdo: os últimos acontecimentos; um clique abre o registro completo.
  private atualizarEventos(estado: EstadoDoTabuleiro): void {
    if (estado.eventos.length === this.quantidadeDeEventos) return;
    this.quantidadeDeEventos = estado.eventos.length;
    this.eventos.removeAll(true);
    this.zonaDosEventos?.destroy();

    const { x, largura } = EVENTOS;
    const fundo = this.add.graphics();
    const titulo = this.add.text(x + 15, 0, 'ACONTECIMENTOS', estilo(13, LARANJA, true, FONTE_TITULO)).setLetterSpacing(3);
    const verTudo = this.add.text(x + largura - 15, 0, 'ver tudo ›', estilo(12, CREME_FRACO, true)).setOrigin(1, 0);
    const dica = this.add.text(x + 15, 0, 'Arrastar move · Roda dá zoom · C centraliza', estilo(11, CREME_APAGADO, true));
    this.eventos.add([fundo, titulo, verTudo, dica]);

    // Do mais novo para trás, enquanto couber; o mais novo fica embaixo e mais claro.
    const linhas: Phaser.GameObjects.Text[] = [];
    let alturaDasLinhas = 0;
    for (const [i, texto] of ultimosAcontecimentos(estado.eventos, EVENTOS.mostrados).reverse().entries()) {
      const linha = this.add.text(x + 15, 0, texto, { ...estilo(13, i === 0 ? CREME : CREME_FRACO), lineSpacing: 2, wordWrap: { width: largura - 30 } });
      if (i > 0 && alturaDasLinhas + linha.height > EVENTOS.alturaMaxima) {
        linha.destroy();
        break;
      }
      linhas.unshift(linha);
      alturaDasLinhas += linha.height + 6;
    }
    this.eventos.add(linhas);

    const altura = 15 + 18 + 10 + alturaDasLinhas + 10 + 26;
    const topo = EVENTOS.base - altura;
    titulo.setY(topo + 15);
    verTudo.setY(topo + 16);
    let yLinha = topo + 43;
    for (const linha of linhas) {
      linha.setY(yLinha);
      yLinha += linha.height + 6;
    }
    dica.setY(EVENTOS.base - 22);

    const pintar = (sobre: boolean) => {
      this.painel(x, topo, largura, altura, fundo.clear());
      if (sobre) fundo.lineStyle(1.2, 0xe8834f, 0.8).strokeRoundedRect(x, topo, largura, altura, 12);
      fundo.lineStyle(1, 0xffffff, 0.1).lineBetween(x + 15, EVENTOS.base - 30, x + largura - 15, EVENTOS.base - 30);
      verTudo.setColor(sobre ? LARANJA : CREME_FRACO);
    };
    pintar(false);
    this.zonaDosEventos = this.add
      .zone(x, topo, largura, altura)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => pintar(true))
      .on('pointerout', () => pintar(false))
      .on('pointerup', () => this.abrirLog());
    this.areas.set('eventos', { x, y: topo, l: largura, a: altura });
  }

  // Canto inferior direito: de quem é a vez, a peça e os botões da etapa (girar; ou chefe e pular).
  private criarPainelDaVez(): void {
    const { x, y, largura, altura, peca } = VEZ;
    this.painel(x, y, largura, altura);
    this.areas.set('vez', { x, y, l: largura, a: altura });

    this.pontoDaVez = this.add.graphics();
    this.tituloDaVez = this.add.text(x + 34, y + 21, '', estilo(14, CREME, true, FONTE_TITULO)).setLetterSpacing(3).setOrigin(0, 0.5);
    this.previa = this.add.container(0, 0);
    this.add
      .zone(x + 16, y + 40, peca, peca)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.tabuleiro.girar());
    const xTexto = x + 16 + peca + 14;
    const larguraTexto = largura - (xTexto - x) - 14;
    this.nomeDaPeca = this.add.text(xTexto, y + 70, '', { ...estilo(17, CREME, true), wordWrap: { width: larguraTexto } }).setOrigin(0, 0.5);
    this.detalheDaPeca = this.add.text(xTexto, y + 88, '', { ...estilo(13, CREME_FRACO, true), wordWrap: { width: larguraTexto } });
    this.situacao = this.add.text(xTexto, y + 0, '', { ...estilo(13, LARANJA, true), lineSpacing: 2, wordWrap: { width: larguraTexto } });

    const yBotoes = y + 166;
    const larguraUtil = largura - 32;
    this.botaoLargo = criarBotao(this, x + 16, yBotoes, larguraUtil, 44);
    this.botaoEsquerdo = criarBotao(this, x + 16, yBotoes, (larguraUtil - 10) / 2, 44);
    this.botaoDireito = criarBotao(this, x + 16 + (larguraUtil + 10) / 2, yBotoes, (larguraUtil - 10) / 2, 44);
    const [girar, voltar] = [44, 86];
    this.botaoGirarPequeno = criarBotao(this, x + 16, yBotoes, girar, 44);
    this.botaoVoltar = criarBotao(this, x + 16 + girar + 10, yBotoes, voltar, 44);
    this.botaoConfirmar = criarBotao(this, x + 16 + girar + voltar + 20, yBotoes, larguraUtil - girar - voltar - 20, 44);
  }

  private atualizarVez(estado: EstadoDoTabuleiro): void {
    const { x, y, peca } = VEZ;
    const jogador = estado.jogadorDaVez;
    this.previa.removeAll(true);
    this.pontoDaVez.clear();
    [this.botaoLargo, this.botaoEsquerdo, this.botaoDireito, this.botaoGirarPequeno, this.botaoVoltar, this.botaoConfirmar].forEach((b) =>
      b.configurar(null),
    );

    if (!jogador || !estado.atual) {
      this.tituloDaVez.setText('FIM DA PARTIDA').setColor(LARANJA);
      this.mostrarTextosDaPeca('Acabaram as peças', 'A contagem final já foi feita.', '');
      this.botaoLargo.configurar({ texto: 'Ver resultado', tipo: 'principal', acao: () => estado.classificacao && this.mostrarResultado(estado.classificacao) });
      return;
    }

    this.pontoDaVez.fillStyle(jogador.cor, 1).fillCircle(x + 22, y + 21, 5);
    this.tituloDaVez.setText(`VEZ DE ${jogador.nome.toUpperCase()}`).setColor(CREME);
    caber(this.tituloDaVez, VEZ.largura - 50);
    desenharPeca(this, this.previa, estado.atual, x + 16, y + 40, peca);
    const nome = maiuscula(nomeDaPeca(estado.atual.getDefinicao().id));
    const rotacao = `Rotação ${estado.atual.getRotacao() * 90}°`;

    if (jogador.ehCpu()) {
      this.mostrarTextosDaPeca(nome, rotacao, 'O computador está jogando…');
      return;
    }

    if (estado.fase === FaseDaPartida.COLOCAR_MARCADOR) {
      const temChefe = jogador.disponiveis(TipoDeMarcador.CHEFE) > 0;
      const temColono = jogador.disponiveis(TipoDeMarcador.COLONO) > 0;
      const quem = (estado.usarChefe && temChefe) || !temColono ? 'o chefe' : 'um colono';
      const onde = estado.regioesParaMarcador === 1 ? 'no círculo' : `num dos ${estado.regioesParaMarcador} círculos`;
      this.mostrarTextosDaPeca(nome, `Pôr ${quem}?`, `Clique ${onde} da peça ou pule.`);
      this.botaoEsquerdo.configurar(
        temChefe
          ? { texto: `Chefe: ${estado.usarChefe ? 'sim' : 'não'}`, tecla: 'E', tipo: estado.usarChefe ? 'ativo' : 'secundario', acao: () => this.tabuleiro.alternarChefe() }
          : { texto: 'Chefe em jogo', tipo: 'desligado', acao: () => undefined },
      );
      this.botaoDireito.configurar({ texto: 'Pular', tecla: 'Espaço', tipo: 'principal', acao: () => this.tabuleiro.pularMarcador() });
      return;
    }

    if (estado.pecaEscolhida) {
      const varios = estado.rotacoesNaPosicao > 1;
      this.mostrarTextosDaPeca(nome, rotacao, situacaoDaEscolha(estado.rotacoesNaPosicao));
      this.botaoGirarPequeno.configurar({ texto: '↻', tipo: varios ? 'secundario' : 'desligado', acao: () => this.tabuleiro.girar() });
      this.botaoVoltar.configurar({ texto: 'Voltar', tipo: 'secundario', acao: () => this.tabuleiro.voltar() });
      this.botaoConfirmar.configurar({ texto: 'Confirmar', tecla: '↵', tipo: 'principal', acao: () => this.tabuleiro.confirmar() });
      return;
    }

    const situacao =
      estado.rotacoesNaPosicao > 1
        ? `Aqui encaixa de ${estado.rotacoesNaPosicao} jeitos`
        : `Cabe em ${estado.posicoesValidas} lugar${estado.posicoesValidas === 1 ? '' : 'es'}`;
    this.mostrarTextosDaPeca(nome, rotacao, situacao);
    this.botaoLargo.configurar({ texto: '↻  Girar', tecla: 'R', tipo: 'principal', acao: () => this.tabuleiro.girar() });
  }

  // Nome, detalhe e situação um abaixo do outro, centrados na altura da prévia.
  private mostrarTextosDaPeca(nome: string, detalhe: string, situacao: string): void {
    this.nomeDaPeca.setText(nome);
    this.detalheDaPeca.setText(detalhe);
    this.situacao.setText(situacao);
    const altura = this.nomeDaPeca.height + 6 + this.detalheDaPeca.height + 6 + this.situacao.height;
    let y = VEZ.y + 40 + (VEZ.peca - altura) / 2;
    this.nomeDaPeca.setY(y + this.nomeDaPeca.height / 2);
    y += this.nomeDaPeca.height + 6;
    this.detalheDaPeca.setY(y);
    this.situacao.setY(y + this.detalheDaPeca.height + 6);
  }

  // Janelas por cima de tudo: opções, confirmação, registro e resultado. Só uma aberta por vez.

  private teclaEsc(): void {
    if (this.janela === 'confirmar') this.abrirOpcoes();
    else if (this.janela) this.fecharJanela();
    else this.abrirOpcoes();
  }

  private fecharJanela(): void {
    this.objetosDaJanela.forEach((o) => o.destroy());
    this.objetosDaJanela = [];
    this.janela = null;
  }

  // Escurece a tela e devolve onde desenhar; um clique fora do quadro fecha a janela.
  private abrirJanela(tipo: Janela, largura: number, altura: number, fecharAoClicarFora = true): Retangulo {
    this.fecharJanela();
    this.janela = tipo;
    const antes = new Set(this.children.list);
    const fundo = this.add.rectangle(0, 0, LARGURA, ALTURA, 0x0a0604, 0.62).setOrigin(0).setInteractive();
    if (fecharAoClicarFora) fundo.on('pointerup', () => this.fecharJanela());
    const quadro = { x: (LARGURA - largura) / 2, y: (ALTURA - altura) / 2, l: largura, a: altura };
    this.add.zone(quadro.x, quadro.y, largura, altura).setOrigin(0).setInteractive();
    this.painel(quadro.x, quadro.y, largura, altura).lineStyle(1.2, 0xc98a63, 0.5).strokeRoundedRect(quadro.x, quadro.y, largura, altura, 12);
    this.objetosDaJanela = this.children.list.filter((o) => !antes.has(o));
    return quadro;
  }

  // Cria objetos da janela aberta e os guarda para fechar junto.
  private naJanela<T extends Phaser.GameObjects.GameObject>(criar: () => T): T {
    const antes = new Set(this.children.list);
    const objeto = criar();
    this.objetosDaJanela.push(...this.children.list.filter((o) => !antes.has(o)));
    return objeto;
  }

  private botaoNaJanela(x: number, y: number, largura: number, c: ConfiguracaoDoBotao): void {
    this.naJanela(() => {
      const b = criarBotao(this, x, y, largura, 46);
      b.configurar(c);
      return b.objetos[0];
    });
  }

  private abrirOpcoes(): void {
    const q = this.abrirJanela('opcoes', 360, 320);
    const cx = q.x + q.l / 2;
    this.naJanela(() => this.add.text(cx, q.y + 34, 'OPÇÕES', estilo(14, LARANJA, true, FONTE_TITULO)).setLetterSpacing(5).setOrigin(0.5));
    const x = q.x + 30;
    const largura = q.l - 60;
    this.botaoNaJanela(x, q.y + 62, largura, { texto: 'Continuar', tecla: 'Esc', tipo: 'principal', acao: () => this.fecharJanela() });
    this.botaoNaJanela(x, q.y + 120, largura, {
      texto: 'Nova partida',
      tipo: 'secundario',
      acao: () => this.confirmar('Começar uma nova partida?', 'Mesmos jogadores, baralho novo. A partida atual será perdida.', 'Nova partida', () => this.tabuleiro.novaPartida()),
    });
    this.botaoNaJanela(x, q.y + 178, largura, {
      texto: 'Trocar jogadores',
      tipo: 'secundario',
      acao: () => this.confirmar('Trocar os jogadores?', 'Volta para a escolha de jogadores. A partida atual será perdida.', 'Trocar', () => this.tabuleiro.trocarJogadores()),
    });
    this.botaoNaJanela(x, q.y + 236, largura, {
      texto: 'Voltar ao menu principal',
      tipo: 'secundario',
      acao: () => this.confirmar('Voltar ao menu principal?', 'A partida atual será perdida.', 'Sair', () => this.tabuleiro.voltarAoMenu()),
    });
  }

  private confirmar(pergunta: string, aviso: string, rotuloDoSim: string, acao: () => void): void {
    const q = this.abrirJanela('confirmar', 440, 200, false);
    const cx = q.x + q.l / 2;
    this.naJanela(() => this.add.text(cx, q.y + 42, pergunta, estilo(19, CREME, true)).setOrigin(0.5));
    this.naJanela(() =>
      this.add.text(cx, q.y + 82, aviso, { ...estilo(14, CREME_FRACO, true), align: 'center', wordWrap: { width: q.l - 60 } }).setOrigin(0.5),
    );
    const largura = (q.l - 70) / 2;
    this.botaoNaJanela(q.x + 30, q.y + 124, largura, { texto: 'Cancelar', tecla: 'Esc', tipo: 'secundario', acao: () => this.abrirOpcoes() });
    this.botaoNaJanela(q.x + 40 + largura, q.y + 124, largura, { texto: rotuloDoSim, tipo: 'principal', acao });
  }

  // Registro completo em HTML, para rolar com a roda do mouse. Fica aberto e se atualiza durante a vez da CPU.
  private abrirLog(): void {
    const eventos = this.estado?.eventos ?? [];
    const rolagemAnterior = this.janela === 'log' ? document.getElementById('registro-da-partida')?.scrollTop : undefined;
    this.fecharJanela();
    this.janela = 'log';
    this.eventosNoLog = eventos.length;

    const div = (css: Partial<CSSStyleDeclaration>, texto = '') => {
      const el = document.createElement('div');
      Object.assign(el.style, css);
      el.textContent = texto;
      return el;
    };
    // O Phaser controla o display do elemento de fora; por isso o quadro é posicionado à mão, sem flex.
    const tela = div({ width: `${LARGURA}px`, height: `${ALTURA}px`, position: 'relative', background: 'rgba(10, 6, 4, 0.62)' });
    tela.addEventListener('click', (e) => e.target === tela && this.fecharJanela());

    const [larguraDoQuadro, alturaDoQuadro] = [680, 540];
    const quadro = div({
      position: 'absolute', left: `${(LARGURA - larguraDoQuadro) / 2}px`, top: `${(ALTURA - alturaDoQuadro) / 2}px`,
      width: `${larguraDoQuadro}px`, height: `${alturaDoQuadro}px`, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '22px 24px',
      background: corCss(COR_PAINEL), border: '1px solid rgba(201, 138, 99, 0.5)', borderRadius: '12px', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
    });
    const cabecalho = div({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' });
    const titulo = div({ font: `bold 15px ${FONTE_TITULO}`, letterSpacing: '4px', color: LARANJA }, 'REGISTRO DA PARTIDA');
    const fechar = document.createElement('button');
    Object.assign(fechar.style, {
      font: `bold 14px ${FONTE}`, color: CREME, background: '#3a2a22', border: '1px solid #6e5444', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
    });
    fechar.textContent = 'Fechar  Esc';
    fechar.addEventListener('click', () => this.fecharJanela());
    const quantos = div({ font: `bold 13px ${FONTE}`, color: CREME_FRACO, marginLeft: '14px', flex: '1' }, `${eventos.length} acontecimento${eventos.length === 1 ? '' : 's'}`);
    cabecalho.append(titulo, quantos, fechar);

    const lista = div({ flex: '1', overflowY: 'auto', paddingRight: '8px' });
    lista.id = 'registro-da-partida';
    eventos.forEach((texto, i) => {
      const linha = div({ display: 'flex', gap: '12px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', font: `14px ${FONTE}`, color: i === eventos.length - 1 ? CREME : CREME_FRACO });
      linha.append(div({ minWidth: '34px', textAlign: 'right', color: CREME_APAGADO, fontWeight: 'bold' }, `${i + 1}.`), div({ flex: '1' }, texto));
      lista.append(linha);
    });
    quadro.append(cabecalho, lista);
    tela.append(quadro);
    this.objetosDaJanela = [this.add.dom(0, 0, tela).setOrigin(0)];
    // Abre no fim (o mais novo); se já estava aberto, mantém onde a pessoa tinha rolado.
    lista.scrollTop = rolagemAnterior ?? lista.scrollHeight;
  }

  // Classificação final, no meio da tela.
  private mostrarResultado(classificacao: readonly Colocacao[]): void {
    const altura = 210 + classificacao.length * 44;
    const q = this.abrirJanela('resultado', 540, altura, false);
    const cx = q.x + q.l / 2;
    const vencedores = classificacao.filter((c) => c.posicao === 1).map((c) => c.jogador.nome);
    const titulo = vencedores.length > 1 ? `Empate: ${vencedores.join(' e ')}!` : `${vencedores[0]} venceu!`;
    this.naJanela(() => this.add.text(cx, q.y + 32, 'FIM DA PARTIDA', estilo(14, LARANJA, true, FONTE_TITULO)).setLetterSpacing(5).setOrigin(0.5));
    this.naJanela(() => this.add.text(cx, q.y + 68, titulo, estilo(28, CREME, true, FONTE_TITULO)).setOrigin(0.5));

    const esquerda = q.x + 36;
    const direita = q.x + q.l - 36;
    classificacao.forEach(({ jogador, posicao }, i) => {
      const y = q.y + 120 + i * 44;
      this.naJanela(() => this.add.text(esquerda, y, `${posicao}º`, estilo(18, CREME_FRACO, true)).setOrigin(0, 0.5));
      this.naJanela(() => {
        const g = this.add.graphics();
        desenharMarcador(g, TipoDeMarcador.COLONO, jogador.cor, esquerda + 52, y + 5, 80);
        return g;
      });
      this.naJanela(() => this.add.text(esquerda + 72, y, jogador.nome, estilo(18, CREME, true)).setOrigin(0, 0.5));
      this.naJanela(() => this.add.text(direita - 92, y, `${jogador.totalDisponivel()} na reserva`, estilo(12, CREME_FRACO, true)).setOrigin(1, 0.5));
      this.naJanela(() => this.add.text(direita, y, `${jogador.getPontos()} pts`, estilo(18, CREME, true)).setOrigin(1, 0.5));
    });
    this.naJanela(() =>
      this.add.text(cx, q.y + altura - 84, 'Desempate: mais marcadores na reserva.', estilo(12, CREME_APAGADO, true)).setOrigin(0.5),
    );

    const largura = (q.l - 80) / 3;
    const yBotoes = q.y + altura - 64;
    this.botaoNaJanela(q.x + 30, yBotoes, largura, { texto: 'Jogar de novo', tipo: 'principal', acao: () => this.tabuleiro.novaPartida() });
    this.botaoNaJanela(q.x + 40 + largura, yBotoes, largura, { texto: 'Jogadores', tipo: 'secundario', acao: () => this.tabuleiro.trocarJogadores() });
    this.botaoNaJanela(q.x + 50 + 2 * largura, yBotoes, largura, { texto: 'Ver tabuleiro', tipo: 'secundario', acao: () => this.fecharJanela() });
  }
}
