CREATE TABLE IF NOT EXISTS public.admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_invites_email_lower CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_email_lower CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  ajuste_anual_enabled BOOLEAN NOT NULL DEFAULT true,
  retificacao_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.system_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_invited_admin(invite_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_invites
    WHERE email = lower(invite_email)
      AND accepted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.grant_admin_by_email(target_email TEXT, creator_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_email TEXT;
  existing_user_id UUID;
  effective_creator UUID;
BEGIN
  normalized_email := lower(trim(target_email));

  IF normalized_email IS NULL OR normalized_email = '' THEN
    RETURN;
  END IF;

  effective_creator := creator_id;

  IF effective_creator IS NULL THEN
    SELECT created_by
    INTO effective_creator
    FROM public.admin_invites
    WHERE email = normalized_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  SELECT id
  INTO existing_user_id
  FROM auth.users
  WHERE lower(email) = normalized_email
  LIMIT 1;

  IF existing_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.admin_users (user_id, email, created_by)
  VALUES (existing_user_id, normalized_email, effective_creator)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      created_by = COALESCE(public.admin_users.created_by, EXCLUDED.created_by);

  UPDATE public.admin_invites
  SET accepted_by = existing_user_id,
      accepted_at = COALESCE(accepted_at, now())
  WHERE email = normalized_email
    AND accepted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_admin_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.grant_admin_by_email(NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_admin_invite_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.grant_admin_by_email(NEW.email, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_system_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_taxas_historicas(target_indice UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  indice_natureza TEXT;
  acumulado NUMERIC(20, 12);
  current_row RECORD;
  multiplicador NUMERIC(16, 10);
BEGIN
  IF target_indice IS NULL THEN
    RETURN;
  END IF;

  SELECT natureza
  INTO indice_natureza
  FROM public.indices_economicos
  WHERE id = target_indice;

  IF indice_natureza IS NULL THEN
    RETURN;
  END IF;

  acumulado := CASE WHEN indice_natureza = 'JUROS' THEN 0 ELSE 1 END;

  FOR current_row IN
    SELECT id, valor_percentual
    FROM public.taxas_historicas
    WHERE id_indice = target_indice
    ORDER BY data_referencia, criado_em, id
  LOOP
    multiplicador := ROUND((1 + (COALESCE(current_row.valor_percentual, 0) / 100.0))::numeric, 10);

    IF indice_natureza = 'JUROS' THEN
      acumulado := acumulado + multiplicador;
    ELSE
      acumulado := acumulado * multiplicador;
    END IF;

    UPDATE public.taxas_historicas
    SET fator_multiplicador = multiplicador,
        fator_acumulado = ROUND(acumulado, 12)
    WHERE id = current_row.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_taxas_historicas_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_taxas_historicas(OLD.id_indice);
    RETURN OLD;
  END IF;

  NEW.fator_multiplicador := ROUND((1 + (COALESCE(NEW.valor_percentual, 0) / 100.0))::numeric, 10);
  NEW.fator_acumulado := COALESCE(NEW.fator_acumulado, 0);

  IF TG_OP = 'UPDATE'
     AND OLD.id_indice IS DISTINCT FROM NEW.id_indice
     AND OLD.id_indice IS NOT NULL THEN
    PERFORM public.recalculate_taxas_historicas(OLD.id_indice);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_taxas_historicas_after_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_taxas_historicas(NEW.id_indice);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_admin_sync ON auth.users;
CREATE TRIGGER on_auth_user_admin_sync
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_admin_sync();

DROP TRIGGER IF EXISTS on_admin_invite_sync ON public.admin_invites;
CREATE TRIGGER on_admin_invite_sync
AFTER INSERT OR UPDATE ON public.admin_invites
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_invite_sync();

DROP TRIGGER IF EXISTS on_system_settings_touch ON public.system_settings;
CREATE TRIGGER on_system_settings_touch
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_system_settings();

DROP TRIGGER IF EXISTS on_taxas_historicas_before_write ON public.taxas_historicas;
CREATE TRIGGER on_taxas_historicas_before_write
BEFORE INSERT OR UPDATE ON public.taxas_historicas
FOR EACH ROW
EXECUTE FUNCTION public.handle_taxas_historicas_write();

DROP TRIGGER IF EXISTS on_taxas_historicas_after_write ON public.taxas_historicas;
CREATE TRIGGER on_taxas_historicas_after_write
AFTER INSERT OR UPDATE ON public.taxas_historicas
FOR EACH ROW
EXECUTE FUNCTION public.handle_taxas_historicas_after_write();

DROP TRIGGER IF EXISTS on_taxas_historicas_after_delete ON public.taxas_historicas;
CREATE TRIGGER on_taxas_historicas_after_delete
AFTER DELETE ON public.taxas_historicas
FOR EACH ROW
EXECUTE FUNCTION public.handle_taxas_historicas_write();

DO $$
DECLARE
  initial_admin_id UUID := '7f2ac4f5-5342-4d6d-9e2b-4dcb67f4f1d0';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'contaagoijf@gmail.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      initial_admin_id,
      'authenticated',
      'authenticated',
      'contaagoijf@gmail.com',
      extensions.crypt('agoiagoi', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('agoiagoi', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE email = 'contaagoijf@gmail.com';

    SELECT id
    INTO initial_admin_id
    FROM auth.users
    WHERE email = 'contaagoijf@gmail.com'
    LIMIT 1;
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    initial_admin_id,
    jsonb_build_object(
      'sub', initial_admin_id::text,
      'email', 'contaagoijf@gmail.com'
    ),
    'email',
    'contaagoijf@gmail.com',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.admin_users (user_id, email)
  VALUES (initial_admin_id, 'contaagoijf@gmail.com')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

ALTER TABLE public.ir_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ir_faixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salario_minimo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indices_economicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxas_historicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_calculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_subperiodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ir_parametros" ON public.ir_parametros;
DROP POLICY IF EXISTS "Anyone can read ir_faixas" ON public.ir_faixas;
DROP POLICY IF EXISTS "Anyone can read calculos" ON public.calculos;
DROP POLICY IF EXISTS "Anyone can insert calculos" ON public.calculos;
DROP POLICY IF EXISTS "Anyone can insert ir_parametros" ON public.ir_parametros;
DROP POLICY IF EXISTS "Anyone can update ir_parametros" ON public.ir_parametros;
DROP POLICY IF EXISTS "Anyone can insert ir_faixas" ON public.ir_faixas;
DROP POLICY IF EXISTS "Anyone can update ir_faixas" ON public.ir_faixas;
DROP POLICY IF EXISTS "Anyone can delete ir_faixas" ON public.ir_faixas;
DROP POLICY IF EXISTS "Public read ir_parametros" ON public.ir_parametros;
DROP POLICY IF EXISTS "Admin manage ir_parametros" ON public.ir_parametros;
DROP POLICY IF EXISTS "Public read ir_faixas" ON public.ir_faixas;
DROP POLICY IF EXISTS "Admin manage ir_faixas" ON public.ir_faixas;
DROP POLICY IF EXISTS "Public read salario_minimo" ON public.salario_minimo;
DROP POLICY IF EXISTS "Admin manage salario_minimo" ON public.salario_minimo;
DROP POLICY IF EXISTS "Public read indices_economicos" ON public.indices_economicos;
DROP POLICY IF EXISTS "Admin manage indices_economicos" ON public.indices_economicos;
DROP POLICY IF EXISTS "Public read taxas_historicas" ON public.taxas_historicas;
DROP POLICY IF EXISTS "Admin manage taxas_historicas" ON public.taxas_historicas;
DROP POLICY IF EXISTS "Public read templates_calculo" ON public.templates_calculo;
DROP POLICY IF EXISTS "Admin manage templates_calculo" ON public.templates_calculo;
DROP POLICY IF EXISTS "Public read regras_subperiodo" ON public.regras_subperiodo;
DROP POLICY IF EXISTS "Admin manage regras_subperiodo" ON public.regras_subperiodo;
DROP POLICY IF EXISTS "Public read calculos" ON public.calculos;
DROP POLICY IF EXISTS "Public insert calculos" ON public.calculos;
DROP POLICY IF EXISTS "Public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin manage system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin read pending invites" ON public.admin_invites;
DROP POLICY IF EXISTS "Admin manage invites" ON public.admin_invites;
DROP POLICY IF EXISTS "Read own or all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin manage users" ON public.admin_users;

CREATE POLICY "Public read ir_parametros" ON public.ir_parametros
FOR SELECT USING (true);

CREATE POLICY "Admin manage ir_parametros" ON public.ir_parametros
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read ir_faixas" ON public.ir_faixas
FOR SELECT USING (true);

CREATE POLICY "Admin manage ir_faixas" ON public.ir_faixas
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read salario_minimo" ON public.salario_minimo
FOR SELECT USING (true);

CREATE POLICY "Admin manage salario_minimo" ON public.salario_minimo
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read indices_economicos" ON public.indices_economicos
FOR SELECT USING (true);

CREATE POLICY "Admin manage indices_economicos" ON public.indices_economicos
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read taxas_historicas" ON public.taxas_historicas
FOR SELECT USING (true);

CREATE POLICY "Admin manage taxas_historicas" ON public.taxas_historicas
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read templates_calculo" ON public.templates_calculo
FOR SELECT USING (true);

CREATE POLICY "Admin manage templates_calculo" ON public.templates_calculo
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read regras_subperiodo" ON public.regras_subperiodo
FOR SELECT USING (true);

CREATE POLICY "Admin manage regras_subperiodo" ON public.regras_subperiodo
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read calculos" ON public.calculos
FOR SELECT USING (true);

CREATE POLICY "Public insert calculos" ON public.calculos
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read system_settings" ON public.system_settings
FOR SELECT USING (true);

CREATE POLICY "Admin manage system_settings" ON public.system_settings
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin read pending invites" ON public.admin_invites
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin manage invites" ON public.admin_invites
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Read own or all admin users" ON public.admin_users
FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Admin manage users" ON public.admin_users
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
