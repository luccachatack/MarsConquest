import { describe, expect, it } from 'vitest';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../src/jogo/catalogoDeTiles';
import { TODAS_DIRECOES } from '../src/jogo/Direction';
import { pontosDoLado } from '../src/jogo/PontosDeBorda';
import { Terrain } from '../src/jogo/Terrain';

const { HABITAT, PIPE, SOIL, GREENHOUSE } = Terrain;
const PONTOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PONTOS_DO_MEIO = [1, 4, 7, 10];

const LADOS_VALIDOS = [
  [HABITAT, HABITAT, HABITAT],
  [SOIL, PIPE, SOIL],
  [SOIL, SOIL, SOIL],
  [HABITAT, PIPE, HABITAT], // escotilha
].map((lado) => lado.join(','));

const definicoes = CATALOGO_DE_TILES.map((e) => e.definicao);

// Cada `it` percorre todas as definições; a mensagem do expect diz qual peça falhou.
describe('catálogo de peças', () => {
  it('ids das definições são únicos', () => {
    const ids = definicoes.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ids das regiões são únicos dentro de cada definição', () => {
    for (const d of definicoes) {
      const ids = d.regioes.map((r) => r.id);
      expect(new Set(ids).size, d.id).toBe(ids.length);
    }
  });

  it('cada ponto de 0 a 11 pertence a exatamente uma região', () => {
    for (const d of definicoes) {
      for (const p of PONTOS) {
        const donas = d.regioes.filter((r) => r.pontos.includes(p));
        expect(donas.length, `${d.id}, ponto ${p}`).toBe(1);
      }
      const total = d.regioes.reduce((soma, r) => soma + r.pontos.length, 0);
      expect(total, `${d.id}: pontos repetidos ou fora de 0 a 11`).toBe(12);
    }
  });

  it('cada lado segue um dos padrões válidos', () => {
    for (const d of definicoes) {
      for (const lado of TODAS_DIRECOES) {
        const padrao = pontosDoLado(lado).map((p) => d.regiaoNoPonto(p)?.tipo).join(',');
        expect(LADOS_VALIDOS, `${d.id}, lado ${lado}: ${padrao}`).toContain(padrao);
      }
    }
  });

  it('dutos só usam pontos do meio e têm 1 ou 2 pontos', () => {
    for (const d of definicoes) {
      for (const r of d.regioes.filter((r) => r.tipo === PIPE)) {
        expect([1, 2], `${d.id}/${r.id}`).toContain(r.pontos.length);
        for (const p of r.pontos) {
          expect(PONTOS_DO_MEIO, `${d.id}/${r.id}`).toContain(p);
        }
      }
    }
  });

  it('no máximo uma estufa, sem pontos; as demais regiões têm pontos', () => {
    for (const d of definicoes) {
      const estufas = d.regioes.filter((r) => r.tipo === GREENHOUSE);
      expect(estufas.length, d.id).toBeLessThanOrEqual(1);
      for (const r of d.regioes) {
        if (r.tipo === GREENHOUSE) {
          expect(r.pontos, `${d.id}/${r.id}`).toEqual([]);
        } else {
          expect(r.pontos.length, `${d.id}/${r.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('cristal só aparece em habitats', () => {
    for (const d of definicoes) {
      for (const r of d.regioes.filter((r) => r.cristal)) {
        expect(r.tipo, `${d.id}/${r.id}`).toBe(HABITAT);
      }
    }
  });

  it('toda quantidade é um inteiro maior ou igual a 1', () => {
    for (const e of CATALOGO_DE_TILES) {
      expect(Number.isInteger(e.quantidade), e.definicao.id).toBe(true);
      expect(e.quantidade, e.definicao.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('a soma das quantidades é 60', () => {
    const total = CATALOGO_DE_TILES.reduce((soma, e) => soma + e.quantidade, 0);
    expect(total).toBe(60);
  });

  it('ID_TILE_INICIAL existe no catálogo', () => {
    expect(definicoes.map((d) => d.id)).toContain(ID_TILE_INICIAL);
  });

  it('habitatsAdjacentes só aparece em solo e aponta para habitats da mesma definição', () => {
    for (const d of definicoes) {
      for (const r of d.regioes) {
        if (r.habitatsAdjacentes.length > 0) {
          expect(r.tipo, `${d.id}/${r.id}`).toBe(SOIL);
        }
        for (const id of r.habitatsAdjacentes) {
          const alvo = d.regioes.find((outra) => outra.id === id);
          expect(alvo?.tipo, `${d.id}/${r.id} → ${id}`).toBe(HABITAT);
        }
      }
    }
  });
});
