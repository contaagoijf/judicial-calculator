import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoCalculo, ResultadoRetificacao, FaixaIR } from './calculoIRPF';

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(val: number): string {
  const normalized = val <= 1 ? val * 100 : val;
  return normalized.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

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
    dados_entrada?: any;
  },
  faixas: FaixaIR[]
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  const isRetificacao = dados.tipo_calculo === 'retificacao';
  const resultadoRetificacao = resultado as ResultadoRetificacao;
  const resultadoAjuste = resultado as ResultadoCalculo;

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
  doc.text(`Data de Início da Correção: ${dados.inicio_correcao}`, 14, y); y += 10;

  if (isRetificacao) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('A - RESUMO POR ANO', 14, y); y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Ano', 'Declaração', 'Imposto Devido', 'Imposto Pago', 'Valor Devido', 'Valor Atualizado', 'Resultado', 'Consistente']],
      body: resultadoRetificacao.periodos.map((periodo) => [
        `${periodo.ano_calendario}`,
        periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada',
        formatCurrency(periodo.resultado.imposto_devido),
        formatCurrency(periodo.resultado.alteracoes.imposto_pago.original),
        formatCurrency(periodo.valor_devido),
        formatCurrency(periodo.valor_atualizado),
        formatCurrency(periodo.resultado.imposto_a_pagar),
        periodo.validacao.consistente ? 'Sim' : 'Não',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 195], textColor: 255 },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('B - RESUMO AGREGADO', 14, y); y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Valor']],
      body: [
        ['Total principal devido', formatCurrency(resultadoRetificacao.total_principal_devido)],
        ['Total juros devido', formatCurrency(resultadoRetificacao.total_juros_devido)],
        ['Total da execução', formatCurrency(resultadoRetificacao.total_execucao)],
        ['Imposto a pagar / restituir', formatCurrency(resultadoRetificacao.total_imposto_a_pagar)],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 195], textColor: 255 },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('C - PARCIAIS DO CÁLCULO', pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const periodosEntrada = (dados.dados_entrada?.periodos ?? []) as any[];
    const entradasPorAnoTipo = periodosEntrada.reduce<Record<string, any>>((acc, periodo) => {
      acc[`${periodo.ano_calendario}|${periodo.tipo_declaracao}`] = periodo;
      return acc;
    }, {});

    const periodosPorAno = resultadoRetificacao.periodos.reduce<Record<number, PeriodoRetificacao[]>>((acc, periodo) => {
      (acc[periodo.ano_calendario] ??= []).push(periodo);
      return acc;
    }, {} as Record<number, PeriodoRetificacao[]>);

    const anosOrdenados = Object.keys(periodosPorAno)
      .map((key) => Number(key))
      .sort((a, b) => a - b);

    anosOrdenados.forEach((ano) => {
      const periodos = periodosPorAno[ano];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Ano ${ano}`, 14, y);
      y += 8;

      periodos.forEach((periodo, index) => {
        const periodoInput = entradasPorAnoTipo[`${periodo.ano_calendario}|${periodo.tipo_declaracao}`] ?? {};
        const rows = [
          ['Tipo de declaração', periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'],
          ['Rendimentos tributáveis originais', formatCurrency(periodoInput.rendimentos_tributaveis ?? periodo.resultado.alteracoes.rendimentos.original)],
          ['Deduções legais originais', formatCurrency(periodoInput.deducoes_legais ?? periodo.resultado.alteracoes.deducoes.original)],
          ['Deduções de incentivo originais', formatCurrency(periodoInput.deducoes_incentivo ?? periodo.resultado.alteracoes.incentivo.original)],
          ['Imposto RRA original', formatCurrency(periodoInput.imposto_rra ?? periodo.resultado.alteracoes.rra.original)],
          ['Imposto pago informado', formatCurrency(periodoInput.imposto_pago ?? periodo.resultado.alteracoes.imposto_pago.original)],
          ['Total de deduções originais', formatCurrency(periodo.resultado.total_deducoes)],
          ['Base de cálculo original', formatCurrency(periodo.resultado.base_calculo)],
          ['Alíquota original', formatPercent(periodo.resultado.aliquota_inicial)],
          ['Dedução original', formatCurrency(periodo.resultado.deducao_inicial)],
          ['Imposto devido original', formatCurrency(periodo.resultado.imposto_devido)],
          ['Rendimentos recalculados', formatCurrency(periodo.resultado.rend_trib_recalc)],
          ['Total de deduções recalculadas', formatCurrency(periodo.resultado.total_deducoes_recalc)],
          ['Base de cálculo recalculada', formatCurrency(periodo.resultado.base_calculo_recalc)],
          ['Alíquota recalculada', formatPercent(periodo.resultado.aliquota_recalc)],
          ['Dedução recalculada', formatCurrency(periodo.resultado.deducao_recalc)],
          ['Incentivo recalculado', formatCurrency(periodo.resultado.incentivo_recalc)],
          ['Imposto RRA recalculado', formatCurrency(periodo.resultado.imposto_rra_recalc)],
          ['Imposto devido recalculado', formatCurrency(periodo.resultado.imposto_devido_recalc)],
          ['Imposto a pagar / restituir', formatCurrency(periodo.resultado.imposto_a_pagar)],
          ['Valor devido', formatCurrency(periodo.valor_devido)],
          ['Valor atualizado', formatCurrency(periodo.valor_atualizado)],
        ];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Declaração ${periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}`, 14, y);
        y += 7;
        doc.setFont('helvetica', 'normal');

        autoTable(doc, {
          startY: y,
          head: [['Variável', 'Valor']],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 195], textColor: 255 },
          theme: 'grid',
        });

        y = (doc as any).lastAutoTable.finalY + 10;
        if (index < periodos.length - 1 && y > 230) {
          doc.addPage();
          y = 20;
        }
      });

      if (ano !== anosOrdenados[anosOrdenados.length - 1]) {
        y += 4;
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
      }
    });
  } else {
    // A - Tabela de Alterações
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
      headStyles: { fillColor: [59, 130, 195], textColor: 255 },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // B - Cálculo
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
      headStyles: { fillColor: [59, 130, 195], textColor: 255 },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.row.index === 9) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 245, 255];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // C - Tabela IRPF
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`C - TABELA IRPF ${dados.ano_calendario}`, 14, y); y += 6;

    const sortedFaixas = [...faixas].sort((a, b) => a.limite_inferior - b.limite_inferior);
    autoTable(doc, {
      startY: y,
      head: [['De', 'Até', 'Alíquota', 'Dedução']],
      body: sortedFaixas.map(f => [
        formatCurrency(f.limite_inferior),
        f.limite_superior ? formatCurrency(f.limite_superior) : '—',
        formatPercent(f.aliquota),
        formatCurrency(f.deducao),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 195], textColor: 255 },
      theme: 'grid',
    });
  }

  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} — ID: ${dados.calculo_id}`, 14, y);

  return doc;
}
