# CalcJud é uma Ferramenta para Cálculos Judiciais

Uma aplicação web para cálculo de ajustes do Imposto de Renda Pessoa Física (IRPF), especificamente projetada para processos judiciais envolvendo ajustes anuais de imposto.

## Funcionalidades

- Cálculos de ajuste anual de imposto (Ajuste Anual)
- Gerenciamento de parâmetros fiscais
- Geração de relatórios e exportação em PDF
- Consulta de cálculos históricos
- Interface responsiva com design moderno

## Tecnologias Utilizadas

- **Frontend**: React 18 com TypeScript
- **Ferramenta de Build**: Vite
- **Estilização**: Tailwind CSS com componentes shadcn/ui
- **Backend**: Supabase
- **Gerenciamento de Estado**: TanStack Query
- **Testes**: Vitest e Playwright
- **Gerenciador de Pacotes**: Bun (`npm` também funciona, via `package-lock.json`)

## Instalação

1. Clone o repositório:
   ```bash
   git clone <url-do-repositório>
   cd judicial-calculator
   ```

2. Instale as dependências:
   ```bash
   bun install      # ou: npm install
   ```
   (Bun precisa estar instalado separadamente — ver [Instalando o Bun](#instalando-o-bun) abaixo.
   Sem ele, use `npm install` normalmente.)

3. Configure as variáveis de ambiente:
   Copie `.env.example` para `.env` e preencha com suas credenciais do Supabase:
   ```bash
   VITE_SUPABASE_PROJECT_ID="seu-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key"
   VITE_SUPABASE_URL="https://seu-project-id.supabase.co"
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   bun run dev      # ou: npm run dev
   ```

   Se aparecer o aviso abaixo, veja [Atualizando o Browserslist](#atualizando-o-browserslist) logo a seguir:
   ```
   Browserslist: browsers data (caniuse-lite) is 15 months old. Please run:
     npx update-browserslist-db@latest
   ```

### Atualizando o Browserslist

O Vite usa a base de dados do [Browserslist](https://github.com/browserslist/browserslist)
(pacote `caniuse-lite`) para decidir, no build, quais navegadores/versões precisam de prefixos CSS
e polyfills — ela vem embutida nas dependências instaladas e vai ficando desatualizada com o tempo,
por isso o aviso aparece mesmo sem nenhuma mudança no código do projeto. Manter essa base atualizada
evita duas coisas: prefixos/polyfills desnecessários para navegadores que já não são mais usados
(aumentando o tamanho do build à toa), e a falta de suporte para navegadores mais novos que surgiram
depois da última atualização. Para corrigir, rode:

```bash
npx update-browserslist-db@latest
```

Isso atualiza a versão do `caniuse-lite` no `package-lock.json` (ou lockfile equivalente); não é
necessário alterar nenhum arquivo de configuração do projeto.

### Instalando o Bun

Opcional — sem o Bun instalado, use `npm` em todos os comandos deste README.

- **Windows (PowerShell)**:
  ```powershell
  powershell -c "irm bun.sh/install.ps1|iex"
  ```
- **macOS/Linux**:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **Alternativa multiplataforma (via npm)**:
  ```bash
  npm install -g bun
  ```

Depois de instalar, feche e abra um novo terminal (o instalador atualiza o `PATH`, mas o terminal
atual não recarrega essa variável sozinho) e confirme com `bun --version`.

## Uso

- Acesse a aplicação em `http://localhost:8080`
- Navegue pelas diferentes seções: Início, Ajuste Anual, Parâmetros, etc.
- Insira os dados fiscais e gere relatórios

## Scripts Disponíveis

(substitua `bun run` por `npm run` se não tiver o Bun instalado)

- `bun run dev` - Inicia o servidor de desenvolvimento
- `bun run build` - Compila para produção
- `bun run test` - Executa os testes
- `bun run lint` - Executa o linter

## Contribuição

1. Faça um fork do repositório
2. Crie uma branch para sua funcionalidade
3. Faça suas alterações
4. Execute os testes
5. Envie um pull request
