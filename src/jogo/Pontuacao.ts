import type { ConstrucaoPrevista } from './Board';
import type { Feature } from './Feature';
import { Terrain } from './Terrain';

// Regras de docs/regras-de-pontuacao.md.
// Habitat: 1 por peça, 2 na peça com cristal; fechado, vale o dobro.
// Duto: 1 por peça, completo ou não.
// Completas pontuam na hora; as abertas, na contagem do fim da partida.
export const PONTOS_POR_PECA_DE_HABITAT = 1;
export const PONTOS_POR_PECA_DE_HABITAT_COM_CRISTAL = 2;
export const MULTIPLICADOR_DO_HABITAT_FECHADO = 2;
export const PONTOS_POR_PECA_DE_DUTO = 1;

export function pontosDaConstrucao(tipo: Terrain, pecas: number, cristais: number, completa: boolean): number {
  if (tipo === Terrain.HABITAT) {
    const base = (pecas - cristais) * PONTOS_POR_PECA_DE_HABITAT + cristais * PONTOS_POR_PECA_DE_HABITAT_COM_CRISTAL;
    return completa ? base * MULTIPLICADOR_DO_HABITAT_FECHADO : base;
  }
  if (tipo === Terrain.PIPE) {
    return pecas * PONTOS_POR_PECA_DE_DUTO;
  }
  return 0;
}

export function pontosDaFeature(f: Feature): number {
  return pontosDaConstrucao(f.tipo, f.quantidadeDeTiles(), f.quantidadeDeCristais(), f.estaCompleta());
}

export function pontosPrevistos(c: ConstrucaoPrevista): number {
  return pontosDaConstrucao(c.tipo, c.quantidadeDeTiles, c.quantidadeDeCristais, c.bordasAbertas === 0);
}
