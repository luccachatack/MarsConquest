import Phaser from 'phaser';
import { CATALOGO_DE_TILES } from '../jogo/catalogoDeTiles';
import type { DefinicaoTile } from '../jogo/DefinicaoTile';
import { TipoDeJogador } from '../jogo/Jogador';
import { Tile } from '../jogo/Tile';
import { desenharTile } from './desenharTile';

// Elementos visuais compartilhados pelas telas.

export const CENAS = {
  menu: 'menu',
  pecas: 'pecas',
  regras: 'regras',
  creditos: 'creditos',
  preparacao: 'preparacao',
  tabuleiro: 'tabuleiro',
  painelTabuleiro: 'painel-tabuleiro',
} as const;

// Uma cor por vaga de jogador, distantes das cores das peças.
export const CORES_DOS_JOGADORES = [0x4aa8ff, 0xff6f91, 0xc6e05a, 0xb58cff, 0xffd166] as const;

export function corCss(cor: number): string {
  return `#${cor.toString(16).padStart(6, '0')}`;
}

export const FONTE = 'system-ui, "Segoe UI", sans-serif';
// Fonte dos títulos, carregada do Google Fonts no index.html; sem internet, cai na do sistema.
export const FONTE_TITULO = `"Josefin Sans", ${FONTE}`;

// Arte da capa: fundo do menu e, desfocada, da tela de jogadores.
export const CAPA_DO_MENU = 'capa-menu';
export const ARQUIVO_DA_CAPA = 'assets/capa-menu.png';
export const COR_TEXTO = '#e8e9ec';
export const COR_TEXTO_FRACO = '#9aa1ad';
export const COR_TITULO = '#ffb454';
export const COR_PAINEL = 0x1e2129;
export const COR_DESTAQUE = 0xffb454;

const COR_BOTAO = 0x343946;
const COR_BOTAO_SOBRE = 0x4a5162;

export function estilo(tamanho: number, cor = COR_TEXTO, negrito = false): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONTE, fontSize: `${tamanho}px`, color: cor, fontStyle: negrito ? 'bold' : 'normal', resolution: 2 };
}

export const NOMES_DOS_TIPOS: Record<TipoDeJogador, string> = {
  [TipoDeJogador.HUMANO]: 'Humano',
  [TipoDeJogador.CPU_FACIL]: 'CPU fácil',
  [TipoDeJogador.CPU_DIFICIL]: 'CPU difícil',
};

export function nomeDaPeca(idDefinicao: string): string {
  return idDefinicao
    .replace('juncao', 'junção')
    .replace('tres', 'três')
    .replace('cupula', 'cúpula')
    .replaceAll('-', ' ');
}

// Botão retangular com (x, y) no canto superior esquerdo. Devolve o rótulo para trocar o texto depois.
export function criarBotao(
  cena: Phaser.Scene,
  x: number,
  y: number,
  largura: number,
  altura: number,
  texto: string,
  acao: () => void,
  tamanhoFonte = 15,
): Phaser.GameObjects.Text {
  const fundo = cena.add.graphics();
  const pintar = (cor: number, borda: boolean) => {
    fundo.clear().fillStyle(cor, 1).fillRoundedRect(x, y, largura, altura, 8);
    if (borda) fundo.lineStyle(2, COR_DESTAQUE, 1).strokeRoundedRect(x, y, largura, altura, 8);
  };
  pintar(COR_BOTAO, false);

  const rotulo = cena.add.text(x + largura / 2, y + altura / 2, texto, estilo(tamanhoFonte, COR_TEXTO, true)).setOrigin(0.5);
  cena.add
    .zone(x, y, largura, altura)
    .setOrigin(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => pintar(COR_BOTAO_SOBRE, true))
    .on('pointerout', () => pintar(COR_BOTAO, false))
    .on('pointerdown', acao);
  return rotulo;
}

// Botão "Menu", título da tela e Esc para voltar ao menu.
export function criarCabecalho(cena: Phaser.Scene, titulo: string, subtitulo?: string): void {
  const voltar = () => cena.scene.start(CENAS.menu);
  criarBotao(cena, 40, 32, 100, 36, '← Menu', voltar, 14);
  cena.add.text(160, 26, titulo, estilo(30, COR_TEXTO, true));
  if (subtitulo) {
    cena.add.text(162, 66, subtitulo, estilo(15, COR_TEXTO_FRACO));
  }
  cena.input.keyboard?.on('keydown-ESC', voltar);
}

export function definicaoPorId(id: string) {
  const entrada = CATALOGO_DE_TILES.find((e) => e.definicao.id === id);
  if (!entrada) {
    throw new Error(`Peça ${id} não está no catálogo.`);
  }
  return entrada.definicao;
}

// Desenha uma peça, já girada, só para ilustrar. Aceita o id de uma peça do catálogo ou uma definição avulsa.
export function desenharPecaIlustrativa(
  cena: Phaser.Scene,
  peca: string | DefinicaoTile,
  rotacao: number,
  x: number,
  y: number,
  tamanho: number,
) {
  const definicao = typeof peca === 'string' ? definicaoPorId(peca) : peca;
  const tile = new Tile(`ilustracao-${definicao.id}`, definicao);
  tile.definirRotacao(rotacao);
  const g = cena.add.graphics();
  desenharTile(g, tile, x, y, tamanho);
  return g;
}

// Uma fileira de peças que se encaixam: dutos ligando duas junções à estufa.
export function desenharFaixaDeColonia(cena: Phaser.Scene, x: number, y: number, tamanho: number): void {
  const pecas: [string, number][] = [
    ['juncao-tres', 0],
    ['duto-reto', 0],
    ['estufa-dutos', 1],
    ['duto-reto', 0],
    ['juncao-tres', 0],
  ];
  pecas.forEach(([id, rotacao], i) => desenharPecaIlustrativa(cena, id, rotacao, x + i * tamanho, y, tamanho));
}
