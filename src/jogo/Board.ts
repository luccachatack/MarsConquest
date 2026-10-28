import type { DefinicaoTile } from './DefinicaoTile';
import { Direction, TODAS_DIRECOES } from './Direction';
import { Feature } from './Feature';
import { Jogada } from './Jogada';
import type { Marcador } from './Marcador';
import { ladoDoPonto, pontoOposto, rotacionarPonto } from './PontosDeBorda';
import { Position } from './Position';
import { Terrain } from './Terrain';
import { Tile } from './Tile';
import { UnionFind } from './UnionFind';

// Terrenos que formam construções ligando peças vizinhas. O solo forma campos, que nunca
// ficam completos durante a partida: só pontuam na contagem final.
const TIPOS_COM_FEATURE: ReadonlySet<Terrain> = new Set([Terrain.HABITAT, Terrain.PIPE, Terrain.SOIL]);

// Construções que pontuam na hora em que ficam completas (o campo, não).
function pontuaAoCompletar(tipo: Terrain): boolean {
  return tipo !== Terrain.SOIL;
}

// A estufa é uma construção de uma peça só. As "bordas abertas" dela são as casas vazias
// entre as 8 em volta: cada peça colocada ao redor fecha uma, e cercada ela fica completa.
export const CASAS_EM_VOLTA = 8;
const VIZINHANCA: readonly (readonly [number, number])[] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

function emVolta(p: Position): Position[] {
  return VIZINHANCA.map(([dx, dy]) => new Position(p.x + dx, p.y + dy));
}

function regiaoDaEstufa(tile: Tile) {
  return tile.getDefinicao().regioes.find((r) => r.tipo === Terrain.GREENHOUSE);
}

const NOMES_DIRECAO: Record<Direction, string> = {
  [Direction.NORTH]: 'norte',
  [Direction.EAST]: 'leste',
  [Direction.SOUTH]: 'sul',
  [Direction.WEST]: 'oeste',
};

function chaveDaParte(tile: Tile, regiaoId: string): string {
  return `${tile.id}#${regiaoId}`;
}

// Como ficaria uma construção tocada pela jogada: o suficiente para pontuar e decidir marcadores.
export interface ConstrucaoPrevista {
  readonly tipo: Terrain;
  readonly quantidadeDeTiles: number;
  readonly quantidadeDeCristais: number;
  readonly bordasAbertas: number;
  // Marcadores que já estão nas construções que se juntariam.
  readonly marcadores: readonly Marcador[];
  // Regiões da peça nova que fariam parte dela.
  readonly regioesDaPeca: readonly string[];
  // Só nos campos: quantos habitats encostariam nele, e quantos deles já estariam fechados.
  readonly habitatsEmVolta: number;
  readonly habitatsFechadosEmVolta: number;
}

// Grupo da previsão: construções existentes e regiões da peça nova que a jogada juntaria.
interface GrupoPrevisto {
  tipo: Terrain;
  bordasAbertas: number;
  tiles: Set<Tile>;
  cristais: Set<Tile>;
  marcadores: Marcador[];
  regioesDaPeca: string[];
  // Campos já no tabuleiro que entram no grupo (para achar os habitats em volta deles).
  campos: Feature[];
}

// Tabuleiro: guarda as peças colocadas e as construções que elas formam.
// Information Expert para posições válidas (RN01, RN02); Creator das Features.
export class Board {
  private readonly tiles = new Map<string, Tile>();
  private readonly conjuntos = new UnionFind();
  private readonly featuresPorRaiz = new Map<string, Feature>();

  // A peça inicial fica em (0, 0), na rotação em que estiver.
  constructor(tileInicial: Tile) {
    this.inserir(tileInicial, new Position(0, 0));
  }

  getTile(p: Position): Tile | undefined {
    return this.tiles.get(p.chave());
  }

  estaOcupada(p: Position): boolean {
    return this.tiles.has(p.chave());
  }

  getTiles(): Tile[] {
    return [...this.tiles.values()];
  }

  quantidadeDeTiles(): number {
    return this.tiles.size;
  }

  // Posições vazias que encostam em pelo menos uma peça.
  posicoesDisponiveis(): Position[] {
    const livres = new Map<string, Position>();
    for (const tile of this.tiles.values()) {
      for (const d of TODAS_DIRECOES) {
        const vizinha = tile.getPosicao()!.vizinha(d);
        if (!this.estaOcupada(vizinha)) {
          livres.set(vizinha.chave(), vizinha);
        }
      }
    }
    return [...livres.values()];
  }

  // null se a jogada é válida; senão, o motivo (para mostrar ao jogador).
  validarJogada(tile: Tile, jogada: Jogada): string | null {
    const { position, rotacao } = jogada;
    if (tile.estaPosicionado()) {
      return 'A peça já está no tabuleiro.';
    }
    if (this.estaOcupada(position)) {
      return 'A posição já está ocupada.';
    }
    let vizinhas = 0;
    for (const d of TODAS_DIRECOES) {
      const vizinha = this.getTile(position.vizinha(d));
      if (!vizinha) continue;
      vizinhas++;
      if (!tile.conectaCom(vizinha, d, rotacao)) {
        return `O lado ${NOMES_DIRECAO[d]} não combina com a peça vizinha.`;
      }
    }
    if (vizinhas === 0) {
      return 'A peça precisa encostar em pelo menos uma peça do tabuleiro.';
    }
    return null;
  }

  podeColocar(tile: Tile, jogada: Jogada): boolean {
    return this.validarJogada(tile, jogada) === null;
  }

  // Todas as jogadas válidas da peça. Lista vazia: a peça não cabe em lugar nenhum (RN13).
  jogadasValidas(tile: Tile): Jogada[] {
    const jogadas: Jogada[] = [];
    for (const position of this.posicoesDisponiveis()) {
      for (let rotacao = 0; rotacao < 4; rotacao++) {
        const jogada = new Jogada(position, rotacao);
        if (this.podeColocar(tile, jogada)) {
          jogadas.push(jogada);
        }
      }
    }
    return jogadas;
  }

  // Posições disponíveis onde nenhuma das definições encaixa, em nenhuma rotação.
  // Com as peças que ainda restam, são buracos que nunca serão preenchidos: as construções
  // que encostam neles não podem mais ser completadas.
  posicoesSemEncaixe(definicoes: readonly DefinicaoTile[]): Position[] {
    const testes = definicoes.map((d) => new Tile(`teste-${d.id}`, d));
    return this.posicoesDisponiveis().filter(
      (position) =>
        !testes.some((tile) => [0, 1, 2, 3].some((rotacao) => this.podeColocar(tile, new Jogada(position, rotacao)))),
    );
  }

  // Coloca a peça e devolve as construções que ela completou.
  colocar(tile: Tile, jogada: Jogada): Feature[] {
    const erro = this.validarJogada(tile, jogada);
    if (erro) {
      throw new Error(erro);
    }
    tile.definirRotacao(jogada.rotacao);
    return this.inserir(tile, jogada.position);
  }

  // As construções que a jogada completaria e que pontuam na hora, sem colocar a peça nem mudar nada.
  preverConclusoes(tile: Tile, jogada: Jogada): ConstrucaoPrevista[] {
    return this.preverConstrucoes(tile, jogada).filter((c) => c.bordasAbertas === 0 && pontuaAoCompletar(c.tipo));
  }

  // Habitats distintos que encostam no campo, por qualquer uma das peças dele.
  habitatsEmVolta(campo: Feature): Feature[] {
    const habitats = new Set<Feature>();
    for (const { tile, regiaoId } of campo.getPartes()) {
      const regiao = tile.getDefinicao().regioes.find((r) => r.id === regiaoId)!;
      regiao.habitatsAdjacentes.forEach((id) => habitats.add(this.featureDaChave(chaveDaParte(tile, id))));
    }
    return [...habitats];
  }

  // O que conta na contagem final do campo: os habitats em volta que já fecharam.
  habitatsFechadosEmVolta(campo: Feature): number {
    return this.habitatsEmVolta(campo).filter((h) => h.estaCompleta()).length;
  }

  // Como ficariam todas as construções da peça nova, completas ou não, sem mudar nada.
  // Faz a mesma conta de colocar: cada ligação fecha 2 bordas, e construções ligadas se juntam.
  preverConstrucoes(tile: Tile, jogada: Jogada): ConstrucaoPrevista[] {
    const erro = this.validarJogada(tile, jogada);
    if (erro) {
      throw new Error(erro);
    }
    const locais = new UnionFind();
    const grupos = new Map<string, GrupoPrevisto>();
    const ligacoes: string[] = [];
    const adicionar = (chave: string, grupo: GrupoPrevisto) => {
      if (!locais.contem(chave)) {
        locais.adicionar(chave);
        grupos.set(chave, grupo);
      }
    };

    for (const regiao of tile.getDefinicao().regioes) {
      if (!TIPOS_COM_FEATURE.has(regiao.tipo)) continue;
      const pontos = regiao.pontos.map((p) => rotacionarPonto(p, jogada.rotacao));
      const chave = `nova#${regiao.id}`;
      adicionar(chave, {
        tipo: regiao.tipo,
        bordasAbertas: pontos.length,
        tiles: new Set([tile]),
        cristais: new Set(regiao.cristal ? [tile] : []),
        marcadores: [],
        regioesDaPeca: [regiao.id],
        campos: [],
      });
      for (const p of pontos) {
        const vizinha = this.getTile(jogada.position.vizinha(ladoDoPonto(p)));
        if (!vizinha) continue;
        const chaveVizinha = chaveDaParte(vizinha, vizinha.getRegiaoNoPonto(pontoOposto(p)).id);
        const raiz = this.conjuntos.encontrar(chaveVizinha);
        const feature = this.featuresPorRaiz.get(raiz)!;
        adicionar(raiz, {
          tipo: feature.tipo,
          bordasAbertas: feature.getBordasAbertas(),
          tiles: new Set(feature.getTiles()),
          cristais: new Set(feature.getTilesComCristal()),
          marcadores: [...feature.getMarcadores()],
          regioesDaPeca: [],
          campos: feature.tipo === Terrain.SOIL ? [feature] : [],
        });
        locais.unir(chave, raiz);
        ligacoes.push(chave);
      }
    }

    // Soma cada grupo na sua raiz e desconta 2 bordas por ligação.
    const somas = new Map<string, GrupoPrevisto>();
    for (const [chave, grupo] of grupos) {
      const raiz = locais.encontrar(chave);
      const soma = somas.get(raiz);
      if (!soma) {
        somas.set(raiz, {
          ...grupo,
          tiles: new Set(grupo.tiles),
          cristais: new Set(grupo.cristais),
          marcadores: [...grupo.marcadores],
          regioesDaPeca: [...grupo.regioesDaPeca],
          campos: [...grupo.campos],
        });
        continue;
      }
      soma.bordasAbertas += grupo.bordasAbertas;
      grupo.tiles.forEach((t) => soma.tiles.add(t));
      grupo.cristais.forEach((t) => soma.cristais.add(t));
      soma.marcadores.push(...grupo.marcadores);
      soma.regioesDaPeca.push(...grupo.regioesDaPeca);
      soma.campos.push(...grupo.campos);
    }
    for (const chave of ligacoes) {
      somas.get(locais.encontrar(chave))!.bordasAbertas -= 2;
    }

    // Estufas: a da peça nova (casas vazias em volta da posição) e as que estão em volta,
    // que ganham uma vizinha a mais.
    const estufaNova = regiaoDaEstufa(tile);
    if (estufaNova) {
      somas.set(`nova#${estufaNova.id}`, {
        tipo: Terrain.GREENHOUSE,
        bordasAbertas: this.casasVaziasEmVolta(jogada.position),
        tiles: new Set([tile]),
        cristais: new Set(),
        marcadores: [],
        regioesDaPeca: [estufaNova.id],
        campos: [],
      });
    }
    for (const feature of this.estufasEmVolta(jogada.position)) {
      somas.set(`estufa#${feature.getPartes()[0].tile.id}`, {
        tipo: Terrain.GREENHOUSE,
        bordasAbertas: feature.getBordasAbertas() - 1,
        tiles: new Set(feature.getTiles()),
        cristais: new Set(),
        marcadores: [...feature.getMarcadores()],
        regioesDaPeca: [],
        campos: [],
      });
    }

    // Habitats em volta de cada campo previsto, e quais deles estariam fechados. Um habitat
    // que a jogada toca é identificado pelo grupo previsto dele (e fica aberto ou fechado
    // conforme a previsão); os outros, pela construção que já existe.
    const habitatsEmVolta = (g: GrupoPrevisto): { total: number; fechados: number } => {
      const fechados = new Map<string, boolean>();
      const anotar = (chave: string, fechado: boolean) => {
        const raiz = locais.contem(chave) ? locais.encontrar(chave) : chave;
        fechados.set(raiz, locais.contem(chave) ? somas.get(raiz)!.bordasAbertas === 0 : fechado);
      };
      for (const campo of g.campos) {
        for (const h of this.habitatsEmVolta(campo)) {
          const { tile: t, regiaoId } = h.getPartes()[0];
          anotar(this.conjuntos.encontrar(chaveDaParte(t, regiaoId)), h.estaCompleta());
        }
      }
      for (const regiaoId of g.regioesDaPeca) {
        const regiao = tile.getDefinicao().regioes.find((r) => r.id === regiaoId)!;
        regiao.habitatsAdjacentes.forEach((id) => anotar(`nova#${id}`, false));
      }
      return { total: fechados.size, fechados: [...fechados.values()].filter(Boolean).length };
    };

    return [...somas.values()].map((g) => {
      const emVolta = g.tipo === Terrain.SOIL ? habitatsEmVolta(g) : { total: 0, fechados: 0 };
      return {
        tipo: g.tipo,
        quantidadeDeTiles: g.tiles.size,
        quantidadeDeCristais: g.cristais.size,
        bordasAbertas: g.bordasAbertas,
        marcadores: g.marcadores,
        regioesDaPeca: g.regioesDaPeca,
        habitatsEmVolta: emVolta.total,
        habitatsFechadosEmVolta: emVolta.fechados,
      };
    });
  }

  getFeatureDe(tile: Tile, regiaoId: string): Feature | undefined {
    const chave = chaveDaParte(tile, regiaoId);
    return this.conjuntos.contem(chave) ? this.featureDaChave(chave) : undefined;
  }

  getFeatures(tipo?: Terrain): Feature[] {
    const todas = [...this.featuresPorRaiz.values()];
    return tipo ? todas.filter((f) => f.tipo === tipo) : todas;
  }

  private inserir(tile: Tile, position: Position): Feature[] {
    tile.posicionar(position);
    this.tiles.set(position.chave(), tile);

    for (const regiao of tile.getRegioes()) {
      if (!TIPOS_COM_FEATURE.has(regiao.tipo)) continue;

      const chave = chaveDaParte(tile, regiao.id);
      this.conjuntos.adicionar(chave);
      this.featuresPorRaiz.set(chave, new Feature(regiao.tipo, { tile, regiaoId: regiao.id }, regiao.pontos.length));

      // O ponto p desta peça encosta no ponto oposto da vizinha do lado de p.
      for (const p of regiao.pontos) {
        const vizinha = this.getTile(position.vizinha(ladoDoPonto(p)));
        if (vizinha) {
          const regiaoVizinha = vizinha.getRegiaoNoPonto(pontoOposto(p));
          this.ligar(chave, chaveDaParte(vizinha, regiaoVizinha.id));
        }
      }
    }

    // A peça nova ocupa uma das casas em volta de cada estufa vizinha.
    const estufasEmVolta = this.estufasEmVolta(position);
    estufasEmVolta.forEach((f) => f.fecharBordas(1));
    const estufa = regiaoDaEstufa(tile);
    if (estufa) {
      const chave = chaveDaParte(tile, estufa.id);
      this.conjuntos.adicionar(chave);
      this.featuresPorRaiz.set(
        chave,
        new Feature(Terrain.GREENHOUSE, { tile, regiaoId: estufa.id }, this.casasVaziasEmVolta(position)),
      );
    }

    // Só uma construção que encosta na peça nova (ou uma estufa em volta dela) pode ter
    // acabado de ficar completa.
    const tocadas = new Set<Feature>(estufasEmVolta);
    for (const regiao of tile.getRegioes()) {
      if (TIPOS_COM_FEATURE.has(regiao.tipo) || regiao.tipo === Terrain.GREENHOUSE) {
        tocadas.add(this.featureDaChave(chaveDaParte(tile, regiao.id)));
      }
    }
    return [...tocadas].filter((f) => f.estaCompleta() && pontuaAoCompletar(f.tipo));
  }

  private casasVaziasEmVolta(position: Position): number {
    return emVolta(position).filter((p) => !this.estaOcupada(p)).length;
  }

  // As construções das estufas que estão nas 8 casas em volta da posição.
  private estufasEmVolta(position: Position): Feature[] {
    const estufas: Feature[] = [];
    for (const p of emVolta(position)) {
      const vizinha = this.getTile(p);
      const estufa = vizinha && regiaoDaEstufa(vizinha);
      if (estufa) estufas.push(this.featureDaChave(chaveDaParte(vizinha, estufa.id)));
    }
    return estufas;
  }

  // Liga duas partes que se encostam: junta as construções, se eram diferentes,
  // e fecha os dois pontos de borda que se tocaram.
  private ligar(a: string, b: string): void {
    const uniao = this.conjuntos.unir(a, b);
    if (uniao) {
      const raiz = this.featuresPorRaiz.get(uniao.raiz)!;
      raiz.absorver(this.featuresPorRaiz.get(uniao.absorvida)!);
      this.featuresPorRaiz.delete(uniao.absorvida);
    }
    this.featureDaChave(a).fecharBordas(2);
  }

  private featureDaChave(chave: string): Feature {
    return this.featuresPorRaiz.get(this.conjuntos.encontrar(chave))!;
  }
}
