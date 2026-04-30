import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  ResultadoCalculo,
  ResultadoRetificacao,
  FaixaIR,
  PeriodoRetificacao,
  DadosEntradaRetificacao,
  AlteracaoRetificacao,
} from './calculoIRPF';

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatPercent(val: number): string {
  const normalized = val <= 1 ? val * 100 : val;
  return normalized.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}
function formatFator(val: number): string {
  return (val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}
function formatPctDecimal(val: number): string {
  return ((val ?? 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}
function formatDateBR(s: string | undefined): string {
  if (!s) return '-';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}
function formatMesAno(s: string | undefined): string {
  if (!s) return '-';
  const [y, m] = s.split('T')[0].split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${meses[Number(m) - 1]}-${y}`;
}

const HEAD_COLOR: [number, number, number] = [59, 130, 195];

export function gerarRelatorioPDF(
  resultado: ResultadoCalculo | ResultadoRetificacao,
  dados: {
    numero_processo: string;
    nome_autor: string;
    ano_calendario?: number;
    anos?: number[];
    tipo_declaracao: string;
    calculo_id: string;
    inicio_correcao: string;
    tipo_calculo: 'ajuste_anual' | 'retificacao';
    dados_entrada?: DadosEntradaRetificacao;
  },
  faixas: FaixaIR[]
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  const isRetificacao = dados.tipo_calculo === 'retificacao';
  const r = resultado as ResultadoRetificacao;
  const resultadoAjuste = resultado as ResultadoCalculo;

  const drawHeader = (subtitulo: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PODER JUDICIÁRIO — JUSTIÇA FEDERAL', pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CÁLCULO DE IMPOSTO DE RENDA (ANUAL)', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitulo, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`PROCESSO: ${dados.numero_processo}`, 14, 36);
    doc.text(`AUTOR: ${dados.nome_autor}`, pageWidth / 2, 36);
    return 42;
  };

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `RELATÓRIO DE CÁLCULO - ${isRetificacao ? 'RETIFICAÇÃO' : 'AJUSTE ANUAL'} IRPF`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 12;

  // Process info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Processo: ${dados.numero_processo}`, 14, y); y += 6;
  doc.text(`Autor: ${dados.nome_autor}`, 14, y); y += 6;
  if (isRetificacao && dados.anos && dados.anos.length > 0) {
    doc.text(`Período: ${Math.min(...dados.anos)} - ${Math.max(...dados.anos)}`, 14, y); y += 6;
  } else if (dados.ano_calendario) {
    doc.text(`Ano Calendário: ${dados.ano_calendario}`, 14, y); y += 6;
  }
  doc.text(`Tipo de Declaração: ${dados.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}`, 14, y); y += 6;
  doc.text(`ID do Cálculo: ${dados.calculo_id}`, 14, y); y += 6;
  if (dados.inicio_correcao) {
    doc.text(`Data de Início da Correção: ${formatDateBR(dados.inicio_correcao)}`, 14, y); y += 6;
  }
  y += 4;

  if (isRetificacao) {
    const dadosRet = dados.dados_entrada;
    const limita = dadosRet?.limita_ajuiz === 'SIM';

    // ============================================================
    // SEÇÃO 1 — CÁLCULO DO DEVIDO
    // ============================================================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CÁLCULO DO DEVIDO', 14, y); y += 6;

    if (r.linhas_ad.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Início Correção', 'Diferença Devida', 'Coef. Atualização', 'Diferença Atualizada', 'Juros %', 'Juros Valor', 'Valor Atualizado']],
        body: [
          ['PRINCIPAL', formatDateBR(r.data_dist), formatCurrency(r.total_principal_ad), formatFator(r.fator_cm_fim), formatCurrency(r.principal_ad), formatPctDecimal(r.fator_juros_fim), formatCurrency(r.juros_ad), formatCurrency(r.principal_juros_ad)],
          ['JUROS', formatDateBR(r.data_dist), formatCurrency(r.total_juros_ad), formatFator(1), formatCurrency(r.total_juros_ad), '—', formatCurrency(r.total_juros_ad), formatCurrency(r.total_juros_ad)],
          [
            { content: 'TOTAL:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(r.total_principal_ad), styles: { fontStyle: 'bold', halign: 'right' } },
            '',
            { content: formatCurrency(r.juros_ad + r.total_juros_ad), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(r.principal_juros_ad + r.total_juros_ad), styles: { fontStyle: 'bold', halign: 'right' } },
          ],
        ] as never[],
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (r.linhas_pos.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Cálculo das parcelas devidas — posteriores à data da distribuição', 14, y); y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Ano Calendário', 'Início Correção', 'Diferença Devida', 'Coef. Atualização', 'Diferença Atualizada', 'Juros %', 'Juros Valor', 'Valor Atualizado']],
        body: [
          ...r.linhas_pos.map((l) => [
            String(l.ano_calendario),
            formatDateBR(l.inicio_correcao),
            formatCurrency(l.valor_devido),
            formatFator(l.fator_cm),
            formatCurrency(l.valor_cm),
            formatPctDecimal(l.fator_juros),
            formatCurrency(l.valor_juros),
            formatCurrency(l.total_com_juros),
          ]),
          [
            { content: 'TOTAL:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(r.total_cm_dif_fim), styles: { fontStyle: 'bold', halign: 'right' } },
            '',
            { content: formatCurrency(r.total_juros_dif_fim), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(r.total_cm_dif_fim + r.total_juros_dif_fim), styles: { fontStyle: 'bold', halign: 'right' } },
          ] as never[],
        ] as never[][],
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Resumo Geral
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO GERAL', 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      body: [
        ['Principal devido:', formatCurrency(r.principal_devido)],
        ['Juros devido:', formatCurrency(r.juros_devido)],
        [{ content: 'Total da execução:', styles: { fontStyle: 'bold' } }, { content: formatCurrency(r.total_execucao), styles: { fontStyle: 'bold' } }],
      ] as never[],
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
      theme: 'plain',
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Memória de cálculo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MEMÓRIA DE CÁLCULO', 14, y); y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const tipoCorrLabel = dadosRet?.tipo_correcao === 'SELIC' ? 'SELIC'
      : dadosRet?.tipo_correcao === 'SELIC_POUPANCA' ? 'SELIC + Poupança'
      : 'Sem correção';
    doc.text(`• Tipo de correção: ${tipoCorrLabel}`, 14, y); y += 5;
    doc.text(`• Data da distribuição: ${formatDateBR(r.data_dist)}`, 14, y); y += 5;
    if (dadosRet?.data_fim) { doc.text(`• Cálculo atualizado até: ${formatDateBR(dadosRet.data_fim)}`, 14, y); y += 5; }
    doc.text(`• Limita ao ajuizamento (teto dos juizados): ${limita ? 'Sim' : 'Não'}`, 14, y); y += 8;

    // ============================================================
    // SEÇÃO 2 — TETO DOS JUIZADOS
    // ============================================================
    if (limita && r.linhas_ad.length > 0) {
      doc.addPage();
      y = drawHeader('DEMONSTRATIVO DO VALOR DEVIDO ATÉ A DATA DA DISTRIBUIÇÃO (TETO DOS JUIZADOS ESPECIAIS)');

      autoTable(doc, {
        startY: y,
        head: [['Ano Calendário', 'Início Correção', 'Diferença Devida', 'Coef. Atualização', 'Diferença Atualizada', 'Juros %', 'Juros Valor', 'Valor Atualizado']],
        body: r.linhas_ad.map((l) => [
          String(l.ano_calendario),
          formatDateBR(l.inicio_correcao),
          formatCurrency(l.valor_devido),
          formatFator(l.fator_cm),
          formatCurrency(l.valor_cm),
          formatPctDecimal(l.fator_juros),
          formatCurrency(l.valor_juros),
          formatCurrency(l.total_com_juros),
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      autoTable(doc, {
        startY: y,
        body: [
          ['Valor total do principal até a distribuição:', formatCurrency(r.total_cm_dif_ad)],
          ['Valor total dos juros até a distribuição:', formatCurrency(r.total_juros_dif_ad)],
          ['Valor total das parcelas vencidas até a distribuição:', formatCurrency(r.totais_dif_ad)],
          ['Teto máximo dos juizados especiais na data da distribuição:', formatCurrency(r.val_teto)],
          ['Valor final do principal até a distribuição:', formatCurrency(r.total_principal_ad)],
          ['Valor final dos juros até a distribuição:', formatCurrency(r.total_juros_ad)],
          [
            { content: `Valor devido na data da distribuição (${formatMesAno(r.data_dist)}):`, styles: { fontStyle: 'bold' } },
            { content: formatCurrency(r.total_devido_ad), styles: { fontStyle: 'bold' } },
          ],
        ] as never[],
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        r.totais_dif_ad > r.val_teto
          ? '• O valor devido na data da distribuição foi limitado ao teto dos Juizados Federais.'
          : '• O valor devido na data da distribuição não foi limitado ao teto dos Juizados Federais.',
        14, y
      );
      y += 8;
    }

    // ============================================================
    // SEÇÃO 3 — RELATÓRIO DOS VALORES ACRESCIDOS/RETIRADOS
    // ============================================================
    const todasAlteracoes: Array<AlteracaoRetificacao & { ano: number }> = (dadosRet?.periodos ?? []).flatMap(
      (p) => (p.alteracoes ?? []).map((a) => ({ ...a, ano: p.ano_calendario }))
    );
    if (todasAlteracoes.length > 0) {
      doc.addPage();
      y = drawHeader('RELATÓRIO DOS VALORES ACRESCIDOS OU RETIRADOS DA BASE DE CÁLCULO');
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Valor a Retirar', 'Valor a Acrescer', 'Histórico']],
        body: todasAlteracoes.map((a) => {
          const retirar = (a.rend_sub || 0) + (a.ded_somar || 0) + (a.incentivo_somar || 0);
          const acrescer = (a.rend_somar || 0) + (a.ded_sub || 0) + (a.incentivo_sub || 0);
          return [
            formatMesAno(a.data_alt),
            retirar > 0 ? formatCurrency(retirar) : '',
            acrescer > 0 ? formatCurrency(acrescer) : '',
            a.motivo ?? '',
          ];
        }),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ============================================================
    // SEÇÃO 4 (ÚLTIMA FOLHA) — VARIÁVEIS PARCIAIS POR ANO
    // ============================================================
    doc.addPage();
    y = drawHeader('CÁLCULO DA(S) DECLARAÇÃO(ÕES) — VARIÁVEIS PARCIAIS');

    const periodosEntrada = (dadosRet?.periodos ?? []) as any[];
    const entradasPorAnoTipo = periodosEntrada.reduce<Record<string, any>>((acc, periodo) => {
      acc[`${periodo.ano_calendario}|${periodo.tipo_declaracao}`] = periodo;
      return acc;
    }, {});

    const periodosPorAno = r.periodos.reduce<Record<number, PeriodoRetificacao[]>>((acc, periodo) => {
      (acc[periodo.ano_calendario] ??= []).push(periodo);
      return acc;
    }, {} as Record<number, PeriodoRetificacao[]>);
    const anosOrdenados = Object.keys(periodosPorAno).map((k) => Number(k)).sort((a, b) => a - b);

    anosOrdenados.forEach((ano) => {
      const periodos = periodosPorAno[ano];
      periodos.forEach((periodo) => {
        const periodoInput = entradasPorAnoTipo[`${periodo.ano_calendario}|${periodo.tipo_declaracao}`] ?? {};

        if (y > 250) { doc.addPage(); y = drawHeader('CÁLCULO DA(S) DECLARAÇÃO(ÕES) — VARIÁVEIS PARCIAIS'); }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`ANO-CALENDÁRIO: ${periodo.ano_calendario}    TIPO DE DECLARAÇÃO: ${periodo.tipo_declaracao.toUpperCase()}`, 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');

        const rows = [
          ['(*) Total dos rendimentos tributáveis (+)', formatCurrency(periodoInput.rendimentos_tributaveis ?? periodo.resultado.alteracoes.rendimentos.original)],
          ['Acréscimo nos rendimentos tributáveis (+)', formatCurrency(periodo.resultado.alteracoes.rendimentos.acrescimo)],
          ['Decréscimo nos rendimentos tributáveis (-)', formatCurrency(periodo.resultado.alteracoes.rendimentos.decrescimo)],
          ['Total dos rendimentos tributáveis (=)', formatCurrency(periodo.resultado.rend_trib_recalc)],
          ['(*) Total das deduções (-)', formatCurrency(periodo.resultado.total_deducoes_recalc)],
          ['Nova base de cálculo (=)', formatCurrency(periodo.resultado.base_calculo_recalc)],
          ['Alíquota aplicável (x)', formatPercent(periodo.resultado.aliquota_recalc)],
          ['Parcela de dedução (-)', formatCurrency(periodo.resultado.deducao_recalc)],
          ['(*) Total das deduções de incentivo (-)', formatCurrency(periodo.resultado.incentivo_recalc)],
          ['(*) Imposto devido RRA (+)', formatCurrency(periodo.resultado.imposto_rra_recalc)],
          ['Imposto devido (=)', formatCurrency(periodo.resultado.imposto_devido_recalc)],
          ['(*) Total do imposto pago (-)', formatCurrency(periodo.resultado.alteracoes.imposto_pago.recalculado)],
          [periodo.resultado.imposto_a_pagar >= 0 ? 'Imposto a pagar (=)' : 'Imposto a restituir (=)', formatCurrency(Math.abs(periodo.resultado.imposto_a_pagar))],
          ['Total devido', formatCurrency(periodo.valor_devido)],
        ];

        autoTable(doc, {
          startY: y,
          body: rows,
          styles: { fontSize: 8, cellPadding: 1.5 },
          columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
          theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 3;

        // tabela IRRF do ano
        const faixasAno = faixas.filter((f) => f.ano_calendario === periodo.ano_calendario);
        if (faixasAno.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [['De', 'Até', 'Alíquota', 'Dedução']],
            body: [...faixasAno]
              .sort((a, b) => a.limite_inferior - b.limite_inferior)
              .map((f) => [
                formatCurrency(f.limite_inferior),
                f.limite_superior ? formatCurrency(f.limite_superior) : '—',
                formatPercent(f.aliquota),
                formatCurrency(f.deducao),
              ]),
            styles: { fontSize: 7, cellPadding: 1.2 },
            headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
            theme: 'grid',
          });
          y = (doc as any).lastAutoTable.finalY + 2;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.text('(*) valor retirado da declaração de ajuste anual.', 14, y);
          y += 6;
        }
      });
    });
  } else {
    // Ajuste Anual (mantido)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('A - TABELA DE ALTERAÇÕES', 14, y); y += 6;

    const alt = resultadoAjuste.alteracoes;
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Valor Original', 'Acréscimo', 'Decréscimo', 'Recalculado']],
      body: [
        ['Rendimentos tributáveis', formatCurrency(alt.rendimentos.original), formatCurrency(alt.rendimentos.acrescimo), formatCurrency(alt.rendimentos.decrescimo), formatCurrency(alt.rendimentos.recalculado)],
        ['Deduções', formatCurrency(alt.deducoes.original), formatCurrency(alt.deducoes.acrescimo), formatCurrency(alt.deducoes.decrescimo), formatCurrency(alt.deducoes.recalculado)],
        ['Deduções de incentivo', formatCurrency(alt.incentivo.original), formatCurrency(alt.incentivo.acrescimo), formatCurrency(alt.incentivo.decrescimo), formatCurrency(alt.incentivo.recalculado)],
        ['Imposto RRA', formatCurrency(alt.rra.original), formatCurrency(alt.rra.acrescimo), formatCurrency(alt.rra.decrescimo), formatCurrency(alt.rra.recalculado)],
        ['Imposto pago', formatCurrency(alt.imposto_pago.original), formatCurrency(alt.imposto_pago.acrescimo), formatCurrency(alt.imposto_pago.decrescimo), formatCurrency(alt.imposto_pago.recalculado)],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('B - CÁLCULO', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Valor']],
      body: [
        ['Total de rendimentos tributáveis (+)', formatCurrency(resultadoAjuste.rend_trib_recalc)],
        ['Total das deduções (-)', formatCurrency(resultadoAjuste.total_deducoes_recalc)],
        ['Base de cálculo recalculado (=)', formatCurrency(resultadoAjuste.base_calculo_recalc)],
        ['Alíquota aplicável (x)', formatPercent(resultadoAjuste.aliquota_recalc)],
        ['Parcela de dedução (-)', formatCurrency(resultadoAjuste.deducao_recalc)],
        ['Total das deduções de incentivo (-)', formatCurrency(resultadoAjuste.incentivo_recalc)],
        ['Imposto devido RRA (+)', formatCurrency(resultadoAjuste.imposto_rra_recalc)],
        ['Imposto devido (=)', formatCurrency(resultadoAjuste.imposto_devido_recalc)],
        ['Total do imposto pago (-)', formatCurrency(resultadoAjuste.alteracoes.imposto_pago.recalculado)],
        ['Imposto a pagar / restituir', formatCurrency(resultadoAjuste.imposto_a_pagar)],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.index === 9) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 245, 255];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`C - TABELA IRPF ${dados.ano_calendario}`, 14, y); y += 6;
    const sortedFaixas = [...faixas].sort((a, b) => a.limite_inferior - b.limite_inferior);
    autoTable(doc, {
      startY: y,
      head: [['De', 'Até', 'Alíquota', 'Dedução']],
      body: sortedFaixas.map((f) => [
        formatCurrency(f.limite_inferior),
        f.limite_superior ? formatCurrency(f.limite_superior) : '—',
        formatPercent(f.aliquota),
        formatCurrency(f.deducao),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
      theme: 'grid',
    });
  }

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} — ID: ${dados.calculo_id}`, 14, y);

  return doc;
}
