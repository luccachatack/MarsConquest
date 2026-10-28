import type { FuncaoAleatoria } from '../src/jogo/TileDeck';

// mulberry32: gerador simples com semente, para embaralhamentos repetíveis nos testes.
export function comSemente(semente: number): FuncaoAleatoria {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
