import Phaser from 'phaser';
import { CATALOGO_DE_TILES } from '../jogo/catalogoDeTiles';
import type { DefinicaoTile } from '../jogo/DefinicaoTile';
import { TipoDeJogador } from '../jogo/Jogador';
import { Tile } from '../jogo/Tile';
import { criarPeca } from './desenharPeca';

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

export function estilo(tamanho: number, cor = COR_TEXTO, negrito = false, fonte = FONTE): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: fonte, fontSize: `${tamanho}px`, color: cor, fontStyle: negrito ? 'bold' : 'normal', resolution: 2 };
}

// Tons de Marte das telas no estilo da capa (Nova partida, Peças, Regras, Créditos).
export const CREME = '#f6ead8';
export const CREME_FRACO = '#d9c7b4';
export const LARANJA = '#e8834f';
export const COR_LARANJA = 0xd9643a;
export const COR_ESCURA = 0x2a1a14;

// A capa do menu, desfocada e escurecida, atrás de tudo. A cena precisa ter carregado CAPA_DO_MENU.
export function desenharFundoDaCapa(cena: Phaser.Scene): void {
  const { width, height } = cena.scale;
  const capa = cena.add.image(width / 2, height / 2, CAPA_DO_MENU);
  capa.setScale(Math.max(width / capa.width, height / capa.height) * 1.04);
  capa.enableFilters();
  capa.filters?.internal.addBlur(1, 1.5, 1.5, 1);
  cena.add.rectangle(0, 0, width, height, 0x120a07, 0.42).setOrigin(0);
}

// Fundo marrom escuro com uma grade discreta de pontos.
export function desenharFundoPontilhado(cena: Phaser.Scene): void {
  const { width, height } = cena.scale;
  const g = cena.add.graphics().fillStyle(0x1b100c, 1).fillRect(0, 0, width, height);
  g.fillStyle(0xffffff, 0.035);
  for (let y = 14; y < height; y += 28) {
    for (let x = 14; x < width; x += 28) g.fillCircle(x, y, 1);
  }
}

// Arco laranja com a "lua" na ponta, como no logotipo da capa.
export function desenharArco(cena: Phaser.Scene, inicio: [number, number], controle: [number, number], fim: [number, number], lua = 4): void {
  const arco = cena.add.graphics();
  new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(...inicio), new Phaser.Math.Vector2(...controle), new Phaser.Math.Vector2(...fim))
    .draw(arco.lineStyle(2.5, COR_LARANJA, 1), 40);
  arco.fillStyle(COR_LARANJA, 1).fillCircle(fim[0], fim[1], lua);
}

// Botão "‹ Menu", "MARS CONQUEST" e o título da tela com o arco embaixo, alinhados à esquerda. Esc volta ao menu.
export function criarTituloDaTela(cena: Phaser.Scene, titulo: string): void {
  criarBotaoMenu(cena);
  cena.add.text(160, 28, 'MARS CONQUEST', estilo(13, LARANJA, true, FONTE_TITULO)).setLetterSpacing(6).setOrigin(0, 0.5);
  const texto = cena.add
    .text(158, 56, titulo, estilo(40, CREME, true, FONTE_TITULO))
    .setOrigin(0, 0.5)
    .setShadow(0, 3, '#000000', 8, false, true);
  // Arco mais curto que títulos longos e mais comprido que os curtos.
  const fim = 162 + Math.max(texto.width * 0.7, 190);
  desenharArco(cena, [162, 84], [(162 + fim) / 2, 74], [fim, 88]);
  cena.input.keyboard?.on('keydown-ESC', () => cena.scene.start(CENAS.menu));
}

// Avatar de jogador: círculo na cor dele com um capacete de astronauta.
export function desenharAvatar(g: Phaser.GameObjects.Graphics, x: number, y: number, cor: number, alfa = 1, escala = 1): void {
  g.fillStyle(cor, alfa).fillCircle(x, y, 18 * escala);
  g.lineStyle(2.6 * escala, COR_ESCURA, alfa).strokeCircle(x, y - 2 * escala, 8.5 * escala);
  g.fillStyle(COR_ESCURA, alfa).fillRoundedRect(x - 5 * escala, y - 4.5 * escala, 10 * escala, 5 * escala, 2 * escala);
  g.fillRoundedRect(x - 8 * escala, y + 9 * escala, 16 * escala, 5 * escala, 2 * escala);
}

// Botão "‹ Menu" das telas no estilo da capa.
export function criarBotaoMenu(cena: Phaser.Scene): void {
  const g = cena.add.graphics();
  const pintar = (sobre: boolean) => {
    g.clear().fillStyle(0x2a1a14, sobre ? 0.95 : 0.8).fillRoundedRect(38, 31, 97, 42, 10);
    g.lineStyle(1.2, 0xc98a63, sobre ? 0.9 : 0.45).strokeRoundedRect(38, 31, 97, 42, 10);
    g.lineStyle(2, 0xf6ead8, 1).lineBetween(62, 47, 57, 52).lineBetween(57, 52, 62, 57);
  };
  pintar(false);
  cena.add.text(78, 52, 'Menu', estilo(15, '#f6ead8', true)).setOrigin(0, 0.5);
  cena.add
    .zone(38, 31, 97, 42)
    .setOrigin(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => pintar(true))
    .on('pointerout', () => pintar(false))
    .on('pointerdown', () => cena.scene.start(CENAS.menu));
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
  return criarPeca(cena, tile, x, y, tamanho);
}

// Uma fileira de peças que se encaixam: dutos ligando uma junção à estufa.
export function desenharFaixaDeColonia(cena: Phaser.Scene, x: number, y: number, tamanho: number): void {
  const pecas: [string, number][] = [
    ['juncao-tres', 0],
    ['duto-reto', 0],
    ['duto-reto', 0],
    ['duto-reto', 0],
    ['estufa-duto', 1],
  ];
  pecas.forEach(([id, rotacao], i) => desenharPecaIlustrativa(cena, id, rotacao, x + i * tamanho, y, tamanho));
}
