import { useNavigate } from 'react-router-dom';
import { Calculator, FileSearch, Scale, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Scale className="w-4 h-4" />
            Ferramenta Judicial
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Cálculo para Ajuste e Retificação de IRPF
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Ferramenta automatizada para cálculos judiciais de Imposto de Renda da Pessoa Física.
            Realize cálculos padronizados, confiáveis e rastreáveis para juntada em processos judiciais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="group hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30" onClick={() => navigate('/calculo/ajuste-anual')}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Ajuste Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Cálculo de ajuste anual do Imposto de Renda com base nas faixas de IR do ano calendário.
              </CardDescription>
              <Button variant="outline" className="w-full mt-4">
                Iniciar Cálculo
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-shadow border-2 opacity-60">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
                <Calculator className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg text-muted-foreground">Retificação</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Cálculo de retificação de declaração anual de IRPF. Em breve.
              </CardDescription>
              <Button variant="outline" className="w-full mt-4" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30" onClick={() => navigate('/consulta')}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <FileSearch className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Buscar por ID</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Consulte a autenticidade de um cálculo realizado anteriormente pelo seu ID.
              </CardDescription>
              <Button variant="outline" className="w-full mt-4">
                Consultar
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate('/parametros')} className="gap-2 text-muted-foreground">
            <Settings className="w-4 h-4" /> Gerenciar Parâmetros IR
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
