import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalculo } from '@/hooks/useIRData';
import { useFaixasIR, useFaixasIRAll } from '@/hooks/useIRData';
import TabelaAlteracoes from '@/components/TabelaAlteracoes';
import BlocoCalculo from '@/components/BlocoCalculo';
import TabelaFaixas from '@/components/TabelaFaixas';
import { gerarRelatorioPDF } from '@/services/pdfGenerator';
import type {
  ResultadoCalculo,
  ResultadoRetificacao,
  DadosEntradaRetificacao,
  LinhaAnoRetificacao,
  AlteracaoRetificacao,
  FaixaIR,
} from '@/services/calculoIRPF';

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
const fmtMesAno = (v: string | undefined) => {
  if (!v) return '-';
  const [y, m] = v.split('T')[0].split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${meses[Number(m) - 1]}-${y}`;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-base font-semibold mt-8 mb-3 text-foreground border-b border-border pb-2 uppercase tracking-wide">
    {children}
  </h2>
);

const RelatorioPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNovo = searchParams.get('calculo_novo') === 'sim';

  const { data: calculo, isLoading } = useCalculo(id || null);
  const { data: faixas } = useFaixasIR(calculo?.ano_calendario || null);
  const { data: faixasAll } = useFaixasIRAll();

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
  const r = calculo.resultado as unknown as ResultadoRetificacao;
  const dadosEntrada = calculo.dados_entrada as unknown as DadosEntradaRetificacao;
  const resultadoAjuste = calculo.resultado as unknown as ResultadoCalculo;
  const isRestituir = !isRetificacao && resultadoAjuste.imposto_a_pagar > 0;
  const isPagar = !isRetificacao && resultadoAjuste.imposto_a_pagar < 0;
  const honorariosPercent = (dadosEntrada?.percentual_honorarios ?? 0) / 100;
  const honorariosValue = Math.round(
    ((r.periodos ?? []).reduce((sum, p) => sum + p.valor_devido, 0) * honorariosPercent) * 100
  ) / 100;

  const handleExportPDF = () => {
    const faixasParaPDF: FaixaIR[] = isRetificacao ? (faixasAll ?? []) : (faixas ?? []);
    const data = {
      numero_processo: calculo.numero_processo,
      nome_autor: calculo.nome_autor,
      tipo_declaracao: calculo.tipo_declaracao,
      calculo_id: calculo.id,
      inicio_correcao: isRetificacao ? dadosEntrada?.data_ajuizamento ?? '' : '',
      tipo_calculo: calculo.tipo_calculo,
      ano_calendario: calculo.ano_calendario,
      anos: isRetificacao ? dadosEntrada?.periodos?.map((p) => p.ano_calendario) : undefined,
      dados_entrada: isRetificacao ? dadosEntrada : undefined,
    };
    const doc = gerarRelatorioPDF(isRetificacao ? r : resultadoAjuste, data, faixasParaPDF);
    doc.save(`relatorio-${calculo.id}.pdf`);
  };

  const handleRefazer = () => {
    if (isRetificacao) navigate(`/calculo/retificacao?id=${calculo.id}`);
    else navigate(`/calculo/ajuste-anual?id=${calculo.id}`);
  };

  const tipoCorrecaoLabel = (tc?: string) => {
    if (tc === 'SELIC') return 'SELIC';
    if (tc === 'SELIC_POUPANCA') return 'SELIC + Poupança';
    return 'Sem correção';
  };

  // Coleta alterações de todos os anos para a seção "Valores acrescidos/retirados"
  const todasAlteracoes: Array<AlteracaoRetificacao & { ano: number }> = isRetificacao
    ? (dadosEntrada?.periodos ?? []).flatMap((p) =>
        (p.alteracoes ?? []).map((a) => ({ ...a, ano: p.ano_calendario }))
      )
    : [];

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
          {!isRetificacao && <span>Ano: <strong className="text-foreground">{calculo.ano_calendario}</strong></span>}
          <span>ID: <strong className="text-foreground font-mono text-xs">{calculo.id}</strong></span>
        </div>

        {!isRetificacao && (
          <div className={`rounded-lg border-2 p-6 text-center mb-6 ${isPagar ? 'border-destructive/40 bg-destructive/5' : isRestituir ? 'border-green-500/40 bg-green-50' : 'border-border'}`}>
            <p className="text-sm text-muted-foreground mb-1">
              {isPagar ? 'Imposto a Pagar' : isRestituir ? 'Valor a Restituir' : 'Sem diferença'}
            </p>
            <p className={`text-3xl font-bold font-mono ${isPagar ? 'text-destructive' : isRestituir ? 'text-green-600' : 'text-foreground'}`}>
              R$ {Math.abs(resultadoAjuste.imposto_a_pagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {isRetificacao ? (
          <>
            {/* ===== SEÇÃO 1 — CÁLCULO DO DEVIDO ===== */}
            <SectionTitle>Cálculo do Devido</SectionTitle>

            {r.linhas_ad.length > 0 && (
              <div className="overflow-x-auto rounded-md border bg-card mb-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="border px-3 py-2">Tipo</th>
                      <th className="border px-3 py-2">Início da correção</th>
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
                      <td className="border px-3 py-2 font-semibold">PRINCIPAL</td>
                      <td className="border px-3 py-2">{fmtDate(r.data_dist)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_principal_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">{fmtFator(r.fator_cm_fim)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.principal_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">{fmtPct(r.fator_juros_fim)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.juros_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.principal_juros_ad)}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border px-3 py-2 font-semibold">JUROS</td>
                      <td className="border px-3 py-2">{fmtDate(r.data_dist)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">{fmtFator(1)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td>
                      <td className="border px-3 py-2 text-right">—</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td>
                    </tr>
                    <tr className="bg-slate-200 font-semibold">
                      <td className="border px-3 py-2" colSpan={4}>TOTAL:</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_principal_ad)}</td>
                      <td className="border px-3 py-2"></td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.juros_ad + r.total_juros_ad)}</td>
                      <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.principal_juros_ad + r.total_juros_ad)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {r.linhas_pos.length > 0 && (
              <>
                <h3 className="text-sm font-semibold mb-2 mt-4 text-muted-foreground uppercase">
                  Cálculo das parcelas devidas — posteriores à data da distribuição
                </h3>
                <div className="overflow-x-auto rounded-md border bg-card mb-4">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="border px-3 py-2">Ano calendário</th>
                        <th className="border px-3 py-2">Início da correção</th>
                        <th className="border px-3 py-2 text-right">Diferença devida</th>
                        <th className="border px-3 py-2 text-right">Coef. atualização</th>
                        <th className="border px-3 py-2 text-right">Diferença atualizada</th>
                        <th className="border px-3 py-2 text-right">Juros %</th>
                        <th className="border px-3 py-2 text-right">Juros valor</th>
                        <th className="border px-3 py-2 text-right">Valor atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.linhas_pos.map((l: LinhaAnoRetificacao) => (
                        <tr key={`pos-${l.ano_calendario}-${l.tipo_declaracao}`} className="odd:bg-white even:bg-slate-50">
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
                      <tr className="bg-slate-200 font-semibold">
                        <td className="border px-3 py-2" colSpan={4}>TOTAL:</td>
                        <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_cm_dif_fim)}</td>
                        <td className="border px-3 py-2"></td>
                        <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_dif_fim)}</td>
                        <td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_cm_dif_fim + r.total_juros_dif_fim)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Resumo Geral */}
            <div className="rounded-md border bg-slate-50 p-4 mb-4">
              <h3 className="font-semibold mb-3 text-foreground">Resumo Geral</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Principal devido</p>
                  <p className="font-mono text-lg">R$ {fmt(r.principal_devido)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Juros devido</p>
                  <p className="font-mono text-lg">R$ {fmt(r.juros_devido)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Honorários</p>
                  <p className="font-mono text-lg">R$ {fmt(honorariosValue)}</p>
                </div>
                <div className="md:border-l md:pl-3">
                  <p className="text-muted-foreground font-semibold">Total da execução</p>
                  <p className="font-mono text-xl font-bold">R$ {fmt(r.total_execucao)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-md border bg-slate-50 p-4 mb-4">
              <h3 className="font-semibold mb-3 text-foreground">Honorários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Percentual aplicado</p>
                  <p className="font-mono">{dadosEntrada.percentual_honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Honorários totais</p>
                  <p className="font-mono">R$ {fmt(honorariosValue)}</p>
                </div>
              </div>
            </div>

            {/* Memória de cálculo */}
            <div className="rounded-md border bg-card p-4 mb-4 text-sm">
              <h3 className="font-semibold mb-2 text-foreground">Memória de cálculo</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Tipo de correção: <strong className="text-foreground">{tipoCorrecaoLabel(dadosEntrada?.tipo_correcao)}</strong></li>
                <li>Data da distribuição: <strong className="text-foreground">{fmtDate(r.data_dist)}</strong></li>
                {dadosEntrada?.data_fim && (
                  <li>Cálculo atualizado até: <strong className="text-foreground">{fmtDate(dadosEntrada.data_fim)}</strong></li>
                )}
                <li>Limita ao ajuizamento (teto dos juizados): <strong className="text-foreground">{dadosEntrada?.limita_ajuiz === 'SIM' ? 'Sim' : 'Não'}</strong></li>
              </ul>
            </div>

            {/* ===== SEÇÃO 2 — DEMONSTRATIVO TETO JUIZADOS ===== */}
            {dadosEntrada?.limita_ajuiz === 'SIM' && r.linhas_ad.length > 0 && (
              <>
                <SectionTitle>Demonstrativo do valor devido até a data da distribuição (teto dos juizados)</SectionTitle>
                <div className="overflow-x-auto rounded-md border bg-card mb-4">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="border px-3 py-2">Ano calendário</th>
                        <th className="border px-3 py-2">Início da correção</th>
                        <th className="border px-3 py-2 text-right">Diferença devida</th>
                        <th className="border px-3 py-2 text-right">Coef. atualização</th>
                        <th className="border px-3 py-2 text-right">Diferença atualizada</th>
                        <th className="border px-3 py-2 text-right">Juros %</th>
                        <th className="border px-3 py-2 text-right">Juros valor</th>
                        <th className="border px-3 py-2 text-right">Valor atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.linhas_ad.map((l: LinhaAnoRetificacao) => (
                        <tr key={`ad-${l.ano_calendario}-${l.tipo_declaracao}`} className="odd:bg-white even:bg-slate-50">
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

                <div className="overflow-x-auto rounded-md border bg-card mb-4">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr className="bg-white"><td className="border px-3 py-2">Valor total do principal até a distribuição</td><td className="border px-3 py-2 text-right font-mono w-56">R$ {fmt(r.total_cm_dif_ad)}</td></tr>
                      <tr className="bg-slate-50"><td className="border px-3 py-2">Valor total dos juros até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_dif_ad)}</td></tr>
                      <tr className="bg-white"><td className="border px-3 py-2">Valor total das parcelas vencidas até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.totais_dif_ad)}</td></tr>
                      <tr className="bg-slate-50"><td className="border px-3 py-2">Teto máximo dos juizados especiais na data da distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.val_teto)}</td></tr>
                      <tr className="bg-white"><td className="border px-3 py-2">Valor final do principal até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_principal_ad)}</td></tr>
                      <tr className="bg-slate-50"><td className="border px-3 py-2">Valor final dos juros até a distribuição</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_juros_ad)}</td></tr>
                      <tr className="bg-white font-semibold"><td className="border px-3 py-2">Valor devido na data da distribuição ({fmtMesAno(r.data_dist)})</td><td className="border px-3 py-2 text-right font-mono">R$ {fmt(r.total_devido_ad)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {r.totais_dif_ad > r.val_teto
                    ? 'O valor devido na data da distribuição foi limitado ao teto dos Juizados Federais.'
                    : 'O valor devido na data da distribuição não foi limitado ao teto dos Juizados Federais.'}
                </p>
              </>
            )}

            {/* ===== SEÇÃO 3 — RELATÓRIO DOS VALORES ACRESCIDOS/RETIRADOS ===== */}
            {todasAlteracoes.length > 0 && (
              <>
                <SectionTitle>Relatório dos valores acrescidos ou retirados da base de cálculo</SectionTitle>
                <div className="overflow-x-auto rounded-md border bg-card mb-4">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="border px-3 py-2">Data</th>
                        <th className="border px-3 py-2 text-right">Valor a retirar</th>
                        <th className="border px-3 py-2 text-right">Valor a acrescer</th>
                        <th className="border px-3 py-2">Histórico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todasAlteracoes.map((a) => {
                        const retirar = (a.rend_sub || 0) + (a.ded_somar || 0) + (a.incentivo_somar || 0);
                        const acrescer = (a.rend_somar || 0) + (a.ded_sub || 0) + (a.incentivo_sub || 0);
                        return (
                          <tr key={a.id} className="odd:bg-white even:bg-slate-50">
                            <td className="border px-3 py-2">{fmtMesAno(a.data_alt)}</td>
                            <td className="border px-3 py-2 text-right font-mono">{retirar > 0 ? `R$ ${fmt(retirar)}` : ''}</td>
                            <td className="border px-3 py-2 text-right font-mono">{acrescer > 0 ? `R$ ${fmt(acrescer)}` : ''}</td>
                            <td className="border px-3 py-2 text-muted-foreground">{a.motivo ?? ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ===== SEÇÃO 4 — CÁLCULO DAS DECLARAÇÕES (parciais por ano) ===== */}
            <SectionTitle>Cálculo das declarações — variáveis parciais por ano</SectionTitle>
            <div className="space-y-6">
              {r.periodos.map((p) => {
                const faixasAno = (faixasAll ?? []).filter((f) => f.ano_calendario === p.ano_calendario);
                const inputPeriodo = dadosEntrada?.periodos?.find(
                  (x) => x.ano_calendario === p.ano_calendario && x.tipo_declaracao === p.tipo_declaracao
                );
                return (
                  <div key={`parcial-${p.ano_calendario}-${p.tipo_declaracao}`} className="rounded-md border bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between mb-3">
                      <h3 className="font-semibold text-foreground">
                        Ano-calendário: {p.ano_calendario}
                      </h3>
                      <span className="text-sm text-muted-foreground uppercase">
                        Tipo de declaração: {p.tipo_declaracao}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <tbody>
                          {[
                            ['(*) Total dos rendimentos tributáveis (+)', inputPeriodo?.rendimentos_tributaveis ?? p.resultado.alteracoes.rendimentos.original],
                            ['Acréscimo nos rendimentos tributáveis (+)', p.resultado.alteracoes.rendimentos.acrescimo],
                            ['Decréscimo nos rendimentos tributáveis (-)', p.resultado.alteracoes.rendimentos.decrescimo],
                            ['Total dos rendimentos tributáveis (=)', p.resultado.rend_trib_recalc],
                            ['(*) Total das deduções (-)', p.resultado.total_deducoes_recalc],
                            ['Nova base de cálculo (=)', p.resultado.base_calculo_recalc],
                            ['Alíquota aplicável (x)', `${(p.resultado.aliquota_recalc).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`],
                            ['Parcela de dedução (-)', p.resultado.deducao_recalc],
                            ['(*) Total das deduções de incentivo (-)', p.resultado.incentivo_recalc],
                            ['(*) Imposto devido RRA (+)', p.resultado.imposto_rra_recalc],
                            ['Imposto devido (=)', p.resultado.imposto_devido_recalc],
                            ['(*) Total do imposto pago (-)', p.resultado.alteracoes.imposto_pago.recalculado],
                            [p.resultado.imposto_a_pagar >= 0 ? 'Imposto a pagar (=)' : 'Imposto a restituir (=)', Math.abs(p.resultado.imposto_a_pagar)],
                            ['Total devido (valor)', p.valor_devido],
                          ].map(([label, val], idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="border px-3 py-1.5">{label as string}</td>
                              <td className="border px-3 py-1.5 text-right font-mono">
                                {typeof val === 'number' ? `R$ ${fmt(val)}` : val}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {faixasAno.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Tabela do IRRF — ano-calendário {p.ano_calendario}</p>
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-left">
                              <th className="border px-2 py-1">De</th>
                              <th className="border px-2 py-1">Até</th>
                              <th className="border px-2 py-1 text-right">Alíquota</th>
                              <th className="border px-2 py-1 text-right">Dedução</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...faixasAno]
                              .sort((a, b) => a.limite_inferior - b.limite_inferior)
                              .map((f, i) => (
                                <tr key={i} className="odd:bg-white even:bg-slate-50">
                                  <td className="border px-2 py-1 font-mono">R$ {fmt(f.limite_inferior)}</td>
                                  <td className="border px-2 py-1 font-mono">{f.limite_superior ? `R$ ${fmt(f.limite_superior)}` : '—'}</td>
                                  <td className="border px-2 py-1 text-right font-mono">
                                    {(f.aliquota <= 1 ? f.aliquota * 100 : f.aliquota).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                                  </td>
                                  <td className="border px-2 py-1 text-right font-mono">R$ {fmt(f.deducao)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        <p className="text-[10px] text-muted-foreground mt-1">(*) valor retirado da declaração de ajuste anual.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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
