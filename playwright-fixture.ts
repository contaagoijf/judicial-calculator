// Fixture base do @playwright/test, estendida com utilitarios usados pelos
// testes e2e deste projeto:
//   - holdOpenMs: mantem a janela do navegador aberta por alguns segundos
//     apos o teste terminar (util em modo headed, para dar tempo de ver o
//     resultado antes de fechar). Configurado por projeto em
//     playwright.headed.config.ts.
//   - snap(label): tira um print numerado da pagina e guarda na pasta de
//     resultados do teste (src/test/resultados/<nome-do-teste>[-N]/). Ao
//     final do teste, gera automaticamente um relatorio .docx nessa mesma
//     pasta com todos os prints e os detalhes da execucao.
import fs from "node:fs";
import path from "node:path";
import { test as base, expect } from "@playwright/test";
import { buildReportDocx, type Shot } from "./e2e/docx-report";

const RESULTS_ROOT = path.resolve(process.cwd(), "src/test/resultados");

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

/** Cria (e retorna) a pasta de resultados do teste, adicionando um sufixo
 * numerico sequencial se ja existir uma pasta com o mesmo nome. */
function makeResultsDir(testTitle: string): string {
  fs.mkdirSync(RESULTS_ROOT, { recursive: true });
  const slug = slugify(testTitle) || "teste";
  let candidate = slug;
  let n = 1;
  while (fs.existsSync(path.join(RESULTS_ROOT, candidate))) {
    n += 1;
    candidate = `${slug}-${n}`;
  }
  const dir = path.join(RESULTS_ROOT, candidate);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

type Fixtures = {
  holdOpenMs: number;
  resultsDir: string;
  snap: (label: string) => Promise<void>;
  keepBrowserOpen: void;
};

export const test = base.extend<Fixtures>({
  holdOpenMs: [0, { option: true }],

  resultsDir: async ({}, use, testInfo) => {
    const dir = makeResultsDir(testInfo.title);
    await use(dir);
  },

  snap: async ({ page, resultsDir }, use, testInfo) => {
    const shots: Shot[] = [];

    const snapFn = async (label: string) => {
      const idx = shots.length + 1;
      const filename = `${String(idx).padStart(2, "0")}-${slugify(label) || "print"}.png`;
      await page.screenshot({ path: path.join(resultsDir, filename), fullPage: true });
      shots.push({ label, file: filename });
    };

    await use(snapFn);

    // Teardown: gera o relatorio .docx com os detalhes e os prints do teste,
    // rodando depois do corpo do teste (status/duracao ja disponiveis).
    await buildReportDocx({
      outPath: path.join(resultsDir, `${path.basename(resultsDir)}.docx`),
      resultsDir,
      testTitle: testInfo.title,
      status: testInfo.status ?? "unknown",
      durationMs: testInfo.duration,
      baseURL: testInfo.project.use.baseURL as string | undefined,
      shots,
      error: testInfo.errors[0]?.message,
    });
  },

  // Fixture "auto": nao precisa ser pedida explicitamente pelo teste, so
  // existe pelo efeito colateral no teardown (segurar a janela aberta).
  keepBrowserOpen: [
    async ({ page, holdOpenMs }, use) => {
      await use();
      if (holdOpenMs > 0) {
        await page.waitForTimeout(holdOpenMs);
      }
    },
    { auto: true },
  ],
});

export { expect };
