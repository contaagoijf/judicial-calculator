import { defineConfig, devices } from "@playwright/test";
import baseConfig, { baseURL } from "./playwright.config";

// Config para acompanhar os testes ao vivo no navegador:
// `npm run test:e2e:headed` (janela maximizada, acoes mais lentas) ou
// `npm run test:e2e:ui` (interface do Playwright, com timeline/replay).
//
// Um arquivo separado (em vez de detectar --headed dentro de
// playwright.config.ts) porque o Playwright reavalia o config num processo
// worker que nao recebe os mesmos argumentos de linha de comando do
// processo principal — checar `process.argv` la dentro nao funciona.
export default defineConfig(baseConfig, {
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // viewport: null => usa o tamanho real da janela do navegador em
        // vez de um viewport fixo; necessario para a janela maximizada
        // (--start-maximized) preencher a tela de fato.
        viewport: null,
        // deviceScaleFactor do preset "Desktop Chrome" nao e compativel com
        // viewport: null - precisa ser removido explicitamente tambem.
        deviceScaleFactor: undefined,
        launchOptions: {
          slowMo: 600,
          args: ["--start-maximized"],
        },
        // Fixture customizada (playwright-fixture.ts): mantem a janela
        // aberta por 8s apos o teste terminar, para dar tempo de ver o
        // resultado final antes de fechar.
        holdOpenMs: 8000,
      },
    },
  ],
});
