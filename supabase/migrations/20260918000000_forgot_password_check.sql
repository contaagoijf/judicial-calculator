-- Permite checar, a partir de um contexto nao autenticado, se um e-mail
-- corresponde a um administrador ja cadastrado (public.admin_users) -- usado
-- pelo fluxo "Esqueceu a senha?" para exibir a mensagem correta antes de
-- disparar o envio do codigo de recuperacao (supabase.auth.resetPasswordForEmail).
CREATE OR REPLACE FUNCTION public.is_registered_admin_email(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE email = lower(trim(check_email))
  );
$$;
