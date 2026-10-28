import { Direction, TODAS_DIRECOES } from './Direction';
import { Feature } from './Feature';
import { Jogada } from './Jogada';
import { ladoDoPonto, pontoOposto, rotacionarPonto } from './PontosDeBorda';
import { Position } from './Position';
import { Terrain } from './Terrain';
import type { Tile } from './Tile';
import { UnionFind } from './UnionFind';

// Terrenos que formam construções entre peças. A estufa fica dentro de uma peça só,
// e o solo ainda não pontua; para incluí-lo, basta adicioná-lo aqui.
const TIPOS_COM_FEATURE: ReadonlySet<Terrain> = new Set([Terrain.HABITAT, Terrain.PIPE]);

const NOMES_DIRECAO: Record<Direction, string> = {
  [Direction.NORTH]: 'norte',
  [Direction.EAST]: 'leste',
  [Direction.SOUTH]: 'sul',
  [Direction.WEST]: 'oeste',
};

function chaveDaParte(tile: Tile, regiaoId: string): string {
  return `${tile.id}#${regiaoId}`;
}

// O que uma construção teria se a jogada fosse feita: o suficiente para pontuar.
export interface ConstrucaoPrevista {
  readonly tipo: Terrain;
  readonly quantidadeDeTiles: number;
  readonly quantidadeDeCristais: number;
}

// Grupo da previsão: construções existentes e regiões da peça nova que a jogada juntaria.
interface GrupoPrevisto {
  tipo: Terrain;
  bordasAbertas: number;
  tiles: Set<Tile>;
  cristais: Set<Tile>;
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

  // Coloca a peça e devolve as construções que ela completou.
  colocar(tile: Tile, jogada: Jogada): Feature[] {
    const erro = this.validarJogada(tile, jogada);
    if (erro) {
      throw new Error(erro);
    }
    tile.definirRotacao(jogada.rotacao);
    return this.inserir(tile, jogada.position);
  }

  // As construções que a jogada completaria, sem colocar a peça nem mudar nada.
  // Faz a mesma conta de colocar: cada ligação fecha 2 bordas, e construções ligadas se juntam.
  preverConclusoes(tile: Tile, jogada: Jogada): ConstrucaoPrevista[] {
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
        somas.set(raiz, { ...grupo, tiles: new Set(grupo.tiles), cristais: new Set(grupo.cristais) });
        continue;
      }
      soma.bordasAbertas += grupo.bordasAbertas;
      grupo.tiles.forEach((t) => soma.tiles.add(t));
      grupo.cristais.forEach((t) => soma.cristais.add(t));
    }
    for (const chave of ligacoes) {
      somas.get(locais.encontrar(chave))!.bordasAbertas -= 2;
    }

    return [...somas.values()]
      .filter((g) => g.bordasAbertas === 0)
      .map((g) => ({ tipo: g.tipo, quantidadeDeTiles: g.tiles.size, quantidadeDeCristais: g.cristais.size }));
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

    // Só uma construção que encosta na peça nova pode ter acabado de ficar completa.
    const tocadas = new Set<Feature>();
    for (const regiao of tile.getRegioes()) {
      if (TIPOS_COM_FEATURE.has(regiao.tipo)) {
        tocadas.add(this.featureDaChave(chaveDaParte(tile, regiao.id)));
      }
    }
    return [...tocadas].filter((f) => f.estaCompleta());
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
