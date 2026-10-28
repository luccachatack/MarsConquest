import type { ConstrucaoPrevista } from './Board';
import type { Feature } from './Feature';
import { Terrain } from './Terrain';

// Regras de docs/regras-de-pontuacao.md. Só construções completas pontuam.
export const PONTOS_POR_PECA_DE_HABITAT = 2;
export const PONTOS_POR_PECA_DE_HABITAT_COM_CRISTAL = 4;
export const PONTOS_POR_PECA_DE_DUTO = 1;

export function pontosDaConstrucao(tipo: Terrain, pecas: number, cristais: number): number {
  if (tipo === Terrain.HABITAT) {
    return (pecas - cristais) * PONTOS_POR_PECA_DE_HABITAT + cristais * PONTOS_POR_PECA_DE_HABITAT_COM_CRISTAL;
  }
  if (tipo === Terrain.PIPE) {
    return pecas * PONTOS_POR_PECA_DE_DUTO;
  }
  return 0;
}

export function pontosDaFeature(f: Feature): number {
  return f.estaCompleta() ? pontosDaConstrucao(f.tipo, f.quantidadeDeTiles(), f.quantidadeDeCristais()) : 0;
}

export function pontosPrevistos(c: ConstrucaoPrevista): number {
  return pontosDaConstrucao(c.tipo, c.quantidadeDeTiles, c.quantidadeDeCristais);
}
