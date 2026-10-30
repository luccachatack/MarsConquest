# Mars Conquest — Projeto acadêmico

Trabalho da disciplina de Projeto de Software: um jogo digital local de colocar peças, em que os jogadores constroem uma base em Marte com habitats, dutos, estufas e solo. O desenvolvimento será feito aos poucos, usando **TypeScript** para as classes e regras e **Phaser** para a interface.

## Estado atual

**Fases 1 (peças), 2 (tabuleiro) e 3 (jogadores, turnos, marcadores e placar) implementadas e testadas. Já dá para jogar uma partida completa de 2 a 5 jogadores, humanos ou computador, com colonos e pontos.**

Em `src/jogo/` já existem os tipos básicos (`Direction`, `Terrain`, `Position`), o modelo de 12 pontos de borda (`PontosDeBorda`), as peças (`Regiao`, `DefinicaoTile`, `Tile`), a `Jogada`, o catálogo de peças (24 tipos, 72 peças) e a criação do baralho (`TileFactory`, `TileDeck`). Da fase 2, o tabuleiro (`Board`): valida as jogadas, lista as posições válidas e monta as construções (`Feature`: habitats, dutos e campos de solo), juntando as que uma peça liga (`UnionFind`) e detectando quando ficam completas. Da fase 3, a partida (`Partida`): jogadores (`Jogador`) em turnos de duas etapas, colocar a peça e depois um marcador (`Marcador`: colonos e chefe), controladas pelo padrão State (`EstadoDaPartida`). A partida também faz o descarte de peças sem encaixe, a pontuação por maioria de marcadores (`Pontuacao`) e a classificação final com desempate. Em `src/ia/`, as estratégias do computador: fácil (sorteia) e difícil (avalia cada jogada e marcador com `Board.preverConstrucoes`). Nada disso depende do Phaser. Os testes estão em `testes/`.

A interface tem um **menu** (`CenaMenu`) com a arte da capa em tela cheia (`public/assets/capa-menu.png`); os botões Jogar, Peças, Regras e Créditos pintados na arte são clicáveis e crescem ao passar o mouse. **Jogar** abre a escolha de jogadores (`CenaPreparacao`) e depois a partida (`CenaTabuleiro`, com o painel `CenaPainelTabuleiro`, que mostra o placar, a vez e os acontecimentos). A tela **Peças** (`CenaCatalogo`) mostra os 24 tipos do catálogo com a letra do quadro na folha de arte e a quantidade de cada um, e gira uma peça com um clique. **Regras** (`CenaRegras`) resume como jogar e a pontuação; **Créditos** (`CenaCreditos`) mostra a equipe. Peças, Regras, Créditos e a escolha de jogadores seguem o estilo da capa; o que elas têm em comum (tons de Marte, fundos, título com o arco, botão Menu, avatar) fica em `src/telas/ui.ts`. Todas as peças usam a arte de `public/assets/pecas_spritesheet.png` (uma folha de 24 quadros de 256 × 256); `src/telas/desenharPeca.ts` diz qual quadro e qual giro cada peça usa. Se a folha não carregar, as peças são desenhadas por código em `src/telas/desenharTile.ts`, a partir dos dados de `Tile.getRegioes()`. Os elementos comuns às telas (botões, textos, cabeçalho) ficam em `src/telas/ui.ts`.

Próximos passos: equilíbrio da pontuação, IA e acabamento.

O jogo está publicado em [marsconquest.vercel.app](https://marsconquest.vercel.app/); cada push na `main` atualiza o site.

O repositório do projeto é [luccachatack/MarsConquest](https://github.com/luccachatack/MarsConquest), com branch principal `main` e remoto local `origin`.

Este README será atualizado junto com o desenvolvimento para refletir o que realmente está implementado.

## Escopo previsto

- Partida local entre 2 a 5 jogadores humanos.
- Partida de 1 humano contra 1 computador, com IA fácil e difícil.
- Construção do tabuleiro, colocação de marcadores e pontuação.
- Marcador grande incluído.
- Desempate pela quantidade de marcadores disponíveis antes da contagem final.

Já implementado: tudo o que está acima. O marcador grande é o **chefe**, que vale por dois na disputa. As regras de pontuação (habitat, duto, estufa e campo) estão na tela **Regras** do jogo e em `src/jogo/Pontuacao.ts`. No campo, o colono aparece como marciano e só pontua no fim, 2 por habitat fechado que encosta nele.

## O que tem em cada pasta e arquivo

Na lista de arquivos do GitHub, a coluna do meio mostra a mensagem do **último commit** que mexeu em cada item, não uma descrição. A descrição de cada um está aqui:

| Item | O que é |
| --- | --- |
| `public/assets/` | Imagens do jogo servidas direto ao navegador: a arte da capa do menu (`capa-menu.png`) e a folha com a arte das peças (`pecas_spritesheet.png`). |
| `slides/` | Imagens da apresentação da aula (diagramas etc.), mostradas pelo botão **Slides** do menu, em ordem de nome. |
| `src/` | Código do jogo: as regras em `jogo/`, a inteligência do computador em `ia/` e as telas feitas com Phaser em `telas/`. |
| `testes/` | Testes automatizados das regras (Vitest), um arquivo por classe ou assunto, incluindo partidas simuladas inteiras. |
| `.gitignore` | Lista do que o Git deve ignorar, como `node_modules/`, o build em `dist/`, a pasta local `.tools/` e a pasta `docs/`, onde cada um guarda a documentação e as apresentações só no próprio computador. |
| `README.md` | Este arquivo: estado do projeto, como instalar, rodar e jogar. |
| `index.html` | Página mínima que o Vite abre no navegador e que carrega o jogo (`src/main.ts`). |
| `package-lock.json` | Versões exatas de todas as dependências instaladas, para que todos do grupo tenham o mesmo ambiente. |
| `package.json` | Nome do projeto, dependências (Phaser, TypeScript, Vite, Vitest) e os comandos `npm run`. |
| `tsconfig.json` | Configuração do TypeScript, que confere os tipos de `src/` e `testes/`. |
| `vitest.config.ts` | Configuração dos testes: onde eles ficam e que rodam em Node, sem navegador. |

Dentro de `src/`:

| Item | O que é |
| --- | --- |
| `src/main.ts` | Ponto de entrada: cria o jogo Phaser e registra as telas. |
| `src/jogo/` | Regras, sem depender do Phaser: peças e catálogo (`Tile`, `DefinicaoTile`, `catalogoDeTiles`), baralho (`TileDeck`, `TileFactory`), tabuleiro e construções (`Board`, `Feature`, `UnionFind`), jogadores e marcadores (`Jogador`, `Marcador`), partida e turnos (`Partida`, `EstadoDaPartida`) e pontuação (`Pontuacao`). |
| `src/ia/` | Estratégias do computador: fácil (sorteia) e difícil (avalia cada jogada e marcador). |
| `src/telas/` | Telas em Phaser: menu, escolha de jogadores, tabuleiro com painel, peças, regras e créditos, além do desenho das peças e dos marcadores. |

As regras ficam separadas da interface: nada em `src/jogo/` ou `src/ia/` usa o Phaser, por isso os testes rodam sem navegador.

## Ferramentas

Para baixar e trabalhar nos arquivos:

- [Git](https://git-scm.com/downloads).
- Um editor, como [Visual Studio Code](https://code.visualstudio.com/).
- Acesso ao repositório no GitHub, caso ele seja privado.

Para instalar dependências e executar o ambiente, use [Node.js](https://nodejs.org/en/download) **24.21.0** e **npm 11.19.0**, versões adotadas nesta configuração. O `package.json` aceita Node 24 a partir de 24.21.0 e npm 11 a partir de 11.19.0.

Nesta máquina foi preparada uma cópia portátil em `.tools/node-v24.21.0-win-x64`, porque Node e npm não estavam disponíveis no terminal. A pasta `.tools` é local, ignorada pelo Git e não acompanha o clone. Quem clonar deve instalar Node.js com npm normalmente.

## Baixar pela primeira vez: clone

Abra um terminal na pasta onde deseja guardar o projeto e execute:

```powershell
git clone https://github.com/luccachatack/MarsConquest.git MarsConquest
cd MarsConquest
code .
```

Se `code .` não estiver disponível, abra o VS Code e use **Arquivo → Abrir Pasta**.

O clone cria a pasta com o histórico Git e a conexão com o repositório remoto. Não execute esse comando dentro de outra cópia do projeto.

## Atualizar a cópia local: pull

Se você já clonou o repositório, abra um terminal dentro da pasta do projeto e confira:

```powershell
git status
git branch --show-current
```

Na branch que deseja atualizar, com acompanhamento da branch remota configurado e sem alterações locais pendentes, execute:

```powershell
git pull --ff-only
```

Isso traz as atualizações da branch remota acompanhada pela branch atual, sem criar um commit de merge automaticamente. [Referência do Git](https://git-scm.com/docs/git-pull).

Se houver arquivos alterados, salve seu trabalho em um commit na sua branch ou combine com o grupo como preservá-lo antes de atualizar. Se o Git informar divergência, conflito ou falta de branch remota associada, resolva essa situação com o grupo; não apague alterações para forçar o pull.

**Clone é para a primeira cópia; pull é para atualizar uma cópia já clonada.** Extrair um ZIP não cria automaticamente a pasta `.git` nem configura o remoto. Se começou pelo ZIP, a ligação com o GitHub deverá ser configurada em uma etapa própria antes de usar pull nessa pasta.

## Começar a mexer no código

1. Abra a pasta do projeto no editor.
2. Confira o estado atual e atualize sua cópia conforme a seção anterior.
3. Combine com o grupo a parte que será desenvolvida.
4. Em uma cópia com repositório Git inicializado, para trabalhar em uma branch separada, crie uma com um nome relacionado à tarefa, por exemplo:

```powershell
git switch -c tarefa/estrutura-inicial
```

A estrutura inicial e o ambiente de desenvolvimento já estão configurados. A implementação das regras, telas e IA ficará para pedidos posteriores. Atualize este README sempre que uma alteração afetar requisitos, comandos, controles, funcionalidades ou o modo de executar.

## Configurar o ambiente de desenvolvimento

Abra um terminal na raiz do projeto. No PowerShell desta máquina, para usar a cópia portátil já preparada, execute uma vez por terminal:

```powershell
$env:Path = (Join-Path $PWD '.tools/node-v24.21.0-win-x64') + ';' + $env:Path
```

Se Node.js já estiver instalado e disponível no terminal, esse ajuste não é necessário. Confira:

```powershell
node --version
npm --version
```

O gerenciador adotado é npm e o lockfile é `package-lock.json`. Depois de clonar ou atualizar o projeto, instale as versões registradas no lockfile:

```powershell
npm ci
```

Esse comando recria `node_modules` a partir do lockfile e exige que ele esteja de acordo com `package.json`. Ao alterar dependências de propósito, use `npm install` e versione os dois arquivos juntos.

Versões instaladas: **Phaser 4.2.1**, **TypeScript 7.0.2**, **Vite 8.3.2** e **Vitest 5.0.4**. Phaser é uma dependência do jogo; TypeScript, Vite e Vitest são dependências de desenvolvimento. As versões diretas estão fixadas no `package.json`, e as dependências transitivas estão registradas no lockfile.

No PowerShell, se a política de execução bloquear `npm.ps1`, use `npm.cmd` no lugar de `npm` nos comandos abaixo, sem alterar a política do Windows.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor local do Vite. |
| `npm run typecheck` | Confere os tipos com TypeScript, sem gerar arquivos. |
| `npm run build` | Confere os tipos e gera o build em `dist/`. |
| `npm run preview` | Serve localmente o build existente em `dist/`. Execute o build antes. |
| `npm run test` | Executa uma vez todos os testes de `testes/**/*.test.ts`. |
| `npm run test:watch` | Executa os testes e repete a cada alteração salva. Encerre com `q` ou `Ctrl+C`. |

Use o endereço `Local` exibido pelo Vite no terminal. Encerre o servidor com `Ctrl+C`. O preview serve para conferir o build localmente; não publica o projeto.

Na conferência desta etapa, os servidores foram iniciados com host e portas explícitos:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Os endereços exibidos foram `http://127.0.0.1:5173/` para desenvolvimento e `http://127.0.0.1:4173/` para preview. Sem essas opções, consulte o endereço exibido no seu terminal.

Validação realizada no Windows com Node 24.21.0 e npm 11.19.0: instalação reproduzível com `npm ci --offline` usando o cache local, `npm run build` (incluindo `typecheck`) e respostas HTTP 200 do HTML e JavaScript tanto no desenvolvimento quanto no preview. Os servidores usados nessa conferência foram encerrados. Isso valida a configuração inicial, sem representar testes de jogabilidade.

**Testes automatizados:** feitos com Vitest. Os testes ficam em `testes/`, com nome terminado em `.test.ts`, rodam em Node (sem navegador nem Phaser) e importam `describe`, `it` e `expect` de `vitest`. São 17 arquivos e 153 testes: as regras de cada fase do desenvolvimento, a validação de todas as peças do catálogo e partidas simuladas com o catálogo inteiro, inclusive entre computadores. `npm run typecheck` também confere os tipos dos arquivos de `testes/`.

O `tsconfig.json` usa `skipLibCheck: true`: o TypeScript não confere os arquivos de tipos das bibliotecas em `node_modules` (os tipos do Vitest dependem de tipos do Node que o projeto não usa), mas continua conferindo todo o código de `src/` e `testes/`.

Validação realizada no Windows com Node 24.21.0 e npm 11.19.0 após adicionar o Vitest: `npm run test` sem testes (sucesso), com um teste temporário correto (sucesso) e com o mesmo teste alterado para falhar (falha detectada); `npm run typecheck` acusou um erro de tipo proposital em `testes/`; `npm run build` concluído. O teste temporário foi removido.

## Como jogar

Para abrir o jogo:

```powershell
npm run dev
```

Abra no navegador o endereço `Local` exibido pelo Vite (normalmente `http://localhost:5173/`), em vez de abrir `index.html` diretamente pelo explorador de arquivos.

O menu tem quatro opções: **Jogar**, **Peças**, **Regras** e **Créditos** (`Enter` também abre **Jogar**). Nas outras telas, o botão **‹ Menu** ou a tecla `Esc` volta ao menu; na partida, `Esc` abre o menu de opções.

No canto inferior esquerdo do menu, o botão **Slides** (ou a tecla `S`) abre a apresentação da aula. Ela mostra, uma por vez, as imagens da pasta `slides/` na raiz do projeto, em ordem de nome: numere os arquivos na ordem da apresentação (`01-classes.png`, `02-sequencia.svg`...). Valem PNG, JPG, WEBP e SVG; não é preciso listar os arquivos em lugar nenhum, e com `npm run dev` rodando um arquivo novo aparece ao recarregar a página. As imagens são mostradas como HTML por cima do jogo, então ficam nítidas em tela cheia. Prefira imagens em 16:9 (por exemplo 1920 × 1080) ou SVG.

| Ação nos slides | Controle |
| --- | --- |
| Próximo slide | `→`, `↓`, `Espaço`, `Page Down`, `Enter` ou clique (fora do terço esquerdo) |
| Slide anterior | `←`, `↑`, `Page Up`, `Backspace` ou clique no terço esquerdo |
| Primeiro / último | `Home` / `End` |
| Tela cheia | `F` ou botão **Tela cheia** (a barra aparece ao mexer o mouse) |
| Voltar ao menu | `Esc` ou botão **‹ Menu** |

Em **Jogar**, a tela **Nova partida** mostra a tripulação sobre a capa desfocada; escolha de 2 a 5 jogadores. Cada vaga tem um tipo (clique para trocar entre **Humano**, **CPU fácil**, **CPU difícil** e **Fora da partida**) e um nome. **Começar partida** (ou `Enter`) abre o tabuleiro. Os jogadores jogam na ordem da lista.

Na partida, o tabuleiro ocupa a tela toda e os painéis ficam por cima (`CenaPainelTabuleiro`). No topo, um cartão por jogador mostra pontos e reserva (os pontinhos são os colonos; o maior, o chefe), com o da vez destacado. No canto superior esquerdo ficam o botão de opções (≡: continuar, nova partida, trocar jogadores e voltar ao menu principal, sempre com confirmação antes de abandonar a partida) e o de centralizar a câmera; abaixo do ≡, o botão dos campos (ou a tecla `V`) pinta cada campo na cor de quem tem a maioria nele no momento, com listras no empate e um branco claro nos sem dono. A área de cada campo é lida da própria arte das peças (`src/telas/areasDosCampos.ts`). No canto superior direito fica quantas peças restam no baralho; as descartadas só aparecem, ao lado, depois do primeiro descarte. No canto inferior esquerdo ficam os últimos acontecimentos; um clique abre o registro com tudo o que aconteceu na partida. No canto inferior direito ficam de quem é a vez, a peça e os botões da etapa. Cada turno tem duas etapas:

1. **Peça:** as posições tracejadas são todas as que aceitam a peça em alguma rotação. Passando o mouse sobre uma delas, a peça gira sozinha para uma rotação que encaixa ali e aparece a prévia. Um clique põe a peça sobre a casa, ainda sem colocar: se ela encaixar ali de mais de um jeito, **Girar** (`R`, ou clique de novo na peça) passa só pelos jeitos que servem; **Voltar** (`Backspace`) desfaz a escolha, e clicar em outra casa tracejada muda a escolha. Enquanto a peça está escolhida, os lugares que ela deixaria sem peça que caiba aparecem com um X tracejado piscando, e o painel diz quantos X novos a jogada cria; ao girar ou trocar de casa, a prévia muda. **Confirmar** (`Enter`) coloca a peça.
2. **Marcador (opcional):** aparecem círculos nas regiões da peça que aceitam marcador, inclusive o solo. Clique num deles para pôr um colono (ou o chefe, se escolhido), ou pule. No solo, o marcador aparece como um marciano na cor do jogador (o chefe, com três olhos) e fica no campo até o fim da partida. Se nenhuma região aceita marcador, o turno termina sozinho.

Na vez do computador, ele joga sozinho. Peças que não cabem em lugar nenhum são descartadas automaticamente. Um **X vermelho** marca um lugar vazio onde nenhuma das peças que ainda restam (a da vez e as do baralho) encaixa: as construções que encostam nele nunca mais serão completadas. Quando o baralho acaba, as construções abertas com marcador pontuam (contagem final) e aparece a classificação. As regras de quem pontua estão na tela **Regras** do jogo.

| Ação | Controle |
| --- | --- |
| Escolher a casa da peça | Clique numa posição tracejada |
| Desfazer a escolha da casa | `Backspace` ou botão **Voltar** |
| Colocar a peça na casa escolhida | `Enter` ou botão **Confirmar** |
| Girar a peça (sobre a casa escolhida ou sob o mouse, só entre as rotações que encaixam) | `R`, botão direito, botão **Girar**, clique na peça escolhida ou na prévia do painel |
| Pôr um marcador | Clique num círculo da peça recém-colocada |
| Trocar entre colono e chefe | `E` ou botão **Chefe** |
| Não pôr marcador | `Espaço` ou botão **Pular** |
| Mover o tabuleiro | Arraste com o mouse |
| Zoom | Roda do mouse |
| Voltar ao centro | `C` ou botão de centralizar (ao lado do ≡) |
| Ver tudo o que aconteceu | Clique no painel **Acontecimentos** |
| Mostrar quem domina cada campo | `V` ou botão de camadas, abaixo do ≡ |
| Opções (nova partida, trocar jogadores, menu principal) | `Esc` ou botão ≡ |

Na tela **Peças**:

| Ação | Controle |
| --- | --- |
| Girar uma peça do catálogo | Clique nela |

## Integrantes

- Gustavo Henrique
- Lucca Chatack
- Paulo Rosa
- Pedro Sixel
- Vitor Lemos

Mars Conquest é um jogo acadêmico de colocação de peças. A mecânica e a distribuição das peças seguem o jogo de tabuleiro Carcassonne (Klaus-Jürgen Wrede, Hans im Glück), jogo de referência da disciplina. Tema, nome, arte e código são do grupo. Os integrantes acima são responsáveis por esta implementação acadêmica, sem fins comerciais.
