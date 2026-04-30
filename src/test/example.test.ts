import { describe, expect, it } from "vitest";
import {
  calcularAjusteAnual,
  calcularRetificacao,
  validarConsistenciaAjusteAnual,
  type DadosEntradaAjusteAnual,
  type DadosEntradaRetificacao,
  type FaixaIR,
  type ParametrosIR
} from "@/services/calculoIRPF";

describe("calcularAjusteAnual", () => {
  it("reproduz corretamente o caso de ajuste anual de 2020", () => {
    const dados: DadosEntradaAjusteAnual = {
      tipo_declaracao: "completa",
      ano_calendario: 2020,
      rendimentos_tributaveis: 100000,
      deducoes_legais: 30000,
      deducoes_incentivo: 10000,
      imposto_rra: 5000,
      ajuste_anual: 0,
      imposto_pago: 3817.68,
      rend_somar: 5000,
      rend_sub: 0,
      ded_somar: 0,
      ded_sub: 2000,
      incentivo_somar: 1000,
      incentivo_sub: 0,
      rra_somar: 0,
      rra_sub: 2000,
    };

    const faixas: FaixaIR[] = [
      { ano_calendario: 2020, limite_inferior: 0, limite_superior: 22847.76, aliquota: 0, deducao: 0 },
      { ano_calendario: 2020, limite_inferior: 22847.77, limite_superior: 33919.8, aliquota: 0.075, deducao: 1713.58 },
      { ano_calendario: 2020, limite_inferior: 33919.81, limite_superior: 45012.6, aliquota: 0.15, deducao: 4257.57 },
      { ano_calendario: 2020, limite_inferior: 45012.61, limite_superior: 55976.15, aliquota: 0.225, deducao: 7633.51 },
      { ano_calendario: 2020, limite_inferior: 55976.16, limite_superior: null, aliquota: 0.275, deducao: 10432.32 },
    ];

    const parametros: ParametrosIR = {
      ano_calendario: 2020,
      teto: 16754.34,
      inicio_correcao: "2021-06-01",
    };

    const resultado = calcularAjusteAnual(dados, faixas, parametros);

    expect(resultado.rend_trib_recalc).toBe(105000);
    expect(resultado.total_deducoes_recalc).toBe(28000);
    expect(resultado.base_calculo_recalc).toBe(77000);
    expect(resultado.aliquota_recalc).toBe(27.5);
    expect(resultado.deducao_recalc).toBe(10432.32);
    expect(resultado.incentivo_recalc).toBe(11000);
    expect(resultado.imposto_rra_recalc).toBe(3000);
    expect(resultado.imposto_devido_recalc).toBe(2742.68);
    expect(resultado.imposto_a_pagar).toBe(1075);
  });

  it("valida a consistência entre imposto devido original, ajuste anual e imposto pago", () => {
    const validacao = validarConsistenciaAjusteAnual(3817.68, 0, 3817.68);

    expect(validacao.consistente).toBe(true);
    expect(validacao.total_informado).toBe(3817.68);
    expect(validacao.diferenca).toBe(0);
  });

  it("identifica inconsistência quando ajuste anual e imposto pago não fecham com o imposto devido original", () => {
    const validacao = validarConsistenciaAjusteAnual(3817.68, 100, 3817.68);

    expect(validacao.consistente).toBe(false);
    expect(validacao.total_informado).toBe(3917.68);
    expect(validacao.diferenca).toBe(-100);
  });
});

describe("calcularRetificacao", () => {
  it("agrega corretamente resultados de mais de um ano", () => {
    const periodo1: DadosEntradaAjusteAnual = {
      tipo_declaracao: "completa",
      ano_calendario: 2020,
      rendimentos_tributaveis: 100000,
      deducoes_legais: 30000,
      deducoes_incentivo: 10000,
      imposto_rra: 5000,
      ajuste_anual: 0,
      imposto_pago: 3817.68,
      rend_somar: 5000,
      rend_sub: 0,
      ded_somar: 0,
      ded_sub: 2000,
      incentivo_somar: 1000,
      incentivo_sub: 0,
      rra_somar: 0,
      rra_sub: 2000,
    };

    const periodo2: DadosEntradaAjusteAnual = {
      tipo_declaracao: "simplificada",
      ano_calendario: 2021,
      rendimentos_tributaveis: 50000,
      deducoes_legais: 0,
      deducoes_incentivo: 0,
      imposto_rra: 0,
      ajuste_anual: 0,
      imposto_pago: 1742.43,
      rend_somar: 0,
      rend_sub: 0,
      ded_somar: 0,
      ded_sub: 0,
      incentivo_somar: 0,
      incentivo_sub: 0,
      rra_somar: 0,
      rra_sub: 0,
    };

    const faixas: FaixaIR[] = [
      { ano_calendario: 2020, limite_inferior: 0, limite_superior: 22847.76, aliquota: 0, deducao: 0 },
      { ano_calendario: 2020, limite_inferior: 22847.77, limite_superior: 33919.8, aliquota: 0.075, deducao: 1713.58 },
      { ano_calendario: 2020, limite_inferior: 33919.81, limite_superior: 45012.6, aliquota: 0.15, deducao: 4257.57 },
      { ano_calendario: 2020, limite_inferior: 45012.61, limite_superior: 55976.15, aliquota: 0.225, deducao: 7633.51 },
      { ano_calendario: 2020, limite_inferior: 55976.16, limite_superior: null, aliquota: 0.275, deducao: 10432.32 },
      { ano_calendario: 2021, limite_inferior: 0, limite_superior: 22847.76, aliquota: 0, deducao: 0 },
      { ano_calendario: 2021, limite_inferior: 22847.77, limite_superior: 33919.8, aliquota: 0.075, deducao: 1713.58 },
      { ano_calendario: 2021, limite_inferior: 33919.81, limite_superior: 45012.6, aliquota: 0.15, deducao: 4257.57 },
      { ano_calendario: 2021, limite_inferior: 45012.61, limite_superior: 55976.15, aliquota: 0.225, deducao: 7633.51 },
      { ano_calendario: 2021, limite_inferior: 55976.16, limite_superior: null, aliquota: 0.275, deducao: 10432.32 },
    ];

    const parametros: ParametrosIR[] = [
      { ano_calendario: 2020, teto: 16754.34, inicio_correcao: '2021-06-01' },
      { ano_calendario: 2021, teto: 16754.34, inicio_correcao: '2022-06-01' },
    ];

    const resultado = calcularRetificacao(
      {
        numero_processo: 'X', nome_autor: 'Y', data_ajuizamento: '2024-01-15',
        tipo_correcao: 'SEM_CORRECAO', percentual_honorarios: 0,
        periodos: [periodo1, periodo2],
      },
      { faixas, parametros, salariosMinimos: [{ data_ref: '2024-01-01', valor: 1412 }], indices: [], taxas: [], templates: [], regras: [] },
    );

    expect(resultado.total_imposto_a_pagar).toBe(1075);
    expect(resultado.total_imposto_devido_original).toBe(5560.11);
    expect(resultado.periodos).toHaveLength(2);
    expect(resultado.periodos[0].validacao.consistente).toBe(true);
    expect(resultado.periodos[1].validacao.consistente).toBe(true);
  });
});
