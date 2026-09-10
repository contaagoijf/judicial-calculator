import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { currencyToMaskedDisplay, parseMaskedCurrency } from '@/lib/masks';

interface CampoMonetarioProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function CampoMonetario({ label, value, onChange, disabled = false }: CampoMonetarioProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        inputMode="numeric"
        value={currencyToMaskedDisplay(value)}
        onChange={(e) => onChange(parseMaskedCurrency(e.target.value))}
        placeholder="0,00"
        disabled={disabled}
        className="font-mono"
      />
    </div>
  );
}
