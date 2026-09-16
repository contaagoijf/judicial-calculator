# CALCJUD

## Ferramenta de Cálculos Judiciais de IRPF

*Documentação Funcional — Versão para Validação Contábil*

Tribunal Regional Federal da 2ª Região (TRF2)
28/08/2026

## Sumário

- [1. Contexto e origem do projeto](#1-contexto-e-origem-do-projeto)
- [2. Objetivo](#2-objetivo)
- [3. Como utilizar](#3-como-utilizar)
- [4. Referências e materiais relacionados](#4-referências-e-materiais-relacionados)
- [5. Acesso ao Sistema](#5-acesso-ao-sistema)

## 1. Contexto e origem do projeto

O CALCJUD nasceu como iniciativa para **unificar duas planilhas Excel** mantidas pela **DCAL (Divisão de Cálculos)** do TRF2/JFRJ, hoje distribuídas pela intranet e usadas manualmente pelas contadorias:

- **Planilha de Cálculo de Ajuste Anual de IRPF** — calcula o ajuste anual do Imposto de Renda Pessoa Física de um único ano, com acréscimo/decréscimo de valores não tributáveis.
- **Planilha de Cálculo de Declaração Anual do Imposto de Renda** ("Soluções para Contadorias") — recalcula uma declaração de IRPF já entregue, aplicando alterações (acréscimos e decréscimos) aos valores originais de qualquer rubrica, para múltiplos anos.

O cálculo realizado não é uma declaração de IR "avulsa": é o **cálculo judicial de diferenças de Imposto de Renda dentro de um processo em trâmite** (por exemplo, discussão sobre a incidência de IR sobre determinados rendimentos), incluindo a apuração de correção monetária e juros de mora sobre a diferença, respeitando o teto de 60 salários mínimos dos Juizados Especiais/RPV, para juntada da memória de cálculo ao processo.

Um primeiro projeto de migração dessas planilhas para uma ferramenta única foi iniciado em parceria com a Assessoria de Governança da SG, mas foi interrompido com o desligamento da estagiária de TI responsável pelo desenvolvimento. O CALCJUD é a versão da ferramenta resultante desse esforço — já implementa a sequência de cálculo em 8 partes descrita na especificação funcional levantada naquele projeto (dados do processo → recálculo ano a ano → separação de diferenças antes/depois da distribuição → aplicação do teto do RPV → atualização até a data final → totais de principal e juros).

## 2. Objetivo

Oferecer uma ferramenta web única, substituindo as duas planilhas manuais, para:

- **Ajuste Anual**: recalcular o imposto devido de um único ano-calendário a partir dos dados originais da declaração e de alterações (acréscimos/decréscimos) em rendimentos, deduções, incentivos e RRA (Rendimentos Recebidos Acumuladamente), apurando o imposto a pagar ou a restituir.
- **Retificação**: calcular, para um processo judicial com um ou mais anos-calendário, os valores devidos com correção monetária e juros até a data de distribuição e/ou até uma data final, aplicando o teto do RPV/Juizados Especiais (60 salários mínimos) e produzindo o resumo de principal devido, juros devidos e total de execução.
- **Consulta**: permitir a qualquer pessoa (parte, advogado, servidor) verificar a autenticidade de um cálculo já realizado a partir do seu ID único.
- **Transparência dos parâmetros**: expor publicamente as tabelas fiscais (faixas de IR, teto do simplificado, salário mínimo histórico, índices econômicos) usadas nos cálculos.
- **Relatório para juntada**: gerar a memória de cálculo completa em PDF, pronta para ser anexada ao processo.
- **Administração**: permitir que usuários administradores mantenham as tabelas auxiliares atualizadas e controlem a disponibilidade pública do sistema, sem depender de alteração de código.

O uso de cálculo em si (Ajuste Anual, Retificação e Consulta) é **público e não exige login**. O login administrativo é necessário apenas para alterar parâmetros, tabelas auxiliares e configurações do sistema.

## 3. Como utilizar

### Página inicial

Apresenta três atalhos — **Ajuste Anual**, **Retificação** e **Buscar por ID** — cada um podendo estar habilitado ou desabilitado conforme a configuração de disponibilidade definida pelos administradores (ver [Disponibilidade](#administração-do-sistema) abaixo). Também há um atalho para **Visualizar parâmetros** e o botão de **Login admin**.

### Ajuste Anual (`/calculo/ajuste-anual`)

1. Informe o ano-calendário e o tipo de declaração (completa ou simplificada).
2. Preencha os dados originais da declaração: rendimentos tributáveis, deduções legais, deduções de incentivo (apenas na declaração completa), imposto sobre RRA, imposto pago/retido e o valor do ajuste anual já apurado na declaração original.
3. Informe as alterações a aplicar (valores a somar/subtrair de rendimentos, deduções, incentivo e RRA).
4. O sistema valida a consistência dos dados informados (o ajuste anual informado deve bater com o que a fórmula calcula a partir dos dados originais) e apresenta o resultado recalculado, com o imposto devido e o valor a pagar/restituir.

### Retificação (`/calculo/retificacao`)

1. Informe os **dados do processo**: número do processo, nome do autor e data do ajuizamento.
2. Escolha o **tipo de correção monetária**: SELIC, SELIC até 06/2009 seguida de rentabilidade da poupança, ou sem correção; informe também o percentual de honorários.
3. Quando há correção, defina se o total deve ser **limitado na data do ajuizamento** ("Limita total na data do ajuizamento") e até quando o cálculo deve ser atualizado ("Atualiza cálculo até").
4. Clique em **Adicionar ano** para incluir cada ano-calendário envolvido: preencha os dados originais da declaração daquele ano e, se necessário, uma ou mais **alterações** (cada uma com data, número de folha opcional, valores a somar/subtrair por rubrica e motivo/observação) — repita para quantos anos forem necessários.
5. Clique em **Simular Retificação** para calcular o resultado consolidado: diferenças por ano, separação entre valores "até a distribuição" e "depois da distribuição", aplicação do teto do RPV quando cabível, e os totais finais de principal devido, juros devidos e total de execução.

### Resultado e Relatório

Após simular um cálculo (Ajuste Anual ou Retificação), o sistema exibe uma tela de **Resultado** com o detalhamento da memória de cálculo. A partir dali é possível gerar o **Relatório**, com a memória de cálculo completa, e exportá-lo/baixá-lo em **PDF** — pronto para juntada ao processo.

### Buscar por ID (`/consulta`)

Informe o ID (UUID) de um cálculo já realizado para abrir diretamente o respectivo relatório e conferir sua autenticidade e integridade.

### Parâmetros (`/parametros`)

Página com três abas:

- **Tabelas** — consulta pública (leitura) de qualquer uma das tabelas auxiliares usadas nos cálculos (parâmetros de IR, faixas de IR, salário mínimo, índices econômicos, taxas históricas, templates de cálculo e regras de sub-período). Em sessão administrativa, a tabela selecionada também pode ser criada, editada ou excluída.
- **Acesso admin** — (visível para qualquer visitante, mas só operável logado) permite a um administrador convidar novos administradores por e-mail e visualizar a lista de administradores ativos e de convites pendentes.
- **Disponibilidade** — permite a um administrador ligar/desligar o sistema inteiro ou, individualmente, os módulos de Ajuste Anual e Retificação para o público.

### Administração do sistema

Consulte a seção [Acesso ao Sistema](#5-acesso-ao-sistema) para o passo a passo de login administrativo, primeiro acesso e convite de novos administradores.

## 4. Referências e materiais relacionados

- **Sistema em produção**: <https://calcjud.vercel.app/>
- **Planilha de Cálculo de Ajuste Anual de IRPF** (DCAL, intranet JFRJ — acesso restrito à rede interna): <https://intranet.jfrj.jus.br/unidade/dcal/planilhas-para-calculo-simples-projef-web/planilha-de-calculo-de-ajuste-anual-de>
- **Planilha de Cálculo de Declaração Anual do Imposto de Renda** (DCAL, intranet JFRJ — acesso restrito à rede interna): <https://intranet.jfrj.jus.br/unidade/dcal/solucoes-para-contadorias/planilha-de-calculo-de-declaracao-anual-do-imposto-de-renda>

> Os links de intranet do TRF2/JFRJ só são acessíveis a partir da rede interna do Tribunal; a descrição do contexto de origem do projeto (seção acima) foi montada a partir de material de levantamento já disponível, que resume o conteúdo dessas mesmas fontes.

## 5. Acesso ao Sistema

O CALCJUD é uma aplicação web publicada como site estático e acessada por navegador — não requer instalação de cliente.

### Acesso público (uso comum)

1. Abra a URL de produção do sistema: <https://calcjud.vercel.app/>.
2. Nenhum login é necessário para realizar cálculos de Ajuste Anual, Retificação, consultar um cálculo por ID ou visualizar os parâmetros fiscais — desde que o respectivo módulo esteja habilitado pela administração (ver [Disponibilidade](#administração-do-sistema)).

### Acesso administrativo

1. Na página inicial (ou na página **Parâmetros**), clique em **Login admin**.
2. Na aba **Entrar**, informe e-mail e senha de uma conta já cadastrada como administradora.
3. Caso seja seu primeiro acesso após ter sido convidado por outro administrador (convite feito na aba **Acesso admin** da página Parâmetros), use a aba **Primeiro acesso**: informe o e-mail convidado e crie uma senha — a conta é ativada automaticamente caso exista um convite pendente para aquele e-mail.
4. Após autenticado, é possível trocar a própria senha na mesma janela de acesso administrativo.
5. Com a sessão administrativa ativa, ficam disponíveis:
   - Edição das tabelas auxiliares na página **Parâmetros** (aba **Tabelas**).
   - Convite de novos administradores e visualização de administradores/convites pendentes (aba **Acesso admin**).
   - Controle de disponibilidade pública do sistema e de cada módulo de cálculo (aba **Disponibilidade**).
