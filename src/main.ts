// Ponto de entrada carregado pelo Vite: inicia o Phaser no menu principal.
import Phaser from 'phaser';
import { CenaCatalogo } from './telas/CenaCatalogo';
import { CenaCreditos } from './telas/CenaCreditos';
import { CenaMenu } from './telas/CenaMenu';
import { CenaPainelTabuleiro } from './telas/CenaPainelTabuleiro';
import { CenaPreparacao } from './telas/CenaPreparacao';
import { CenaRegras } from './telas/CenaRegras';
import { CenaSlides } from './telas/CenaSlides';
import { CenaTabuleiro } from './telas/CenaTabuleiro';

// O Phaser desenha o texto no momento em que ele é criado: a fonte dos títulos precisa
// estar pronta antes. Sem internet, desiste depois de um tempo e usa a fonte do sistema.
const ESPERA_MAXIMA_DA_FONTE_MS = 2000;
const fonteCarregada = Promise.race([
  document.fonts.load('700 20px "Josefin Sans"'),
  new Promise((resolver) => setTimeout(resolver, ESPERA_MAXIMA_DA_FONTE_MS)),
]).catch(() => undefined);

void fonteCarregada.then(() => {
  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'jogo',
    width: 1280,
    height: 720,
    backgroundColor: '#14161c',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Camada de HTML por cima do canvas, para os campos de nome da CenaPreparacao.
    dom: { createContainer: true },
    // A primeira cena da lista é a que abre.
    scene: [CenaMenu, CenaPreparacao, CenaTabuleiro, CenaPainelTabuleiro, CenaCatalogo, CenaRegras, CenaCreditos, CenaSlides],
  });
  // Só em `npm run dev`: deixa o jogo acessível no console do navegador, para testar a interface.
  if (import.meta.env.DEV) Object.assign(window, { jogo });
});
