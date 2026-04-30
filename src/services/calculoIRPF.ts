/**
 * Serviço de cálculo de IRPF — Ajuste Anual e Retificação.
 *
 * A retificação segue exatamente as regras descritas no documento
 * "Ferramenta de apoio para cálculos judiciais — Retificação" (PRD).
 *
 * O serviço é determinístico: dadas as mesmas entradas (dados, faixas,
 * parâmetros e contexto de correção/juros), os resultados são iguais.
 */

// ============================================================================
// Tipos básicos / parâmetros
// ============================================================================

export interface FaixaIR {
  ano_calendario: number;
  limite_inferior: number;
  limite_superior: number | null;
  aliquota: number; // percentual (ex.: 27.5) ou decimal (0.275) - normalizado
  deducao: number;
}

export interface ParametrosIR {
  ano_calendario: number;
  teto: number;
  inicio_correcao: string; // ISO date
}

export type TipoCorrecao = 'SELIC' | 'SELIC_POUPANCA' | 'SEM_CORRECAO';
export type TipoLimitaAjuiz = 'SIM' | 'NAO';
export type TipoDeclaracao = 'completa' | 'simplificada';

// ----- Tabelas auxiliares (banco externo) ------------------------------------

export interface SalarioMinimo {
  data_ref: string; // ISO date
  valor: number;
}

export interface IndiceEconomico {
  id: string;
  sigla: string;
  descricao: string;
  natureza: 'CORRECAO' | 'JUROS';
}

export interface TaxaHistorica {
  id_indice: string;
  data_referencia: string; // ISO date
  valor_percentual: number;
  fator_multiplicador: number;
  fator_acumulado: number;
}

export interface TemplateCalculo {
  id: string;
  nome: string; // 'Template_1' | 'Template_2' | 'Template_3'
}

export interface RegraSubperiodo {
  id_template: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  id_indice_correcao: string | null;
  id_indice_juros: string | null;
  aplicar_correcao: boolean;
  aplicar_juros: boolean;
}

export interface ContextoCalculo {
  faixas: FaixaIR[];
  parametros: ParametrosIR[];
  salariosMinimos: SalarioMinimo[];
  indices: IndiceEconomico[];
  taxas: TaxaHistorica[];
  templates: TemplateCalculo[];
  regras: RegraSubperiodo[];
}

// ============================================================================
// Tipos: Ajuste Anual (mantidos para compatibilidade com a tela de Ajuste Anual)
// ============================================================================

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
  tipo_declaracao: TipoDeclaracao;
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
  teto: number;
  total_deducoes: number;
  base_calculo: number;
  aliquota_inicial: number;
  deducao_inicial: number;
  imposto_devido: number;

  rend_trib_recalc: number;
  total_deducoes_recalc: number;
  base_calculo_recalc: number;
  aliquota_recalc: number;
  deducao_recalc: number;
  imposto_rra_recalc: number;
  incentivo_recalc: number;
  imposto_devido_recalc: number;
  imposto_a_pagar: number;

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

// ============================================================================
// Helpers numéricos
// ============================================================================

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function round8(val: number): number {
  return Math.round(val * 1e8) / 1e8;
}

function normalizarAliquota(aliquota: number): number {
  const percentual = aliquota <= 1 ? aliquota * 100 : aliquota;
  return Math.round(percentual * 1000) / 1000;
}

function buscarFaixa(baseCalculo: number, faixas: FaixaIR[]): { aliquota: number; deducao: number } {
  const sorted = [...faixas].sort((a, b) => a.limite_inferior - b.limite_inferior);
  for (const faixa of sorted) {
    const limSup = faixa.limite_superior;
    if ((limSup === null || baseCalculo <= limSup) && baseCalculo >= faixa.limite_inferior) {
      return { aliquota: normalizarAliquota(faixa.aliquota), deducao: faixa.deducao };
    }
  }
  return { aliquota: 0, deducao: 0 };
}

// ============================================================================
// Ajuste Anual (cálculo individual de um ano) — usado também como base na Retif.
// ============================================================================

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

  const total_deducoes = isSimplificada
    ? round2(Math.min(0.2 * dados.rendimentos_tributaveis, teto))
    : round2(dados.deducoes_legais);

  const base_calculo = round2(Math.max(0, dados.rendimentos_tributaveis - total_deducoes));
  const { aliquota: aliquota_inicial, deducao: deducao_inicial } = buscarFaixa(base_calculo, faixas);
  const deducoes_incentivo_orig = isSimplificada ? 0 : dados.deducoes_incentivo;

  const imposto_devido = round2(Math.max(0,
    (base_calculo * aliquota_inicial / 100) - deducao_inicial - deducoes_incentivo_orig + dados.imposto_rra
  ));

  // Recalculado
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

  const alteracoes = {
    rendimentos: { original: dados.rendimentos_tributaveis, acrescimo: dados.rend_somar, decrescimo: dados.rend_sub, recalculado: rend_trib_recalc },
    deducoes: {
      original: isSimplificada ? total_deducoes : dados.deducoes_legais,
      acrescimo: isSimplificada ? 0 : dados.ded_somar,
      decrescimo: isSimplificada ? 0 : dados.ded_sub,
      recalculado: total_deducoes_recalc,
    },
    incentivo: {
      original: isSimplificada ? 0 : dados.deducoes_incentivo,
      acrescimo: isSimplificada ? 0 : dados.incentivo_somar,
      decrescimo: isSimplificada ? 0 : dados.incentivo_sub,
      recalculado: incentivo_recalc,
    },
    rra: { original: dados.imposto_rra, acrescimo: dados.rra_somar, decrescimo: dados.rra_sub, recalculado: imposto_rra_recalc },
    imposto_pago: { original: dados.imposto_pago, acrescimo: 0, decrescimo: 0, recalculado: dados.imposto_pago },
  };

  return {
    teto, total_deducoes, base_calculo, aliquota_inicial, deducao_inicial, imposto_devido,
    rend_trib_recalc, total_deducoes_recalc, base_calculo_recalc, aliquota_recalc, deducao_recalc,
    imposto_rra_recalc, incentivo_recalc, imposto_devido_recalc, imposto_a_pagar, alteracoes,
  };
}

// ============================================================================
// Retificação (multi-ano com correção/juros)
// ============================================================================

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

/** Linha de cálculo por ano (corresponde às tabelas C do PDF). */
export interface LinhaAnoRetificacao {
  ano_calendario: number;
  tipo_declaracao: TipoDeclaracao;
  inicio_correcao: string;          // INICIO_CORRECAO
  total_devido: number;             // TOTAL_DEVIDO  (AJUSTE_ANUAL_NOVO - AJUSTE_ANUAL_ORIGINAL_CALC)
  valor_ref: number;                // VALOR_REF
  total_devido_ii: number;          // TOTAL_DEVIDO_II
  valor_devido: number;             // |TOTAL_DEVIDO_II|
  usa_data_ad: 0 | 1;               // USA_DATA_AD
  fator_cm: number;                 // FATOR_CM (coeficiente atualização)
  valor_cm: number;                 // VALOR_CM (diferença atualizada)
  fator_juros: number;              // FATOR_JUROS
  valor_juros: number;              // VALOR_JUROS
  total_com_juros: number;          // TOTAL_COM_JUROS
  /** Alias de `total_com_juros` mantido p/ compat com telas antigas. */
  valor_atualizado: number;
  resultado: ResultadoCalculo;      // memória de cálculo IRPF do ano
  validacao: ValidacaoConsistenciaAjusteAnual;
}

export interface ResultadoRetificacao {
  // Parâmetros gerais
  data_dist: string;                // DATA_DIST
  atualiza_calculo: boolean;        // ATUALIZA_CALCULO
  salario_min: number;              // SALARIO_MIN
  val_teto: number;                 // VAL_TETO
  id_template: string | null;       // ID_TEMPLATE
  juros_dist: number;
  juros_fim: number;
  cm_dist: number;
  cm_fim: number;

  // Linhas por ano
  linhas_ad: LinhaAnoRetificacao[];   // anos com USA_DATA_AD = 1
  linhas_pos: LinhaAnoRetificacao[];  // anos com USA_DATA_AD = 0

  // Totais antes da distribuição
  total_cm_dif_ad: number;
  total_juros_dif_ad: number;
  totais_dif_ad: number;
  total_principal_ad: number;
  total_juros_ad: number;
  total_devido_ad: number;

  // Atualização principal/juros até DATA_FIM
  fator_cm_fim: number;
  principal_ad: number;
  fator_juros_fim: number;
  juros_ad: number;
  principal_juros_ad: number;

  // Totais depois da distribuição
  total_cm_dif_fim: number;
  total_juros_dif_fim: number;

  // Resumo final
  principal_devido: number;
  juros_devido: number;
  total_execucao: number;

  // Compatibilidade com telas/PDF antigos
  periodos: LinhaAnoRetificacao[];
  total_imposto_a_pagar: number;
  total_imposto_devido_original: number;
  total_imposto_pago: number;
  total_principal_devido: number;
  total_juros_devido: number;
}

export class CalculoNaoSuportadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculoNaoSuportadoError';
  }
}

// ----- helpers de data ------------------------------------------------------

function parseDate(s: string): Date {
  // ISO yyyy-mm-dd → Date UTC à meia-noite para evitar drift de timezone
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function primeiroDiaDoMes(s: string): string {
  const d = parseDate(s);
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

function dataDistribuicao(dataAjuiz: string): string {
  const d = parseDate(dataAjuiz);
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

// ----- helpers de busca em tabelas auxiliares -------------------------------

function nomeTemplatePorTipo(tipo: TipoCorrecao): string {
  if (tipo === 'SELIC') return 'Template_1';
  if (tipo === 'SELIC_POUPANCA') return 'Template_2';
  return 'Template_3';
}

function buscarSalarioMin(salarios: SalarioMinimo[], dataDist: string): number {
  // Maior data_ref <= dataDist
  const alvo = parseDate(dataDist).getTime();
  const candidatos = salarios
    .filter((s) => parseDate(s.data_ref).getTime() <= alvo)
    .sort((a, b) => parseDate(b.data_ref).getTime() - parseDate(a.data_ref).getTime());
  return candidatos[0]?.valor ?? 0;
}

function buscarRegraVigente(regras: RegraSubperiodo[], idTemplate: string, data: string): RegraSubperiodo | null {
  const t = parseDate(data).getTime();
  return regras.find((r) =>
    r.id_template === idTemplate &&
    parseDate(r.data_inicio_vigencia).getTime() <= t &&
    parseDate(r.data_fim_vigencia).getTime() >= t
  ) ?? null;
}

function buscarFatorAcumulado(taxas: TaxaHistorica[], idIndice: string | null, data: string): number {
  if (!idIndice) return 1;
  const dataMes = primeiroDiaDoMes(data);
  const taxa = taxas.find((tx) => tx.id_indice === idIndice && primeiroDiaDoMes(tx.data_referencia) === dataMes);
  return taxa ? Number(taxa.fator_acumulado) : 0;
}

function buscarValorPercentual(taxas: TaxaHistorica[], idIndice: string | null, data: string): number {
  if (!idIndice) return 0;
  const dataMes = primeiroDiaDoMes(data);
  const taxa = taxas.find((tx) => tx.id_indice === idIndice && primeiroDiaDoMes(tx.data_referencia) === dataMes);
  return taxa ? Number(taxa.valor_percentual) : 0;
}

// ----- cálculo principal ----------------------------------------------------

export function calcularRetificacao(
  dados: DadosEntradaRetificacao,
  ctx: ContextoCalculo
): ResultadoRetificacao {
  // Parte I — dados do processo
  const dataAjuiz = parseDate(dados.data_ajuizamento);
  if (dataAjuiz.getTime() < parseDate('1991-01-01').getTime()) {
    throw new CalculoNaoSuportadoError('O cálculo não pode ser realizado para datas de ajuizamento anteriores a 01/01/1991.');
  }

  const data_dist = dataDistribuicao(dados.data_ajuizamento);
  const atualiza_calculo = dados.tipo_correcao !== 'SEM_CORRECAO';
  const salario_min = buscarSalarioMin(ctx.salariosMinimos, data_dist);
  const val_teto = round2(60 * salario_min);

  const nomeTpl = nomeTemplatePorTipo(dados.tipo_correcao);
  const template = ctx.templates.find((t) => t.nome === nomeTpl) ?? null;
  const id_template = template?.id ?? null;

  let juros_dist = 0;
  let juros_fim = 0;
  let cm_dist = 1;
  let cm_fim = 1;

  if (atualiza_calculo && id_template && dados.data_fim) {
    const regraDist = buscarRegraVigente(ctx.regras, id_template, data_dist);
    const regraFim = buscarRegraVigente(ctx.regras, id_template, dados.data_fim);

    juros_dist = regraDist ? buscarFatorAcumulado(ctx.taxas, regraDist.id_indice_juros, data_dist) : 0;
    juros_fim = regraFim ? buscarFatorAcumulado(ctx.taxas, regraFim.id_indice_juros, dados.data_fim) : 0;
    cm_dist = regraDist ? (buscarFatorAcumulado(ctx.taxas, regraDist.id_indice_correcao, data_dist) || 1) : 1;
    cm_fim = regraFim ? (buscarFatorAcumulado(ctx.taxas, regraFim.id_indice_correcao, dados.data_fim) || 1) : 1;
  }

  const limitaAjuiz = dados.limita_ajuiz === 'SIM';
  const mesAjuiz = dataAjuiz.getUTCMonth() + 1;

  // Parte II + III — cálculo IRPF + classificação AD/POS
  type Linha = LinhaAnoRetificacao;
  const linhas: Linha[] = dados.periodos.map((periodo) => {
    const parametro = ctx.parametros.find((p) => p.ano_calendario === periodo.ano_calendario);
    const faixasAno = ctx.faixas.filter((f) => f.ano_calendario === periodo.ano_calendario);
    if (!parametro) throw new Error(`Parâmetros não encontrados para o ano ${periodo.ano_calendario}`);
    if (faixasAno.length === 0) throw new Error(`Faixas de IR não encontradas para o ano ${periodo.ano_calendario}`);

    // Soma totais a partir das alterações (compatibilidade com UI atual)
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
        rend_somar: periodo.rend_somar, rend_sub: periodo.rend_sub,
        ded_somar: periodo.ded_somar, ded_sub: periodo.ded_sub,
        incentivo_somar: periodo.incentivo_somar, incentivo_sub: periodo.incentivo_sub,
        rra_somar: periodo.rra_somar, rra_sub: periodo.rra_sub,
      }
    );
    const periodoComTotais: DadosEntradaAjusteAnual = { ...periodo, ...totals };
    const resultado = calcularAjusteAnual(periodoComTotais, faixasAno, parametro);

    // AJUSTE_ANUAL_ORIGINAL_CALC e AJUSTE_ANUAL_NOVO
    const ajuste_original_calc = round2(resultado.imposto_devido - periodo.imposto_pago);
    const ajuste_novo = round2(resultado.imposto_devido_recalc - periodo.imposto_pago);
    const validacao = validarConsistenciaAjusteAnual(resultado.imposto_devido, periodo.ajuste_anual, periodo.imposto_pago);

    // INICIO_CORRECAO (de ir_parametros)
    const inicio_correcao = parametro.inicio_correcao;
    // TOTAL_DEVIDO (assinado)
    const total_devido = round2(ajuste_novo - ajuste_original_calc);
    // VALOR_REF (UFIR para 1992-1994)
    let valor_ref = 1;
    if (periodo.ano_calendario > 1991 && periodo.ano_calendario < 1995) {
      const dataUfir = `${periodo.ano_calendario + 1}-${String(mesAjuiz).padStart(2, '0')}-01`;
      const idUfir = ctx.indices.find((i) => i.sigla === 'UFIR')?.id ?? null;
      const fator = buscarFatorAcumulado(ctx.taxas, idUfir, dataUfir);
      valor_ref = fator || 1;
    }
    const total_devido_ii = round2(valor_ref * total_devido);
    const valor_devido = round2(Math.abs(total_devido_ii));

    // Parte III — USA_DATA_AD
    let usa_data_ad: 0 | 1 = 0;
    if (limitaAjuiz) {
      usa_data_ad = parseDate(inicio_correcao).getTime() <= parseDate(data_dist).getTime() ? 1 : 0;
    }

    // Parte IV (AD) ou Parte VII/IX (POS): correção e juros
    let fator_cm = 0;
    let valor_cm = 0;
    let fator_juros = 0;
    let valor_juros = 0;
    let total_com_juros = 0;

    if (atualiza_calculo && id_template) {
      const regraInicio = buscarRegraVigente(ctx.regras, id_template, inicio_correcao);
      const cm_aux = regraInicio ? (buscarFatorAcumulado(ctx.taxas, regraInicio.id_indice_correcao, inicio_correcao) || 1) : 1;
      const juros_aux = regraInicio ? buscarFatorAcumulado(ctx.taxas, regraInicio.id_indice_juros, inicio_correcao) : 0;

      if (usa_data_ad === 1) {
        // Parte IV — até a distribuição
        fator_cm = round8(cm_dist / cm_aux);
        valor_cm = round2(valor_devido * fator_cm);
        fator_juros = round8(juros_dist - juros_aux);
        valor_juros = round2(valor_cm * fator_juros);
        total_com_juros = round2(valor_cm + valor_juros);
      } else {
        // Parte VII (CM) e Parte IX (CM novamente, juros entre INICIO_CORRECAO e FIM)
        fator_cm = round8(cm_fim / cm_aux);
        valor_cm = round2(valor_devido * fator_cm);
        fator_juros = round8(juros_fim - juros_aux);
        valor_juros = round2(valor_cm * fator_juros);
        total_com_juros = round2(valor_cm + valor_juros);
      }
    } else {
      // sem correção
      fator_cm = 1;
      valor_cm = valor_devido;
      fator_juros = 0;
      valor_juros = 0;
      total_com_juros = valor_devido;
    }

    return {
      ano_calendario: periodo.ano_calendario,
      tipo_declaracao: periodo.tipo_declaracao,
      inicio_correcao,
      total_devido, valor_ref, total_devido_ii, valor_devido, usa_data_ad,
      fator_cm, valor_cm, fator_juros, valor_juros, total_com_juros,
      resultado, validacao,
    };
  });

  const linhas_ad = linhas.filter((l) => l.usa_data_ad === 1);
  const linhas_pos = linhas.filter((l) => l.usa_data_ad === 0);

  // Parte V — totais antes da distribuição
  const total_cm_dif_ad = round2(linhas_ad.reduce((s, l) => s + l.valor_cm, 0));
  const total_juros_dif_ad = round2(linhas_ad.reduce((s, l) => s + l.valor_juros, 0));
  const totais_dif_ad = round2(linhas_ad.reduce((s, l) => s + l.total_com_juros, 0));

  let total_principal_ad = 0;
  let total_juros_ad = 0;
  let total_devido_ad = 0;
  if (limitaAjuiz && linhas_ad.length > 0) {
    if (totais_dif_ad > val_teto) {
      total_principal_ad = val_teto;
      total_juros_ad = round2(val_teto - total_principal_ad);
      total_devido_ad = val_teto;
    } else {
      total_principal_ad = total_cm_dif_ad;
      total_juros_ad = total_juros_dif_ad;
      total_devido_ad = totais_dif_ad;
    }
  }

  // Parte VI — atualização do principal AD para DATA_FIM
  const fator_cm_fim = cm_dist > 0 ? round8(cm_fim / cm_dist) : 1;
  const principal_ad = round2(total_principal_ad * fator_cm_fim);
  const fator_juros_fim = round8(juros_fim - juros_dist);
  const juros_ad_val = round2(principal_ad * fator_juros_fim);
  const principal_juros_ad = round2(principal_ad + juros_ad_val);

  // Parte VIII — totais depois da distribuição
  const total_cm_dif_fim = round2(linhas_pos.reduce((s, l) => s + l.valor_cm, 0));
  const total_juros_dif_fim = round2(linhas_pos.reduce((s, l) => s + l.valor_juros, 0));

  // Resumo final
  const principal_devido = round2(principal_ad + total_cm_dif_fim);
  const juros_devido = round2(juros_ad_val + total_juros_dif_fim);
  const total_execucao = round2(principal_devido + juros_devido);

  return {
    data_dist, atualiza_calculo, salario_min, val_teto, id_template,
    juros_dist, juros_fim, cm_dist, cm_fim,
    linhas_ad, linhas_pos,
    total_cm_dif_ad, total_juros_dif_ad, totais_dif_ad,
    total_principal_ad, total_juros_ad, total_devido_ad,
    fator_cm_fim, principal_ad, fator_juros_fim, juros_ad: juros_ad_val, principal_juros_ad,
    total_cm_dif_fim, total_juros_dif_fim,
    principal_devido, juros_devido, total_execucao,

    // Compat
    periodos: linhas,
    total_imposto_a_pagar: round2(linhas.reduce((s, l) => s + l.resultado.imposto_a_pagar, 0)),
    total_imposto_devido_original: round2(linhas.reduce((s, l) => s + l.resultado.imposto_devido, 0)),
    total_imposto_pago: round2(linhas.reduce((s, l) => s + l.resultado.alteracoes.imposto_pago.original, 0)),
    total_principal_devido: principal_devido,
    total_juros_devido: juros_devido,
  };
}

// Re-export para retrocompat (Resultado/Relatorio/PDF antigos podem importar PeriodoRetificacao)
export type PeriodoRetificacao = LinhaAnoRetificacao;
