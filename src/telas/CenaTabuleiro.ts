import Phaser from 'phaser';
import { estrategiaPara, type EstrategiaDeJogo } from '../ia/EstrategiaDeJogo';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../jogo/catalogoDeTiles';
import { FaseDaPartida } from '../jogo/EstadoDaPartida';
import { Jogada } from '../jogo/Jogada';
import { Jogador } from '../jogo/Jogador';
import { TipoDeMarcador, type Marcador } from '../jogo/Marcador';
import { Partida, type Colocacao, type ConstrucaoPontuada, type ResultadoDoTurno } from '../jogo/Partida';
import { Position } from '../jogo/Position';
import { Terrain } from '../jogo/Terrain';
import type { Tile } from '../jogo/Tile';
import { TileFactory } from '../jogo/TileFactory';
import type { DadosDaPartida } from './CenaPreparacao';
import { desenharMarcador } from './desenharMarcador';
import { ancoraDaRegiao, desenharTile } from './desenharTile';
import { CENAS, corCss, estilo } from './ui';

export const TAMANHO_PECA = 96;
// Largura da área do tabuleiro; à direita fica o painel (CenaPainelTabuleiro).
export const LARGURA_TABULEIRO = 900;

const COR_VALIDA = 0x5fd38d;
const COR_DISPONIVEL = 0x5d6878;
const COR_SEM_ENCAIXE = 0xe0614f;
const DISTANCIA_PARA_ARRASTAR = 6;
// Raio, em pixels do mundo, em que um clique escolhe uma região para o marcador.
const RAIO_DA_OPCAO = 16;
// Pausa antes da jogada do computador, para dar tempo de ver o que acontece.
const ESPERA_DA_CPU_MS = 700;
const MAXIMO_DE_EVENTOS = 5;

export interface EstadoDoTabuleiro {
  readonly jogadores: readonly Jogador[];
  // undefined quando a partida acabou.
  readonly jogadorDaVez: Jogador | undefined;
  readonly fase: FaseDaPartida;
  readonly atual: Tile | undefined;
  readonly restantes: number;
  readonly colocadas: number;
  readonly descartadas: number;
  // Posições onde a peça cabe em alguma rotação, e de quantos jeitos ela cabe na posição sob o mouse.
  readonly posicoesValidas: number;
  readonly rotacoesNaPosicao: number;
  // Na etapa do marcador: quantas regiões da peça aceitam marcador e se o chefe está escolhido.
  readonly regioesParaMarcador: number;
  readonly usarChefe: boolean;
  readonly eventos: readonly string[];
  // Preenchida só no fim da partida.
  readonly classificacao: readonly Colocacao[] | null;
}

interface OpcaoDeMarcador {
  readonly regiaoId: string;
  readonly x: number;
  readonly y: number;
}

// A primeira rotação da lista a partir de "inicio", girando no sentido horário.
function proximaRotacao(rotacoes: readonly number[], inicio: number): number {
  for (let i = 0; i < 4; i++) {
    const r = (inicio + i) % 4;
    if (rotacoes.includes(r)) return r;
  }
  throw new Error('A peça não encaixa nesta posição.');
}

function nomeDoTerreno(tipo: Terrain): string {
  return tipo === Terrain.HABITAT ? 'habitat' : 'duto';
}

function listarNomes(jogadores: readonly Jogador[]): string {
  const nomes = jogadores.map((j) => j.nome);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0];
}

// Serve para as construções completadas no turno e para as abertas da contagem final.
function descreverPontuacao({ feature, pontos, donos }: ConstrucaoPontuada): string {
  const pecas = feature.quantidadeDeTiles();
  const cristais = feature.quantidadeDeCristais();
  const completa = feature.estaCompleta();
  const oQue =
    feature.tipo === Terrain.HABITAT
      ? `Habitat de ${pecas} peças${cristais ? ` (${cristais} com cristal)` : ''} ${completa ? 'fechado' : 'aberto'}`
      : `Duto de ${pecas} peças ${completa ? 'completo' : 'incompleto'}`;
  if (donos.length === 0) return `${oQue}, sem colonos: ninguém pontua.`;
  return `${oQue}: +${pontos} para ${listarNomes(donos)}${donos.length > 1 ? ' (empate)' : ''}.`;
}

// A partida: humanos e CPUs se revezam. Cada turno: colocar a peça e, se quiser, um marcador nela.
export class CenaTabuleiro extends Phaser.Scene {
  private dados!: DadosDaPartida;
  private partida!: Partida;
  private estrategias = new Map<Jogador, EstrategiaDeJogo>();
  private eventos: string[] = [];
  private usarChefe = false;
  private opcoes: OpcaoDeMarcador[] = [];
  private desenhosDosMarcadores = new Map<Marcador, Phaser.GameObjects.Graphics>();
  // Na etapa da peça: para cada posição (chave "x,y"), as rotações em que a peça encaixa.
  private encaixes = new Map<string, number[]>();
  private posicaoSobMouse: Position | null = null;
  // Posições onde nenhuma peça que resta encaixa (chaves "x,y"); só aumentam durante a partida.
  private semEncaixe = new Set<string>();

  private destaques!: Phaser.GameObjects.Graphics;
  private cruzes!: Phaser.GameObjects.Graphics;
  private fantasma!: Phaser.GameObjects.Graphics;
  private ultima!: Phaser.GameObjects.Graphics;
  private camadaDeOpcoes!: Phaser.GameObjects.Graphics;
  private inicioDoToque: { x: number; y: number } | null = null;
  private arrastando = false;

  constructor() {
    super(CENAS.tabuleiro);
  }

  init(dados: DadosDaPartida): void {
    this.dados = dados;
  }

  create(): void {
    const jogadores = this.dados.jogadores.map((j) => new Jogador(j.nome, j.tipo, j.cor));
    const baralho = new TileFactory().criarBaralho(CATALOGO_DE_TILES, ID_TILE_INICIAL);
    this.partida = new Partida(jogadores, baralho);
    this.estrategias = new Map(jogadores.filter((j) => j.ehCpu()).map((j) => [j, estrategiaPara(j.tipo)]));
    this.eventos = [];
    this.usarChefe = false;
    this.opcoes = [];
    this.desenhosDosMarcadores = new Map();
    this.encaixes = new Map();
    this.posicaoSobMouse = null;
    this.semEncaixe = new Set();

    const camera = this.cameras.main;
    camera.setViewport(0, 0, LARGURA_TABULEIRO, this.scale.height);
    this.centralizar();

    this.desenharGrade();
    this.desenharPeca(baralho.getTileInicial());
    // Camadas: peças (0) < destaques < prévia < contorno da última peça < opções de marcador < marcadores < textos.
    this.destaques = this.add.graphics().setDepth(1);
    this.cruzes = this.add.graphics().setDepth(1);
    this.fantasma = this.add.graphics().setAlpha(0.6).setDepth(2);
    this.ultima = this.add.graphics().setDepth(3);
    this.camadaDeOpcoes = this.add.graphics().setDepth(4);
    this.tweens.add({ targets: this.camadaDeOpcoes, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });

    this.configurarEntrada();
    this.scene.launch(CENAS.painelTabuleiro);
    this.registrar(`A peça inicial está no centro. ${this.partida.getJogadorDaVez().nome} começa.`);
    this.registrarDescartes(this.partida.quantidadeDeDescartadas());
    this.iniciarTurno();
  }

  // Chamados pelo painel.

  // Com o mouse numa posição verde, passa para a próxima rotação que encaixa ali;
  // fora delas, gira normalmente.
  girar(): void {
    const atual = this.partida.getPecaAtual();
    if (!atual || !this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    const rotacoes = this.posicaoSobMouse && this.encaixes.get(this.posicaoSobMouse.chave());
    if (rotacoes) {
      atual.definirRotacao(proximaRotacao(rotacoes, atual.getRotacao() + 1));
    } else {
      atual.rotacionar();
    }
    this.desenharFantasmaDaPeca();
    this.emitirEstado();
  }

  alternarChefe(): void {
    if (!this.vezDeHumano(FaseDaPartida.COLOCAR_MARCADOR)) return;
    this.usarChefe = !this.usarChefe;
    this.atualizar();
  }

  pularMarcador(): void {
    if (!this.vezDeHumano(FaseDaPartida.COLOCAR_MARCADOR)) return;
    this.terminarTurno(this.partida.pularMarcador());
  }

  centralizar(): void {
    this.cameras.main.setZoom(1).centerOn(TAMANHO_PECA / 2, TAMANHO_PECA / 2);
  }

  // Mesmos jogadores, baralho novo.
  novaPartida(): void {
    this.scene.restart(this.dados);
  }

  trocarJogadores(): void {
    this.scene.stop(CENAS.painelTabuleiro);
    this.scene.start(CENAS.preparacao);
  }

  voltarAoMenu(): void {
    this.scene.stop(CENAS.painelTabuleiro);
    this.scene.start(CENAS.menu);
  }

  emitirEstado(): void {
    const atual = this.partida.getPecaAtual();
    const encerrada = this.partida.estaEncerrada();
    const fase = this.partida.getFase();
    const estado: EstadoDoTabuleiro = {
      jogadores: this.partida.getJogadores(),
      jogadorDaVez: encerrada ? undefined : this.partida.getJogadorDaVez(),
      fase,
      atual,
      restantes: this.partida.quantidadeRestante(),
      colocadas: this.partida.getBoard().quantidadeDeTiles(),
      descartadas: this.partida.quantidadeDeDescartadas(),
      posicoesValidas: this.encaixes.size,
      rotacoesNaPosicao: (this.posicaoSobMouse && this.encaixes.get(this.posicaoSobMouse.chave())?.length) || 0,
      regioesParaMarcador: this.opcoes.length,
      usarChefe: this.usarChefe,
      eventos: this.eventos,
      classificacao: encerrada ? this.partida.classificacao() : null,
    };
    this.events.emit('estado', estado);
  }

  private vezDeHumano(fase: FaseDaPartida): boolean {
    return this.partida.getFase() === fase && !this.partida.getJogadorDaVez().ehCpu();
  }

  private iniciarTurno(): void {
    this.usarChefe = false;
    this.atualizar();
    if (this.partida.estaEncerrada() || !this.partida.getJogadorDaVez().ehCpu()) return;
    this.time.delayedCall(ESPERA_DA_CPU_MS, () => {
      const jogador = this.partida.getJogadorDaVez();
      const decisao = this.estrategias.get(jogador)!.decidir(this.partida.getBoard(), this.partida.getPecaAtual()!, jogador);
      this.colocarPeca(decisao.jogada);
      this.terminarTurno(decisao.marcador ? this.partida.colocarMarcador(decisao.marcador) : this.partida.pularMarcador());
    });
  }

  private colocarPeca(jogada: Jogada): void {
    this.partida.colocarPeca(jogada);
    const tile = this.partida.getPecaAtual()!;
    this.desenharPeca(tile);
    const p = jogada.position;
    this.ultima
      .clear()
      .lineStyle(4, this.partida.getJogadorDaVez().cor, 1)
      .strokeRect(p.x * TAMANHO_PECA, p.y * TAMANHO_PECA, TAMANHO_PECA, TAMANHO_PECA);
    this.fantasma.clear();
  }

  // Clique de um humano na etapa da peça.
  private colocarEm(posicao: Position): void {
    const atual = this.partida.getPecaAtual();
    if (!atual || !this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    const rotacoes = this.encaixes.get(posicao.chave());
    if (!rotacoes) return;
    // Garante uma rotação que encaixa (o clique pode vir sem o mouse ter passado por ali).
    atual.definirRotacao(proximaRotacao(rotacoes, atual.getRotacao()));
    this.encaixes = new Map();
    this.colocarPeca(new Jogada(posicao, atual.getRotacao()));

    const regioes = this.partida.regioesParaMarcador();
    if (regioes.length === 0) {
      // Nenhuma região aceita marcador: o turno termina sem perguntar.
      this.terminarTurno(this.partida.pularMarcador());
      return;
    }
    const posicaoDaPeca = atual.getPosicao()!;
    this.opcoes = atual
      .getRegioes()
      .filter((r) => regioes.includes(r.id))
      .map((r) => {
        const [u, v] = ancoraDaRegiao(r);
        return { regiaoId: r.id, x: (posicaoDaPeca.x + u) * TAMANHO_PECA, y: (posicaoDaPeca.y + v) * TAMANHO_PECA };
      });
    this.atualizar();
  }

  // Clique de um humano na etapa do marcador: escolhe a região mais próxima do clique.
  private escolherOpcao(x: number, y: number): void {
    if (!this.vezDeHumano(FaseDaPartida.COLOCAR_MARCADOR)) return;
    const opcao = this.opcaoEm(x, y);
    if (!opcao) return;
    this.terminarTurno(this.partida.colocarMarcador({ regiaoId: opcao.regiaoId, tipo: this.tipoEscolhido() }));
  }

  // O chefe, se o jogador pediu e ainda o tem; senão um colono (ou o chefe, se só restar ele).
  private tipoEscolhido(): TipoDeMarcador {
    const jogador = this.partida.getJogadorDaVez();
    const querChefe = this.usarChefe && jogador.disponiveis(TipoDeMarcador.CHEFE) > 0;
    return querChefe || jogador.disponiveis(TipoDeMarcador.COLONO) === 0 ? TipoDeMarcador.CHEFE : TipoDeMarcador.COLONO;
  }

  private opcaoEm(x: number, y: number): OpcaoDeMarcador | undefined {
    return this.opcoes.find((o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) <= RAIO_DA_OPCAO);
  }

  // Mostra o marcador colocado, pontua o que foi completado e passa para o próximo turno.
  private terminarTurno(resultado: ResultadoDoTurno): void {
    this.opcoes = [];
    this.fantasma.clear();
    if (resultado.marcador) {
      this.desenharMarcadorNoTabuleiro(resultado.marcador);
      const regiao = resultado.marcador.tile.getRegioes().find((r) => r.id === resultado.marcador!.regiaoId)!;
      const quem = resultado.marcador.tipo === TipoDeMarcador.CHEFE ? 'o chefe' : 'um colono';
      this.registrar(`${resultado.jogador.nome} pôs ${quem} num ${nomeDoTerreno(regiao.tipo)}.`);
    }
    for (const concluida of resultado.concluidas) {
      this.registrar(descreverPontuacao(concluida));
      this.mostrarPontos(concluida);
      concluida.devolvidos.forEach((m) => this.recolherMarcador(m));
    }
    this.registrarDescartes(resultado.descartadas.length);
    if (resultado.contagemFinal.length > 0) {
      const total = resultado.contagemFinal.reduce((soma, c) => soma + c.pontos * c.donos.length, 0);
      this.registrar(`Contagem final das construções abertas: ${total} pontos distribuídos.`);
      resultado.contagemFinal.forEach((c) => this.mostrarPontos(c));
    }
    if (this.partida.estaEncerrada()) {
      const [primeiro] = this.partida.classificacao();
      this.registrar(`Fim da partida! ${primeiro.jogador.nome} terminou em 1º lugar.`);
    }
    this.iniciarTurno();
  }

  private desenharMarcadorNoTabuleiro(m: Marcador): void {
    const regiao = m.tile.getRegioes().find((r) => r.id === m.regiaoId)!;
    const [u, v] = ancoraDaRegiao(regiao);
    const p = m.tile.getPosicao()!;
    const g = this.add.graphics().setDepth(5);
    desenharMarcador(g, m.tipo, m.dono.cor, (p.x + u) * TAMANHO_PECA, (p.y + v) * TAMANHO_PECA, TAMANHO_PECA);
    this.desenhosDosMarcadores.set(m, g);
  }

  // O marcador volta para a reserva: some aos poucos do tabuleiro.
  private recolherMarcador(m: Marcador): void {
    const g = this.desenhosDosMarcadores.get(m);
    if (!g) return;
    this.desenhosDosMarcadores.delete(m);
    this.tweens.add({ targets: g, alpha: 0, delay: 500, duration: 700, onComplete: () => g.destroy() });
  }

  // "+N" subindo sobre a construção, na cor de quem pontuou (branco se foram vários).
  private mostrarPontos({ feature, pontos, donos }: ConstrucaoPontuada): void {
    const posicoes = feature.getTiles().map((t) => t.getPosicao()!);
    const cx = (posicoes.reduce((s, q) => s + q.x, 0) / posicoes.length + 0.5) * TAMANHO_PECA;
    const cy = (posicoes.reduce((s, q) => s + q.y, 0) / posicoes.length + 0.5) * TAMANHO_PECA;
    const cor = donos.length === 1 ? corCss(donos[0].cor) : donos.length === 0 ? '#9aa1ad' : '#ffffff';
    const texto = this.add
      .text(cx, cy, donos.length ? `+${pontos}` : '0', { ...estilo(30, cor, true), stroke: '#14161c', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(6);
    this.tweens.add({ targets: texto, y: cy - 60, alpha: 0, duration: 1600, ease: 'Cubic.easeIn', onComplete: () => texto.destroy() });
  }

  private registrarDescartes(quantidade: number): void {
    if (quantidade > 0) {
      this.registrar(`${quantidade} peça(s) descartada(s): não cabiam em lugar nenhum.`);
    }
  }

  // Todas as jogadas válidas da peça, agrupadas por posição.
  private calcularEncaixes(tile: Tile): Map<string, number[]> {
    const encaixes = new Map<string, number[]>();
    for (const { position, rotacao } of this.partida.getBoard().jogadasValidas(tile)) {
      encaixes.set(position.chave(), [...(encaixes.get(position.chave()) ?? []), rotacao]);
    }
    return encaixes;
  }

  private atualizar(): void {
    this.destaques.clear();
    this.camadaDeOpcoes.clear();
    this.encaixes = new Map();
    const atual = this.partida.getPecaAtual();
    // Só na vez de um humano: na vez da CPU, não é ele quem escolhe.
    // Verde: a peça cabe ali em alguma rotação. Cinza: não cabe de jeito nenhum.
    if (atual && this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) {
      this.encaixes = this.calcularEncaixes(atual);
      for (const p of this.partida.getBoard().posicoesDisponiveis()) {
        const [x, y] = [p.x * TAMANHO_PECA, p.y * TAMANHO_PECA];
        if (this.encaixes.has(p.chave())) {
          this.destaques.fillStyle(COR_VALIDA, 0.18).fillRect(x, y, TAMANHO_PECA, TAMANHO_PECA);
          this.destaques.lineStyle(2, COR_VALIDA, 0.9).strokeRect(x + 2, y + 2, TAMANHO_PECA - 4, TAMANHO_PECA - 4);
        } else {
          this.destaques.lineStyle(1, COR_DISPONIVEL, 0.6).strokeRect(x + 4, y + 4, TAMANHO_PECA - 8, TAMANHO_PECA - 8);
        }
      }
    }
    this.desenharPosicoesSemEncaixe();
    const cor = this.partida.estaEncerrada() ? 0xffffff : this.partida.getJogadorDaVez().cor;
    for (const o of this.opcoes) {
      this.camadaDeOpcoes.fillStyle(cor, 0.3).fillCircle(o.x, o.y, RAIO_DA_OPCAO - 2);
      this.camadaDeOpcoes.lineStyle(3, cor, 1).strokeCircle(o.x, o.y, RAIO_DA_OPCAO - 2);
    }
    this.emitirEstado();
  }

  // X vermelho onde nenhuma peça que resta encaixa: o que encosta ali nunca será completado.
  private desenharPosicoesSemEncaixe(): void {
    // No fim, sem peças, nada mais cabe em lugar nenhum: mantém os X que já estavam.
    if (this.partida.estaEncerrada()) return;
    const posicoes = this.partida.posicoesSemEncaixe();
    const novas = posicoes.filter((p) => !this.semEncaixe.has(p.chave())).length;
    if (novas > 0) {
      this.registrar(
        novas === 1 ? 'Um lugar ficou sem peça que caiba (X).' : `${novas} lugares ficaram sem peça que caiba (X).`,
      );
    }
    this.semEncaixe = new Set(posicoes.map((p) => p.chave()));

    this.cruzes.clear();
    const margem = TAMANHO_PECA * 0.28;
    for (const p of posicoes) {
      const [x, y] = [p.x * TAMANHO_PECA, p.y * TAMANHO_PECA];
      this.cruzes.fillStyle(COR_SEM_ENCAIXE, 0.1).fillRect(x + 4, y + 4, TAMANHO_PECA - 8, TAMANHO_PECA - 8);
      this.cruzes.lineStyle(6, COR_SEM_ENCAIXE, 0.85);
      this.cruzes.lineBetween(x + margem, y + margem, x + TAMANHO_PECA - margem, y + TAMANHO_PECA - margem);
      this.cruzes.lineBetween(x + TAMANHO_PECA - margem, y + margem, x + margem, y + TAMANHO_PECA - margem);
    }
  }

  private registrar(texto: string): void {
    this.eventos = [texto, ...this.eventos].slice(0, MAXIMO_DE_EVENTOS);
  }

  private desenharPeca(tile: Tile): void {
    const p = tile.getPosicao()!;
    desenharTile(this.add.graphics(), tile, p.x * TAMANHO_PECA, p.y * TAMANHO_PECA, TAMANHO_PECA);
  }

  // Pontos discretos marcando a grade, numa área grande em volta do centro.
  private desenharGrade(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.08);
    for (let gx = -40; gx <= 40; gx++) {
      for (let gy = -40; gy <= 40; gy++) {
        g.fillCircle(gx * TAMANHO_PECA, gy * TAMANHO_PECA, 1.5);
      }
    }
  }

  private posicaoSobPonteiro(ponteiro: Phaser.Input.Pointer): Position {
    const mundo = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
    return new Position(Math.floor(mundo.x / TAMANHO_PECA), Math.floor(mundo.y / TAMANHO_PECA));
  }

  // Clique coloca, arrastar move a câmera, roda do mouse dá zoom, botão direito gira.
  private configurarEntrada(): void {
    this.input.mouse?.disableContextMenu();
    const naAreaDoTabuleiro = (p: Phaser.Input.Pointer) => p.x < LARGURA_TABULEIRO;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!naAreaDoTabuleiro(p)) return;
      if (p.rightButtonDown()) {
        this.girar();
        return;
      }
      this.inicioDoToque = { x: p.x, y: p.y };
      this.arrastando = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const camera = this.cameras.main;
      if (p.isDown && this.inicioDoToque) {
        const distancia = Phaser.Math.Distance.Between(p.x, p.y, this.inicioDoToque.x, this.inicioDoToque.y);
        if (distancia > DISTANCIA_PARA_ARRASTAR) this.arrastando = true;
        if (this.arrastando) {
          camera.scrollX -= (p.x - p.prevPosition.x) / camera.zoom;
          camera.scrollY -= (p.y - p.prevPosition.y) / camera.zoom;
          this.fantasma.clear();
        }
        return;
      }
      this.mostrarFantasma(naAreaDoTabuleiro(p) ? p : null);
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.inicioDoToque && !this.arrastando && naAreaDoTabuleiro(p)) {
        if (this.partida.getFase() === FaseDaPartida.COLOCAR_MARCADOR) {
          const mundo = this.cameras.main.getWorldPoint(p.x, p.y);
          this.escolherOpcao(mundo.x, mundo.y);
        } else {
          this.colocarEm(this.posicaoSobPonteiro(p));
        }
      }
      this.inicioDoToque = null;
      this.arrastando = false;
    });

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _objetos: unknown, _dx: number, dy: number) => {
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * (dy > 0 ? 0.9 : 1.1), 0.35, 2));
    });

    this.input.keyboard?.on('keydown-R', () => this.girar());
    this.input.keyboard?.on('keydown-E', () => this.alternarChefe());
    this.input.keyboard?.on('keydown-SPACE', () => this.pularMarcador());
    this.input.keyboard?.on('keydown-C', () => this.centralizar());
    this.input.keyboard?.on('keydown-ESC', () => this.voltarAoMenu());
  }

  // Prévia sob o ponteiro, só na vez de um humano: a peça onde ela encaixa,
  // ou o marcador sobre a região escolhida.
  private mostrarFantasma(ponteiro: Phaser.Input.Pointer | null): void {
    this.fantasma.clear();
    const atual = this.partida.getPecaAtual();
    const posicao = ponteiro ? this.posicaoSobPonteiro(ponteiro) : null;
    const mudouDePosicao = posicao === null ? this.posicaoSobMouse !== null : !this.posicaoSobMouse?.equals(posicao);
    this.posicaoSobMouse = posicao;
    if (!ponteiro || !atual) {
      if (mudouDePosicao) this.emitirEstado();
      return;
    }

    if (this.vezDeHumano(FaseDaPartida.COLOCAR_MARCADOR)) {
      const mundo = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
      const opcao = this.opcaoEm(mundo.x, mundo.y);
      if (!opcao) return;
      const cor = this.partida.getJogadorDaVez().cor;
      desenharMarcador(this.fantasma, this.tipoEscolhido(), cor, opcao.x, opcao.y, TAMANHO_PECA);
      return;
    }
    if (!this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    // Numa posição verde, a peça gira sozinha para uma rotação que encaixa ali.
    const rotacoes = this.encaixes.get(posicao!.chave());
    if (rotacoes && !rotacoes.includes(atual.getRotacao())) {
      atual.definirRotacao(proximaRotacao(rotacoes, atual.getRotacao()));
      this.emitirEstado();
    } else if (mudouDePosicao) {
      this.emitirEstado();
    }
    this.desenharFantasmaDaPeca();
  }

  private desenharFantasmaDaPeca(): void {
    this.fantasma.clear();
    const atual = this.partida.getPecaAtual();
    const posicao = this.posicaoSobMouse;
    if (!atual || !posicao || !this.encaixes.get(posicao.chave())?.includes(atual.getRotacao())) return;
    desenharTile(this.fantasma, atual, posicao.x * TAMANHO_PECA, posicao.y * TAMANHO_PECA, TAMANHO_PECA);
  }
}
