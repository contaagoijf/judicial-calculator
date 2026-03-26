import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import AjusteAnualPage from "./pages/AjusteAnual.tsx";
import ResultadoPage from "./pages/Resultado.tsx";
import RelatorioPage from "./pages/Relatorio.tsx";
import ConsultaPage from "./pages/Consulta.tsx";
import ParametrosPage from "./pages/Parametros.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/calculo/ajuste-anual" element={<AjusteAnualPage />} />
          <Route path="/resultado" element={<ResultadoPage />} />
          <Route path="/relatorio/:id" element={<RelatorioPage />} />
          <Route path="/consulta" element={<ConsultaPage />} />
          <Route path="/parametros" element={<ParametrosPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
