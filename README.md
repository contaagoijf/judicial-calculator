# Ferramenta para Cálculos Judiciais

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
- **Gerenciador de Pacotes**: Bun

## Instalação

1. Clone o repositório:
   ```bash
   git clone <url-do-repositório>
   cd judicial-calculator
   ```

2. Instale as dependências:
   ```bash
   bun install
   ```

3. Configure as variáveis de ambiente:
   Copie `.env.example` para `.env` e preencha com suas credenciais do Supabase:
   ```bash
   VITE_SUPABASE_PROJECT_ID="seu-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key"
   VITE_SUPABASE_URL="https://seu-project-id.supabase.co"
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   bun run dev
   ```

## Uso

- Acesse a aplicação em `http://localhost:5173`
- Navegue pelas diferentes seções: Início, Ajuste Anual, Parâmetros, etc.
- Insira os dados fiscais e gere relatórios

## Scripts Disponíveis

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

## Licença

[Adicione a licença se aplicável]
