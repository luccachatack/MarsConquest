import type Phaser from 'phaser';
import { TipoDeMarcador } from '../jogo/Marcador';

const COR_CONTORNO = 0x14161c;

// Colono: um peão simples (cabeça e corpo). Chefe: maior, com um anel branco no corpo.
// (x, y) é o centro do corpo; tamanho é o lado da peça, para acompanhar a escala.
export function desenharMarcador(
  g: Phaser.GameObjects.Graphics,
  tipo: TipoDeMarcador,
  cor: number,
  x: number,
  y: number,
  tamanho: number,
): void {
  const escala = (tipo === TipoDeMarcador.CHEFE ? 1.35 : 1) * (tamanho / 96);
  const corpo = 9 * escala;
  const cabeca = 5.5 * escala;
  const yCabeca = y - corpo - cabeca * 0.4;

  g.fillStyle(COR_CONTORNO, 1);
  g.fillCircle(x, y, corpo + 2.5);
  g.fillCircle(x, yCabeca, cabeca + 2.5);
  g.fillStyle(cor, 1);
  g.fillCircle(x, y, corpo);
  g.fillCircle(x, yCabeca, cabeca);
  if (tipo === TipoDeMarcador.CHEFE) {
    g.lineStyle(2.5 * escala, 0xffffff, 1).strokeCircle(x, y, corpo * 0.5);
  }
}
