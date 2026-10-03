# Carcassonne — Projeto acadêmico

Trabalho da disciplina de Projeto de Software: uma versão digital local de Carcassonne. O desenvolvimento será feito aos poucos, usando **TypeScript** para as classes e regras e **Phaser** para a interface.

## Estado atual

**Ambiente de desenvolvimento configurado. Ainda não há jogo implementado.**

O projeto contém a estrutura inicial e a configuração de TypeScript, Phaser e Vite. `index.html` carrega `src/main.ts`, que contém apenas um comentário. O servidor pode abrir a página, mas ela permanece em branco: não há cenas Phaser, regras, IA, controles ou partida. Testes automatizados ainda não estão configurados.

O repositório do projeto é [luccachatack/carcassonne](https://github.com/luccachatack/carcassonne), com branch principal `main` e remoto local `origin`.

Este README será atualizado junto com o desenvolvimento para refletir o que realmente está implementado.

## Escopo previsto

- Partida local entre 2 a 5 jogadores humanos.
- Partida de 1 humano contra 1 computador, com IA fácil e difícil.
- Construção do tabuleiro, colocação de meeples e pontuação.
- Meeple grande incluído.
- Desempate pela quantidade de meeples disponíveis antes da contagem final.

Essas funcionalidades estão planejadas, não implementadas nesta etapa.

## Organização atual

```text
src/
  main.ts       # Ponto de entrada carregado pelo Vite
  jogo/         # Futuras classes e regras
  ia/           # Futuras estratégias do computador
  telas/        # Futura interface com Phaser
public/
  assets/       # Futuros recursos visuais e sonoros
testes/         # Testes adicionados durante a implementação
docs/
  referencias/  # PDFs e diagrama do grupo
index.html      # HTML mínimo que carrega src/main.ts
package.json    # Metadados, dependências e comandos do projeto
package-lock.json # Versões exatas das dependências resolvidas pelo npm
tsconfig.json   # Configuração inicial do TypeScript
.gitignore      # Arquivos locais e gerados a ignorar no Git
README.md
PROMPT_CARCASSONNE.md
```

As pastas `src/jogo`, `src/ia`, `src/telas`, `public/assets` e `testes` contêm somente um `.gitkeep` vazio para preservá-las no Git. As classes serão adicionadas conforme cada parte for desenvolvida, sem subdivisões por categoria dentro de `jogo` nesta etapa. As regras deverão ser independentes da interface.

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

Versões instaladas: **Phaser 4.2.1**, **TypeScript 7.0.2** e **Vite 8.3.2**. Phaser é uma dependência do jogo; TypeScript e Vite são dependências de desenvolvimento. As versões diretas estão fixadas no `package.json`, e as dependências transitivas estão registradas no lockfile.

No PowerShell, se a política de execução bloquear `npm.ps1`, use `npm.cmd` no lugar de `npm` nos comandos abaixo, sem alterar a política do Windows.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor local do Vite. |
| `npm run typecheck` | Confere os tipos com TypeScript, sem gerar arquivos. |
| `npm run build` | Confere os tipos e gera o build em `dist/`. |
| `npm run preview` | Serve localmente o build existente em `dist/`. Execute o build antes. |

Use o endereço `Local` exibido pelo Vite no terminal. Encerre o servidor com `Ctrl+C`. O preview serve para conferir o build localmente; não publica o projeto.

Na conferência desta etapa, os servidores foram iniciados com host e portas explícitos:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Os endereços exibidos foram `http://127.0.0.1:5173/` para desenvolvimento e `http://127.0.0.1:4173/` para preview. Sem essas opções, consulte o endereço exibido no seu terminal.

Validação realizada no Windows com Node 24.21.0 e npm 11.19.0: instalação reproduzível com `npm ci --offline` usando o cache local, `npm run build` (incluindo `typecheck`) e respostas HTTP 200 do HTML e JavaScript tanto no desenvolvimento quanto no preview. Os servidores usados nessa conferência foram encerrados. Isso valida a configuração inicial, sem representar testes de jogabilidade.

**Testes automatizados:** ainda não disponíveis. Não há script `test`; a verificação de tipos não testa regras do jogo. A pasta `testes` continua reservada para as futuras implementações.

## Como jogar

**Ainda não é possível jogar.** `npm run dev` abre o ambiente de desenvolvimento, mas a página fica em branco. Phaser está reservado para a futura interface; ainda não é inicializado. Use o endereço do servidor, em vez de abrir `index.html` diretamente pelo explorador de arquivos.

Quando houver uma versão jogável, esta seção terá o comando correto para iniciar, como acessar pelo navegador, os modos disponíveis e os controles. Os comandos serão documentados de acordo com a implementação real, sem exigir que o jogador use Codex para jogar.

## Referências do trabalho

- [Apresentação e escopo](docs/referencias/carcassonne__completo.pdf).
- [Requisitos](docs/referencias/Rfs.pdf).
- [Diagrama de classes](docs/referencias/diagrama-classes.png).
- [Prompt da etapa inicial](PROMPT_CARCASSONNE.md).

## Integrantes

- Gustavo Henrique
- Lucca Chatack
- Paulo Rosa
- Pedro Sixel
- Vitor Lemos

Projeto acadêmico baseado no jogo Carcassonne, de Klaus-Jürgen Wrede. Os integrantes acima são responsáveis por esta implementação acadêmica.
