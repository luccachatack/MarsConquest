// Valores em sentido horário: girar a peça é somar módulo 4.
export enum Direction {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

export const TODAS_DIRECOES: readonly Direction[] = [
  Direction.NORTH,
  Direction.EAST,
  Direction.SOUTH,
  Direction.WEST,
];

export interface Deslocamento {
  readonly dx: number;
  readonly dy: number;
}

// O eixo y cresce para baixo, como na tela do Phaser: norte é y − 1.
const DESLOCAMENTOS: Record<Direction, Deslocamento> = {
  [Direction.NORTH]: { dx: 0, dy: -1 },
  [Direction.EAST]: { dx: 1, dy: 0 },
  [Direction.SOUTH]: { dx: 0, dy: 1 },
  [Direction.WEST]: { dx: -1, dy: 0 },
};

export function oposta(d: Direction): Direction {
  return ((d + 2) % 4) as Direction;
}

export function deslocamento(d: Direction): Deslocamento {
  return DESLOCAMENTOS[d];
}
