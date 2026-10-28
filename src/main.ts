// Ponto de entrada carregado pelo Vite: inicia o Phaser no menu principal.
import Phaser from 'phaser';
import { CenaCatalogo } from './telas/CenaCatalogo';
import { CenaCreditos } from './telas/CenaCreditos';
import { CenaMenu } from './telas/CenaMenu';
import { CenaPainelTabuleiro } from './telas/CenaPainelTabuleiro';
import { CenaPreparacao } from './telas/CenaPreparacao';
import { CenaRegras } from './telas/CenaRegras';
import { CenaTabuleiro } from './telas/CenaTabuleiro';

new Phaser.Game({
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
  scene: [CenaMenu, CenaPreparacao, CenaTabuleiro, CenaPainelTabuleiro, CenaCatalogo, CenaRegras, CenaCreditos],
});
