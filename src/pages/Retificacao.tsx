import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIRAll, useCalculo } from '@/hooks/useIRData';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlteracaoRetificacao,
  calcularRetificacao,
  type DadosEntradaAjusteAnual,
  type DadosEntradaRetificacao,
  type ParametrosIR,
  type FaixaIR,
  type TipoCorrecao,
  type TipoLimitaAjuiz,
} from '@/services/calculoIRPF';

const RETIFICACAO_EDIT_DRAFT_KEY = 'retificacao-edit-draft';

type RetificacaoDraft = DadosEntradaRetificacao;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const CampoMonetario = ({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    <Input
      type="number"
      min="0"
      step="0.01"
      value={value !== undefined ? value : ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      placeholder="0,00"
      disabled={disabled}
      className="font-mono"
    />
  </div>
);

const defaultAlteracao = (): AlteracaoRetificacao => ({
  id: makeId(),
  data_alt: '',
  num_folha: undefined,
  rend_somar: 0,
  rend_sub: 0,
  ded_somar: 0,
  ded_sub: 0,
  incentivo_somar: 0,
  incentivo_sub: 0,
  rra_somar: 0,
  rra_sub: 0,
  motivo: '',
});

const defaultPeriodo = (anoCalendario: number | null): DadosEntradaAjusteAnual => ({
  tipo_declaracao: 'completa',
  ano_calendario: anoCalendario ?? new Date().getFullYear(),
  rendimentos_tributaveis: 0,
  deducoes_legais: 0,
  deducoes_incentivo: 0,
  imposto_rra: 0,
  ajuste_anual: 0,
  imposto_pago: 0,
  rend_somar: 0,
  rend_sub: 0,
  ded_somar: 0,
  ded_sub: 0,
  incentivo_somar: 0,
  incentivo_sub: 0,
  rra_somar: 0,
  rra_sub: 0,
  alteracoes: [],
});

const RetificacaoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('id');
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { data: settings } = useSystemSettings();

  const { data: parametros } = useParametrosIR();
  const { data: faixasAll } = useFaixasIRAll();
  const { data: calculoAnterior } = useCalculo(idParam);

  const [processo, setProcesso] = useState('');
  const [nomeAutor, setNomeAutor] = useState('');
  const [dataAjuizamento, setDataAjuizamento] = useState('');
  const [tipoCorrecao, setTipoCorrecao] = useState<TipoCorrecao>('SEM_CORRECAO');
  const [percentHonorarios, setPercentHonorarios] = useState(0);
  const [limitaAjuiz, setLimitaAjuiz] = useState<TipoLimitaAjuiz>('NAO');
  const [dataFim, setDataFim] = useState('');
  const [informacoes, setInformacoes] = useState('');
  const [periodos, setPeriodos] = useState<DadosEntradaAjusteAnual[]>([
    defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear()),
  ]);

  const [periodoDialogOpen, setPeriodoDialogOpen] = useState(false);
  const [editingPeriodoIndex, setEditingPeriodoIndex] = useState<number | null>(null);
  const [periodoDraft, setPeriodoDraft] = useState<DadosEntradaAjusteAnual>(defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear()));

  const [alteracaoDialogOpen, setAlteracaoDialogOpen] = useState(false);
  const [editingAlteracaoId, setEditingAlteracaoId] = useState<string | null>(null);
  const [alteracaoDraft, setAlteracaoDraft] = useState<AlteracaoRetificacao>(defaultAlteracao());

  const toolEnabled = isAdmin || ((settings?.system_enabled ?? true) && (settings?.retificacao_enabled ?? false));

  const preencherFormulario = (draft: DadosEntradaRetificacao) => {
    setProcesso(draft.numero_processo);
    setNomeAutor(draft.nome_autor);
    setDataAjuizamento(draft.data_ajuizamento);
    setTipoCorrecao(draft.tipo_correcao);
    setPercentHonorarios(draft.percentual_honorarios);
    setLimitaAjuiz(draft.limita_ajuiz ?? 'NAO');
    setDataFim(draft.data_fim ?? '');
    setInformacoes(draft.informacoes ?? '');
    setPeriodos(draft.periodos.length > 0 ? draft.periodos : [defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear())]);
  };

  useEffect(() => {
    if (!calculoAnterior || calculoAnterior.tipo_calculo !== 'retificacao') return;
    const entry = calculoAnterior.dados_entrada as unknown as DadosEntradaRetificacao;
    preencherFormulario(entry);
    sessionStorage.removeItem(RETIFICACAO_EDIT_DRAFT_KEY);
  }, [calculoAnterior, parametros]);

  useEffect(() => {
    if (idParam) return;

    const state = location.state as { editDraft?: DadosEntradaRetificacao } | null;
    const draftFromState = state?.editDraft;
    const draftFromStorage = !draftFromState
      ? sessionStorage.getItem(RETIFICACAO_EDIT_DRAFT_KEY)
      : null;
    const draft = draftFromState
      ?? (draftFromStorage ? JSON.parse(draftFromStorage) as DadosEntradaRetificacao : null);

    if (draft) {
      preencherFormulario(draft);
      sessionStorage.removeItem(RETIFICACAO_EDIT_DRAFT_KEY);
    }
  }, [idParam, location.state, parametros]);

  if (!toolEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <div className="page-container">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          <div className="form-section max-w-2xl">
            <h1 className="mb-3 text-2xl font-bold">Ferramenta temporariamente indisponível</h1>
            <p className="text-muted-foreground">
              A retificação foi desabilitada no painel administrativo. Quando a liberação for retomada,
              a ferramenta voltará a funcionar normalmente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const anosOptions = useMemo(() => parametros?.map((p) => p.ano_calendario) ?? [], [parametros]);

  const openNovoPeriodo = () => {
    setEditingPeriodoIndex(null);
    setPeriodoDraft(defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear()));
    setPeriodoDialogOpen(true);
  };

  const openEditarPeriodo = (index: number) => {
    setEditingPeriodoIndex(index);
    setPeriodoDraft({ ...periodos[index], alteracoes: periodos[index].alteracoes ?? [] });
    setPeriodoDialogOpen(true);
  };

  const handleSalvarPeriodo = () => {
    if (!periodoDraft.ano_calendario) {
      toast({ title: 'Erro', description: 'Informe o ano calendário.', variant: 'destructive' });
      return;
    }
    if (periodoDraft.rendimentos_tributaveis < 0) {
      toast({ title: 'Erro', description: 'Informe rendimentos tributáveis válidos.', variant: 'destructive' });
      return;
    }

    const anoDuplicado = periodos.some((periodo, idx) => idx !== editingPeriodoIndex && periodo.ano_calendario === periodoDraft.ano_calendario);
    if (anoDuplicado) {
      toast({ title: 'Erro', description: 'Já existe um ano cadastrado com esse ano calendário.', variant: 'destructive' });
      return;
    }

    const atual = {
      ...periodoDraft,
      alteracoes: periodoDraft.alteracoes ?? [],
    };

    setPeriodos(current => {
      if (editingPeriodoIndex === null) {
        return [...current, atual];
      }
      return current.map((periodo, idx) => idx === editingPeriodoIndex ? atual : periodo);
    });
    setPeriodoDialogOpen(false);
  };

  const handleRemovePeriodo = (index: number) => {
    setPeriodos(current => current.filter((_, idx) => idx !== index));
  };

  const handleSalvarAlteracao = () => {
    if (!alteracaoDraft.data_alt) {
      toast({ title: 'Erro', description: 'Informe a data da alteração.', variant: 'destructive' });
      return;
    }

    const alteracoes = periodoDraft.alteracoes ?? [];
    const updatedAlteracoes = editingAlteracaoId
      ? alteracoes.map((item) => item.id === editingAlteracaoId ? alteracaoDraft : item)
      : [...alteracoes, alteracaoDraft];

    setPeriodoDraft({ ...periodoDraft, alteracoes: updatedAlteracoes });
    setAlteracaoDialogOpen(false);
    setEditingAlteracaoId(null);
  };

  const openNovaAlteracao = () => {
    setEditingAlteracaoId(null);
    setAlteracaoDraft(defaultAlteracao());
    setAlteracaoDialogOpen(true);
  };

  const openEditarAlteracao = (alteracaoId: string) => {
    const item = periodoDraft.alteracoes?.find((alt) => alt.id === alteracaoId);
    if (!item) return;
    setEditingAlteracaoId(alteracaoId);
    setAlteracaoDraft(item);
    setAlteracaoDialogOpen(true);
  };

  const handleRemoverAlteracao = (alteracaoId: string) => {
    setPeriodoDraft((current) => ({
      ...current,
      alteracoes: (current.alteracoes ?? []).filter((item) => item.id !== alteracaoId),
    }));
  };

  const handleSimular = () => {
    if (!processo.trim()) {
      toast({ title: 'Erro', description: 'Informe o número do processo.', variant: 'destructive' });
      return;
    }
    if (!nomeAutor.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome do autor.', variant: 'destructive' });
      return;
    }
    if (!dataAjuizamento) {
      toast({ title: 'Erro', description: 'Informe a data do ajuizamento.', variant: 'destructive' });
      return;
    }
    if (!parametros || parametros.length === 0) {
      toast({ title: 'Erro', description: 'Parâmetros de IR não carregados.', variant: 'destructive' });
      return;
    }
    if (!faixasAll || faixasAll.length === 0) {
      toast({ title: 'Erro', description: 'Faixas de IR não carregadas.', variant: 'destructive' });
      return;
    }
    if (periodos.length === 0) {
      toast({ title: 'Erro', description: 'Adicione ao menos um ano para retificação.', variant: 'destructive' });
      return;
    }

    const problemas = periodos.some((periodo) => {
      const invalidAlteracao = (periodo.alteracoes ?? []).some((alt) => !alt.data_alt);
      return !periodo.ano_calendario || periodo.rendimentos_tributaveis < 0 || periodo.imposto_pago < 0 || invalidAlteracao;
    });

    if (problemas) {
      toast({ title: 'Erro', description: 'Verifique os dados de cada ano e de cada alteração.', variant: 'destructive' });
      return;
    }

    try {
      const dadosEntrada: DadosEntradaRetificacao = {
        numero_processo: processo.trim(),
        nome_autor: nomeAutor.trim(),
        data_ajuizamento: dataAjuizamento,
        tipo_correcao: tipoCorrecao,
        percentual_honorarios: percentHonorarios,
        limita_ajuiz: tipoCorrecao !== 'SEM_CORRECAO' ? limitaAjuiz : undefined,
        data_fim: tipoCorrecao !== 'SEM_CORRECAO' ? dataFim : undefined,
        informacoes: tipoCorrecao !== 'SEM_CORRECAO' ? informacoes : undefined,
        periodos,
      };

      const resultadoRetificacao = calcularRetificacao(dadosEntrada, faixasAll, parametros);

      sessionStorage.setItem(RETIFICACAO_EDIT_DRAFT_KEY, JSON.stringify(dadosEntrada));

      navigate('/resultado-retificacao', {
        state: {
          resultadoRetificacao,
          dadosEntrada,
          processo,
          nomeAutor,
        },
      });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message ?? 'Falha ao simular retificação.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Cálculo de Retificação de IRPF</h1>

        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Dados do Processo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Número do processo *</Label>
              <Input value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do autor *</Label>
              <Input value={nomeAutor} onChange={(e) => setNomeAutor(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Data do ajuizamento *</Label>
              <Input type="date" value={dataAjuizamento} onChange={(e) => setDataAjuizamento(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Correção e honorários</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de correção *</Label>
              <Select value={tipoCorrecao} onValueChange={(value) => setTipoCorrecao(value as TipoCorrecao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELIC">SELIC</SelectItem>
                  <SelectItem value="SELIC_POUPANCA">SELIC até 06/09 e após rentabilidade da poupança</SelectItem>
                  <SelectItem value="SEM_CORRECAO">sem correção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Percentual de honorários *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={percentHonorarios}
                onChange={(e) => setPercentHonorarios(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {tipoCorrecao !== 'SEM_CORRECAO' && (
          <div className="form-section mb-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Correção</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Limita total na data do ajuizamento</Label>
                <Select value={limitaAjuiz} onValueChange={(value) => setLimitaAjuiz(value as TipoLimitaAjuiz)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">SIM</SelectItem>
                    <SelectItem value="NAO">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Atualiza cálculo até</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Informações</Label>
                <Textarea value={informacoes} onChange={(e) => setInformacoes(e.target.value)} placeholder="Digite informações adicionais" />
              </div>
            </div>
          </div>
        )}

        <div className="form-section mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Dados de Declarações Anuais</h2>
              <p className="text-sm text-muted-foreground">Adicione, edite ou exclua anos e suas alterações.</p>
            </div>
            <Button variant="outline" onClick={openNovoPeriodo} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar ano
            </Button>
          </div>

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
                {periodos.map((periodo, index) => (
                  <tr key={`${periodo.ano_calendario}-${index}`} className="border-b even:bg-slate-50">
                    <td className="px-4 py-3">{periodo.ano_calendario}</td>
                    <td className="px-4 py-3">{periodo.tipo_declaracao === 'completa' ? 'Completa' : 'Simplificada'}</td>
                    <td className="px-4 py-3 text-right font-mono">R$ {periodo.rendimentos_tributaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono">R$ {periodo.imposto_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono">R$ {periodo.ajuste_anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center">{(periodo.alteracoes ?? []).length}</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEditarPeriodo(index)} className="gap-2">
                        <Edit className="w-4 h-4" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemovePeriodo(index)} className="text-destructive">
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
                {periodos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-sm text-muted-foreground">Nenhum ano cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSimular} size="lg" className="px-8">
            Simular Retificação
          </Button>
        </div>

        <Dialog open={periodoDialogOpen} onOpenChange={setPeriodoDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto px-0 py-0">
                <DialogHeader>
                  <DialogTitle>{editingPeriodoIndex === null ? 'Adicionar ano' : 'Editar ano'}</DialogTitle>
                  <DialogDescription>Preencha os dados originais e as alterações para o ano selecionado.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label>Ano calendário</Label>
                    <Select value={periodoDraft.ano_calendario.toString()} onValueChange={(value) => setPeriodoDraft({ ...periodoDraft, ano_calendario: parseInt(value) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {anosOptions.map((ano) => (
                          <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de declaração</Label>
                    <Select value={periodoDraft.tipo_declaracao} onValueChange={(value) => setPeriodoDraft({ ...periodoDraft, tipo_declaracao: value as 'completa' | 'simplificada' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completa">Completa</SelectItem>
                        <SelectItem value="simplificada">Simplificada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <CampoMonetario label="Rendimentos tributáveis" value={periodoDraft.rendimentos_tributaveis} onChange={(v) => setPeriodoDraft({ ...periodoDraft, rendimentos_tributaveis: v })} />
                  <CampoMonetario
                    label="Total das deduções"
                    value={periodoDraft.deducoes_legais}
                    onChange={(v) => setPeriodoDraft({ ...periodoDraft, deducoes_legais: v })}
                    disabled={periodoDraft.tipo_declaracao === 'simplificada'}
                  />
                  <CampoMonetario
                    label="Deduções de incentivo"
                    value={periodoDraft.deducoes_incentivo}
                    onChange={(v) => setPeriodoDraft({ ...periodoDraft, deducoes_incentivo: v })}
                    disabled={periodoDraft.tipo_declaracao === 'simplificada'}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <CampoMonetario label="Imposto RRA" value={periodoDraft.imposto_rra} onChange={(v) => setPeriodoDraft({ ...periodoDraft, imposto_rra: v })} />
                  <CampoMonetario label="Total do imposto pago / retido" value={periodoDraft.imposto_pago} onChange={(v) => setPeriodoDraft({ ...periodoDraft, imposto_pago: v })} />
                  <CampoMonetario label="Valor do ajuste anual" value={periodoDraft.ajuste_anual} onChange={(v) => setPeriodoDraft({ ...periodoDraft, ajuste_anual: v })} />
                </div>

                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold">Alterações da Declaração</h3>
                      <p className="text-sm text-muted-foreground">Cada ano pode ter várias alterações.</p>
                    </div>
                    <Button variant="outline" onClick={openNovaAlteracao} className="gap-2">
                      <Plus className="w-4 h-4" /> Nova alteração
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border bg-background">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-slate-100 text-left">
                        <tr>
                          <th className="px-3 py-2">Data</th>
                          <th className="px-3 py-2">Folha</th>
                          <th className="px-3 py-2 text-right">Rend. +</th>
                          <th className="px-3 py-2 text-right">Rend. -</th>
                          <th className="px-3 py-2 text-right">Ded. +</th>
                          <th className="px-3 py-2 text-right">Ded. -</th>
                          <th className="px-3 py-2 text-right">RRA +</th>
                          <th className="px-3 py-2 text-right">RRA -</th>
                          <th className="px-3 py-2 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(periodoDraft.alteracoes ?? []).map((alteracao) => (
                          <tr key={alteracao.id} className="border-b even:bg-slate-50">
                            <td className="px-3 py-2">{alteracao.data_alt}</td>
                            <td className="px-3 py-2">{alteracao.num_folha ?? '-'}</td>
                            <td className="px-3 py-2 text-right font-mono">R$ {alteracao.rend_somar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono">R$ {alteracao.rend_sub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono">R$ {alteracao.ded_somar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono">R$ {alteracao.ded_sub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono">R$ {alteracao.rra_somar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono">R$ {alteracao.rra_sub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-center space-x-1">
                              <Button size="sm" variant="outline" onClick={() => openEditarAlteracao(alteracao.id)} className="gap-1">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRemoverAlteracao(alteracao.id)} className="text-destructive">
                                Excluir
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {(periodoDraft.alteracoes ?? []).length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-3 py-3 text-sm text-muted-foreground">Nenhuma alteração cadastrada.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="sticky bottom-0 z-10 mt-4 flex justify-end gap-2 border-t bg-background/90 px-0 py-4 backdrop-blur">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSalvarPeriodo}>Salvar</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={alteracaoDialogOpen} onOpenChange={setAlteracaoDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto px-0 py-0">
                <DialogHeader>
                  <DialogTitle>{editingAlteracaoId ? 'Editar alteração' : 'Nova alteração'}</DialogTitle>
                  <DialogDescription>Preencha os campos de soma/subtração e motivo.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label>Data da alteração</Label>
                    <Input type="date" value={alteracaoDraft.data_alt} onChange={(e) => setAlteracaoDraft({ ...alteracaoDraft, data_alt: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Número da folha</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={alteracaoDraft.num_folha ?? ''}
                      onChange={(e) => setAlteracaoDraft({ ...alteracaoDraft, num_folha: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
                  <CampoMonetario label="Rendimentos a somar" value={alteracaoDraft.rend_somar} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, rend_somar: v })} />
                  <CampoMonetario label="Rendimentos a subtrair" value={alteracaoDraft.rend_sub} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, rend_sub: v })} />
                  <CampoMonetario label="Imposto RRA a somar" value={alteracaoDraft.rra_somar} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, rra_somar: v })} />
                  <CampoMonetario label="Imposto RRA a subtrair" value={alteracaoDraft.rra_sub} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, rra_sub: v })} />
                </div>

                {periodoDraft.tipo_declaracao === 'completa' && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
                    <CampoMonetario label="Deduções legais a somar" value={alteracaoDraft.ded_somar} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, ded_somar: v })} />
                    <CampoMonetario label="Deduções legais a subtrair" value={alteracaoDraft.ded_sub} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, ded_sub: v })} />
                    <CampoMonetario label="Deduções de incentivo a somar" value={alteracaoDraft.incentivo_somar} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, incentivo_somar: v })} />
                    <CampoMonetario label="Deduções de incentivo a subtrair" value={alteracaoDraft.incentivo_sub} onChange={(v) => setAlteracaoDraft({ ...alteracaoDraft, incentivo_sub: v })} />
                  </div>
                )}

                <div className="space-y-1.5 mt-4">
                  <Label>Motivo / Observação</Label>
                  <Textarea value={alteracaoDraft.motivo ?? ''} onChange={(e) => setAlteracaoDraft({ ...alteracaoDraft, motivo: e.target.value })} placeholder="Digite uma observação..." />
                </div>
              </div>

              <DialogFooter className="sticky bottom-0 z-10 mt-4 flex justify-end gap-2 border-t bg-background/90 px-0 py-4 backdrop-blur">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSalvarAlteracao}>Salvar</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RetificacaoPage;
