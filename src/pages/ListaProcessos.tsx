import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardPaste, Edit, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTodosCalculos } from '@/hooks/useIRData';
import { useAuth } from '@/contexts/AuthContext';
import { AdminAuthDialog } from '@/components/AdminAuthDialog';
import { supabase } from '@/integrations/supabase/externalClient';
import type { DadosEntradaAjusteAnual, DadosEntradaRetificacao } from '@/services/calculoIRPF';
import { formatNumeroProcesso, isNumeroProcessoCompleto } from '@/lib/masks';

const fmt = (v: number | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v: string | undefined) => {
  if (!v) return '-';
  const [y, m, d] = v.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};
const maskData = (v: string) => {
  const digitos = v.replace(/\D/g, '').slice(0, 8);
  const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean);
  return partes.join('/');
};

type Declaracao = {
  id: string;
  ano_calendario: number;
  tipo_declaracao: string;
  criado_em: string;
  dados: DadosEntradaAjusteAnual;
};

type GrupoProcesso = {
  numero_processo: string;
  nome_autor: string;
  data_ajuizamento?: string;
  declaracoes: Declaracao[];
};

const ListaProcessosPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { data: calculos, isLoading, refetch } = useTodosCalculos();
  const [removerAlvo, setRemoverAlvo] = useState<{ id: string; label: string } | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [buscaProcesso, setBuscaProcesso] = useState('');
  const [buscaAutor, setBuscaAutor] = useState('');
  const [buscaData, setBuscaData] = useState('');
  const [processoInvalidoOpen, setProcessoInvalidoOpen] = useState(false);

  const handleBuscaProcessoBlur = () => {
    if (buscaProcesso.trim() && !isNumeroProcessoCompleto(buscaProcesso)) {
      setProcessoInvalidoOpen(true);
    }
  };

  const handleColarProcesso = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      setBuscaProcesso(formatNumeroProcesso(texto));
    } catch {
      toast({
        title: 'Não foi possível colar',
        description: 'Permita o acesso à área de transferência para usar este botão.',
        variant: 'destructive',
      });
    }
  };

  const handleColarNomeAutor = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      setBuscaAutor(texto);
    } catch {
      toast({
        title: 'Não foi possível colar',
        description: 'Permita o acesso à área de transferência para usar este botão.',
        variant: 'destructive',
      });
    }
  };

  const grupos = useMemo<GrupoProcesso[]>(() => {
    if (!calculos) return [];
    const porProcesso = new Map<string, typeof calculos>();
    for (const c of calculos) {
      const lista = porProcesso.get(c.numero_processo) ?? [];
      lista.push(c);
      porProcesso.set(c.numero_processo, lista);
    }

    const resultado: GrupoProcesso[] = [];
    for (const [numero_processo, rows] of porProcesso) {
      const maisRecente = rows[0]; // já vem ordenado por criado_em desc
      const retificacaoMaisRecente = rows.find((r) => r.tipo_calculo === 'retificacao');
      const dataAjuizamento = retificacaoMaisRecente
        ? (retificacaoMaisRecente.dados_entrada as unknown as DadosEntradaRetificacao).data_ajuizamento
        : undefined;

      const declaracoes: Declaracao[] = rows
        .filter((r) => r.tipo_calculo === 'ajuste_anual')
        .map((r) => ({
          id: r.id,
          ano_calendario: r.ano_calendario,
          tipo_declaracao: r.tipo_declaracao,
          criado_em: r.criado_em,
          dados: r.dados_entrada as unknown as DadosEntradaAjusteAnual,
        }))
        .sort((a, b) => a.ano_calendario - b.ano_calendario || a.criado_em.localeCompare(b.criado_em));

      resultado.push({
        numero_processo,
        nome_autor: maisRecente.nome_autor,
        data_ajuizamento: dataAjuizamento,
        declaracoes,
      });
    }

    resultado.sort((a, b) => {
      const ta = a.declaracoes[0]?.criado_em ?? '';
      const tb = b.declaracoes[0]?.criado_em ?? '';
      return tb.localeCompare(ta);
    });
    return resultado;
  }, [calculos]);

  const termoProcesso = buscaProcesso.trim().toLowerCase();
  const termoAutor = buscaAutor.trim().toLowerCase();
  const termoData = buscaData.trim().toLowerCase();
  const temFiltro = !!(termoProcesso || termoAutor || termoData);

  // Aplica o filtro automaticamente a cada digitação/colagem em qualquer campo de busca.
  const gruposExibidos = useMemo(() => {
    if (!temFiltro) return grupos;
    return grupos.filter((g) => {
      const matchProcesso = !!termoProcesso && g.numero_processo.toLowerCase().includes(termoProcesso);
      const matchAutor = !!termoAutor && g.nome_autor.toLowerCase().includes(termoAutor);
      const matchData = !!termoData && fmtDate(g.data_ajuizamento).toLowerCase().includes(termoData);
      return matchProcesso || matchAutor || matchData;
    });
  }, [grupos, temFiltro, termoProcesso, termoAutor, termoData]);

  const handleLimpar = () => {
    setBuscaProcesso('');
    setBuscaAutor('');
    setBuscaData('');
  };

  const handleRemover = async () => {
    if (!removerAlvo) return;
    setRemovendo(true);
    const { error } = await supabase.from('calculos').delete().eq('id', removerAlvo.id);
    setRemovendo(false);
    if (error) {
      toast({
        title: 'Não foi possível remover',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Declaração removida com sucesso' });
      refetch();
    }
    setRemoverAlvo(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <AdminAuthDialog compact />
        </div>

        <h1 className="text-2xl font-bold mb-6">Processos: {gruposExibidos.length}</h1>

        <div className="form-section mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Busca</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Número do processo</Label>
              <div className="flex gap-2">
                <Input
                  value={buscaProcesso}
                  onChange={(e) => setBuscaProcesso(formatNumeroProcesso(e.target.value))}
                  onBlur={handleBuscaProcessoBlur}
                  placeholder="0000000-00.0000.0.00.0000"
                  inputMode="numeric"
                  className="min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleColarProcesso}
                  title="Colar número do processo da área de transferência"
                  className="shrink-0"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do autor</Label>
              <div className="flex gap-2">
                <Input
                  value={buscaAutor}
                  onChange={(e) => setBuscaAutor(e.target.value)}
                  placeholder="Nome completo"
                  className="min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleColarNomeAutor}
                  title="Colar nome do autor da área de transferência"
                  className="shrink-0"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Data do ajuizamento</Label>
              <Input
                value={buscaData}
                onChange={(e) => setBuscaData(maskData(e.target.value))}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLimpar} className="gap-2">
              <X className="w-4 h-4" /> Limpar
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Carregando...</p>}
        {!isLoading && gruposExibidos.length === 0 && (
          <p className="text-muted-foreground">
            {temFiltro
              ? 'Nenhum Processo encontrado com as informações inseridas.'
              : 'Nenhum processo registrado.'}
          </p>
        )}

        {gruposExibidos.map((grupo) => (
          <div key={grupo.numero_processo} className="form-section mb-8">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Dados do Processo</h2>
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm mb-6">
              <span>Número do processo: <strong className="text-foreground">{grupo.numero_processo}</strong></span>
              <span>Nome do autor: <strong className="text-foreground">{grupo.nome_autor}</strong></span>
              <span>Data do ajuizamento: <strong className="text-foreground">{fmtDate(grupo.data_ajuizamento)}</strong></span>
            </div>

            <h3 className="text-base font-semibold mb-3 text-foreground">Dados de Declarações Anuais</h3>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-slate-100 text-left">
                  <tr>
                    <th className="px-4 py-3">Ano calendário</th>
                    <th className="px-4 py-3">Tipo decl.</th>
                    <th className="px-4 py-3 text-right">Rendimentos</th>
                    <th className="px-4 py-3 text-right">Imposto pago</th>
                    <th className="px-4 py-3 text-right">Ajuste anual</th>
                    <th className="px-4 py-3 text-center">Alterações</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.declaracoes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-sm text-muted-foreground">Nenhuma declaração de Ajuste Anual cadastrada.</td>
                    </tr>
                  )}
                  {grupo.declaracoes.map((d) => (
                    <tr key={d.id} className="border-b even:bg-slate-50">
                      <td className="px-4 py-3">{d.ano_calendario}</td>
                      <td className="px-4 py-3">{d.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}</td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {fmt(d.dados.rendimentos_tributaveis)}</td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {fmt(d.dados.imposto_pago)}</td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {fmt(d.dados.ajuste_anual)}</td>
                      <td className="px-4 py-3 text-center">{(d.dados.alteracoes ?? []).length}</td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/calculo/ajuste-anual?id=${d.id}`)}
                          className="gap-2"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRemoverAlvo({ id: d.id, label: `${grupo.numero_processo} · ${d.ano_calendario}` })}
                            className="text-destructive gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Remover
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!removerAlvo} onOpenChange={(open) => !open && setRemoverAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover declaração</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a declaração {removerAlvo?.label}? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoverAlvo(null)} disabled={removendo}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemover} disabled={removendo}>
              {removendo ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={processoInvalidoOpen} onOpenChange={setProcessoInvalidoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Número de processo inválido</DialogTitle>
            <DialogDescription>
              O número do processo informado está incompleto ou não segue o padrão do e-Proc (NNNNNNN-DD.AAAA.J.TR.OOOO). Insira um número de processo válido para continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setProcessoInvalidoOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListaProcessosPage;
