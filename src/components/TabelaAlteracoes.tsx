import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Alteracao {
  original: number;
  acrescimo: number;
  decrescimo: number;
  recalculado: number;
}

interface Props {
  alteracoes: {
    rendimentos: Alteracao;
    deducoes: Alteracao;
    incentivo: Alteracao;
    rra: Alteracao;
    imposto_pago: Alteracao;
  };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TabelaAlteracoes = ({ alteracoes }: Props) => {
  const rows = [
    { label: 'Rendimentos tributáveis', data: alteracoes.rendimentos },
    { label: 'Deduções', data: alteracoes.deducoes },
    { label: 'Deduções de incentivo', data: alteracoes.incentivo },
    { label: 'Imposto RRA', data: alteracoes.rra },
    { label: 'Imposto pago', data: alteracoes.imposto_pago },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">A — Tabela de Alterações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor Original</TableHead>
                <TableHead className="text-right">Acréscimo</TableHead>
                <TableHead className="text-right">Decréscimo</TableHead>
                <TableHead className="text-right">Recalculado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(row.data.original)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(row.data.acrescimo)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(row.data.decrescimo)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{fmt(row.data.recalculado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TabelaAlteracoes;
