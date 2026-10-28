import { Direction } from './Direction';

// 12 pontos de borda, 3 por lado, numerados em sentido horário a partir do canto noroeste:
//
//           0    1    2
//         +--------------+
//     11  |              |  3
//     10  |              |  4
//      9  |              |  5
//         +--------------+
//           8    7    6

export const TOTAL_PONTOS = 12;

function validarPonto(p: number): void {
  if (!Number.isInteger(p) || p < 0 || p >= TOTAL_PONTOS) {
    throw new RangeError(`Ponto de borda inválido: ${p}`);
  }
}

function modulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// Cada quarto de volta no sentido horário leva o ponto 3 posições adiante.
export function rotacionarPonto(p: number, rotacao: number): number {
  validarPonto(p);
  return modulo(p + 3 * rotacao, TOTAL_PONTOS);
}

// Inverso de rotacionarPonto: em que ponto da orientação original está o ponto p.
export function desrotacionarPonto(p: number, rotacao: number): number {
  return rotacionarPonto(p, -rotacao);
}

// Ponto da peça vizinha que encosta em p. O lado é o oposto e a ordem dentro do lado
// se inverte, porque os dois lados são lidos em sentido horário a partir de cantos diferentes.
export function pontoOposto(p: number): number {
  validarPonto(p);
  const lado = Math.floor(p / 3);
  const k = p % 3;
  return 3 * ((lado + 2) % 4) + (2 - k);
}

export function pontosDoLado(d: Direction): number[] {
  return [3 * d, 3 * d + 1, 3 * d + 2];
}

export function ladoDoPonto(p: number): Direction {
  validarPonto(p);
  return Math.floor(p / 3) as Direction;
}

// Ponto do meio do lado: onde um duto cruza a borda.
export function pontoDoMeio(d: Direction): number {
  return 3 * d + 1;
}
