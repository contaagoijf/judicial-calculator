
CREATE TYPE public.tipo_calculo_enum AS ENUM ('ajuste_anual', 'retificacao');
CREATE TYPE public.tipo_declaracao_enum AS ENUM ('completa', 'simplificada');

CREATE TABLE public.ir_parametros (
  ano_calendario INT PRIMARY KEY,
  teto DECIMAL NOT NULL,
  inicio_correcao DATE NOT NULL
);

CREATE TABLE public.ir_faixas (
  id SERIAL PRIMARY KEY,
  ano_calendario INT NOT NULL REFERENCES public.ir_parametros(ano_calendario) ON DELETE CASCADE,
  limite_inferior DECIMAL NOT NULL,
  limite_superior DECIMAL,
  aliquota DECIMAL NOT NULL,
  deducao DECIMAL NOT NULL
);

CREATE INDEX idx_ir_faixas_ano ON public.ir_faixas(ano_calendario);

CREATE TABLE public.calculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_calculo tipo_calculo_enum NOT NULL,
  ano_calendario INT NOT NULL,
  numero_processo TEXT NOT NULL,
  nome_autor TEXT NOT NULL,
  tipo_declaracao tipo_declaracao_enum NOT NULL,
  dados_entrada JSONB NOT NULL,
  resultado JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_calculos_criado ON public.calculos(criado_em DESC);

ALTER TABLE public.ir_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ir_faixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ir_parametros" ON public.ir_parametros FOR SELECT USING (true);
CREATE POLICY "Anyone can read ir_faixas" ON public.ir_faixas FOR SELECT USING (true);
CREATE POLICY "Anyone can read calculos" ON public.calculos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert calculos" ON public.calculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert ir_parametros" ON public.ir_parametros FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ir_parametros" ON public.ir_parametros FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert ir_faixas" ON public.ir_faixas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ir_faixas" ON public.ir_faixas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ir_faixas" ON public.ir_faixas FOR DELETE USING (true);
