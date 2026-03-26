import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useParametrosIR, useFaixasIR } from '@/hooks/useIRData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const ParametrosPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: parametros, isLoading } = useParametrosIR();
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const { data: faixas } = useFaixasIR(anoSelecionado);

  const [teto, setTeto] = useState(0);
  const [inicioCorrecao, setInicioCorrecao] = useState('');
  const [editFaixas, setEditFaixas] = useState<Array<{
    id?: number;
    limite_inferior: number;
    limite_superior: number | null;
    aliquota: number;
    deducao: number;
  }>>([]);

  useEffect(() => {
    if (anoSelecionado && parametros) {
      const p = parametros.find(x => x.ano_calendario === anoSelecionado);
      if (p) {
        setTeto(p.teto);
        setInicioCorrecao(p.inicio_correcao);
      }
    }
  }, [anoSelecionado, parametros]);

  useEffect(() => {
    if (faixas) {
      setEditFaixas(faixas.map(f => ({
        limite_inferior: f.limite_inferior,
        limite_superior: f.limite_superior,
        aliquota: f.aliquota,
        deducao: f.deducao,
      })));
    }
  }, [faixas]);

  const handleSalvar = async () => {
    if (!anoSelecionado) return;

    try {
      // Update parametros
      const { error: pErr } = await supabase
        .from('ir_parametros')
        .upsert({ ano_calendario: anoSelecionado, teto, inicio_correcao: inicioCorrecao });
      if (pErr) throw pErr;

      // Delete old faixas and insert new
      await supabase.from('ir_faixas').delete().eq('ano_calendario', anoSelecionado);

      if (editFaixas.length > 0) {
        const { error: fErr } = await supabase
          .from('ir_faixas')
          .insert(editFaixas.map(f => ({
            ano_calendario: anoSelecionado,
            limite_inferior: f.limite_inferior,
            limite_superior: f.limite_superior,
            aliquota: f.aliquota,
            deducao: f.deducao,
          })));
        if (fErr) throw fErr;
      }

      queryClient.invalidateQueries({ queryKey: ['ir_parametros'] });
      queryClient.invalidateQueries({ queryKey: ['ir_faixas'] });
      toast({ title: 'Salvo', description: 'Parâmetros atualizados com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const addFaixa = () => {
    setEditFaixas([...editFaixas, { limite_inferior: 0, limite_superior: null, aliquota: 0, deducao: 0 }]);
  };

  const removeFaixa = (idx: number) => {
    setEditFaixas(editFaixas.filter((_, i) => i !== idx));
  };

  const updateFaixa = (idx: number, field: string, value: any) => {
    setEditFaixas(editFaixas.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Parâmetros do IRPF</h1>

        {/* Year selector */}
        <div className="form-section mb-6">
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              parametros?.map(p => (
                <Button
                  key={p.ano_calendario}
                  variant={anoSelecionado === p.ano_calendario ? 'default' : 'outline'}
                  onClick={() => setAnoSelecionado(p.ano_calendario)}
                >
                  {p.ano_calendario}
                </Button>
              ))
            )}
          </div>
        </div>

        {anoSelecionado && (
          <>
            <div className="form-section mb-6">
              <h2 className="text-lg font-semibold mb-4">Parâmetros — {anoSelecionado}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Teto (Desconto Simplificado)</Label>
                  <Input type="number" value={teto} onChange={(e) => setTeto(parseFloat(e.target.value) || 0)} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Início da Correção</Label>
                  <Input type="date" value={inicioCorrecao} onChange={(e) => setInicioCorrecao(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Faixas de IR — {anoSelecionado}</h2>
                <Button variant="outline" size="sm" onClick={addFaixa} className="gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">De</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Até</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Alíquota (%)</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Dedução</th>
                      <th className="py-2 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editFaixas.map((f, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-1 px-1">
                          <Input type="number" value={f.limite_inferior} onChange={(e) => updateFaixa(idx, 'limite_inferior', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs" />
                        </td>
                        <td className="py-1 px-1">
                          <Input type="number" value={f.limite_superior ?? ''} onChange={(e) => updateFaixa(idx, 'limite_superior', e.target.value ? parseFloat(e.target.value) : null)} placeholder="∞" className="font-mono h-8 text-xs" />
                        </td>
                        <td className="py-1 px-1">
                          <Input type="number" step="0.1" value={f.aliquota} onChange={(e) => updateFaixa(idx, 'aliquota', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs" />
                        </td>
                        <td className="py-1 px-1">
                          <Input type="number" value={f.deducao} onChange={(e) => updateFaixa(idx, 'deducao', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs" />
                        </td>
                        <td className="py-1 px-1">
                          <Button variant="ghost" size="sm" onClick={() => removeFaixa(idx)} className="h-8 w-8 p-0 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSalvar} className="gap-2">
                <Save className="w-4 h-4" /> Salvar Alterações
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ParametrosPage;
