import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIRAll, useCalculo } from '@/hooks/useIRData';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import {
  calcularRetificacao,
  type DadosEntradaAjusteAnual,
  type DadosEntradaRetificacao,
  type ParametrosIR,
  type FaixaIR,
} from '@/services/calculoIRPF';

const RETIFICACAO_EDIT_DRAFT_KEY = 'retificacao-edit-draft';

type RetificacaoDraft = {
  processo: string;
  nomeAutor: string;
  periodos: DadosEntradaAjusteAnual[];
};

const CampoMonetario = ({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    <Input
      type="number"
      min="0"
      step="0.01"
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      placeholder="0,00"
      disabled={disabled}
      className="font-mono"
    />
  </div>
);

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
  const [periodos, setPeriodos] = useState<DadosEntradaAjusteAnual[]>([
    defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear()),
  ]);

  const toolEnabled = isAdmin || ((settings?.system_enabled ?? true) && (settings?.retificacao_enabled ?? false));

  const preencherFormulario = (draft: RetificacaoDraft) => {
    setProcesso(draft.processo);
    setNomeAutor(draft.nomeAutor);
    setPeriodos(draft.periodos.length > 0 ? draft.periodos : [defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear())]);
  };

  useEffect(() => {
    if (!calculoAnterior || calculoAnterior.tipo_calculo !== 'retificacao') return;
    const entry = calculoAnterior.dados_entrada as unknown as DadosEntradaRetificacao;
    preencherFormulario({
      processo: calculoAnterior.numero_processo,
      nomeAutor: calculoAnterior.nome_autor,
      periodos: entry.periodos ?? [defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear())],
    });
    sessionStorage.removeItem(RETIFICACAO_EDIT_DRAFT_KEY);
  }, [calculoAnterior, parametros]);

  useEffect(() => {
    if (idParam) return;

    const state = location.state as { editDraft?: RetificacaoDraft } | null;
    const draftFromState = state?.editDraft;
    const draftFromStorage = !draftFromState
      ? sessionStorage.getItem(RETIFICACAO_EDIT_DRAFT_KEY)
      : null;
    const draft = draftFromState
      ?? (draftFromStorage ? JSON.parse(draftFromStorage) as RetificacaoDraft : null);

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
            <h1 className="mb-3 text-2xl font-bold">Ferramenta temporariamente indisponivel</h1>
            <p className="text-muted-foreground">
              A retificação foi desabilitada no painel administrativo. Quando a liberacao for retomada,
              a ferramenta voltara a funcionar normalmente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAddPeriodo = () => {
    setPeriodos(current => [...current, defaultPeriodo(parametros?.[0]?.ano_calendario ?? new Date().getFullYear())]);
  };

  const handleRemovePeriodo = (index: number) => {
    setPeriodos(current => current.filter((_, idx) => idx !== index));
  };

  const updatePeriodo = (index: number, update: Partial<DadosEntradaAjusteAnual>) => {
    setPeriodos(current => current.map((periodo, idx) => idx === index ? { ...periodo, ...update } : periodo));
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

    const problemas = periodos.some((periodo) => !periodo.ano_calendario || periodo.rendimentos_tributaveis < 0 || periodo.imposto_pago < 0);
    if (problemas) {
      toast({ title: 'Erro', description: 'Verifique os dados de cada ano. Todos os valores devem ser preenchidos corretamente.', variant: 'destructive' });
      return;
    }

    try {
      const resultadoRetificacao = calcularRetificacao(
        { periodos },
        faixasAll,
        parametros
      );

      const draft: RetificacaoDraft = { processo, nomeAutor, periodos };
      sessionStorage.setItem(RETIFICACAO_EDIT_DRAFT_KEY, JSON.stringify(draft));

      navigate('/resultado-retificacao', {
        state: {
          resultadoRetificacao,
          dadosEntrada: { periodos },
          processo,
          nomeAutor,
        },
      });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message ?? 'Falha ao simular retificação.', variant: 'destructive' });
    }
  };

  const anosOptions = parametros?.map((p) => p.ano_calendario) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Cálculo de Retificação de IRPF</h1>

        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Dados do Processo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Número do Processo *</Label>
              <Input value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Autor *</Label>
              <Input value={nomeAutor} onChange={(e) => setNomeAutor(e.target.value)} placeholder="Nome completo" />
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          {periodos.map((periodo, index) => (
            <div key={`${periodo.ano_calendario}-${index}`} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Ano {periodo.ano_calendario}</h2>
                  <p className="text-sm text-muted-foreground">Dados e ajustes para o ano selecionado</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleRemovePeriodo(index)} disabled={periodos.length === 1}>
                    <Trash2 className="w-4 h-4" /> Remover
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label>Ano Calendário</Label>
                  <Select value={periodo.ano_calendario.toString()} onValueChange={(value) => updatePeriodo(index, { ano_calendario: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anosOptions.map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Declaração</Label>
                  <Select value={periodo.tipo_declaracao} onValueChange={(value) => updatePeriodo(index, { tipo_declaracao: value as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completa">Completa</SelectItem>
                      <SelectItem value="simplificada">Simplificada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <CampoMonetario label="Rendimentos Tributáveis" value={periodo.rendimentos_tributaveis} onChange={(v) => updatePeriodo(index, { rendimentos_tributaveis: v })} />
                <CampoMonetario label="Deduções Legais" value={periodo.deducoes_legais} onChange={(v) => updatePeriodo(index, { deducoes_legais: v })} disabled={periodo.tipo_declaracao === 'simplificada'} />
                <CampoMonetario label="Deduções de Incentivo" value={periodo.deducoes_incentivo} onChange={(v) => updatePeriodo(index, { deducoes_incentivo: v })} disabled={periodo.tipo_declaracao === 'simplificada'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <CampoMonetario label="Imposto Pago" value={periodo.imposto_pago} onChange={(v) => updatePeriodo(index, { imposto_pago: v })} />
                <CampoMonetario label="Imposto Devido RRA" value={periodo.imposto_rra} onChange={(v) => updatePeriodo(index, { imposto_rra: v })} />
                <CampoMonetario label="Ajuste Anual" value={periodo.ajuste_anual} onChange={(v) => updatePeriodo(index, { ajuste_anual: v })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoMonetario label="Rendimentos a Somar" value={periodo.rend_somar} onChange={(v) => updatePeriodo(index, { rend_somar: v })} />
                <CampoMonetario label="Rendimentos a Subtrair" value={periodo.rend_sub} onChange={(v) => updatePeriodo(index, { rend_sub: v })} />
                <CampoMonetario label="Deduções Legais a Somar" value={periodo.ded_somar} onChange={(v) => updatePeriodo(index, { ded_somar: v })} disabled={periodo.tipo_declaracao === 'simplificada'} />
                <CampoMonetario label="Deduções Legais a Subtrair" value={periodo.ded_sub} onChange={(v) => updatePeriodo(index, { ded_sub: v })} disabled={periodo.tipo_declaracao === 'simplificada'} />
                <CampoMonetario label="Deduções Incentivo a Somar" value={periodo.incentivo_somar} onChange={(v) => updatePeriodo(index, { incentivo_somar: v })} disabled={periodo.tipo_declaracao === 'simplificada'} />
                <CampoMonetario label="Deduções Incentivo a Subtrair" value={periodo.incentivo_sub} onChange={(v) => updatePeriodo(index, { incentivo_sub: v })} disabled={periodo.tipo_declaracao === 'simplificada'} />
                <CampoMonetario label="Imposto RRA a Somar" value={periodo.rra_somar} onChange={(v) => updatePeriodo(index, { rra_somar: v })} />
                <CampoMonetario label="Imposto RRA a Subtrair" value={periodo.rra_sub} onChange={(v) => updatePeriodo(index, { rra_sub: v })} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" onClick={handleAddPeriodo} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar ano
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSimular} size="lg" className="px-8">
            Simular Retificação
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RetificacaoPage;
