const PROCESSO_SEGMENT_LENGTHS = [7, 2, 4, 1, 2, 4];
const PROCESSO_SEPARATORS = ['-', '.', '.', '.', '.'];
const PROCESSO_DIGIT_COUNT = PROCESSO_SEGMENT_LENGTHS.reduce((a, b) => a + b, 0);

/** Indica se o número do processo (já mascarado) está completo no padrão do e-Proc. */
export function isNumeroProcessoCompleto(value: string): boolean {
  return value.replace(/\D/g, '').length === PROCESSO_DIGIT_COUNT;
}

/** Formata dígitos no padrão de número de processo do e-Proc: NNNNNNN-DD.AAAA.J.TR.OOOO */
export function formatNumeroProcesso(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, PROCESSO_DIGIT_COUNT);
  let result = '';
  let pos = 0;
  for (let i = 0; i < PROCESSO_SEGMENT_LENGTHS.length; i++) {
    const len = PROCESSO_SEGMENT_LENGTHS[i];
    const segment = digits.slice(pos, pos + len);
    if (!segment) break;
    if (i > 0) result += PROCESSO_SEPARATORS[i - 1];
    result += segment;
    pos += len;
  }
  return result;
}

/** Formata uma string de dígitos (centavos) como moeda pt-BR: "123456" -> "1.234,56" */
export function formatCurrencyDigits(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, '');
  if (!onlyDigits) return '';
  const padded = onlyDigits.padStart(3, '0');
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const centPart = padded.slice(-2);
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${centPart}`;
}

/** Converte um valor numérico para a string de exibição mascarada (para preencher o campo a partir de dados já carregados). */
export function currencyToMaskedDisplay(value: number): string {
  if (!value) return '';
  const cents = Math.round(Math.abs(value) * 100).toString();
  return formatCurrencyDigits(cents);
}

/** Extrai o valor numérico (em reais) a partir do texto digitado com máscara de moeda. */
export function parseMaskedCurrency(displayValue: string): number {
  const digits = displayValue.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) / 100 : 0;
}
