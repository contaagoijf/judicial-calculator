import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/externalClient';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeFirstAccess: (email: string, password: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAdminStatus = async (targetUser?: User | null) => {
    const userToCheck = targetUser ?? user;

    if (!userToCheck) {
      setIsAdmin(false);
      return;
    }

    const { data, error } = await supabase.rpc('is_admin');

    if (error) {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(Boolean(data));
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      await refreshAdminStatus(data.session?.user ?? null);
      setIsLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void refreshAdminStatus(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isAdmin,
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizeEmail(email),
          password,
        });

        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
      completeFirstAccess: async (email, password) => {
        const normalizedEmail = normalizeEmail(email);
        const { data: invited, error: inviteError } = await supabase.rpc('is_invited_admin', {
          invite_email: normalizedEmail,
        });

        if (inviteError) {
          throw inviteError;
        }

        if (!invited) {
          throw new Error('Nao existe convite pendente para esse email.');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          throw new Error('Conta criada. Se o login nao entrou automaticamente, confirme o email no Supabase e tente novamente.');
        }
      },
      changePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          throw error;
        }
      },
      refreshAdminStatus: async () => {
        await refreshAdminStatus();
      },
    }),
    [session, user, isAdmin, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
