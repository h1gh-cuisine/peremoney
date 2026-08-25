export interface IncomingPayment {
  paymentId: string;
  purpose?: string;
  SidePayer?: { inn?: string; amount?: string; currency?: string };
}

interface MatchableInvoice {
  invoiceNo: string;
  payerInn: string;
  amount: string;
}

export function matchIncomingPayment(event: IncomingPayment, invoice: MatchableInvoice): boolean {
  const payer = event.SidePayer;
  if (!payer || payer.currency !== 'RUB' || payer.inn !== invoice.payerInn) return false;
  if (Number(payer.amount) !== Number(invoice.amount)) return false;
  const escaped = invoice.invoiceNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\D)${escaped}(?:\\D|$)`).test(event.purpose ?? '');
}
