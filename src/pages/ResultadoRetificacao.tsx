import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import type { ResultadoRetificacao, DadosEntradaRetificacao, PeriodoRetificacao } from '@/services/calculoIRPF';

const RETIFICACAO_EDIT_DRAFT_KEY = 'retificacao-edit-draft';

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ResultadoRetificacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  const state = location.state as {
    resultadoRetificacao: ResultadoRetificacao;
    dadosEntrada: DadosEntradaRetificacao;
    processo: string;
    nomeAutor: string;
  } | null;

  if (!state) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-muted-foreground mb-4">Nenhum resultado disponível. Realize uma retificação primeiro.</p>
        <Button onClick={() => navigate('/calculo/retificacao')}>Ir para Retificação</Button>
      </div>
    );
  }

  const { resultadoRetificacao, dadosEntrada, processo, nomeAutor } = state;
  const isRestituir = resultadoRetificacao.total_imposto_a_pagar > 0;
  const isPagar = resultadoRetificacao.total_imposto_a_pagar < 0;
  const limitaAjuiz = dadosEntrada.limita_ajuiz === 'SIM';

  const formatDate = (value: string | undefined) => value || '-';
  const deriveValorDevido = (periodo: PeriodoRetificacao) =>
    Math.max(0, periodo.resultado.imposto_devido - periodo.resultado.alteracoes.imposto_pago.original);

  const totalsResumo = {
    totalPrincipalAd: resultadoRetificacao.total_imposto_devido_original,
    totalJurosAd: resultadoRetificacao.total_imposto_pago,
    totalExecucao: resultadoRetificacao.total_imposto_a_pagar,
    valTeto: resultadoRetificacao.periodos[0]?.resultado.teto ?? 0,
    dataDist: dadosEntrada.data_fim || '-',
  };

  const handleEditar = () => {
    const editDraft = { processo, nomeAutor, periodos: dadosEntrada.periodos };
    sessionStorage.setItem(RETIFICACAO_EDIT_DRAFT_KEY, JSON.stringify(editDraft));
    navigate('/calculo/retificacao', { state: { editDraft } });
  };

  const handleFinalizar = async () => {
    try {
      const { data, error } = await supabase
        .from('calculos')
        .insert({
          tipo_calculo: 'retificacao',
          ano_calendario: dadosEntrada.periodos[0]?.ano_calendario || new Date().getFullYear(),
          numero_processo: processo,
          nome_autor: nomeAutor,
          tipo_declaracao: dadosEntrada.periodos[0]?.tipo_declaracao as any,
          dados_entrada: dadosEntrada as any,
          resultado: resultadoRetificacao as any,
        })
        .select('id')
        .single();

      if (error) throw error;

      sessionStorage.removeItem(RETIFICACAO_EDIT_DRAFT_KEY);
      toast({ title: 'Retificação finalizada', description: `ID: ${data.id}` });
      navigate(`/relatorio/${data.id}?calculo_novo=sim`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message ?? 'Falha ao salvar retificação.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={handleEditar} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Formulário
        </Button>

        <h1 className="text-2xl font-bold mb-2">Simulação de Retificação — IRPF</h1>
        <p className="text-muted-foreground mb-6">Processo: {processo} · Autor: {nomeAutor}</p>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Resumo do Relatório</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm"><span className="font-semibold">Processo:</span> {processo}</p>
              <p className="text-sm"><span className="font-semibold">Autor:</span> {nomeAutor}</p>
              <p className="text-sm"><span className="font-semibold">Data de ajuizamento:</span> {formatDate(dadosEntrada.data_ajuizamento)}</p>
              <p className="text-sm"><span className="font-semibold">Limita ajuiz:</span> {dadosEntrada.limita_ajuiz ?? 'NAO'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Principal devido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ {fmt(resultadoRetificacao.total_imposto_devido_original)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Juros devido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ {fmt(resultadoRetificacao.total_imposto_pago)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total da execução</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ {fmt(resultadoRetificacao.total_imposto_a_pagar)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground">{limitaAjuiz ? 'Cálculo das parcelas devidas até a data de distribuição' : 'Cálculo das Parcelas Devidas'}</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border px-3 py-2">Ano calendário</th>
                  <th className="border px-3 py-2">Início correção</th>
                  <th className="border px-3 py-2 text-right">Valor devido</th>
                  <th className="border px-3 py-2 text-right">Coef. atualização</th>
                  <th className="border px-3 py-2 text-right">Dif. atualizada</th>
                  <th className="border px-3 py-2 text-right">Juros %</th>
                  <th className="border px-3 py-2 text-right">Juros valor</th>
                  <th className="border px-3 py-2 text-right">Valor atualizado</th>
                </tr>
              </thead>
              <tbody>
                {resultadoRetificacao.periodos.map((periodo) => {
                  const valorDevido = deriveValorDevido(periodo);
                  const valorAtualizado = limitaAjuiz ? periodo.resultado.imposto_a_pagar : 0;
                  return (
                    <tr key={`${periodo.ano_calendario}-${periodo.tipo_declaracao}`} className="odd:bg-white even:bg-slate-50">
                      <td className="border px-3 py-2">{periodo.ano_calendario}</td>
                      <td className="border px-3 py-2">-</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(valorDevido)}</td>
                      <td className="border px-3 py-2 text-right">{limitaAjuiz ? '-' : ''}</td>
                      <td className="border px-3 py-2 text-right font-mono">{limitaAjuiz ? `R$ ${fmt(valorAtualizado)}` : ''}</td>
                      <td className="border px-3 py-2 text-right">{limitaAjuiz ? '-' : ''}</td>
                      <td className="border px-3 py-2 text-right">{limitaAjuiz ? '-' : ''}</td>
                      <td className="border px-3 py-2 text-right font-mono">{limitaAjuiz ? `R$ ${fmt(valorAtualizado)}` : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {limitaAjuiz && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-foreground">Cálculo da atualização do devido antes da data da distribuição para a data limite de atualização</h2>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border px-3 py-2">Descrição</th>
                    <th className="border px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border px-3 py-2">Total do principal até a distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.totalPrincipalAd)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border px-3 py-2">Total dos juros até a distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.totalJurosAd)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border px-3 py-2">Valor total das parcelas vencidas até a distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.totalExecucao)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border px-3 py-2">Teto máximo dos juizados especiais na data da distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.valTeto)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border px-3 py-2">Valor final total do principal até a distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.totalPrincipalAd)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border px-3 py-2">Valor final total dos juros até a distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.totalJurosAd)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border px-3 py-2">Valor devido na data da distribuição</td>
                    <td className="border px-3 py-2 text-right font-mono">R$ {fmt(totalsResumo.totalExecucao)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border px-3 py-2">Data da distribuição</td>
                    <td className="border px-3 py-2 text-right">{totalsResumo.dataDist}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-end mt-6">
          <Button variant="outline" onClick={handleEditar} className="gap-2">
            <Edit className="w-4 h-4" /> Editar
          </Button>
          <Button onClick={handleFinalizar} className="gap-2">
            <Check className="w-4 h-4" /> Finalizar e Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultadoRetificacaoPage;
