# CalcJud — Migração pendente no banco de produção (Supabase)

Tribunal Regional Federal da 2ª Região (TRF2)
04/09/2026

## 1. Contexto

Este documento acompanha `ajuste-dos-testes-03-09-2026.md` (item 2.2 e seção 5,
passo 1). Ele reúne o script de migração pronto para uso e os detalhes
necessários para que um analista com acesso administrativo ao Supabase possa
aplicar a correção com segurança, sem depender de reler a análise completa.

**O que falta aplicar:** a regra de transição UFIR → SELIC de janeiro/1996 foi
corrigida em `supabase/seed_templates_regras.sql` (arquivo de configuração do
repositório), mas o banco de dados de produção ainda tem os templates
cadastrados com a regra antiga. É necessário rodar um ajuste manual —
`UPDATE` + `INSERT` — diretamente na tabela `regras_subperiodo`, pois o script
de seed usa `INSERT ... WHERE NOT EXISTS` e **não substitui** a regra antiga
(ver seção 4 abaixo).

**Urgência:** este item não bloqueia o caso de teste já validado (ano-calendário
1996 usado na confirmação, que começa em maio de 1997 — período posterior à
transição), mas afeta qualquer cálculo real cujo período de referência inclua
janeiro de 1996. Deve ser aplicado antes do deploy para produção mencionado no
passo 3 da seção 5 de `ajuste-dos-testes-03-09-2026.md`.

## 2. O que está errado hoje em produção

A planilha oficial da DCAL aplica correção monetária por UFIR até **01/1996**
(janeiro incluso), com os juros já passando a ser calculados por **SELIC** a
partir desse mesmo mês — ou seja, janeiro/1996 é um mês de transição híbrido
(correção UFIR + juros SELIC).

No banco de produção, a regra de UFIR termina em 12/1995 e a regra seguinte
("só SELIC", sem correção monetária) já começa em **01/1996** — faltando o mês
de transição. Isso foi confirmado consultando a tabela `regras_subperiodo` via
API REST do Supabase (chave anon, somente leitura) em 04/09/2026:

| Template | `ordem` 4 hoje em produção | Esperado após o ajuste |
|---|---|---|
| Template_1 | `1996-01-01 → 2026-04-01`, sem correção monetária, juros SELIC | `1996-01-01 → 1996-01-31`, correção UFIR + juros SELIC (nova `ordem` 4); regra antiga passa a começar em `1996-02-01` como `ordem` 5 |
| Template_2 | `1996-01-01 → 2009-06-30`, sem correção monetária, juros SELIC | mesma mudança acima; `ordem` 5 (POUPANCA/TR, hoje `ordem` 5) passa a `ordem` 6 |

## 3. Configurações de acesso ao banco

Confirmado em `docs/CalcJud_Banco_de_dados.md` (seção 2) e nos arquivos do
repositório:

- **Projeto Supabase de produção:** `xitpsqtcxraejzlxvvmn`
  (`VITE_SUPABASE_URL=https://xitpsqtcxraejzlxvvmn.supabase.co`, em `.env` /
  `.env.example` na raiz do repositório).
- **Chave disponível no repositório:** apenas a chave `anon`/`publishable`
  (`VITE_SUPABASE_PUBLISHABLE_KEY`). Essa chave permite **somente leitura** em
  `regras_subperiodo` — a política RLS `Admin manage regras_subperiodo`
  (`supabase/schema.sql`, linhas 557–561) exige `public.is_admin()` para
  qualquer `INSERT`/`UPDATE`/`DELETE`.
- **Não existem no repositório nem no ambiente local:**
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, senha do usuário
  `postgres`, connection string, nem projeto Supabase linkado via CLI
  (`supabase/config.toml` aponta para `bydirbbhuhihxrgxvrlb`, projeto
  **diferente** do de produção — ver alerta na seção 6).
- **Como obter acesso administrativo real:** o analista responsável precisa
  logar no painel do Supabase (supabase.com/dashboard) com uma conta
  já convidada para a organização do projeto `xitpsqtcxraejzlxvvmn` (ver
  `CalcJud_Banco_de_dados.md`, passo 2: "peça a um administrador atual do
  projeto para adicioná-la em Project Settings → Team"), ou usar a senha do
  usuário `postgres` do banco (Project Settings → Database → Reset database
  password, se necessário redefinir) para conexão direta via `psql`.
- **Alternativa sem acesso ao Supabase:** aplicar via painel administrativo do
  próprio CalcJud (Parâmetros → Tabelas → `regras_subperiodo`), logado como
  administrador do sistema — mais lento por ser manual linha a linha, mas não
  exige credenciais de infraestrutura.
- **Atenção — credencial de bootstrap em texto claro:** `supabase/schema.sql`
  (linhas ~396–472) contém e-mail e senha de um administrador criado no
  processo de instalação do banco. O próprio `CalcJud_Banco_de_dados.md`
  (linha 99) já registra que essa senha deveria ser rotacionada assim que
  possível. Não foi testado se ainda é válida — o analista deve verificar e,
  se ainda ativa, trocá-la pelo painel (Authentication → Users) independente
  deste ajuste.

## 4. Por que não basta rodar o `seed_templates_regras.sql` em produção

O script `supabase/seed_templates_regras.sql` já contém a regra corrigida
(mês de transição 01/1996 com UFIR+SELIC), mas ele só executa
`INSERT ... WHERE NOT EXISTS` — nunca `UPDATE` nem `DELETE`. Rodá-lo direto em
produção **inseriria** a nova regra de 01/1996, mas **não alteraria** a regra
antiga que já começa em 01/1996. O resultado seria dois subperíodos
sobrepostos cobrindo o mesmo mês (janeiro/1996), o que quebraria a lógica de
seleção de subperíodo no cálculo. Por isso o ajuste abaixo precisa ser feito
manualmente com `UPDATE` + `INSERT`, e não pelo script de seed.

## 5. Script de migração pronto para uso

Os UUIDs abaixo foram conferidos contra os dados reais de produção (consulta
de leitura feita com a chave anon em 04/09/2026):

- `templates_calculo.id` de `Template_1` = `b315b844-20b7-4fb5-bc64-1f57d4d2536b`
- `templates_calculo.id` de `Template_2` = `c8bb8a49-84f6-4676-adcb-40f90d501ebd`
- `indices_economicos.id` de `UFIR` = `c253006c-ee58-4bd3-b0ec-460d13de464d`
- `indices_economicos.id` de `SELIC` = `08ae39f9-5290-4fba-a80a-eb0d3edb6750`

```sql
BEGIN;

-- 1) Empurra o início da regra "só SELIC" (sem correção monetária) para
--    02/1996 e reordena (ordem 4 -> 5) nos templates 1 e 2.
UPDATE public.regras_subperiodo r
SET data_inicio_vigencia = '1996-02-01', ordem = 5
FROM public.templates_calculo t
WHERE t.id = r.id_template
  AND t.nome IN ('Template_1', 'Template_2')
  AND r.data_inicio_vigencia = '1996-01-01'
  AND r.aplicar_correcao = false;

-- 2) Insere o mês de transição 01/1996: correção por UFIR, juros por SELIC.
INSERT INTO public.regras_subperiodo
  (id_template, data_inicio_vigencia, data_fim_vigencia,
   id_indice_correcao, id_indice_juros, aplicar_correcao, aplicar_juros, ordem)
SELECT t.id, '1996-01-01', '1996-01-31',
       'c253006c-ee58-4bd3-b0ec-460d13de464d',  -- UFIR
       '08ae39f9-5290-4fba-a80a-eb0d3edb6750',  -- SELIC
       true, true, 4
FROM public.templates_calculo t
WHERE t.nome IN ('Template_1', 'Template_2');

COMMIT;
```

**Nota sobre o Template_2:** a regra de `ordem` 5 já existente nesse template
(POUPANCA/TR, vigente a partir de 2009-07-01) **não é afetada** pelo `UPDATE`
acima, pois o filtro exige `aplicar_correcao = false` e `data_inicio_vigencia
= '1996-01-01'` — mas seu campo `ordem` deixa de ser único junto com a nova
regra 5 criada no passo 1. Isso é esperado e inofensivo: `ordem` não tem
constraint de unicidade na tabela (`supabase/schema.sql`, linhas 98–108); ela
serve apenas para desempate na leitura ordenada dos subperíodos, e as faixas
de data continuam sem sobreposição, que é o que importa para a seleção do
subperíodo correto no cálculo. Ainda assim, se preferir manter a sequência
numérica limpa, renumere manualmente a regra POUPANCA/TR do Template_2 de
`ordem` 5 para `ordem` 6 após rodar o script.

## 6. Checklist para o analista

1. **Confirmar o projeto correto antes de conectar:** produção é
   `xitpsqtcxraejzlxvvmn`. **Não usar** `supabase/config.toml`
   (`bydirbbhuhihxrgxvrlb`) como referência — esse arquivo aponta para um
   projeto diferente e precisa ser corrigido separadamente (risco: alguém
   rodar `supabase db push` e atingir o projeto errado).
2. **Gerar backup manual** antes de aplicar, conforme recomendado em
   `CalcJud_Banco_de_dados.md` (seção sobre backups):
   ```
   pg_dump "postgresql://postgres:[SUA-SENHA]@db.xitpsqtcxraejzlxvvmn.supabase.co:5432/postgres" -F c -f calcjud_backup_AAAAMMDD.dump
   ```
3. **Rodar o script da seção 5** via SQL Editor do painel Supabase (mais
   simples) ou via `psql` com a connection string de Project Settings →
   Database.
4. **Validar o resultado** consultando `regras_subperiodo` (pode ser feito
   até com a chave anon, só leitura):
   - Template_1 e Template_2 devem ter uma regra com
     `data_inicio_vigencia = '1996-01-01'` e `data_fim_vigencia = '1996-01-31'`,
     `id_indice_correcao` = UFIR, `id_indice_juros` = SELIC.
   - A regra "só SELIC" de cada template deve passar a começar em
     `data_inicio_vigencia = '1996-02-01'`.
5. **Recalcular** um caso real com período incluindo janeiro/1996 no CalcJud
   em produção para confirmar que o resultado passou a bater com a planilha
   da DCAL para esse mês específico.
6. **Verificar a credencial de bootstrap** citada na seção 3 acima e rotacionar
   se ainda estiver ativa (fora do escopo direto desta migração, mas
   pendência de segurança já identificada).

## 7. Referências

- `docs/ajuste-dos-testes-03-09-2026.md` — item 2.2 e seção 5 (passo 1):
  descrição original da correção e da pendência.
- `docs/analise-dos-testes-03-09-2026.md` — causa raiz da divergência de
  cálculo que originou toda a investigação.
- `docs/CalcJud_Banco_de_dados.md` — guia geral de acesso, backup e segurança
  do banco de dados do CalcJud.
- `supabase/seed_templates_regras.sql` — script de configuração já corrigido
  (mas não substitui a regra antiga em produção; ver seção 4 acima).
- `supabase/schema.sql` — definição das tabelas `regras_subperiodo`,
  `templates_calculo`, `indices_economicos` e das políticas de RLS.
