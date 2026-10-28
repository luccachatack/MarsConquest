import Phaser from 'phaser';
import { CENAS, CREME, CREME_FRACO, FONTE, criarTituloDaTela, desenharFundoPontilhado, estilo } from './ui';

const LARGURA = 1280;
const ALTURA = 720;

// As imagens da pasta slides/ (na raiz do projeto) entram sozinhas, em ordem de nome:
// basta numerar os arquivos (01-classes.png, 02-sequencia.svg...). O Vite junta todas no build.
const ARQUIVOS = import.meta.glob<string>('../../slides/*.{png,jpg,jpeg,webp,svg}', { eager: true, import: 'default' });
const SLIDES = Object.keys(ARQUIVOS)
  .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  .map((caminho) => ARQUIVOS[caminho]);

const DICA = '← → ou clique para trocar · F tela cheia · Esc menu';
const TEMPO_DA_BARRA_MS = 2500;

function elemento<K extends keyof HTMLElementTagNameMap>(tag: K, css: Partial<CSSStyleDeclaration>, texto = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el.style, css);
  el.textContent = texto;
  return el;
}

// Apresentação na aula: um slide por vez, em tela cheia, a partir do menu.
// A imagem é HTML por cima do canvas para ficar nítida quando a tela cheia amplia o jogo.
export class CenaSlides extends Phaser.Scene {
  private atual = 0;
  private imagem!: HTMLImageElement;
  private contador!: HTMLDivElement;

  constructor() {
    super(CENAS.slides);
  }

  create(): void {
    this.atual = 0;
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(CENAS.menu));
    this.input.keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());

    if (SLIDES.length === 0) {
      this.mostrarPastaVazia();
      return;
    }

    this.criarApresentacao();
    const teclado = this.input.keyboard;
    for (const tecla of ['RIGHT', 'DOWN', 'SPACE', 'PAGE_DOWN', 'ENTER']) teclado?.on(`keydown-${tecla}`, () => this.irPara(this.atual + 1));
    for (const tecla of ['LEFT', 'UP', 'PAGE_UP', 'BACKSPACE']) teclado?.on(`keydown-${tecla}`, () => this.irPara(this.atual - 1));
    teclado?.on('keydown-HOME', () => this.irPara(0));
    teclado?.on('keydown-END', () => this.irPara(SLIDES.length - 1));
    this.irPara(0);
  }

  private mostrarPastaVazia(): void {
    desenharFundoPontilhado(this);
    criarTituloDaTela(this, 'Slides');
    this.add
      .text(
        LARGURA / 2,
        ALTURA / 2,
        'Nenhum slide ainda.\n\nColoque as imagens na pasta slides/, na raiz do projeto, numeradas na ordem da apresentação ' +
          '(01-classes.png, 02-sequencia.svg...). Valem PNG, JPG, WEBP e SVG.',
        { ...estilo(18, CREME_FRACO, true), align: 'center', lineSpacing: 6, wordWrap: { width: 720 } },
      )
      .setOrigin(0.5);
  }

  private criarApresentacao(): void {
    this.cameras.main.setBackgroundColor('#000000');

    const tela = elemento('div', { width: `${LARGURA}px`, height: `${ALTURA}px`, position: 'relative', background: '#000', overflow: 'hidden' });
    this.imagem = elemento('img', { width: '100%', height: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer', userSelect: 'none' });
    this.imagem.draggable = false;
    this.imagem.alt = 'Slide';
    // Clique no terço esquerdo volta; no resto, avança.
    this.imagem.addEventListener('click', (e) => this.irPara(this.atual + (e.offsetX < this.imagem.clientWidth / 3 ? -1 : 1)));

    this.contador = elemento('div', {
      position: 'absolute', right: '16px', bottom: '12px', font: `bold 14px ${FONTE}`, color: CREME,
      background: 'rgba(0, 0, 0, 0.45)', padding: '4px 10px', borderRadius: '12px', pointerEvents: 'none',
    });

    // Barra com Menu, tela cheia e as teclas: aparece quando o mouse mexe e some sozinha.
    const barra = elemento('div', {
      position: 'absolute', left: '16px', bottom: '12px', display: 'flex', gap: '10px', alignItems: 'center',
      font: `bold 14px ${FONTE}`, color: CREME_FRACO, transition: 'opacity 0.4s', opacity: '1',
    });
    const botao = (texto: string, acao: () => void) => {
      const b = elemento('button', {
        font: `bold 14px ${FONTE}`, color: CREME, background: 'rgba(42, 26, 20, 0.9)', border: '1px solid rgba(201, 138, 99, 0.6)',
        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
      }, texto);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        acao();
      });
      return b;
    };
    barra.append(
      botao('‹ Menu', () => this.scene.start(CENAS.menu)),
      botao('Tela cheia', () => this.scale.toggleFullscreen()),
      elemento('span', { background: 'rgba(0, 0, 0, 0.45)', padding: '6px 10px', borderRadius: '8px' }, DICA),
    );
    let esconder = window.setTimeout(() => (barra.style.opacity = '0'), TEMPO_DA_BARRA_MS);
    tela.addEventListener('mousemove', () => {
      barra.style.opacity = '1';
      window.clearTimeout(esconder);
      esconder = window.setTimeout(() => (barra.style.opacity = '0'), TEMPO_DA_BARRA_MS);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.clearTimeout(esconder));

    tela.append(this.imagem, this.contador, barra);
    this.add.dom(0, 0, tela).setOrigin(0);
  }

  private irPara(indice: number): void {
    this.atual = Phaser.Math.Clamp(indice, 0, SLIDES.length - 1);
    this.imagem.src = SLIDES[this.atual];
    this.contador.textContent = `${this.atual + 1} / ${SLIDES.length}`;
    // Já baixa o próximo, para a troca ser instantânea.
    if (this.atual + 1 < SLIDES.length) new Image().src = SLIDES[this.atual + 1];
  }
}
