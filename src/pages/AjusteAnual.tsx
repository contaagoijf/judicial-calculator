import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIR, useCalculo } from '@/hooks/useIRData';
import { calcularAjusteAnual, type DadosEntradaAjusteAnual, type ResultadoCalculo } from '@/services/calculoIRPF';

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

const AjusteAnualPage = () => {
  const navigate = useNavigate();
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
  const [impostoPago, setImpostoPago] = useState(0);
  const [rendSomar, setRendSomar] = useState(0);
  const [rendSub, setRendSub] = useState(0);
  const [dedSomar, setDedSomar] = useState(0);
  const [dedSub, setDedSub] = useState(0);
  const [incentivoSomar, setIncentivoSomar] = useState(0);
  const [incentivoSub, setIncentivoSub] = useState(0);
  const [rraSomar, setRraSomar] = useState(0);
  const [rraSub, setRraSub] = useState(0);

  // Load previous calculation data
  useEffect(() => {
    if (calculoAnterior) {
      const d = calculoAnterior.dados_entrada as any;
      setProcesso(calculoAnterior.numero_processo);
      setNomeAutor(calculoAnterior.nome_autor);
      setTipoDeclaracao(calculoAnterior.tipo_declaracao);
      setAnoCalendario(calculoAnterior.ano_calendario);
      if (d) {
        setRendTrib(d.rendimentos_tributaveis || 0);
        setDeducoesLegais(d.deducoes_legais || 0);
        setDeducoesIncentivo(d.deducoes_incentivo || 0);
        setImpostoRRA(d.imposto_rra || 0);
        setImpostoPago(d.imposto_pago || 0);
        setRendSomar(d.rend_somar || 0);
        setRendSub(d.rend_sub || 0);
        setDedSomar(d.ded_somar || 0);
        setDedSub(d.ded_sub || 0);
        setIncentivoSomar(d.incentivo_somar || 0);
        setIncentivoSub(d.incentivo_sub || 0);
        setRraSomar(d.rra_somar || 0);
        setRraSub(d.rra_sub || 0);
      }
    }
  }, [calculoAnterior]);

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
            <CampoMonetario label="Imposto Devido RRA" value={impostoRRA} onChange={setImpostoRRA} />
            <CampoMonetario label="Imposto Pago" value={impostoPago} onChange={setImpostoPago} />
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
