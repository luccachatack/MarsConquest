import Phaser from 'phaser';
import { Direction, TODAS_DIRECOES } from '../jogo/Direction';
import { ladoDoPonto } from '../jogo/PontosDeBorda';
import type { Regiao } from '../jogo/Regiao';
import { Terrain } from '../jogo/Terrain';
import type { Tile } from '../jogo/Tile';

export const CORES = {
  solo: 0xc4562f,
  soloPedras: 0xa8452a,
  habitat: 0xdfe3e8,
  paredeHabitat: 0x5d6878,
  duto: 0x2b3038,
  dutoBrilho: 0x8a96a8,
  estufa: 0x4fae62,
  estufaVidro: 0xb5ecbf,
  cristal: 0x6fd6ff,
  bordaPeca: 0x15171c,
};

type Ponto = readonly [number, number];

// Coordenadas em "unidades da peça": (0,0) é o canto noroeste e (1,1) o sudeste.
const CENTRO: Ponto = [0.5, 0.5];

const CANTOS: Record<Direction, [Ponto, Ponto]> = {
  [Direction.NORTH]: [[0, 0], [1, 0]],
  [Direction.EAST]: [[1, 0], [1, 1]],
  [Direction.SOUTH]: [[1, 1], [0, 1]],
  [Direction.WEST]: [[0, 1], [0, 0]],
};

const NORMAIS: Record<Direction, Ponto> = {
  [Direction.NORTH]: [0, -1],
  [Direction.EAST]: [1, 0],
  [Direction.SOUTH]: [0, 1],
  [Direction.WEST]: [-1, 0],
};

// Corredor norte–sul; para leste–oeste, é girado 90°.
const CORREDOR: Ponto[] = [
  [0, 0], [1, 0], [0.68, 0.32], [0.68, 0.68], [1, 1], [0, 1], [0.32, 0.68], [0.32, 0.32],
];
const PAREDES_CORREDOR: Ponto[][] = [
  [[1, 0], [0.68, 0.32], [0.68, 0.68], [1, 1]],
  [[0, 1], [0.32, 0.68], [0.32, 0.32], [0, 0]],
];

function interpolar(a: Ponto, b: Ponto, t: number): Ponto {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function girar90(p: Ponto): Ponto {
  return [1 - p[1], p[0]];
}

// Posição de um ponto de borda: os 3 pontos dividem o lado em terços, em sentido horário.
function posicaoDoPonto(p: number): Ponto {
  const [a, b] = CANTOS[ladoDoPonto(p)];
  return interpolar(a, b, ((p % 3) + 0.5) / 3);
}

// Onde fica o marcador de uma região, em unidades da peça: a média dos pontos de borda,
// puxada para o centro. Regiões que atravessam a peça e a estufa (sem pontos de borda) ficam no centro.
export function ancoraDaRegiao(r: Regiao): Ponto {
  if (r.pontos.length === 0) return CENTRO;
  const soma = r.pontos.map(posicaoDoPonto).reduce((a, b) => [a[0] + b[0], a[1] + b[1]] as Ponto, [0, 0] as Ponto);
  const media = interpolar([0, 0], soma, 1 / r.pontos.length);
  return interpolar(CENTRO, media, 0.55);
}

function ladosDaRegiao(r: Regiao): Direction[] {
  return TODAS_DIRECOES.filter((d) => r.pontos.some((p) => ladoDoPonto(p) === d));
}

class Pincel {
  constructor(
    private readonly g: Phaser.GameObjects.Graphics,
    private readonly x: number,
    private readonly y: number,
    readonly tamanho: number,
  ) {}

  vetores(pontos: readonly Ponto[]): Phaser.Math.Vector2[] {
    return pontos.map(([u, v]) => new Phaser.Math.Vector2(this.x + u * this.tamanho, this.y + v * this.tamanho));
  }

  preencher(pontos: readonly Ponto[], cor: number): void {
    this.g.fillStyle(cor, 1);
    this.g.fillPoints(this.vetores(pontos), true);
  }

  tracar(pontos: readonly Ponto[], cor: number, largura: number, fechar = false): void {
    this.g.lineStyle(largura * this.tamanho, cor, 1);
    this.g.strokePoints(this.vetores(pontos), fechar, fechar);
  }

  circulo([u, v]: Ponto, raio: number, cor: number): void {
    this.g.fillStyle(cor, 1);
    this.g.fillCircle(this.x + u * this.tamanho, this.y + v * this.tamanho, raio * this.tamanho);
  }
}

function desenharSolo(pincel: Pincel): void {
  pincel.preencher([[0, 0], [1, 0], [1, 1], [0, 1]], CORES.solo);
  const pedras: Ponto[] = [[0.18, 0.22], [0.8, 0.15], [0.7, 0.82], [0.22, 0.78], [0.88, 0.55], [0.12, 0.5]];
  for (const p of pedras) {
    pincel.circulo(p, 0.025, CORES.soloPedras);
  }
}

function desenharHabitat(pincel: Pincel, r: Regiao): void {
  const lados = ladosDaRegiao(r);
  const largura = 0.035;

  if (lados.length === 4) {
    pincel.preencher([[0, 0], [1, 0], [1, 1], [0, 1]], CORES.habitat);
    return;
  }

  if (lados.length === 1) {
    // Cúpula encostada num lado: trapézio que não chega ao centro.
    const [a, b] = CANTOS[lados[0]];
    const a2 = interpolar(a, CENTRO, 0.55);
    const b2 = interpolar(b, CENTRO, 0.55);
    pincel.preencher([a, b, b2, a2], CORES.habitat);
    pincel.tracar([b, b2, a2, a], CORES.paredeHabitat, largura);
    return;
  }

  if (lados.length === 2 && (lados[1] - lados[0]) % 2 === 0) {
    // Lados opostos: corredor atravessando a peça.
    const girar = lados[0] === Direction.EAST;
    const ajustar = (pontos: Ponto[]) => (girar ? pontos.map(girar90) : pontos);
    pincel.preencher(ajustar(CORREDOR), CORES.habitat);
    for (const parede of PAREDES_CORREDOR) {
      pincel.tracar(ajustar(parede), CORES.paredeHabitat, largura);
    }
    return;
  }

  // Lados vizinhos (2 ou 3): os triângulos até o centro formam um polígono só.
  const inicio = lados.find((d) => !lados.includes(((d + 3) % 4) as Direction))!;
  const cantos: Ponto[] = [];
  for (let i = 0; i < lados.length; i++) {
    const [a, b] = CANTOS[((inicio + i) % 4) as Direction];
    if (i === 0) cantos.push(a);
    cantos.push(b);
  }
  pincel.preencher([CENTRO, ...cantos], CORES.habitat);
  pincel.tracar([cantos[cantos.length - 1], CENTRO, cantos[0]], CORES.paredeHabitat, largura);
}

function desenharCristal(pincel: Pincel, r: Regiao): void {
  // Afasta o cristal do centro na direção média dos lados do habitat (cúpula cheia: fica no centro).
  const lados = ladosDaRegiao(r);
  const distancia = lados.length === 1 ? 0.36 : 0.25;
  let dx = 0;
  let dy = 0;
  for (const d of lados) {
    dx += NORMAIS[d][0];
    dy += NORMAIS[d][1];
  }
  const comprimento = Math.hypot(dx, dy) || 1;
  const u = CENTRO[0] + (dx / comprimento) * distancia;
  const v = CENTRO[1] + (dy / comprimento) * distancia;
  const t = 0.07;
  pincel.preencher([[u, v - t], [u + t * 0.7, v], [u, v + t], [u - t * 0.7, v]], CORES.cristal);
  pincel.tracar([[u, v - t], [u + t * 0.7, v], [u, v + t], [u - t * 0.7, v]], 0x2a7fa8, 0.015, true);
}

function caminhoDoDuto(r: Regiao): Ponto[] {
  const inicio = posicaoDoPonto(r.pontos[0]);
  if (r.pontos.length === 1) {
    return [inicio, CENTRO];
  }
  const fim = posicaoDoPonto(r.pontos[1]);
  const opostos = (ladoDoPonto(r.pontos[0]) - ladoDoPonto(r.pontos[1]) + 4) % 2 === 0;
  if (opostos) {
    return [inicio, fim];
  }
  // Curva: Bézier quadrática com controle no centro.
  const curva = new Phaser.Curves.QuadraticBezier(
    new Phaser.Math.Vector2(...inicio),
    new Phaser.Math.Vector2(...CENTRO),
    new Phaser.Math.Vector2(...fim),
  );
  return curva.getPoints(20).map((p) => [p.x, p.y] as Ponto);
}

function desenharDutos(pincel: Pincel, dutos: Regiao[], temEstufa: boolean): void {
  const caminhos = dutos.map(caminhoDoDuto);
  for (const c of caminhos) pincel.tracar(c, CORES.duto, 0.12);
  for (const c of caminhos) pincel.tracar(c, CORES.dutoBrilho, 0.035);

  // Dutos que terminam no meio da peça sem estufa chegam a uma bomba.
  if (!temEstufa && dutos.some((r) => r.pontos.length === 1)) {
    pincel.circulo(CENTRO, 0.1, CORES.duto);
    pincel.circulo(CENTRO, 0.05, CORES.dutoBrilho);
  }
}

function desenharEstufa(pincel: Pincel): void {
  pincel.circulo(CENTRO, 0.2, CORES.estufa);
  pincel.circulo(CENTRO, 0.14, CORES.estufaVidro);
  pincel.tracar([[0.36, 0.5], [0.64, 0.5]], CORES.estufa, 0.025);
  pincel.tracar([[0.5, 0.36], [0.5, 0.64]], CORES.estufa, 0.025);
}

// Desenha a peça na rotação atual, usando as regiões já rotacionadas pelo Tile.
export function desenharTile(
  g: Phaser.GameObjects.Graphics,
  tile: Tile,
  x: number,
  y: number,
  tamanho: number,
): void {
  const pincel = new Pincel(g, x, y, tamanho);
  const regioes = tile.getRegioes();
  const habitats = regioes.filter((r) => r.tipo === Terrain.HABITAT);
  const dutos = regioes.filter((r) => r.tipo === Terrain.PIPE);

  desenharSolo(pincel);
  for (const r of habitats) desenharHabitat(pincel, r);
  desenharDutos(pincel, dutos, tile.temEstufa());
  if (tile.temEstufa()) desenharEstufa(pincel);
  for (const r of habitats.filter((h) => h.cristal)) desenharCristal(pincel, r);

  pincel.tracar([[0, 0], [1, 0], [1, 1], [0, 1]], CORES.bordaPeca, 0.02, true);
}
