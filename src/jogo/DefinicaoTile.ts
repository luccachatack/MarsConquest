import type { DadosRegiao, Regiao } from './Regiao';
import { Terrain } from './Terrain';

// Flyweight: dados imutáveis de um tipo de peça, compartilhados por todas as cópias.
export class DefinicaoTile {
  readonly id: string;
  readonly regioes: readonly Regiao[];

  constructor(id: string, regioes: readonly DadosRegiao[]) {
    this.id = id;
    this.regioes = Object.freeze(
      regioes.map((r) =>
        Object.freeze({
          id: r.id,
          tipo: r.tipo,
          pontos: Object.freeze([...r.pontos]),
          cristal: r.cristal ?? false,
          habitatsAdjacentes: Object.freeze([...(r.habitatsAdjacentes ?? [])]),
        }),
      ),
    );
  }

  // Região que contém o ponto p na orientação original.
  regiaoNoPonto(p: number): Regiao | undefined {
    return this.regioes.find((r) => r.pontos.includes(p));
  }

  temEstufa(): boolean {
    return this.regioes.some((r) => r.tipo === Terrain.GREENHOUSE);
  }

  temCristal(): boolean {
    return this.regioes.some((r) => r.cristal);
  }
}
