import { CASAS_EM_VOLTA, type ConstrucaoPrevista } from './Board';
import type { Feature } from './Feature';
import { Terrain } from './Terrain';

// Regras de docs/regras-de-pontuacao.md.
// Habitat: 1 por peça, 2 na peça com cristal; fechado, vale o dobro.
// Duto: 1 por peça, completo ou não.
// Estufa: 1 por ela mesma e 1 por peça nas 8 casas em volta; cercada, está completa.
// Campo (solo): só na contagem final, 2 por habitat fechado que encosta nele.
// Completas pontuam na hora; as abertas, na contagem do fim da partida.
export const PONTOS_POR_PECA_DE_HABITAT = 1;
export const PONTOS_POR_PECA_DE_HABITAT_COM_CRISTAL = 2;
export const MULTIPLICADOR_DO_HABITAT_FECHADO = 2;
export const PONTOS_POR_PECA_DE_DUTO = 1;
export const PONTOS_POR_PECA_EM_VOLTA_DA_ESTUFA = 1;
export const PONTOS_POR_HABITAT_FECHADO_NO_CAMPO = 2;

// bordasAbertas = 0 quer dizer completa. Na estufa, são as casas vazias em volta.
// habitatsFechadosEmVolta só conta no campo.
export function pontosDaConstrucao(
  tipo: Terrain,
  pecas: number,
  cristais: number,
  bordasAbertas: number,
  habitatsFechadosEmVolta = 0,
): number {
  if (tipo === Terrain.HABITAT) {
    const base = (pecas - cristais) * PONTOS_POR_PECA_DE_HABITAT + cristais * PONTOS_POR_PECA_DE_HABITAT_COM_CRISTAL;
    return bordasAbertas === 0 ? base * MULTIPLICADOR_DO_HABITAT_FECHADO : base;
  }
  if (tipo === Terrain.PIPE) {
    return pecas * PONTOS_POR_PECA_DE_DUTO;
  }
  if (tipo === Terrain.GREENHOUSE) {
    return (1 + CASAS_EM_VOLTA - bordasAbertas) * PONTOS_POR_PECA_EM_VOLTA_DA_ESTUFA;
  }
  if (tipo === Terrain.SOIL) {
    return habitatsFechadosEmVolta * PONTOS_POR_HABITAT_FECHADO_NO_CAMPO;
  }
  return 0;
}

// O campo depende dos habitats em volta, que só o Board conhece: quem chama passa a contagem.
export function pontosDaFeature(f: Feature, habitatsFechadosEmVolta = 0): number {
  return pontosDaConstrucao(f.tipo, f.quantidadeDeTiles(), f.quantidadeDeCristais(), f.getBordasAbertas(), habitatsFechadosEmVolta);
}

export function pontosPrevistos(c: ConstrucaoPrevista): number {
  return pontosDaConstrucao(c.tipo, c.quantidadeDeTiles, c.quantidadeDeCristais, c.bordasAbertas, c.habitatsFechadosEmVolta);
}
