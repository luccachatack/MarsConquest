import { deslocamento, type Direction } from './Direction';

// Objeto de valor imutável: duas posições com as mesmas coordenadas são iguais.
export class Position {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  equals(outra: Position): boolean {
    return this.x === outra.x && this.y === outra.y;
  }

  // Map compara objetos por referência; a chave "x,y" permite buscar por valor.
  chave(): string {
    return `${this.x},${this.y}`;
  }

  vizinha(d: Direction): Position {
    const { dx, dy } = deslocamento(d);
    return new Position(this.x + dx, this.y + dy);
  }
}
