import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIRAll, useCalculo, useCalculosPorProcesso } from '@/hooks/useIRData';
import { useRetificacaoContexto } from '@/hooks/useRetificacaoContexto';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlteracaoRetificacao,
  calcularAjusteAnual,
  calcularRetificacao,
  FAIXAS_HONORARIOS_ART_85_PADRAO,
  type BaseHonorarios,
  type DadosEntradaAjusteAnual,
  type DadosEntradaRetificacao,
  type FaixaHonorarios,
  type ParametrosIR,
  type FaixaIR,
  type TipoCorrecao,
  type TipoLimitaAjuiz,
} from '@/services/calculoIRPF';
import { CampoMonetario } from '@/components/CampoMonetario';
import { currencyToMaskedDisplay, formatNumeroProcesso, isNumeroProcessoCompleto, parseMaskedCurrency } from '@/lib/masks';

const RETIFICACAO_EDIT_DRAFT_KEY = 'retificacao-edit-draft';

type RetificacaoDraft = DadosEntradaRetificacao;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const fmtDataAlt = (v: string | undefined) => {
  if (!v) return '-';
  const [y, m, d] = v.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

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

// Quando uma declaração vem do Ajuste Anual (campos simples de rend_somar/rend_sub etc.,
// sem data nem folha), a tabela "Alterações da Declaração" da Retificação ficava vazia
// mesmo com o valor já aplicado no cálculo — converte esses campos numa linha visível ali.
const periodoComAlteracaoDoAjusteAnual = (
  row: { id: string; criado_em: string; dados_entrada: unknown }
): DadosEntradaAjusteAnual => {
  const dados = row.dados_entrada as unknown as DadosEntradaAjusteAnual;
  const temAjusteSimples = dados.rend_somar || dados.rend_sub || dados.ded_somar || dados.ded_sub
    || dados.incentivo_somar || dados.incentivo_sub || dados.rra_somar || dados.rra_sub;
  if (!temAjusteSimples || (dados.alteracoes && dados.alteracoes.length > 0)) return dados;
  return {
    ...dados,
    alteracoes: [{
      id: row.id,
      data_alt: row.criado_em.slice(0, 10),
      rend_somar: dados.rend_somar,
      rend_sub: dados.rend_sub,
      ded_somar: dados.ded_somar,
      ded_sub: dados.ded_sub,
      incentivo_somar: dados.incentivo_somar,
      incentivo_sub: dados.incentivo_sub,
      rra_somar: dados.rra_somar,
      rra_sub: dados.rra_sub,
      motivo: 'Alteração informada no Ajuste Anual original',
    }],
  };
};

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
  const { data: contexto } = useRetificacaoContexto();
  const { data: calculoAnterior } = useCalculo(idParam);

  const [processo, setProcesso] = useState('');
  const { data: declaracoesAjuste, isLoading: carregandoAjuste } = useCalculosPorProcesso(processo, 'ajuste_anual');
  const { data: retificacoesAnteriores, isLoading: carregandoRetificacoes } = useCalculosPorProcesso(processo, 'retificacao');
  const [processoInvalidoOpen, setProcessoInvalidoOpen] = useState(false);

  const handleProcessoBlur = () => {
    if (processo.trim() && !isNumeroProcessoCompleto(processo)) {
      setProcessoInvalidoOpen(true);
    }
  };

  const handleColarProcesso = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      setProcesso(formatNumeroProcesso(texto));
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
      setNomeAutor(texto);
    } catch {
      toast({
        title: 'Não foi possível colar',
        description: 'Permita o acesso à área de transferência para usar este botão.',
        variant: 'destructive',
      });
    }
  };

  const [nomeAutor, setNomeAutor] = useState('');
  const [dataAjuizamento, setDataAjuizamento] = useState('');
  const [tipoCorrecao, setTipoCorrecao] = useState<TipoCorrecao>('SEM_CORRECAO');
  const [percentHonorarios, setPercentHonorarios] = useState(0);
  const [baseHonorarios, setBaseHonorarios] = useState<BaseHonorarios>('VALOR_CONDENACAO');
  const [valorCausa, setValorCausa] = useState(0);
  const [valorCerto, setValorCerto] = useState(0);
  const [escalonarHonorarios, setEscalonarHonorarios] = useState(false);
  const [faixasHonorarios, setFaixasHonorarios] = useState<FaixaHonorarios[]>(FAIXAS_HONORARIOS_ART_85_PADRAO);
  const [limitaAjuiz, setLimitaAjuiz] = useState<TipoLimitaAjuiz>('NAO');
  const [dataFim, setDataFim] = useState('');
  const [informacoes, setInformacoes] = useState('');
  const [periodos, setPeriodos] = useState<DadosEntradaAjusteAnual[]>([
    defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear()),
  ]);

  const [periodoDialogOpen, setPeriodoDialogOpen] = useState(false);
  const [editingPeriodoIndex, setEditingPeriodoIndex] = useState<number | null>(null);
  const [anoDuplicadoPeriodoOpen, setAnoDuplicadoPeriodoOpen] = useState(false);
  const [indiceAnoDuplicado, setIndiceAnoDuplicado] = useState<number | null>(null);
  const [periodoDraft, setPeriodoDraft] = useState<DadosEntradaAjusteAnual>(defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear()));

  // Tipo do saldo do ajuste anual (A pagar/A restituir) é sempre definido
  // automaticamente a partir do imposto devido apurado na própria declaração
  // — nunca escolhido manualmente pelo usuário (mesma regra da tela de
  // Ajuste Anual, pedido do contador).
  const impostoDevidoPreviewPeriodo = useMemo(() => {
    const faixasAno = faixasAll?.filter((f) => f.ano_calendario === periodoDraft.ano_calendario) ?? [];
    const param = parametros?.find((p) => p.ano_calendario === periodoDraft.ano_calendario);
    if (faixasAno.length === 0 || !param) return null;
    const resultado = calcularAjusteAnual(
      { ...periodoDraft, ajuste_anual: 0, rend_somar: 0, rend_sub: 0, ded_somar: 0, ded_sub: 0, incentivo_somar: 0, incentivo_sub: 0, rra_somar: 0, rra_sub: 0 },
      faixasAno,
      param
    );
    return resultado.imposto_devido;
  }, [faixasAll, parametros, periodoDraft.ano_calendario, periodoDraft.tipo_declaracao, periodoDraft.rendimentos_tributaveis, periodoDraft.deducoes_legais, periodoDraft.deducoes_incentivo, periodoDraft.imposto_rra, periodoDraft.imposto_pago]);
  const tipoSaldoPeriodo: 'PAGAR' | 'RESTITUIR' =
    impostoDevidoPreviewPeriodo !== null && impostoDevidoPreviewPeriodo < periodoDraft.imposto_pago ? 'RESTITUIR' : 'PAGAR';

  const [alteracaoDialogOpen, setAlteracaoDialogOpen] = useState(false);
  const [editingAlteracaoId, setEditingAlteracaoId] = useState<string | null>(null);
  const [alteracaoDraft, setAlteracaoDraft] = useState<AlteracaoRetificacao>(defaultAlteracao());

  const toolEnabled = isAdmin || ((settings?.system_enabled ?? true) && (settings?.retificacao_enabled ?? false));
  const anosOptions = useMemo(() => parametros?.map((p) => p.ano_calendario) ?? [], [parametros]);

  const preencherFormulario = (draft: DadosEntradaRetificacao) => {
    setProcesso(draft.numero_processo);
    setNomeAutor(draft.nome_autor);
    setDataAjuizamento(draft.data_ajuizamento);
    setTipoCorrecao(draft.tipo_correcao);
    setPercentHonorarios(draft.percentual_honorarios);
    setBaseHonorarios(draft.base_honorarios ?? 'VALOR_CONDENACAO');
    setValorCausa(draft.valor_causa ?? 0);
    setValorCerto(draft.valor_certo ?? 0);
    setEscalonarHonorarios(draft.escalonar_honorarios ?? false);
    setFaixasHonorarios(draft.faixas_honorarios ?? FAIXAS_HONORARIOS_ART_85_PADRAO);
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

  // Ao digitar um número de processo que já tem dados cadastrados, preenche
  // automaticamente todas as seções (Dados do Processo, Correção e honorários,
  // Dados de Declarações Anuais) — sem exigir confirmação, diferente do Ajuste
  // Anual, onde o mesmo processo não pode ser duplicado.
  const autoFillProcessoRef = useRef<string | null>(null);

  useEffect(() => {
    if (idParam) return;
    // Espera as duas consultas (ajuste_anual e retificacao) terminarem antes de decidir
    // qual fonte usar — senão, se a de ajuste_anual responder primeiro, o preenchimento
    // roda com base só nela e o guard abaixo impede a nova tentativa quando a de
    // retificacao (mais completa) chega depois, perdendo as declaracoes adicionadas.
    if (carregandoAjuste || carregandoRetificacoes) return;

    const temAjuste = !!declaracoesAjuste && declaracoesAjuste.length > 0;
    const temRetificacao = !!retificacoesAnteriores && retificacoesAnteriores.length > 0;
    if (!temAjuste && !temRetificacao) return;
    if (autoFillProcessoRef.current === processo) return;
    autoFillProcessoRef.current = processo;

    if (temRetificacao) {
      // Já existe uma Retificação anterior para este processo: carrega os dados dela, mas também
      // inclui automaticamente qualquer declaração de Ajuste Anual cadastrada DEPOIS dessa
      // Retificação ter sido salva (anos que ainda não fazem parte dos períodos salvos) — sem isso,
      // uma nova declaração ficaria "invisível" na Retificação até alguém adicioná-la manualmente.
      const entry = retificacoesAnteriores[0].dados_entrada as unknown as DadosEntradaRetificacao;
      const anosNaRetificacao = new Set(entry.periodos.map((p) => p.ano_calendario));
      const anosNovos = (declaracoesAjuste ?? [])
        .filter((d) => !anosNaRetificacao.has(d.ano_calendario))
        .sort((a, b) => a.ano_calendario - b.ano_calendario)
        .map((row) => periodoComAlteracaoDoAjusteAnual(row));
      preencherFormulario(anosNovos.length > 0
        ? { ...entry, periodos: [...entry.periodos, ...anosNovos] }
        : entry);
    } else {
      // Só existem declarações de Ajuste Anual: preenche autor e períodos com elas.
      if (!nomeAutor.trim()) setNomeAutor(declaracoesAjuste[0].nome_autor);
      const periodosEncontrados = [...declaracoesAjuste]
        .sort((a, b) => a.ano_calendario - b.ano_calendario)
        .map((row) => periodoComAlteracaoDoAjusteAnual(row));
      setPeriodos(periodosEncontrados);
    }

    toast({
      title: 'Dados do processo carregados',
      description: 'Já havia declarações cadastradas para este processo — os dados foram preenchidos automaticamente.',
      duration: 4000,
    });
  }, [declaracoesAjuste, retificacoesAnteriores, carregandoAjuste, carregandoRetificacoes, idParam, processo]);

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

    const indiceExistente = periodos.findIndex((periodo, idx) => idx !== editingPeriodoIndex && periodo.ano_calendario === periodoDraft.ano_calendario);
    if (indiceExistente !== -1) {
      setIndiceAnoDuplicado(indiceExistente);
      setAnoDuplicadoPeriodoOpen(true);
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

  // Impede duplicidade de declaração do mesmo ano-calendário: se já existir
  // um ano cadastrado nesta retificação, pergunta se o usuário deseja
  // alterar essa declaração em vez de criar uma nova.
  const handleAlterarPeriodoAnoDuplicado = () => {
    if (indiceAnoDuplicado === null) return;
    setEditingPeriodoIndex(indiceAnoDuplicado);
    setPeriodoDraft({ ...periodos[indiceAnoDuplicado], alteracoes: periodos[indiceAnoDuplicado].alteracoes ?? [] });
    setAnoDuplicadoPeriodoOpen(false);
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
    if (!isNumeroProcessoCompleto(processo)) {
      setProcessoInvalidoOpen(true);
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
    if (!contexto) {
      toast({ title: 'Erro', description: 'Tabelas de correção/juros ainda carregando.', variant: 'destructive' });
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
        base_honorarios: baseHonorarios,
        valor_causa: baseHonorarios === 'VALOR_CAUSA' ? valorCausa : undefined,
        valor_certo: baseHonorarios === 'VALOR_CERTO' ? valorCerto : undefined,
        escalonar_honorarios: escalonarHonorarios,
        faixas_honorarios: escalonarHonorarios ? faixasHonorarios : undefined,
        limita_ajuiz: tipoCorrecao !== 'SEM_CORRECAO' ? limitaAjuiz : undefined,
        data_fim: tipoCorrecao !== 'SEM_CORRECAO' ? dataFim : undefined,
        informacoes: tipoCorrecao !== 'SEM_CORRECAO' ? informacoes : undefined,
        periodos,
      };

      const resultadoRetificacao = calcularRetificacao(dadosEntrada, contexto);

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
      <div className="page-container max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Cálculo de Retificação de IRPF</h1>

        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Dados do Processo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Número do processo *</Label>
              <div className="flex gap-2">
                <Input
                  value={processo}
                  onChange={(e) => setProcesso(formatNumeroProcesso(e.target.value))}
                  onBlur={handleProcessoBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
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
              <Label>Nome do autor *</Label>
              <div className="flex gap-2">
                <Input value={nomeAutor} onChange={(e) => setNomeAutor(e.target.value)} placeholder="Nome completo" className="min-w-0" />
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
              <Label>Data do ajuizamento *</Label>
              <Input type="date" value={dataAjuizamento} onChange={(e) => setDataAjuizamento(e.target.value)} className="max-w-[220px]" />
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
              <Label>Base de cálculo dos honorários *</Label>
              <Select value={baseHonorarios} onValueChange={(value) => setBaseHonorarios(value as BaseHonorarios)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALOR_CONDENACAO">Valor da condenação (principal + juros)</SelectItem>
                  <SelectItem value="VALOR_CAUSA">Valor da causa ou proveito econômico</SelectItem>
                  <SelectItem value="VALOR_CERTO">Valor certo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {baseHonorarios === 'VALOR_CAUSA' && (
              <CampoMonetario label="Valor da causa *" value={valorCausa} onChange={setValorCausa} />
            )}
            {baseHonorarios === 'VALOR_CERTO' && (
              <CampoMonetario label="Valor certo *" value={valorCerto} onChange={setValorCerto} />
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Checkbox
              id="escalonar-honorarios"
              checked={escalonarHonorarios}
              onCheckedChange={(checked) => setEscalonarHonorarios(checked === true)}
            />
            <Label htmlFor="escalonar-honorarios" className="cursor-pointer">
              Escalonar honorários (se Fazenda Pública for parte — art. 85, §3º do CPC)
            </Label>
          </div>

          {escalonarHonorarios ? (
            <div className="mt-4 border rounded-md p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Percentual aplicado sobre a parcela do valor em cada faixa (em múltiplos do salário mínimo
                vigente na data do cálculo). Os percentuais abaixo são os tetos legais do art. 85, §3º do CPC
                e podem ser reduzidos quando o juiz fixar valor diferente.
              </p>
              <div className="mx-auto w-fit max-w-full space-y-2">
                {faixasHonorarios.map((faixa, idx) => {
                  const limiteAnterior = idx === 0 ? 0 : faixasHonorarios[idx - 1].limite_salarios_minimos;
                  const tetoLegal = FAIXAS_HONORARIOS_ART_85_PADRAO[idx]?.percentual;
                  const label = faixa.limite_salarios_minimos != null
                    ? `Inciso ${['I', 'II', 'III', 'IV', 'V'][idx] ?? idx + 1} — ${idx === 0 ? 'até' : 'acima de ' + limiteAnterior + ' até'} ${faixa.limite_salarios_minimos} SMs (até ${tetoLegal}%):`
                    : `Inciso ${['I', 'II', 'III', 'IV', 'V'][idx] ?? idx + 1} — acima de ${limiteAnterior} SMs (até ${tetoLegal}%):`;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                      <Label className="text-sm text-left sm:text-right w-full sm:w-[400px] shrink-0">{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={faixa.percentual}
                          onChange={(e) => {
                            const novoPercentual = parseFloat(e.target.value) || 0;
                            setFaixasHonorarios((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, percentual: novoPercentual } : f))
                            );
                          }}
                          className="font-mono w-20 shrink-0"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="space-y-1.5 w-fit">
                <Label>Percentual de honorários *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    maxLength={2}
                    value={percentHonorarios}
                    onChange={(e) => {
                      const digits = e.target.value.slice(0, 2);
                      const parsed = parseInt(digits, 10);
                      setPercentHonorarios(Number.isNaN(parsed) ? 0 : Math.min(parsed, 20));
                    }}
                    placeholder="0"
                    className="font-mono w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {tipoCorrecao !== 'SEM_CORRECAO' && (
          <div className="form-section mb-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Correção</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Limita total na data do ajuizamento</Label>
                <Select value={limitaAjuiz} onValueChange={(value) => setLimitaAjuiz(value as TipoLimitaAjuiz)}>
                  <SelectTrigger className="max-w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">SIM</SelectItem>
                    <SelectItem value="NAO">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Atualiza cálculo até</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="max-w-[220px]" />
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
                  <th className="px-4 py-3 text-right">Deduções</th>
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
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {periodo.rendimentos_tributaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {periodo.deducoes_legais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {periodo.imposto_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">R$ {periodo.ajuste_anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
                    <td colSpan={8} className="px-4 py-4 text-sm text-muted-foreground">Nenhum ano cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pb-[130px]">
          <Button onClick={handleSimular} size="lg" className="px-8">
            Simular Retificação
          </Button>
        </div>

        <Dialog open={periodoDialogOpen} onOpenChange={setPeriodoDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-7xl h-[85vh] max-h-[85vh] overflow-hidden px-8">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1.5 py-0">
                <DialogHeader>
                  <DialogTitle>{editingPeriodoIndex === null ? 'Adicionar ano' : 'Editar ano'}</DialogTitle>
                  <DialogDescription>Preencha os dados originais e as alterações para o ano selecionado.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label>Ano calendário</Label>
                    <Select value={periodoDraft.ano_calendario.toString()} onValueChange={(value) => setPeriodoDraft({ ...periodoDraft, ano_calendario: parseInt(value) })}>
                      <SelectTrigger className="max-w-[140px]"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completa">Completa</SelectItem>
                        <SelectItem value="simplificada">Simplificada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <CampoMonetario label="Rendimentos tributáveis" value={periodoDraft.rendimentos_tributaveis} onChange={(v) => setPeriodoDraft({ ...periodoDraft, rendimentos_tributaveis: v })} inputClassName="max-w-[210px]" />
                  <CampoMonetario
                    label="Total das deduções"
                    value={periodoDraft.deducoes_legais}
                    onChange={(v) => setPeriodoDraft({ ...periodoDraft, deducoes_legais: v })}
                    disabled={periodoDraft.tipo_declaracao === 'simplificada'}
                    inputClassName="max-w-[210px]"
                  />
                  <CampoMonetario
                    label="Deduções de incentivo"
                    value={periodoDraft.deducoes_incentivo}
                    onChange={(v) => setPeriodoDraft({ ...periodoDraft, deducoes_incentivo: v })}
                    disabled={periodoDraft.tipo_declaracao === 'simplificada'}
                    inputClassName="max-w-[210px]"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <CampoMonetario label="Imposto RRA" value={periodoDraft.imposto_rra} onChange={(v) => setPeriodoDraft({ ...periodoDraft, imposto_rra: v })} inputClassName="max-w-[210px]" />
                  <CampoMonetario label="Total do imposto pago / retido" value={periodoDraft.imposto_pago} onChange={(v) => setPeriodoDraft({ ...periodoDraft, imposto_pago: v })} inputClassName="max-w-[210px]" />
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Saldo do ajuste anual (declaração original)</Label>
                    <Input
                      inputMode="numeric"
                      value={currencyToMaskedDisplay(Math.abs(periodoDraft.ajuste_anual))}
                      onChange={(e) => {
                        const magnitude = parseMaskedCurrency(e.target.value);
                        setPeriodoDraft({ ...periodoDraft, ajuste_anual: tipoSaldoPeriodo === 'RESTITUIR' ? -magnitude : magnitude });
                      }}
                      placeholder="0,00"
                      className="font-mono max-w-[210px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tipo do saldo do ajuste anual</Label>
                    <Select value={tipoSaldoPeriodo} disabled>
                      <SelectTrigger className="max-w-[210px]" title="Definido automaticamente pelo sistema, a partir do imposto devido apurado na declaração.">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAGAR">A pagar</SelectItem>
                        <SelectItem value="RESTITUIR">A restituir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                          <th className="px-3 py-2 whitespace-nowrap">Data</th>
                          <th className="px-3 py-2 whitespace-nowrap">Folha</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Rend. +</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Rend. -</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Ded. +</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Ded. -</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">RRA +</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">RRA -</th>
                          <th className="px-3 py-2 text-center whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(periodoDraft.alteracoes ?? []).map((alteracao) => (
                          <tr key={alteracao.id} className="border-b even:bg-slate-50">
                            <td className="px-3 py-2 whitespace-nowrap">{fmtDataAlt(alteracao.data_alt)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{alteracao.num_folha ?? '-'}</td>
                            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">R$ {alteracao.rend_somar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">R$ {alteracao.rend_sub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">R$ {alteracao.ded_somar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">R$ {alteracao.ded_sub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">R$ {alteracao.rra_somar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">R$ {alteracao.rra_sub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-center whitespace-nowrap space-x-1">
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

        <Dialog open={anoDuplicadoPeriodoOpen} onOpenChange={setAnoDuplicadoPeriodoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Declaração já cadastrada</DialogTitle>
              <DialogDescription>
                Já existe uma declaração deste processo para o ano-calendário{' '}
                {indiceAnoDuplicado !== null ? periodos[indiceAnoDuplicado]?.ano_calendario : ''}.
                Deseja alterar a declaração já cadastrada para esse ano?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAnoDuplicadoPeriodoOpen(false)}>Não</Button>
              <Button onClick={handleAlterarPeriodoAnoDuplicado}>Sim, alterar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={alteracaoDialogOpen} onOpenChange={setAlteracaoDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-3xl h-[80vh] max-h-[80vh] overflow-hidden px-8">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1.5 py-0">
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
    </div>
  );
};

export default RetificacaoPage;
