import { useNavigate } from 'react-router-dom';
import { Calculator, FileSearch, Lock, Settings, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AdminAuthDialog } from '@/components/AdminAuthDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { data: settings } = useSystemSettings();

  const systemEnabled = settings?.system_enabled ?? true;
  const ajusteAnualEnabled = systemEnabled && (settings?.ajuste_anual_enabled ?? true);
  const retificacaoEnabled = systemEnabled && (settings?.retificacao_enabled ?? false);

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <div className="mb-10 pt-3 sm:mb-12 sm:pt-4">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
                <img
                  src="/calcjud.png"
                  alt="CALCJUD - Sistema de Calculos Judiciais"
                  className="mx-auto h-auto w-full max-w-[150px] sm:mx-0 sm:max-w-[170px] lg:max-w-[180px]"
                />
              </div>

              <div className="mx-auto max-w-3xl text-center sm:mx-0 sm:text-left">
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
                  Ferramenta automatizada para calculos de ajuste e retificacao de Imposto de Renda da Pessoa Fisica.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 sm:items-end">
              <AdminAuthDialog compact />
              {user && isAdmin && <Badge>Admin ativo</Badge>}
            </div>
          </div>

          {!systemEnabled && !isAdmin && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Sistema temporariamente indisponivel</AlertTitle>
              <AlertDescription>
                As ferramentas de calculo foram desabilitadas pela administracao. O acesso pode ser reaberto a qualquer momento.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <Card
            className={`group border-2 transition-shadow ${ajusteAnualEnabled || isAdmin ? 'cursor-pointer hover:border-primary/30 hover:shadow-md' : 'opacity-60'}`}
            onClick={() => (ajusteAnualEnabled || isAdmin) && navigate('/calculo/ajuste-anual')}
          >
            <CardHeader className="pb-2 text-center">
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${ajusteAnualEnabled || isAdmin ? 'bg-primary/10 transition-colors group-hover:bg-primary/20' : 'bg-muted'}`}>
                <Calculator className={`h-6 w-6 ${ajusteAnualEnabled || isAdmin ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <CardTitle className="text-lg">Ajuste Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Calculo de ajuste anual do Imposto de Renda com base nas faixas de IR do ano calendario.
              </CardDescription>
              <Button variant="outline" className="mt-4 w-full" disabled={!ajusteAnualEnabled && !isAdmin}>
                {ajusteAnualEnabled || isAdmin ? 'Iniciar Calculo' : 'Indisponivel'}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`group border-2 transition-shadow ${retificacaoEnabled || isAdmin ? 'cursor-pointer hover:border-primary/30 hover:shadow-md' : 'opacity-60'}`}
            onClick={() => (retificacaoEnabled || isAdmin) && navigate('/calculo/retificacao')}
          >
            <CardHeader className="pb-2 text-center">
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${retificacaoEnabled || isAdmin ? 'bg-primary/10 transition-colors group-hover:bg-primary/20' : 'bg-muted'}`}>
                <Calculator className={`h-6 w-6 ${retificacaoEnabled || isAdmin ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <CardTitle className={`text-lg ${retificacaoEnabled || isAdmin ? '' : 'text-muted-foreground'}`}>Retificacao</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Calculo de retificacao de declaracao anual de IRPF (vários anos)
              </CardDescription>
              <Button variant="outline" className="mt-4 w-full" disabled={!retificacaoEnabled && !isAdmin}>
                {retificacaoEnabled || isAdmin ? 'Iniciar Calculo' : 'Desabilitado'}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`group border-2 transition-shadow ${systemEnabled || isAdmin ? 'cursor-pointer hover:border-primary/30 hover:shadow-md' : 'opacity-60'}`}
            onClick={() => (systemEnabled || isAdmin) && navigate('/consulta')}
          >
            <CardHeader className="pb-2 text-center">
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${systemEnabled || isAdmin ? 'bg-primary/10 transition-colors group-hover:bg-primary/20' : 'bg-muted'}`}>
                <FileSearch className={`h-6 w-6 ${systemEnabled || isAdmin ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <CardTitle className="text-lg">Buscar por ID</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Consulte a autenticidade de um calculo realizado anteriormente pelo seu ID.
              </CardDescription>
              <Button variant="outline" className="mt-4 w-full" disabled={!systemEnabled && !isAdmin}>
                {systemEnabled || isAdmin ? 'Consultar' : 'Indisponivel'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3 text-center">
          <Button variant="ghost" onClick={() => navigate('/parametros')} className="gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            Visualizar parametros
          </Button>
          {!user && (
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Edicao restrita a administradores
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
