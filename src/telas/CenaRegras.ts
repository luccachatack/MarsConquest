import Phaser from 'phaser';
import { DefinicaoTile } from '../jogo/DefinicaoTile';
import { Terrain } from '../jogo/Terrain';
import { CENAS, COR_PAINEL, COR_TEXTO, COR_TEXTO_FRACO, COR_TITULO, criarCabecalho, desenharPecaIlustrativa, estilo } from './ui';

const COMO_JOGAR: [string, string][] = [
  ['Objetivo', 'Construir a melhor colônia em Marte. Quem tiver mais pontos no fim da partida vence.'],
  ['Preparação', 'De 2 a 5 jogadores. A peça inicial (estufa com duto) fica no centro da mesa; as outras 57 peças formam o baralho, embaralhado.'],
  [
    'Seu turno',
    '1. Compre a peça do topo do baralho.\n' +
      '2. Gire a peça e coloque-a encostada em pelo menos uma peça da mesa. Se a jogada não valer, tente de novo: você não perde a vez.\n' +
      '3. Todos os lados que se tocam precisam combinar: habitat com habitat, duto com duto e solo com solo.\n' +
      '4. Se quiser, ponha um colono ou o chefe num habitat, duto ou estufa dessa peça.\n' +
      '5. Se a peça não couber em lugar nenhum, ela é descartada e você compra outra.',
  ],
  [
    'Colonos e chefe',
    'Cada jogador tem 6 colonos e 1 chefe. Só dá para marcar uma construção que ainda não tem ninguém. ' +
      'Quando ela fica completa, quem tem mais força nela (colono 1, chefe 2) ganha os pontos, mesmo que outro jogador a tenha fechado; no empate, todos ganham. ' +
      'Os marcadores voltam na hora para a reserva. Construção completa sem marcador não dá pontos.',
  ],
];

// Fica no painel da pontuação, abaixo das peças: a coluna "Como jogar" já ocupa a altura da tela.
const FIM_DA_PARTIDA =
  'Quando o baralho acaba, cada construção aberta com marcador pontua para a maioria, e esses marcadores ficam no tabuleiro. ' +
  'Vence quem tiver mais pontos; no empate, quem tiver mais marcadores na reserva. Se ainda empatar, a colocação é dividida.';

// Nenhuma peça do catálogo é só solo; esta existe apenas para a ilustração.
const SO_SOLO = new DefinicaoTile('so-solo', [
  { id: 's1', tipo: Terrain.SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

// [peça ilustrativa, rotação, título, texto]
const PONTUACAO: [string | DefinicaoTile, number, string, string][] = [
  ['habitat-canto-cristal', 0, 'Habitat', '1 ponto por peça, 2 na peça com cristal. Fechado (sem lado aberto), vale o dobro e pontua na hora; aberto, pontua na contagem final.'],
  ['duto-curva', 0, 'Duto', '1 ponto por peça. Completo (pontas numa estufa, bomba ou habitat, ou em circuito), pontua na hora; incompleto, na contagem final.'],
  ['estufa-duto', 0, 'Estufa', '1 ponto por ela e 1 por peça nas 8 casas em volta. Cercada, pontua na hora (9); senão, na contagem final.'],
  [SO_SOLO, 0, 'Solo', 'Não aceita marcador e não pontua.'],
];

export class CenaRegras extends Phaser.Scene {
  constructor() {
    super(CENAS.regras);
  }

  create(): void {
    criarCabecalho(this, 'Regras', 'Regras em teste: podem mudar durante o desenvolvimento.');

    this.add.text(40, 110, 'Como jogar', estilo(20, COR_TITULO, true));
    let y = 146;
    for (const [titulo, texto] of COMO_JOGAR) {
      this.add.text(40, y, titulo, estilo(16, COR_TEXTO, true));
      const corpo = this.add.text(40, y + 24, texto, { ...estilo(14, COR_TEXTO_FRACO), lineSpacing: 4, wordWrap: { width: 540 } });
      y += 24 + corpo.height + 16;
    }

    const x0 = 620;
    this.add.graphics().fillStyle(COR_PAINEL, 1).fillRoundedRect(x0, 100, 620, 590, 12);
    this.add.text(x0 + 24, 116, 'Pontuação', estilo(20, COR_TITULO, true));

    const tamanho = 72;
    PONTUACAO.forEach(([id, rotacao, titulo, texto], i) => {
      const yLinha = 156 + i * 104;
      desenharPecaIlustrativa(this, id, rotacao, x0 + 24, yLinha, tamanho);
      this.add.text(x0 + 116, yLinha, titulo, estilo(16, COR_TEXTO, true));
      this.add.text(x0 + 116, yLinha + 24, texto, { ...estilo(14, COR_TEXTO_FRACO), lineSpacing: 4, wordWrap: { width: 480 } });
    });

    const yFim = 156 + PONTUACAO.length * 104;
    this.add.text(x0 + 24, yFim, 'Fim da partida', estilo(16, COR_TEXTO, true));
    this.add.text(x0 + 24, yFim + 24, FIM_DA_PARTIDA, { ...estilo(14, COR_TEXTO_FRACO), lineSpacing: 4, wordWrap: { width: 572 } });
  }
}
