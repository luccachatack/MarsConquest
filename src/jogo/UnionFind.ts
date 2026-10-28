// Conjuntos disjuntos (Union-Find) com compressão de caminho e união por tamanho.
// Pure Fabrication: o Board usa para saber quais regiões de peças diferentes formam
// a mesma construção, mesmo depois de uma peça unir duas construções separadas.
export class UnionFind {
  private readonly pai = new Map<string, string>();
  private readonly tamanho = new Map<string, number>();

  adicionar(x: string): void {
    if (!this.pai.has(x)) {
      this.pai.set(x, x);
      this.tamanho.set(x, 1);
    }
  }

  contem(x: string): boolean {
    return this.pai.has(x);
  }

  encontrar(x: string): string {
    if (!this.pai.has(x)) {
      throw new Error(`Elemento desconhecido: ${x}`);
    }
    let raiz = x;
    while (this.pai.get(raiz) !== raiz) {
      raiz = this.pai.get(raiz)!;
    }
    // Compressão de caminho: todos no caminho passam a apontar direto para a raiz.
    let atual = x;
    while (atual !== raiz) {
      const proximo = this.pai.get(atual)!;
      this.pai.set(atual, raiz);
      atual = proximo;
    }
    return raiz;
  }

  // Une os conjuntos de a e b. Devolve qual raiz ficou e qual foi absorvida,
  // ou null se já estavam no mesmo conjunto.
  unir(a: string, b: string): { raiz: string; absorvida: string } | null {
    let raiz = this.encontrar(a);
    let absorvida = this.encontrar(b);
    if (raiz === absorvida) {
      return null;
    }
    if (this.tamanho.get(raiz)! < this.tamanho.get(absorvida)!) {
      [raiz, absorvida] = [absorvida, raiz];
    }
    this.pai.set(absorvida, raiz);
    this.tamanho.set(raiz, this.tamanho.get(raiz)! + this.tamanho.get(absorvida)!);
    return { raiz, absorvida };
  }
}
