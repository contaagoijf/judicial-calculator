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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function AdminAuthDialog({ compact = false }: Props) {
  const { toast } = useToast();
  const {
    user,
    isAdmin,
    signIn,
    signOut,
    completeFirstAccess,
    changePassword,
    isRegisteredAdminEmail,
    requestPasswordRecovery,
    verifyRecoveryCode,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessPassword, setFirstAccessPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Fluxo "Esqueceu a senha?"
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'code'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [emailNaoEncontradoOpen, setEmailNaoEncontradoOpen] = useState(false);
  const [novaSenhaOpen, setNovaSenhaOpen] = useState(false);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [emailInvalidoOpen, setEmailInvalidoOpen] = useState(false);

  const handleEmailBlur = (value: string) => {
    if (value.trim() && !isValidEmail(value)) {
      setEmailInvalidoOpen(true);
    }
  };

  const resetFields = () => {
    setLoginEmail('');
    setLoginPassword('');
    setFirstAccessEmail('');
    setFirstAccessPassword('');
    setNewPassword('');
  };

  const resetForgotFields = () => {
    setForgotStep('email');
    setForgotEmail('');
    setRecoveryCode('');
  };

  const handleAbrirEsqueceuSenha = () => {
    resetForgotFields();
    setForgotOpen(true);
  };

  const handleEnviarCodigoRecuperacao = async () => {
    try {
      setLoading(true);
      const existe = await isRegisteredAdminEmail(forgotEmail);
      if (!existe) {
        setForgotOpen(false);
        setEmailNaoEncontradoOpen(true);
        return;
      }
      await requestPasswordRecovery(forgotEmail);
      toast({
        title: 'Código enviado',
        description: 'Confira o e-mail informado e digite o código de 6 dígitos recebido.',
      });
      setForgotStep('code');
    } catch (error: any) {
      toast({
        title: 'Não foi possível enviar o código',
        description: error.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarCodigoRecuperacao = async () => {
    try {
      setLoading(true);
      await verifyRecoveryCode(forgotEmail, recoveryCode);
      setForgotOpen(false);
      resetForgotFields();
      setNovaSenhaOpen(true);
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: error.message ?? 'Verifique o código recebido por e-mail e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarNovaSenhaRecuperacao = async () => {
    try {
      setLoading(true);
      await changePassword(recoveryNewPassword);
      toast({ title: 'Senha atualizada', description: 'Use a nova senha no próximo login.' });
      setNovaSenhaOpen(false);
      setRecoveryNewPassword('');
    } catch (error: any) {
      toast({
        title: 'Não foi possível salvar a nova senha',
        description: error.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
    <>
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
                <Input
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  onBlur={(event) => handleEmailBlur(event.target.value)}
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" />
                <button
                  type="button"
                  className="block w-full text-center text-sm text-primary underline-offset-4 hover:underline"
                  onClick={handleAbrirEsqueceuSenha}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <Button
                className="w-full"
                disabled={!loginEmail || !isValidEmail(loginEmail) || !loginPassword || loading}
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
                <Input
                  value={firstAccessEmail}
                  onChange={(event) => setFirstAccessEmail(event.target.value)}
                  onBlur={(event) => handleEmailBlur(event.target.value)}
                  type="email"
                />
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
                disabled={!firstAccessEmail || !isValidEmail(firstAccessEmail) || !firstAccessPassword || loading}
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

      <Dialog open={forgotOpen} onOpenChange={(next) => { setForgotOpen(next); if (!next) resetForgotFields(); }}>
        <DialogContent className="min-h-[420px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Esqueceu a senha?</DialogTitle>
            <DialogDescription>
              {forgotStep === 'email'
                ? 'Informe o e-mail cadastrado para receber um código de verificação.'
                : 'Digite o código de 6 dígitos enviado para o seu e-mail.'}
            </DialogDescription>
          </DialogHeader>

          {forgotStep === 'email' ? (
            <div className="flex flex-col">
              <div className="space-y-2 mt-12">
                <Label>E-mail cadastrado</Label>
                <Input
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  onBlur={(event) => handleEmailBlur(event.target.value)}
                  type="email"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" disabled={!forgotEmail || !isValidEmail(forgotEmail) || loading} onClick={handleEnviarCodigoRecuperacao}>
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between">
              <div className="space-y-2">
                <Label>Código recebido por e-mail</Label>
                <Input
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="font-mono tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" disabled={recoveryCode.length !== 6 || loading} onClick={handleVerificarCodigoRecuperacao}>
                  Verificar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={emailNaoEncontradoOpen} onOpenChange={setEmailNaoEncontradoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-mail não encontrado</DialogTitle>
            <DialogDescription>
              O e-mail informado não existe! Solicite ao admin para cadastrar seu acesso.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full" onClick={() => setEmailNaoEncontradoOpen(false)}>OK</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={emailInvalidoOpen} onOpenChange={setEmailInvalidoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-mail inválido</DialogTitle>
            <DialogDescription>
              O e-mail informado está incompleto ou não segue o padrão nome@dominio.com. Corrija o e-mail para continuar.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full" onClick={() => setEmailInvalidoOpen(false)}>OK</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={novaSenhaOpen} onOpenChange={setNovaSenhaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova senha</DialogTitle>
            <DialogDescription>Defina a nova senha de acesso ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                value={recoveryNewPassword}
                onChange={(event) => setRecoveryNewPassword(event.target.value)}
                type="password"
              />
            </div>
            <Button className="w-full" disabled={!recoveryNewPassword || loading} onClick={handleSalvarNovaSenhaRecuperacao}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
