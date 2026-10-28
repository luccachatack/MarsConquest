// Ponto de entrada carregado pelo Vite: inicia o Phaser no menu principal.
import Phaser from 'phaser';
import { CenaCatalogo } from './telas/CenaCatalogo';
import { CenaCreditos } from './telas/CenaCreditos';
import { CenaMenu } from './telas/CenaMenu';
import { CenaRegras } from './telas/CenaRegras';

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
  // A primeira cena da lista é a que abre.
  scene: [CenaMenu, CenaCatalogo, CenaRegras, CenaCreditos],
});
