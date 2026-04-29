import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import type { ResultadoRetificacao, DadosEntradaRetificacao } from '@/services/calculoIRPF';

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
        <p className="text-muted-foreground mb-6">
          Processo: {processo} · Autor: {nomeAutor}
        </p>

        <Card className={`mb-6 border-2 ${isPagar ? 'border-destructive/40 bg-destructive/5' : isRestituir ? 'border-green-500/40 bg-green-50' : 'border-border'}`}>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {isPagar ? 'Imposto a Pagar' : isRestituir ? 'Valor a Restituir' : 'Sem diferença'}
            </p>
            <p className={`text-3xl font-bold font-mono ${isPagar ? 'text-destructive' : isRestituir ? 'text-green-600' : 'text-foreground'}`}>
              R$ {fmt(Math.abs(resultadoRetificacao.total_imposto_a_pagar))}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total de imposto devido original</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ {fmt(resultadoRetificacao.total_imposto_devido_original)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total do imposto pago</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ {fmt(resultadoRetificacao.total_imposto_pago)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total base de cálculo recalculada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ {fmt(resultadoRetificacao.total_base_calculo_recalc)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border px-3 py-2">Ano</th>
                <th className="border px-3 py-2">Declaração</th>
                <th className="border px-3 py-2 text-right">Imposto Devido</th>
                <th className="border px-3 py-2 text-right">Imposto Pago</th>
                <th className="border px-3 py-2 text-right">Resultado</th>
                <th className="border px-3 py-2 text-center">Consistente</th>
              </tr>
            </thead>
            <tbody>
              {resultadoRetificacao.periodos.map((periodo) => (
                <tr key={`${periodo.ano_calendario}-${periodo.tipo_declaracao}`} className="odd:bg-white even:bg-slate-50">
                  <td className="border px-3 py-2">{periodo.ano_calendario}</td>
                  <td className="border px-3 py-2">{periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}</td>
                  <td className="border px-3 py-2 text-right font-mono">R$ {fmt(periodo.resultado.imposto_devido)}</td>
                  <td className="border px-3 py-2 text-right font-mono">R$ {fmt(periodo.resultado.alteracoes.imposto_pago.original)}</td>
                  <td className="border px-3 py-2 text-right font-mono">R$ {fmt(periodo.resultado.imposto_a_pagar)}</td>
                  <td className="border px-3 py-2 text-center">{periodo.validacao.consistente ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
