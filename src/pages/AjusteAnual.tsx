import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIR, useCalculo, useCalculosPorProcesso } from '@/hooks/useIRData';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { calcularAjusteAnual, validarConsistenciaAjusteAnual, type DadosEntradaAjusteAnual, type DadosEntradaRetificacao } from '@/services/calculoIRPF';
import { CampoMonetario } from '@/components/CampoMonetario';
import { currencyToMaskedDisplay, formatNumeroProcesso, isNumeroProcessoCompleto, parseMaskedCurrency } from '@/lib/masks';

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
  const { isAdmin } = useAuth();
  const { data: settings } = useSystemSettings();

  const { data: parametros } = useParametrosIR();
  const [anoCalendario, setAnoCalendario] = useState<number | null>(null);
  const { data: faixas } = useFaixasIR(anoCalendario);
  const { data: calculoAnterior } = useCalculo(idParam);

  const [tipoDeclaracao, setTipoDeclaracao] = useState<'completa' | 'simplificada'>('completa');
  const [processo, setProcesso] = useState('');
  const [nomeAutor, setNomeAutor] = useState('');
  const { data: declaracoesDoProcesso } = useCalculosPorProcesso(processo, 'ajuste_anual');
  const [rendTrib, setRendTrib] = useState(0);
  const [deducoesLegais, setDeducoesLegais] = useState(0);
  const [deducoesIncentivo, setDeducoesIncentivo] = useState(0);
  const [impostoRRA, setImpostoRRA] = useState(0);
  const [ajusteAnualMagnitude, setAjusteAnualMagnitude] = useState(0);
  const [impostoPago, setImpostoPago] = useState(0);
  const [rendSomar, setRendSomar] = useState(0);
  const [rendSub, setRendSub] = useState(0);
  const [dedSomar, setDedSomar] = useState(0);
  const [dedSub, setDedSub] = useState(0);
  const [incentivoSomar, setIncentivoSomar] = useState(0);
  const [incentivoSub, setIncentivoSub] = useState(0);
  const [rraSomar, setRraSomar] = useState(0);
  const [rraSub, setRraSub] = useState(0);
  const [processoDuplicadoOpen, setProcessoDuplicadoOpen] = useState(false);
  const [processoInvalidoOpen, setProcessoInvalidoOpen] = useState(false);
  const [anoDuplicadoOpen, setAnoDuplicadoOpen] = useState(false);
  const [declaracaoAnoDuplicado, setDeclaracaoAnoDuplicado] = useState<{ id: string; ano_calendario: number } | null>(null);
  const skipDuplicateCheckRef = useRef(false);

  const handleProcessoBlur = () => {
    if (processo.trim() && !isNumeroProcessoCompleto(processo)) {
      setProcessoInvalidoOpen(true);
    }
  };

  const handleColarProcesso = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      skipDuplicateCheckRef.current = false;
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

  const preencherFormulario = (draft: AjusteAnualEditDraft) => {
    skipDuplicateCheckRef.current = true;
    setProcesso(draft.processo);
    setNomeAutor(draft.nomeAutor);
    setTipoDeclaracao(draft.tipoDeclaracao);
    setAnoCalendario(draft.anoCalendario);
    setRendTrib(draft.dados.rendimentos_tributaveis || 0);
    setDeducoesLegais(draft.dados.deducoes_legais || 0);
    setDeducoesIncentivo(draft.dados.deducoes_incentivo || 0);
    setImpostoRRA(draft.dados.imposto_rra || 0);
    setAjusteAnualMagnitude(Math.abs(draft.dados.ajuste_anual || 0));
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

  // Se o número do processo digitado já tem declaração(ões) registrada(s), o cadastro
  // deve continuar na Retificação (para não duplicar o mesmo processo no banco de dados).
  useEffect(() => {
    if (skipDuplicateCheckRef.current) return;
    if (idParam) return;
    if (!declaracoesDoProcesso || declaracoesDoProcesso.length === 0) return;
    setProcessoDuplicadoOpen(true);
  }, [declaracoesDoProcesso, idParam]);

  const handleConfirmarProcessoDuplicado = () => {
    if (!declaracoesDoProcesso || declaracoesDoProcesso.length === 0) return;
    const periodos = [...declaracoesDoProcesso]
      .sort((a, b) => a.ano_calendario - b.ano_calendario)
      .map((row) => row.dados_entrada as unknown as DadosEntradaAjusteAnual);
    const draft: DadosEntradaRetificacao = {
      numero_processo: processo,
      nome_autor: declaracoesDoProcesso[0].nome_autor,
      data_ajuizamento: '',
      tipo_correcao: 'SEM_CORRECAO',
      percentual_honorarios: 0,
      periodos,
    };
    setProcessoDuplicadoOpen(false);
    navigate('/calculo/retificacao', { state: { editDraft: draft } });
  };

  // Impede duplicidade de declaração do mesmo ano-calendário no mesmo
  // processo: se já existir uma declaração cadastrada para o ano escolhido,
  // pergunta se o usuário deseja alterá-la em vez de criar uma nova.
  const handleAlterarDeclaracaoAnoDuplicado = () => {
    if (!declaracaoAnoDuplicado) return;
    setAnoDuplicadoOpen(false);
    navigate(`/calculo/ajuste-anual?id=${declaracaoAnoDuplicado.id}`);
  };

  // Pedido do contador: permitir cadastrar mais de uma declaração do mesmo
  // processo sem sair da tela de Ajuste Anual — mantém processo/autor e limpa
  // só os campos da declaração em si, ficando pronto para a próxima.
  const handleNovaDeclaracaoMesmoProcesso = () => {
    if (declaracoesDoProcesso && declaracoesDoProcesso.length > 0) {
      setNomeAutor(declaracoesDoProcesso[0].nome_autor);
    }
    skipDuplicateCheckRef.current = true;
    setTipoDeclaracao('completa');
    setAnoCalendario(parametros?.[0]?.ano_calendario ?? null);
    setRendTrib(0);
    setDeducoesLegais(0);
    setDeducoesIncentivo(0);
    setImpostoRRA(0);
    setAjusteAnualMagnitude(0);
    setImpostoPago(0);
    setRendSomar(0); setRendSub(0); setDedSomar(0); setDedSub(0);
    setIncentivoSomar(0); setIncentivoSub(0); setRraSomar(0); setRraSub(0);
    setProcessoDuplicadoOpen(false);
    toast({ title: 'Pronto para uma nova declaração', description: 'Número do processo e autor mantidos — preencha os dados do próximo ano-calendário.' });
  };

  // Tipo do saldo do ajuste anual (A pagar/A restituir) é sempre definido
  // automaticamente pelo sistema a partir do imposto devido apurado na
  // própria declaração — nunca escolhido manualmente pelo usuário (pedido
  // do contador: evita que o usuário selecione um tipo incompatível com o
  // resultado apurado).
  const param = parametros?.find((p) => p.ano_calendario === anoCalendario);
  const impostoDevidoPreview = useMemo(() => {
    if (!faixas || faixas.length === 0 || !param) return null;
    const resultado = calcularAjusteAnual(
      {
        tipo_declaracao: tipoDeclaracao,
        ano_calendario: anoCalendario ?? 0,
        rendimentos_tributaveis: rendTrib,
        deducoes_legais: deducoesLegais,
        deducoes_incentivo: deducoesIncentivo,
        imposto_rra: impostoRRA,
        ajuste_anual: 0,
        imposto_pago: impostoPago,
        rend_somar: 0, rend_sub: 0, ded_somar: 0, ded_sub: 0,
        incentivo_somar: 0, incentivo_sub: 0, rra_somar: 0, rra_sub: 0,
      },
      faixas,
      param
    );
    return resultado.imposto_devido;
  }, [faixas, param, tipoDeclaracao, anoCalendario, rendTrib, deducoesLegais, deducoesIncentivo, impostoRRA, impostoPago]);
  const tipoSaldoOriginal: 'PAGAR' | 'RESTITUIR' =
    impostoDevidoPreview !== null && impostoDevidoPreview < impostoPago ? 'RESTITUIR' : 'PAGAR';

  const isCompleta = tipoDeclaracao === 'completa';
  const toolEnabled = isAdmin || ((settings?.system_enabled ?? true) && (settings?.ajuste_anual_enabled ?? true));

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
              O calculo de ajuste anual foi desabilitado no painel administrativo. Quando a liberacao for retomada,
              a ferramenta voltara a funcionar normalmente para qualquer pessoa, mesmo sem login.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
    if (!anoCalendario) {
      toast({ title: 'Erro', description: 'Selecione o ano calendário.', variant: 'destructive' });
      return;
    }
    const declaracaoExistente = declaracoesDoProcesso?.find(
      (d) => d.ano_calendario === anoCalendario && d.id !== idParam
    );
    if (declaracaoExistente) {
      setDeclaracaoAnoDuplicado({ id: declaracaoExistente.id, ano_calendario: anoCalendario });
      setAnoDuplicadoOpen(true);
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

    const ajusteAnual = tipoSaldoOriginal === 'RESTITUIR' ? -Math.abs(ajusteAnualMagnitude) : Math.abs(ajusteAnualMagnitude);

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
      <div className="page-container max-w-7xl">
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
              <div className="flex gap-2">
                <Input
                  value={processo}
                  onChange={(e) => {
                    skipDuplicateCheckRef.current = false;
                    setProcesso(formatNumeroProcesso(e.target.value));
                  }}
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
              <Label>Nome do Autor *</Label>
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
          </div>
        </div>

        {/* Parâmetros */}
        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Parâmetros do Cálculo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Declaração *</Label>
              <Select value={tipoDeclaracao} onValueChange={(v) => setTipoDeclaracao(v as any)}>
                <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="simplificada">Simplificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ano Calendário *</Label>
              <Select value={anoCalendario?.toString() || ''} onValueChange={(v) => setAnoCalendario(parseInt(v))}>
                <SelectTrigger className="max-w-[140px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
            <CampoMonetario label="Rendimentos Tributáveis" value={rendTrib} onChange={setRendTrib} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Deduções Legais" value={deducoesLegais} onChange={setDeducoesLegais} disabled={!isCompleta} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Deduções de Incentivo" value={deducoesIncentivo} onChange={setDeducoesIncentivo} disabled={!isCompleta} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Imposto Pago" value={impostoPago} onChange={setImpostoPago} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Imposto Devido RRA" value={impostoRRA} onChange={setImpostoRRA} inputClassName="max-w-[210px]" />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Saldo do Ajuste Anual (declaração original)</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  value={currencyToMaskedDisplay(ajusteAnualMagnitude)}
                  onChange={(e) => setAjusteAnualMagnitude(parseMaskedCurrency(e.target.value))}
                  placeholder="0,00"
                  className="font-mono max-w-[210px]"
                />
                <Select value={tipoSaldoOriginal} disabled>
                  <SelectTrigger className="w-40 shrink-0" title="Definido automaticamente pelo sistema, a partir do imposto devido apurado na declaração.">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAGAR">A pagar</SelectItem>
                    <SelectItem value="RESTITUIR">A restituir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Alterações */}
        <div className="form-section mb-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Alterações da Declaração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoMonetario label="Rendimentos a Somar" value={rendSomar} onChange={setRendSomar} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Rendimentos a Subtrair" value={rendSub} onChange={setRendSub} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Deduções Legais a Somar" value={dedSomar} onChange={setDedSomar} disabled={!isCompleta} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Deduções Legais a Subtrair" value={dedSub} onChange={setDedSub} disabled={!isCompleta} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Deduções Incentivo a Somar" value={incentivoSomar} onChange={setIncentivoSomar} disabled={!isCompleta} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Deduções Incentivo a Subtrair" value={incentivoSub} onChange={setIncentivoSub} disabled={!isCompleta} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Imposto RRA a Somar" value={rraSomar} onChange={setRraSomar} inputClassName="max-w-[210px]" />
            <CampoMonetario label="Imposto RRA a Subtrair" value={rraSub} onChange={setRraSub} inputClassName="max-w-[210px]" />
          </div>
        </div>

        <div className="flex justify-end pb-[130px]">
          <Button onClick={handleSimular} size="lg" className="px-8">
            Simular Declaração
          </Button>
        </div>
      </div>

      <Dialog open={processoDuplicadoOpen} onOpenChange={setProcessoDuplicadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processo já registrado</DialogTitle>
            <DialogDescription>
              Este número de processo já tem declaração(ões) cadastrada(s). Você pode cadastrar mais uma
              declaração de Ajuste Anual para o mesmo processo, ou seguir direto para a Retificação com os
              dados já carregados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleNovaDeclaracaoMesmoProcesso}>Nova declaração deste processo</Button>
            <Button onClick={handleConfirmarProcessoDuplicado}>Ir para Retificação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={anoDuplicadoOpen} onOpenChange={setAnoDuplicadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declaração já cadastrada</DialogTitle>
            <DialogDescription>
              Já existe uma declaração deste processo para o ano-calendário {declaracaoAnoDuplicado?.ano_calendario}.
              Deseja alterar a declaração já cadastrada para esse ano?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAnoDuplicadoOpen(false)}>Não</Button>
            <Button onClick={handleAlterarDeclaracaoAnoDuplicado}>Sim, alterar</Button>
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

export default AjusteAnualPage;
