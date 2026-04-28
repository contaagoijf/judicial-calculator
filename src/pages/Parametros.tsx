import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MailPlus, Save, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { AdminAuthDialog } from '@/components/AdminAuthDialog';
import { AdminTableManager } from '@/components/AdminTableManager';
import { adminTableConfigs } from '@/lib/adminTables';

const ParametrosPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { data: settings } = useSystemSettings();
  const [inviteEmail, setInviteEmail] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedTableName, setSelectedTableName] = useState(adminTableConfigs[0]?.table ?? '');
  const [pendingSettings, setPendingSettings] = useState({
    system_enabled: settings?.system_enabled ?? true,
    ajuste_anual_enabled: settings?.ajuste_anual_enabled ?? true,
    retificacao_enabled: settings?.retificacao_enabled ?? false,
  });
  const selectedTableConfig = adminTableConfigs.find((config) => config.table === selectedTableName) ?? adminTableConfigs[0];

  const adminsQuery = useQuery({
    queryKey: ['admin_users'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const invitesQuery = useQuery({
    queryKey: ['admin_invites'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const pendingInvites = (invitesQuery.data ?? []).filter((invite) => !invite.accepted_at);

  const handleInviteAdmin = async () => {
    try {
      const normalizedEmail = inviteEmail.trim().toLowerCase();

      if (!normalizedEmail) {
        toast({ title: 'Informe um email', description: 'Digite o email do novo administrador.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('admin_invites').upsert(
        {
          email: normalizedEmail,
          created_by: user?.id ?? null,
        },
        {
          onConflict: 'email',
        },
      );

      if (error) {
        throw error;
      }

      setInviteEmail('');
      await queryClient.invalidateQueries({ queryKey: ['admin_invites'] });
      await queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      toast({
        title: 'Convite criado',
        description: 'O novo admin ja pode usar a aba de primeiro acesso para definir a senha.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao convidar admin',
        description: error.message ?? 'Nao foi possivel cadastrar o convite.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);

      const { error } = await supabase.from('system_settings').upsert({
        id: true,
        ...pendingSettings,
      });

      if (error) {
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['system_settings'] });
      toast({ title: 'Disponibilidade atualizada', description: 'As novas regras de acesso ja estao valendo.' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar disponibilidade',
        description: error.message ?? 'Nao foi possivel atualizar as chaves do sistema.',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    setPendingSettings({
      system_enabled: settings?.system_enabled ?? true,
      ajuste_anual_enabled: settings?.ajuste_anual_enabled ?? true,
      retificacao_enabled: settings?.retificacao_enabled ?? false,
    });
  }, [settings]);

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Parametros e administracao</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              As tabelas abaixo ficam visiveis para qualquer pessoa. A edicao, os convites de admin e o controle de disponibilidade ficam liberados apenas em sessao administrativa.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <AdminAuthDialog compact />
            {isAdmin && <Badge>Admin ativo</Badge>}
          </div>
        </div>

        {!isAdmin && (
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertTitle>Modo publico</AlertTitle>
            <AlertDescription>
              Voce pode consultar todas as tabelas, mas as acoes de cadastro, edicao e exclusao ficam bloqueadas ate um admin entrar.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="tabelas" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 md:grid-cols-3">
            <TabsTrigger value="tabelas" className="rounded-md border bg-muted/50 px-4 py-2 data-[state=active]:border-primary">
              Tabelas
            </TabsTrigger>
            <TabsTrigger value="acesso" className="rounded-md border bg-muted/50 px-4 py-2 data-[state=active]:border-primary">
              Acesso admin
            </TabsTrigger>
            <TabsTrigger value="disponibilidade" className="rounded-md border bg-muted/50 px-4 py-2 data-[state=active]:border-primary">
              Disponibilidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tabelas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecione a tabela</CardTitle>
                <CardDescription>
                  Escolha qual conjunto de dados deseja consultar. Em sessao administrativa, a tabela escolhida tambem pode ser editada.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-xl">
                <div className="space-y-2">
                  <Label>Tabela</Label>
                  <Select value={selectedTableName} onValueChange={setSelectedTableName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma tabela" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminTableConfigs.map((config) => (
                        <SelectItem key={config.table} value={config.table}>
                          {config.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedTableConfig && <AdminTableManager config={selectedTableConfig} canEdit={isAdmin} />}
          </TabsContent>

          <TabsContent value="acesso" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Criar novo admin</CardTitle>
                <CardDescription>
                  Informe apenas o email. No primeiro acesso, a pessoa usara a aba propria para definir a senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAdmin ? (
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Email do novo admin</Label>
                      <Input
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="novo.admin@exemplo.com"
                        type="email"
                      />
                    </div>
                    <Button onClick={handleInviteAdmin} className="gap-2">
                      <MailPlus className="h-4 w-4" />
                      Criar convite
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Entre com um admin para liberar o cadastro de novos acessos administrativos.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Administradores ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isAdmin ? (
                    <p className="text-sm text-muted-foreground">Lista visivel apenas em sessao administrativa.</p>
                  ) : adminsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando administradores...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Criado em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(adminsQuery.data ?? []).map((admin) => (
                            <TableRow key={admin.user_id}>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>{admin.created_at ? new Date(admin.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Convites pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {!isAdmin ? (
                    <p className="text-sm text-muted-foreground">Os convites pendentes aparecem apenas para admins.</p>
                  ) : invitesQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando convites...</p>
                  ) : pendingInvites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum convite pendente no momento.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Criado em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingInvites.map((invite) => (
                            <TableRow key={invite.id}>
                              <TableCell>{invite.email}</TableCell>
                              <TableCell>{invite.created_at ? new Date(invite.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="disponibilidade" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chaves de disponibilidade</CardTitle>
                <CardDescription>
                  Use estas chaves para desabilitar o sistema inteiro ou cada ferramenta de calculo individualmente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Sistema inteiro</p>
                    <p className="text-sm text-muted-foreground">
                      Desligando aqui, o publico perde acesso as ferramentas e a consulta por ID.
                    </p>
                  </div>
                  <Switch
                    checked={pendingSettings.system_enabled}
                    onCheckedChange={(checked) => setPendingSettings((current) => ({ ...current, system_enabled: checked }))}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Ajuste anual</p>
                    <p className="text-sm text-muted-foreground">Liga ou desliga apenas a calculadora de ajuste anual.</p>
                  </div>
                  <Switch
                    checked={pendingSettings.ajuste_anual_enabled}
                    onCheckedChange={(checked) => setPendingSettings((current) => ({ ...current, ajuste_anual_enabled: checked }))}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Retificacao</p>
                    <p className="text-sm text-muted-foreground">Mantem a chave pronta para quando a ferramenta for liberada.</p>
                  </div>
                  <Switch
                    checked={pendingSettings.retificacao_enabled}
                    onCheckedChange={(checked) => setPendingSettings((current) => ({ ...current, retificacao_enabled: checked }))}
                    disabled={!isAdmin}
                  />
                </div>

                {isAdmin ? (
                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-2">
                      <Save className="h-4 w-4" />
                      Salvar disponibilidade
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Entre com um admin para alterar a disponibilidade do sistema.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ParametrosPage;
