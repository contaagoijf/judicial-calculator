/**
 * Serviço de cálculo de IRPF - Ajuste Anual
 * Determinístico e isolado de dependências externas.
 */

export interface FaixaIR {
  limite_inferior: number;
  limite_superior: number | null;
  aliquota: number; // percentage, e.g. 7.5
  deducao: number;
}

export interface ParametrosIR {
  ano_calendario: number;
  teto: number;
  inicio_correcao: string;
}

export interface DadosEntradaAjusteAnual {
  tipo_declaracao: 'completa' | 'simplificada';
  ano_calendario: number;
  rendimentos_tributaveis: number;
  deducoes_legais: number;
  deducoes_incentivo: number;
  imposto_rra: number;
  imposto_pago: number;
  rend_somar: number;
  rend_sub: number;
  ded_somar: number;
  ded_sub: number;
  incentivo_somar: number;
  incentivo_sub: number;
  rra_somar: number;
  rra_sub: number;
}

export interface ResultadoCalculo {
  // Original
  teto: number;
  total_deducoes: number;
  base_calculo: number;
  aliquota_inicial: number;
  deducao_inicial: number;
  imposto_devido: number;
  
  // Recalculado
  rend_trib_recalc: number;
  total_deducoes_recalc: number;
  base_calculo_recalc: number;
  aliquota_recalc: number;
  deducao_recalc: number;
  imposto_rra_recalc: number;
  incentivo_recalc: number;
  imposto_devido_recalc: number;
  imposto_a_pagar: number;

  // Tabela de alterações
  alteracoes: {
    rendimentos: { original: number; acrescimo: number; decrescimo: number; recalculado: number };
    deducoes: { original: number; acrescimo: number; decrescimo: number; recalculado: number };
    incentivo: { original: number; acrescimo: number; decrescimo: number; recalculado: number };
    rra: { original: number; acrescimo: number; decrescimo: number; recalculado: number };
    imposto_pago: { original: number; acrescimo: number; decrescimo: number; recalculado: number };
  };
}

function normalizarAliquota(aliquota: number): number {
  // Accepts either decimal form (0.275) or percent form (27.5).
  return aliquota <= 1 ? aliquota * 100 : aliquota;
}

function buscarFaixa(baseCalculo: number, faixas: FaixaIR[]): { aliquota: number; deducao: number } {
  // Sort faixas by limite_inferior
  const sorted = [...faixas].sort((a, b) => a.limite_inferior - b.limite_inferior);
  
  for (const faixa of sorted) {
    const limSup = faixa.limite_superior;
    if (limSup === null || baseCalculo <= limSup) {
      if (baseCalculo >= faixa.limite_inferior) {
        return { aliquota: normalizarAliquota(faixa.aliquota), deducao: faixa.deducao };
      }
    }
  }
  
  // Fallback: first bracket (isento)
  return { aliquota: 0, deducao: 0 };
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function calcularAjusteAnual(
  dados: DadosEntradaAjusteAnual,
  faixas: FaixaIR[],
  parametros: ParametrosIR
): ResultadoCalculo {
  const isSimplificada = dados.tipo_declaracao === 'simplificada';
  const teto = parametros.teto;

  // --- CÁLCULO ORIGINAL ---
  const total_deducoes = isSimplificada
    ? round2(Math.min(0.2 * dados.rendimentos_tributaveis, teto))
    : round2(dados.deducoes_legais);

  const base_calculo = round2(Math.max(0, dados.rendimentos_tributaveis - total_deducoes));

  const { aliquota: aliquota_inicial, deducao: deducao_inicial } = buscarFaixa(base_calculo, faixas);

  const deducoes_incentivo_orig = isSimplificada ? 0 : dados.deducoes_incentivo;

  const imposto_devido = round2(Math.max(0,
    (base_calculo * aliquota_inicial / 100) - deducao_inicial - deducoes_incentivo_orig + dados.imposto_rra
  ));

  // --- CÁLCULO RECALCULADO ---
  const rend_trib_recalc = round2(dados.rendimentos_tributaveis + dados.rend_somar - dados.rend_sub);

  const total_deducoes_recalc = isSimplificada
    ? round2(Math.min(0.2 * rend_trib_recalc, teto))
    : round2(dados.deducoes_legais + dados.ded_somar - dados.ded_sub);

  const base_calculo_recalc = round2(Math.max(0, rend_trib_recalc - total_deducoes_recalc));

  const { aliquota: aliquota_recalc, deducao: deducao_recalc } = buscarFaixa(base_calculo_recalc, faixas);

  const imposto_rra_recalc = round2(dados.imposto_rra + dados.rra_somar - dados.rra_sub);

  const incentivo_recalc = isSimplificada
    ? 0
    : round2(dados.deducoes_incentivo + dados.incentivo_somar - dados.incentivo_sub);

  const imposto_devido_recalc = round2(Math.max(0,
    (base_calculo_recalc * aliquota_recalc / 100) - deducao_recalc - incentivo_recalc + imposto_rra_recalc
  ));

  const imposto_a_pagar = round2(dados.imposto_pago - imposto_devido_recalc);

  // Tabela de alterações
  const alteracoes = {
    rendimentos: {
      original: dados.rendimentos_tributaveis,
      acrescimo: dados.rend_somar,
      decrescimo: dados.rend_sub,
      recalculado: rend_trib_recalc
    },
    deducoes: {
      original: isSimplificada ? total_deducoes : dados.deducoes_legais,
      acrescimo: isSimplificada ? 0 : dados.ded_somar,
      decrescimo: isSimplificada ? 0 : dados.ded_sub,
      recalculado: total_deducoes_recalc
    },
    incentivo: {
      original: isSimplificada ? 0 : dados.deducoes_incentivo,
      acrescimo: isSimplificada ? 0 : dados.incentivo_somar,
      decrescimo: isSimplificada ? 0 : dados.incentivo_sub,
      recalculado: incentivo_recalc
    },
    rra: {
      original: dados.imposto_rra,
      acrescimo: dados.rra_somar,
      decrescimo: dados.rra_sub,
      recalculado: imposto_rra_recalc
    },
    imposto_pago: {
      original: dados.imposto_pago,
      acrescimo: 0,
      decrescimo: 0,
      recalculado: dados.imposto_pago
    }
  };

  return {
    teto,
    total_deducoes,
    base_calculo,
    aliquota_inicial,
    deducao_inicial,
    imposto_devido,
    rend_trib_recalc,
    total_deducoes_recalc,
    base_calculo_recalc,
    aliquota_recalc,
    deducao_recalc,
    imposto_rra_recalc,
    incentivo_recalc,
    imposto_devido_recalc,
    imposto_a_pagar,
    alteracoes
  };
}
