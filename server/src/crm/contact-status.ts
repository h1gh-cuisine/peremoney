const STATUS_LABELS: Readonly<Record<string, string>> = {
  new: 'НОВЫЙ',
  noAnswerFinal: 'НЕДОЗВОН',
  recall: 'ПЕРЕЗВОНИТЬ',
  notRelevant: 'НЕ КВАЛ',
  success: 'КВАЛ',
};

export function contactStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? '';
}
