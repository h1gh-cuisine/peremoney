import { create } from "zustand";
import { createInvoice, fetchFinance } from '../api/finance-api';
import type { Payment, UnitBalance } from "./types";

interface FinanceState {
  payments: Payment[];
  unitBalance: UnitBalance;
  moneyBalance: number;
  loading: boolean;
  error: string | null;
  cabinetId: string | null;
  load: (cabinetId: string) => Promise<void>;
  reset: () => void;
  /** "Сформировать счёт" → создаёт запись "ожидает оплаты" (docs-agent.md 2.7.1 п.4) */
  createPendingInvoice: (quantity: number, idempotencyKey: string) => Promise<Payment | null>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  payments: [], unitBalance: { totalUnits: 0, usedUnits: 0 }, moneyBalance: 0,
  loading: false, error: null, cabinetId: null,
  reset: () => set({ payments: [], unitBalance: { totalUnits: 0, usedUnits: 0 }, moneyBalance: 0,
    loading: false, error: null, cabinetId: null }),
  load: async (cabinetId) => {
    set({ cabinetId, loading: true, error: null });
    try { set(await fetchFinance(cabinetId)); }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить финансы' }); }
    finally { set({ loading: false }); }
  },
  createPendingInvoice: async (quantity, idempotencyKey) => {
    const cabinetId = get().cabinetId;
    if (!cabinetId) return null;
    try { const payment = await createInvoice(cabinetId, quantity, idempotencyKey); set((state) => ({ payments: [payment, ...state.payments.filter((item) => item.id !== payment.id)], error: null })); return payment; }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось сформировать счёт' }); return null; }
  },
}));
