import Phaser from 'phaser';
import { TipoDeMarcador } from '../jogo/Marcador';

const COR_CONTORNO = 0x14161c;
const COR_DO_OLHO = 0x0d0f14;

type Ponto = [number, number];

function girar([px, py]: Ponto, angulo: number): Ponto {
  const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
  return [px * c - py * s, px * s + py * c];
}

function pontos(lista: Ponto[], x: number, y: number): Phaser.Math.Vector2[] {
  return lista.map(([px, py]) => new Phaser.Math.Vector2(x + px, y + py));
}

// Olho amendoado, inclinado: comprimento e altura são as metades.
function olho(g: Phaser.GameObjects.Graphics, x: number, y: number, comprimento: number, altura: number, inclinacao: number): void {
  const forma: Ponto[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    // Mais fino nas pontas: a altura acompanha o cosseno.
    forma.push(girar([comprimento * Math.cos(t), altura * Math.sin(t) * (0.55 + 0.45 * Math.abs(Math.cos(t / 2)))], inclinacao));
  }
  g.fillStyle(COR_DO_OLHO, 1).fillPoints(pontos(forma, x, y), true);
  g.fillStyle(0xffffff, 0.85).fillCircle(x - comprimento * 0.25, y - altura * 0.35, Math.max(1, altura * 0.35));
}

// Marciano: o marcador num campo, fora do habitat. Cabeça de gota invertida na cor do jogador,
// olhos grandes e antenas. O chefe tem um terceiro olho e as pontas das antenas brancas.
function desenharMarciano(g: Phaser.GameObjects.Graphics, chefe: boolean, cor: number, x: number, y: number, u: number): void {
  const [largura, altura] = [u * 1.15, u * 1.25];

  // Antenas, atrás da cabeça.
  for (const lado of [-1, 1]) {
    const [bx, by] = [x + lado * u * 0.35, y - altura * 0.8];
    const [px, py] = [x + lado * u * 0.8, y - u * 1.75];
    g.lineStyle(u * 0.32, COR_CONTORNO, 1).lineBetween(bx, by, px, py);
    g.lineStyle(u * 0.14, cor, 1).lineBetween(bx, by, px, py);
    g.fillStyle(COR_CONTORNO, 1).fillCircle(px, py, u * 0.3);
    g.fillStyle(chefe ? 0xffffff : cor, 1).fillCircle(px, py, u * 0.2);
  }

  // Cabeça: larga em cima e afinando no queixo.
  const cabeca: Ponto[] = [];
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const seno = Math.sin(t);
    const afinar = seno > 0 ? 1 - 0.42 * seno : 1;
    cabeca.push([largura * Math.cos(t) * afinar, altura * seno]);
  }
  const contorno = cabeca.map(([px, py]) => [px * (1 + 2.4 / largura), py * (1 + 2.4 / altura)] as Ponto);
  g.fillStyle(COR_CONTORNO, 1).fillPoints(pontos(contorno, x, y), true);
  g.fillStyle(cor, 1).fillPoints(pontos(cabeca, x, y), true);

  // Olhos grandes, com o canto de fora para cima.
  for (const lado of [-1, 1]) olho(g, x + lado * u * 0.46, y - u * 0.04, u * 0.42, u * 0.27, -lado * 0.45);
  if (chefe) olho(g, x, y - u * 0.66, u * 0.22, u * 0.16, 0);

  // Boca pequena.
  g.lineStyle(Math.max(1, u * 0.12), COR_DO_OLHO, 0.9);
  g.beginPath().arc(x, y + u * 0.48, u * 0.16, 0.15 * Math.PI, 0.85 * Math.PI).strokePath();
}

// Colono: um peão simples (cabeça e corpo). Chefe: maior, com um anel branco no corpo.
// Num campo (fora do habitat), o colono e o chefe aparecem como marcianos; contam igual.
// (x, y) é o centro do corpo; tamanho é o lado da peça, para acompanhar a escala.
export function desenharMarcador(
  g: Phaser.GameObjects.Graphics,
  tipo: TipoDeMarcador,
  cor: number,
  x: number,
  y: number,
  tamanho: number,
  marciano = false,
): void {
  const chefe = tipo === TipoDeMarcador.CHEFE;
  const escala = (chefe ? 1.35 : 1) * (tamanho / 96);
  const corpo = 9 * escala;
  if (marciano) {
    // Um pouco maior que o peão em pé: o rosto precisa ser lido no tamanho da peça.
    desenharMarciano(g, chefe, cor, x, y, corpo * 1.15);
    return;
  }
  const cabeca = 5.5 * escala;
  const yCabeca = y - corpo - cabeca * 0.4;

  g.fillStyle(COR_CONTORNO, 1);
  g.fillCircle(x, y, corpo + 2.5);
  g.fillCircle(x, yCabeca, cabeca + 2.5);
  g.fillStyle(cor, 1);
  g.fillCircle(x, y, corpo);
  g.fillCircle(x, yCabeca, cabeca);
  if (chefe) {
    g.lineStyle(2.5 * escala, 0xffffff, 1).strokeCircle(x, y, corpo * 0.5);
  }
}
