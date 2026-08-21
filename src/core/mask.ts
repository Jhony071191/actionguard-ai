const SENSITIVE_KEY = /(iban|bank|account|routing|ssn|tax.?id|email|phone|token|secret|password)/i;

function maskString(value: string): string {
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 2)}${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`;
}

export function maskSensitive(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return typeof value === 'string' ? maskString(value) : '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => maskSensitive(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([nestedKey, nested]) => [
        nestedKey,
        maskSensitive(nested, nestedKey),
      ]),
    );
  }
  return value;
}

export function hasSensitiveBankData(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some((key) => /(iban|bank|routing|account)/i.test(key));
}

