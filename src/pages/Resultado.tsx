import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ResultadoCalculo, DadosEntradaAjusteAnual } from '@/services/calculoIRPF';
import TabelaAlteracoes from '@/components/TabelaAlteracoes';
import BlocoCalculo from '@/components/BlocoCalculo';

const AJUSTE_ANUAL_EDIT_DRAFT_KEY = 'ajuste-anual-edit-draft';

const ResultadoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const state = location.state as {
    resultado: ResultadoCalculo;
    dados: DadosEntradaAjusteAnual;
    processo: string;
    nomeAutor: string;
    anoCalendario: number;
    tipoDeclaracao: string;
    inicio_correcao: string;
    faixas: any[];
  } | null;

  if (!state) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-muted-foreground mb-4">Nenhum resultado disponível. Realize um cálculo primeiro.</p>
        <Button onClick={() => navigate('/calculo/ajuste-anual')}>Ir para Cálculo</Button>
      </div>
    );
  }

  const { resultado, dados, processo, nomeAutor, anoCalendario, tipoDeclaracao } = state;

  const handleEditar = () => {
    const editDraft = {
      processo,
      nomeAutor,
      anoCalendario,
      tipoDeclaracao,
      dados,
    };

    sessionStorage.setItem(AJUSTE_ANUAL_EDIT_DRAFT_KEY, JSON.stringify(editDraft));
    navigate('/calculo/ajuste-anual', {
      state: { editDraft },
    });
  };

  const handleFinalizar = async () => {
    try {
      const { data, error } = await supabase
        .from('calculos')
        .insert({
          tipo_calculo: 'ajuste_anual',
          ano_calendario: anoCalendario,
          numero_processo: processo,
          nome_autor: nomeAutor,
          tipo_declaracao: tipoDeclaracao as any,
          dados_entrada: dados as any,
          resultado: resultado as any,
        })
        .select('id')
        .single();

      if (error) throw error;

      sessionStorage.removeItem(AJUSTE_ANUAL_EDIT_DRAFT_KEY);
      toast({ title: 'Cálculo finalizado', description: `ID: ${data.id}` });
      navigate(`/relatorio/${data.id}?calculo_novo=sim`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const isPagar = resultado.imposto_a_pagar > 0;
  const isRestituir = resultado.imposto_a_pagar < 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={handleEditar} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Formulário
        </Button>

        <h1 className="text-2xl font-bold mb-2">Simulação de Cálculo — Ajuste Anual</h1>
        <p className="text-muted-foreground mb-6">
          Processo: {processo} · Autor: {nomeAutor} · Ano: {anoCalendario}
        </p>

        {/* Valor Final */}
        <Card className={`mb-6 border-2 ${isPagar ? 'border-destructive/40 bg-destructive/5' : isRestituir ? 'border-green-500/40 bg-green-50' : 'border-border'}`}>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {isPagar ? 'Imposto a Pagar' : isRestituir ? 'Valor a Restituir' : 'Sem diferença'}
            </p>
            <p className={`text-3xl font-bold font-mono ${isPagar ? 'text-destructive' : isRestituir ? 'text-green-600' : 'text-foreground'}`}>
              R$ {Math.abs(resultado.imposto_a_pagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <TabelaAlteracoes alteracoes={resultado.alteracoes} />
        <BlocoCalculo resultado={resultado} />

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

export default ResultadoPage;
