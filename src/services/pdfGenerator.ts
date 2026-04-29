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
      head: [['Ano', 'Declaração', 'Imposto Devido', 'Imposto Pago', 'Resultado', 'Consistente']],
      body: resultadoRetificacao.periodos.map((periodo) => [
        `${periodo.ano_calendario}`,
        periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada',
        formatCurrency(periodo.resultado.imposto_devido),
        formatCurrency(periodo.resultado.alteracoes.imposto_pago.original),
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
        ['Total de imposto devido original', formatCurrency(resultadoRetificacao.total_imposto_devido_original)],
        ['Total do imposto pago', formatCurrency(resultadoRetificacao.total_imposto_pago)],
        ['Base de cálculo recalculada total', formatCurrency(resultadoRetificacao.total_base_calculo_recalc)],
        ['Imposto a pagar / restituir', formatCurrency(resultadoRetificacao.total_imposto_a_pagar)],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 195], textColor: 255 },
      theme: 'grid',
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
