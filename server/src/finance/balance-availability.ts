interface BillableBalance {
  moneyBalance: { toString(): string } | string | number;
  price: { toString(): string } | string | number;
  totalUnits: number;
  usedUnits: number;
}

/** Проект работает, только пока хватает и денег, и оплаченных единиц хотя бы на одну выдачу. */
export function hasAvailableBalance(balance: BillableBalance): boolean {
  const money = Number(balance.moneyBalance);
  const price = Number(balance.price);
  return Number.isFinite(money) && Number.isFinite(price)
    && money > 0 && money >= Math.max(0, price)
    && balance.usedUnits < balance.totalUnits;
}
