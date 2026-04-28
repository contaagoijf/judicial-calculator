import { useState } from 'react';
import { LogIn, LogOut, Shield, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  compact?: boolean;
};

export function AdminAuthDialog({ compact = false }: Props) {
  const { toast } = useToast();
  const { user, isAdmin, signIn, signOut, completeFirstAccess, changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessPassword, setFirstAccessPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const resetFields = () => {
    setLoginEmail('');
    setLoginPassword('');
    setFirstAccessEmail('');
    setFirstAccessPassword('');
    setNewPassword('');
  };

  const withFeedback = async (action: () => Promise<void>, successTitle: string, successDescription: string) => {
    try {
      setLoading(true);
      await action();
      toast({ title: successTitle, description: successDescription });
      resetFields();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Nao foi possivel concluir',
        description: error.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {user ? (
          <Button variant={compact ? 'outline' : 'ghost'} className="gap-2">
            <Shield className="h-4 w-4" />
            {isAdmin ? 'Painel admin' : 'Conta'}
          </Button>
        ) : (
          <Button variant={compact ? 'default' : 'outline'} className="gap-2">
            <LogIn className="h-4 w-4" />
            Login admin
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acesso administrativo</DialogTitle>
          <DialogDescription>
            O calculo segue aberto ao publico. O login libera apenas as funcoes de administracao.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{user.email}</p>
              <p className="text-muted-foreground">{isAdmin ? 'Sessao administrativa ativa.' : 'Sessao sem privilegios administrativos.'}</p>
            </div>

            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  withFeedback(
                    () => signOut(),
                    'Sessao encerrada',
                    'O logout foi realizado com sucesso.',
                  )
                }
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>

              <Button
                onClick={() =>
                  withFeedback(
                    () => changePassword(newPassword),
                    'Senha atualizada',
                    'A nova senha ja esta valendo para este admin.',
                  )
                }
                disabled={!newPassword || loading}
              >
                Alterar senha
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="first-access">Primeiro acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" />
              </div>
              <Button
                className="w-full"
                disabled={!loginEmail || !loginPassword || loading}
                onClick={() =>
                  withFeedback(
                    () => signIn(loginEmail, loginPassword),
                    'Sessao iniciada',
                    'Login administrativo realizado com sucesso.',
                  )
                }
              >
                Entrar
              </Button>
            </TabsContent>

            <TabsContent value="first-access" className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Use esta aba quando um admin tiver cadastrado seu email e este for seu primeiro acesso.
              </div>
              <div className="space-y-2">
                <Label>Email convidado</Label>
                <Input value={firstAccessEmail} onChange={(event) => setFirstAccessEmail(event.target.value)} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Crie sua senha</Label>
                <Input
                  value={firstAccessPassword}
                  onChange={(event) => setFirstAccessPassword(event.target.value)}
                  type="password"
                />
              </div>
              <Button
                className="w-full gap-2"
                disabled={!firstAccessEmail || !firstAccessPassword || loading}
                onClick={() =>
                  withFeedback(
                    () => completeFirstAccess(firstAccessEmail, firstAccessPassword),
                    'Primeiro acesso concluido',
                    'Sua conta administrativa foi ativada.',
                  )
                }
              >
                <UserPlus className="h-4 w-4" />
                Ativar conta
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
