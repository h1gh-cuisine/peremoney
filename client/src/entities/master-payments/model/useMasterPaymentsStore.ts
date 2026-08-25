import { create } from "zustand";
import { deleteMasterPayment, fetchMasterPayments, setMasterPaymentStatus } from '../api/master-finance-api';
import type { MasterPayment } from "./types";

interface MasterPaymentsState {
  payments: MasterPayment[];
  loading: boolean; error: string | null;
  load: () => Promise<void>;
  markPaid: (id: string) => Promise<void>;
  markPending: (id: string) => Promise<void>;
  /** Любой платёж можно удалить (docs-agent.md 1.12.3) */
  remove: (id: string) => Promise<void>;
}

export const useMasterPaymentsStore = create<MasterPaymentsState>((set, get) => {
  async function change(id: string, status: MasterPayment['status']) { const previous = get().payments;
    set({ payments: previous.map((p) => p.id === id ? { ...p, status } : p), error: null });
    try { await setMasterPaymentStatus(id, status); } catch (reason) { set({ payments: previous, error: reason instanceof Error ? reason.message : 'Не удалось изменить платёж' }); } }
  return { payments: [], loading: false, error: null,
    load: async () => { set({ loading: true, error: null }); try { set({ payments: await fetchMasterPayments() }); }
      catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить платежи' }); } finally { set({ loading: false }); } },
    markPaid: (id) => change(id, 'paid'), markPending: (id) => change(id, 'pending'),
    remove: async (id) => { const previous = get().payments; set({ payments: previous.filter((p) => p.id !== id) });
      try { await deleteMasterPayment(id); } catch (reason) { set({ payments: previous, error: reason instanceof Error ? reason.message : 'Не удалось удалить платёж' }); } },
  };
});
