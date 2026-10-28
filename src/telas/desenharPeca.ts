import Phaser from 'phaser';
import type { Tile } from '../jogo/Tile';
import { CORES, desenharTile } from './desenharTile';

// Arte das peças: public/assets/pecas_spritesheet.png, 24 quadros de 256 × 256 em 6 colunas × 4 linhas.
export const CHAVE_DAS_PECAS = 'pecas';
export const ARQUIVO_DAS_PECAS = 'assets/pecas_spritesheet.png';
export const TAMANHO_DO_QUADRO = 256;

// Quadro da folha para cada peça do catálogo e quantos quartos de volta (no sentido horário)
// o desenho precisa girar para ficar na rotação 0° da peça. Se a folha não carregar, as peças
// caem no desenho por código (desenharTile).
export const ARTE_DAS_PECAS: Readonly<Record<string, { readonly quadro: number; readonly giro: number }>> = {
  'estufa-duto': { quadro: 0, giro: 0 },
  estufa: { quadro: 1, giro: 0 },
  cupula: { quadro: 2, giro: 0 },
  'habitat-lado-duto-reto': { quadro: 3, giro: 0 },
  'habitat-lado': { quadro: 4, giro: 0 },
  'habitat-ponte-cristal': { quadro: 5, giro: 0 },
  'habitat-ponte': { quadro: 6, giro: 0 },
  'habitats-opostos': { quadro: 7, giro: 0 },
  'habitats-vizinhos': { quadro: 8, giro: 1 },
  'habitat-lado-curva-leste': { quadro: 9, giro: 0 },
  'habitat-lado-curva-oeste': { quadro: 10, giro: 0 },
  'habitat-lado-juncao': { quadro: 11, giro: 0 },
  'habitat-canto-cristal': { quadro: 12, giro: 1 },
  'habitat-canto': { quadro: 13, giro: 1 },
  'habitat-canto-duto-cristal': { quadro: 14, giro: 1 },
  'habitat-canto-duto': { quadro: 15, giro: 1 },
  'habitat-tres-lados-cristal': { quadro: 16, giro: 0 },
  'habitat-tres-lados': { quadro: 17, giro: 0 },
  'habitat-tres-lados-duto-cristal': { quadro: 18, giro: 0 },
  'habitat-tres-lados-duto': { quadro: 19, giro: 0 },
  'duto-reto': { quadro: 20, giro: 1 },
  'duto-curva': { quadro: 21, giro: 0 },
  'juncao-tres': { quadro: 22, giro: 0 },
  'juncao-quatro': { quadro: 23, giro: 0 },
};

export function carregarArteDasPecas(cena: Phaser.Scene): void {
  cena.load.spritesheet(CHAVE_DAS_PECAS, ARQUIVO_DAS_PECAS, {
    frameWidth: TAMANHO_DO_QUADRO,
    frameHeight: TAMANHO_DO_QUADRO,
  });
}

// Desenha a peça na rotação atual dentro do container, com (x, y) no canto superior esquerdo.
// Usa o quadro da folha quando a peça tem arte; senão, o desenho por código.
export function desenharPeca(
  cena: Phaser.Scene,
  destino: Phaser.GameObjects.Container,
  tile: Tile,
  x: number,
  y: number,
  tamanho: number,
): void {
  const arte = ARTE_DAS_PECAS[tile.getDefinicao().id];
  if (!arte || !cena.textures.exists(CHAVE_DAS_PECAS)) {
    const g = cena.add.graphics();
    desenharTile(g, tile, x, y, tamanho);
    destino.add(g);
    return;
  }
  const angulo = ((arte.giro + tile.getRotacao()) % 4) * 90;
  const imagem = cena.add
    .image(x + tamanho / 2, y + tamanho / 2, CHAVE_DAS_PECAS, arte.quadro)
    .setDisplaySize(tamanho, tamanho)
    .setAngle(angulo);
  // Contorno fino, igual ao das peças desenhadas por código, para a grade aparecer.
  const contorno = cena.add.graphics().lineStyle(Math.max(1, tamanho * 0.02), CORES.bordaPeca, 1).strokeRect(x, y, tamanho, tamanho);
  destino.add([imagem, contorno]);
}

// Atalho: um container novo já com a peça desenhada.
export function criarPeca(cena: Phaser.Scene, tile: Tile, x: number, y: number, tamanho: number): Phaser.GameObjects.Container {
  const container = cena.add.container(0, 0);
  desenharPeca(cena, container, tile, x, y, tamanho);
  return container;
}
