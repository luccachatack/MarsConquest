import type Phaser from 'phaser';
import { TipoDeMarcador } from '../jogo/Marcador';

const COR_CONTORNO = 0x14161c;

// Colono: um peão simples (cabeça e corpo). Chefe: maior, com um anel branco no corpo.
// Deitado (no campo): o corpo achatado e a cabeça ao lado, em vez de em cima; o valor diz
// para que lado fica a cabeça. (x, y) é o centro do corpo; tamanho é o lado da peça, para acompanhar a escala.
export function desenharMarcador(
  g: Phaser.GameObjects.Graphics,
  tipo: TipoDeMarcador,
  cor: number,
  x: number,
  y: number,
  tamanho: number,
  deitado?: 'cabeca-a-esquerda' | 'cabeca-a-direita',
): void {
  const escala = (tipo === TipoDeMarcador.CHEFE ? 1.35 : 1) * (tamanho / 96);
  const corpo = 9 * escala;
  const cabeca = 5.5 * escala;
  const distancia = corpo + cabeca * 0.4;
  const lado = deitado === 'cabeca-a-direita' ? 1 : -1;
  const [xCabeca, yCabeca] = deitado ? [x + lado * distancia * 1.15, y] : [x, y - distancia];
  const [largura, altura] = deitado ? [corpo * 2.5, corpo * 1.55] : [corpo * 2, corpo * 2];

  g.fillStyle(COR_CONTORNO, 1);
  g.fillEllipse(x, y, largura + 5, altura + 5);
  g.fillCircle(xCabeca, yCabeca, cabeca + 2.5);
  g.fillStyle(cor, 1);
  g.fillEllipse(x, y, largura, altura);
  g.fillCircle(xCabeca, yCabeca, cabeca);
  if (tipo === TipoDeMarcador.CHEFE) {
    g.lineStyle(2.5 * escala, 0xffffff, 1).strokeCircle(x, y, corpo * 0.5);
  }
}
