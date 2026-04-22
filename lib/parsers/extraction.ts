import type { ExtractionStrategy, ExtractionLogEntry } from './types';

export interface ExtractionResult {
  value: unknown;
  log: ExtractionLogEntry[];
}

export function extractKeywordProximity(
  text: string,
  keyword: string,
  window: number = 50,
  secondaryPattern?: string
): string | null {
  const lowerText = text.toLowerCase();
  const keywordIndex = lowerText.indexOf(keyword.toLowerCase());

  if (keywordIndex === -1) return null;

  const start = Math.max(0, keywordIndex - window);
  const end = Math.min(text.length, keywordIndex + keyword.length + window);
  const windowText = text.slice(start, end);

  if (secondaryPattern) {
    const match = windowText.match(new RegExp(secondaryPattern));
    return match ? match[1]?.trim() : null;
  }

  return windowText.trim();
}

export function extractField(
  body: string,
  strategies: ExtractionStrategy[]
): ExtractionResult {
  const logs: ExtractionLogEntry[] = [];

  for (const strategy of strategies) {
    const logEntry: ExtractionLogEntry = {
      field: 'unknown',
      strategy_type: strategy.type,
      pattern_used: strategy.pattern || strategy.fallback,
      result: 'no_match',
    };

    try {
      if (strategy.type === 'regex' && strategy.pattern) {
        const match = body.match(new RegExp(strategy.pattern));
        if (match) {
          let value: string | number = match[1]?.trim() || match[0]?.trim();

          if (strategy.transform === 'parse_currency_idr') {
            value = parseCurrencyIDR(value);
          } else if (strategy.transform === 'parse_datetime_id') {
            value = parseDateTimeID(value);
          }

          logEntry.result = 'success';
          logEntry.value_extracted = value;

          return { value, log: [logEntry] };
        }
      } else if (strategy.type === 'keyword_proximity' && strategy.fallback) {
        const extracted = extractKeywordProximity(
          body,
          strategy.fallback,
          strategy.proximity_window || 50,
          strategy.secondary_pattern
        );
        if (extracted) {
          logEntry.result = 'success';
          logEntry.value_extracted = extracted;
          return { value: extracted, log: [logEntry] };
        }
      } else if (strategy.type === 'xpath' && strategy.pattern) {
        logEntry.result = 'no_match';
      }
    } catch (error) {
      logEntry.result = 'error';
      logEntry.error = error instanceof Error ? error.message : 'Unknown error';
    }

    logs.push(logEntry);
  }

  return {
    value: null,
    log: logs.length > 0 ? logs : [{ field: 'unknown', strategy_type: 'none', result: 'no_match' }],
  };
}

function parseCurrencyIDR(value: string): number {
  if (!value) return 0;

  const lastComma  = value.lastIndexOf(',');
  const lastPeriod = value.lastIndexOf('.');

  if (lastComma !== -1 && lastPeriod !== -1) {
    if (lastPeriod > lastComma) {
      // US format: 21,000.00  → comma = thousands, period = decimal
      const intPart = value.slice(0, lastPeriod).replace(/,/g, '');
      return parseInt(intPart, 10) || 0;
    } else {
      // EU/ID format: 21.000,00 → period = thousands, comma = decimal
      const intPart = value.slice(0, lastComma).replace(/\./g, '');
      return parseInt(intPart, 10) || 0;
    }
  }

  if (lastPeriod !== -1) {
    const afterPeriod = value.slice(lastPeriod + 1);
    if (afterPeriod.length <= 2) {
      // Decimal only: 21000.00 → 21000
      return parseInt(value.slice(0, lastPeriod), 10) || 0;
    }
    // Indonesian thousands: 1.500.000 or 21.000 → strip all periods
    return parseInt(value.replace(/\./g, ''), 10) || 0;
  }

  if (lastComma !== -1) {
    const afterComma = value.slice(lastComma + 1);
    if (afterComma.length <= 2) {
      // Decimal only: 21000,00 → 21000
      return parseInt(value.slice(0, lastComma), 10) || 0;
    }
    // Thousands: 21,000 → strip commas
    return parseInt(value.replace(/,/g, ''), 10) || 0;
  }

  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
}

function parseDateTimeID(value: string): string {
  const match = value.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (match) {
    const [_, day, month, year, time] = match;
    return new Date(`${year}-${month}-${day}T${time}:00.000Z`).toISOString();
  }
  return new Date().toISOString();
}
