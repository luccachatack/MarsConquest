// Textos da tela da partida que não dependem do Phaser, para poderem ser testados em Node.

export interface Contador {
  readonly numero: number;
  readonly rotulo: string;
}

// Contador do canto superior direito: "70 no baralho". O descarte só aparece, ao lado,
// depois que alguma peça foi descartada: "50 no baralho · 1 descartada".
export function contadoresDoBaralho(restantes: number, descartadas: number): Contador[] {
  const contadores: Contador[] = [{ numero: restantes, rotulo: 'no baralho' }];
  if (descartadas > 0) {
    contadores.push({ numero: descartadas, rotulo: descartadas === 1 ? 'descartada' : 'descartadas' });
  }
  return contadores;
}

// Os últimos acontecimentos para o painel pequeno, do mais antigo ao mais novo.
export function ultimosAcontecimentos(eventos: readonly string[], quantidade: number): string[] {
  return quantidade > 0 ? eventos.slice(-quantidade) : [];
}

// Situação no painel com a peça sobre a casa escolhida, antes de confirmar: de quantos jeitos
// ela encaixa ali e quantos lugares ficariam sem peça que caiba (X) se ela fosse colocada assim.
export function situacaoDaEscolha(jeitos: number, xNovos: number): string {
  const jeito = jeitos > 1 ? `Encaixa de ${jeitos} jeitos aqui.` : 'Só encaixa assim aqui.';
  const consequencia = xNovos === 0 ? 'Não cria X novo.' : `Cria ${xNovos} X novo${xNovos === 1 ? '' : 's'}.`;
  return `${jeito}\n${consequencia}`;
}
