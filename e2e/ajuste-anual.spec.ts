import { test, expect } from "../playwright-fixture";

// Cenario gabarito: mesmos dados de entrada do teste unitario em
// src/test/example.test.ts ("reproduz corretamente o caso de ajuste anual
// de 2020"). Resultado esperado: imposto_a_pagar = 1075 (valor a restituir).
// Serve para conferir, ponta a ponta na interface real, que a tela reproduz
// o mesmo resultado que a formula isolada (calcularAjusteAnual) devolve.
//
// Cada execucao salva os prints e um relatorio .docx em
// src/test/resultados/<nome-do-teste>[-N]/ (ver fixture "snap" em
// ../playwright-fixture.ts).

function labelInput(page: import("@playwright/test").Page, labelText: string) {
  return page.locator(`xpath=//label[normalize-space(text())="${labelText}"]/following-sibling::input`);
}

test("Ajuste Anual 2020 - gabarito do example.test.ts", async ({ page, snap }) => {
  await page.goto("/");
  await snap("Home");

  await page.getByText("Ajuste Anual", { exact: true }).click();
  await expect(page).toHaveURL(/\/calculo\/ajuste-anual$/);

  const anoTrigger = page.locator(
    'xpath=//label[normalize-space(text())="Ano Calendário *"]/following-sibling::button'
  );
  await anoTrigger.waitFor({ state: "visible" });

  await page.getByPlaceholder("0000000-00.0000.0.00.0000").fill("0000000-00.2024.4.02.5101");
  await page.getByPlaceholder("Nome completo").fill("Caso de teste - gabarito Vitest 2020");

  await anoTrigger.click();
  await page.getByRole("option", { name: "2020", exact: true }).click();
  // Selecionar o ano dispara a busca assincrona das faixas de IR daquele ano.
  await page.waitForLoadState("networkidle");

  await labelInput(page, "Rendimentos Tributáveis").fill("100000");
  await labelInput(page, "Deduções Legais").fill("30000");
  await labelInput(page, "Deduções de Incentivo").fill("10000");
  await labelInput(page, "Imposto Pago").fill("3817.68");
  await labelInput(page, "Imposto Devido RRA").fill("5000");
  await labelInput(page, "Ajuste Anual").fill("0");

  await labelInput(page, "Rendimentos a Somar").fill("5000");
  await labelInput(page, "Deduções Legais a Subtrair").fill("2000");
  await labelInput(page, "Deduções Incentivo a Somar").fill("1000");
  await labelInput(page, "Imposto RRA a Subtrair").fill("2000");

  await snap("Formulario preenchido");

  await page.getByRole("button", { name: "Simular Cálculo" }).click();

  await expect(page).toHaveURL(/\/resultado$/);
  await expect(page.getByText("Valor a Restituir")).toBeVisible();
  await expect(page.getByText("R$ 1.075,00", { exact: true })).toBeVisible();

  await snap("Resultado");
});
