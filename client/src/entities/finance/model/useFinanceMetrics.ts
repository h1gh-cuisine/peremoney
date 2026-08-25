import { useMemo } from "react";
import { computeExpected, computeLtv, computeTotalPayments } from "../lib/financeMetrics";
import type { Payment } from "./types";

export function useFinanceMetrics(payments: Payment[]) {
  return useMemo(
    () => ({
      ltv: computeLtv(payments),
      expected: computeExpected(payments),
      totalPayments: computeTotalPayments(payments),
    }),
    [payments],
  );
}
