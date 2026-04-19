export const NOISE_PATTERNS = [
  /^pt\.?\s*/i,
  /^tbk\.?\s*/i,
  /^cv\.?\s*/i,
  /^ud\.?\s*/i,
];

export const ALIAS_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /go[- ]?jek.*/i, replacement: 'gojek' },
  { pattern: /grab[- ]?(?:taxi|f(oo)?d)?.*/i, replacement: 'grab' },
  { pattern: /maxim\s*(?:taxi)?.*/i, replacement: 'maxim' },
  { pattern: /tiket\.?com.*/i, replacement: 'tiketcom' },
  { pattern: /traveloka.*/i, replacement: 'traveloka' },
  { pattern: /shopee.*/i, replacement: 'shopee' },
  { pattern: /tokopedia.*/i, replacement: 'tokopedia' },
];

export function normalizeMerchant(raw: string): string {
  if (!raw || raw.trim() === '') {
    return '';
  }

  let normalized = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const rule of ALIAS_RULES) {
    if (rule.pattern.test(normalized)) {
      normalized = normalized.replace(rule.pattern, rule.replacement).trim();
      break;
    }
  }

  for (const pattern of NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  return normalized;
}
