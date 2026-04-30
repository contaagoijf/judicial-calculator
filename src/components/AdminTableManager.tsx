import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/externalClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { AdminTableConfig, TableField } from '@/lib/adminTables';

type RowData = Record<string, unknown>;

function normalizeValue(field: TableField, value: unknown) {
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) {
      return field.nullable ? null : 0;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? (field.nullable ? null : 0) : parsed;
  }

  if (field.type === 'boolean') {
    return Boolean(value);
  }

  if (value === '' && field.nullable) {
    return null;
  }

  return value;
}

export function AdminTableManager({
  config,
  canEdit,
}: {
  config: AdminTableConfig;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RowData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<RowData>(() => config.createRow());

  const indicesQuery = useQuery({
    queryKey: ['admin_indices_options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indices_economicos').select('id,sigla').order('sigla', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; sigla: string }>;
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['admin_templates_options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('templates_calculo').select('id,nome').order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const query = useQuery({
    queryKey: ['admin_table', config.table],
    queryFn: async () => {
      let request: any = supabase.from(config.table).select('*');

      for (const sortRule of config.orderBy ?? []) {
        request = request.order(sortRule.column, { ascending: sortRule.ascending ?? true });
      }

      const { data, error } = await request;

      if (error) {
        throw error;
      }

      return (data ?? []) as RowData[];
    },
  });

  useEffect(() => {
    setRows(query.data ?? []);
  }, [query.data]);

  useEffect(() => {
    setNewRowDraft(config.createRow());
  }, [config.table]);

  const hasRows = rows.length > 0;
  const visibleFields = useMemo(() => config.fields, [config.fields]);

  const getFieldOptions = (field: TableField) => {
    if (field.options && field.options.length > 0) {
      return field.options;
    }

    if (config.table === 'taxas_historicas' && field.key === 'id_indice') {
      return (indicesQuery.data ?? []).map((item) => ({ value: item.id, label: item.sigla }));
    }

    if (config.table === 'regras_subperiodo' && field.key === 'id_template') {
      return (templatesQuery.data ?? []).map((item) => ({ value: item.id, label: item.nome }));
    }

    if (config.table === 'regras_subperiodo' && (field.key === 'id_indice_correcao' || field.key === 'id_indice_juros')) {
      return (indicesQuery.data ?? []).map((item) => ({ value: item.id, label: item.sigla }));
    }

    return [] as Array<{ label: string; value: string }>;
  };

  const getOptionLabel = (field: TableField, value: unknown) => {
    const options = getFieldOptions(field);
    const match = options.find((option) => option.value === value);
    return match ? match.label : String(value ?? '-');
  };

  const openAddDialog = () => {
    setNewRowDraft(config.createRow());
    setIsDialogOpen(true);
  };

  const handleAddDialogSubmit = () => {
    const normalizedDraft = visibleFields.reduce((acc, field) => {
      acc[field.key] = normalizeValue(field, newRowDraft[field.key]);
      return acc;
    }, {} as RowData);

    setRows((currentRows) => [...currentRows, normalizedDraft]);
    setIsDialogOpen(false);
  };

  const updateRow = (index: number, field: TableField, value: unknown) => {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field.key]: normalizeValue(field, value),
            }
          : row,
      ),
    );
  };

  const removeRow = (index: number) => {
    setRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSave = async () => {
    try {
      const originalRows = (query.data ?? []) as RowData[];
      const originalIds = new Set(
        originalRows
          .map((row) => row[config.primaryKey])
          .filter((value) => value !== null && value !== undefined),
      );
      const currentIds = new Set(
        rows
          .map((row) => row[config.primaryKey])
          .filter((value) => value !== null && value !== undefined),
      );

      const idsToDelete = Array.from(originalIds).filter((value) => !currentIds.has(value));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from(config.table)
          .delete()
          .in(config.primaryKey, idsToDelete as never[]);

        if (deleteError) {
          throw deleteError;
        }
      }

      const rowsToUpsert = rows
        .filter((row) => row[config.primaryKey] !== null && row[config.primaryKey] !== undefined)
        .map((row) => {
          const nextRow = { ...row };
          for (const field of config.fields) {
            nextRow[field.key] = normalizeValue(field, nextRow[field.key]);
          }
          return nextRow;
        });

      if (rowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from(config.table).upsert(rowsToUpsert as never[]);

        if (upsertError) {
          throw upsertError;
        }
      }

      const rowsToInsert = rows
        .filter((row) => row[config.primaryKey] === null || row[config.primaryKey] === undefined)
        .map((row) => {
          const nextRow = { ...row };
          for (const field of config.fields) {
            nextRow[field.key] = normalizeValue(field, nextRow[field.key]);
          }
          return nextRow;
        });

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase.from(config.table).insert(rowsToInsert as never[]);

        if (insertError) {
          throw insertError;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin_table', config.table] });
      await queryClient.invalidateQueries({ queryKey: ['ir_parametros'] });
      await queryClient.invalidateQueries({ queryKey: ['ir_faixas'] });
      toast({ title: 'Tabela atualizada', description: `${config.title} salva com sucesso.` });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar tabela',
        description: error.message ?? 'Nao foi possivel salvar os dados.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openAddDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar novo registro</DialogTitle>
              <DialogDescription>Preencha as informações e confirme para inserir um novo item em {config.title}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {visibleFields
                .filter((field) => field.editable !== false)
                .map((field) => (
                  <div key={field.key} className="grid gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    {field.type === 'select' ? (
                      <Select
                        value={String(newRowDraft[field.key] ?? '')}
                        onValueChange={(value) => setNewRowDraft((draft) => ({ ...draft, [field.key]: value }))}
                      >
                        <SelectTrigger className="min-w-[140px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldOptions(field).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : field.type}
                        step={field.step}
                        value={String(newRowDraft[field.key] ?? '')}
                        placeholder={field.placeholder}
                        onChange={(event) => setNewRowDraft((draft) => ({ ...draft, [field.key]: event.target.value }))}
                      />
                    )}
                  </div>
                ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddDialogSubmit}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        ) : !hasRows ? (
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleFields.map((field) => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                  {canEdit && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIndex) => (
                  <TableRow key={`${String(row[config.primaryKey] ?? 'new')}-${rowIndex}`}>
                    {visibleFields.map((field) => (
                      <TableCell key={field.key} className="align-top">
                        {canEdit ? (
                          field.editable === false ? (
                            <span className="text-sm text-muted-foreground">{String(row[field.key] ?? '-')}</span>
                          ) : field.type === 'boolean' ? (
                            <div className="flex min-h-10 items-center">
                              <Switch
                                checked={Boolean(row[field.key])}
                                onCheckedChange={(checked) => updateRow(rowIndex, field, checked)}
                              />
                            </div>
                          ) : field.type === 'select' ? (
                            <Select
                              value={String(row[field.key] ?? '')}
                              onValueChange={(value) => updateRow(rowIndex, field, value)}
                            >
                              <SelectTrigger className="min-w-[140px]">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {getFieldOptions(field).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={field.type === 'number' ? 'number' : field.type}
                              step={field.step}
                              value={String(row[field.key] ?? '')}
                              placeholder={field.placeholder}
                              onChange={(event) => updateRow(rowIndex, field, event.target.value)}
                              className="min-w-[150px]"
                            />
                          )
                        ) : field.type === 'boolean' ? (
                          <span>{row[field.key] ? 'Sim' : 'Nao'}</span>
                        ) : field.type === 'select' ? (
                          <span className="text-sm">{getOptionLabel(field, row[field.key])}</span>
                        ) : (
                          <span className="text-sm">{String(row[field.key] ?? '-')}</span>
                        )}
                      </TableCell>
                    ))}

                    {canEdit && (
                      <TableCell className="align-top">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(rowIndex)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
