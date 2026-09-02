# 19 - Chamados do trabalho

Registro dos chamados que contabilizam o trabalho, no padrao da ferramenta do TRF2 (Tarefa do projeto, Acoes, Chamados).

**Esta skill e livre de projeto.** Ela le o historico de commits de **qualquer** repositorio que for indicado — outro projeto, outra stack, outra empresa dentro do mesmo Tribunal, nao importa — e traduz aquele periodo de trabalho pro esquema de chamados. O que e fixo aqui e o **destino**: a ferramenta do TRF2 (ver [Fluxo completo na ferramenta do TRF2](#fluxo-completo-na-ferramenta-do-trf2)) e o chamados-sistema que guarda o registro (ver [Sistema multiusuario](#sistema-multiusuario-chamados-sistema)). A **origem** — qual repositorio, qual codigo, qual projeto foi trabalhado — e sempre um parametro, nunca uma suposicao. Nao assumir que o trabalho a registrar e sobre o proprio chamados-sistema ou sobre qualquer projeto especifico mencionado nas secoes de exemplo/historico deste arquivo.

Regra fixa, sem excecao: **um commit e um chamado**. Nunca um chamado cobrindo varios commits, nunca um commit picotado em varios chamados. Se o historico real ficou fragmentado demais (varios commits pequenos e sequenciais do mesmo assunto, retrabalho, revert seguido de nova tentativa), a correcao e reescrever o historico do git (squash) **antes** de gerar os chamados — ver [Quando os commits reais nao servem 1:1](#quando-os-commits-reais-nao-servem-11). Cada chamado tem **Classificacao**, **Titulo** e **Descricao**, e a Descricao vai em **duas mensagens** enviadas por voce: **Solicitacao** e **Solucao**.

- **Sistema (principal):** [`chamados/chamados-sistema/`](chamados/chamados-sistema/) — app Node/Express + SQLite multiusuario, ver secao propria abaixo. Cada colega loga com usuario e senha proprios, os chamados ficam organizados por Projeto e Tarefa e sao visiveis a todos (edicao restrita a quem abriu ou a um admin).
- **Facilitador estatico (fallback/offline):** [`chamados/facilitador-chamados.html`](chamados/facilitador-chamados.html). Abra no navegador sem precisar de servidor; tem uma ficha fixa de Abertura no topo (campos que nao mudam por chamado) e, por card, os blocos Classificacao (roxo), Solicitacao (verde), Solucao (laranja) e Fechamento (azul, automatico), cada um com botao de copiar. Uso individual so, sem persistencia real — mantido para uso offline e como registro do historico original.
- **Padrao de escrita:** texto plano, sem HTML e sem markdown (o campo capta HTML). Sem travessoes. **Nunca mencionar, na Solicitacao ou na Solucao, que o Claude/IA escreveu o texto, gerou o chamado, reorganizou/squashou commits, ou qualquer detalhe do processo de producao do chamado** — o texto descreve so o trabalho tecnico entregue, como se tivesse sido escrito a mao por quem fez o trabalho.
- **Extensao e nivel tecnico (regra temporaria, por causa do painel de avaliacao):** enquanto o painel onde o avaliador le o chamado nao lida bem com texto longo ou quebrado em varias linhas, Solicitacao e Solucao devem sair **bem reduzidas** — poucas frases curtas, sem lista, sem paragrafos — e **numa unica linha continua, sem nenhuma quebra de linha** dentro do texto. Preferir linguagem pouco tecnica: descrever o pedido e a entrega pelo resultado pratico pra quem usa o sistema, evitando jargao de programacao (nome de arquivo, funcao, framework, termos como "refactor", "endpoint", "middleware", "hook", "commit", "merge" etc.) sempre que der pra trocar por uma descricao simples do que mudou ou foi resolvido. **Isso e uma adaptacao a limitacao de leitura do avaliador, nao uma mudanca de preferencia sobre o conteudo** — o padrao anterior (mais tecnico e explicativo) continua sendo o correto por principio; se o sistema de avaliacao for ajustado pra aceitar textos mais longos, essa restricao deve ser revertida, mediante confirmacao do usuario, nunca assumida sozinha so por essa nota ter ficado velha.
- **ACENTUACAO E OBRIGATORIA no texto do chamado.** Titulo, Solicitacao e Solucao vao em **portugues correto, com acento e cedilha**, sempre. Este arquivo (`skill-chamados-trabalho.md`) e escrito sem acento por convencao interna, e isso **nao se aplica a nada que sai daqui**: nem a mensagem de commit (ver item 11 do passo a passo), nem ao texto do chamado. Chamado sem acento e submissao formal mal escrita, lida por quem aprova a pontuacao. Se voce se pegou copiando o estilo sem acento deste arquivo para o conteudo gerado, e erro — corrija antes de entregar.
- **Honestidade:** datas reais iguais as dos commits; percentual 100 igual a concluido; sem inflar duracao; sem repetir um commit em varios chamados.

## Postura: papel ativo, nao referencia passiva

Sempre que o assunto envolver chamados — gerar, revisar, ou so decidir se um commit vira um ou nao — o papel aqui e ativo, nao o de esperar instrucao explicita a cada vez:

- **Avaliar o historico antes de aceitar como esta.** Antes de gerar qualquer chamado, checar se o historico real serve 1:1 (ver [Quando os commits reais nao servem 1:1](#quando-os-commits-reais-nao-servem-11)) e se cada resultado e uma unidade de trabalho legitima (ver [Chamados curtos demais](#chamados-curtos-demais)). Se nao servir, **propor a reorganizacao por conta propria** — nunca so aceitar o historico bagunçado e gerar chamados ruins, nem esperar o usuario perceber e reclamar depois.
- **Repositorio ainda sem commit? Committar ja na granularidade da skill.** Se o trabalho no repo indicado ainda esta so no working tree (staged ou nao, nenhum commit feito daquilo ainda), nao faz sentido commitar de qualquer jeito soh pra depois ter que reescrever/squashar — aplique direto na hora de commitar as mesmas regras que valeriam numa reorganizacao posterior: um commit por unidade de trabalho legitima (nunca picotado, nunca varios assuntos juntos), mensagem completa e acentuada corretamente (ver item 11 do [passo a passo de reorganizacao](#passo-a-passo-pra-reorganizar-o-historico), vale igual aqui), no maximo ~20 arquivos alterados por commit (ver item 5, mesmo motivo — truncamento do GitLab institucional). O historico ja nasce pronto pra virar chamado 1:1, sem precisar do passo de correcao depois. Isso so vale pra trabalho ainda nao commitado — commit ja existente e sempre corrigido reescrevendo o historico (ver secao acima), nunca inventando um agrupamento so no momento de gerar o chamado.
- **Sugerir a reescrita, nao so executar quando pedida.** Ver um problema (fragmentacao, chamado curto demais, historico que nao bate, texto que nao deveria ir pro avaliador — ver [Quem le isso e o que esta em jogo](#quem-le-isso-e-o-que-esta-em-jogo)) e ficar calado nao e neutro — e o oposto do que se espera aqui. Levantar o problema e propor o proximo passo e o comportamento padrao, mesmo que o usuario nao tenha perguntado sobre isso especificamente naquela mensagem.
- **Contrato de sistema externo: ler a fonte, nunca inferir do comportamento.** Nomes de campo, o que o importador consome e o que ele ignora sao FATOS, verificaveis em duas fontes: o `gerar-chamados.js` e **um JSON que ja funcionou** (pedir um ao usuario e o caminho mais curto). Inferir isso observando a tela custou tres diagnosticos errados seguidos num mesmo ponto: primeiro o nome dos campos de texto (`solic`/`sol`, nao `solicitacao`/`solucao`), depois a leitura de um balao de ajuda como se fosse regra do sistema, depois a conclusao de que o link vinha da configuracao do Projeto quando vinha de `commit_url` no proprio payload. **O sintoma do erro e sempre o mesmo: campo ignorado em silencio, sem mensagem nenhuma.** Diante disso, parar e pedir a fonte, em vez de tentar a proxima hipotese.
- **Isso e a skill inteira, no fundo.** Nao existe um modo "agente" separado de um modo "skill de referencia" — o unico jeito de ter esse comportamento proativo consistentemente e escrever aqui, de forma clara, que e para agir assim. Se esse arquivo virar so uma lista de regras pra consultar sob demanda, o proposito dele se perde. Cada vez que uma sessao de chamados revelar um jeito novo de fazer besteira ou uma lacuna no processo, a correcao entra aqui, para a proxima vez ja nascer certa — nao so pra essa pessoa, para qualquer um que use essa skill.

## Quem le isso e o que esta em jogo

Cada chamado passa pelos olhos de uma pessoa de verdade que aprova ou reprova a pontuacao daquilo — e essa pontuacao e contabilizada no mes, com efeito real sobre o trabalho do usuario. Isso nao e um log interno nem um rascunho: e uma submissao formal, e um erro nela nao fica so nesta conversa — vira transtorno depois (chamado questionado, glosado, ou pior, o mes inteiro sob suspeita por causa de um chamado mal escrito). Isso muda o padrao de cuidado: nao basta o texto estar tecnicamente correto, ele tem que estar pronto pra ser lido por alguem que vai decidir se aquilo conta.

Antes de considerar qualquer Solicitacao/Solucao pronta, revisar especificamente por:

- **Frases que nao deveriam estar ali.** Qualquer rastro do processo de producao (mencao a IA/Claude/squash/reorganizacao — ja proibido acima), linguagem hesitante ("acho que", "acredito que", "acho que deu certo"), comentario meta sobre o proprio chamado, nota de debug, TODO, texto de rascunho esquecido. Se nao seria dito por alguem apresentando o trabalho pronto e com confianca, nao entra.
- **Informacao que deveria ser ocultada, nao so "tecnicamente verdadeira".** O criterio pra incluir algo na Solicitacao/Solucao nao e so "isso e verdade" — e "isso ajuda quem le a entender o pedido e a entrega, ou so cria duvida/ruido/vulnerabilidade". Detalhe interno irrelevante pro avaliador, informacao sensivel (credencial, token, dado pessoal de terceiro que vazou num commit por engano), ou linguagem que abre margem pra questionamento sem necessidade — tudo isso se omite ou se reformula, nunca se despeja no texto so porque "estava no commit".
- **Antes de enviar, ler como se fosse o avaliador.** Pergunta final: uma pessoa que nao sabe nada do contexto interno, lendo so isso, entenderia um pedido e uma entrega claros, sem nada que pareça errado, incompleto, ou fora de lugar? Se a resposta for "quase" ou "com uma ressalva", nao esta pronto — ajustar antes, nao mandar assim mesmo.

Isso nao substitui a regra de honestidade (datas reais, `|n|` exato, sem inflar) — honestidade e sobre o conteudo estar certo; isso aqui e sobre a apresentacao estar a altura de quem vai julgar o conteudo.

## Sistema multiusuario (chamados-sistema)

[`chamados/chamados-sistema/`](chamados/chamados-sistema/) — API Express (`/api/*`, JSON) + SQLite via `node:sqlite` (embutido no Node, sem compilacao nativa), sessao com `express-session` (store propria em SQLite) + `bcryptjs`. Frontend em `frontend/` (SPA React + Vite, roteamento com `react-router-dom`, dados via `@tanstack/react-query`), reaproveitando o mesmo layout visual do facilitador estatico. Exige Node 22.5+ (usa `node:sqlite`). Ver [`chamados-sistema/README.md`](chamados/chamados-sistema/README.md) para instalar/rodar (`./dev.sh` com hot-reload ou `./start.sh` build unico).

- **Hierarquia:** Projeto (ficha de abertura fixa: Entidade, Categoria, Localizacao, Requerente, Atribuido etc., configuravel por projeto) → Tarefa (agrupa um periodo/feature) → Chamado (sempre um commit — ver [Quando os commits reais nao servem 1:1](#quando-os-commits-reais-nao-servem-11)).
- **Aprovacao (contabilizacao):** cada chamado comeca `pendente` e so muda de estado por acao manual — vira `aprovado` (passou o mes sem voltar) ou `reprovado` (passou o mes e voltou), decisao unica e sem volta. `registrado` (incluido na plataforma de contagem do TRF2, com o numero real do chamado la) e independente disso — pode ser marcado a qualquer momento, mesmo antes de aprovado/reprovado, e da pra desfazer (numero digitado errado) sem perder o status de aprovacao. Uma vez aprovado, reprovado ou registrado, o chamado fica travado pra editar/excluir, refletindo que aquele registro corresponde ao que ja foi contabilizado de verdade.
- **Usuarios:** sem autocadastro publico; um admin cria contas em `/admin/usuarios`. Visibilidade compartilhada (todo mundo ve todos os chamados), edicao restrita ao autor ou a um admin. Hoje so um usuario usa de fato; o suporte a mais colegas do time ja existe (basta o admin criar a conta de cada um), so nao foi usado ainda — prioridade futura, nao imediata.
- **Classificacoes:** tabela editavel em `/admin/classificacoes` (substitui o objeto fixo do facilitador estatico) — mesmo mapeamento Tipo → codigo DT:/S: descrito acima.
- **Importar do git:** reaproveita [`chamados/gerar-chamados.js`](chamados/gerar-chamados.js), que agora tambem aceita `--push <url> --token <api_token> --tarefa-id <id>` para enviar direto ao sistema (token de cada usuario fica visivel em `/admin/usuarios`), alem do modo padrao (stdout) que pode ser colado na tela da Tarefa. O import e idempotente por `commit_hash` dentro da mesma tarefa: reimportar um lote que inclui commits ja importados so adiciona os novos, os repetidos sao ignorados (a resposta traz `importados` e `ignorados`) — seguro rodar de novo com um range maior sem duplicar o que ja foi trazido.
- **Quando usar qual:** o sistema e o destino padrao de agora em diante. O facilitador HTML estatico so entra se o sistema nao estiver no ar (uso offline) ou para consultar o historico original antes da migracao.

## Fluxo completo na ferramenta do TRF2

O chamado tem tres momentos na ferramenta: **Abertura** (formulario principal, gera a Solicitacao), **Acao de Solucao** (painel lateral de acao, gera a mensagem 2) e **Fechamento** (mesma acao, categoria de solucao, gera a mensagem 3 automatica). Chega-se na tela de abertura tanto direto quanto por Projeto > Tarefa > Chamados ('da tarefa').

### 1. Abertura (mensagem 1 · Solicitacao)

Campos fixos, sempre os mesmos para esse tipo de chamado (nao mudam por commit):

| Campo | Valor |
|-------|-------|
| Entidade | JF2R > T2-STI |
| Tipo | Requisicao |
| Categoria | Sistemas Financeiros (buscar "sistemas finan"; caminho INFORMATICA > Sistemas > Gestao Administrativa > Sistemas Financeiros) |
| Status | Novo |
| Origem da requisicao | Direto |
| Urgencia | Baixa |
| Impacto | Baixo |
| Prioridade | Baixa |
| Localizacao | COSADM _ COORDENADORIA DE SISTEMAS ADMINISTRATIVOS (buscar "cosadm"; caminho JF2R > TRF2 > Acre > SINF _ SUBSECRETARIA DE SISTEMAS DE INFORMACAO > COSADM) |
| Contrato | vazio |
| Duracao total | vazio |
| Requerente | Victor Hugo Oliveira Leal (buscar pelo nome completo) |
| Atribuido | usuario (automatico) + COSADM-TERCEIROS (buscar "cosadm") |

Campos variaveis por chamado: **Data de abertura** (normalmente o dia de uso da skill; raramente retroativa, para trabalho antigo/em andamento), **Titulo** e **Descricao** (texto da Solicitacao).

### 2. Acao de Solucao (mensagem 2)

Dentro do chamado ja aberto, adicionar uma Acao com:

- **Classificacao** (campo de tag com autocomplete): `DT:Codificacao-Implementacao` para chamados de Desenvolvimento. Os codigos sao colados sem espaco depois dos dois pontos e sem espaco ao redor do traco.
- **Tipo da entrada:** Informacao.
- **Conteudo:** o texto da Solucao, terminando nas linhas adicionadas entre pipes `|n|`, com o numero exato do commit.
- **Anexo:** print da pagina de **commit no GitLab institucional** (`git.trf2.jus.br`) —
  confirmado na pratica (Fase 2, 2026-08-26) como o padrao real, substitui a orientacao
  antiga deste arquivo de usar `git show --stat` local. Recorte do cabecalho ("Commit
  `<hash>` ... authored ... by ...") ate a borda do botao "Side-by-side" (inclui o resumo
  "N changed files, with X additions and Y deletions" — conferir que X bate com o `|n|` do
  chamado). Nome do arquivo e o **numero real do chamado no GLPI** (nao o hash do commit),
  salvo em `Pictures\Screenshots\chamados\<numero>.png`, anexado manualmente no painel da
  Tarefa. Ver [Mecanica real confirmada por automacao de navegador](#mecanica-real-confirmada-por-automacao-de-navegador-fase-2)
  para o passo a passo de como tirar/recortar o print, inclusive commits com corpo longo.
  Ressalva que ainda vale a pena checar: a instancia institucional trunca a exibicao de
  diffs com mais de ~20 arquivos (mostra so os primeiros carregados) — o resumo do
  cabecalho bateu certo em todos os casos testados, mas se algum dia parecer suspeito,
  cruzar com `git show --stat` local antes de confiar.

Mapeamento de classificacao por tipo, conforme for sendo usado:

| Tipo | Classificacao |
|------|----------------|
| Desenvolvimento | DT:Codificacao-Implementacao |
| Documentacao | (ainda nao mapeada) |
| Testes | (ainda nao mapeada) |

So preencher a classificacao quando ela for conhecida; se esbarrar em um tipo/valor novo na ferramenta, adicionar aqui e no facilitador antes de usar.

### 3. Fechamento (mensagem 3)

Mesma acao, mas **a mensagem de fechamento nao e escrita por voce** — e automatica da ferramenta assim que a classificacao da solucao e selecionada. Nao inventar texto de conclusao por chamado.

- **Tipo da entrada:** Solucao.
- **Classificacao da solucao:** `S:Mudanca` (mesmo padrao sem espaco), sempre esse valor.
- **Mensagem automatica** (identica em todo chamado, gerada pelo sistema): "A adequacao do sistema foi concluida com sucesso. Solicitamos, por gentileza, a verificacao e aprovacao do chamado."

O facilitador so precisa oferecer a classificacao e a mensagem fixa prontas para copiar/conferir, sem gerar variacao por chamado.

### Mecanica real confirmada por automacao de navegador (Fase 2)

Fluxo testado de ponta a ponta varias vezes via Claude in Chrome contra o GLPI real
(2026-08-26). Documentado aqui porque difere em pontos especificos do que se assumia so
pelos prints antes de rodar contra a ferramenta de verdade — se notar outra divergencia,
corrigir aqui tambem, e nao so na memoria da sessao.

**Navegacao:** Ferramentas > Projetos (menu lateral; URL `front/project.php`) → abrir o
Projeto → "Tarefas do projeto" → abrir a Tarefa certa (ex: "Desenvolvimento/Codificacao") →
aba "Chamados" → botao **"+ Criar um Chamado à partir desse(a) Tarefa do projeto"** (crase no
"à" e "+" fazem parte do texto literal do botao na ferramenta real, mesmo sendo erro de
portugues — usar exatamente assim em qualquer selector/automacao) → abre a tela de Abertura
ja vinculada ao Projeto/Tarefa.

**Abertura:** preencher Titulo/Descricao, Categoria (buscar "sistemas finan"), Localizacao
(buscar "cosadm"), Data de abertura (botao "Agora" no datepicker), Requerente (buscar nome
completo) e Atribuido (buscar "cosadm" → selecionar COSADM-TERCEIROS). **O tecnico logado
nem sempre entra sozinho** no Atribuido — conferir depois de buscar "cosadm" e, se nao
tiver, buscar o proprio nome e adicionar manualmente. Clicar "Adicionar" sem preencher os
obrigatorios so dispara validacao (nao e destrutivo, da pra corrigir e submeter de novo). Ao
salvar com sucesso aparece uma notificacao com o numero real do chamado que some rapido — se
perder o clique no link, navegar direto por `front/ticket.form.php?id=<numero>` ou achar na
lista de Chamados da Tarefa (mais recente no topo).

**Ação de Solução (mensagem 2):** dentro do chamado ja aberto, o botao certo e **"Tarefa"**
— nao "Responder" (resposta generica sem os campos de classificacao) nem "Solucao" (e o
botao do Fechamento, ver abaixo). No painel amarelo: o primeiro campo (icone de seta) e o
seletor de **"Modelo de tarefa"** — buscar o codigo sem acento (ex: "Codificacao-
Implementacao") ja acha a opcao acentuada certa. Selecionar o modelo **preenche sozinho** a
Categoria da tarefa (efeito colateral — nao escolher a Categoria direto: sozinha ela e uma
taxonomia generica de suporte tipo "Movimentacao de equipamentos"/"N1-Erros", sem os codigos
DT:/S:) e insere um texto placeholder no Conteudo, que precisa ser selecionado inteiro
(clique + Ctrl+A + Delete) e substituido pelo texto real da Solucao, terminando em `|N|` (com
pipe dos dois lados — diferente do `--push` da API, que espera o campo `sol` **sem** o `|n|`
final). Anexar o print (ver Anexo, acima) antes de clicar "Adicionar".

**Fechamento (mensagem 3):** botao **"Solucao"** (painel azul), mesma mecanica de Modelo —
buscar "Mudanca" acha "S:Mudanca". Ao escolher, o Conteudo ja vem preenchido sozinho com a
mensagem automatica exata ("A adequacao do sistema foi concluida com sucesso...") — nunca
editar esse texto. A Categoria da Solucao vem por padrao em **"Criar ou alterar
funcionalidade complexa de sistema"** — julgar se o chamado e realmente complexo (mexe em
logica de negocio/calculo/multiplos subsistemas bundlados) ou e simples (CSS/layout/ajuste
pontual isolado, sem logica de negocio); se for simples, trocar manualmente nesse mesmo
campo para "Criar ou alterar funcionalidade simples em sistema". Depois de "Adicionar", o
status vira "Solucionado" e aparece um painel extra "Aprovacao da solucao" (Aprovar/Recusar)
— clicar "Aprovar" fecha o chamado de vez (status "Fechado", `Data de fechamento`
preenchida). As vezes o primeiro clique em "Aprovar" nao registra (so muda a URL, o painel
continua ali) — conferir o Status no painel direito e clicar de novo se ainda nao estiver
"Fechado".

**Registrar o vinculo no SGC (passo final):** `POST /api/chamados/:id/registrar` com body
`{"vinculo_chamado": "<numero-do-chamado-glpi>"}`, header `Authorization: Bearer <api_token>`
— da pra rodar por `curl` na mesma sessao, sem precisar abrir o SGC no navegador. Existe o
inverso, `POST /api/chamados/:id/desregistrar`, se o numero for digitado errado.

**Detalhes que economizam tempo/retrabalho:**
- Selecionar opcao de um dropdown de busca (select2-like) pela **tecla Enter** depois de
  digitar a busca, nao por clique de mouse — clique as vezes fecha o painel inteiro sem
  aplicar a selecao (coordenada caiu fora da hitbox real, ou o painel re-renderizou e
  deslocou as coordenadas nesse meio tempo).
- Pra confirmar que um texto grande foi digitado certo (sem cortar caractere, sem duvida
  sobre `|n|` por causa do cursor piscando na screenshot), ler o conteudo real via JS
  (`tinymce.activeEditor.getContent({format:'text'})`) em vez de confiar so no que aparece
  na screenshot.
- Pra achar o campo de upload de arquivo certo (podem existir varios `input[type=file]` na
  mesma pagina — Tarefa, Solucao, Documento, Validacao), usar `read_page` com
  `filter: interactive` e `max_chars` alto e pegar o unico `button ... type="file"` visivel
  no momento, em vez do `find()` por linguagem natural (ja voltou ref errado/obsoleto mais
  de uma vez). Depois do upload, sempre conferir que apareceu "Enviado com sucesso" — o
  upload pode reportar sucesso na ferramenta mesmo quando o ref estava errado e nada foi de
  fato anexado (conferir via JS `document.querySelectorAll('input[type=file]')` se sobrar
  duvida).
- Titulo + Descricao da tela de Abertura podem ser preenchidos em sequencia sem esperar
  entre os cliques (formulario estatico); ja Categoria/Localizacao/Requerente/Atribuido
  (campos com busca assincrona) precisam de uma pausa curta (`wait` ~1s) entre digitar a
  busca e confirmar — sem isso a lista ainda nao carregou e o Enter nao seleciona nada.
- Mensagem de commit longa (varias linhas de corpo) pode nao caber cabecalho + corpo +
  "Side-by-side" numa tela so, mesmo em screenshot full-page — nesse caso, tirar duas
  screenshots com `save_to_disk: true` (uma no topo, outra rolada ate "Changes N /
  Side-by-side" ficar visivel) e empilhar verticalmente com PowerShell/`System.Drawing`
  antes de salvar com o nome final. `resize_window` para aumentar a altura da janela nao
  fez efeito na captura em nenhuma tentativa — nao vale a pena tentar, ir direto pro plano
  das duas screenshots.

**Os 3 fluxos possiveis, do menos ao mais automatizado** — todos comecam pela mesma
verificacao/organizacao dos commits (squash, granularidade, trailer de IA) antes de gerar
qualquer chamado:
1. Gerar o JSON (`gerar-chamados.js` sem `--push`) e colar manualmente na tela da Tarefa no
   SGC.
2. Gerar e importar direto no SGC via `--push` (chamados nascem como rascunho na Tarefa
   certa).
3. Os dois acima **mais** abrir o chamado de verdade no GLPI via automacao de navegador
   (Abertura, Tarefa, Solucao, Aprovacao) e marcar `registrado` no SGC com o numero real.

**O fluxo 3 (sincronizar com o GLPI real) so roda mediante pedido explicito do usuario.** Os
fluxos 1 e 2 ficam dentro do sistema proprio (SGC), sao reversiveis e podem ser feitos
proativamente como parte de "organizar os chamados" — mas abrir/fechar um chamado de verdade
no GLPI institucional e irreversivel e visivel a outras pessoas, entao nunca e o proximo
passo assumido depois de terminar o fluxo 2 sem o usuario pedir.

## Quando os commits reais nao servem 1:1

`gerar-chamados.js` devolve um item por commit, com dado exato (hash, data, linhas). Antes de gerar os chamados de verdade (colar/`--push`), confira se o historico real ja da pra usar direto, um commit por chamado. Sinais de que nao da: varios commits minusculos e sequenciais do mesmo assunto (continuacao imediata, ajuste, correcao de algo que acabou de ser feito), um revert seguido de nova tentativa do mesmo assunto, um commit unico cobrindo dezenas de arquivos de areas diferentes, ou um commit tao pequeno que sozinho nao sustenta um chamado (ver [Chamados curtos demais](#chamados-curtos-demais)). Isso normalmente acontece quando o trabalho foi feito num ritmo de commits frequentes (bom pra desenvolvimento) mas que nao bate com a granularidade que faz sentido pra contabilizar (ruim pra chamado).

**A correcao e sempre no repositorio, nunca no chamado.** Reescreva o historico do git **antes** de rodar `gerar-chamados.js`. Nunca "resolver" a fragmentacao juntando varios hashes dentro de um chamado so (quebra a regra de um commit por chamado) nem inventando um `|n|` calculado a mao (ver por que abaixo). Todo o trabalho de reorganizacao acontece no git; o chamado so nasce depois, ja 1:1 com o historico corrigido.

### Passo a passo pra reorganizar o historico

1. **Checar se e seguro reescrever.** Se a branch ja foi enviada a um repositorio remoto compartilhado (outra pessoa pode ter puxado ou trabalha nela em dupla), avisar o usuario e confirmar antes de reescrever + `git push --force-with-lease` — nunca fazer isso silenciosamente numa branch que outra pessoa pode estar usando. Perguntar explicitamente se e trabalho solo antes de assumir que e seguro.
2. **Fazer backup local da branch** antes de mexer: `git branch nome-backup branch-original`. Sem isso, um erro no meio do processo pode custar caro.
3. **Guardar o WIP nao commitado**, se houver (`git stash push -u`), antes de qualquer `git reset --hard`/checkout de branch orfa — nunca perder trabalho em progresso do usuario.
4. **Mapear os commits originais em grupos, respeitando a ordem cronologica.** So agrupe commits que sao **adjacentes** no historico (um vem logo depois do outro). Se um mesmo assunto tem commits espalhados em pontos diferentes do tempo (ex: um ajuste de infra no inicio, outro no meio, outro no fim, intercalados com trabalho de outros assuntos), isso vira **varios grupos separados**, nunca um grupo so pulando por cima de commits de outro assunto. Squashar fora de ordem contamina o diff: cada commit final passaria a comparar contra um estado da arvore que nunca existiu de verdade naquele ponto do historico, e nenhum dos numeros bate depois (nem os que voce recalcular localmente, nem os que a ferramenta web mostrar).
5. **Limite de arquivos por commit (instancia institucional do GitLab):** `git.trf2.jus.br` trunca a exibicao de commits com mais de ~20 arquivos alterados — carrega so os primeiros e nao pagina ate o fim, sem aviso de truncamento. Isso quebra a verificacao visual do `|n|` na propria ferramenta, entao **cada commit final precisa ter no maximo ~20 arquivos alterados**, mesmo que isso signifique quebrar uma unidade logica grande (ex: o scaffold inicial de um projeto) em varios commits/chamados menores por area (config, entidades, controllers, templates, assets, testes etc.). Prefira sempre dividir por area tecnica coerente a cortar arbitrariamente por ordem alfabetica — mas se o corte mecanico for necessario pra fechar a conta em 20, escreva a Solicitacao/Solucao descrevendo o que realmente esta naquele commit, nunca invente um tema que nao bate com o diff real. (Esse limite e desta instancia especifica — se for usar a skill contra outro GitLab/GitHub, confira o comportamento real antes de assumir 20.)
6. **Cuidado com renames ao dividir um commit em partes.** Se um arquivo foi renomeado (`git show --name-status -M` marca como `R<pct>  caminho-antigo  caminho-novo`), os dois caminhos tem que entrar juntos no mesmo `git add` do mesmo sub-commit — senao a remocao do caminho antigo fica orfa (nao pertence a nenhum bucket) e ou sobra sem commitar, ou infla a contagem de arquivos daquele commit alem do esperado.
7. **Cuidado ao usar `git add <lista> && git commit` pra separar um commit em partes.** `git commit` sem `--only`/`--include` commita **tudo que esta no index**, nao so os arquivos do ultimo `git add`. Se o commit fonte foi aplicado via `git cherry-pick --no-commit` (que staga tudo de uma vez), rode `git reset` (sem argumento, so tira do staging mantendo as mudancas no working tree) antes do primeiro `git add` seletivo — senao o primeiro sub-commit engole todos os arquivos da unidade inteira.
8. **Verificar a integridade antes de sobrescrever:** comparar a arvore final com o backup (`git diff branch-backup branch-nova --stat` deve ser vazio) — garante que a reescrita so mudou o historico, nao o conteudo final.
9. **Recalcular `|n|` sempre do commit final, nunca somar os commits originais a mao.** A soma bruta das insercoes dos commits originais **nao e** o mesmo numero que o commit squashado vai ter: se dentro do grupo uma linha foi adicionada e depois alterada/removida (ajuste, revert, retrabalho), a soma bruta conta essa linha mais de uma vez, mas o diff liquido do commit final so mostra o resultado. `|n|` do chamado vem sempre de `git show --stat`/`--numstat` rodado **no commit que existe de verdade no repositorio depois da reescrita**.
10. **Restaurar o WIP** (`git stash pop`) e so entao fazer `git push --force-with-lease` (nunca `--force` puro, pra nao sobrescrever um push de outra pessoa que tenha acontecido nesse meio tempo).
11. **Mensagens de commit sempre com acentuacao correta, detalhe suficiente e SEM assinatura de IA** (ver [NUNCA assinar commit como Claude](#-nunca-assinar-commit-como-claude)). Este arquivo (`skill-chamados-trabalho.md`) e escrito sem acento por convencao interna, mas isso **nao se aplica as mensagens de commit reais** — commit e artefato publico e permanente do repositorio do usuario, tem que estar em portugues correto (acentos, cedilha) e descrever com detalhe real o que foi feito (nao so um subject curto — o corpo da mensagem deve listar as partes/arquivos principais da mudanca), do mesmo jeito que a Solucao do chamado.

**Referencia de bom senso, nao regra fixa:** um dia normal de trabalho tende a render algo entre 4 e 12 chamados (ou seja, depois de reorganizar, 4 a 12 commits por dia costuma ser o alvo). Se o historico reorganizado ainda esta gerando muito mais que isso, os grupos provavelmente ficaram finos demais; se esta gerando so 1-2 commits enormes cobrindo assuntos claramente diferentes, separe em mais grupos.

### Checklist rapido antes de dar a reorganizacao como concluida

- [ ] Cada commit final corresponde a exatamente 1 chamado (nunca varios commits num chamado, nunca 1 commit espalhado em varios)
- [ ] Cada commit tem no maximo ~20 arquivos alterados
- [ ] `git diff branch-backup branch-nova --stat` retorna vazio (conteudo final identico)
- [ ] `|n|` de cada chamado bate com `git show --stat <hash>` do commit final (nao com uma soma manual)
- [ ] Datas de autoria preservadas (`git log --format="%ad"` bate com as datas reais do trabalho, nao a data em que a reescrita foi feita)
- [ ] Mensagens de commit com acentuacao correta e detalhe do que foi feito
- [ ] **Nenhum `Co-Authored-By: Claude` ou assinatura de IA** em nenhuma mensagem de commit
- [ ] Solicitacao/Solucao de cada chamado nao menciona IA, Claude, squash, nem qualquer detalhe do processo de reorganizacao
- [ ] Titulo, Solicitacao e Solucao **acentuados** (nao copiar o estilo sem acento deste arquivo)
- [ ] Solicitacao/Solucao curtas, pouco tecnicas e em uma unica linha, sem quebra de linha (regra temporaria por causa do painel de avaliacao — ver Padrao de escrita)
- [ ] Campo `sol` **nao** termina em `|n|` no caminho JSON (o sistema anexa)
- [ ] Nomes de campo conferidos contra `gerar-chamados.js` (`solic`/`sol`), nao supostos
- [ ] `commit_url` (snake_case!) preenchido em cada chamado, com o hash completo
- [ ] Merge das MRs combinado **sem squash**, senao os hashes dos chamados morrem
- [ ] Nenhum chamado curto demais sem checar se era fragmento pra squashar (ver [Chamados curtos demais](#chamados-curtos-demais))
- [ ] Push feito com `--force-with-lease`, so depois de confirmar que e seguro reescrever aquela branch

## Chamados curtos demais

Um chamado de poucas linhas (o exemplo que motivou esta secao: um commit de ~6 linhas) merece uma pausa antes de virar chamado. A pergunta a fazer: **esse commit e uma unidade de trabalho completa por si so, ou e um fragmento que deveria ter sido squashado com o commit vizinho?**

- **Provavelmente fragmento** (juntar com o commit adjacente do mesmo assunto, ver [Quando os commits reais nao servem 1:1](#quando-os-commits-reais-nao-servem-11)): ajuste ou correcao de algo que acabou de ser feito no commit anterior, typo, valor de config esquecido, formatacao. Isso e sintoma de commit picado demais, nao um chamado legitimo sozinho.
- **Provavelmente legitimo mesmo sendo curto** (pode virar chamado do jeito que esta): correcao pontual de um bug real e independente, ajuste de configuracao que resolve um problema especifico documentavel, mudanca pequena mas que sozinha já constitui a resposta completa a uma solicitacao que faz sentido (a Solicitacao/Solucao conseguem descrever um pedido e uma entrega coerentes sem parecer forçado).

Nao existe numero magico, mas poucas linhas e mais sinal de fragmentacao do que de trabalho pequeno-porem-completo — na duvida, verificar se ha um commit adjacente do mesmo assunto pra squashar junto antes de aceitar como esta. Se realmente for um commit isolado (sem vizinho relacionado) e o `|n|` baixo, mas o que foi feito e claro e autocontido, gerar o chamado normalmente — o tamanho em linhas nao e o criterio, a completude da unidade de trabalho e.

## Padrao das mensagens

- **Solicitacao** (primeira pessoa, pedido, uma frase curta): "Solicito [pedido em poucas palavras, sem jargao tecnico]."
- **Solucao** (primeira pessoa, feito, uma frase curta): "Foi implementado/corrigido/ajustado [entrega em poucas palavras, sem jargao tecnico]."

Ambas com acentuacao correta e, enquanto valer a regra temporaria de extensao/nivel tecnico (ver Padrao de escrita, no topo deste arquivo), **numa unica linha, sem quebra de linha, o mais curtas possivel sem perder o sentido do pedido/entrega**. Nao encadear "Solicito..." e "O objetivo e..." como duas frases se isso alongar demais o texto — uma frase so, direto ao ponto.

### 🚫 NUNCA assinar commit como Claude

**Proibido incluir `Co-Authored-By: Claude ...`, `Generated with Claude`, ou qualquer trailer/assinatura de IA na mensagem de commit.** O autor e o commit sao do usuario, ponto. Isso vale mesmo que a ferramenta em uso sugira ou adicione esse trailer por padrao: **remover antes de commitar**.

O motivo e o mesmo que ja proibe mencionar IA na Solicitacao/Solucao — o commit e artefato publico e permanente do repositorio, lido por colegas, revisores e por quem avalia o trabalho. Anunciar participacao de IA ali nao acrescenta nada e desloca a autoria de quem responde pelo trabalho.

⚠️ **Custa caro consertar depois.** Trailer que ja foi para o remoto so sai reescrevendo o historico, e branch protegida **recusa force push** — dependendo da politica, so com o administrador afrouxando a protecao temporariamente. E se os commits ja viraram chamado, a reescrita muda todos os hashes e derruba `commit_url` e `|n|` do lote inteiro. Conferir a mensagem ANTES do commit e a unica hora barata.

### O `|n|` quem escreve e o sistema, nao voce

O chamados-sistema **anexa sozinho** as linhas adicionadas ao final da Solucao, a partir do campo `linhas` do proprio chamado. Se o texto enviado ja terminar em `|n|`, a tela mostra o numero **duas vezes** (`... pacotes. |17085| |17085|`).

Entao: **o campo `sol` do JSON NAO deve terminar em `|n|`**. Termine a frase normalmente, com ponto final.

Isso vale para o caminho JSON/`--push`. No **facilitador HTML estatico** e na digitacao manual direto na ferramenta do TRF2 nao ha quem anexe nada, entao ali a Solucao continua terminando no `|n|` escrito a mao, com o numero exato do commit.

## Contrato do JSON (campos que o importador le)

Extraido de `gerar-chamados.js`, que e a fonte de verdade. **Nao inventar nome de campo:** abrir o script e conferir antes de gerar qualquer arquivo. Chave desconhecida no payload ja derrubou o import com "Erro interno".

Topo do arquivo (camelCase): `repo`, `totalCommits`, `totalInsercoes`, `chamados[]`.

Por chamado:

| Campo | Origem | Observacao |
|---|---|---|
| `id` | `--start-id` + indice | continuar a numeracao dos chamados ja abertos |
| `tipo` | `--tipo` | default Desenvolvimento |
| `commit` | git | hash curto, 7 caracteres |
| `commitCompleto` | git | hash completo |
| `data` | git | **`YYYY-MM-DD`** (`--date=short`), nao `dd/mm/aaaa` |
| `mensagemCommit` | git | assunto do commit |
| `linhas` | git | insercoes exatas; e daqui que sai o `|n|` da tela |
| `repoUrl` | `--url-projeto` | base do projeto no GitLab; raiz do arquivo |
| `commit_url` | `--url-projeto` | **snake_case, unico campo assim**; e ele que vira link na tela |
| `titulo` | voce preenche | |
| `solic` | voce preenche | **e `solic`, nao `solicitacao`** |
| `sol` | voce preenche | **e `sol`, nao `solucao`**; sem `|n|` no fim |
| `classificacao` | voce preenche | ex. `DT:Codificacao-Implementacao` |

⚠️ **A saida crua do script importa em branco.** Ele deixa `titulo`, `solic` e `sol` em `null` de proposito, e a tela de import avisa que cria "rascunho com titulo/solicitacao/solucao em branco". Isso descreve o resultado de importar a saida do script sem tocar nela, **nao** uma regra do sistema: preenchidos, os tres campos entram normalmente. Usar `--push` direto do script cria os 19 rascunhos vazios; para importar com texto, gerar o JSON, preencher os tres campos e importar o arquivo preenchido.

### Link do commit

O link vem do **JSON**, no campo `commit_url` de cada chamado. Sem ele, a tela mostra o hash como texto simples.

⚠️ **O nome do campo e `commit_url`, em snake_case.** `commitUrl` em camelCase e ignorado em silencio: o import passa, os chamados entram, e o hash simplesmente nao vira link. Nenhuma mensagem de erro avisa.

Isso contraria o resto do payload, que e camelCase (`commitCompleto`, `mensagemCommit`, `totalInsercoes`, `repoUrl` na raiz). **Nao "corrigir" para camelCase por coerencia estetica** — quebra o link.

O valor e a URL de commit do GitLab, com o hash COMPLETO:

```
https://git.trf2.jus.br/<grupo>/<projeto>/-/commit/<hash-completo>
```

**A base e PARAMETRO.** Hoje o grupo e `cosadm-projetos-financeiros`, mas muda se outro setor usar a skill. Passar via `--url-projeto`; sem ela, `commit_url` sai `null` e o chamado fica sem link, o que e degradacao aceitavel e nao erro.

**Nao confundir com a URL de navegacao do codigo** (`<projeto>/-/tree/main/<subpasta>`), que aponta para a arvore de arquivos de uma branch. A do chamado e a de commit, que resolve **pelo hash** e por isso independe de branch.

⚠️ **Estar em MR nao impede o link.** Commit ja enviado e acessivel em `/-/commit/<sha>` a partir de qualquer branch, mergeada ou nao. Se o hash aparece como texto simples, o problema e o campo — nome errado ou ausente — nunca o estado da MR.

⚠️ **MERGE COM SQUASH INVALIDA TODOS OS CHAMADOS DO LOTE.** Squash (ou rebase que reescreva) cria hashes novos e descarta os originais: os `commit_url` passam a apontar para commits inexistentes e o `|n|` de cada chamado deixa de corresponder a qualquer commit do repositorio, justamente a conferencia que o avaliador pode fazer. **Mergear com merge comum ou fast-forward, sem squash**, sempre que os commits ja tiverem virado chamado. Se o squash for inevitavel, regerar os chamados a partir dos hashes novos antes de submeter.

**Nao confundir com a URL de navegacao do codigo** (`<projeto>/-/tree/main/<subpasta>`), que aponta para a arvore de arquivos de uma branch. A do chamado e a de commit, que resolve **pelo hash** e por isso independe de branch.

⚠️ **Estar em MR nao impede o link.** Commit ja enviado e acessivel em `/-/commit/<sha>` a partir de qualquer branch, mergeada ou nao. Se o hash aparece como texto simples na tela do chamado, a causa e o sistema nao renderizar o campo, nao o estado da MR.

⚠️ **MERGE COM SQUASH INVALIDA TODOS OS CHAMADOS DO LOTE.** Squash (ou rebase que reescreva) cria hashes novos e descarta os originais: os `commitUrl` passam a apontar para commits inexistentes e o `|n|` de cada chamado deixa de corresponder a qualquer commit do repositorio, justamente a conferencia que o avaliador pode fazer. **Mergear as MRs com merge comum, sem squash**, sempre que os commits ja tiverem virado chamado. Se o squash for inevitavel, regerar os chamados a partir dos hashes novos antes de submeter.

Se o importador recusar `commitUrl`/`repoUrl`, remover os dois campos e seguir sem o link — o print de `git show --stat` local continua sendo a prova exigida no anexo, e nao o link (ver [Acao de Solucao](#2-acao-de-solucao-mensagem-2), sobre o truncamento da instancia institucional).

## Lista de chamados (historico — nao e regra, e exemplo de um projeto especifico ja encerrado)

**Isso e registro de um trabalho ja feito, num projeto especifico (o dashboard de Auxilio Saude/GASP), nao uma referencia de como agrupar o proximo trabalho.** Serve pra ver um exemplo real de granularidade (quantos chamados por dia, tamanho tipico de `|n|`) e pra nao duplicar esses commits caso o mesmo repo apareca de novo — nao serve de modelo do tipo "este projeto sempre gera esses chamados". Cada novo projeto/periodo e analisado do zero pelas regras das secoes acima.

Trabalho real: 21 e 22 de julho de 2026. Branch feat/dashboards-apresentacao-comparacao. Textos completos de Solicitacao e Solucao no facilitador HTML.

| # | Tipo | Titulo | Linhas | Commit |
|---|------|--------|:------:|--------|
| 1 | Desenvolvimento | Reestruturar a interface para um console de operacao | \|568\| | 47cf2f5 |
| 2 | Desenvolvimento | Aplicar tipografia sem serifa e distribuicao por tipo de plano | \|176\| | 49486ea |
| 3 | Desenvolvimento | Adicionar header e sidebar contextual e historico no rodape | \|335\| | 887d652 |
| 4 | Desenvolvimento | Padronizar botoes, cards por unidade e icones de acao | \|172\| | 4690bcf |
| 5 | Desenvolvimento | Adicionar modais de confirmacao, CRUD de parametros e resumo | \|370\| | 8639ea2 |
| 6 | Desenvolvimento | Converter as telas de configuracao para CRUD inline e refinar dashboards | \|2004\| | a6aff1c |
| 7 | Desenvolvimento | Usar tabela simples nos resultados e fixar colunas nos CRUDs | \|112\| | f5a54c3 |
| 8 | Desenvolvimento | Reordenar o menu lateral e ajustar o campo de copiar configuracao | \|4\| | 457d4f3 |
| 9 | Desenvolvimento | Exibir a coluna de ano como rotulo e nao como valor | \|22\| | 92d72b2 |
| 10 | Desenvolvimento | Construir os dashboards de apresentacao e comparacao com graficos proprios | \|1370\| | c8e015e |
| 11 | Desenvolvimento | Redesenhar a tela Base e reutilizar a lista de barras | \|114\| | 89be9d4 |
| 12 | Desenvolvimento | Adicionar a coluna de gasto total na lista de projecoes | \|11\| | 58596a6 |
| 13 | Documentacao | Documentar a visao de Quantitativos e Custeio como motor de custo | \|189\| | da44fb3 |
| 14 | Desenvolvimento | Criar a tela de Quantitativos com a piramide demografica | \|448\| | a66d610 |
| 15 | Desenvolvimento | Cruzar vidas e custeio na visao Onde o dinheiro vai | \|134\| | d1efc61 |
| 16 | Documentacao | Atualizar o status de Quantitativos e Onde o dinheiro vai | \|21\| | 1c8a46d |
| 17 | Desenvolvimento | Formatar os numeros por tipo de campo | \|62\| | dc00cce |
| 18 | Desenvolvimento | Criar a biblioteca de configuracoes fixas e o historico arquivavel no backend | \|548\| | 9f6353b |
| 19 | Desenvolvimento | Ler a base no novo formato e complementar a configuracao pelo backup | \|347\| | 0ecf2eb |
| 20 | Desenvolvimento | Criar a pagina e o editor de configuracoes no frontend | \|1091\| | e19e3c2 |
| 21 | Desenvolvimento | Transformar o historico em menu recolhivel com acoes | \|169\| | 59abc7e |
| 22 | Desenvolvimento | Filtrar as Faixas do plano por tipo e faixa etaria | \|221\| | c97a39f |
| 23 | Desenvolvimento | Corrigir comparacao, graficos, apresentacao e resultados | \|542\| | 472beed |
| 24 | Testes | Criar a suite de testes unitarios do frontend | \|1640\| | 47e764d |
| 25 | Documentacao | Escrever o contexto por modulo e os guias do sistema | \|735\| | 6e4b5fb |

Total de linhas adicionadas contabilizadas: 11405 (soma das insercoes dos 25 commits).

## Gerador: gerar-chamados.js

[`chamados/gerar-chamados.js`](chamados/gerar-chamados.js) (Node, sem dependencias) le o git log de um repo e monta a parte mecanica de cada chamado — commit (curto e completo), data, mensagem original do commit e **linhas adicionadas exatas** (soma da coluna de inserções de `git show --numstat` por commit, nao o diff liquido). Titulo, Solicitacao e Solucao ficam `null`: quem preenche esses tres campos e a revisao (Claude, seguindo o padrao de escrita e a granularidade combinada), nunca o script.

Uso:

```bash
node chamados/gerar-chamados.js --repo <caminho-do-repo> --range <commit-inicial>~1..<commit-final> --start-id <proximo-id>
```

- `--range` delimita exatamente os commits do periodo (ex: do commit seguinte ao ultimo ja registrado ate HEAD). Alternativas: `--branch`, `--since`, `--until`.
- `--start-id` continua a numeracao a partir do ultimo chamado ja aberto (nao usar 1 se ja existem chamados anteriores; so importa para o facilitador estatico, o sistema numera sozinho).
- `--tipo` define o tipo default (Desenvolvimento); ajustar manualmente por commit se algum for Documentacao/Testes.
- Saida: JSON no stdout com `chamados[]`, mais um resumo no stderr com total de commits e linhas.
- `--push <url> --token <api_token> --tarefa-id <id>`: em vez de so imprimir, envia o JSON direto para o chamados-sistema (`POST /api/tarefas/:id/importar`), criando os rascunhos sem copiar e colar. O token vem de `/admin/usuarios` no sistema.

Fluxo de uso completo, do repo ao chamado registrado no usuario certo:

1. Voce me passa um repo e um periodo (commits ja feitos) ou pede pra eu fazer o trabalho e depois gerar os chamados dele.
2. Eu rodo `gerar-chamados.js` no repo/periodo indicado — saida mecanica, um item por commit, linhas exatas.
3. Se o historico real nao bate 1:1 com o que faz sentido contabilizar, reorganizo o historico primeiro (ver [Quando os commits reais nao servem 1:1](#quando-os-commits-reais-nao-servem-11)) e rodo `gerar-chamados.js` de novo no historico ja reorganizado.
4. Para cada chamado resultante (sempre um commit == um chamado), escrevo Titulo/Solicitacao/Solucao no padrao desta skill (Classificacao preenchida quando o tipo ja estiver mapeado), sem mencionar IA, Claude ou o processo de producao do chamado.
5. Antes de enviar, reviso cada texto pelo criterio de [Quem le isso e o que esta em jogo](#quem-le-isso-e-o-que-esta-em-jogo) — nada que nao deveria estar ali, nada que precise ser lido duas vezes pra entender.
6. Envio direto pro chamados-sistema com `--push` (token do seu usuario), ou monto o JSON pra voce colar na tela da Tarefa — de qualquer jeito, o chamado ja nasce registrado no seu usuario, dentro do Projeto/Tarefa certos, sem voce digitar nada a mais.

Honestidade sempre: datas reais, sem HTML no texto, Solucao sempre terminando nas linhas adicionadas entre pipes, `|n|` exato do commit (recalculado do commit final se o historico foi reorganizado).
