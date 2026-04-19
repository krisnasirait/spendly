import { createHash } from 'crypto';

export interface DedupKeyInput {
  source: string;
  source_reference_id?: string;
  merchant_normalized: string;
  amount: number;
  date: string;
  subject_snippet: string;
}

export function generateDedupKey(input: DedupKeyInput): string {
  const truncatedSubject = input.subject_snippet.slice(0, 50);

  const data = [
    input.source,
    input.source_reference_id || '',
    input.merchant_normalized,
    input.amount.toString(),
    input.date.split('T')[0],
    truncatedSubject,
  ].join('|');

  return createHash('sha256').update(data).digest('hex');
}
