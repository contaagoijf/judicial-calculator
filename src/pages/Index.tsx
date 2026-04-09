import { useNavigate } from 'react-router-dom';
import { Calculator, FileSearch, Scale, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <div className="mb-10 pt-6 sm:mb-12 sm:pt-8">
          <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-start sm:justify-between">
            <img
              src="/calcjud.png"
              alt="CALCJUD - Sistema de Cálculos Judiciais"
              className="mx-auto h-auto w-full max-w-[300px] sm:mx-0 sm:max-w-[340px] lg:max-w-[360px]"
            />

            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary sm:mx-0 sm:mt-2">
              <Scale className="h-4 w-4" />
              Ferramenta Judicial
            </div>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-3 text-2xl font-bold leading-tight text-foreground sm:mb-4 sm:text-3xl">
              Cálculo para Ajuste e Retificação de IRPF
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
              Ferramenta automatizada para cálculos judiciais de Imposto de Renda da Pessoa Física.
              Realize cálculos padronizados, confiáveis e rastreáveis para juntada em processos judiciais.
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <Card
            className="group cursor-pointer border-2 transition-shadow hover:border-primary/30 hover:shadow-md"
            onClick={() => navigate('/calculo/ajuste-anual')}
          >
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Ajuste Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Cálculo de ajuste anual do Imposto de Renda com base nas faixas de IR do ano calendário.
              </CardDescription>
              <Button variant="outline" className="mt-4 w-full">
                Iniciar Cálculo
              </Button>
            </CardContent>
          </Card>

          <Card className="group border-2 opacity-60 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Calculator className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg text-muted-foreground">Retificação</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Cálculo de retificação de declaração anual de IRPF. Em breve.
              </CardDescription>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-2 transition-shadow hover:border-primary/30 hover:shadow-md"
            onClick={() => navigate('/consulta')}
          >
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <FileSearch className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Buscar por ID</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Consulte a autenticidade de um cálculo realizado anteriormente pelo seu ID.
              </CardDescription>
              <Button variant="outline" className="mt-4 w-full">
                Consultar
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/parametros')} className="gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" /> Gerenciar Parâmetros IR
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
