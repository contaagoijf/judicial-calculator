import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import type { ResultadoRetificacao, DadosEntradaRetificacao, LinhaAnoRetificacao } from '@/services/calculoIRPF';

const RETIFICACAO_EDIT_DRAFT_KEY = 'retificacao-edit-draft';

const fmt = (v: number | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFator = (v: number | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 });

const fmtPct = (v: number | undefined) =>
  `${((v ?? 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const fmtDate = (v: string | undefined) => {
  if (!v) return '-';
  const [y, m, d] = v.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const TabelaParcelas = ({ linhas, titulo }: { linhas: LinhaAnoRetificacao[]; titulo: string }) => (
  <div className="mb-6">
    <h2 className="text-lg font-semibold mb-3 text-foreground">{titulo}</h2>
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="border px-3 py-2">Ano calendário</th>
            <th className="border px-3 py-2">Início correção</th>
            <th className="border px-3 py-2 text-right">Diferença devida</th>
            <th className="border px-3 py-2 text-right">Coef. atualização</th>
            <th className="border px-3 py-2 text-right">Diferença atualizada</th>
            <th className="border px-3 py-2 text-right">Juros %</th>
            <th className="border px-3 py-2 text-right">Juros valor</th>
            <th className="border px-3 py-2 text-right">Valor atualizado</th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr><td colSpan={8} className="border px-3 py-3 text-center text-muted-foreground">Nenhuma linha.</td></tr>
          )}
          {linhas.map((l) => (
            <tr key={`${l.ano_calendario}-${l.tipo_declaracao}`} className="odd:bg-white even:bg-slate-50">
              <td className="border px-3 py-2">{l.ano_calendario}</td>
              <td className="border px-3 py-2">{fmtDate(l.inicio_correcao)}</td>
              <td className="border px-3 py-2 text-right font-mono">R$ {fmt(l.valor_devido)}</td>
              <td className="border px-3 py-2 text-right font-mono">{fmtFator(l.fator_cm)}</td>
              <td className="border px-3 py-2 text-right font-mono">R$ {fmt(l.valor_cm)}</td>
              <td className="border px-3 py-2 text-right font-mono">{fmtPct(l.fator_juros)}</td>
              <td className="border px-3 py-2 text-right font-mono">R$ {fmt(l.valor_juros)}</td>
              <td className="border px-3 py-2 text-right font-mono">R$ {fmt(l.total_com_juros)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

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

  const { resultadoRetificacao: r, dadosEntrada, processo, nomeAutor } = state;
  const limitaAjuiz = dadosEntrada.limita_ajuiz === 'SIM';

  const handleEditar = () => {
    sessionStorage.setItem(RETIFICACAO_EDIT_DRAFT_KEY, JSON.stringify(dadosEntrada));
    navigate('/calculo/retificacao', { state: { editDraft: dadosEntrada } });
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
          tipo_declaracao: dadosEntrada.periodos[0]?.tipo_declaracao as never,
          dados_entrada: dadosEntrada as never,
          resultado: r as never,
        })
        .select('id')
        .single();
      if (error) throw error;
      sessionStorage.removeItem(RETIFICACAO_EDIT_DRAFT_KEY);
      toast({ title: 'Retificação finalizada', description: `ID: ${data.id}` });
      navigate(`/relatorio/${data.id}?calculo_novo=sim`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar retificação.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
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
            <CardHeader><CardTitle className="text-sm">Resumo do Processo</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm"><span className="font-semibold">Data de ajuizamento:</span> {fmtDate(dadosEntrada.data_ajuizamento)}</p>
              <p className="text-sm"><span className="font-semibold">Data da distribuição:</span> {fmtDate(r.data_dist)}</p>
              <p className="text-sm"><span className="font-semibold">Tipo de correção:</span> {dadosEntrada.tipo_correcao}</p>
              <p className="text-sm"><span className="font-semibold">Limita na distribuição:</span> {dadosEntrada.limita_ajuiz ?? 'NAO'}</p>
              <p className="text-sm"><span className="font-semibold">Atualiza cálculo até:</span> {fmtDate(dadosEntrada.data_fim)}</p>
              <p className="text-sm"><span className="font-semibold">Salário mínimo (DATA_DIST):</span> R$ {fmt(r.salario_min)}</p>
              <p className="text-sm"><span className="font-semibold">Teto RPV (60×SM):</span> R$ {fmt(r.val_teto)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Principal devido</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-mono">R$ {fmt(r.principal_devido)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Juros devido</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-mono">R$ {fmt(r.juros_devido)}</p></CardContent>
          </Card>
          <Card className="md:col-span-4 border-primary/40">
            <CardHeader><CardTitle className="text-sm">Total da execução</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-mono">R$ {fmt(r.total_execucao)}</p></CardContent>
          </Card>
        </div>

        {limitaAjuiz && r.linhas_ad.length > 0 && (
          <>
            <TabelaParcelas linhas={r.linhas_ad} titulo="Parcelas devidas até a data de distribuição" />

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-foreground">Resumo até a data da distribuição (teto dos juizados especiais)</h2>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    <tr className="bg-white"><td className="border px-3 py-2">Total do principal até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_cm_dif_ad)}</td></tr>
                    <tr className="bg-slate-50"><td className="border px-3 py-2">Total dos juros até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_dif_ad)}</td></tr>
                    <tr className="bg-white"><td className="border px-3 py-2">Valor total das parcelas vencidas até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.totais_dif_ad)}</td></tr>
                    <tr className="bg-slate-50"><td className="border px-3 py-2">Teto máximo dos juizados especiais na data da distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.val_teto)}</td></tr>
                    <tr className="bg-white"><td className="border px-3 py-2">Valor final total do principal até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_principal_ad)}</td></tr>
                    <tr className="bg-slate-50"><td className="border px-3 py-2">Valor final total dos juros até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td></tr>
                    <tr className="bg-white"><td className="border px-3 py-2">Valor devido na data da distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_devido_ad)}</td></tr>
                    <tr className="bg-slate-50"><td className="border px-3 py-2">Data da distribuição</td><td className="border px-3 py-2 text-right">{fmtDate(r.data_dist)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-foreground">Atualização do devido até a data limite</h2>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="border px-3 py-2">Tipo</th>
                      <th className="border px-3 py-2">Início correção</th>
                      <th className="border px-3 py-2 text-right">Diferença devida</th>
                      <th className="border px-3 py-2 text-right">Coef. atualização</th>
                      <th className="border px-3 py-2 text-right">Diferença atualizada</th>
                      <th className="border px-3 py-2 text-right">Juros %</th>
                      <th className="border px-3 py-2 text-right">Juros valor</th>
                      <th className="border px-3 py-2 text-right">Valor atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border px-3 py-2">PRINCIPAL</td>
                      <td className="border px-3 py-2">{fmtDate(r.data_dist)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_principal_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">{fmtFator(r.fator_cm_fim)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.principal_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">{fmtPct(r.fator_juros_fim)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.juros_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.principal_juros_ad)}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border px-3 py-2">JUROS</td>
                      <td className="border px-3 py-2">{fmtDate(r.data_dist)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">{fmtFator(r.fator_cm_fim)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad * r.fator_cm_fim)}</td>
                      <td className="border px-3 py-2 text-right">-</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad * r.fator_cm_fim)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad * r.fator_cm_fim)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <TabelaParcelas
          linhas={r.linhas_pos}
          titulo={limitaAjuiz ? 'Parcelas devidas — posteriores à data de distribuição' : 'Cálculo das parcelas devidas'}
        />

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Total das diferenças atualizadas</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono">R$ {fmt(r.total_cm_dif_fim)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Total dos juros</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono">R$ {fmt(r.total_juros_dif_fim)}</p></CardContent>
          </Card>
          <Card className="border-primary/40">
            <CardHeader><CardTitle className="text-sm">Total da execução</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono">R$ {fmt(r.total_execucao)}</p></CardContent>
          </Card>
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
