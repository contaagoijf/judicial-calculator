import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalculo } from '@/hooks/useIRData';
import { useFaixasIR } from '@/hooks/useIRData';
import TabelaAlteracoes from '@/components/TabelaAlteracoes';
import BlocoCalculo from '@/components/BlocoCalculo';
import TabelaFaixas from '@/components/TabelaFaixas';
import { gerarRelatorioPDF } from '@/services/pdfGenerator';
import type { ResultadoCalculo } from '@/services/calculoIRPF';

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

  const resultado = calculo.resultado as unknown as ResultadoCalculo;
  const isPagar = resultado.imposto_a_pagar > 0;
  const isRestituir = resultado.imposto_a_pagar < 0;

  const handleExportPDF = () => {
    if (!faixas) return;
    const doc = gerarRelatorioPDF(resultado, {
      numero_processo: calculo.numero_processo,
      nome_autor: calculo.nome_autor,
      ano_calendario: calculo.ano_calendario,
      tipo_declaracao: calculo.tipo_declaracao,
      calculo_id: calculo.id,
      inicio_correcao: faixas.length > 0 ? '' : '', // will be fetched
    }, faixas);
    doc.save(`relatorio-${calculo.id}.pdf`);
  };

  const handleRefazer = () => {
    navigate(`/calculo/ajuste-anual?id=${calculo.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Início
        </Button>

        <h1 className="text-2xl font-bold mb-2">Relatório Final — Ajuste Anual IRPF</h1>
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
            R$ {Math.abs(resultado.imposto_a_pagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <TabelaAlteracoes alteracoes={resultado.alteracoes} />
        <BlocoCalculo resultado={resultado} />
        {faixas && faixas.length > 0 && <TabelaFaixas faixas={faixas} ano={calculo.ano_calendario} />}

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
