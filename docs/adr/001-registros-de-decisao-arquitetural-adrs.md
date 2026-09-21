# ADR 001: Registros de Decisão Arquitetural (ADRs)

## Context

O CalcJud já tinha, em `docs/`, vários documentos que registravam decisões técnicas e correções aplicadas ao sistema (ex.: correção do cálculo de juros SELIC, migração pendente no banco de produção, investigação de credenciais versionadas), cada um com sua própria estrutura e sem convenção de numeração.

## Decision

Toda decisão de arquitetura, correção estrutural ou trade-off técnico relevante do CalcJud passa a ser registrada como um ADR (Architecture Decision Record) em `docs/adr/`, seguindo:

- Nome de arquivo: `NNN-descricao-curta-em-kebab-case.md`, com `NNN` sequencial de 3 dígitos (`000`, `001`, `002`, ...) sem acentos e sempre em minúsculo.
- Conteúdo mínimo: título, data, status (`Proposed` / `Accepted` / `Deprecated` / `Superseded by ADR-NNN`), contexto, decisão e consequências — ver [`docs/adr/template.md`](template.md).
- Um ADR nunca é editado para mudar a decisão em si mesmo, se a decisão muda, cria-se um novo ADR que marca o antigo como `Superseded`.
- Documentos que registram uma **decisão ou correção já tomada** (bugfix, migração, mudança de configuração) viram ADR — essa é a pasta padrão de documentação do projeto. Manuais e guias de referência (sem uma decisão pontual associada) ficam em `docs/reference/`. Investigações e atas de reunião que embasam uma decisão entram como parte do próprio ADR (seção "Context" ou um "Detalhamento" ao final); `docs/history/` fica reservada para arquivos temporários de análise/teste de funcionalidades (uso local, não é onde a documentação permanente do projeto deve morar) — todo o conteúdo que já estava lá foi consolidado em `docs/adr/` em 21/09/2026.

## Consequences

- Toda decisão relevante fica pesquisável e citável (`docs/adr/00X-...`), como parte do contexto carregado.
- Documentos novos de investigação/correção que cheguem a uma decisão devem nascer diretamente em `docs/adr/` no formato do template conforme a estrutura Context/Decision/Consequences, em vez de como um arquivo solto em `docs/`.
