import Phaser from 'phaser';
import { estrategiaPara, type EstrategiaDeJogo } from '../ia/EstrategiaDeJogo';
import { CASAS_EM_VOLTA } from '../jogo/Board';
import { CATALOGO_DE_TILES, ID_TILE_INICIAL } from '../jogo/catalogoDeTiles';
import { FaseDaPartida } from '../jogo/EstadoDaPartida';
import { Jogada } from '../jogo/Jogada';
import { Jogador } from '../jogo/Jogador';
import { TipoDeMarcador, type Marcador } from '../jogo/Marcador';
import { Partida, type Colocacao, type ConstrucaoPontuada, type ResultadoDoTurno } from '../jogo/Partida';
import { PONTOS_POR_HABITAT_FECHADO_NO_CAMPO } from '../jogo/Pontuacao';
import { Position } from '../jogo/Position';
import { Terrain } from '../jogo/Terrain';
import type { Tile } from '../jogo/Tile';
import { TileFactory } from '../jogo/TileFactory';
import { faixasDoSolo, RESOLUCAO_DOS_CAMPOS } from './areasDosCampos';
import type { CenaPainelTabuleiro } from './CenaPainelTabuleiro';
import type { DadosDaPartida } from './CenaPreparacao';
import { desenharMarcador } from './desenharMarcador';
import { ARTE_DAS_PECAS, criarPeca, desenharPeca } from './desenharPeca';
import { ancorasDasRegioes } from './desenharTile';
import { CENAS, corCss, estilo, nomeDaPeca, tracejarRetangulo } from './ui';

export const TAMANHO_PECA = 96;

const COR_FUNDO = 0x1b100c;
const COR_VALIDA = 0xd99a6c;
const COR_DISPONIVEL = 0x8a6a58;
const COR_SEM_ENCAIXE = 0xe0614f;
const DISTANCIA_PARA_ARRASTAR = 6;
// Raio, em pixels do mundo, em que um clique escolhe uma região para o marcador.
const RAIO_DA_OPCAO = 16;
// Pausa antes da jogada do computador, para dar tempo de ver o que acontece.
const ESPERA_DA_CPU_MS = 700;

export interface EstadoDoTabuleiro {
  readonly jogadores: readonly Jogador[];
  // undefined quando a partida acabou.
  readonly jogadorDaVez: Jogador | undefined;
  readonly fase: FaseDaPartida;
  readonly atual: Tile | undefined;
  readonly restantes: number;
  readonly colocadas: number;
  readonly descartadas: number;
  // Posições onde a peça cabe em alguma rotação, e de quantos jeitos ela cabe na posição escolhida
  // (ou, sem escolha, na posição sob o mouse).
  readonly posicoesValidas: number;
  readonly rotacoesNaPosicao: number;
  // A peça já está sobre uma casa esperando o jogador girar, voltar ou confirmar.
  readonly pecaEscolhida: boolean;
  // Na etapa do marcador: quantas regiões da peça aceitam marcador e se o chefe está escolhido.
  readonly regioesParaMarcador: number;
  readonly usarChefe: boolean;
  // Os campos estão pintados com a cor de quem domina cada um.
  readonly mostrandoCampos: boolean;
  // Tudo o que aconteceu na partida, do mais antigo ao mais novo.
  readonly eventos: readonly string[];
  // Preenchida só no fim da partida.
  readonly classificacao: readonly Colocacao[] | null;
}

interface OpcaoDeMarcador {
  readonly regiaoId: string;
  readonly x: number;
  readonly y: number;
  // No solo (fora do habitat), o marcador aparece como marciano.
  readonly marciano: boolean;
}

// A primeira rotação da lista a partir de "inicio", girando no sentido horário.
function proximaRotacao(rotacoes: readonly number[], inicio: number): number {
  for (let i = 0; i < 4; i++) {
    const r = (inicio + i) % 4;
    if (rotacoes.includes(r)) return r;
  }
  throw new Error('A peça não encaixa nesta posição.');
}

// Com o artigo: "num habitat", "num duto", "numa estufa", "num campo, como marciano".
function numTerreno(tipo: Terrain): string {
  if (tipo === Terrain.GREENHOUSE) return 'numa estufa';
  if (tipo === Terrain.SOIL) return 'num campo, como marciano';
  return tipo === Terrain.HABITAT ? 'num habitat' : 'num duto';
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
  const emVolta = CASAS_EM_VOLTA - feature.getBordasAbertas();
  const habitatsFechados = pontos / PONTOS_POR_HABITAT_FECHADO_NO_CAMPO;
  const oQue =
    feature.tipo === Terrain.SOIL
      ? `Campo com ${habitatsFechados} habitat${habitatsFechados === 1 ? '' : 's'} fechado${habitatsFechados === 1 ? '' : 's'} em volta`
      : feature.tipo === Terrain.HABITAT
      ? `Habitat de ${pecas} peças${cristais ? ` (${cristais} com cristal)` : ''} ${completa ? 'fechado' : 'aberto'}`
      : feature.tipo === Terrain.GREENHOUSE
        ? completa
          ? 'Estufa cercada'
          : `Estufa com ${emVolta} peça${emVolta === 1 ? '' : 's'} em volta`
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
  // Casa clicada na etapa da peça, antes de confirmar. A peça só vai para a Partida na confirmação.
  private escolhida: Position | null = null;
  // Posições onde nenhuma peça que resta encaixa (chaves "x,y"); só aumentam durante a partida.
  private semEncaixe = new Set<string>();

  private destaques!: Phaser.GameObjects.Graphics;
  private cruzes!: Phaser.GameObjects.Graphics;
  private fantasma!: Phaser.GameObjects.Container;
  private escolha!: Phaser.GameObjects.Container;
  private camadaDosCampos!: Phaser.GameObjects.Graphics;
  private mostrandoCampos = false;
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
    this.escolhida = null;
    this.semEncaixe = new Set();
    this.mostrandoCampos = false;

    // O tabuleiro ocupa a tela toda; os painéis (CenaPainelTabuleiro) ficam por cima.
    this.cameras.main.setBackgroundColor(COR_FUNDO);
    this.centralizar();

    this.desenharBrilhoDoCentro();
    this.desenharGrade();
    this.desenharNoTabuleiro(baralho.getTileInicial());
    // Camadas: peças (0) < destaques < prévia < contorno da última peça < opções de marcador < marcadores < textos.
    this.destaques = this.add.graphics().setDepth(1);
    this.cruzes = this.add.graphics().setDepth(1);
    this.fantasma = this.add.container(0, 0).setAlpha(0.6).setDepth(2);
    this.escolha = this.add.container(0, 0).setDepth(2);
    // Acima das peças e dos destaques, abaixo da prévia e dos marcadores.
    this.camadaDosCampos = this.add.graphics().setDepth(1.5);
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

  // Com uma casa escolhida (ou o mouse sobre uma casa onde a peça cabe), passa para a próxima
  // rotação que encaixa ali; fora delas, gira normalmente.
  girar(): void {
    const atual = this.partida.getPecaAtual();
    if (!atual || !this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    const posicao = this.escolhida ?? this.posicaoSobMouse;
    const rotacoes = posicao && this.encaixes.get(posicao.chave());
    if (rotacoes) {
      atual.definirRotacao(proximaRotacao(rotacoes, atual.getRotacao() + 1));
    } else {
      atual.rotacionar();
    }
    if (this.escolhida) this.desenharEscolha();
    else this.desenharFantasmaDaPeca();
    this.emitirEstado();
  }

  // Liga ou desliga a pintura dos campos com a cor de quem domina cada um.
  alternarCampos(): void {
    this.mostrandoCampos = !this.mostrandoCampos;
    this.desenharCampos();
    this.emitirEstado();
  }

  // Desfaz a escolha da casa: a peça sai do tabuleiro e o jogador escolhe de novo.
  voltar(): void {
    if (!this.escolhida || !this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    this.escolhida = null;
    this.escolha.removeAll(true);
    this.emitirEstado();
  }

  // Coloca a peça na casa escolhida, na rotação atual, e passa para a etapa do marcador.
  confirmar(): void {
    const posicao = this.escolhida;
    const atual = this.partida.getPecaAtual();
    if (!posicao || !atual || !this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    this.escolhida = null;
    this.escolha.removeAll(true);
    this.encaixes = new Map();
    this.colocarPeca(new Jogada(posicao, atual.getRotacao()));

    const regioes = this.partida.regioesParaMarcador();
    if (regioes.length === 0) {
      // Nenhuma região aceita marcador: o turno termina sem perguntar.
      this.terminarTurno(this.partida.pularMarcador());
      return;
    }
    const posicaoDaPeca = atual.getPosicao()!;
    const ancoras = ancorasDasRegioes(atual.getRegioes());
    this.opcoes = atual
      .getRegioes()
      .filter((r) => regioes.includes(r.id))
      .map((r) => {
        const [u, v] = ancoras.get(r.id)!;
        return {
          regiaoId: r.id,
          x: (posicaoDaPeca.x + u) * TAMANHO_PECA,
          y: (posicaoDaPeca.y + v) * TAMANHO_PECA,
          marciano: r.tipo === Terrain.SOIL,
        };
      });
    this.atualizar();
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
      rotacoesNaPosicao: (() => {
        const posicao = this.escolhida ?? this.posicaoSobMouse;
        return (posicao && this.encaixes.get(posicao.chave())?.length) || 0;
      })(),
      pecaEscolhida: this.escolhida !== null,
      regioesParaMarcador: this.opcoes.length,
      usarChefe: this.usarChefe,
      mostrandoCampos: this.mostrandoCampos,
      eventos: this.eventos,
      classificacao: encerrada ? this.partida.classificacao() : null,
    };
    this.events.emit('estado', estado);
  }

  private painel(): CenaPainelTabuleiro {
    return this.scene.get(CENAS.painelTabuleiro) as CenaPainelTabuleiro;
  }

  // Clique, roda e teclas não chegam ao tabuleiro quando caem num painel ou com uma janela aberta.
  private bloqueado(p?: Phaser.Input.Pointer): boolean {
    return this.painel().bloqueia(p?.x, p?.y);
  }

  private vezDeHumano(fase: FaseDaPartida): boolean {
    return this.partida.getFase() === fase && !this.partida.getJogadorDaVez().ehCpu();
  }

  private iniciarTurno(): void {
    this.usarChefe = false;
    this.escolhida = null;
    this.escolha.removeAll(true);
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
    this.desenharNoTabuleiro(tile);
    this.registrar(`${this.partida.getJogadorDaVez().nome} colocou ${nomeDaPeca(tile.getDefinicao().id)}.`);
    const p = jogada.position;
    this.ultima
      .clear()
      .lineStyle(4, this.partida.getJogadorDaVez().cor, 1)
      .strokeRect(p.x * TAMANHO_PECA, p.y * TAMANHO_PECA, TAMANHO_PECA, TAMANHO_PECA);
    this.fantasma.removeAll(true);
  }

  // Clique de um humano na etapa da peça: escolhe a casa (sem colocar ainda). Clicar de novo
  // na casa escolhida gira a peça; clicar em outra casa onde ela cabe muda a escolha.
  private colocarEm(posicao: Position): void {
    const atual = this.partida.getPecaAtual();
    if (!atual || !this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) return;
    if (this.escolhida?.equals(posicao)) {
      this.girar();
      return;
    }
    const rotacoes = this.encaixes.get(posicao.chave());
    if (!rotacoes) return;
    // Garante uma rotação que encaixa (o clique pode vir sem o mouse ter passado por ali).
    atual.definirRotacao(proximaRotacao(rotacoes, atual.getRotacao()));
    this.escolhida = posicao;
    this.fantasma.removeAll(true);
    this.desenharEscolha();
    this.emitirEstado();
  }

  // A peça escolhida, opaca, com o contorno na cor do jogador.
  private desenharEscolha(): void {
    this.escolha.removeAll(true);
    const atual = this.partida.getPecaAtual();
    const p = this.escolhida;
    if (!atual || !p) return;
    const [x, y] = [p.x * TAMANHO_PECA, p.y * TAMANHO_PECA];
    desenharPeca(this, this.escolha, atual, x, y, TAMANHO_PECA);
    const contorno = this.add.graphics().lineStyle(4, this.partida.getJogadorDaVez().cor, 1).strokeRect(x, y, TAMANHO_PECA, TAMANHO_PECA);
    this.escolha.add(contorno);
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

  // A opção mais próxima do clique, se ele caiu dentro de algum círculo.
  private opcaoEm(x: number, y: number): OpcaoDeMarcador | undefined {
    const distancia = (o: OpcaoDeMarcador) => Phaser.Math.Distance.Between(x, y, o.x, o.y);
    const perto = this.opcoes.filter((o) => distancia(o) <= RAIO_DA_OPCAO);
    return perto.sort((a, b) => distancia(a) - distancia(b))[0];
  }

  // Mostra o marcador colocado, pontua o que foi completado e passa para o próximo turno.
  private terminarTurno(resultado: ResultadoDoTurno): void {
    this.opcoes = [];
    this.fantasma.removeAll(true);
    if (resultado.marcador) {
      this.desenharMarcadorNoTabuleiro(resultado.marcador);
      const regiao = resultado.marcador.tile.getRegioes().find((r) => r.id === resultado.marcador!.regiaoId)!;
      const quem = resultado.marcador.tipo === TipoDeMarcador.CHEFE ? 'o chefe' : 'um colono';
      this.registrar(`${resultado.jogador.nome} pôs ${quem} ${numTerreno(regiao.tipo)}.`);
    }
    for (const concluida of resultado.concluidas) {
      this.registrar(descreverPontuacao(concluida));
      this.mostrarPontos(concluida);
      concluida.devolvidos.forEach((m) => this.recolherMarcador(m));
    }
    this.registrarDescartes(resultado.descartadas.length);
    if (resultado.contagemFinal.length > 0) {
      const total = resultado.contagemFinal.reduce((soma, c) => soma + c.pontos * c.donos.length, 0);
      resultado.contagemFinal.forEach((c) => this.registrar(`Contagem final · ${descreverPontuacao(c)}`));
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
    const [u, v] = ancorasDasRegioes(m.tile.getRegioes()).get(regiao.id)!;
    const p = m.tile.getPosicao()!;
    const g = this.add.graphics().setDepth(5);
    desenharMarcador(g, m.tipo, m.dono.cor, (p.x + u) * TAMANHO_PECA, (p.y + v) * TAMANHO_PECA, TAMANHO_PECA, regiao.tipo === Terrain.SOIL);
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
    // Tracejado: a peça cabe ali em alguma rotação. Contorno apagado: não cabe de jeito nenhum.
    if (atual && this.vezDeHumano(FaseDaPartida.COLOCAR_PECA)) {
      this.encaixes = this.calcularEncaixes(atual);
      for (const p of this.partida.getBoard().posicoesDisponiveis()) {
        const [x, y] = [p.x * TAMANHO_PECA, p.y * TAMANHO_PECA];
        if (this.encaixes.has(p.chave())) {
          this.destaques.fillStyle(0xffffff, 0.04).fillRect(x, y, TAMANHO_PECA, TAMANHO_PECA);
          tracejarRetangulo(this.destaques.lineStyle(1.5, COR_VALIDA, 0.85), x + 1, y + 1, TAMANHO_PECA - 2, TAMANHO_PECA - 2, 6);
        } else {
          this.destaques.lineStyle(1, COR_DISPONIVEL, 0.25).strokeRect(x + 4, y + 4, TAMANHO_PECA - 8, TAMANHO_PECA - 8);
        }
      }
    }
    this.desenharPosicoesSemEncaixe();
    this.desenharCampos();
    const cor = this.partida.estaEncerrada() ? 0xffffff : this.partida.getJogadorDaVez().cor;
    for (const o of this.opcoes) {
      this.camadaDeOpcoes.fillStyle(cor, 0.3).fillCircle(o.x, o.y, RAIO_DA_OPCAO - 4);
      this.camadaDeOpcoes.lineStyle(3, cor, 1).strokeCircle(o.x, o.y, RAIO_DA_OPCAO - 4);
    }
    this.emitirEstado();
  }

  // Cada campo pintado na cor de quem tem a maioria nele agora; no empate, listras com as cores
  // empatadas; sem marcador, um branco bem claro. A área vem da arte (areasDosCampos).
  private desenharCampos(): void {
    const g = this.camadaDosCampos.clear();
    if (!this.mostrandoCampos) return;
    const R = RESOLUCAO_DOS_CAMPOS;
    const celula = TAMANHO_PECA / R;
    for (const campo of this.partida.getBoard().getFeatures(Terrain.SOIL)) {
      const cores = campo.donos().map((j) => j.cor);
      for (const { tile, regiaoId } of campo.getPartes()) {
        const faixas = faixasDoSolo(this, tile.getDefinicao())?.get(regiaoId);
        if (!faixas) continue;
        const p = tile.getPosicao()!;
        const voltas = (ARTE_DAS_PECAS[tile.getDefinicao().id].giro + tile.getRotacao()) % 4;
        // Célula (coluna, linha) da arte -> célula na tela, girando como a imagem da peça.
        const girar = (c: number, l: number): [number, number] => {
          for (let i = 0; i < voltas; i++) [c, l] = [R - 1 - l, c];
          return [c, l];
        };
        const pintar = (c: number, l: number, largura: number, altura: number, cor: number, alfa: number) =>
          g.fillStyle(cor, alfa).fillRect(p.x * TAMANHO_PECA + c * celula, p.y * TAMANHO_PECA + l * celula, largura * celula, altura * celula);
        for (const { linha, inicio, fim } of faixas) {
          if (cores.length === 1) {
            // A faixa inteira de uma vez: girada, vira uma faixa vertical ou horizontal.
            const [c0, l0] = girar(inicio, linha);
            const [c1, l1] = girar(fim, linha);
            pintar(Math.min(c0, c1), Math.min(l0, l1), Math.abs(c1 - c0) + 1, Math.abs(l1 - l0) + 1, cores[0], 0.5);
            continue;
          }
          for (let coluna = inicio; coluna <= fim; coluna++) {
            const [c, l] = girar(coluna, linha);
            if (cores.length === 0) {
              pintar(c, l, 1, 1, 0xffffff, 0.14);
            } else {
              // Listras diagonais contínuas de uma peça para a outra.
              const faixa = Math.floor((p.x * R + c + p.y * R + l) / 5);
              pintar(c, l, 1, 1, cores[faixa % cores.length], 0.55);
            }
          }
        }
      }
    }
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
    this.eventos = [...this.eventos, texto];
  }

  private desenharNoTabuleiro(tile: Tile): void {
    const p = tile.getPosicao()!;
    criarPeca(this, tile, p.x * TAMANHO_PECA, p.y * TAMANHO_PECA, TAMANHO_PECA);
  }

  // Brilho quente no meio da tela, fixo (não acompanha a câmera).
  private desenharBrilhoDoCentro(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(-1);
    const [cx, cy] = [this.scale.width / 2, this.scale.height / 2];
    for (let r = 520; r > 0; r -= 26) g.fillStyle(0x6b2f18, 0.022).fillCircle(cx, cy, r);
  }

  // Pontos discretos marcando a grade, numa área grande em volta do centro.
  private desenharGrade(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.06);
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
    const naAreaDoTabuleiro = (p: Phaser.Input.Pointer) => !this.bloqueado(p);

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
          this.fantasma.removeAll(true);
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

    this.input.on('wheel', (p: Phaser.Input.Pointer, _objetos: unknown, _dx: number, dy: number) => {
      if (!naAreaDoTabuleiro(p)) return;
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * (dy > 0 ? 0.9 : 1.1), 0.35, 2));
    });

    // Esc fica com o painel: abre e fecha o menu de opções.
    const tecla = (nome: string, acao: () => void) => this.input.keyboard?.on(`keydown-${nome}`, () => this.bloqueado() || acao());
    tecla('R', () => this.girar());
    tecla('E', () => this.alternarChefe());
    tecla('SPACE', () => this.pularMarcador());
    tecla('ENTER', () => this.confirmar());
    tecla('BACKSPACE', () => this.voltar());
    tecla('C', () => this.centralizar());
    tecla('V', () => this.alternarCampos());
  }

  // Prévia sob o ponteiro, só na vez de um humano: a peça onde ela encaixa,
  // ou o marcador sobre a região escolhida.
  private mostrarFantasma(ponteiro: Phaser.Input.Pointer | null): void {
    this.fantasma.removeAll(true);
    const atual = this.partida.getPecaAtual();
    const posicao = ponteiro ? this.posicaoSobPonteiro(ponteiro) : null;
    const mudouDePosicao = posicao === null ? this.posicaoSobMouse !== null : !this.posicaoSobMouse?.equals(posicao);
    this.posicaoSobMouse = posicao;
    if (!ponteiro || !atual) {
      if (mudouDePosicao) this.emitirEstado();
      return;
    }

    // Com a casa já escolhida, o mouse não mostra prévia: a peça está sobre a casa esperando a confirmação.
    if (this.escolhida) {
      if (mudouDePosicao) this.emitirEstado();
      return;
    }
    if (this.vezDeHumano(FaseDaPartida.COLOCAR_MARCADOR)) {
      const mundo = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
      const opcao = this.opcaoEm(mundo.x, mundo.y);
      if (!opcao) return;
      const cor = this.partida.getJogadorDaVez().cor;
      const g = this.add.graphics();
      desenharMarcador(g, this.tipoEscolhido(), cor, opcao.x, opcao.y, TAMANHO_PECA, opcao.marciano);
      this.fantasma.add(g);
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
    this.fantasma.removeAll(true);
    const atual = this.partida.getPecaAtual();
    const posicao = this.posicaoSobMouse;
    if (!atual || !posicao || !this.encaixes.get(posicao.chave())?.includes(atual.getRotacao())) return;
    desenharPeca(this, this.fantasma, atual, posicao.x * TAMANHO_PECA, posicao.y * TAMANHO_PECA, TAMANHO_PECA);
  }
}
