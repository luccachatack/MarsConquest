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
  'Se quiser, ponha um colono ou o chefe num habitat, duto ou estufa dessa peça.',
  'Se a peça não couber em lugar nenhum, ela é descartada e você compra outra.',
];

const COLONOS_E_CHEFE =
  'Cada jogador tem 6 colonos e 1 chefe. Só dá para marcar uma construção que ainda não tem ninguém. ' +
  'Quando ela fica completa, quem tem mais força nela (colono 1, chefe 2) ganha os pontos, mesmo que outro jogador a tenha fechado; ' +
  'no empate, todos ganham. Os marcadores voltam na hora para a reserva. Construção completa sem marcador não dá pontos.';

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
  [null, 'Solo', '0', 'Não aceita marcador e não pontua.'],
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

export class CenaRegras extends Phaser.Scene {
  constructor() {
    super(CENAS.regras);
  }

  create(): void {
    desenharFundoPontilhado(this);
    criarTituloDaTela(this, 'Regras');
    this.desenharAviso();

    this.add.text(40, 118, 'COMO JOGAR', estilo(13, LARANJA, true, FONTE_TITULO)).setLetterSpacing(4).setOrigin(0, 0.5);
    this.cartaoCurto(40, 'Objetivo', 'Construir a melhor colônia em Marte. Quem tiver mais pontos no fim da partida vence.', iconeBandeira);
    this.cartaoCurto(341, 'Preparação', PREPARACAO, iconeCopia);
    this.cartaoDoTurno();
    this.cartaoDosMarcadores();
    this.painelDePontuacao();
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

  private cartao(x: number, y: number, largura: number, altura: number): void {
    this.add
      .graphics()
      .fillStyle(COR_ESCURA, 0.7)
      .fillRoundedRect(x, y, largura, altura, 10)
      .lineStyle(1, 0xffffff, 0.08)
      .strokeRoundedRect(x, y, largura, altura, 10);
  }

  private cartaoCurto(
    x: number,
    titulo: string,
    texto: string,
    icone: (g: Phaser.GameObjects.Graphics, x: number, y: number) => void,
  ): void {
    this.cartao(x, 141, 289, 107);
    icone(this.add.graphics(), x + 22, 163);
    this.add.text(x + 40, 163, titulo, estilo(15, CREME, true)).setOrigin(0, 0.5);
    this.add.text(x + 15, 180, texto, { ...estilo(13, CREME_FRACO), lineSpacing: 5, wordWrap: { width: 262 } });
  }

  private cartaoDoTurno(): void {
    this.cartao(40, 263, 590, 227);
    this.add.text(57, 287, 'Seu turno', estilo(15, CREME, true)).setOrigin(0, 0.5);
    const g = this.add.graphics();
    let y = 306;
    PASSOS_DO_TURNO.forEach((passo, i) => {
      g.fillStyle(COR_LARANJA, 1).fillRoundedRect(57, y, 21, 21, 4);
      this.add.text(67.5, y + 10.5, String(i + 1), estilo(12, CREME, true)).setOrigin(0.5);
      const texto = this.add.text(89, y + 2, passo, { ...estilo(13, CREME_FRACO), lineSpacing: 5, wordWrap: { width: 520 } });
      y += Math.max(21, texto.height) + 9;
    });
  }

  private cartaoDosMarcadores(): void {
    this.cartao(40, 505, 590, 150);
    const g = this.add.graphics();
    desenharMarcador(g, TipoDeMarcador.COLONO, CORES_DOS_JOGADORES[0], 70, 552, 96);
    desenharMarcador(g, TipoDeMarcador.CHEFE, CORES_DOS_JOGADORES[0], 103, 549, 96);
    this.add.text(135, 530, 'Colonos e chefe', estilo(15, CREME, true)).setOrigin(0, 0.5);
    this.add.text(135, 546, COLONOS_E_CHEFE, { ...estilo(13, CREME_FRACO), lineSpacing: 5, wordWrap: { width: 475 } });
  }

  private painelDePontuacao(): void {
    const [x0, y0, largura, altura] = [659, 113, 580, 578];
    this.add
      .graphics()
      .fillStyle(0x000000, 0.25)
      .fillRoundedRect(x0 + 2, y0 + 6, largura, altura, 14)
      .fillStyle(COR_PAINEL, 0.85)
      .fillRoundedRect(x0, y0, largura, altura, 14)
      .lineStyle(1, 0xffffff, 0.08)
      .strokeRoundedRect(x0, y0, largura, altura, 14);
    this.add.text(x0 + 20, 135, 'PONTUAÇÃO', estilo(13, LARANJA, true, FONTE_TITULO)).setLetterSpacing(4).setOrigin(0, 0.5);

    const tamanho = 64;
    PONTUACAO.forEach(([peca, titulo, valor, texto], i) => {
      const y = 156 + i * 76;
      this.desenharPecaDaLinha(peca, x0 + 20, y, tamanho);
      const rotulo = this.add.text(x0 + 100, y + 12, titulo, estilo(15, CREME, true)).setOrigin(0, 0.5);
      this.add.text(rotulo.x + rotulo.width + 9, y + 13, valor, estilo(12, LARANJA, true)).setOrigin(0, 0.5);
      this.add.text(x0 + 100, y + 25, texto, { ...estilo(13, CREME_FRACO), lineSpacing: 5, wordWrap: { width: 455 } });
    });

    this.add.graphics().lineStyle(1, 0xffffff, 0.1).lineBetween(x0 + 20, 575, x0 + largura - 20, 575);
    iconeTrofeu(this.add.graphics(), x0 + 29, 600, 0xe8834f);
    this.add.text(x0 + 46, 600, 'Fim da partida', estilo(15, CREME, true)).setOrigin(0, 0.5);
    this.add.text(x0 + 20, 617, FIM_DA_PARTIDA, { ...estilo(13, CREME_FRACO), lineSpacing: 5, wordWrap: { width: largura - 40 } });
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
  }
}
