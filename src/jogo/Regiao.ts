import type { Terrain } from './Terrain';

// Parte contínua de uma peça. Os pontos estão na orientação de quem a fornece:
// na DefinicaoTile, a original (rotação 0); em Tile.getRegioes(), já rotacionados.
export interface Regiao {
  readonly id: string;
  readonly tipo: Terrain;
  readonly pontos: readonly number[];
  // Só em habitats: depósito de cristal (pontuação extra).
  readonly cristal: boolean;
  // Só em solo: ids dos habitats da mesma peça que encostam nesta região.
  readonly habitatsAdjacentes: readonly string[];
}

// Forma usada para escrever o catálogo: campos opcionais assumem false e [].
export interface DadosRegiao {
  readonly id: string;
  readonly tipo: Terrain;
  readonly pontos: readonly number[];
  readonly cristal?: boolean;
  readonly habitatsAdjacentes?: readonly string[];
}
