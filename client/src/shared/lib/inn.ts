function checksum(digits: number[], weights: number[]): number {
  return (digits.reduce((sum, digit, i) => sum + digit * weights[i]!, 0) % 11) % 10;
}

/** Проверяет контрольную сумму ИНН (10 знаков — организация, 12 — ИП/физлицо).
 * Та же проверка, что и на сервере перед выставлением счёта в Точке (server/src/finance/inn.ts) —
 * ловит опечатку сразу при вводе, а не после отказа банка "invalid document side tax code". */
export function isValidInn(inn: string): boolean {
  if (/^\d{10}$/.test(inn)) {
    const digits = inn.split('').map(Number);
    return checksum(digits.slice(0, 9), [2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[9];
  }
  if (/^\d{12}$/.test(inn)) {
    const digits = inn.split('').map(Number);
    return checksum(digits.slice(0, 10), [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0]) === digits[10]
      && checksum(digits.slice(0, 11), [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0]) === digits[11];
  }
  return false;
}
