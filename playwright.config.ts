import { defineConfig, devices } from "@playwright/test";

// Por padrao os testes rodam contra o CalcJud em producao (mesmo alvo usado
// nas simulacoes manuais de calculo). Para rodar contra uma copia local
// (`npm run dev`, porta 8080), defina PLAYWRIGHT_BASE_URL antes de chamar
// `npx playwright test`, por exemplo:
//   PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test
export const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://calcjud.vercel.app";

// Config padrao: rapida, headless (usada por `npm run test:e2e`). Para
// acompanhar visualmente a execucao, use playwright.headed.config.ts
// (`npm run test:e2e:headed` ou `npm run test:e2e:ui`) em vez deste.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
