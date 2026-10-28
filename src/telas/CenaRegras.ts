import Phaser from 'phaser';
import { DefinicaoTile } from '../jogo/DefinicaoTile';
import { TipoDeMarcador } from '../jogo/Marcador';
import { Terrain } from '../jogo/Terrain';
import { CHAVE_DAS_PECAS } from './desenharPeca';
import { desenharMarcador } from './desenharMarcador';
import {
  CENAS,
  CORES_DOS_JOGADORES,
  COR_ESCURA,
  COR_LARANJA,
  CREME,
  CREME_FRACO,
  FONTE_TITULO,
  LARANJA,
  criarTituloDaTela,
  desenharFundoPontilhado,
  desenharPecaIlustrativa,
  estilo,
} from './ui';

const COR_PAINEL = 0x24160f;

const PREPARACAO = 'De 2 a 5 jogadores. A peça inicial (estufa com duto) fica no centro da mesa; as outras 71 peças formam o baralho, embaralhado.';

const PASSOS_DO_TURNO = [
  'Compre a peça do topo do baralho.',
  'Gire a peça e coloque-a encostada em pelo menos uma peça da mesa. Se a jogada não valer, tente de novo: você não perde a vez.',
  'Todos os lados que se tocam precisam combinar: habitat com habitat, duto com duto e solo com solo.',
  'Se quiser, ponha um colono ou o chefe num habitat, duto, estufa ou campo da peça.',
  'Se a peça não couber em lugar nenhum, ela é descartada e vem outra.',
];

const COLONOS_E_CHEFE =
  'Cada jogador tem 6 colonos e 1 chefe. Só dá para marcar uma construção que ainda não tem ninguém. ' +
  'Quando ela fica completa, quem tem mais força nela (colono 1, chefe 2) ganha os pontos, mesmo que outro jogador a tenha fechado; ' +
  'no empate, todos ganham. Os marcadores voltam na hora para a reserva (do campo, só no fim). Construção completa sem marcador não dá pontos.';

const FIM_DA_PARTIDA =
  'Quando o baralho acaba, cada construção aberta com marcador pontua para a maioria, e esses marcadores ficam no tabuleiro. ' +
  'Vence quem tiver mais pontos; no empate, quem tiver mais marcadores na reserva. Se ainda empatar, a colocação é dividida.';

// Nenhuma peça do catálogo é só solo; esta só aparece se a folha de arte não carregar.
const SO_SOLO = new DefinicaoTile('so-solo', [
  { id: 's1', tipo: Terrain.SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

// [peça ilustrativa (null = solo), título, valor, texto]
const PONTUACAO: [string | null, string, string, string][] = [
  ['habitat-canto-cristal', 'Habitat', '1 por peça · 2 com cristal', 'Fechado (sem lado aberto), vale o dobro e pontua na hora; aberto, pontua na contagem final.'],
  ['duto-curva', 'Duto', '1 por peça', 'Completo (pontas numa estufa, bomba ou habitat, ou em circuito), pontua na hora; incompleto, na contagem final.'],
  ['estufa-duto', 'Estufa', '1 + 1 por peça em volta', 'Conta as 8 casas em volta. Cercada, pontua na hora (9); senão, na contagem final.'],
  [null, 'Campo', '2 por habitat fechado em volta', 'O solo ligado entre peças forma um campo, onde o colono vira marciano. Só pontua no fim: 2 por habitat fechado que encosta nele.'],
];

// Ícones desenhados com linhas; (x, y) é o centro.
function iconeBandeira(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(1.6, 0xf6ead8, 1).lineBetween(x - 4, y - 7, x - 4, y + 7);
  g.strokePoints([new Phaser.Math.Vector2(x - 4, y - 6), new Phaser.Math.Vector2(x + 5, y - 6), new Phaser.Math.Vector2(x + 3, y - 2.5), new Phaser.Math.Vector2(x + 5, y + 1), new Phaser.Math.Vector2(x - 4, y + 1)]);
}

function iconeCopia(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(1.6, 0xf6ead8, 1).strokeRoundedRect(x - 6, y - 3, 10, 10, 2);
  g.strokePoints([new Phaser.Math.Vector2(x - 2, y - 3), new Phaser.Math.Vector2(x - 2, y - 7), new Phaser.Math.Vector2(x + 7, y - 7), new Phaser.Math.Vector2(x + 7, y + 2), new Phaser.Math.Vector2(x + 4, y + 2)]);
}

function iconeFrasco(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number): void {
  g.lineStyle(1.5, cor, 1);
  g.strokePoints(
    [new Phaser.Math.Vector2(x - 2, y - 7), new Phaser.Math.Vector2(x - 2, y - 2), new Phaser.Math.Vector2(x - 6, y + 6), new Phaser.Math.Vector2(x + 6, y + 6), new Phaser.Math.Vector2(x + 2, y - 2), new Phaser.Math.Vector2(x + 2, y - 7)],
  );
  g.lineBetween(x - 4, y - 7, x + 4, y - 7);
}

function iconeTrofeu(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number): void {
  g.lineStyle(1.6, cor, 1);
  g.beginPath().arc(x, y - 4, 5, 0, Math.PI).strokePath();
  g.lineBetween(x - 5, y - 4, x - 5, y - 7).lineBetween(x + 5, y - 4, x + 5, y - 7).lineBetween(x - 5, y - 7, x + 5, y - 7);
  g.beginPath().arc(x - 6, y - 4, 2.5, Math.PI / 2, (3 * Math.PI) / 2).strokePath();
  g.beginPath().arc(x + 6, y - 4, 2.5, -Math.PI / 2, Math.PI / 2).strokePath();
  g.lineBetween(x, y + 1, x, y + 5).lineBetween(x - 4, y + 6, x + 4, y + 6);
}

// Tamanhos de letra: o corpo em 15 px fica legível mesmo com a janela menor que 1280 × 720.
const CORPO = 15;
const TITULO = 17;
const ENTRE_LINHAS = 3;
const ESPACO = 12;
const COLUNA = { x: 40, largura: 590 };
const PAINEL = { x: 659, y: 113, largura: 580 };

function corpo(largura: number): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...estilo(CORPO, CREME_FRACO), lineSpacing: ENTRE_LINHAS, wordWrap: { width: largura } };
}

export class CenaRegras extends Phaser.Scene {
  constructor() {
    super(CENAS.regras);
  }

  // Os cartões são empilhados pela altura do texto; no fim, a coluna e o painel terminam na mesma linha.
  create(): void {
    desenharFundoPontilhado(this);
    criarTituloDaTela(this, 'Regras');
    this.desenharAviso();

    this.add.text(COLUNA.x, 114, 'COMO JOGAR', estilo(14, LARANJA, true, FONTE_TITULO)).setLetterSpacing(4).setOrigin(0, 0.5);
    let y = this.cartoesCurtos(134);
    y = this.cartaoDoTurno(y + ESPACO);
    const fimDaPartida = this.cartaoDoFim(y + ESPACO);
    const painel = this.painelDePontuacao();

    const base = Math.max(fimDaPartida.base, painel.base);
    fimDaPartida.pintar(base);
    painel.pintar(base);
  }

  // Selo "em teste" à direita do título.
  private desenharAviso(): void {
    const aviso = this.add.text(0, 58, 'Regras em teste: podem mudar durante o desenvolvimento', estilo(13, '#f2c7a8', true)).setOrigin(0, 0.5);
    const largura = aviso.width + 58;
    const x = 1240 - largura;
    aviso.setX(x + 38);
    this.add
      .graphics()
      .fillStyle(0x3a2016, 0.9)
      .fillRoundedRect(x, 42, largura, 32, 16)
      .lineStyle(1.2, 0xc06a45, 0.7)
      .strokeRoundedRect(x, 42, largura, 32, 16);
    iconeFrasco(this.add.graphics(), x + 21, 58, 0xf2c7a8);
    aviso.setDepth(1);
  }

  // Fundo de cartão. Criado antes do conteúdo para ficar atrás; pintado depois, quando a altura é conhecida.
  private fundoDeCartao(): (x: number, y: number, largura: number, altura: number) => void {
    const g = this.add.graphics();
    return (x, y, largura, altura) =>
      g
        .clear()
        .fillStyle(COR_ESCURA, 0.7)
        .fillRoundedRect(x, y, largura, altura, 10)
        .lineStyle(1, 0xffffff, 0.08)
        .strokeRoundedRect(x, y, largura, altura, 10);
  }

  // Objetivo e Preparação lado a lado, com a mesma altura. Devolve onde terminam.
  private cartoesCurtos(y: number): number {
    const largura = (COLUNA.largura - ESPACO) / 2;
    const cartoes: [string, string, (g: Phaser.GameObjects.Graphics, x: number, y: number) => void][] = [
      ['Objetivo', 'Construir a melhor colônia em Marte. Quem tiver mais pontos no fim da partida vence.', iconeBandeira],
      ['Preparação', PREPARACAO, iconeCopia],
    ];
    const pintores = cartoes.map(() => this.fundoDeCartao());
    const alturas = cartoes.map(([titulo, texto, icone], i) => {
      const x = COLUNA.x + i * (largura + ESPACO);
      icone(this.add.graphics(), x + 22, y + 22);
      this.add.text(x + 40, y + 22, titulo, estilo(TITULO, CREME, true)).setOrigin(0, 0.5);
      return 42 + this.add.text(x + 15, y + 42, texto, corpo(largura - 30)).height + 14;
    });
    const altura = Math.max(...alturas);
    pintores.forEach((pintar, i) => pintar(COLUNA.x + i * (largura + ESPACO), y, largura, altura));
    return y + altura;
  }

  private cartaoDoTurno(y: number): number {
    const pintar = this.fundoDeCartao();
    const x = COLUNA.x + 17;
    this.add.text(x, y + 24, 'Seu turno', estilo(TITULO, CREME, true)).setOrigin(0, 0.5);
    const g = this.add.graphics();
    let yPasso = y + 46;
    PASSOS_DO_TURNO.forEach((passo, i) => {
      g.fillStyle(COR_LARANJA, 1).fillRoundedRect(x, yPasso, 22, 22, 4);
      this.add.text(x + 11, yPasso + 11, String(i + 1), estilo(13, CREME, true)).setOrigin(0.5);
      const texto = this.add.text(x + 34, yPasso + 1, passo, corpo(COLUNA.largura - 68));
      yPasso += Math.max(22, texto.height) + 8;
    });
    const altura = yPasso - y + 6;
    pintar(COLUNA.x, y, COLUNA.largura, altura);
    return y + altura;
  }

  // Último cartão da coluna: é esticado até a base comum.
  private cartaoDoFim(y: number): { base: number; pintar: (base: number) => void } {
    const pintar = this.fundoDeCartao();
    iconeTrofeu(this.add.graphics(), COLUNA.x + 26, y + 24, 0xe8834f);
    this.add.text(COLUNA.x + 44, y + 24, 'Fim da partida', estilo(TITULO, CREME, true)).setOrigin(0, 0.5);
    const texto = this.add.text(COLUNA.x + 17, y + 44, FIM_DA_PARTIDA, corpo(COLUNA.largura - 34));
    return { base: y + 44 + texto.height + 16, pintar: (base) => pintar(COLUNA.x, y, COLUNA.largura, base - y) };
  }

  private painelDePontuacao(): { base: number; pintar: (base: number) => void } {
    const { x: x0, y: y0, largura } = PAINEL;
    const fundo = this.add.graphics();
    this.add.text(x0 + 20, y0 + 22, 'PONTUAÇÃO', estilo(14, LARANJA, true, FONTE_TITULO)).setLetterSpacing(4).setOrigin(0, 0.5);

    const tamanho = 64;
    const xTexto = x0 + 100;
    const larguraTexto = largura - 120;
    let y = y0 + 44;
    for (const [peca, titulo, valor, texto] of PONTUACAO) {
      this.desenharPecaDaLinha(peca, x0 + 20, y, tamanho);
      const rotulo = this.add.text(xTexto, y + 11, titulo, estilo(TITULO, CREME, true)).setOrigin(0, 0.5);
      this.add.text(rotulo.x + rotulo.width + 10, y + 12, valor, estilo(14, LARANJA, true)).setOrigin(0, 0.5);
      const corpoDaLinha = this.add.text(xTexto, y + 24, texto, corpo(larguraTexto));
      y += Math.max(tamanho, 24 + corpoDaLinha.height) + 14;
    }

    // Colonos e chefe: quem leva os pontos de cada construção.
    this.add.graphics().lineStyle(1, 0xffffff, 0.1).lineBetween(x0 + 20, y, x0 + largura - 20, y);
    y += 16;
    const g = this.add.graphics();
    desenharMarcador(g, TipoDeMarcador.COLONO, CORES_DOS_JOGADORES[0], x0 + 36, y + 44, 96);
    desenharMarcador(g, TipoDeMarcador.CHEFE, CORES_DOS_JOGADORES[0], x0 + 70, y + 41, 96);
    this.add.text(xTexto, y + 11, 'Colonos e chefe', estilo(TITULO, CREME, true)).setOrigin(0, 0.5);
    const marcadores = this.add.text(xTexto, y + 24, COLONOS_E_CHEFE, corpo(larguraTexto));
    const base = y + 24 + marcadores.height + 20;

    return {
      base,
      pintar: (b) =>
        fundo
          .fillStyle(0x000000, 0.25)
          .fillRoundedRect(x0 + 2, y0 + 6, largura, b - y0, 14)
          .fillStyle(COR_PAINEL, 0.85)
          .fillRoundedRect(x0, y0, largura, b - y0, 14)
          .lineStyle(1, 0xffffff, 0.08)
          .strokeRoundedRect(x0, y0, largura, b - y0, 14),
    };
  }

  // O solo usa um canto só de solo da arte do habitat-lado (quadro 4), ampliado.
  private desenharPecaDaLinha(peca: string | null, x: number, y: number, tamanho: number): void {
    if (peca) {
      desenharPecaIlustrativa(this, peca, 0, x, y, tamanho);
    } else if (this.textures.exists(CHAVE_DAS_PECAS)) {
      this.add.image(x - tamanho, y - tamanho, CHAVE_DAS_PECAS, 4).setOrigin(0).setScale(tamanho / 128).setCrop(128, 128, 128, 128);
    } else {
      desenharPecaIlustrativa(this, SO_SOLO, 0, x, y, tamanho);
    }
    this.add.graphics().lineStyle(1, 0x000000, 0.5).strokeRect(x, y, tamanho, tamanho);
    // No campo, o colono aparece como marciano.
    if (!peca) desenharMarcador(this.add.graphics(), TipoDeMarcador.COLONO, CORES_DOS_JOGADORES[0], x + tamanho / 2, y + tamanho / 2 + 4, 120, true);
  }
}
