import Phaser from 'phaser';
import { MAX_JOGADORES, MIN_JOGADORES, TAMANHO_MAXIMO_DO_NOME, TipoDeJogador } from '../jogo/Jogador';
import {
  CENAS,
  CORES_DOS_JOGADORES,
  COR_PAINEL,
  COR_TEXTO,
  COR_TEXTO_FRACO,
  NOMES_DOS_TIPOS,
  corCss,
  criarBotao,
  criarCabecalho,
  estilo,
} from './ui';

// O que a CenaTabuleiro recebe para montar a partida.
export interface ConfiguracaoDeJogador {
  readonly nome: string;
  readonly tipo: TipoDeJogador;
  readonly cor: number;
}

export interface DadosDaPartida {
  readonly jogadores: readonly ConfiguracaoDeJogador[];
}

// Uma vaga da tela: tipo null = vaga fora da partida.
interface Vaga {
  tipo: TipoDeJogador | null;
  nome: string;
}

// Ordem do botão de tipo: cada clique passa para o próximo.
const CICLO_DE_TIPOS: (TipoDeJogador | null)[] = [
  TipoDeJogador.HUMANO,
  TipoDeJogador.CPU_FACIL,
  TipoDeJogador.CPU_DIFICIL,
  null,
];

const CHAVE_DO_REGISTRO = 'vagas-da-partida';
const NOME_PADRAO = /^(Jogador|CPU) \d$/;

function nomePadrao(tipo: TipoDeJogador | null, indice: number): string {
  return tipo === TipoDeJogador.HUMANO || tipo === null ? `Jogador ${indice + 1}` : `CPU ${indice + 1}`;
}

function vagasIniciais(): Vaga[] {
  return Array.from({ length: MAX_JOGADORES }, (_, i) => {
    const tipo = i === 0 ? TipoDeJogador.HUMANO : i === 1 ? TipoDeJogador.CPU_FACIL : null;
    return { tipo, nome: nomePadrao(tipo, i) };
  });
}

const LARGURA = 1280;
const X_LINHA = 250;
const LARGURA_LINHA = 780;
const Y_PRIMEIRA = 130;
const ALTURA_LINHA = 76;

// Antes da partida: até 5 vagas, cada uma humano, CPU (fácil ou difícil) ou fora, com nome.
export class CenaPreparacao extends Phaser.Scene {
  private vagas: Vaga[] = [];
  private campos: HTMLInputElement[] = [];
  private mensagem!: Phaser.GameObjects.Text;

  constructor() {
    super(CENAS.preparacao);
  }

  create(): void {
    // A tela lembra a última escolha (registry do Phaser vale para o jogo todo).
    const salvas = this.registry.get(CHAVE_DO_REGISTRO) as Vaga[] | undefined;
    this.vagas = salvas ? salvas.map((v) => ({ ...v })) : vagasIniciais();
    this.campos = [];

    criarCabecalho(this, 'Nova partida', `De ${MIN_JOGADORES} a ${MAX_JOGADORES} jogadores. Clique no tipo para trocar.`);
    this.vagas.forEach((_, i) => this.criarLinha(i));

    this.mensagem = this.add.text(LARGURA / 2, 540, '', estilo(15, '#ff8a80')).setOrigin(0.5);
    criarBotao(this, (LARGURA - 300) / 2, 570, 300, 56, 'Começar partida', () => this.comecar(), 20);
    this.add
      .text(
        LARGURA / 2,
        650,
        'Quem completa um habitat ou duto ganha os pontos dele. Os jogadores jogam na ordem da lista.',
        estilo(13, COR_TEXTO_FRACO),
      )
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.comecar());
  }

  private criarLinha(i: number): void {
    const y = Y_PRIMEIRA + i * ALTURA_LINHA;
    const cor = CORES_DOS_JOGADORES[i];
    const fundo = this.add.graphics();
    const marca = this.add.graphics();
    const rotuloVaga = this.add.text(X_LINHA + 62, y + 31, `Vaga ${i + 1}`, estilo(15, COR_TEXTO_FRACO)).setOrigin(0, 0.5);

    const campo = this.add
      .dom(X_LINHA + 400, y + 10, 'input', {
        width: '340px',
        height: '42px',
        boxSizing: 'border-box',
        padding: '0 12px',
        font: '18px system-ui, "Segoe UI", sans-serif',
        color: COR_TEXTO,
        background: '#14161c',
        border: '2px solid #4a5162',
        borderRadius: '8px',
        outline: 'none',
      })
      .setOrigin(0);
    const input = campo.node as HTMLInputElement;
    input.maxLength = TAMANHO_MAXIMO_DO_NOME;
    input.value = this.vagas[i].nome;
    input.placeholder = 'Nome';
    input.addEventListener('input', () => {
      this.vagas[i].nome = input.value;
      this.mensagem.setText('');
    });
    input.addEventListener('focus', () => (input.style.borderColor = corCss(cor)));
    input.addEventListener('blur', () => (input.style.borderColor = '#4a5162'));
    // Enter dentro do campo também começa a partida.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.comecar();
    });
    this.campos.push(input);

    const rotuloTipo = criarBotao(this, X_LINHA + 170, y + 10, 210, 42, '', () => {
      const vaga = this.vagas[i];
      const proximo = CICLO_DE_TIPOS[(CICLO_DE_TIPOS.indexOf(vaga.tipo) + 1) % CICLO_DE_TIPOS.length];
      // Troca o nome junto só se ainda for o nome padrão.
      if (NOME_PADRAO.test(vaga.nome.trim()) || vaga.nome.trim() === '') {
        vaga.nome = nomePadrao(proximo, i);
        input.value = vaga.nome;
      }
      vaga.tipo = proximo;
      this.mensagem.setText('');
      pintar();
    });

    const pintar = () => {
      const ativa = this.vagas[i].tipo !== null;
      fundo.clear().fillStyle(COR_PAINEL, ativa ? 1 : 0.45).fillRoundedRect(X_LINHA, y, LARGURA_LINHA, 62, 10);
      marca.clear().fillStyle(cor, ativa ? 1 : 0.25).fillCircle(X_LINHA + 34, y + 31, 13);
      rotuloTipo.setText(this.vagas[i].tipo ? NOMES_DOS_TIPOS[this.vagas[i].tipo!] : 'Fora da partida');
      rotuloTipo.setColor(ativa ? COR_TEXTO : COR_TEXTO_FRACO);
      rotuloVaga.setColor(ativa ? COR_TEXTO : COR_TEXTO_FRACO);
      input.disabled = !ativa;
      // A opacidade do campo vem do alpha do objeto: o Phaser reescreve style.opacity a cada quadro.
      campo.setAlpha(ativa ? 1 : 0.35);
    };
    pintar();
  }

  private comecar(): void {
    const ativas = this.vagas.map((v, i) => ({ ...v, nome: v.nome.trim(), cor: CORES_DOS_JOGADORES[i] })).filter((v) => v.tipo !== null);
    const erro = this.validar(ativas.map((v) => v.nome));
    if (erro) {
      this.mensagem.setText(erro);
      return;
    }
    this.registry.set(CHAVE_DO_REGISTRO, this.vagas.map((v) => ({ ...v, nome: v.nome.trim() })));
    const dados: DadosDaPartida = {
      jogadores: ativas.map((v) => ({ nome: v.nome, tipo: v.tipo!, cor: v.cor })),
    };
    this.scene.start(CENAS.tabuleiro, dados);
  }

  // Mesmas regras de Jogador e Partida, com mensagens para a tela.
  private validar(nomes: string[]): string | null {
    if (nomes.length < MIN_JOGADORES) {
      return `Escolha pelo menos ${MIN_JOGADORES} jogadores.`;
    }
    if (nomes.some((n) => n.length === 0)) {
      return 'Todo jogador precisa de um nome.';
    }
    const minusculos = nomes.map((n) => n.toLocaleLowerCase());
    if (new Set(minusculos).size !== nomes.length) {
      return 'Dois jogadores não podem ter o mesmo nome.';
    }
    return null;
  }
}

