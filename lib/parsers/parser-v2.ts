import type { Email, ParsedResult, ParsingStatus } from './types';
import { ParserRegistry } from './registry';
import { extractField } from './extraction';
import { normalizeMerchant } from './normalizer';

export class ParserV2 {
  constructor(private registry: ParserRegistry) {}

  async parse(email: Email): Promise<ParsedResult> {
    const matched = this.registry.findBestMatcher(email);

    if (!matched) {
      return this.failedResult('No matching plugin', email);
    }

    const plugin = matched.plugin;
    const logs: ParsedResult['extraction_log'] = [];

    const amountResult = extractField(email.body, plugin.extract.amount);
    logs.push(...amountResult.log);

    const merchantResult = extractField(email.body, plugin.extract.merchant);
    logs.push(...merchantResult.log);

    const dateResult = extractField(email.body, plugin.extract.date);
    logs.push(...dateResult.log);

    const amount = amountResult.value as number | null;
    const merchant = merchantResult.value as string | null;
    const date = dateResult.value as string | null;

    let status: ParsingStatus = 'success';
    if (merchant === null || amount === null || date === null) {
      status = (amount !== null || merchant !== null) ? 'partial' : 'failed';
    }

    return {
      data: {
        amount,
        merchant,
        merchant_normalized: merchant ? normalizeMerchant(merchant) : null,
        date,
        currency: 'IDR',
      },
      plugin_id: plugin.id,
      plugin_version: plugin.version,
      extraction_log: logs,
      status,
      retry_count: 0,
    };
  }

  private failedResult(error: string, email: Email): ParsedResult {
    return {
      data: {
        amount: null,
        merchant: null,
        merchant_normalized: null,
        date: null,
        currency: 'IDR',
      },
      plugin_id: 'none',
      plugin_version: '0.0.0',
      extraction_log: [],
      status: 'failed',
      errors: [error],
      retry_count: 0,
    };
  }
}