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

  const hasRows = rows.length > 0;
  const visibleFields = useMemo(() => config.fields, [config.fields]);

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

  const addRow = () => {
    setRows((currentRows) => [...currentRows, config.createRow()]);
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
              <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
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
                          field.type === 'boolean' ? (
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
                                {(field.options ?? []).map((option) => (
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
