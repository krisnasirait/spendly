export interface BillingPeriod {
  start: Date;
  end: Date;
}

export function getBillingPeriod(date: Date, startDay: number): BillingPeriod {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let start: Date;
  if (day >= startDay) {
    start = new Date(Date.UTC(year, month, startDay));
  } else {
    start = new Date(Date.UTC(year, month - 1, startDay));
  }

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

export function isInBillingPeriod(txDate: Date, start: Date, end: Date): boolean {
  return txDate >= start && txDate < end;
}

export function getPreviousBillingPeriod(period: BillingPeriod): BillingPeriod {
  const duration = period.end.getTime() - period.start.getTime();
  return {
    start: new Date(period.start.getTime() - duration),
    end: new Date(period.end.getTime() - duration),
  };
}
