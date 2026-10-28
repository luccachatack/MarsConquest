# Colônia Marte — Projeto acadêmico

Trabalho da disciplina de Projeto de Software: um jogo digital local e original de colocar peças, em que os jogadores constroem uma base em Marte com habitats, dutos, estufas e solo. O desenvolvimento será feito aos poucos, usando **TypeScript** para as classes e regras e **Phaser** para a interface.

## Estado atual

**Fase 1 — núcleo de peças: implementada e testada. Ainda não é possível jogar.**

Em `src/jogo/` já existem os tipos básicos (`Direction`, `Terrain`, `Position`), o modelo de 12 pontos de borda (`PontosDeBorda`), as peças (`Regiao`, `DefinicaoTile`, `Tile`), a `Jogada`, o catálogo de peças (22 tipos, 60 peças) e a criação do baralho (`TileFactory`, `TileDeck`). Nada disso depende do Phaser. Os testes estão em `testes/`.

A interface tem um **menu** (`CenaMenu`) com as opções Jogar (ainda sem partida), Peças, Regras e Créditos. A tela **Peças** (`CenaCatalogo`) mostra as 22 peças desenhadas a partir das regiões, gira uma peça com um clique e compra peças de um baralho embaralhado. **Regras** (`CenaRegras`) resume como jogar e a pontuação; **Créditos** (`CenaCreditos`) mostra a equipe. O desenho das peças (`src/telas/desenharTile.ts`) usa só os dados de `Tile.getRegioes()`, então também serve para conferir visualmente o catálogo e a rotação. Os elementos comuns às telas (botões, textos, cabeçalho) ficam em `src/telas/ui.ts`.

Ainda não há tabuleiro, construções, pontuação, IA ou partida.

A especificação da fase 1 está em [docs/fase-1-especificacao.md](docs/fase-1-especificacao.md). O roteiro completo está em [docs/plano-proximos-passos.pdf](docs/plano-proximos-passos.pdf); ele foi escrito antes da troca de tema e ainda usa os nomes antigos.

O repositório do projeto é [luccachatack/carcassonne](https://github.com/luccachatack/carcassonne), com branch principal `main` e remoto local `origin`.

Este README será atualizado junto com o desenvolvimento para refletir o que realmente está implementado.

## Escopo previsto

- Partida local entre 2 a 5 jogadores humanos.
- Partida de 1 humano contra 1 computador, com IA fácil e difícil.
- Construção do tabuleiro, colocação de marcadores e pontuação.
- Marcador grande incluído.
- Desempate pela quantidade de marcadores disponíveis antes da contagem final.

Essas funcionalidades estão planejadas, não implementadas nesta etapa. As regras de pontuação já decididas (habitat e duto) e as pendentes (estufa, marcadores e solo) estão em [docs/regras-de-pontuacao.md](docs/regras-de-pontuacao.md).

## Organização atual

```text
src/
  main.ts       # Ponto de entrada carregado pelo Vite
  jogo/         # Classes e regras (fase 1: peças, catálogo e baralho)
  ia/           # Futuras estratégias do computador
  telas/        # Interface com Phaser (menu, peças, regras, créditos e desenho das peças)
public/
  assets/       # Futuros recursos visuais e sonoros
testes/         # Testes das regras (*.test.ts), executados pelo Vitest
  aleatorio.ts  # Gerador com semente para testes repetíveis
docs/
  referencias/  # PDFs e diagrama do grupo
  plano-proximos-passos.pdf  # Análise e roteiro em fases
  fase-1-especificacao.md    # Especificação da fase 1 (peças)
index.html      # HTML mínimo que carrega src/main.ts
package.json    # Metadados, dependências e comandos do projeto
package-lock.json # Versões exatas das dependências resolvidas pelo npm
tsconfig.json   # Configuração do TypeScript (inclui src/ e testes/)
vitest.config.ts # Configuração dos testes
.gitignore      # Arquivos locais e gerados a ignorar no Git
README.md
PROMPT_CARCASSONNE.md
```

As pastas `src/ia` e `public/assets` contêm somente um `.gitkeep` vazio para preservá-las no Git. As classes serão adicionadas conforme cada parte for desenvolvida, sem subdivisões por categoria dentro de `jogo` nesta etapa. As regras deverão ser independentes da interface.

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
git clone https://github.com/luccachatack/carcassonne.git Carcassonne
cd Carcassonne
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

**Testes automatizados:** feitos com Vitest. Os testes ficam em `testes/`, com nome terminado em `.test.ts`, rodam em Node (sem navegador nem Phaser) e importam `describe`, `it` e `expect` de `vitest`. A fase 1 tem 8 arquivos e 53 testes, que cobrem os casos da especificação, inclusive a validação de todas as peças do catálogo. `npm run typecheck` também confere os tipos dos arquivos de `testes/`.

O `tsconfig.json` usa `skipLibCheck: true`: o TypeScript não confere os arquivos de tipos das bibliotecas em `node_modules` (os tipos do Vitest dependem de tipos do Node que o projeto não usa), mas continua conferindo todo o código de `src/` e `testes/`.

Validação realizada no Windows com Node 24.21.0 e npm 11.19.0 após adicionar o Vitest: `npm run test` sem testes (sucesso), com um teste temporário correto (sucesso) e com o mesmo teste alterado para falhar (falha detectada); `npm run typecheck` acusou um erro de tipo proposital em `testes/`; `npm run build` concluído. O teste temporário foi removido.

## Como jogar

**Ainda não é possível jogar uma partida.** Já dá para abrir o menu e as telas de peças, regras e créditos:

```powershell
npm run dev
```

Abra no navegador o endereço `Local` exibido pelo Vite (normalmente `http://localhost:5173/`), em vez de abrir `index.html` diretamente pelo explorador de arquivos.

O menu tem quatro opções: **Jogar** (ainda mostra só um aviso de que está em construção), **Peças**, **Regras** e **Créditos**. Em qualquer tela, o botão **← Menu** ou a tecla `Esc` volta ao menu.

Na tela **Peças**:

| Ação | Controle |
| --- | --- |
| Girar uma peça do catálogo | Clique nela |
| Comprar a próxima peça do baralho | Botão **Comprar peça** ou `Espaço` |
| Girar a peça comprada | Clique nela ou `R` |
| Recomeçar com um baralho novo | Botão **Novo baralho** |

Quando houver uma versão jogável, esta seção terá o comando correto para iniciar, como acessar pelo navegador, os modos disponíveis e os controles. Os comandos serão documentados de acordo com a implementação real, sem exigir que o jogador use Codex para jogar.

## Referências do trabalho

- [Apresentação e escopo](docs/referencias/carcassonne__completo.pdf).
- [Requisitos](docs/referencias/Rfs.pdf).
- [Diagrama de classes](docs/referencias/diagrama-classes.png).
- [Plano dos próximos passos](docs/plano-proximos-passos.pdf).
- [Especificação da fase 1](docs/fase-1-especificacao.md).
- [Regras de pontuação](docs/regras-de-pontuacao.md).
- [Prompt da etapa inicial](PROMPT_CARCASSONNE.md).

## Integrantes

- Gustavo Henrique
- Lucca Chatack
- Paulo Rosa
- Pedro Sixel
- Vitor Lemos

Colônia Marte é um jogo original do gênero de colocação de peças, com tema, catálogo de peças e regras próprios. Os integrantes acima são responsáveis por esta implementação acadêmica.
