import { defineConfig } from 'vitest/config';

// Testes das regras ficam em testes/ e rodam em Node, sem Phaser nem navegador.
export default defineConfig({
  test: {
    include: ['testes/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
