import type { Jogador } from './Jogador';
import type { Tile } from './Tile';

// Os seguidores do jogo: colonos e o chefe da colônia, que vale por dois na disputa.
export enum TipoDeMarcador {
  COLONO = 'colono',
  CHEFE = 'chefe',
}

export const FORCA_DO_MARCADOR: Record<TipoDeMarcador, number> = {
  [TipoDeMarcador.COLONO]: 1,
  [TipoDeMarcador.CHEFE]: 2,
};

// Reserva de cada jogador no começo da partida (RN05).
export const RESERVA_INICIAL: Record<TipoDeMarcador, number> = {
  [TipoDeMarcador.COLONO]: 6,
  [TipoDeMarcador.CHEFE]: 1,
};

// Um marcador no tabuleiro: de quem é e em que região de que peça está.
export interface Marcador {
  readonly dono: Jogador;
  readonly tipo: TipoDeMarcador;
  readonly tile: Tile;
  readonly regiaoId: string;
}

// Quem tem mais força entre os marcadores de uma construção. Empatados, todos; sem marcadores, ninguém.
export function donosDaMaioria(marcadores: readonly Pick<Marcador, 'dono' | 'tipo'>[]): Jogador[] {
  const forcas = new Map<Jogador, number>();
  for (const m of marcadores) {
    forcas.set(m.dono, (forcas.get(m.dono) ?? 0) + FORCA_DO_MARCADOR[m.tipo]);
  }
  const maior = Math.max(0, ...forcas.values());
  return [...forcas].filter(([, forca]) => forca === maior && forca > 0).map(([dono]) => dono);
}
