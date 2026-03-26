import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FaixaIR } from '@/services/calculoIRPF';

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

const TabelaFaixas = ({ faixas, ano }: { faixas: FaixaIR[]; ano: number }) => {
  const sorted = [...faixas].sort((a, b) => a.limite_inferior - b.limite_inferior);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">C — Tabela IRPF {ano}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>De</TableHead>
                <TableHead>Até</TableHead>
                <TableHead>Alíquota</TableHead>
                <TableHead>Dedução</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{fmt(f.limite_inferior)}</TableCell>
                  <TableCell className="font-mono text-sm">{f.limite_superior ? fmt(f.limite_superior) : '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{fmtPct(f.aliquota)}</TableCell>
                  <TableCell className="font-mono text-sm">{fmt(f.deducao)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TabelaFaixas;
