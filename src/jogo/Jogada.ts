import type { Position } from './Position';

// Objeto de valor: onde e com qual rotação uma peça será colocada.
export class Jogada {
  readonly position: Position;
  readonly rotacao: number;

  constructor(position: Position, rotacao: number) {
    if (!Number.isInteger(rotacao) || rotacao < 0 || rotacao > 3) {
      throw new RangeError(`Rotação inválida: ${rotacao}. Use um inteiro de 0 a 3.`);
    }
    this.position = position;
    this.rotacao = rotacao;
  }

  equals(outra: Jogada): boolean {
    return this.position.equals(outra.position) && this.rotacao === outra.rotacao;
  }
}
