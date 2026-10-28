import type Phaser from 'phaser';
import type { DefinicaoTile } from '../jogo/DefinicaoTile';
import { Terrain } from '../jogo/Terrain';
import { ARTE_DAS_PECAS, CHAVE_DAS_PECAS, TAMANHO_DO_QUADRO } from './desenharPeca';
import { posicaoDoPonto } from './desenharTile';

// Lado da grade em que a arte de cada peça é lida. 48 dá 2 px por célula numa peça de 96.
export const RESOLUCAO_DOS_CAMPOS = 48;

// Uma faixa horizontal de células de solo, na arte sem giro: linha e colunas de início e fim (inclusive).
export interface Faixa {
  readonly linha: number;
  readonly inicio: number;
  readonly fim: number;
}

// O formato das regiões de solo não está nos dados das peças, só os pontos onde elas tocam a borda.
// Por isso ele é lido da própria arte: o laranja do solo, separado em pedaços que não se tocam;
// cada pedaço é da região cujos pontos de borda caem nele.
const cache = new Map<string, ReadonlyMap<string, readonly Faixa[]>>();

function ehSolo(r: number, g: number, b: number): boolean {
  return r > 110 && r - b > 70 && r - g > 50;
}

// Ponto (u, v) da peça na rotação 0 levado para a arte, que é desenhada girada `giro` quartos de volta.
function naArte([u, v]: readonly [number, number], giro: number): [number, number] {
  let [a, b] = [u, v];
  for (let i = 0; i < giro; i++) [a, b] = [b, 1 - a];
  return [a, b];
}

// Faixas de cada região de solo da peça, ou null se a folha de arte não estiver carregada.
export function faixasDoSolo(cena: Phaser.Scene, definicao: DefinicaoTile): ReadonlyMap<string, readonly Faixa[]> | null {
  const pronta = cache.get(definicao.id);
  if (pronta) return pronta;
  const arte = ARTE_DAS_PECAS[definicao.id];
  if (!arte || !cena.textures.exists(CHAVE_DAS_PECAS)) return null;

  const R = RESOLUCAO_DOS_CAMPOS;
  const quadro = cena.textures.getFrame(CHAVE_DAS_PECAS, arte.quadro);
  const tela = document.createElement('canvas');
  tela.width = tela.height = R;
  const ctx = tela.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(quadro.source.image as CanvasImageSource, quadro.cutX, quadro.cutY, TAMANHO_DO_QUADRO, TAMANHO_DO_QUADRO, 0, 0, R, R);
  const pixels = ctx.getImageData(0, 0, R, R).data;

  // Pedaços de solo: -1 fora do solo; senão, o número do pedaço.
  const pedaco = new Int32Array(R * R).fill(-1);
  const solo = (i: number) => ehSolo(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
  let pedacos = 0;
  for (let inicio = 0; inicio < R * R; inicio++) {
    if (pedaco[inicio] !== -1 || !solo(inicio)) continue;
    const pilha = [inicio];
    pedaco[inicio] = pedacos;
    while (pilha.length) {
      const i = pilha.pop()!;
      const [x, y] = [i % R, Math.floor(i / R)];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const j = ny * R + nx;
        if (nx >= 0 && ny >= 0 && nx < R && ny < R && pedaco[j] === -1 && solo(j)) {
          pedaco[j] = pedacos;
          pilha.push(j);
        }
      }
    }
    pedacos++;
  }

  // O pedaço que fica logo para dentro de cada ponto de borda da região.
  const donoDoPedaco = new Map<number, string>();
  for (const regiao of definicao.regioes.filter((r) => r.tipo === Terrain.SOIL)) {
    for (const p of regiao.pontos) {
      const [u, v] = posicaoDoPonto(p);
      const [a, b] = naArte([u + (0.5 - u) * 0.08, v + (0.5 - v) * 0.08], arte.giro);
      const [cx, cy] = [Math.min(R - 1, Math.floor(a * R)), Math.min(R - 1, Math.floor(b * R))];
      // Se o ponto caiu num contorno, procura o solo mais perto.
      let achado = -1;
      for (let raio = 0; raio <= 3 && achado === -1; raio++) {
        for (let dy = -raio; dy <= raio && achado === -1; dy++) {
          for (let dx = -raio; dx <= raio && achado === -1; dx++) {
            const [x, y] = [cx + dx, cy + dy];
            if (x >= 0 && y >= 0 && x < R && y < R && pedaco[y * R + x] !== -1) achado = pedaco[y * R + x];
          }
        }
      }
      if (achado !== -1 && !donoDoPedaco.has(achado)) donoDoPedaco.set(achado, regiao.id);
    }
  }

  const faixas = new Map<string, Faixa[]>();
  for (let linha = 0; linha < R; linha++) {
    let coluna = 0;
    while (coluna < R) {
      const id = donoDoPedaco.get(pedaco[linha * R + coluna]);
      if (id === undefined) {
        coluna++;
        continue;
      }
      const inicio = coluna;
      while (coluna + 1 < R && donoDoPedaco.get(pedaco[linha * R + coluna + 1]) === id) coluna++;
      faixas.set(id, [...(faixas.get(id) ?? []), { linha, inicio, fim: coluna }]);
      coluna++;
    }
  }
  cache.set(definicao.id, faixas);
  return faixas;
}
