/**
 * Serviço de cálculo de IRPF - Ajuste Anual
 * Determinístico e isolado de dependências externas.
 */

export interface FaixaIR {
  ano_calendario: number;
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

export type TipoCorrecao = 'SELIC' | 'SELIC_POUPANCA' | 'SEM_CORRECAO';
export type TipoLimitaAjuiz = 'SIM' | 'NAO';

export interface AlteracaoRetificacao {
  id: string;
  data_alt: string;
  num_folha?: number;
  rend_somar: number;
  rend_sub: number;
  ded_somar: number;
  ded_sub: number;
  incentivo_somar: number;
  incentivo_sub: number;
  rra_somar: number;
  rra_sub: number;
  motivo?: string;
}

export interface DadosEntradaAjusteAnual {
  tipo_declaracao: 'completa' | 'simplificada';
  ano_calendario: number;
  rendimentos_tributaveis: number;
  deducoes_legais: number;
  deducoes_incentivo: number;
  imposto_rra: number;
  ajuste_anual: number;
  imposto_pago: number;
  rend_somar: number;
  rend_sub: number;
  ded_somar: number;
  ded_sub: number;
  incentivo_somar: number;
  incentivo_sub: number;
  rra_somar: number;
  rra_sub: number;
  alteracoes?: AlteracaoRetificacao[];
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

export interface ValidacaoConsistenciaAjusteAnual {
  consistente: boolean;
  imposto_devido_original: number;
  total_informado: number;
  diferenca: number;
}

export interface DadosEntradaRetificacao {
  numero_processo: string;
  nome_autor: string;
  data_ajuizamento: string;
  tipo_correcao: TipoCorrecao;
  percentual_honorarios: number;
  limita_ajuiz?: TipoLimitaAjuiz;
  data_fim?: string;
  informacoes?: string;
  periodos: DadosEntradaAjusteAnual[];
}

export interface PeriodoRetificacao {
  ano_calendario: number;
  tipo_declaracao: 'completa' | 'simplificada';
  resultado: ResultadoCalculo;
  validacao: ValidacaoConsistenciaAjusteAnual;
  valor_devido: number;
  valor_atualizado: number;
}

export interface ResultadoRetificacao {
  periodos: PeriodoRetificacao[];
  total_imposto_a_pagar: number;
  total_imposto_devido_original: number;
  total_imposto_pago: number;
  total_rend_trib_recalc: number;
  total_total_deducoes_recalc: number;
  total_base_calculo_recalc: number;
  total_principal_devido: number;
  total_juros_devido: number;
  total_execucao: number;
}

function normalizarAliquota(aliquota: number): number {
  // Accepts either decimal form (0.275) or percent form (27.5).
  const percentual = aliquota <= 1 ? aliquota * 100 : aliquota;
  return Math.round(percentual * 1000) / 1000;
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

export function validarConsistenciaAjusteAnual(
  impostoDevidoOriginal: number,
  ajusteAnual: number,
  impostoPago: number
): ValidacaoConsistenciaAjusteAnual {
  const total_informado = round2(ajusteAnual + impostoPago);
  const diferenca = round2(impostoDevidoOriginal - total_informado);

  return {
    consistente: Math.abs(diferenca) < 0.01,
    imposto_devido_original: impostoDevidoOriginal,
    total_informado,
    diferenca,
  };
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

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function calcularValoresRetificacao(periodo: PeriodoRetificacao) {
  const valor_devido = round2(Math.max(0, periodo.resultado.imposto_devido - periodo.resultado.alteracoes.imposto_pago.original));
  const valor_atualizado = round2(Math.max(0, periodo.resultado.imposto_a_pagar));

  return { valor_devido, valor_atualizado };
}

function calcularTotaisRetificacao(periodos: PeriodoRetificacao[]) {
  const total_principal_devido = round2(periodos.reduce((sum, periodo) => sum + periodo.valor_devido, 0));
  const total_execucao = round2(periodos.reduce((sum, periodo) => sum + periodo.valor_atualizado, 0));
  const total_juros_devido = round2(total_execucao - total_principal_devido);

  return { total_principal_devido, total_juros_devido, total_execucao };
}

export function calcularRetificacao(
  dados: DadosEntradaRetificacao,
  faixas: FaixaIR[],
  parametros: ParametrosIR[]
): ResultadoRetificacao {
  const periodos: PeriodoRetificacao[] = dados.periodos.map((periodo) => {
    const parametro = parametros.find((p) => p.ano_calendario === periodo.ano_calendario);
    const faixasAno = faixas.filter((f) => f.ano_calendario === periodo.ano_calendario);

    if (!parametro) {
      throw new Error(`Parâmetros não encontrados para o ano ${periodo.ano_calendario}`);
    }

    if (faixasAno.length === 0) {
      throw new Error(`Faixas de IR não encontradas para o ano ${periodo.ano_calendario}`);
    }

    const totals = (periodo.alteracoes ?? []).reduce(
      (acc, item) => ({
        rend_somar: acc.rend_somar + item.rend_somar,
        rend_sub: acc.rend_sub + item.rend_sub,
        ded_somar: acc.ded_somar + item.ded_somar,
        ded_sub: acc.ded_sub + item.ded_sub,
        incentivo_somar: acc.incentivo_somar + item.incentivo_somar,
        incentivo_sub: acc.incentivo_sub + item.incentivo_sub,
        rra_somar: acc.rra_somar + item.rra_somar,
        rra_sub: acc.rra_sub + item.rra_sub,
      }),
      {
        rend_somar: periodo.rend_somar,
        rend_sub: periodo.rend_sub,
        ded_somar: periodo.ded_somar,
        ded_sub: periodo.ded_sub,
        incentivo_somar: periodo.incentivo_somar,
        incentivo_sub: periodo.incentivo_sub,
        rra_somar: periodo.rra_somar,
        rra_sub: periodo.rra_sub,
      }
    );

    const periodoComTotais: DadosEntradaAjusteAnual = {
      ...periodo,
      rend_somar: totals.rend_somar,
      rend_sub: totals.rend_sub,
      ded_somar: totals.ded_somar,
      ded_sub: totals.ded_sub,
      incentivo_somar: totals.incentivo_somar,
      incentivo_sub: totals.incentivo_sub,
      rra_somar: totals.rra_somar,
      rra_sub: totals.rra_sub,
    };

    const resultado = calcularAjusteAnual(periodoComTotais, faixasAno, parametro);
    const validacao = validarConsistenciaAjusteAnual(resultado.imposto_devido, periodo.ajuste_anual, periodo.imposto_pago);
    const { valor_devido, valor_atualizado } = calcularValoresRetificacao({
      ano_calendario: periodo.ano_calendario,
      tipo_declaracao: periodo.tipo_declaracao,
      resultado,
      validacao,
      valor_devido: 0,
      valor_atualizado: 0,
    });

    return {
      ano_calendario: periodo.ano_calendario,
      tipo_declaracao: periodo.tipo_declaracao,
      resultado,
      validacao,
      valor_devido,
      valor_atualizado,
    };
  });

  const { total_principal_devido, total_juros_devido, total_execucao } = calcularTotaisRetificacao(periodos);

  return {
    periodos,
    total_imposto_a_pagar: round2(periodos.reduce((sum, item) => sum + item.resultado.imposto_a_pagar, 0)),
    total_imposto_devido_original: round2(periodos.reduce((sum, item) => sum + item.resultado.imposto_devido, 0)),
    total_imposto_pago: round2(periodos.reduce((sum, item) => sum + item.resultado.alteracoes.imposto_pago.original, 0)),
    total_rend_trib_recalc: round2(periodos.reduce((sum, item) => sum + item.resultado.rend_trib_recalc, 0)),
    total_total_deducoes_recalc: round2(periodos.reduce((sum, item) => sum + item.resultado.total_deducoes_recalc, 0)),
    total_base_calculo_recalc: round2(periodos.reduce((sum, item) => sum + item.resultado.base_calculo_recalc, 0)),
    total_principal_devido,
    total_juros_devido,
    total_execucao,
  };
}
