# AGENTS.md — O cérebro do projeto CalcJud

> Este arquivo é o primeiro documento que qualquer agente de IA (Claude Code, Cursor, Copilot, etc.) deve ler antes de tocar em código. Estrutura adaptada do template [`projeto-padrao`](https://github.com/marciorbarcellos/projeto-padrao) para o CalcJud, um projeto **já em produção**.

## 0. Contexto crítico: produção sem staging

**Todo push para `main` dispara deploy automático em produção** (`calcjud.vercel.app`, via Vercel), lendo direto do mesmo banco Supabase de produção, não existe ambiente de staging. Por isso:

- Nenhuma mudança de código vai para `main` sem ter sido testada localmente (`npm run dev` / `npm run test` / `npm run test:e2e`).
- Mudanças que dependem de variáveis de ambiente novas no Vercel (ver [ADR 010](docs/adr/010-migrar-credenciais-versionadas-para-variaveis-de-ambiente.md)) só entram em código depois que a variável já existe no painel do Vercel, nunca antes.
- Migrações de banco (`supabase/migrations/`, `supabase/schema.sql`, `supabase/seed*.sql`) não se aplicam sozinhas ao banco de produção — see [Comandos do projeto](#5-comandos-do-projeto) e [ADR 008](docs/adr/008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md) para o processo manual hoje em uso.
- Documentos Word/PDF (`.docx`/`.txt`/`.pdf`) nunca são versionados — ver [`docs/README.md#regras-de-versionamento-git`](docs/README.md#regras-de-versionamento-git).

## 1. Antes de qualquer código: Spec primeiro

Tarefas não triviais começam com uma spec curta em `docs/specs/` (ver [`docs/specs/000-template-spec.md`](docs/specs/000-template-spec.md)) contendo Intenção, Contexto, Restrições, Critérios de aceite e Fora de escopo. Tarefas triviais (typo, texto de UI, ajuste de log) não exigem spec — use julgamento.

## 2. Onde o agente busca contexto (nesta ordem)

1. **Este arquivo (`AGENTS.md`)** — visão geral, comandos, convenções globais.
2. **[`docs/adr/`](docs/adr/)** — decisões de arquitetura e correções já tomadas, numeradas. Comece por [`docs/adr/001-registros-de-decisao-arquitetural-adrs.md`](docs/adr/001-registros-de-decisao-arquitetural-adrs.md). Se a tarefa esbarra numa decisão registrada, ela prevalece até virar um novo ADR que a substitua.
3. **[`docs/README.md`](docs/README.md)** — manual funcional e técnico completo do sistema (contexto, telas, arquitetura, banco de dados, testes, deploy, glossário).
4. **[`docs/reference/`](docs/reference/)** — planilhas de referência da DCAL (`planilhas/`). Os manuais operacionais que viviam aqui (banco de dados, atualização de taxas, guia de testes de cálculo) foram reorganizados para `docs/adr/002` a `006`.
5. **`docs/specs/`** — a spec da tarefa atual, se houver.
6. **[`docs/CHANGELOG.md`](docs/CHANGELOG.md)** — histórico cronológico do que já foi corrigido/implementado; útil para não repetir uma investigação já feita.

## 3. O ciclo de desenvolvimento

```
Spec/Planner → Agente → Testes/Lint locais → Revisão/Aprovação → Push em main → Deploy automático (Vercel)
```

Como não há staging, "Testes/Lint locais" e "Revisão/Aprovação" são as únicas travas antes de produção — ver [seção 0](#0-contexto-crítico-produção-sem-staging).

## 4. Toda decisão relevante é um ADR

Decisões de arquitetura, correção estrutural ou trade-off técnico relevante viram um ADR numerado em `docs/adr/`, seguindo `NNN-descricao-curta-em-kebab-case.md` a partir de [`docs/adr/template.md`](docs/adr/template.md) — ver [ADR 001](docs/adr/001-registros-de-decisao-arquitetural-adrs.md) para o critério de quando algo vira ADR (decisão/correção) vs. quando fica em `docs/reference/` (manual) ou `docs/history/` (investigação/ata sem decisão formal).

## 5. Comandos do projeto

| Ação | Comando |
|---|---|
| Instalar dependências | `bun install` (ou `npm install`) |
| Rodar em desenvolvimento | `bun run dev` (ou `npm run dev`) — sobe em `http://localhost:8080` |
| Rodar testes unitários | `npm run test` (Vitest) — `npm run test:watch` para modo interativo |
| Rodar testes end-to-end | `npm run test:e2e` (Playwright) |
| Lint | `npm run lint` (ESLint) |
| Type-check | `npx tsc --noEmit` |
| Build | `npm run build` |
| Configurar ambiente local | `cp .env.example .env` e preencha com credenciais do projeto Supabase (ver [`docs/adr/003-calcjud_banco_de_dados.md`](docs/adr/003-calcjud_banco_de_dados.md)) |
| Aplicar migração no banco de produção | Manual, via SQL Editor do Supabase ou `psql` — não há pipeline automático hoje; ver [ADR 008](docs/adr/008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md) para o processo e os riscos |

## 6. Convenções globais

- Commits pequenos e atômicos, mensagem no imperativo, um propósito por commit.
- Mensagens de commit explicam o **porquê**, não o **o quê** (o diff já mostra o que mudou).
- Nunca commitar segredos, chaves ou `.env` — ver [ADR 010](docs/adr/010-migrar-credenciais-versionadas-para-variaveis-de-ambiente.md) para o estado atual (ainda pendente) de credenciais neste projeto.
- Nunca commitar `.docx`/`.pdf`/`.txt` — já aplicado em `.gitignore` (exceto `public/robots.txt`); gere a versão equivalente em Markdown se precisar de um registro versionado.
- Em qualquer documentação do projeto (`docs/`, `AGENTS.md`, mensagens de commit, chamados etc.), use sempre **"contadoria"**, nunca **"contador"**, ao se referir à área/equipe que usa e valida os cálculos do CalcJud (DCAL/AGOI). Vale tanto para texto novo quanto ao editar texto existente que ainda diga "contador".
- Toda dúvida sobre "como fazer X neste projeto" deve primeiro ser respondida por um arquivo em `docs/adr/` ou `docs/reference/`. Se a resposta não existe, o passo seguinte é criar o arquivo — não decidir de forma implícita e silenciosa.

## 7. Estrutura de `docs/`

Ver [`docs/README.md#estrutura-da-documentação`](docs/README.md#estrutura-da-documentação) para o detalhe de `docs/adr/`, `docs/specs/`, `docs/reference/`, `docs/history/` e `docs/CHANGELOG.md`.

## 8. Skills de agente

- [`.agents/skill/chamados/SKILL.md`](.agents/skill/chamados/SKILL.md) — skill livre de projeto que traduz um período de trabalho (a partir do histórico de commits de qualquer repositório indicado) para o esquema de chamados do TRF2. Não é específica do CalcJud.
