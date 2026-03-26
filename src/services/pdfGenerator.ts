import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoCalculo, FaixaIR } from './calculoIRPF';

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function gerarRelatorioPDF(
  resultado: ResultadoCalculo,
  dados: {
    numero_processo: string;
    nome_autor: string;
    ano_calendario: number;
    tipo_declaracao: string;
    calculo_id: string;
    inicio_correcao: string;
  },
  faixas: FaixaIR[]
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE CÁLCULO - AJUSTE ANUAL IRPF', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Process info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Processo: ${dados.numero_processo}`, 14, y); y += 6;
  doc.text(`Autor: ${dados.nome_autor}`, 14, y); y += 6;
  doc.text(`Ano Calendário: ${dados.ano_calendario}`, 14, y); y += 6;
  doc.text(`Tipo de Declaração: ${dados.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}`, 14, y); y += 6;
  doc.text(`ID do Cálculo: ${dados.calculo_id}`, 14, y); y += 6;
  doc.text(`Data de Início da Correção: ${dados.inicio_correcao}`, 14, y); y += 10;

  // A - Tabela de Alterações
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('A - TABELA DE ALTERAÇÕES', 14, y); y += 6;

  const alt = resultado.alteracoes;
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
      ['Total de rendimentos tributáveis (+)', formatCurrency(resultado.rend_trib_recalc)],
      ['Total das deduções (-)', formatCurrency(resultado.total_deducoes_recalc)],
      ['Base de cálculo recalculado (=)', formatCurrency(resultado.base_calculo_recalc)],
      ['Alíquota aplicável (x)', formatPercent(resultado.aliquota_recalc)],
      ['Parcela de dedução (-)', formatCurrency(resultado.deducao_recalc)],
      ['Total das deduções de incentivo (-)', formatCurrency(resultado.incentivo_recalc)],
      ['Imposto devido RRA (+)', formatCurrency(resultado.imposto_rra_recalc)],
      ['Imposto devido (=)', formatCurrency(resultado.imposto_devido_recalc)],
      ['Total do imposto pago (-)', formatCurrency(resultado.alteracoes.imposto_pago.recalculado)],
      ['Imposto a pagar / restituir', formatCurrency(resultado.imposto_a_pagar)],
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

  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} — ID: ${dados.calculo_id}`, 14, y);

  return doc;
}
