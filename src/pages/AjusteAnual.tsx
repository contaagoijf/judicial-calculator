import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIR, useCalculo } from '@/hooks/useIRData';
import { calcularAjusteAnual, validarConsistenciaAjusteAnual, type DadosEntradaAjusteAnual } from '@/services/calculoIRPF';

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

const AJUSTE_ANUAL_EDIT_DRAFT_KEY = 'ajuste-anual-edit-draft';

type AjusteAnualEditDraft = {
  processo: string;
  nomeAutor: string;
  anoCalendario: number;
  tipoDeclaracao: 'completa' | 'simplificada';
  dados: DadosEntradaAjusteAnual;
};

const AjusteAnualPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('id');
  const { toast } = useToast();

  const { data: parametros } = useParametrosIR();
  const [anoCalendario, setAnoCalendario] = useState<number | null>(null);
  const { data: faixas } = useFaixasIR(anoCalendario);
  const { data: calculoAnterior } = useCalculo(idParam);

  const [tipoDeclaracao, setTipoDeclaracao] = useState<'completa' | 'simplificada'>('completa');
  const [processo, setProcesso] = useState('');
  const [nomeAutor, setNomeAutor] = useState('');
  const [rendTrib, setRendTrib] = useState(0);
  const [deducoesLegais, setDeducoesLegais] = useState(0);
  const [deducoesIncentivo, setDeducoesIncentivo] = useState(0);
  const [impostoRRA, setImpostoRRA] = useState(0);
  const [ajusteAnual, setAjusteAnual] = useState(0);
  const [impostoPago, setImpostoPago] = useState(0);
  const [rendSomar, setRendSomar] = useState(0);
  const [rendSub, setRendSub] = useState(0);
  const [dedSomar, setDedSomar] = useState(0);
  const [dedSub, setDedSub] = useState(0);
  const [incentivoSomar, setIncentivoSomar] = useState(0);
  const [incentivoSub, setIncentivoSub] = useState(0);
  const [rraSomar, setRraSomar] = useState(0);
  const [rraSub, setRraSub] = useState(0);

  const preencherFormulario = (draft: AjusteAnualEditDraft) => {
    setProcesso(draft.processo);
    setNomeAutor(draft.nomeAutor);
    setTipoDeclaracao(draft.tipoDeclaracao);
    setAnoCalendario(draft.anoCalendario);
    setRendTrib(draft.dados.rendimentos_tributaveis || 0);
    setDeducoesLegais(draft.dados.deducoes_legais || 0);
    setDeducoesIncentivo(draft.dados.deducoes_incentivo || 0);
    setImpostoRRA(draft.dados.imposto_rra || 0);
    setAjusteAnual(draft.dados.ajuste_anual || 0);
    setImpostoPago(draft.dados.imposto_pago || 0);
    setRendSomar(draft.dados.rend_somar || 0);
    setRendSub(draft.dados.rend_sub || 0);
    setDedSomar(draft.dados.ded_somar || 0);
    setDedSub(draft.dados.ded_sub || 0);
    setIncentivoSomar(draft.dados.incentivo_somar || 0);
    setIncentivoSub(draft.dados.incentivo_sub || 0);
    setRraSomar(draft.dados.rra_somar || 0);
    setRraSub(draft.dados.rra_sub || 0);
  };

  // Load previous calculation data
  useEffect(() => {
    if (calculoAnterior) {
      preencherFormulario({
        processo: calculoAnterior.numero_processo,
        nomeAutor: calculoAnterior.nome_autor,
        tipoDeclaracao: calculoAnterior.tipo_declaracao,
        anoCalendario: calculoAnterior.ano_calendario,
        dados: calculoAnterior.dados_entrada as unknown as DadosEntradaAjusteAnual,
      });
      sessionStorage.removeItem(AJUSTE_ANUAL_EDIT_DRAFT_KEY);
    }
  }, [calculoAnterior]);

  useEffect(() => {
    if (idParam) return;

    const state = location.state as { editDraft?: AjusteAnualEditDraft } | null;
    const draftFromState = state?.editDraft;
    const draftFromStorage = !draftFromState
      ? sessionStorage.getItem(AJUSTE_ANUAL_EDIT_DRAFT_KEY)
      : null;
    const draft = draftFromState
      ?? (draftFromStorage ? JSON.parse(draftFromStorage) as AjusteAnualEditDraft : null);

    if (draft) {
      preencherFormulario(draft);
      sessionStorage.removeItem(AJUSTE_ANUAL_EDIT_DRAFT_KEY);
    }
  }, [idParam, location.state]);

  const isCompleta = tipoDeclaracao === 'completa';

  const handleSimular = () => {
    if (!processo.trim()) {
      toast({ title: 'Erro', description: 'Informe o número do processo.', variant: 'destructive' });
      return;
    }
    if (!nomeAutor.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome do autor.', variant: 'destructive' });
      return;
    }
    if (!anoCalendario) {
      toast({ title: 'Erro', description: 'Selecione o ano calendário.', variant: 'destructive' });
      return;
    }
    if (!faixas || faixas.length === 0) {
      toast({ title: 'Erro', description: 'Faixas de IR não encontradas para o ano selecionado.', variant: 'destructive' });
      return;
    }

    const param = parametros?.find(p => p.ano_calendario === anoCalendario);
    if (!param) {
      toast({ title: 'Erro', description: 'Parâmetros não encontrados para o ano selecionado.', variant: 'destructive' });
      return;
    }

    const dados: DadosEntradaAjusteAnual = {
      tipo_declaracao: tipoDeclaracao,
      ano_calendario: anoCalendario,
      rendimentos_tributaveis: rendTrib,
      deducoes_legais: deducoesLegais,
      deducoes_incentivo: deducoesIncentivo,
      imposto_rra: impostoRRA,
      ajuste_anual: ajusteAnual,
      imposto_pago: impostoPago,
      rend_somar: rendSomar,
      rend_sub: rendSub,
      ded_somar: dedSomar,
      ded_sub: dedSub,
      incentivo_somar: incentivoSomar,
      incentivo_sub: incentivoSub,
      rra_somar: rraSomar,
      rra_sub: rraSub,
    };

    const resultado = calcularAjusteAnual(dados, faixas, param);
    const validacaoConsistencia = validarConsistenciaAjusteAnual(
      resultado.imposto_devido,
      dados.ajuste_anual,
      dados.imposto_pago
    );

    if (!validacaoConsistencia.consistente) {
      toast({
        title: 'Valores inconsistentes',
        description: `O Imposto Devido original (${resultado.imposto_devido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) deve ser igual à soma de Ajuste Anual e Imposto Pago (${validacaoConsistencia.total_informado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Corrija os dados de entrada para continuar.`,
        variant: 'destructive'
      });
      return;
    }

    // Navigate to resultado with state
    navigate('/resultado', {
      state: {
        resultado,
        dados,
        processo,
        nomeAutor,
        anoCalendario,
        tipoDeclaracao,
        inicio_correcao: param.inicio_correcao,
        faixas,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Cálculo de Ajuste Anual do IRPF</h1>

        {/* Dados do Processo */}
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

        {/* Parâmetros */}
        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Parâmetros do Cálculo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Declaração *</Label>
              <Select value={tipoDeclaracao} onValueChange={(v) => setTipoDeclaracao(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="simplificada">Simplificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ano Calendário *</Label>
              <Select value={anoCalendario?.toString() || ''} onValueChange={(v) => setAnoCalendario(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {parametros?.map(p => (
                    <SelectItem key={p.ano_calendario} value={p.ano_calendario.toString()}>
                      {p.ano_calendario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Dados Financeiros */}
        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Dados da Declaração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CampoMonetario label="Rendimentos Tributáveis" value={rendTrib} onChange={setRendTrib} />
            <CampoMonetario label="Deduções Legais" value={deducoesLegais} onChange={setDeducoesLegais} disabled={!isCompleta} />
            <CampoMonetario label="Deduções de Incentivo" value={deducoesIncentivo} onChange={setDeducoesIncentivo} disabled={!isCompleta} />
            <CampoMonetario label="Imposto Pago" value={impostoPago} onChange={setImpostoPago} />
            <CampoMonetario label="Imposto Devido RRA" value={impostoRRA} onChange={setImpostoRRA} />
            <CampoMonetario label="Ajuste Anual" value={ajusteAnual} onChange={setAjusteAnual} />
          </div>
        </div>

        {/* Alterações */}
        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Alterações da Declaração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoMonetario label="Rendimentos a Somar" value={rendSomar} onChange={setRendSomar} />
            <CampoMonetario label="Rendimentos a Subtrair" value={rendSub} onChange={setRendSub} />
            <CampoMonetario label="Deduções Legais a Somar" value={dedSomar} onChange={setDedSomar} disabled={!isCompleta} />
            <CampoMonetario label="Deduções Legais a Subtrair" value={dedSub} onChange={setDedSub} disabled={!isCompleta} />
            <CampoMonetario label="Deduções Incentivo a Somar" value={incentivoSomar} onChange={setIncentivoSomar} disabled={!isCompleta} />
            <CampoMonetario label="Deduções Incentivo a Subtrair" value={incentivoSub} onChange={setIncentivoSub} disabled={!isCompleta} />
            <CampoMonetario label="Imposto RRA a Somar" value={rraSomar} onChange={setRraSomar} />
            <CampoMonetario label="Imposto RRA a Subtrair" value={rraSub} onChange={setRraSub} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSimular} size="lg" className="px-8">
            Simular Cálculo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AjusteAnualPage;
