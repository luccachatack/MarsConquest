import { DefinicaoTile } from './DefinicaoTile';
import type { EntradaCatalogo } from './EntradaCatalogo';
import type { DadosRegiao } from './Regiao';
import { Terrain } from './Terrain';

// Catálogo das peças de Mars Conquest: só dados. Adicionar peças ou uma expansão
// é adicionar entradas aqui, sem mudar classes (RNF05).
//
// Pontos de borda (rotação 0):      Lados válidos:
//           0    1    2               habitat  HABITAT, HABITAT, HABITAT
//     11  +-----------+  3            duto     SOIL, PIPE, SOIL
//     10  |           |  4            solo     SOIL, SOIL, SOIL
//      9  +-----------+  5
//           8    7    6

const { HABITAT, PIPE, SOIL, GREENHOUSE } = Terrain;

function entrada(id: string, quantidade: number, regioes: DadosRegiao[]): EntradaCatalogo {
  return { definicao: new DefinicaoTile(id, regioes), quantidade };
}

export const ID_TILE_INICIAL = 'estufa-duto';

export const CATALOGO_DE_TILES: readonly EntradaCatalogo[] = [
  // Estufas
  entrada('estufa', 4, [
    { id: 'e1', tipo: GREENHOUSE, pontos: [] },
    { id: 's1', tipo: SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  ]),
  // Um duto ao sul chega à estufa.
  entrada('estufa-duto', 2, [
    { id: 'e1', tipo: GREENHOUSE, pontos: [] },
    { id: 'd1', tipo: PIPE, pontos: [7] },
    { id: 's1', tipo: SOIL, pontos: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11] },
  ]),

  // Habitats grandes
  entrada('cupula', 1, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cristal: true },
  ]),
  entrada('habitat-tres-lados', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5, 9, 10, 11] },
    { id: 's1', tipo: SOIL, pontos: [6, 7, 8], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitat-tres-lados-cristal', 1, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5, 9, 10, 11], cristal: true },
    { id: 's1', tipo: SOIL, pontos: [6, 7, 8], habitatsAdjacentes: ['h1'] },
  ]),
  // Duto ao sul que entra no habitat por um portão e termina nele.
  entrada('habitat-tres-lados-duto', 1, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5, 9, 10, 11] },
    { id: 'd1', tipo: PIPE, pontos: [7] },
    { id: 's1', tipo: SOIL, pontos: [6], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [8], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitat-tres-lados-duto-cristal', 2, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5, 9, 10, 11], cristal: true },
    { id: 'd1', tipo: PIPE, pontos: [7] },
    { id: 's1', tipo: SOIL, pontos: [6], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [8], habitatsAdjacentes: ['h1'] },
  ]),

  // Habitats de canto (norte e leste ligados)
  entrada('habitat-canto', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5] },
    { id: 's1', tipo: SOIL, pontos: [6, 7, 8, 9, 10, 11], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitat-canto-cristal', 2, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5], cristal: true },
    { id: 's1', tipo: SOIL, pontos: [6, 7, 8, 9, 10, 11], habitatsAdjacentes: ['h1'] },
  ]),
  // Duto em curva do sul ao oeste, isolando o canto sudoeste.
  entrada('habitat-canto-duto', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5] },
    { id: 'd1', tipo: PIPE, pontos: [7, 10] },
    { id: 's1', tipo: SOIL, pontos: [8, 9] },
    { id: 's2', tipo: SOIL, pontos: [6, 11], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitat-canto-duto-cristal', 2, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 3, 4, 5], cristal: true },
    { id: 'd1', tipo: PIPE, pontos: [7, 10] },
    { id: 's1', tipo: SOIL, pontos: [8, 9] },
    { id: 's2', tipo: SOIL, pontos: [6, 11], habitatsAdjacentes: ['h1'] },
  ]),

  // Habitats em lados opostos ou vizinhos
  // Um corredor liga o norte ao sul e separa o solo em dois.
  entrada('habitat-ponte', 1, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 6, 7, 8] },
    { id: 's1', tipo: SOIL, pontos: [3, 4, 5], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [9, 10, 11], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitat-ponte-cristal', 2, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2, 6, 7, 8], cristal: true },
    { id: 's1', tipo: SOIL, pontos: [3, 4, 5], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [9, 10, 11], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitats-opostos', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 'h2', tipo: HABITAT, pontos: [6, 7, 8] },
    { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 9, 10, 11], habitatsAdjacentes: ['h1', 'h2'] },
  ]),
  entrada('habitats-vizinhos', 2, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 'h2', tipo: HABITAT, pontos: [3, 4, 5] },
    { id: 's1', tipo: SOIL, pontos: [6, 7, 8, 9, 10, 11], habitatsAdjacentes: ['h1', 'h2'] },
  ]),

  // Habitat em um lado (norte)
  entrada('habitat-lado', 5, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 7, 8, 9, 10, 11], habitatsAdjacentes: ['h1'] },
  ]),
  entrada('habitat-lado-duto-reto', 4, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 'd1', tipo: PIPE, pontos: [4, 10] },
    { id: 's1', tipo: SOIL, pontos: [3, 11], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [5, 6, 7, 8, 9] },
  ]),
  // Duto em curva do leste ao sul, isolando o canto sudeste.
  entrada('habitat-lado-curva-leste', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 'd1', tipo: PIPE, pontos: [4, 7] },
    { id: 's1', tipo: SOIL, pontos: [3, 8, 9, 10, 11], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [5, 6] },
  ]),
  // Duto em curva do sul ao oeste, isolando o canto sudoeste.
  entrada('habitat-lado-curva-oeste', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 'd1', tipo: PIPE, pontos: [7, 10] },
    { id: 's1', tipo: SOIL, pontos: [3, 4, 5, 6, 11], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [8, 9] },
  ]),
  // Dutos a leste, sul e oeste terminam numa bomba central.
  entrada('habitat-lado-juncao', 3, [
    { id: 'h1', tipo: HABITAT, pontos: [0, 1, 2] },
    { id: 'd1', tipo: PIPE, pontos: [4] },
    { id: 'd2', tipo: PIPE, pontos: [7] },
    { id: 'd3', tipo: PIPE, pontos: [10] },
    { id: 's1', tipo: SOIL, pontos: [3, 11], habitatsAdjacentes: ['h1'] },
    { id: 's2', tipo: SOIL, pontos: [5, 6] },
    { id: 's3', tipo: SOIL, pontos: [8, 9] },
  ]),

  // Só dutos
  entrada('duto-reto', 8, [
    { id: 'd1', tipo: PIPE, pontos: [4, 10] },
    { id: 's1', tipo: SOIL, pontos: [11, 0, 1, 2, 3] },
    { id: 's2', tipo: SOIL, pontos: [5, 6, 7, 8, 9] },
  ]),
  entrada('duto-curva', 9, [
    { id: 'd1', tipo: PIPE, pontos: [7, 10] },
    { id: 's1', tipo: SOIL, pontos: [8, 9] },
    { id: 's2', tipo: SOIL, pontos: [11, 0, 1, 2, 3, 4, 5, 6] },
  ]),
  entrada('juncao-tres', 4, [
    { id: 'd1', tipo: PIPE, pontos: [4] },
    { id: 'd2', tipo: PIPE, pontos: [7] },
    { id: 'd3', tipo: PIPE, pontos: [10] },
    { id: 's1', tipo: SOIL, pontos: [11, 0, 1, 2, 3] },
    { id: 's2', tipo: SOIL, pontos: [5, 6] },
    { id: 's3', tipo: SOIL, pontos: [8, 9] },
  ]),
  entrada('juncao-quatro', 1, [
    { id: 'd1', tipo: PIPE, pontos: [1] },
    { id: 'd2', tipo: PIPE, pontos: [4] },
    { id: 'd3', tipo: PIPE, pontos: [7] },
    { id: 'd4', tipo: PIPE, pontos: [10] },
    { id: 's1', tipo: SOIL, pontos: [11, 0] },
    { id: 's2', tipo: SOIL, pontos: [2, 3] },
    { id: 's3', tipo: SOIL, pontos: [5, 6] },
    { id: 's4', tipo: SOIL, pontos: [8, 9] },
  ]),
];
