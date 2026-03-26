import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ResultadoCalculo } from '@/services/calculoIRPF';

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

const BlocoCalculo = ({ resultado }: { resultado: ResultadoCalculo }) => {
  const rows = [
    { label: 'Total de rendimentos tributáveis (+)', value: fmt(resultado.rend_trib_recalc) },
    { label: 'Total das deduções (-)', value: fmt(resultado.total_deducoes_recalc) },
    { label: 'Base de cálculo recalculado (=)', value: fmt(resultado.base_calculo_recalc), bold: true },
    { label: 'Alíquota aplicável (x)', value: fmtPct(resultado.aliquota_recalc) },
    { label: 'Parcela de dedução (-)', value: fmt(resultado.deducao_recalc) },
    { label: 'Total das deduções de incentivo (-)', value: fmt(resultado.incentivo_recalc) },
    { label: 'Imposto devido RRA (+)', value: fmt(resultado.imposto_rra_recalc) },
    { label: 'Imposto devido (=)', value: fmt(resultado.imposto_devido_recalc), bold: true },
    { label: 'Total do imposto pago (-)', value: fmt(resultado.alteracoes.imposto_pago.recalculado) },
    { label: 'Imposto a pagar / restituir', value: fmt(resultado.imposto_a_pagar), highlight: true },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">B — Cálculo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label} className={row.highlight ? 'bg-accent/50' : ''}>
                  <TableCell className={`${row.bold || row.highlight ? 'font-semibold' : ''}`}>
                    {row.label}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${row.bold || row.highlight ? 'font-bold' : ''}`}>
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlocoCalculo;
