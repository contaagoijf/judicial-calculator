import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ConsultaPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [idCalculo, setIdCalculo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBuscar = async () => {
    if (!idCalculo.trim()) {
      toast({ title: 'Erro', description: 'Informe o ID do cálculo.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calculos')
        .select('id')
        .eq('id', idCalculo.trim())
        .single();

      if (error || !data) {
        toast({ title: 'Não encontrado', description: 'Nenhum cálculo com esse ID foi encontrado.', variant: 'destructive' });
        return;
      }

      navigate(`/relatorio/${data.id}`);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao buscar cálculo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Consultar Cálculo por ID</h1>

        <div className="form-section max-w-lg">
          <div className="space-y-1.5 mb-4">
            <Label>ID do Cálculo</Label>
            <Input
              value={idCalculo}
              onChange={(e) => setIdCalculo(e.target.value)}
              placeholder="Ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              className="font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </div>
          <Button onClick={handleBuscar} disabled={loading} className="gap-2">
            <Search className="w-4 h-4" /> {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsultaPage;
