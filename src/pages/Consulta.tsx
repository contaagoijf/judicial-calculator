import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardPaste, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/externalClient';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';

const ConsultaPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { data: settings } = useSystemSettings();
  const [idCalculo, setIdCalculo] = useState('');
  const [loading, setLoading] = useState(false);
  const systemEnabled = isAdmin || (settings?.system_enabled ?? true);

  if (!systemEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <div className="page-container">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          <div className="form-section max-w-2xl">
            <h1 className="mb-3 text-2xl font-bold">Consulta indisponivel</h1>
            <p className="text-muted-foreground">
              O sistema esta temporariamente desabilitado. Administradores ainda podem entrar para revisar as configuracoes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleColarId = async () => {
    try {
      const texto = await navigator.clipboard.readText();
      setIdCalculo(texto.trim());
    } catch {
      toast({
        title: 'Não foi possível colar',
        description: 'Permita o acesso à área de transferência para usar este botão.',
        variant: 'destructive',
      });
    }
  };

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
            <div className="flex gap-2">
              <Input
                value={idCalculo}
                onChange={(e) => setIdCalculo(e.target.value)}
                placeholder="Ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                className="font-mono text-sm min-w-0"
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleColarId}
                title="Colar ID do cálculo da área de transferência"
                className="shrink-0"
              >
                <ClipboardPaste className="w-4 h-4" />
              </Button>
            </div>
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
