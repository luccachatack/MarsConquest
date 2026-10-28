import Phaser from 'phaser';
import { DefinicaoTile } from '../jogo/DefinicaoTile';
import { Terrain } from '../jogo/Terrain';
import { CENAS, COR_PAINEL, COR_TEXTO, COR_TEXTO_FRACO, COR_TITULO, criarCabecalho, desenharPecaIlustrativa, estilo } from './ui';

const COMO_JOGAR: [string, string][] = [
  ['Objetivo', 'Construir a melhor colônia em Marte. Quem tiver mais pontos no fim da partida vence.'],
  ['Preparação', 'A peça inicial (estufa com dutos) fica no centro da mesa. As outras 59 peças formam o baralho, embaralhado.'],
  [
    'Seu turno',
    '1. Compre a peça do topo do baralho.\n' +
      '2. Gire a peça e coloque-a encostada em pelo menos uma peça da mesa.\n' +
      '3. Todos os lados que se tocam precisam combinar: habitat com habitat, duto com duto, solo com solo e escotilha com escotilha.\n' +
      '4. Se quiser, ponha um colono ou o chefe num habitat ou duto dessa peça.\n' +
      '5. Se a peça não couber em lugar nenhum, ela é descartada e você compra outra.',
  ],
  [
    'Colonos e chefe',
    'Cada jogador tem 6 colonos e 1 chefe. Só dá para marcar uma construção que ainda não tem ninguém. ' +
      'Quando ela fica completa, quem tem mais força nela (colono 1, chefe 2) ganha os pontos; no empate, todos ganham. ' +
      'Os marcadores voltam para a reserva. Construção completa sem marcador não dá pontos.',
  ],
  ['Fim da partida', 'Quando o baralho acaba, as construções abertas com marcador pontuam para a maioria. Vence quem tiver mais pontos; no empate, quem tiver mais marcadores na reserva.'],
];

// Nenhuma peça do catálogo é só solo; esta existe apenas para a ilustração.
const SO_SOLO = new DefinicaoTile('so-solo', [
  { id: 's1', tipo: Terrain.SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]);

// [peça ilustrativa, rotação, título, texto]
const PONTUACAO: [string | DefinicaoTile, number, string, string][] = [
  ['habitat-canto-cristal', 0, 'Habitat', '1 ponto por peça, 2 na peça com cristal. Fechado (sem lado aberto), vale o dobro e pontua na hora; aberto, pontua na contagem final.'],
  ['duto-curva', 0, 'Duto', '1 ponto por peça. Completo (pontas numa estufa, bomba ou habitat, ou em circuito), pontua na hora; incompleto, na contagem final.'],
  ['escotilha-reta', 0, 'Escotilha', 'O duto atravessa a parede do habitat. Só encaixa com outra escotilha, e a peça conta para o duto e para o habitat.'],
  ['estufa-dutos', 0, 'Estufa', 'Pontuação a definir. Por enquanto, serve de ponta para os dutos.'],
  [SO_SOLO, 0, 'Solo', 'Não pontua.'],
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
  }
}
