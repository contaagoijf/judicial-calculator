import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

const Index = lazy(() => import("./pages/Index.tsx"));
const AjusteAnualPage = lazy(() => import("./pages/AjusteAnual.tsx"));
const ResultadoPage = lazy(() => import("./pages/Resultado.tsx"));
const RelatorioPage = lazy(() => import("./pages/Relatorio.tsx"));
const ConsultaPage = lazy(() => import("./pages/Consulta.tsx"));
const ParametrosPage = lazy(() => import("./pages/Parametros.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="page-container py-20 text-center text-muted-foreground">
    Carregando...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/calculo/ajuste-anual" element={<AjusteAnualPage />} />
              <Route path="/resultado" element={<ResultadoPage />} />
              <Route path="/relatorio/:id" element={<RelatorioPage />} />
              <Route path="/consulta" element={<ConsultaPage />} />
              <Route path="/parametros" element={<ParametrosPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
