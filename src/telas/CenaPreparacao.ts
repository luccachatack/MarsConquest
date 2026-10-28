import Phaser from 'phaser';
import { MAX_JOGADORES, MIN_JOGADORES, TAMANHO_MAXIMO_DO_NOME, TipoDeJogador } from '../jogo/Jogador';
import { ARQUIVO_DA_CAPA, CAPA_DO_MENU, CENAS, CORES_DOS_JOGADORES, FONTE, FONTE_TITULO, NOMES_DOS_TIPOS, corCss } from './ui';

// O que a CenaTabuleiro recebe para montar a partida.
export interface ConfiguracaoDeJogador {
  readonly nome: string;
  readonly tipo: TipoDeJogador;
  readonly cor: number;
}

export interface DadosDaPartida {
  readonly jogadores: readonly ConfiguracaoDeJogador[];
}

// Uma vaga da tela: tipo null = vaga fora da partida.
interface Vaga {
  tipo: TipoDeJogador | null;
  nome: string;
}

// Ordem do botão de tipo: cada clique passa para o próximo.
const CICLO_DE_TIPOS: (TipoDeJogador | null)[] = [
  TipoDeJogador.HUMANO,
  TipoDeJogador.CPU_FACIL,
  TipoDeJogador.CPU_DIFICIL,
  null,
];

const CHAVE_DO_REGISTRO = 'vagas-da-partida';
const NOME_PADRAO = /^(Jogador|CPU) \d$/;

function nomePadrao(tipo: TipoDeJogador | null, indice: number): string {
  return tipo === TipoDeJogador.HUMANO || tipo === null ? `Jogador ${indice + 1}` : `CPU ${indice + 1}`;
}

function vagasIniciais(): Vaga[] {
  return Array.from({ length: MAX_JOGADORES }, (_, i) => {
    const tipo = i === 0 ? TipoDeJogador.HUMANO : i === 1 ? TipoDeJogador.CPU_FACIL : null;
    return { tipo, nome: nomePadrao(tipo, i) };
  });
}

const LARGURA = 1280;
const ALTURA = 720;

// Cores da tela, em tons de Marte para combinar com a capa.
const CREME = '#f6ead8';
const CREME_FRACO = '#d9c7b4';
const LARANJA = '#e8834f';
const COR_LARANJA = 0xd9643a;
const COR_PAINEL = 0x24160f;
const COR_LINHA = 0x3a2419;
const COR_ESCURA = 0x2a1a14;

// Painel "Tripulação" e linhas das vagas.
const PAINEL = { x: 201, y: 159, largura: 878, altura: 380 };
const X_LINHA = 219;
const LARGURA_LINHA = 842;
const Y_PRIMEIRA = 201;
const ALTURA_LINHA = 56;
const ESPACO_ENTRE_LINHAS = 10;
const BOTAO_TIPO = { x: 376, largura: 214, altura: 40 };
const CAMPO = { x: 608, largura: 436, altura: 42 };
const BOTAO_COMECAR = { x: 481, y: 563, largura: 318, altura: 58 };

function estiloTexto(
  tamanho: number,
  cor: string,
  negrito = false,
  fonte = FONTE,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: fonte, fontSize: `${tamanho}px`, color: cor, fontStyle: negrito ? 'bold' : 'normal', resolution: 2 };
}

// Ícones desenhados com linhas, centrados em (x, y).
function iconePessoa(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number): void {
  g.lineStyle(1.8, cor, 1).strokeCircle(x, y - 3.5, 3.5);
  g.beginPath().arc(x, y + 7.5, 6.5, Math.PI, 2 * Math.PI).strokePath();
}

function iconeChip(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number): void {
  g.lineStyle(1.8, cor, 1).strokeRect(x - 5, y - 5, 10, 10);
  g.fillStyle(cor, 1).fillRect(x - 2, y - 2, 4, 4);
  for (const d of [-3, 0, 3]) {
    g.lineBetween(x + d, y - 5, x + d, y - 8).lineBetween(x + d, y + 5, x + d, y + 8);
    g.lineBetween(x - 5, y + d, x - 8, y + d).lineBetween(x + 5, y + d, x + 8, y + d);
  }
}

function iconeFora(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number): void {
  g.lineStyle(1.8, cor, 1).strokeCircle(x, y, 7).lineBetween(x - 3.5, y, x + 3.5, y);
}

function iconeTroca(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number): void {
  g.lineStyle(1.6, cor, 1);
  g.lineBetween(x - 6, y - 3, x + 6, y - 3).lineBetween(x + 6, y - 3, x + 3, y - 6);
  g.lineBetween(x + 6, y + 3, x - 6, y + 3).lineBetween(x - 6, y + 3, x - 3, y + 6);
}

// Avatar da vaga: círculo na cor do jogador com um capacete de astronauta.
function avatar(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number, alfa: number): void {
  g.fillStyle(cor, alfa).fillCircle(x, y, 18);
  g.lineStyle(2.6, COR_ESCURA, alfa).strokeCircle(x, y - 2, 8.5);
  g.fillStyle(COR_ESCURA, alfa).fillRoundedRect(x - 5, y - 4.5, 10, 5, 2);
  g.fillRoundedRect(x - 8, y + 9, 16, 5, 2);
}

// Contorno tracejado de um retângulo (para a vaga fora da partida).
function retanguloTracejado(g: Phaser.GameObjects.Graphics, x: number, y: number, l: number, a: number, cor: number): void {
  g.lineStyle(1.2, cor, 0.7);
  const traco = 5;
  const lados: [number, number, number, number][] = [
    [x, y, x + l, y],
    [x + l, y, x + l, y + a],
    [x + l, y + a, x, y + a],
    [x, y + a, x, y],
  ];
  for (const [x0, y0, x1, y1] of lados) {
    const comprimento = Math.hypot(x1 - x0, y1 - y0);
    for (let t = 0; t < comprimento; t += traco * 2) {
      const t1 = Math.min(t + traco, comprimento);
      g.lineBetween(x0 + ((x1 - x0) * t) / comprimento, y0 + ((y1 - y0) * t) / comprimento,
        x0 + ((x1 - x0) * t1) / comprimento, y0 + ((y1 - y0) * t1) / comprimento);
    }
  }
}

// Antes da partida: até 5 vagas, cada uma humano, CPU (fácil ou difícil) ou fora, com nome.
export class CenaPreparacao extends Phaser.Scene {
  private vagas: Vaga[] = [];
  private mensagem!: Phaser.GameObjects.Text;
  private contagem!: Phaser.GameObjects.Text;

  constructor() {
    super(CENAS.preparacao);
  }

  // A capa já vem carregada do menu; carregar de novo não repete o download.
  preload(): void {
    this.load.image(CAPA_DO_MENU, ARQUIVO_DA_CAPA);
  }

  create(): void {
    // A tela lembra a última escolha (registry do Phaser vale para o jogo todo).
    const salvas = this.registry.get(CHAVE_DO_REGISTRO) as Vaga[] | undefined;
    this.vagas = salvas ? salvas.map((v) => ({ ...v })) : vagasIniciais();

    this.desenharFundo();
    this.desenharCabecalho();
    this.desenharPainel();
    this.vagas.forEach((_, i) => this.criarLinha(i));
    this.atualizarContagem();

    this.mensagem = this.add.text(LARGURA / 2, 551, '', estiloTexto(13, '#ff9b85', true)).setOrigin(0.5);
    this.criarBotaoComecar();
    this.add
      .text(LARGURA / 2, 646, 'Cada jogador tem 6 colonos e 1 chefe, que vale por dois. Os jogadores jogam na ordem da lista.',
        estiloTexto(13, CREME_FRACO, true))
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.comecar());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(CENAS.menu));
  }

  // A capa do menu, desfocada e escurecida, atrás de tudo.
  private desenharFundo(): void {
    const capa = this.add.image(LARGURA / 2, ALTURA / 2, CAPA_DO_MENU);
    capa.setScale(Math.max(LARGURA / capa.width, ALTURA / capa.height) * 1.04);
    capa.enableFilters();
    capa.filters?.internal.addBlur(1, 1.5, 1.5, 1);
    this.add.rectangle(0, 0, LARGURA, ALTURA, 0x120a07, 0.42).setOrigin(0);
  }

  private desenharCabecalho(): void {
    // Botão "‹ Menu".
    const g = this.add.graphics();
    const pintar = (sobre: boolean) => {
      g.clear().fillStyle(COR_ESCURA, sobre ? 0.95 : 0.8).fillRoundedRect(38, 31, 97, 42, 10);
      g.lineStyle(1.2, 0xc98a63, sobre ? 0.9 : 0.45).strokeRoundedRect(38, 31, 97, 42, 10);
      g.lineStyle(2, 0xf6ead8, 1).lineBetween(62, 47, 57, 52).lineBetween(57, 52, 62, 57);
    };
    pintar(false);
    this.add.text(78, 52, 'Menu', estiloTexto(15, CREME, true)).setOrigin(0, 0.5);
    this.add
      .zone(38, 31, 97, 42)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => pintar(true))
      .on('pointerout', () => pintar(false))
      .on('pointerdown', () => this.scene.start(CENAS.menu));

    this.add
      .text(LARGURA / 2, 31, 'MARS CONQUEST', estiloTexto(13, LARANJA, true, FONTE_TITULO))
      .setLetterSpacing(6)
      .setOrigin(0.5);
    this.add
      .text(LARGURA / 2, 66, 'Nova partida', estiloTexto(46, CREME, true, FONTE_TITULO))
      .setOrigin(0.5)
      .setShadow(0, 3, '#000000', 8, false, true);

    // Arco laranja com a "lua" na ponta, como no logotipo da capa.
    const arco = this.add.graphics();
    const curva = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(495, 113),
      new Phaser.Math.Vector2(640, 88),
      new Phaser.Math.Vector2(778, 104),
    );
    arco.lineStyle(2.5, COR_LARANJA, 1);
    curva.draw(arco, 40);
    arco.fillStyle(COR_LARANJA, 1).fillCircle(778, 104, 5);

    this.add
      .text(LARGURA / 2, 130, `De ${MIN_JOGADORES} a ${MAX_JOGADORES} jogadores. Clique no tipo para trocar.`,
        estiloTexto(15, CREME_FRACO, true))
      .setOrigin(0.5);
  }

  private desenharPainel(): void {
    const { x, y, largura, altura } = PAINEL;
    this.add
      .graphics()
      .fillStyle(0x000000, 0.25)
      .fillRoundedRect(x + 2, y + 6, largura, altura, 16)
      .fillStyle(COR_PAINEL, 0.82)
      .fillRoundedRect(x, y, largura, altura, 16)
      .lineStyle(1, 0xffffff, 0.08)
      .strokeRoundedRect(x, y, largura, altura, 16);
    this.add.text(x + 22, y + 21, 'TRIPULAÇÃO', estiloTexto(13, LARANJA, true, FONTE_TITULO)).setLetterSpacing(4).setOrigin(0, 0.5);
    this.contagem = this.add.text(x + largura - 22, y + 22, '', estiloTexto(12, CREME_FRACO, true)).setOrigin(1, 0.5);
  }

  private atualizarContagem(): void {
    const ocupadas = this.vagas.filter((v) => v.tipo !== null).length;
    this.contagem.setText(`${ocupadas} de ${MAX_JOGADORES} vagas ocupadas`);
  }

  private criarLinha(i: number): void {
    const y = Y_PRIMEIRA + i * (ALTURA_LINHA + ESPACO_ENTRE_LINHAS);
    const meio = y + ALTURA_LINHA / 2;
    const cor = CORES_DOS_JOGADORES[i];
    const fundo = this.add.graphics();
    const botao = this.add.graphics();
    const rotuloVaga = this.add
      .text(294, meio - 1, `VAGA ${i + 1}`, estiloTexto(14, CREME, true, FONTE_TITULO))
      .setLetterSpacing(2.5)
      .setOrigin(0, 0.5);
    const rotuloTipo = this.add.text(BOTAO_TIPO.x + 43, meio, '', estiloTexto(15, CREME, true)).setOrigin(0, 0.5);

    const campo = this.add
      .dom(CAMPO.x, meio - CAMPO.altura / 2, 'input', {
        width: `${CAMPO.largura}px`,
        height: `${CAMPO.altura}px`,
        boxSizing: 'border-box',
        padding: '0 14px',
        font: `18px ${FONTE}`,
        color: CREME,
        background: '#1c120e',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        outline: 'none',
      })
      .setOrigin(0);
    const input = campo.node as HTMLInputElement;
    input.maxLength = TAMANHO_MAXIMO_DO_NOME;
    input.value = this.vagas[i].nome;
    input.placeholder = 'Nome';
    input.addEventListener('input', () => {
      this.vagas[i].nome = input.value;
      this.mensagem.setText('');
    });
    input.addEventListener('focus', () => (input.style.borderColor = corCss(cor)));
    input.addEventListener('blur', () => (input.style.borderColor = 'rgba(255, 255, 255, 0.12)'));
    // Enter dentro do campo também começa a partida.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.comecar();
    });

    let sobre = false;
    const pintar = () => {
      const tipo = this.vagas[i].tipo;
      const ativa = tipo !== null;
      fundo.clear();
      fundo.fillStyle(COR_LINHA, ativa ? 0.6 : 0.3).fillRoundedRect(X_LINHA, y, LARGURA_LINHA, ALTURA_LINHA, 10);
      fundo.lineStyle(1, 0xffffff, ativa ? 0.09 : 0.05).strokeRoundedRect(X_LINHA, y, LARGURA_LINHA, ALTURA_LINHA, 10);
      avatar(fundo, 256, meio, cor, ativa ? 1 : 0.45);

      const [bx, by] = [BOTAO_TIPO.x, meio - BOTAO_TIPO.altura / 2];
      botao.clear();
      const corDoIcone = ativa ? 0xf6ead8 : 0xa8968a;
      if (tipo === TipoDeJogador.HUMANO) {
        botao.fillStyle(sobre ? 0x82492f : 0x6e3d27, 1).fillRoundedRect(bx, by, BOTAO_TIPO.largura, BOTAO_TIPO.altura, 6);
        botao.lineStyle(1.2, 0xb87553, 0.9).strokeRoundedRect(bx, by, BOTAO_TIPO.largura, BOTAO_TIPO.altura, 6);
        iconePessoa(botao, bx + 24, meio, corDoIcone);
      } else if (tipo) {
        botao.fillStyle(sobre ? 0x5a4033 : 0x4a3328, 1).fillRoundedRect(bx, by, BOTAO_TIPO.largura, BOTAO_TIPO.altura, 6);
        botao.lineStyle(1.2, 0x8e6a58, 0.8).strokeRoundedRect(bx, by, BOTAO_TIPO.largura, BOTAO_TIPO.altura, 6);
        iconeChip(botao, bx + 24, meio, corDoIcone);
      } else {
        botao.fillStyle(0x000000, sobre ? 0.25 : 0.12).fillRoundedRect(bx, by, BOTAO_TIPO.largura, BOTAO_TIPO.altura, 6);
        retanguloTracejado(botao, bx, by, BOTAO_TIPO.largura, BOTAO_TIPO.altura, 0x9a8070);
        iconeFora(botao, bx + 24, meio, corDoIcone);
      }
      iconeTroca(botao, bx + BOTAO_TIPO.largura - 21, meio, corDoIcone);

      rotuloTipo.setText(tipo ? NOMES_DOS_TIPOS[tipo] : 'Fora da partida').setColor(ativa ? CREME : '#b3a194');
      rotuloVaga.setColor(ativa ? CREME : '#8b7a6c');
      input.disabled = !ativa;
      input.style.color = ativa ? CREME : '#7d6d62';
      // A opacidade do campo vem do alpha do objeto: o Phaser reescreve style.opacity a cada quadro.
      campo.setAlpha(ativa ? 1 : 0.6);
    };

    this.add
      .zone(BOTAO_TIPO.x, meio - BOTAO_TIPO.altura / 2, BOTAO_TIPO.largura, BOTAO_TIPO.altura)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        sobre = true;
        pintar();
      })
      .on('pointerout', () => {
        sobre = false;
        pintar();
      })
      .on('pointerdown', () => {
        const vaga = this.vagas[i];
        const proximo = CICLO_DE_TIPOS[(CICLO_DE_TIPOS.indexOf(vaga.tipo) + 1) % CICLO_DE_TIPOS.length];
        // Troca o nome junto só se ainda for o nome padrão.
        if (NOME_PADRAO.test(vaga.nome.trim()) || vaga.nome.trim() === '') {
          vaga.nome = nomePadrao(proximo, i);
          input.value = vaga.nome;
        }
        vaga.tipo = proximo;
        this.mensagem.setText('');
        pintar();
        this.atualizarContagem();
      });
    pintar();
  }

  // Fundo do botão com degradê vertical, desenhado num canvas (o Graphics do Phaser
  // não faz degradê em retângulo arredondado). Uma textura normal e outra para o mouse em cima.
  private texturaDoBotao(chave: string, cima: string, baixo: string): string {
    const { largura, altura } = BOTAO_COMECAR;
    if (this.textures.exists(chave)) return chave;
    const textura = this.textures.createCanvas(chave, largura, altura)!;
    const ctx = textura.getContext();
    const degrade = ctx.createLinearGradient(0, 0, 0, altura);
    degrade.addColorStop(0, cima);
    degrade.addColorStop(1, baixo);
    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.roundRect(0.75, 0.75, largura - 1.5, altura - 1.5, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 150, 100, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    textura.refresh();
    return chave;
  }

  private criarBotaoComecar(): void {
    const { x, y, largura, altura } = BOTAO_COMECAR;
    this.add.graphics().fillStyle(0x000000, 0.35).fillRoundedRect(x + 1, y + 6, largura, altura, 12);
    const normal = this.texturaDoBotao('botao-comecar', '#d6643a', '#a83f22');
    const sobre = this.texturaDoBotao('botao-comecar-sobre', '#e8764a', '#bb4b2a');
    const fundo = this.add.image(x, y, normal).setOrigin(0);
    this.add.graphics().fillStyle(0xf6ead8, 1).fillTriangle(x + 57, y + 22, x + 57, y + 37, x + 69, y + 29.5);
    this.add.text(x + largura / 2 + 18, y + altura / 2, 'Começar partida', estiloTexto(22, CREME, true)).setOrigin(0.5);
    this.add
      .zone(x, y, largura, altura)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => fundo.setTexture(sobre))
      .on('pointerout', () => fundo.setTexture(normal))
      .on('pointerdown', () => this.comecar());
  }

  private comecar(): void {
    const ativas = this.vagas
      .map((v, i) => ({ ...v, nome: v.nome.trim(), cor: CORES_DOS_JOGADORES[i] }))
      .filter((v) => v.tipo !== null);
    const erro = this.validar(ativas.map((v) => v.nome));
    if (erro) {
      this.mensagem.setText(erro);
      return;
    }
    this.registry.set(CHAVE_DO_REGISTRO, this.vagas.map((v) => ({ ...v, nome: v.nome.trim() })));
    const dados: DadosDaPartida = {
      jogadores: ativas.map((v) => ({ nome: v.nome, tipo: v.tipo!, cor: v.cor })),
    };
    this.scene.start(CENAS.tabuleiro, dados);
  }

  // Mesmas regras de Jogador e Partida, com mensagens para a tela.
  private validar(nomes: string[]): string | null {
    if (nomes.length < MIN_JOGADORES) {
      return `Escolha pelo menos ${MIN_JOGADORES} jogadores.`;
    }
    if (nomes.some((n) => n.length === 0)) {
      return 'Todo jogador precisa de um nome.';
    }
    const minusculos = nomes.map((n) => n.toLocaleLowerCase());
    if (new Set(minusculos).size !== nomes.length) {
      return 'Dois jogadores não podem ter o mesmo nome.';
    }
    return null;
  }
}
