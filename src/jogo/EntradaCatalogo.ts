import type { DefinicaoTile } from './DefinicaoTile';

// Um tipo de peça do catálogo e quantas cópias dele existem na partida.
export interface EntradaCatalogo {
  readonly definicao: DefinicaoTile;
  readonly quantidade: number;
}
