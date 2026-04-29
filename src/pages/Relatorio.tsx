import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalculo } from '@/hooks/useIRData';
import { useFaixasIR } from '@/hooks/useIRData';
import TabelaAlteracoes from '@/components/TabelaAlteracoes';
import BlocoCalculo from '@/components/BlocoCalculo';
import TabelaFaixas from '@/components/TabelaFaixas';
import { gerarRelatorioPDF } from '@/services/pdfGenerator';
import type { ResultadoCalculo, ResultadoRetificacao } from '@/services/calculoIRPF';

const RelatorioPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNovo = searchParams.get('calculo_novo') === 'sim';

  const { data: calculo, isLoading } = useCalculo(id || null);
  const { data: faixas } = useFaixasIR(calculo?.ano_calendario || null);

  if (isLoading) {
    return <div className="page-container text-center py-20 text-muted-foreground">Carregando...</div>;
  }

  if (!calculo) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-muted-foreground mb-4">Cálculo não encontrado.</p>
        <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
      </div>
    );
  }

  const isRetificacao = calculo.tipo_calculo === 'retificacao';
  const resultadoRetificacao = calculo.resultado as unknown as ResultadoRetificacao;
  const resultadoAjuste = calculo.resultado as unknown as ResultadoCalculo;
  const resultado = isRetificacao ? null : resultadoAjuste;
  const isRestituir = isRetificacao
    ? resultadoRetificacao.total_imposto_a_pagar > 0
    : resultadoAjuste.imposto_a_pagar > 0;
  const isPagar = isRetificacao
    ? resultadoRetificacao.total_imposto_a_pagar < 0
    : resultadoAjuste.imposto_a_pagar < 0;

  const handleExportPDF = () => {
    if (!faixas) return;
    const data = {
      numero_processo: calculo.numero_processo,
      nome_autor: calculo.nome_autor,
      tipo_declaracao: calculo.tipo_declaracao,
      calculo_id: calculo.id,
      inicio_correcao: isRetificacao ? (calculo.dados_entrada as any)?.data_ajuizamento ?? '' : '',
      tipo_calculo: calculo.tipo_calculo,
      ano_calendario: calculo.ano_calendario,
      anos: isRetificacao ? (calculo.dados_entrada as any)?.periodos?.map((p: any) => p.ano_calendario) : undefined,
      dados_entrada: isRetificacao ? calculo.dados_entrada as any : undefined,
    };

    const doc = gerarRelatorioPDF(isRetificacao ? resultadoRetificacao : resultadoAjuste, data, faixas);
    doc.save(`relatorio-${calculo.id}.pdf`);
  };

  const handleRefazer = () => {
    if (isRetificacao) {
      navigate(`/calculo/retificacao?id=${calculo.id}`);
      return;
    }
    navigate(`/calculo/ajuste-anual?id=${calculo.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Início
        </Button>

        <h1 className="text-2xl font-bold mb-2">
          Relatório Final — {isRetificacao ? 'Retificação' : 'Ajuste Anual'} IRPF
        </h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mb-6">
          <span>Processo: <strong className="text-foreground">{calculo.numero_processo}</strong></span>
          <span>Autor: <strong className="text-foreground">{calculo.nome_autor}</strong></span>
          <span>Ano: <strong className="text-foreground">{calculo.ano_calendario}</strong></span>
          <span>ID: <strong className="text-foreground font-mono text-xs">{calculo.id}</strong></span>
        </div>

        {/* Valor Final */}
        <div className={`rounded-lg border-2 p-6 text-center mb-6 ${isPagar ? 'border-destructive/40 bg-destructive/5' : isRestituir ? 'border-green-500/40 bg-green-50' : 'border-border'}`}>
          <p className="text-sm text-muted-foreground mb-1">
            {isPagar ? 'Imposto a Pagar' : isRestituir ? 'Valor a Restituir' : 'Sem diferença'}
          </p>
          <p className={`text-3xl font-bold font-mono ${isPagar ? 'text-destructive' : isRestituir ? 'text-green-600' : 'text-foreground'}`}>
            R$ {Math.abs((isRetificacao ? resultadoRetificacao.total_imposto_a_pagar : resultadoAjuste.imposto_a_pagar)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {isRetificacao ? (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border px-3 py-2">Ano</th>
                    <th className="border px-3 py-2">Declaração</th>
                    <th className="border px-3 py-2 text-right">Imposto Devido</th>
                    <th className="border px-3 py-2 text-right">Imposto Pago</th>
                    <th className="border px-3 py-2 text-right">Valor Devido</th>
                    <th className="border px-3 py-2 text-right">Valor Atualizado</th>
                    <th className="border px-3 py-2 text-right">Resultado</th>
                    <th className="border px-3 py-2 text-center">Consistente</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadoRetificacao.periodos.map((periodo) => (
                    <tr key={`${periodo.ano_calendario}-${periodo.tipo_declaracao}`} className="odd:bg-white even:bg-slate-50">
                      <td className="border px-3 py-2">{periodo.ano_calendario}</td>
                      <td className="border px-3 py-2">{periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {periodo.resultado.imposto_devido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {periodo.resultado.alteracoes.imposto_pago.original.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {periodo.valor_devido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {periodo.valor_atualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {periodo.resultado.imposto_a_pagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="border px-3 py-2 text-center">{periodo.validacao.consistente ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total principal devido</p>
                <p className="text-2xl font-mono mt-2">R$ {(resultadoRetificacao.total_principal_devido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total juros devido</p>
                <p className="text-2xl font-mono mt-2">R$ {(resultadoRetificacao.total_juros_devido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total da execução</p>
                <p className="text-2xl font-mono mt-2">R$ {(resultadoRetificacao.total_execucao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <TabelaAlteracoes alteracoes={resultadoAjuste.alteracoes} />
            <BlocoCalculo resultado={resultadoAjuste} />
            {faixas && faixas.length > 0 && <TabelaFaixas faixas={faixas} ano={calculo.ano_calendario} />}
          </>
        )}

        <div className="flex gap-4 justify-end mt-6">
          {!isNovo && (
            <Button variant="outline" onClick={handleRefazer} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refazer Cálculo
            </Button>
          )}
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" /> Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RelatorioPage;
